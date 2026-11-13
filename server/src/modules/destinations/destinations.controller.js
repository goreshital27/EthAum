import prisma from '../../config/prisma.js';

/**
 * GET /api/destinations
 * Returns all destinations with approved hospital counts
 */
export const getDestinations = async (req, res, next) => {
  try {
    const destinations = await prisma.destination.findMany({
      orderBy: { country: 'asc' },
    });

    // Group approved hospitals by country to compute counts in a single query
    const hospitalCounts = await prisma.hospital.groupBy({
      by: ['country'],
      where: {
        verificationStatus: 'APPROVED',
      },
      _count: {
        id: true,
      },
    });

    const countMap = {};
    for (const item of hospitalCounts) {
      countMap[item.country.toLowerCase()] = item._count.id;
    }

    const data = destinations.map((dest) => ({
      id: dest.id,
      country: dest.country,
      city: dest.city,
      slug: dest.slug,
      overview: dest.overview,
      travelInfo: dest.travelInfo,
      visaInfo: dest.visaInfo,
      hospitalCount: countMap[dest.country.toLowerCase()] || 0,
    }));

    return res.status(200).json({
      status: 'ok',
      data,
    });
  } catch (error) {
    next(error);
  }
};
