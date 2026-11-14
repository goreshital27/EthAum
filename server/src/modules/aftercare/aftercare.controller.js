import prisma from '../../config/prisma.js';
import { enforceStageTransition } from '../cases/stagePipeline.js';
import { createNotification } from '../notifications/notifications.service.js';

export const AFTERCARE_TASK_TEMPLATE = [
  {
    title: 'Follow-up consultation call',
    description: 'Post-treatment tele-coordination check-in call with your medical team to review initial recovery progress.',
    dueDays: 3,
  },
  {
    title: 'Medication schedule reminder',
    description: 'Review discharge medication instructions and confirm routine schedule for post-procedure prescriptions.',
    dueDays: 7,
  },
  {
    title: 'Send recovery progress photos',
    description: 'Upload current recovery photos and healing status update for hospital clinical review.',
    dueDays: 14,
  },
  {
    title: 'Final check-in',
    description: 'Final coordination review call to verify full stabilization and conclude post-procedure monitoring.',
    dueDays: 30,
  },
];

/**
 * POST /api/aftercare/cases/:caseId/complete-treatment
 * Hospital marks patient treatment as complete.
 * Transitions stage sequentially: BOOKED -> TREATMENT -> AFTERCARE via enforceStageTransition.
 * Updates Booking to COMPLETED.
 * Creates standard coordination AftercareTask rows.
 */
