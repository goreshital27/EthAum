import prisma from '../../config/prisma.js';

/**
 * GET /api/packages
 * Public browse endpoint for treatment packages from APPROVED hospitals
 */
export const getPackages = async (req, res, next) => {
  try {
    const {
      treatment,
      destination,
      minPrice,
      maxPrice,
      sort = 'price_low',
      page = 1,
      limit = 12,
    } = req.query;

    const where = {
      isActive: true,
      hospital: {
        verificationStatus: 'APPROVED',
      },
    };

    // Filter by destination
    if (destination && destination.trim().length > 0) {
      const destTrimmed = destination.trim();
      where.hospital = {
        verificationStatus: 'APPROVED',
        OR: [
          { country: { equals: destTrimmed, mode: 'insensitive' } },
          { city: { equals: destTrimmed, mode: 'insensitive' } },
        ],
      };
    }

    // Filter by treatment
    if (treatment && treatment.trim().length > 0) {
      const treatTrimmed = treatment.trim();
      where.treatment = {
        OR: [
          { slug: { equals: treatTrimmed, mode: 'insensitive' } },
          { name: { contains: treatTrimmed, mode: 'insensitive' } },
        ],
      };
    }

    // Filter by price in cents
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.priceCents = {};
      if (minPrice !== undefined) where.priceCents.gte = minPrice;
      if (maxPrice !== undefined) where.priceCents.lte = maxPrice;
    }

    // Sort order
    const orderBy = {
      priceCents: sort === 'price_high' ? 'desc' : 'asc',
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        orderBy,
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          priceCents: true,
          currency: true,
          nights: true,
          inclusions: true,
          exclusions: true,
          cancellationTerms: true,
          treatment: {
            select: {
              id: true,
              name: true,
              slug: true,
              specialty: true,
            },
          },
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
      }),
      prisma.package.count({ where }),
    ]);

    return res.status(200).json({
      status: 'ok',
      data: packages,
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
 * GET /api/packages/:id
 * Get details for a single package from an APPROVED hospital
 */
export const getPackageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pkg = await prisma.package.findUnique({
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
            languages: true,
          },
        },
      },
    });

    if (!pkg || !pkg.isActive || pkg.hospital.verificationStatus !== 'APPROVED') {
      return res.status(404).json({
        status: 'fail',
        message: 'Package or accredited hospital not found',
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: {
        id: pkg.id,
        title: pkg.title,
        priceCents: pkg.priceCents,
        currency: pkg.currency,
        nights: pkg.nights,
        inclusions: pkg.inclusions || [],
        exclusions: pkg.exclusions || [],
        cancellationTerms: pkg.cancellationTerms,
        treatment: pkg.treatment,
        hospital: {
          id: pkg.hospital.id,
          name: pkg.hospital.name,
          slug: pkg.hospital.slug,
          city: pkg.hospital.city,
          country: pkg.hospital.country,
          accreditations: pkg.hospital.accreditations || [],
          offersVirtualConsult: pkg.hospital.offersVirtualConsult,
          languages: pkg.hospital.languages || [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
