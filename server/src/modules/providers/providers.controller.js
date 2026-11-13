import prisma from '../../config/prisma.js';

/**
 * GET /api/hospitals
 * Public browse endpoint for approved hospitals
 * Query filters: search, destination, treatment, accreditation, minRating, sort, page, limit
 */
export const getHospitals = async (req, res, next) => {
  try {
    const {
      search,
      destination,
      treatment,
      accreditation,
      minRating,
      sort = 'name',
      page = 1,
      limit = 12,
    } = req.query;

    // 1. Compute review aggregates (avg rating & count) across all hospitals in ONE database query
    const reviewStats = await prisma.review.groupBy({
      by: ['hospitalId'],
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ratingMap = {};
    for (const stat of reviewStats) {
      ratingMap[stat.hospitalId] = {
        avgRating: stat._avg.rating ? Number(stat._avg.rating.toFixed(1)) : 0,
        reviewCount: stat._count.rating || 0,
      };
    }

    // 2. Compute lowest treatment price per hospital in ONE aggregate query
    const priceStats = await prisma.hospitalTreatment.groupBy({
      by: ['hospitalId'],
      _min: { minPriceCents: true },
    });

    const fromPriceMap = {};
    for (const p of priceStats) {
      fromPriceMap[p.hospitalId] = p._min.minPriceCents || null;
    }

    // 3. Construct base query filter - STRICTLY APPROVED HOSPITALS ONLY
    const where = {
      verificationStatus: 'APPROVED',
    };

    // Search filter across hospital name, city, or country
    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { city: { contains: search.trim(), mode: 'insensitive' } },
        { country: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Destination filter (matches country or city)
    if (destination && destination.trim().length > 0) {
      const destTrimmed = destination.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { country: { equals: destTrimmed, mode: 'insensitive' } },
          { city: { equals: destTrimmed, mode: 'insensitive' } },
        ],
      });
    }

    // Treatment filter (matches treatment slug or name via hospitalTreatments)
    if (treatment && treatment.trim().length > 0) {
      const treatTrimmed = treatment.trim();
      where.hospitalTreatments = {
        some: {
          treatment: {
            OR: [
              { slug: { equals: treatTrimmed, mode: 'insensitive' } },
              { name: { contains: treatTrimmed, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    // Accreditation filter (checks if array contains accreditation tag)
    if (accreditation && accreditation.trim().length > 0) {
      where.accreditations = {
        has: accreditation.trim().toUpperCase(),
      };
    }

    // 4. Fetch matching approved hospitals
    const allMatchingHospitals = await prisma.hospital.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        accreditations: true,
        offersVirtualConsult: true,
        hospitalTreatments: {
          select: {
            minPriceCents: true,
            treatment: {
              select: {
                specialty: true,
              },
            },
          },
        },
      },
    });

    // 5. Build card representations
    let cards = allMatchingHospitals.map((h) => {
      const stats = ratingMap[h.id] || { avgRating: 0, reviewCount: 0 };
      const fromPrice = fromPriceMap[h.id] || null;

      // Extract unique specialties from hospital treatments
      const specialties = [
        ...new Set(
          (h.hospitalTreatments || [])
            .map((ht) => ht.treatment?.specialty)
            .filter(Boolean)
        ),
      ];

      return {
        id: h.id,
        name: h.name,
        slug: h.slug,
        city: h.city,
        country: h.country,
        accreditations: h.accreditations || [],
        specialties,
        averageRating: stats.avgRating,
        reviewCount: stats.reviewCount,
        fromPriceCents: fromPrice,
        offersVirtualConsult: h.offersVirtualConsult,
      };
    });

    // 6. Filter by minRating if specified
    if (minRating !== undefined && minRating !== null) {
      cards = cards.filter((c) => c.averageRating >= minRating);
    }

    // 7. Sort cards
    if (sort === 'rating') {
      cards.sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount);
    } else if (sort === 'price_low') {
      cards.sort((a, b) => {
        if (a.fromPriceCents === null) return 1;
        if (b.fromPriceCents === null) return -1;
        return a.fromPriceCents - b.fromPriceCents;
      });
    } else {
      // Default: name A to Z
      cards.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 8. Apply pagination
    const total = cards.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedCards = cards.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      status: 'ok',
      data: paginatedCards,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hospitals/:slug
 * Full profile of an APPROVED hospital only.
 * Returns two separate groups: "verified" and "providerReported".
 * Also returns doctors, treatments with price ranges, packages, and rating breakdown.
 */
export const getHospitalBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: { slug },
      include: {
        doctors: {
          select: {
            id: true,
            name: true,
            specialty: true,
            qualifications: true,
            yearsExperience: true,
            languages: true,
            bio: true,
          },
          orderBy: { name: 'asc' },
        },
        hospitalTreatments: {
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
          },
          orderBy: { minPriceCents: 'asc' },
        },
        packages: {
          where: { isActive: true },
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
          orderBy: { priceCents: 'asc' },
        },
      },
    });

    // Strictly APPROVED hospitals only
    if (!hospital || hospital.verificationStatus !== 'APPROVED') {
      return res.status(404).json({
        status: 'fail',
        message: 'Hospital not found or not approved',
      });
    }

    // Rating breakdown (5 to 1 stars) & aggregates
    const reviewGroups = await prisma.review.groupBy({
      by: ['rating'],
      where: { hospitalId: hospital.id },
      _count: { rating: true },
    });

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalStars = 0;
    let reviewCount = 0;

    for (const rg of reviewGroups) {
      if (ratingBreakdown[rg.rating] !== undefined) {
        ratingBreakdown[rg.rating] = rg._count.rating;
        totalStars += rg.rating * rg._count.rating;
        reviewCount += rg._count.rating;
      }
    }

    const averageRating = reviewCount > 0 ? Number((totalStars / reviewCount).toFixed(1)) : 0;

    // Derived unique specialties
    const specialties = [
      ...new Set([
        ...(hospital.hospitalTreatments || []).map((ht) => ht.treatment?.specialty),
        ...(hospital.doctors || []).map((d) => d.specialty),
      ].filter(Boolean)),
    ];

    // Format treatments with price ranges in cents
    const treatments = (hospital.hospitalTreatments || []).map((ht) => ({
      id: ht.treatment.id,
      name: ht.treatment.name,
      slug: ht.treatment.slug,
      specialty: ht.treatment.specialty,
      description: ht.treatment.description,
      expectedStayDays: ht.treatment.expectedStayDays,
      minPriceCents: ht.minPriceCents,
      maxPriceCents: ht.maxPriceCents,
      currency: ht.currency,
    }));

    // Format packages
    const packages = (hospital.packages || []).map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      priceCents: pkg.priceCents,
      currency: pkg.currency,
      nights: pkg.nights,
      inclusions: pkg.inclusions || [],
      exclusions: pkg.exclusions || [],
      cancellationTerms: pkg.cancellationTerms,
      treatment: {
        id: pkg.treatment.id,
        name: pkg.treatment.name,
        slug: pkg.treatment.slug,
        specialty: pkg.treatment.specialty,
      },
    }));

    // Format doctors
    const doctors = (hospital.doctors || []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      specialty: doc.specialty,
      qualifications: doc.qualifications,
      yearsExperience: doc.yearsExperience,
      languages: doc.languages || [],
      bio: doc.bio,
    }));

    return res.status(200).json({
      status: 'ok',
      data: {
        id: hospital.id,
        name: hospital.name,
        slug: hospital.slug,
        city: hospital.city,
        country: hospital.country,
        verified: {
          verificationStatus: hospital.verificationStatus,
          accreditations: hospital.accreditations || [],
          verifiedAt: hospital.verifiedAt,
        },
        providerReported: {
          description: hospital.description || '',
          specialties,
          equipment: [], // Not stored in schema, reported by provider
          languages: hospital.languages || [],
          internationalServices: hospital.internationalServices || [],
          offersVirtualConsult: hospital.offersVirtualConsult,
        },
        doctors,
        treatments,
        packages,
        averageRating,
        reviewCount,
        ratingBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hospitals/:slug/reviews
 * Paginated reviews for an APPROVED hospital.
 * Anonymized reviewer: first name and country only. Never returns emails or user IDs.
 */
export const getHospitalReviews = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const hospital = await prisma.hospital.findUnique({
      where: { slug },
      select: { id: true, verificationStatus: true },
    });

    if (!hospital || hospital.verificationStatus !== 'APPROVED') {
      return res.status(404).json({
        status: 'fail',
        message: 'Hospital not found or not approved',
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { hospitalId: hospital.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          patient: {
            select: {
              patientProfile: {
                select: {
                  fullName: true,
                  country: true,
                },
              },
            },
          },
        },
      }),
      prisma.review.count({ where: { hospitalId: hospital.id } }),
    ]);

    // Anonymize: show only reviewer's first name and country
    const sanitizedReviews = reviews.map((r) => {
      const rawName = r.patient?.patientProfile?.fullName || 'Anonymous Patient';
      const firstName = rawName.trim().split(' ')[0] || 'Patient';
      const country = r.patient?.patientProfile?.country || 'International';

      return {
        id: r.id,
        reviewerFirstName: firstName,
        country,
        rating: r.rating,
        comment: r.comment,
        hospitalReply: r.hospitalReply,
        isVerified: r.isVerified,
        createdAt: r.createdAt,
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: sanitizedReviews,
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
 * GET /api/doctors/:id
 * Doctor profile with accredited hospital summary.
 * 404 if doctor not found or hospital is not APPROVED.
 */
export const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
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
            verificationStatus: true,
          },
        },
      },
    });

    if (!doctor || !doctor.hospital || doctor.hospital.verificationStatus !== 'APPROVED') {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor or accredited hospital not found',
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        qualifications: doctor.qualifications,
        yearsExperience: doctor.yearsExperience,
        languages: doctor.languages || [],
        bio: doctor.bio,
        hospital: {
          id: doctor.hospital.id,
          name: doctor.hospital.name,
          slug: doctor.hospital.slug,
          city: doctor.hospital.city,
          country: doctor.hospital.country,
          accreditations: doctor.hospital.accreditations || [],
          offersVirtualConsult: doctor.hospital.offersVirtualConsult,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/compare?slugs=a,b,c
 * Compare 2 to 3 approved hospitals side-by-side.
 * Returns consistent attribute keys for all requested hospitals.
 */
export const getCompareHospitals = async (req, res, next) => {
  try {
    const { slugs, treatment } = req.query;

    const hospitals = await prisma.hospital.findMany({
      where: {
        slug: { in: slugs },
        verificationStatus: 'APPROVED',
      },
      include: {
        doctors: {
          select: { id: true, specialty: true },
        },
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
        },
      },
    });

    // Check if all requested hospitals exist and are approved
    if (hospitals.length !== slugs.length) {
      return res.status(404).json({
        status: 'fail',
        message: 'One or more requested hospitals were not found or are not approved for comparison',
      });
    }

    // Query review statistics in batch
    const reviewStats = await prisma.review.groupBy({
      by: ['hospitalId'],
      where: {
        hospitalId: { in: hospitals.map((h) => h.id) },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ratingMap = {};
    for (const stat of reviewStats) {
      ratingMap[stat.hospitalId] = {
        avgRating: stat._avg.rating ? Number(stat._avg.rating.toFixed(1)) : 0,
        reviewCount: stat._count.rating || 0,
      };
    }

    // Sort to match requested order in `slugs`
    const hospitalMap = {};
    for (const h of hospitals) {
      hospitalMap[h.slug] = h;
    }

    const comparisonList = slugs.map((slug) => {
      const h = hospitalMap[slug];
      const stats = ratingMap[h.id] || { avgRating: 0, reviewCount: 0 };

      // Determine "from" price
      let fromPriceCents = null;
      if (treatment && treatment.trim().length > 0) {
        const targetSlug = treatment.trim().toLowerCase();
        const matchedHt = (h.hospitalTreatments || []).find(
          (ht) => ht.treatment?.slug?.toLowerCase() === targetSlug
        );
        fromPriceCents = matchedHt ? matchedHt.minPriceCents : null;
      } else {
        // Overall starting price
        const prices = (h.hospitalTreatments || []).map((ht) => ht.minPriceCents);
        fromPriceCents = prices.length > 0 ? Math.min(...prices) : null;
      }

      // Derived specialties
      const specialties = [
        ...new Set([
          ...(h.hospitalTreatments || []).map((ht) => ht.treatment?.specialty),
          ...(h.doctors || []).map((d) => d.specialty),
        ].filter(Boolean)),
      ];

      return {
        id: h.id,
        name: h.name,
        slug: h.slug,
        city: h.city,
        country: h.country,
        accreditations: h.accreditations || [],
        averageRating: stats.avgRating,
        reviewCount: stats.reviewCount,
        doctorCount: (h.doctors || []).length,
        languages: h.languages || [],
        telehealthAvailable: h.offersVirtualConsult,
        fromPriceCents,
        specialties,
        internationalServices: h.internationalServices || [],
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: comparisonList,
    });
  } catch (error) {
    next(error);
  }
};
