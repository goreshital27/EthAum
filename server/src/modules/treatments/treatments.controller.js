import prisma from '../../config/prisma.js';

/**
 * GET /api/treatments
 * Returns all treatments with approved hospital count and lowest price in cents
 */
export const getTreatments = async (req, res, next) => {
  try {
    const treatments = await prisma.treatment.findMany({
      orderBy: { name: 'asc' },
      include: {
        hospitalTreatments: {
          where: {
            hospital: {
              verificationStatus: 'APPROVED',
            },
          },
          select: {
            minPriceCents: true,
            maxPriceCents: true,
            currency: true,
          },
        },
      },
    });

    const data = treatments.map((t) => {
      const approvedLinks = t.hospitalTreatments || [];
      const hospitalCount = approvedLinks.length;
      let fromPriceCents = null;

      if (approvedLinks.length > 0) {
        fromPriceCents = Math.min(...approvedLinks.map((l) => l.minPriceCents));
      }

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        specialty: t.specialty,
        description: t.description,
        recoveryInfo: t.recoveryInfo,
        expectedStayDays: t.expectedStayDays,
        risks: t.risks,
        questionsToAsk: t.questionsToAsk,
        hospitalCount,
        fromPriceCents,
      };
    });

    return res.status(200).json({
      status: 'ok',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/treatments/:slug
 * Returns treatment details plus approved hospitals offering it with price ranges
 */
export const getTreatmentBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const treatment = await prisma.treatment.findUnique({
      where: { slug },
      include: {
        hospitalTreatments: {
          where: {
            hospital: {
              verificationStatus: 'APPROVED',
            },
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
                offersVirtualConsult: true,
              },
            },
          },
          orderBy: {
            minPriceCents: 'asc',
          },
        },
      },
    });

    if (!treatment) {
      return res.status(404).json({
        status: 'error',
        message: 'Treatment not found',
      });
    }

    const offerings = (treatment.hospitalTreatments || []).map((ht) => ({
      hospital: ht.hospital,
      minPriceCents: ht.minPriceCents,
      maxPriceCents: ht.maxPriceCents,
      currency: ht.currency,
    }));

    const fromPriceCents = offerings.length > 0 ? offerings[0].minPriceCents : null;

    return res.status(200).json({
      status: 'ok',
      data: {
        id: treatment.id,
        name: treatment.name,
        slug: treatment.slug,
        specialty: treatment.specialty,
        description: treatment.description,
        recoveryInfo: treatment.recoveryInfo,
        expectedStayDays: treatment.expectedStayDays,
        risks: treatment.risks,
        questionsToAsk: treatment.questionsToAsk,
        hospitalCount: offerings.length,
        fromPriceCents,
        offerings,
      },
    });
  } catch (error) {
    next(error);
  }
};