export async function markTreatmentComplete(req, res, next) {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;

    // 1. Verify hospital identity
    const hospital = await prisma.hospital.findUnique({
      where: { ownerId: userId },
    });

    if (!hospital) {
      return res.status(404).json({
        status: 'fail',
        message: 'Hospital profile not found for authenticated user',
      });
    }

    if (hospital.verificationStatus !== 'APPROVED') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital must be verified and approved by admin',
      });
    }

    // 2. Verify case and active booking for this hospital
    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      include: {
        bookings: {
          where: { hospitalId: hospital.id },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!medicalCase || medicalCase.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    const booking = medicalCase.bookings[0];
    if (!booking) {
      return res.status(400).json({
        status: 'fail',
        message: 'No booking found for this medical case at your facility',
      });
    }

    if (!['CONFIRMED', 'COMPLETED'].includes(booking.status)) {
      return res.status(400).json({
        status: 'fail',
        message: `Booking must be confirmed before marking treatment complete (current status: ${booking.status})`,
      });
    }

    // 3. Stage transition verification
    const currentStage = medicalCase.stage;
    if (['CLOSED'].includes(currentStage)) {
      return res.status(400).json({
        status: 'fail',
        message: 'This medical case is already closed',
      });
    }

    // 4. Atomic database transaction
    const result = await prisma.$transaction(async (tx) => {
      let stage = currentStage;

      // Sequential progression: BOOKED -> TREATMENT -> AFTERCARE
      if (stage === 'BOOKED') {
        stage = enforceStageTransition(stage, 'TREATMENT');
        stage = enforceStageTransition(stage, 'AFTERCARE');
      } else if (stage === 'TREATMENT') {
        stage = enforceStageTransition(stage, 'AFTERCARE');
      } else if (stage !== 'AFTERCARE') {
        throw new Error(
          `Cannot mark treatment complete from current stage '${stage}'. Case must be in BOOKED or TREATMENT stage.`
        );
      }

      // Update case stage
      const updatedCase = await tx.medicalCase.update({
        where: { id: caseId },
        data: { stage },
      });

      // Update booking status to COMPLETED
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' },
      });

      // Check existing tasks to prevent duplicates (idempotency)
      const existingTasks = await tx.aftercareTask.findMany({
        where: { bookingId: booking.id },
        orderBy: { dueDate: 'asc' },
      });

      let tasks = existingTasks;
      if (existingTasks.length === 0) {
        const createdTasks = [];
        const now = Date.now();

        for (const item of AFTERCARE_TASK_TEMPLATE) {
          const dueDate = new Date(now + item.dueDays * 24 * 60 * 60 * 1000);
          const task = await tx.aftercareTask.create({
            data: {
              bookingId: booking.id,
              title: item.title,
              description: item.description,
              dueDate,
              completedAt: null,
            },
          });
          createdTasks.push(task);
        }
        tasks = createdTasks;
      }

      // Notify patient
      await createNotification({
        userId: medicalCase.patientId,
        type: 'AFTERCARE_STARTED',
        title: 'Treatment Complete - Aftercare Begun',
        body: `${hospital.name} marked your procedure as complete. Please check your recovery coordination checklist.`,
        link: `/patient/cases/${caseId}`,
      });

      return {
        case: updatedCase,
        booking: updatedBooking,
        tasks,
      };
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Treatment marked complete. Case transitioned to AFTERCARE with coordination tasks.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/aftercare/cases/:caseId/tasks
 * Returns aftercare tasks for a case.
 * Accessible by case patient, treating hospital, or admin.
 */
export async function getAftercareTasks(req, res, next) {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      include: {
        bookings: {
          include: {
            hospital: {
              select: {
                id: true,
                ownerId: true,
                name: true,
                city: true,
                country: true,
              },
            },
            aftercareTasks: {
              orderBy: { dueDate: 'asc' },
            },
          },
        },
      },
    });

    if (!medicalCase || medicalCase.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    // Ownership check
    const isPatientOwner = medicalCase.patientId === userId;
    const isHospitalOwner = medicalCase.bookings.some(
      (b) => b.hospital.ownerId === userId
    );

    if (!isPatientOwner && !isHospitalOwner && userRole !== 'ADMIN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not have permission to view aftercare tasks for this case',
      });
    }

    // Collect all aftercare tasks across bookings for this case
    const allTasks = [];
    let completedBooking = null;

    for (const b of medicalCase.bookings) {
      if (b.status === 'COMPLETED' || b.status === 'CONFIRMED') {
        completedBooking = b;
        allTasks.push(...b.aftercareTasks);
      }
    }

    const totalCount = allTasks.length;
    const completedCount = allTasks.filter((t) => t.completedAt !== null).length;
    const allCompleted = totalCount > 0 && completedCount === totalCount;

    return res.status(200).json({
      status: 'ok',
      data: {
        tasks: allTasks,
        totalCount,
        completedCount,
        allCompleted,
        caseStage: medicalCase.stage,
        booking: completedBooking
          ? {
              id: completedBooking.id,
              status: completedBooking.status,
              hospitalId: completedBooking.hospitalId,
              hospitalName: completedBooking.hospital.name,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/aftercare/tasks/:taskId
 * Patient or treating hospital marks task as completed/uncompleted.
 * If all tasks are completed, automatically transitions case stage to CLOSED via enforceStageTransition.
 */
export async function updateAftercareTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const { completed = true } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Fetch task with booking, case, and hospital
    const task = await prisma.aftercareTask.findUnique({
      where: { id: taskId },
      include: {
        booking: {
          include: {
            case: true,
            hospital: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        status: 'fail',
        message: 'Aftercare task not found',
      });
    }

    const { booking } = task;
    const { case: medicalCase, hospital } = booking;

    // 2. Ownership check
    const isPatient = medicalCase.patientId === userId;
    const isHospital = hospital.ownerId === userId;

    if (!isPatient && !isHospital && userRole !== 'ADMIN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not have permission to update this aftercare task',
      });
    }

    // 3. Update inside database transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.aftercareTask.update({
        where: { id: taskId },
        data: {
          completedAt: completed ? new Date() : null,
        },
      });

      let caseClosed = false;

      // Check if all tasks are completed
      if (completed) {
        const remainingIncomplete = await tx.aftercareTask.count({
          where: {
            bookingId: booking.id,
            completedAt: null,
          },
        });

        if (remainingIncomplete === 0 && medicalCase.stage !== 'CLOSED') {
          // Enforce stage transition to CLOSED
          const nextStage = enforceStageTransition(medicalCase.stage, 'CLOSED');
          await tx.medicalCase.update({
            where: { id: medicalCase.id },
            data: { stage: nextStage },
          });
          caseClosed = true;

          // Notify patient
          await createNotification({
            userId: medicalCase.patientId,
            type: 'CASE_CLOSED',
            title: 'Aftercare Completed - Case Closed',
            body: 'All post-treatment recovery milestones are completed! Your medical case is officially closed. Please take a moment to leave a verified review.',
            link: `/patient/cases/${medicalCase.id}`,
          });

          // Notify hospital
          await createNotification({
            userId: hospital.ownerId,
            type: 'CASE_CLOSED',
            title: 'Patient Aftercare Complete',
            body: `All recovery coordination tasks have been completed for case #${medicalCase.id.slice(0, 8)}.`,
            link: `/hospital/leads`,
          });
        }
      }

      return {
        task: updatedTask,
        caseClosed,
      };
    });

    return res.status(200).json({
      status: 'ok',
      message: result.caseClosed
        ? 'All aftercare tasks completed. Case is now successfully CLOSED.'
        : `Task marked as ${completed ? 'completed' : 'pending'}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
