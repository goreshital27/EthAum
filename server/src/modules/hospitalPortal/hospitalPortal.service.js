import prisma from '../../config/prisma.js';

export const hospitalPortalService = {
  /**
   * Find hospital belonging to authenticated user
   */
  async getHospitalByUserId(userId) {
    return prisma.hospital.findUnique({
      where: { ownerId: userId },
    });
  },

  /**
   * Get full profile for hospital management
   */
  async getProfile(hospitalId) {
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: {
        hospitalTreatments: {
          include: {
            treatment: {
              select: {
                id: true,
                name: true,
                slug: true,
                specialty: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        doctors: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!hospital) {
      throw new Error('Hospital profile not found');
    }

    return {
      id: hospital.id,
      name: hospital.name,
      slug: hospital.slug,
      city: hospital.city,
      country: hospital.country,
      verificationStatus: hospital.verificationStatus,
      verifiedAt: hospital.verifiedAt,
      // Provider-reported fields (explicitly categorized)
      providerReported: {
        description: hospital.description || '',
        languages: hospital.languages || [],
        accreditations: hospital.accreditations || [],
        internationalServices: hospital.internationalServices || [],
        offersVirtualConsult: hospital.offersVirtualConsult,
      },
      treatments: hospital.hospitalTreatments.map((ht) => ({
        id: ht.id,
        treatmentId: ht.treatmentId,
        treatmentName: ht.treatment.name,
        specialty: ht.treatment.specialty,
        slug: ht.treatment.slug,
        minPriceCents: ht.minPriceCents,
        maxPriceCents: ht.maxPriceCents,
        currency: ht.currency,
      })),
      doctors: hospital.doctors,
    };
  },

  /**
   * Update hospital provider-reported fields
   */
  async updateProfile(hospitalId, data) {
    const updated = await prisma.hospital.update({
      where: { id: hospitalId },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.languages !== undefined ? { languages: data.languages } : {}),
        ...(data.accreditations !== undefined ? { accreditations: data.accreditations } : {}),
        ...(data.internationalServices !== undefined
          ? { internationalServices: data.internationalServices }
          : {}),
        ...(data.offersVirtualConsult !== undefined
          ? { offersVirtualConsult: data.offersVirtualConsult }
          : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
      },
    });

    return updated;
  },

  /**
   * Add a treatment offering with price range
   */
  async addTreatment(hospitalId, data) {
    // Verify treatment exists
    const treatment = await prisma.treatment.findUnique({
      where: { id: data.treatmentId },
    });
    if (!treatment) {
      throw new Error('Selected treatment does not exist');
    }

    // Check if already offered
    const existing = await prisma.hospitalTreatment.findUnique({
      where: {
        hospitalId_treatmentId: {
          hospitalId,
          treatmentId: data.treatmentId,
        },
      },
    });
    if (existing) {
      throw new Error('This treatment is already offered by your hospital');
    }

    return prisma.hospitalTreatment.create({
      data: {
        hospitalId,
        treatmentId: data.treatmentId,
        minPriceCents: data.minPriceCents,
        maxPriceCents: data.maxPriceCents,
        currency: data.currency || 'USD',
      },
      include: {
        treatment: true,
      },
    });
  },

  /**
   * Update treatment offering pricing
   */
  async updateTreatment(hospitalId, treatmentId, data) {
    const existing = await prisma.hospitalTreatment.findFirst({
      where: { hospitalId, treatmentId },
    });
    if (!existing) {
      throw new Error('Treatment offering not found for your hospital');
    }

    return prisma.hospitalTreatment.update({
      where: {
        hospitalId_treatmentId: {
          hospitalId,
          treatmentId,
        },
      },
      data: {
        ...(data.minPriceCents !== undefined ? { minPriceCents: data.minPriceCents } : {}),
        ...(data.maxPriceCents !== undefined ? { maxPriceCents: data.maxPriceCents } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
      },
      include: {
        treatment: true,
      },
    });
  },

  /**
   * Remove treatment offering
   */
  async removeTreatment(hospitalId, treatmentId) {
    const existing = await prisma.hospitalTreatment.findFirst({
      where: { hospitalId, treatmentId },
    });
    if (!existing) {
      throw new Error('Treatment offering not found for your hospital');
    }

    return prisma.hospitalTreatment.delete({
      where: {
        hospitalId_treatmentId: {
          hospitalId,
          treatmentId,
        },
      },
    });
  },

  /**
   * Add specialist doctor
   */
  async addDoctor(hospitalId, data) {
    return prisma.doctor.create({
      data: {
        hospitalId,
        name: data.name,
        specialty: data.specialty,
        qualifications: data.qualifications || null,
        yearsExperience: data.yearsExperience || null,
        languages: data.languages || ['English'],
        bio: data.bio || null,
      },
    });
  },

  /**
   * Update doctor
   */
  async updateDoctor(hospitalId, doctorId, data) {
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, hospitalId },
    });
    if (!doctor) {
      throw new Error('Doctor profile not found for your hospital');
    }

    return prisma.doctor.update({
      where: { id: doctorId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
        ...(data.qualifications !== undefined ? { qualifications: data.qualifications } : {}),
        ...(data.yearsExperience !== undefined ? { yearsExperience: data.yearsExperience } : {}),
        ...(data.languages !== undefined ? { languages: data.languages } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
      },
    });
  },

  /**
   * Remove doctor
   */
  async removeDoctor(hospitalId, doctorId) {
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, hospitalId },
    });
    if (!doctor) {
      throw new Error('Doctor profile not found for your hospital');
    }

    return prisma.doctor.delete({
      where: { id: doctorId },
    });
  },

  /**
   * Lead inbox: list of enquiries for MY hospital only.
   * Enforces privacy: anonymized summary without patient name or email until a quote is sent (status: RESPONDED).
   */
  async getLeadInbox(hospital, query) {
    if (hospital.verificationStatus === 'PENDING') {
      return {
        isPendingApproval: true,
        message: 'Your hospital is awaiting admin approval',
        leads: [],
        total: 0,
      };
    }

    const { status = 'ALL', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      hospitalId: hospital.id,
      ...(status && status !== 'ALL' ? { status } : {}),
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
                },
              },
              destination: {
                select: {
                  country: true,
                  city: true,
                },
              },
              patient: {
                select: {
                  email: true,
                  patientProfile: {
                    select: {
                      fullName: true,
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

    const formattedLeads = enquiries.map((enq) => {
      const isQuoteSent =
        enq.status === 'RESPONDED' ||
        (enq.quotations &&
          enq.quotations.some((q) => ['SENT', 'ACCEPTED', 'REJECTED'].includes(q.status)));
      const patient = enq.case?.patient;
      const patientProfile = patient?.patientProfile;

      return {
        id: enq.id,
        caseId: enq.caseId,
        status: enq.status,
        urgency: enq.urgency || 'NORMAL',
        createdAt: enq.createdAt,
        updatedAt: enq.updatedAt,
        // Anonymized summary attributes
        treatment: {
          name: enq.case.treatment?.name || enq.case.treatmentNeed || 'General Medical',
          specialty: enq.case.treatment?.specialty || 'General',
        },
        budget: {
          budgetCents: enq.case.budgetCents,
          currency: enq.case.currency || 'USD',
        },
        country: patientProfile?.country || enq.case.destination?.country || 'International',
        stage: enq.case.stage,
        // Patient Privacy: No name, email, or phone until a quote has been sent
        patient: isQuoteSent
          ? {
              name: patientProfile?.fullName || 'Patient',
              email: patient?.email || null,
              phone: patientProfile?.phone || null,
              isRevealed: true,
            }
          : {
              name: 'Confidential Patient',
              email: null,
              phone: null,
              isRevealed: false,
            },
        quotationsCount: enq.quotations.length,
        hasQuotes: enq.quotations.length > 0,
      };
    });

    return {
      isPendingApproval: false,
      leads: formattedLeads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Case view for a lead:
   * Shows case details; document list and view links ONLY if a valid Consent row exists (not expired or revoked).
   */
  async getLeadCaseDetail(hospital, enquiryId) {
    if (hospital.verificationStatus === 'PENDING') {
      const err = new Error('Your hospital is awaiting admin approval');
      err.statusCode = 403;
      throw err;
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
                email: true,
                patientProfile: {
                  select: {
                    fullName: true,
                    country: true,
                    language: true,
                    phone: true,
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
      const err = new Error('Enquiry not found for your hospital');
      err.statusCode = 404;
      throw err;
    }

    // Auto-transition NEW -> VIEWED
    if (enquiry.status === 'NEW') {
      await prisma.enquiry.update({
        where: { id: enquiry.id },
        data: { status: 'VIEWED' },
      });
      enquiry.status = 'VIEWED';
    }

    // Check active Consent
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

    const isQuoteSent =
      enquiry.status === 'RESPONDED' ||
      (enquiry.quotations &&
        enquiry.quotations.some((q) => ['SENT', 'ACCEPTED', 'REJECTED'].includes(q.status)));

    return {
      id: enquiry.id,
      caseId: enquiry.caseId,
      status: enquiry.status,
      urgency: enquiry.urgency,
      notes: enquiry.notes,
      assignedToName: enquiry.assignedToName,
      respondBy: enquiry.respondBy,
      createdAt: enquiry.createdAt,
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
        patientCountry:
          enquiry.case.patient?.patientProfile?.country ||
          enquiry.case.destination?.country ||
          'International',
        createdAt: enquiry.case.createdAt,
        // Contact details revealed only after quote sent
        patient: isQuoteSent
          ? {
              name: enquiry.case.patient?.patientProfile?.fullName || 'Patient',
              email: enquiry.case.patient?.email,
              phone: enquiry.case.patient?.patientProfile?.phone || null,
              isRevealed: true,
            }
          : {
              name: 'Confidential Patient',
              email: null,
              phone: null,
              isRevealed: false,
            },
      },
      hasConsent: Boolean(isConsentActive),
      consentDetails: isConsentActive
        ? {
            grantedAt: consent.grantedAt,
            expiresAt: consent.expiresAt,
            scope: consent.scope,
          }
        : null,
      documents,
      recordsNotice: isConsentActive
        ? null
        : 'Patient has not shared records',
      quotations: enquiry.quotations,
    };
  },
};

export default hospitalPortalService;
