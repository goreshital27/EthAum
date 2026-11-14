import crypto from 'crypto';
import prisma from '../../config/prisma.js';
import { enforceStageTransition } from '../cases/stagePipeline.js';
import { createNotification } from '../notifications/notifications.service.js';

/**
 * POST /api/bookings
 * Patient creates a booking inquiry from a received quotation
 */
export async function createBooking(req, res, next) {
  try {
    const patientId = req.user.id;
    const { quotationId, referralCode } = req.body;

    // 1. Fetch quotation with case, enquiry, and hospital
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        enquiry: {
          include: {
            case: true,
            hospital: true,
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({
        status: 'fail',
        message: 'Quotation not found',
      });
    }

    const { enquiry } = quotation;
    const { case: medicalCase, hospital } = enquiry;

    // 2. Patient owns the case
    if (medicalCase.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the medical case associated with this quotation',
      });
    }

    // 3. Quote must be SENT or ACCEPTED
    if (!['SENT', 'ACCEPTED'].includes(quotation.status)) {
      return res.status(400).json({
        status: 'fail',
        message: `Quotation is in ${quotation.status} status and cannot be booked`,
      });
    }

    // 4. Quote must not be expired
    if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      return res.status(400).json({
        status: 'fail',
        message: 'This quotation has expired and cannot be booked',
      });
    }

    // 5. Hospital must be APPROVED
    if (hospital.verificationStatus !== 'APPROVED') {
      return res.status(400).json({
        status: 'fail',
        message: 'The quoting hospital is not administratively approved',
      });
    }

    // 6. Hospital must belong to case shortlist
    const shortlistEntry = await prisma.shortlist.findUnique({
      where: {
        caseId_hospitalId: {
          caseId: medicalCase.id,
          hospitalId: hospital.id,
        },
      },
    });

    if (!shortlistEntry) {
      return res.status(400).json({
        status: 'fail',
        message: 'You can only book quotations from hospitals currently in your case shortlist',
      });
    }

    // 7. Enforce one active booking per case
    const existingActiveBooking = await prisma.booking.findFirst({
      where: {
        caseId: medicalCase.id,
        status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] },
      },
    });

    if (existingActiveBooking) {
      // If the existing booking is for this exact quotation and is pending payment, return it
      if (
        existingActiveBooking.quotationId === quotation.id &&
        existingActiveBooking.status === 'PENDING_PAYMENT'
      ) {
        return res.status(200).json({
          status: 'ok',
          message: 'Existing pending booking retrieved',
          data: existingActiveBooking,
        });
      }

      return res.status(400).json({
        status: 'fail',
        message: 'An active booking already exists for this medical case',
      });
    }

    // 8. Server authoritatively computes 20% deposit from quotation total
    // 20% deposit in integer cents rounded
    const depositCents = Math.round(quotation.totalCents * 0.2);

    // 9. If referralCode provided, check if it exists
    if (referralCode) {
      const ref = await prisma.referral.findUnique({
        where: { code: referralCode.trim() },
      });

      if (ref && !ref.bookingId && ref.referrerId !== patientId) {
        // Tag referral to this patient if not already claimed
        await prisma.referral.update({
          where: { id: ref.id },
          data: { referredPatientId: patientId },
        });
      }
    }

    // 10. Create Booking record inside transaction
    const newBooking = await prisma.$transaction(async (tx) => {
      // Also mark quote as ACCEPTED if it was SENT
      if (quotation.status === 'SENT') {
        await tx.quotation.update({
          where: { id: quotation.id },
          data: { status: 'ACCEPTED' },
        });
      }

      const booking = await tx.booking.create({
        data: {
          caseId: medicalCase.id,
          quotationId: quotation.id,
          hospitalId: hospital.id,
          status: 'PENDING_PAYMENT',
          bookingFeeCents: depositCents,
          currency: quotation.currency || 'USD',
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
          quotation: {
            select: {
              id: true,
              totalCents: true,
              currency: true,
              lineItems: true,
            },
          },
        },
      });

      return booking;
    });

    return res.status(201).json({
      status: 'ok',
      message: 'Booking created. Please proceed to confirm the 20% escrow deposit.',
      data: newBooking,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/:id
 * Retrieve details of a booking
 */
export async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        case: {
          include: {
            treatment: true,
            destination: true,
            patient: {
              select: {
                id: true,
                email: true,
                patientProfile: true,
              },
            },
          },
        },
        hospital: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            country: true,
            ownerId: true,
            accreditations: true,
          },
        },
        quotation: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        referral: {
          select: {
            id: true,
            code: true,
            commissionCents: true,
            status: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Booking not found',
      });
    }

    // Ownership check
    const isPatientOwner = userRole === 'PATIENT' && booking.case.patientId === userId;
    const isHospitalOwner = userRole === 'HOSPITAL' && booking.hospital.ownerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isPatientOwner && !isHospitalOwner && !isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You are not authorized to view this booking',
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings
 * List bookings for authenticated user (Patient, Hospital, or Admin)
 */
