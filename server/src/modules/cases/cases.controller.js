import prisma from '../../config/prisma.js';
import { enforceStageTransition } from './stagePipeline.js';

/**
 * POST /api/cases
 * Creates a new MedicalCase at stage NEW owned by the authenticated PATIENT.
 */
export const createCase = async (req, res, next) => {
  try {
    const {
      treatment,
      destination,
      budgetCents,
      preferredTimeline,
      description,
      travelPartySize = 1,
      hasInsurance = false,
    } = req.body;

    const patientId = req.user.id;

    // 1. Resolve Treatment if provided
    let treatmentId = null;
    let treatmentNeed = treatment;

    if (treatment && treatment.trim()) {
      const trimmed = treatment.trim();
      const matchedTreatment = await prisma.treatment.findFirst({
        where: {
          OR: [
            { id: trimmed },
            { slug: trimmed.toLowerCase() },
            { name: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
      });

      if (matchedTreatment) {
        treatmentId = matchedTreatment.id;
        treatmentNeed = matchedTreatment.name;
      }
    }

    // 2. Resolve Destination if provided
    let destinationId = null;
    if (destination && destination.trim()) {
      const trimmed = destination.trim();
      const matchedDest = await prisma.destination.findFirst({
        where: {
          OR: [
            { id: trimmed },
            { slug: trimmed.toLowerCase() },
            { country: { equals: trimmed, mode: 'insensitive' } },
          ],
        },
      });

      if (matchedDest) {
        destinationId = matchedDest.id;
      }
    }

    // 3. Construct medical context
    let medicalNotes = '';
    if (preferredTimeline && preferredTimeline.trim()) {
      medicalNotes = `Preferred Travel Timeline: ${preferredTimeline.trim()}`;
    }

    // 4. Create MedicalCase inside transaction
    const newCase = await prisma.medicalCase.create({
      data: {
        patientId,
        treatmentId,
        treatmentNeed,
        diagnosisSummary: description.trim(),
        medicalHistory: medicalNotes || null,
        destinationId,
        budgetCents,
        currency: 'USD',
        stage: 'NEW',
        travelPartySize,
        hasInsurance,
      },
      include: {
        treatment: {
          select: {
            id: true,
            name: true,
            slug: true,
            specialty: true,
          },
        },
        destination: {
          select: {
            id: true,
            country: true,
            city: true,
            slug: true,
          },
        },
      },
    });

    return res.status(201).json({
      status: 'ok',
      data: newCase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases
 * Returns all MedicalCases owned by the logged-in PATIENT with quotes, appointments, and aftercare task counts.
 */
export const getCases = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    const cases = await prisma.medicalCase.findMany({
      where: {
        patientId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        treatment: {
          select: {
            id: true,
            name: true,
            slug: true,
            specialty: true,
          },
        },
        destination: {
          select: {
            id: true,
            country: true,
            city: true,
            slug: true,
          },
        },
        enquiries: {
          select: {
            id: true,
            quotations: {
              select: {
                id: true,
              },
            },
          },
        },
        appointments: {
          select: {
            id: true,
          },
        },
        bookings: {
          select: {
            id: true,
            aftercareTasks: {
              select: {
                id: true,
              },
            },
          },
        },
        documents: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    // Compute aggregated counts for each case
    const formattedCases = cases.map((c) => {
      let quotesCount = 0;
      for (const enq of c.enquiries || []) {
        quotesCount += (enq.quotations || []).length;
      }

      const appointmentsCount = (c.appointments || []).length;

      let aftercareTasksCount = 0;
      for (const bk of c.bookings || []) {
        aftercareTasksCount += (bk.aftercareTasks || []).length;
      }

      return {
        id: c.id,
        stage: c.stage,
        treatmentNeed: c.treatmentNeed,
        treatment: c.treatment,
        destination: c.destination,
        diagnosisSummary: c.diagnosisSummary,
        budgetCents: c.budgetCents,
        currency: c.currency,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        quotesCount,
        appointmentsCount,
        aftercareTasksCount,
        documentsCount: (c.documents || []).length,
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: formattedCases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases/:id
 * Detailed view of a single case with full counts and relations.
 * Strictly verifies patient ownership.
 */
export const getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    const caseItem = await prisma.medicalCase.findUnique({
      where: { id },
      include: {
        treatment: {
          select: {
            id: true,
            name: true,
            slug: true,
            specialty: true,
            description: true,
            expectedStayDays: true,
          },
        },
        destination: {
          select: {
            id: true,
            country: true,
            city: true,
            slug: true,
            visaInfo: true,
          },
        },
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            category: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
        consents: {
          orderBy: { createdAt: 'desc' },
          include: {
            hospital: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                country: true,
                accreditations: true,
              },
            },
          },
        },
        enquiries: {
          include: {
            hospital: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
              },
            },
            quotations: {
              select: {
                id: true,
                status: true,
                totalCents: true,
                currency: true,
                createdAt: true,
              },
            },
          },
        },
        appointments: {
          include: {
            hospital: {
              select: {
                name: true,
                city: true,
                country: true,
              },
            },
            doctor: {
              select: {
                name: true,
                specialty: true,
              },
            },
          },
        },
        bookings: {
          include: {
            aftercareTasks: true,
          },
        },
      },
    });

    if (!caseItem || caseItem.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    // Ownership check: patient can only view their own case
    if (caseItem.patientId !== patientId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not have permission to view this medical case',
      });
    }

    // Compute counts
    let quotesCount = 0;
    for (const enq of caseItem.enquiries || []) {
      quotesCount += (enq.quotations || []).length;
    }

    const appointmentsCount = (caseItem.appointments || []).length;

    let aftercareTasksCount = 0;
    for (const bk of caseItem.bookings || []) {
      aftercareTasksCount += (bk.aftercareTasks || []).length;
    }

    // Convert BigInt sizeBytes in documents to standard numbers for JSON serialization
    const sanitizedDocuments = (caseItem.documents || []).map((doc) => ({
      ...doc,
      sizeBytes: Number(doc.sizeBytes),
    }));

    return res.status(200).json({
      status: 'ok',
      data: {
        id: caseItem.id,
        stage: caseItem.stage,
        treatmentNeed: caseItem.treatmentNeed,
        diagnosisSummary: caseItem.diagnosisSummary,
        medicalHistory: caseItem.medicalHistory,
        budgetCents: caseItem.budgetCents,
        currency: caseItem.currency,
        travelPartySize: caseItem.travelPartySize,
        hasInsurance: caseItem.hasInsurance,
        createdAt: caseItem.createdAt,
        updatedAt: caseItem.updatedAt,
        treatment: caseItem.treatment,
        destination: caseItem.destination,
        documents: sanitizedDocuments,
        consents: caseItem.consents,
        quotesCount,
        appointmentsCount,
        aftercareTasksCount,
        enquiries: caseItem.enquiries,
        appointments: caseItem.appointments,
        bookings: caseItem.bookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/cases/:id/stage
 * Updates case stage, strictly validating transitions with enforceStageTransition.
 */
export const updateCaseStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage: targetStage } = req.body;

    const caseItem = await prisma.medicalCase.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        stage: true,
        deletedAt: true,
      },
    });

    if (!caseItem || caseItem.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    // Stage transitions are restricted to ADMIN only (enforced at the route level).
    // No patient self-service stage advancement is permitted.

    // Enforce pipeline rules (throws readable Error on invalid jumps)
    const nextStage = enforceStageTransition(caseItem.stage, targetStage);

    const updated = await prisma.medicalCase.update({
      where: { id: caseItem.id },
      data: { stage: nextStage },
      select: {
        id: true,
        stage: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: 'ok',
      data: updated,
    });
  } catch (error) {
    if (error.message && error.message.includes('Invalid stage')) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};
