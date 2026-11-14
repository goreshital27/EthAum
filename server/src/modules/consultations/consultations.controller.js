import crypto from 'crypto';
import prisma from '../../config/prisma.js';
import { enforceStageTransition } from '../cases/stagePipeline.js';
import { createNotification } from '../notifications/notifications.service.js';

export async function proposeAppointment(req, res, next) {
  try {
    const userId = req.user.id;
    const { caseId, doctorId, type, slots, timezone = 'UTC' } = req.body;

    // 1. Verify hospital identity & approval
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
        message: 'Access denied: Hospital must be verified and approved by admin to propose appointments',
      });
    }

    // 2. Verify enquiry exists for this case + hospital
    const enquiry = await prisma.enquiry.findUnique({
      where: {
        caseId_hospitalId: {
          caseId,
          hospitalId: hospital.id,
        },
      },
      include: {
        case: {
          select: {
            id: true,
            patientId: true,
            stage: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!enquiry || enquiry.case?.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active patient inquiry found for this case at your hospital',
      });
    }

    // 3. FORMAL appointments require a Booking to exist
    if (type === 'FORMAL') {
      const booking = await prisma.booking.findFirst({
        where: {
          caseId,
          hospitalId: hospital.id,
        },
      });

      if (!booking) {
        return res.status(400).json({
          status: 'fail',
          message: 'Booking required',
        });
      }
    }

    // 4. Verify doctor if provided
    if (doctorId) {
      const doctor = await prisma.doctor.findFirst({
        where: { id: doctorId, hospitalId: hospital.id },
      });
      if (!doctor) {
        return res.status(400).json({
          status: 'fail',
          message: 'Assigned specialist doctor does not belong to your hospital',
        });
      }
    }

    // 5. Generate unique Jitsi video link
    const videoLink = `https://meet.jit.si/ethaum-${crypto.randomUUID()}`;

    // 6. Create appointment rows for each proposed slot inside a transaction
    const createdAppointments = await prisma.$transaction(async (tx) => {
      const appts = [];
      for (const slot of slots) {
        const appt = await tx.appointment.create({
          data: {
            caseId,
            hospitalId: hospital.id,
            doctorId: doctorId || null,
            type,
            status: 'REQUESTED',
            scheduledAt: new Date(slot),
            timezone,
            videoLink,
          },
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
            hospital: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
              },
            },
          },
        });
        appts.push(appt);
      }

      // Notify patient
      await createNotification({
        userId: enquiry.case.patientId,
        type: 'APPOINTMENT_PROPOSED',
        title: 'New Consultation Proposed',
        body: `${hospital.name} proposed ${slots.length} time slot(s) for a video consultation.`,
        link: `/patient/cases/${caseId}`,
      });

      return appts;
    });

    return res.status(201).json({
      status: 'ok',
      message: `Proposed ${createdAppointments.length} appointment slot(s) successfully`,
      data: createdAppointments,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointments(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { caseId, status, type } = req.query;

    let where = {};

    if (userRole === 'HOSPITAL') {
      const hospital = await prisma.hospital.findUnique({
        where: { ownerId: userId },
      });
      if (!hospital) {
        return res.status(404).json({
          status: 'fail',
          message: 'Hospital profile not found',
        });
      }
      where.hospitalId = hospital.id;
    } else if (userRole === 'PATIENT') {
      where.case = {
        patientId: userId,
      };
    }

    if (caseId) where.caseId = caseId;
    if (status) where.status = status;
    if (type) where.type = type;

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        hospital: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
        case: {
          select: {
            id: true,
            stage: true,
            treatmentNeed: true,
            treatment: {
              select: {
                name: true,
                specialty: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      status: 'ok',
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        case: true,
        hospital: true,
        doctor: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Appointment not found',
      });
    }

    // Patient ownership check
    if (appointment.case.patientId !== userId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the medical case for this appointment',
      });
    }

    if (appointment.status !== 'REQUESTED') {
      return res.status(400).json({
        status: 'fail',
        message: `Appointment cannot be accepted: current status is ${appointment.status}`,
      });
    }

    // Execute confirmation inside database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark this slot CONFIRMED
      const confirmed = await tx.appointment.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          doctor: true,
          hospital: true,
        },
      });

      // 2. Cancel all other proposed slots from the same proposal session
      if (appointment.videoLink) {
        await tx.appointment.updateMany({
          where: {
            caseId: appointment.caseId,
            hospitalId: appointment.hospitalId,
            videoLink: appointment.videoLink,
            id: { not: id },
            status: 'REQUESTED',
          },
          data: { status: 'CANCELLED' },
        });
      }

      // 3. Stage transition: The case moves to CONSULTATION only when the first EXPLORATORY appointment is accepted
      if (appointment.type === 'EXPLORATORY' && appointment.case.stage === 'QUOTE_SENT') {
        const nextStage = enforceStageTransition(appointment.case.stage, 'CONSULTATION');
        await tx.medicalCase.update({
          where: { id: appointment.caseId },
          data: { stage: nextStage },
        });
      }

      // 4. Notify hospital
      await createNotification({
        userId: appointment.hospital.ownerId,
        type: 'APPOINTMENT_ACCEPTED',
        title: 'Consultation Confirmed',
        body: `Patient confirmed the ${appointment.type.toLowerCase()} consultation for ${new Date(
          appointment.scheduledAt
        ).toUTCString()}.`,
        link: '/hospital/appointments',
      });

      return confirmed;
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Consultation appointment confirmed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function declineAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        case: true,
        hospital: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Appointment not found',
      });
    }

    if (appointment.case.patientId !== userId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the medical case for this appointment',
      });
    }

    if (appointment.status !== 'REQUESTED') {
      return res.status(400).json({
        status: 'fail',
        message: `Appointment cannot be declined: current status is ${appointment.status}`,
      });
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      // Cancel all sibling requested slots for this proposal session
      if (appointment.videoLink) {
        await tx.appointment.updateMany({
          where: {
            caseId: appointment.caseId,
            hospitalId: appointment.hospitalId,
            videoLink: appointment.videoLink,
            status: 'REQUESTED',
          },
          data: { status: 'CANCELLED' },
        });
      } else {
        await tx.appointment.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });
      }

      return await tx.appointment.findUnique({
        where: { id },
      });
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Consultation appointment declined',
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  proposeAppointment,
  getAppointments,
  acceptAppointment,
  declineAppointment,
};