export async function listBookings(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { caseId, status, page = 1, limit = 20 } = req.query;

    let where = {};

    if (userRole === 'PATIENT') {
      where.case = { patientId: userId };
    } else if (userRole === 'HOSPITAL') {
      const hospital = await prisma.hospital.findUnique({
        where: { ownerId: userId },
      });
      if (!hospital) {
        return res.status(404).json({
          status: 'fail',
          message: 'Hospital profile not found',
        });
      }
      where.hospitalId = hospital.id;
    }

    if (caseId) where.caseId = caseId;
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
            },
          },
          case: {
            select: {
              id: true,
              stage: true,
              treatmentNeed: true,
              treatment: {
                select: {
                  name: true,
                  specialty: true,
                },
              },
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
          },
          quotation: {
            select: {
              id: true,
              totalCents: true,
              currency: true,
            },
          },
          payments: {
            select: {
              id: true,
              amountCents: true,
              status: true,
              paidAt: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      status: 'ok',
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/bookings/:id/pay
 * Simulated 20% deposit payment. No real credit card details collected.
 * Executes ONE single atomic database transaction.
 */
export async function payBookingDeposit(req, res, next) {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    // 1. Initial lookup to verify booking existence and patient ownership
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        case: true,
        hospital: true,
        quotation: true,
        payments: true,
        referral: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Booking not found',
      });
    }

    if (booking.case.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the medical case for this booking',
      });
    }

    // 2. IDEMPOTENCY CHECK: If already CONFIRMED, return existing confirmed booking safely
    if (booking.status === 'CONFIRMED') {
      const paidPayment = booking.payments.find((p) => p.status === 'PAID');
      return res.status(200).json({
        status: 'ok',
        message: 'Booking deposit has already been processed and confirmed (idempotent)',
        data: {
          booking,
          payment: paidPayment || booking.payments[0],
          idempotent: true,
        },
      });
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({
        status: 'fail',
        message: `Booking cannot be paid because current status is ${booking.status}`,
      });
    }

    // Server-side calculation only: deposit amount from booking.bookingFeeCents
    const depositAmountCents = booking.bookingFeeCents;
    const providerRef = `SIMULATED_DEPOSIT_${crypto.randomUUID().slice(0, 8)}`;

    // 3. ONE SINGLE ATOMIC DATABASE TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify booking inside transaction for strict concurrency safety
      const lockedBooking = await tx.booking.findUnique({
        where: { id },
        include: { case: true, quotation: true },
      });

      if (lockedBooking.status === 'CONFIRMED') {
        const existingPayment = await tx.payment.findFirst({
          where: { bookingId: id, status: 'PAID' },
        });
        return {
          booking: lockedBooking,
          payment: existingPayment,
          idempotent: true,
        };
      }

      // Step A: Create Payment record with status PAID
      const payment = await tx.payment.create({
        data: {
          bookingId: id,
          amountCents: depositAmountCents,
          currency: booking.currency,
          status: 'PAID',
          providerRef,
          paidAt: new Date(),
        },
      });

      // Step B: Update Booking status to CONFIRMED
      const confirmedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
        },
        include: {
          hospital: true,
          case: true,
          quotation: true,
        },
      });

      // Step C: Update Case stage to BOOKED via enforceStageTransition (sequential)
      let stage = lockedBooking.case.stage;
      if (stage === 'QUOTE_SENT') {
        stage = enforceStageTransition(stage, 'CONSULTATION');
      }
      if (stage === 'CONSULTATION') {
        stage = enforceStageTransition(stage, 'BOOKED');
      }

      await tx.medicalCase.update({
        where: { id: lockedBooking.caseId },
        data: { stage },
      });

      // Step D: Referral processing (only if patient was referred)
      let linkedReferral = null;
      const referral = await tx.referral.findFirst({
        where: {
          referredPatientId: patientId,
          bookingId: null,
        },
      });

      if (referral) {
        // 5% commission on quote total in integer cents, commissionRateBps 500
        const quoteTotal = lockedBooking.quotation.totalCents;
        const commissionCents = Math.round(quoteTotal * 0.05);

        linkedReferral = await tx.referral.update({
          where: { id: referral.id },
          data: {
            bookingId: id,
            commissionCents,
            commissionRateBps: 500,
            status: 'QUALIFIED',
            currency: booking.currency,
          },
        });
      }

      // Step E: Notifications (Hospital and Patient)
      // Notification to hospital owner
      if (booking.hospital.ownerId) {
        await createNotification({
          userId: booking.hospital.ownerId,
          type: 'BOOKING_CONFIRMED',
          title: 'Booking Confirmed & Deposit Secured',
          body: `Patient confirmed booking for Case #${booking.caseId.slice(
            0,
            8
          )}. Deposit of $${(depositAmountCents / 100).toFixed(2)} secured in escrow.`,
          link: `/hospital/leads`,
        });
      }

      // Notification to patient
      await createNotification({
        userId: patientId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed!',
        body: `Your 20% deposit of $${(depositAmountCents / 100).toFixed(
          2
        )} for ${booking.hospital.name} has been confirmed. Case stage moved to BOOKED.`,
        link: `/patient/cases/${booking.caseId}`,
      });

      return {
        booking: confirmedBooking,
        payment,
        referral: linkedReferral,
        stage,
      };
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Simulated deposit payment completed successfully. Booking is now CONFIRMED.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createBooking,
  getBookingById,
  listBookings,
  payBookingDeposit,
};
