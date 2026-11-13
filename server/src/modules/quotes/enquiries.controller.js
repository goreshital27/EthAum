import prisma from '../../config/prisma.js';

/**
 * Helper to fetch and verify the hospital associated with a logged-in HOSPITAL user.
 */
async function getApprovedHospital(userId) {
  const hospital = await prisma.hospital.findUnique({
    where: { ownerId: userId },
  });

  if (!hospital) {
    return { error: 'NOT_FOUND', hospital: null };
  }

  if (hospital.verificationStatus !== 'APPROVED') {
    return { error: 'PENDING_APPROVAL', hospital: null };
  }

  return { error: null, hospital };
}

/**
 * GET /api/hospital/enquiries
 * List enquiries received by the authenticated hospital
 */
export async function getHospitalEnquiries(req, res, next) {
  try {
    const { error, hospital } = await getApprovedHospital(req.user.id);
    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Hospital profile not found for authenticated user',
      });
    }
    if (error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Hospital account is pending administrative verification',
      });
    }

    const { status, urgency, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      hospitalId: hospital.id,
      ...(status ? { status } : {}),
      ...(urgency ? { urgency } : {}),
    };

    const [total, enquiries] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          case: {
            select: {
              id: true,
              stage: true,
              budgetCents: true,
              currency: true,
              travelDateFrom: true,
              travelDateTo: true,
              treatmentNeed: true,
              createdAt: true,
              treatment: {
                select: {
                  id: true,
                  name: true,
                  specialty: true,
                  expectedStayDays: true,
                },
              },
              destination: {
                select: {
                  id: true,
                  country: true,
                  city: true,
                },
              },
              patient: {
                select: {
                  patientProfile: {
                    select: {
                      country: true,
                      language: true,
                    },
                  },
                },
              },
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
      }),
    ]);

    const formatted = enquiries.map((enq) => {
      const patientProfile = enq.case?.patient?.patientProfile;
      return {
        id: enq.id,
        caseId: enq.caseId,
        status: enq.status,
        urgency: enq.urgency,
        assignedToName: enq.assignedToName,
        notes: enq.notes,
        respondBy: enq.respondBy,
        createdAt: enq.createdAt,
        updatedAt: enq.updatedAt,
        case: {
          id: enq.case.id,
          stage: enq.case.stage,
          treatment: enq.case.treatment,
          destination: enq.case.destination,
          budgetCents: enq.case.budgetCents,
          currency: enq.case.currency,
          travelDateFrom: enq.case.travelDateFrom,
          travelDateTo: enq.case.travelDateTo,
          patientCountry: patientProfile?.country || 'Not specified',
          patientLanguage: patientProfile?.language || 'en',
          createdAt: enq.case.createdAt,
        },
        quotationsCount: enq.quotations.length,
        quotations: enq.quotations,
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/hospital/enquiries/:enquiryId
 * View details of a specific enquiry. If NEW, transitions to VIEWED.
 */
export async function getHospitalEnquiryById(req, res, next) {
  try {
    const { enquiryId } = req.params;
    const { error, hospital } = await getApprovedHospital(req.user.id);

    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Hospital profile not found for authenticated user',
      });
    }
    if (error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Hospital account is pending administrative verification',
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: {
        case: {
          include: {
            treatment: true,
            destination: true,
            patient: {
              select: {
                patientProfile: {
                  select: {
                    country: true,
                    language: true,
                  },
                },
              },
            },
          },
        },
        quotations: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!enquiry || enquiry.hospitalId !== hospital.id) {
      return res.status(404).json({
        status: 'fail',
        message: 'Enquiry not found for this hospital',
      });
    }

    // Auto-transition status NEW -> VIEWED
    if (enquiry.status === 'NEW') {
      await prisma.enquiry.update({
        where: { id: enquiry.id },
        data: { status: 'VIEWED' },
      });
      enquiry.status = 'VIEWED';
    }

    // Check patient consent for medical records
    const consent = await prisma.consent.findUnique({
      where: {
        caseId_hospitalId: {
          caseId: enquiry.caseId,
          hospitalId: hospital.id,
        },
      },
    });

    const isConsentActive =
      consent &&
      !consent.revokedAt &&
      (!consent.expiresAt || new Date(consent.expiresAt) > new Date());

    let documents = [];
    if (isConsentActive) {
      const docs = await prisma.document.findMany({
        where: {
          caseId: enquiry.caseId,
          deletedAt: null,
        },
        select: {
          id: true,
          category: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      documents = docs.map((d) => ({
        ...d,
        sizeBytes: Number(d.sizeBytes),
      }));
    }

    // Load hospital doctors to facilitate doctor assignment
    const availableDoctors = await prisma.doctor.findMany({
      where: { hospitalId: hospital.id },
      select: {
        id: true,
        name: true,
        specialty: true,
        qualifications: true,
        yearsExperience: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      status: 'ok',
      data: {
        id: enquiry.id,
        caseId: enquiry.caseId,
        status: enquiry.status,
        urgency: enquiry.urgency,
        assignedToName: enquiry.assignedToName,
        notes: enquiry.notes,
        respondBy: enquiry.respondBy,
        createdAt: enquiry.createdAt,
        updatedAt: enquiry.updatedAt,
        case: {
          id: enquiry.case.id,
          stage: enquiry.case.stage,
          treatmentNeed: enquiry.case.treatmentNeed,
          treatment: enquiry.case.treatment,
          destination: enquiry.case.destination,
          budgetCents: enquiry.case.budgetCents,
          currency: enquiry.case.currency,
          travelDateFrom: enquiry.case.travelDateFrom,
          travelDateTo: enquiry.case.travelDateTo,
          patientCountry: enquiry.case.patient?.patientProfile?.country || 'Not specified',
          patientLanguage: enquiry.case.patient?.patientProfile?.language || 'en',
          createdAt: enquiry.case.createdAt,
        },
        consentActive: !!isConsentActive,
        consentedDocuments: documents,
        availableDoctors,
        quotations: enquiry.quotations,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/hospital/enquiries/:enquiryId
 * Update enquiry coordination fields
 */
export async function updateHospitalEnquiry(req, res, next) {
  try {
    const { enquiryId } = req.params;
    const { error, hospital } = await getApprovedHospital(req.user.id);

    if (error === 'NOT_FOUND' || error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital is not authorized or approved',
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
    });

    if (!enquiry || enquiry.hospitalId !== hospital.id) {
      return res.status(404).json({
        status: 'fail',
        message: 'Enquiry not found for this hospital',
      });
    }

    const { assignedToName, notes, respondBy } = req.body;

    const updated = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        ...(assignedToName !== undefined ? { assignedToName } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(respondBy !== undefined
          ? { respondBy: respondBy ? new Date(respondBy) : null }
          : {}),
      },
    });

    return res.status(200).json({
      status: 'ok',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/hospital/enquiries/:enquiryId/decline
 * Hospital declines to quote for an enquiry
 */
export async function declineHospitalEnquiry(req, res, next) {
  try {
    const { enquiryId } = req.params;
    const { error, hospital } = await getApprovedHospital(req.user.id);

    if (error === 'NOT_FOUND' || error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital is not authorized or approved',
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
    });

    if (!enquiry || enquiry.hospitalId !== hospital.id) {
      return res.status(404).json({
        status: 'fail',
        message: 'Enquiry not found for this hospital',
      });
    }

    const { reason } = req.body;
    const declineNote = reason
      ? `${enquiry.notes ? enquiry.notes + '\n' : ''}[Declined]: ${reason}`
      : enquiry.notes;

    const updated = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: 'DECLINED',
        notes: declineNote,
      },
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Enquiry marked as declined',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cases/:caseId/enquiries
 * Patient sends a case enquiry to an approved hospital
 */
export async function createCaseEnquiry(req, res, next) {
  try {
    const caseId = req.params.caseId || req.params.id;
    const { hospitalId, urgency = 'NORMAL', notes } = req.body;
    const patientId = req.user.id;

    // Verify patient owns the case
    const medicalCase = await prisma.medicalCase.findFirst({
      where: { id: caseId, deletedAt: null },
    });

    if (!medicalCase) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (medicalCase.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // Verify hospital exists and is APPROVED
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital || hospital.verificationStatus !== 'APPROVED') {
      return res.status(400).json({
        status: 'fail',
        message: 'Target hospital does not exist or is not verified and approved',
      });
    }

    // Check for duplicate enquiry
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: {
        caseId_hospitalId: {
          caseId,
          hospitalId,
        },
      },
    });

    if (existingEnquiry) {
      return res.status(409).json({
        status: 'fail',
        message: 'An enquiry has already been submitted to this hospital for this case',
      });
    }

    // Execute enquiry creation, consent grant, and case stage update in a single transaction
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day consent for quote evaluation

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Enquiry
      const newEnquiry = await tx.enquiry.create({
        data: {
          caseId,
          hospitalId,
          status: 'NEW',
          urgency,
          notes,
        },
      });

      // 2. Grant medical records review consent to the hospital
      await tx.consent.upsert({
        where: {
          caseId_hospitalId: {
            caseId,
            hospitalId,
          },
        },
        create: {
          caseId,
          hospitalId,
          scope: 'TREATMENT_QUOTATION',
          expiresAt,
        },
        update: {
          scope: 'TREATMENT_QUOTATION',
          expiresAt,
          revokedAt: null,
        },
      });

      // 3. Advance case stage to QUOTE_REQUESTED if currently earlier in pipeline
      const earlyStages = ['NEW', 'QUALIFIED', 'MEDICAL_REVIEW'];
      if (earlyStages.includes(medicalCase.stage)) {
        await tx.medicalCase.update({
          where: { id: caseId },
          data: { stage: 'QUOTE_REQUESTED' },
        });
      }

      return newEnquiry;
    });

    return res.status(201).json({
      status: 'ok',
      message: 'Case enquiry submitted to hospital successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/cases/:caseId/enquiries
 * Patient views all enquiries submitted for their case
 */
export async function getCaseEnquiries(req, res, next) {
  try {
    const caseId = req.params.caseId || req.params.id;
    const patientId = req.user.id;

    // Verify patient owns the case
    const medicalCase = await prisma.medicalCase.findFirst({
      where: { id: caseId, deletedAt: null },
    });

    if (!medicalCase) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (medicalCase.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    const enquiries = await prisma.enquiry.findMany({
      where: { caseId },
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
            languages: true,
          },
        },
        quotations: {
          select: {
            id: true,
            status: true,
            totalCents: true,
            currency: true,
            validUntil: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(200).json({
      status: 'ok',
      data: enquiries,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getHospitalEnquiries,
  getHospitalEnquiryById,
  updateHospitalEnquiry,
  declineHospitalEnquiry,
  createCaseEnquiry,
  getCaseEnquiries,
};
