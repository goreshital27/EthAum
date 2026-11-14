import prisma from '../../config/prisma.js';
import { generateJSON, getAIProvider } from '../../services/ai.js';
import {
  readinessOutputSchema,
  providerMatchingOutputSchema,
  quoteComparisonOutputSchema,
} from '../../services/ai.schemas.js';

/**
 * Extract safe allowlisted inputs from a MedicalCase entity.
 * Excludes all patient identifiers, names, phone numbers, emails, and raw clinical records.
 */
export function extractAllowlistedInput(medicalCase) {
  const patientProfile = medicalCase.patient?.patientProfile;
  const treatment = medicalCase.treatment;
  const destination = medicalCase.destination;

  let treatmentCategory = 'General Medical Coordination';
  if (treatment?.name) {
    treatmentCategory = treatment.name;
    if (treatment.specialty) {
      treatmentCategory += ` (${treatment.specialty})`;
    }
  } else if (medicalCase.treatmentNeed) {
    treatmentCategory = medicalCase.treatmentNeed;
  }

  let budgetRange = 'Not specified';
  if (medicalCase.budgetCents) {
    const formatted = Math.round(medicalCase.budgetCents / 100).toLocaleString('en-US');
    budgetRange = `Up to $${formatted} ${medicalCase.currency || 'USD'}`;
  }

  const preferredDestinations = [];
  if (destination) {
    preferredDestinations.push(
      destination.city ? `${destination.city}, ${destination.country}` : destination.country
    );
  }

  const languages = [];
  if (medicalCase.language) {
    languages.push(medicalCase.language);
  } else if (patientProfile?.language) {
    languages.push(patientProfile.language);
  } else {
    languages.push('en');
  }

  return {
    ageRange: 'Adult',
    country: patientProfile?.country || destination?.country || 'Not specified',
    treatmentCategory,
    budgetRange,
    urgency: medicalCase.travelDateFrom ? 'Specific target travel dates' : 'Standard',
    preferredDestinations,
    languages,
  };
}

/**
 * Check if a fresh completed summary exists for the case.
 * Cache rule: If case already has a COMPLETED result of the same type created after the case's updatedAt,
 * return cached output instead of re-running.
 */
export async function getCachedSummary(caseId, type, caseUpdatedAt) {
  return await prisma.aICaseSummary.findFirst({
    where: {
      caseId,
      type,
      status: 'COMPLETED',
      createdAt: {
        gte: caseUpdatedAt,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Create a new QUEUED AI case summary record
 */
export async function createQueuedJob(caseId, type) {
  return await prisma.aICaseSummary.create({
    data: {
      caseId,
      type,
      status: 'QUEUED',
    },
  });
}

/**
 * Process readiness check asynchronously
 */
export async function processReadinessJob(jobId, caseId) {
  try {
    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        treatment: true,
        destination: true,
      },
    });

    if (!medicalCase) {
      throw new Error(`Medical case not found: ${caseId}`);
    }

    const allowlistedInput = extractAllowlistedInput(medicalCase);

    const result = await generateJSON({
      task: 'readiness',
      input: allowlistedInput,
      schema: readinessOutputSchema,
    });

    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        outputJson: result,
        model: getAIProvider(),
      },
    });
  } catch (error) {
    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message || 'Readiness evaluation failed',
        model: getAIProvider(),
      },
    });
  }
}

/**
 * Process provider matching asynchronously
 * Enforces:
 * - Candidates come ONLY from APPROVED hospitals matching the case treatment.
 * - Post-AI response validation drops any hospital ID that does not exist or is not APPROVED.
 * - Mock mode ranks by treatment match, destination preference, and rating.
 */
