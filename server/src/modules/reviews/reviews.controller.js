import prisma from '../../config/prisma.js';
import { createNotification } from '../notifications/notifications.service.js';

/**
 * Strip any HTML tags to enforce plain text only.
 */
function sanitizePlainText(input) {
  if (!input) return null;
  return input.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * POST /api/reviews
 * Patient submits a review for a completed hospital booking.
 * Constraints:
 * - Patient must own the booking
 * - Booking status must be COMPLETED
 * - Exactly one review per booking
 * - Rating 1 to 5, plain text comment max 1000 characters
 * - Flagged as isVerified: true
 */
export async function createReview(req, res, next) {
  try {
    const patientId = req.user.id;
    const { bookingId, rating, comment } = req.body;

    // 1. Fetch booking with case and hospital
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        case: true,
        hospital: true,
        review: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Booking not found',
      });
    }

    // 2. Ownership check
    if (booking.case.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the medical case associated with this booking',
      });
    }

    // 3. Booking must be COMPLETED
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        status: 'fail',
        message: `Reviews can only be submitted for completed treatments (current booking status: ${booking.status})`,
      });
    }

    // 4. Exactly one review per booking
    if (booking.review) {
      return res.status(400).json({
        status: 'fail',
        message: 'A verified review has already been submitted for this booking (one review per booking limit)',
      });
    }

    // 5. Sanitize plain text comment
    const plainComment = sanitizePlainText(comment);
    if (plainComment && plainComment.length > 1000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Review comment cannot exceed 1000 characters',
      });
    }

    // 6. Create Review inside transaction
    const newReview = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          bookingId: booking.id,
          hospitalId: booking.hospitalId,
          patientId,
          rating,
          comment: plainComment || null,
          isVerified: true,
        },
      });

      // Notify hospital of new patient review
      if (booking.hospital?.ownerId) {
        await createNotification({
          userId: booking.hospital.ownerId,
          type: 'NEW_REVIEW',
          title: 'New Patient Review Received',
          body: `A verified patient submitted a ${rating}-star review for their stay.`,
          link: `/hospital/leads`,
        });
      }

      return review;
    });

    return res.status(201).json({
      status: 'ok',
      message: 'Thank you for your verified feedback! Your review has been published.',
      data: newReview,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/reviews/:reviewId/reply
 * Hospital adds one public reply to a review.
 */
export async function replyToReview(req, res, next) {
  try {
    const { reviewId } = req.params;
    const { hospitalReply } = req.body;
    const userId = req.user.id;

    // 1. Verify hospital profile for user
    const hospital = await prisma.hospital.findUnique({
      where: { ownerId: userId },
    });

    if (!hospital) {
      return res.status(404).json({
        status: 'fail',
        message: 'Hospital profile not found for authenticated user',
      });
    }

    // 2. Fetch review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        booking: {
          select: { caseId: true },
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        status: 'fail',
        message: 'Review not found',
      });
    }

    // 3. Ownership check: review must belong to this hospital
    if (review.hospitalId !== hospital.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You can only reply to reviews for your own hospital',
      });
    }

    // 4. One reply per review check
    if (review.hospitalReply) {
      return res.status(400).json({
        status: 'fail',
        message: 'A hospital response has already been published for this review',
      });
    }

    // 5. Sanitize plain text reply
    const plainReply = sanitizePlainText(hospitalReply);
    if (!plainReply) {
      return res.status(400).json({
        status: 'fail',
        message: 'Hospital reply cannot be empty',
      });
    }

    if (plainReply.length > 1000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Hospital reply cannot exceed 1000 characters',
      });
    }

    // 6. Update review with reply
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        hospitalReply: plainReply,
      },
    });

    // Notify reviewer patient
    if (review.patientId) {
      await createNotification({
        userId: review.patientId,
        type: 'REVIEW_REPLY',
        title: 'Hospital Replied to Your Review',
        body: `${hospital.name} has posted an official response to your review.`,
        link: review.booking?.caseId ? `/patient/cases/${review.booking.caseId}` : '/patient',
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Official response published successfully',
      data: updatedReview,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/booking/:bookingId
 * Check if a review exists for a specific booking.
 */
export async function getBookingReview(req, res, next) {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const review = await prisma.review.findUnique({
      where: { bookingId },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
        booking: {
          select: {
            id: true,
            caseId: true,
            status: true,
            hospitalId: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(200).json({
        status: 'ok',
        data: null,
      });
    }

    // Access check: only patient owner, treating hospital, or admin
    const isPatient = review.patientId === userId;
    const isHospitalOwner = review.hospitalId === req.user?.hospital?.id;

    if (!isPatient && !isHospitalOwner && userRole !== 'ADMIN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied',
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: review,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/hospital/:hospitalId
 * Public endpoint: Paginated list of verified reviews for an approved hospital.
 * Never exposes patient emails or user IDs; returns first name and country only with "Verified patient" badge.
 */
export async function getPublicHospitalReviews(req, res, next) {
  try {
    const { hospitalId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { id: true, name: true, verificationStatus: true },
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
        where: { hospitalId },
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
      prisma.review.count({ where: { hospitalId } }),
    ]);

    // Anonymize: first name and country only, never user id or email
    const sanitizedReviews = reviews.map((r) => {
      const rawName = r.patient?.patientProfile?.fullName || 'Verified Patient';
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
}
