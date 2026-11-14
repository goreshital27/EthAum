import prisma from '../../config/prisma.js';
import storageService from '../../services/storage.js';
import { enforceStageTransition, STAGE_PIPELINE } from '../cases/stagePipeline.js';

// =========================================================================
// 1. HOSPITAL APPROVALS
// =========================================================================

/**
 * GET /api/admin/hospitals
 * List hospitals for admin verification review. Defaults to PENDING.
 */
export const getHospitalApprovals = async (req, res, next) => {
  try {
    const { status = 'PENDING', page = 1, limit = 20 } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.verificationStatus = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [hospitals, total] = await Promise.all([
      prisma.hospital.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              doctors: true,
              hospitalTreatments: true,
              packages: true,
            },
          },
        },
      }),
      prisma.hospital.count({ where }),
    ]);

    const formatted = hospitals.map((h) => ({
      id: h.id,
      name: h.name,
      slug: h.slug,
      city: h.city,
      country: h.country,
      accreditations: h.accreditations || [],
      languages: h.languages || [],
      internationalServices: h.internationalServices || [],
      offersVirtualConsult: h.offersVirtualConsult,
      verificationStatus: h.verificationStatus,
      verifiedAt: h.verifiedAt,
      submittedDate: h.createdAt,
      updatedAt: h.updatedAt,
      contact: h.owner?.email || 'N/A',
      ownerId: h.ownerId,
      doctorsCount: h._count.doctors,
      treatmentsCount: h._count.hospitalTreatments,
      packagesCount: h._count.packages,
    }));

    return res.status(200).json({
      status: 'ok',
      data: formatted,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/hospitals/:id/approve
 * Approves a hospital. Sets verificationStatus APPROVED and verifiedAt.
 * Sends notification to hospital owner.
 */
export const approveHospital = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({
        where: { id },
        select: { id: true, name: true, ownerId: true, verificationStatus: true },
      });

      if (!hospital) {
        const error = new Error('Hospital not found');
        error.statusCode = 404;
        throw error;
      }

      const updated = await tx.hospital.update({
        where: { id },
        data: {
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          verificationStatus: true,
          verifiedAt: true,
          city: true,
          country: true,
        },
      });

      // Notify hospital owner
      await tx.notification.create({
        data: {
          userId: hospital.ownerId,
          type: 'HOSPITAL_APPROVED',
          title: 'Hospital Verification Approved',
          body: `Congratulations! ${hospital.name} has been verified and approved by EthAum administrators. Your hospital is now publicly visible to international patients.`,
          link: '/hospital/profile',
        },
      });

      return updated;
    });

    console.log(`[AUDIT] Hospital ${id} (${result.name}) approved by Admin ${req.user.id}`);

    return res.status(200).json({
      status: 'ok',
      message: `${result.name} has been successfully approved and verified.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/hospitals/:id/reject
 * Rejects a hospital with mandatory reason.
 */
export const rejectHospital = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({
        where: { id },
        select: { id: true, name: true, ownerId: true, verificationStatus: true },
      });

      if (!hospital) {
        const error = new Error('Hospital not found');
        error.statusCode = 404;
        throw error;
      }

      const updated = await tx.hospital.update({
        where: { id },
        data: {
          verificationStatus: 'REJECTED',
          verifiedAt: null,
        },
        select: {
          id: true,
          name: true,
          verificationStatus: true,
          verifiedAt: true,
        },
      });

      // Notify hospital owner of rejection with reason
      await tx.notification.create({
        data: {
          userId: hospital.ownerId,
          type: 'HOSPITAL_REJECTED',
          title: 'Hospital Verification Declined',
          body: `Your hospital registration for ${hospital.name} was not approved. Reason: ${reason}. Please update your credentials or contact administration.`,
          link: '/hospital/profile',
        },
      });

      return updated;
    });

    console.log(`[AUDIT] Hospital ${id} (${result.name}) rejected by Admin ${req.user.id}. Reason: ${reason}`);

    return res.status(200).json({
      status: 'ok',
      message: `${result.name} verification has been rejected.`,
      data: result,
      reason,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 2. CASES
// =========================================================================

/**
 * GET /api/admin/cases
 * List all medical cases with filters (stage, country, treatment) and pagination.
 * Shows metadata only.
 */
export const getCases = async (req, res, next) => {
  try {
    const { stage, country, treatment, page = 1, limit = 15 } = req.query;

    const where = { deletedAt: null };

    if (stage && stage !== 'ALL') {
      where.stage = stage;
    }

    if (country && country.trim().length > 0) {
      where.destination = {
        country: { contains: country.trim(), mode: 'insensitive' },
      };
    }

    if (treatment && treatment.trim().length > 0) {
      const treatTrimmed = treatment.trim();
      where.OR = [
        { treatmentNeed: { contains: treatTrimmed, mode: 'insensitive' } },
        { treatment: { name: { contains: treatTrimmed, mode: 'insensitive' } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [cases, total] = await Promise.all([
      prisma.medicalCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          stage: true,
          treatmentNeed: true,
          budgetCents: true,
          currency: true,
          travelPartySize: true,
          hasInsurance: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              email: true,
              patientProfile: {
                select: {
                  fullName: true,
                  country: true,
                },
              },
            },
          },
          treatment: {
            select: {
              id: true,
              name: true,
              specialty: true,
            },
          },
          destination: {
            select: {
              id: true,
              country: true,
              city: true,
            },
          },
          _count: {
            select: {
              documents: { where: { deletedAt: null } },
              enquiries: true,
              appointments: true,
              bookings: true,
            },
          },
          consents: {
            where: {
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: {
              id: true,
              hospital: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.medicalCase.count({ where }),
    ]);

    const formatted = cases.map((c) => ({
      id: c.id,
      stage: c.stage,
      treatmentName: c.treatment?.name || c.treatmentNeed || 'General Consultation',
      specialty: c.treatment?.specialty || 'General',
      destinationCountry: c.destination?.country || 'Flexible',
      destinationCity: c.destination?.city || '',
      budgetCents: c.budgetCents,
      currency: c.currency,
      patientName: c.patient?.patientProfile?.fullName || c.patient?.email?.split('@')[0] || 'Patient',
      patientCountry: c.patient?.patientProfile?.country || 'International',
      documentsCount: c._count.documents,
      quotesCount: c._count.enquiries,
      appointmentsCount: c._count.appointments,
      bookingsCount: c._count.bookings,
      hasValidConsent: (c.consents || []).length > 0,
      activeConsentsCount: (c.consents || []).length,
      consentedHospitals: (c.consents || []).map((cn) => cn.hospital?.name).filter(Boolean),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return res.status(200).json({
      status: 'ok',
      data: formatted,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/cases/:id
 * Single case view for administrator.
 * Shows metadata and reveals documents ONLY if an active Consent exists.
 */
export const getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const caseItem = await prisma.medicalCase.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            patientProfile: {
              select: {
                fullName: true,
                country: true,
                phone: true,
              },
            },
          },
        },
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
        consents: {
          where: {
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: {
            hospital: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
              },
            },
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

    const hasValidConsent = (caseItem.consents || []).length > 0;

    // Admin can see documents ONLY if a valid Consent exists
    let documents = [];
    if (hasValidConsent) {
      const rawDocs = await prisma.document.findMany({
        where: { caseId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          category: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      });

      documents = rawDocs.map((d) => ({
        ...d,
        sizeBytes: Number(d.sizeBytes),
      }));
    }

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
        patient: {
          id: caseItem.patient.id,
          email: caseItem.patient.email,
          fullName: caseItem.patient.patientProfile?.fullName || 'Patient',
          country: caseItem.patient.patientProfile?.country || 'International',
        },
        treatment: caseItem.treatment,
        destination: caseItem.destination,
        consents: caseItem.consents,
        hasValidConsent,
        documents,
        documentAccessNotice: hasValidConsent
          ? 'Active patient consent verified. Medical files accessible under audit logging.'
          : 'Documents hidden: Patient has not granted active consent for external record access.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/cases/:id/documents/:docId/access
 * Generates signed document URL for admin.
 * STRICT ENFORCEMENT: Admin can see documents ONLY if a valid Consent exists.
 * Every access writes an AccessLog row.
 */
export const getAdminCaseDocumentAccess = async (req, res, next) => {
  try {
    const { id: caseId, docId } = req.params;
    const adminId = req.user.id;

    // 1. Check document exists and belongs to case
    const document = await prisma.document.findFirst({
      where: { id: docId, caseId, deletedAt: null },
    });

    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical document not found for this case',
      });
    }

    // 2. Strict Consent check: valid (unrevoked, unexpired) Consent must exist
    const activeConsent = await prisma.consent.findFirst({
      where: {
        caseId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!activeConsent) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Patient has not granted an active consent for record access on this case.',
      });
    }

    // 3. Write AccessLog audit row
    await prisma.accessLog.create({
      data: {
        documentId: document.id,
        caseId,
        actorId: adminId,
        action: 'VIEW',
        ipAddress: req.ip || null,
      },
    });

    // 4. Generate signed short-lived URL (300 seconds / 5 mins)
    const signedData = await storageService.getSignedUrl(
      document.storageKey,
      document.id,
      300,
      adminId
    );

    console.log(`[AUDIT] Admin ${adminId} accessed document ${document.id} on case ${caseId} under active consent ${activeConsent.id}`);

    return res.status(200).json({
      status: 'ok',
      data: {
        documentId: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        accessUrl: signedData.url,
        expiresInSeconds: signedData.expiresInSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/cases/:id/stage
 * Admin stage-control action. Uses enforceStageTransition to validate pipeline sequence.
 * Logs action without medical data.
 */
export const updateAdminCaseStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage: targetStage, reason } = req.body;
    const adminId = req.user.id;

    const caseItem = await prisma.medicalCase.findUnique({
      where: { id },
      select: { id: true, stage: true, deletedAt: true },
    });

    if (!caseItem || caseItem.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    // Enforce pipeline rules (throws if invalid jump)
    const nextStage = enforceStageTransition(caseItem.stage, targetStage);

    const updated = await prisma.medicalCase.update({
      where: { id },
      data: { stage: nextStage },
      select: {
        id: true,
        stage: true,
        updatedAt: true,
      },
    });

    // Audit log without medical data
    console.log(
      `[ADMIN AUDIT] Case ${id} stage changed from '${caseItem.stage}' to '${nextStage}' by Admin ${adminId}${
        reason ? `. Reason: ${reason}` : ''
      }`
    );

    return res.status(200).json({
      status: 'ok',
      message: `Case stage successfully updated to ${nextStage}`,
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

// =========================================================================
// 3. REFERRALS AND COMMISSIONS
// =========================================================================

/**
 * GET /api/admin/referrals
 * Returns Referral rows with status, commissionCents, and totals.
 */
export const getReferrals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Filter out lazily generated placeholder rows where referredPatientId is null
    const where = {
      referredPatientId: { not: null },
    };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [referrals, total, totalCommissionsAgg, paidCommissionsAgg, pendingCommissionsAgg] =
      await Promise.all([
        prisma.referral.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          include: {
            referrer: {
              select: {
                id: true,
                email: true,
                patientProfile: { select: { fullName: true } },
              },
            },
            referredPatient: {
              select: {
                id: true,
                email: true,
                patientProfile: { select: { fullName: true } },
              },
            },
            booking: {
              select: {
                id: true,
                bookingFeeCents: true,
                status: true,
              },
            },
          },
        }),
        prisma.referral.count({ where }),
        // Total commissions sum (excluding placeholder rows)
        prisma.referral.aggregate({
          where: { referredPatientId: { not: null } },
          _sum: { commissionCents: true },
        }),
        // Paid commissions sum (excluding placeholder rows)
        prisma.referral.aggregate({
          where: { referredPatientId: { not: null }, status: 'PAID' },
          _sum: { commissionCents: true },
        }),
        // Pending commissions sum (excluding placeholder rows)
        prisma.referral.aggregate({
          where: { referredPatientId: { not: null }, status: { notIn: ['PAID', 'VOID'] } },
          _sum: { commissionCents: true },
        }),
      ]);

    const formatted = referrals.map((r) => ({
      id: r.id,
      code: r.code,
      referrerEmail: r.referrer?.email || 'Unknown',
      referrerName: r.referrer?.patientProfile?.fullName || r.referrer?.email?.split('@')[0] || 'User',
      referredPatientEmail: r.referredPatient?.email || null,
      referredPatientName: r.referredPatient?.patientProfile?.fullName || r.referredPatient?.email?.split('@')[0] || null,
      bookingId: r.bookingId,
      bookingStatus: r.booking?.status || null,
      bookingFeeCents: r.booking?.bookingFeeCents || 0,
      commissionRateBps: r.commissionRateBps,
      commissionCents: r.commissionCents || 0,
      currency: r.currency,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return res.status(200).json({
      status: 'ok',
      data: formatted,
      totals: {
        totalCommissionCents: totalCommissionsAgg._sum.commissionCents || 0,
        paidCommissionCents: paidCommissionsAgg._sum.commissionCents || 0,
        pendingCommissionCents: pendingCommissionsAgg._sum.commissionCents || 0,
        totalCount: total,
      },
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/referrals/:id/mark-paid
 * Marks a referral commission as PAID inside a single database transaction.
 */
export const markReferralPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          status: true,
          commissionCents: true,
          currency: true,
          referrerId: true,
          referredPatientId: true,
          bookingId: true,
        },
      });

      if (!referral) {
        const error = new Error('Referral record not found');
        error.statusCode = 404;
        throw error;
      }

      // Check 1: Do not allow marking placeholder rows as paid
      if (!referral.referredPatientId && !referral.bookingId) {
        const error = new Error('Cannot mark a placeholder referral row as paid');
        error.statusCode = 400;
        throw error;
      }

      if (referral.status === 'PAID') {
        const error = new Error('Referral commission has already been marked as paid');
        error.statusCode = 400;
        throw error;
      }

      // Check 2: Ensure one booking can never produce two paid referrals
      if (referral.bookingId) {
        const existingPaid = await tx.referral.findFirst({
          where: {
            bookingId: referral.bookingId,
            status: 'PAID',
            id: { not: id },
          },
        });
        if (existingPaid) {
          const error = new Error('Another referral for this booking has already been marked as PAID');
          error.statusCode = 400;
          throw error;
        }
      }

      const updated = await tx.referral.update({
        where: { id },
        data: { status: 'PAID' },
        select: {
          id: true,
          code: true,
          status: true,
          commissionCents: true,
          currency: true,
          updatedAt: true,
        },
      });

      // Send notification to referrer
      await tx.notification.create({
        data: {
          userId: referral.referrerId,
          type: 'COMMISSION_PAID',
          title: 'Referral Commission Paid',
          body: `Your referral commission for code ${referral.code} has been disbursed and marked as paid.`,
        },
      });

      return updated;
    });

    console.log(`[AUDIT] Referral ${id} (${result.code}) marked PAID by Admin ${req.user.id}`);

    return res.status(200).json({
      status: 'ok',
      message: `Referral ${result.code} successfully marked as PAID.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 4. ANALYTICS
// =========================================================================

/**
 * GET /api/admin/analytics
 * Platform health metrics: counts by stage, cases per country, approved hospitals,
 * total booking value (cents), and total commissions (cents).
 * Gracefully handles 0 rows in any table.
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const [
      stageGroups,
      countryCases,
      approvedHospitalsCount,
      pendingHospitalsCount,
      bookingAgg,
      referralAgg,
      totalCases,
      totalUsers,
    ] = await Promise.all([
      // 1. Counts by stage
      prisma.medicalCase.groupBy({
        by: ['stage'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      // 2. Cases destination countries
      prisma.medicalCase.findMany({
        where: { deletedAt: null },
        select: {
          destination: { select: { country: true } },
        },
      }),
      // 3. Approved hospitals count
      prisma.hospital.count({
        where: { verificationStatus: 'APPROVED' },
      }),
      // 4. Pending hospitals count
      prisma.hospital.count({
        where: { verificationStatus: 'PENDING' },
      }),
      // 5. Total booking value in cents (0 if no bookings)
      prisma.booking.aggregate({
        _sum: { bookingFeeCents: true },
      }),
      // 6. Total commissions in cents (0 if no referrals, excluding placeholder rows)
      prisma.referral.aggregate({
        where: { referredPatientId: { not: null } },
        _sum: { commissionCents: true },
      }),
      // 7. Total cases
      prisma.medicalCase.count({
        where: { deletedAt: null },
      }),
      // 8. Total registered users
      prisma.user.count(),
    ]);

    // Build complete stage map with zero default for all valid stages
    const countsByStage = {};
    for (const stage of STAGE_PIPELINE) {
      countsByStage[stage] = 0;
    }
    for (const group of stageGroups) {
      countsByStage[group.stage] = group._count.id;
    }

    const stageList = STAGE_PIPELINE.map((stage) => ({
      stage,
      count: countsByStage[stage] || 0,
    }));

    // Aggregate cases per country
    const countryCountMap = {};
    for (const c of countryCases) {
      const country = c.destination?.country || 'Unassigned / Global';
      countryCountMap[country] = (countryCountMap[country] || 0) + 1;
    }

    const casesPerCountry = Object.entries(countryCountMap)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      status: 'ok',
      data: {
        countsByStage,
        stageList,
        casesPerCountry,
        approvedHospitalsCount: approvedHospitalsCount || 0,
        pendingHospitalsCount: pendingHospitalsCount || 0,
        totalBookingValueCents: bookingAgg._sum.bookingFeeCents || 0,
        totalCommissionsCents: referralAgg._sum.commissionCents || 0,
        totalCases: totalCases || 0,
        totalUsers: totalUsers || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 5. USERS
// =========================================================================

/**
 * GET /api/admin/users
 * View-only user directory. NEVER returns passwordHash or credentials.
 */
export const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (search && search.trim().length > 0) {
      where.email = { contains: search.trim(), mode: 'insensitive' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          patientProfile: {
            select: {
              fullName: true,
              country: true,
            },
          },
          hospital: {
            select: {
              name: true,
              city: true,
              country: true,
              verificationStatus: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => {
      let displayName = u.email.split('@')[0];
      let details = 'Administrator';

      if (u.role === 'PATIENT') {
        displayName = u.patientProfile?.fullName || displayName;
        details = u.patientProfile?.country || 'International Patient';
      } else if (u.role === 'HOSPITAL') {
        displayName = u.hospital?.name || displayName;
        details = u.hospital ? `${u.hospital.city}, ${u.hospital.country} (${u.hospital.verificationStatus})` : 'Hospital Owner';
      }

      return {
        id: u.id,
        email: u.email,
        name: displayName,
        role: u.role,
        details,
        isActive: u.isActive,
        createdAt: u.createdAt,
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: formatted,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
