import prisma from '../../config/prisma.js';
import { createNotification } from '../notifications/notifications.service.js';

/**
 * Helper to verify case existence and patient ownership
 */
async function verifyPatientCaseOwnership(caseId, patientId) {
  const medicalCase = await prisma.medicalCase.findFirst({
    where: {
      id: caseId,
      deletedAt: null,
    },
  });

  if (!medicalCase) {
    return { error: 'NOT_FOUND', caseItem: null };
  }

  if (medicalCase.patientId !== patientId) {
    return { error: 'FORBIDDEN', caseItem: null };
  }

  return { error: null, caseItem: medicalCase };
}

/**
 * POST /api/cases/:id/shortlist
 * Patient shortlists top 2-3 hospital options
 */
export async function setShortlist(req, res, next) {
  try {
    const caseId = req.params.id;
    const { hospitalIds } = req.body;
    const patientId = req.user.id;

    const { error, caseItem } = await verifyPatientCaseOwnership(caseId, patientId);
    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }
    if (error === 'FORBIDDEN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // Deduplicate hospital IDs
    const uniqueHospitalIds = Array.from(new Set(hospitalIds));
    if (uniqueHospitalIds.length < 2 || uniqueHospitalIds.length > 3) {
      return res.status(400).json({
        status: 'fail',
        message: 'You must select exactly 2 or 3 distinct hospitals to shortlist',
      });
    }

    // Verify all hospitals exist and are approved
    const hospitals = await prisma.hospital.findMany({
      where: {
        id: { in: uniqueHospitalIds },
        verificationStatus: 'APPROVED',
      },
    });

    if (hospitals.length !== uniqueHospitalIds.length) {
      return res.status(400).json({
        status: 'fail',
        message: 'One or more selected hospitals are not valid approved partner hospitals',
      });
    }

    // Execute shortlist update in transaction: clear existing and re-create with rank
    const updatedShortlist = await prisma.$transaction(async (tx) => {
      await tx.shortlist.deleteMany({
        where: { caseId },
      });

      const items = [];
      for (let idx = 0; idx < uniqueHospitalIds.length; idx++) {
        const item = await tx.shortlist.create({
          data: {
            caseId,
            hospitalId: uniqueHospitalIds[idx],
            rank: idx + 1,
          },
          include: {
            hospital: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                country: true,
                accreditations: true,
                languages: true,
              },
            },
          },
        });
        items.push(item);
      }
      return items;
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Shortlist updated successfully',
      data: updatedShortlist,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/cases/:id/shortlist
 * Get shortlisted hospitals for a case
 */
export async function getShortlist(req, res, next) {
  try {
    const caseId = req.params.id;
    const patientId = req.user.id;

    const { error } = await verifyPatientCaseOwnership(caseId, patientId);
    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }
    if (error === 'FORBIDDEN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    const shortlist = await prisma.shortlist.findMany({
      where: { caseId },
      orderBy: { rank: 'asc' },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            country: true,
            accreditations: true,
            languages: true,
            reviews: {
              select: { rating: true },
            },
          },
        },
      },
    });

    const formatted = shortlist.map((item) => {
      const reviews = item.hospital?.reviews || [];
      const rating =
        reviews.length > 0
          ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
          : 4.8;

      return {
        id: item.id,
        caseId: item.caseId,
        hospitalId: item.hospitalId,
        rank: item.rank,
        createdAt: item.createdAt,
        hospital: {
          id: item.hospital.id,
          name: item.hospital.name,
          slug: item.hospital.slug,
          city: item.hospital.city,
          country: item.hospital.country,
          accreditations: item.hospital.accreditations || [],
          languages: item.hospital.languages || [],
          rating,
        },
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/cases/:id/shortlist
 * Clear shortlist or remove a specific hospital from shortlist
 */
export async function deleteShortlist(req, res, next) {
  try {
    const caseId = req.params.id;
    const patientId = req.user.id;
    const { hospitalId } = req.query;

    const { error } = await verifyPatientCaseOwnership(caseId, patientId);
    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }
    if (error === 'FORBIDDEN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    if (hospitalId) {
      await prisma.shortlist.deleteMany({
        where: { caseId, hospitalId },
      });
    } else {
      await prisma.shortlist.deleteMany({
        where: { caseId },
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: hospitalId ? 'Hospital removed from shortlist' : 'Shortlist cleared successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cases/:id/shortlist/:hospitalId/request-call
 * Patient requests an exploratory coordination call with a shortlisted hospital
 */
export async function requestExploratoryCall(req, res, next) {
  try {
    const caseId = req.params.id;
    const hospitalId = req.params.hospitalId;
    const patientId = req.user.id;

    const { error, caseItem } = await verifyPatientCaseOwnership(caseId, patientId);
    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }
    if (error === 'FORBIDDEN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // Verify hospital is in this case's shortlist
    const shortlistEntry = await prisma.shortlist.findUnique({
      where: {
        caseId_hospitalId: {
          caseId,
          hospitalId,
        },
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!shortlistEntry) {
      return res.status(400).json({
        status: 'fail',
        message: 'Hospital must be shortlisted before requesting an exploratory consultation call',
      });
    }

    const hospital = shortlistEntry.hospital;

    // TODO (Part B item 3): The consultations module allows hospitals to propose appointment slots.
    // When consultations module tele-scheduling is invoked, the hospital creates proposed slots via /api/appointments/propose.
    // Here we notify the hospital coordinator of the exploratory call request.
    if (hospital.ownerId) {
      await createNotification({
        userId: hospital.ownerId,
        type: 'EXPLORATORY_CALL_REQUEST',
        title: 'Exploratory Call Requested',
        body: `Patient for Case #${caseId.slice(0, 8)} requested an exploratory video call with ${hospital.name}.`,
        link: `/hospital/leads`,
      });
    }

    return res.status(201).json({
      status: 'ok',
      message: `Exploratory consultation call requested with ${hospital.name}. The hospital international patient desk has been notified.`,
      data: {
        caseId,
        hospitalId,
        hospitalName: hospital.name,
        requestedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  setShortlist,
  getShortlist,
  deleteShortlist,
  requestExploratoryCall,
};
