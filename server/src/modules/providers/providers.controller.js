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

    // Treatment filter (matches treatment slug, ID or name)
    if (treatment && treatment.trim().length > 0) {
      const treatTrimmed = treatment.trim();
      where.hospitalTreatments = {
        some: {
          treatment: {
            OR: [
              { slug: treatTrimmed },
              { id: treatTrimmed },
              { name: { contains: treatTrimmed, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    // Accreditation filter (PostgreSQL array has)
    if (accreditation && accreditation.trim().length > 0) {
      where.accreditations = {
        has: accreditation.trim(),
      };
    }

    // Min rating filter using pre-aggregated ratings
    if (minRating !== undefined && minRating > 0) {
      const qualifyingIds = Object.keys(ratingMap).filter(
        (id) => ratingMap[id].avgRating >= minRating
      );
      where.id = { in: qualifyingIds };
    }

    // 4. Fetch matching hospitals with specialties derived from treatments
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

    // 6. Sort results
    if (sort === 'rating') {
      cards.sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount);
    } else if (sort === 'price_low') {
      cards.sort((a, b) => {
        if (a.fromPriceCents === null) return 1;
        if (b.fromPriceCents === null) return -1;
        return a.fromPriceCents - b.fromPriceCents;
      });
    } else {
      // Default sort by name ascending
      cards.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 7. Paginate in memory
    const total = cards.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedCards = cards.slice(offset, offset + limit);

    return res.status(200).json({
      status: 'ok',
      data: paginatedCards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};