export async function processMatchingJob(jobId, caseId) {
  try {
    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        treatment: true,
        destination: true,
      },
    });

    if (!medicalCase) {
      throw new Error(`Medical case not found: ${caseId}`);
    }

    // Query APPROVED hospitals offering the case treatment
    const candidateHospitals = await prisma.hospital.findMany({
      where: {
        verificationStatus: 'APPROVED',
        hospitalTreatments: medicalCase.treatmentId
          ? {
              some: {
                treatmentId: medicalCase.treatmentId,
              },
            }
          : undefined,
      },
      include: {
        hospitalTreatments: medicalCase.treatmentId
          ? {
              where: {
                treatmentId: medicalCase.treatmentId,
              },
            }
          : true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    // Prepare candidate profiles
    const approvedCandidates = candidateHospitals.map((h) => {
      const ht = h.hospitalTreatments?.[0];
      const avgRating =
        h.reviews.length > 0
          ? h.reviews.reduce((acc, r) => acc + r.rating, 0) / h.reviews.length
          : 4.5;

      return {
        id: h.id,
        name: h.name,
        city: h.city,
        country: h.country,
        accreditations: h.accreditations || [],
        languages: h.languages || ['English'],
        minPriceCents: ht?.minPriceCents,
        maxPriceCents: ht?.maxPriceCents,
        rating: avgRating,
      };
    });

    const allowlistedInput = extractAllowlistedInput(medicalCase);
    allowlistedInput.candidateHospitals = approvedCandidates;

    const result = await generateJSON({
      task: 'matching',
      input: allowlistedInput,
      schema: providerMatchingOutputSchema,
    });

    // Post-AI response validation:
    // Drop any hospital ID that does not exist in our approved candidate list
    const approvedIdSet = new Set(approvedCandidates.map((c) => c.id));
    const validatedMatches = (result.matches || [])
      .filter((m) => approvedIdSet.has(m.hospitalId))
      .slice(0, 5);

    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        outputJson: { matches: validatedMatches },
        model: getAIProvider(),
      },
    });
  } catch (error) {
    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message || 'Provider matching evaluation failed',
        model: getAIProvider(),
      },
    });
  }
}

/**
 * Process quote comparison asynchronously
 */
export async function processQuoteComparisonJob(jobId, caseId) {
  try {
    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        treatment: true,
        destination: true,
      },
    });

    if (!medicalCase) {
      throw new Error(`Medical case not found: ${caseId}`);
    }

    const quotations = await prisma.quotation.findMany({
      where: {
        enquiry: { caseId },
        status: { in: ['SENT', 'ACCEPTED'] },
      },
      include: {
        enquiry: {
          include: {
            hospital: {
              include: {
                reviews: { select: { rating: true } },
              },
            },
          },
        },
      },
    });

    const quotesForAI = quotations.map((q) => {
      const reviews = q.enquiry?.hospital?.reviews || [];
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 4.8;
      const lineItems = Array.isArray(q.lineItems) ? q.lineItems : [];
      const categories = lineItems
        .map((item) => item.category || item.name || 'Treatment')
        .filter(Boolean);

      return {
        hospitalName: q.enquiry?.hospital?.name || 'Accredited Hospital',
        accreditations: q.enquiry?.hospital?.accreditations || [],
        lineItemCategories: categories,
        totalCents: q.totalCents,
        stayDays: medicalCase.treatment?.expectedStayDays || 5,
        rating: avgRating,
      };
    });

    const result = await generateJSON({
      task: 'quoteComparison',
      input: {
        ...extractAllowlistedInput(medicalCase),
        quotes: quotesForAI,
      },
      schema: quoteComparisonOutputSchema,
    });

    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        outputJson: result,
        model: getAIProvider(),
      },
    });
  } catch (error) {
    await prisma.aICaseSummary.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message || 'Quote comparison evaluation failed',
        model: getAIProvider(),
      },
    });
  }
}

/**
 * Fetch the latest summary for each AI job type for a given case
 */
export async function getLatestCaseSummaries(caseId) {
  const [latestReadiness, latestMatching, latestQuoteComparison] = await Promise.all([
    prisma.aICaseSummary.findFirst({
      where: {
        caseId,
        type: 'QUALIFICATION',
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.aICaseSummary.findFirst({
      where: {
        caseId,
        type: 'PROVIDER_MATCHING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.aICaseSummary.findFirst({
      where: {
        caseId,
        type: 'QUOTE_COMPARISON',
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  return {
    qualification: latestReadiness,
    providerMatching: latestMatching,
    quoteComparison: latestQuoteComparison,
  };
}

export default {
  extractAllowlistedInput,
  getCachedSummary,
  createQueuedJob,
  processReadinessJob,
  processMatchingJob,
  processQuoteComparisonJob,
  getLatestCaseSummaries,
};
