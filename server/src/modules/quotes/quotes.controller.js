import prisma from '../../config/prisma.js';
import { enforceStageTransition } from '../cases/stagePipeline.js';

/**
 * Helper to get and verify the approved hospital for the current user
 */
async function getApprovedHospital(userId) {
  const hospital = await prisma.hospital.findUnique({
    where: { ownerId: userId },
  });

  if (!hospital) {
    return { error: 'NOT_FOUND', hospital: null };
  }

  if (hospital.verificationStatus !== 'APPROVED') {
    return { error: 'PENDING_APPROVAL', hospital: null };
  }

  return { error: null, hospital };
}

/**
 * POST /api/hospital/enquiries/:enquiryId/quotes
 * Hospital creates a quotation (DRAFT or SENT) for an enquiry
 */
export async function createQuotation(req, res, next) {
  try {
    const { enquiryId } = req.params;
    const { error, hospital } = await getApprovedHospital(req.user.id);

    if (error === 'NOT_FOUND' || error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital is not authorized or approved',
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: { case: true },
    });

    if (!enquiry || enquiry.hospitalId !== hospital.id) {
      return res.status(404).json({
        status: 'fail',
        message: 'Enquiry not found for this hospital',
      });
    }

    if (enquiry.status === 'DECLINED') {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot issue a quotation for a declined enquiry',
      });
    }

    const {
      doctorId,
      lineItems,
      taxCents = 0,
      currency = 'USD',
      validUntil,
      paymentSchedule,
      cancellationTerms,
      notes,
      status = 'DRAFT',
    } = req.body;

    // Server authoritatively computes subtotal and total from lineItems, never trusting client totals
    const subtotalCents = lineItems.reduce(
      (sum, item) => sum + (Number.isInteger(item.amountCents) ? item.amountCents : 0),
      0
    );
    const validTaxCents = Number.isInteger(taxCents) && taxCents >= 0 ? taxCents : 0;
    const totalCents = subtotalCents + validTaxCents;

    // Verify doctor belongs to this hospital if doctorId provided
    if (doctorId) {
      const doctor = await prisma.doctor.findFirst({
        where: { id: doctorId, hospitalId: hospital.id },
      });
      if (!doctor) {
        return res.status(400).json({
          status: 'fail',
          message: 'The assigned doctor does not belong to your hospital',
        });
      }
    }

    // Execute quotation creation and state updates inside a transaction
    const quotation = await prisma.$transaction(async (tx) => {
      const newQuote = await tx.quotation.create({
        data: {
          enquiryId,
          doctorId: doctorId || null,
          lineItems,
          subtotalCents,
          taxCents: validTaxCents,
          totalCents,
          currency,
          validUntil: validUntil ? new Date(validUntil) : null,
          paymentSchedule: paymentSchedule || null,
          cancellationTerms: cancellationTerms || null,
          notes: notes || null,
          status,
        },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
            },
          },
        },
      });

      // If status is SENT, update enquiry to RESPONDED and advance case stage if needed
      if (status === 'SENT') {
        await tx.enquiry.update({
          where: { id: enquiryId },
          data: { status: 'RESPONDED' },
        });

        // The case moves to QUOTE_SENT only when a hospital sends its first quote (via enforceStageTransition)
        if (enquiry.case.stage === 'QUOTE_REQUESTED') {
          const nextStage = enforceStageTransition(enquiry.case.stage, 'QUOTE_SENT');
          await tx.medicalCase.update({
            where: { id: enquiry.caseId },
            data: { stage: nextStage },
          });
        }
      }

      return newQuote;
    });

    return res.status(201).json({
      status: 'ok',
      message: `Quotation created as ${quotation.status}`,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/hospital/quotes
 * Hospital lists all quotations issued by their facility
 */
export async function getHospitalQuotes(req, res, next) {
  try {
    const { error, hospital } = await getApprovedHospital(req.user.id);
    if (error === 'NOT_FOUND' || error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital is not authorized or approved',
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      enquiry: {
        hospitalId: hospital.id,
      },
      ...(status ? { status } : {}),
    };

    const [total, quotes] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
            },
          },
          enquiry: {
            select: {
              id: true,
              caseId: true,
              case: {
                select: {
                  id: true,
                  stage: true,
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
                },
              },
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      status: 'ok',
      data: quotes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/hospital/quotes/:quoteId
 * Hospital views specific quotation details
 */
export async function getHospitalQuoteById(req, res, next) {
  try {
    const { quoteId } = req.params;
    const { error, hospital } = await getApprovedHospital(req.user.id);

    if (error === 'NOT_FOUND' || error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital is not authorized or approved',
      });
    }

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: {
        doctor: true,
        enquiry: {
          include: {
            case: {
              include: {
                treatment: true,
                destination: true,
              },
            },
          },
        },
      },
    });

    if (!quote || quote.enquiry.hospitalId !== hospital.id) {
      return res.status(404).json({
        status: 'fail',
        message: 'Quotation not found for this hospital',
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/hospital/quotes/:quoteId
 * Update a draft quotation
 */
export async function updateHospitalQuote(req, res, next) {
  try {
    const { quoteId } = req.params;
    const { error, hospital } = await getApprovedHospital(req.user.id);

    if (error === 'NOT_FOUND' || error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital is not authorized or approved',
      });
    }

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: { enquiry: true },
    });

    if (!quote || quote.enquiry.hospitalId !== hospital.id) {
      return res.status(404).json({
        status: 'fail',
        message: 'Quotation not found for this hospital',
      });
    }

    if (quote.status === 'ACCEPTED' || quote.status === 'REJECTED') {
      return res.status(400).json({
        status: 'fail',
        message: `Cannot edit a quotation that is already ${quote.status}`,
      });
    }

    const {
      doctorId,
      lineItems,
      taxCents,
      currency,
      validUntil,
      paymentSchedule,
      cancellationTerms,
      notes,
    } = req.body;

    if (doctorId) {
      const doctor = await prisma.doctor.findFirst({
        where: { id: doctorId, hospitalId: hospital.id },
      });
      if (!doctor) {
        return res.status(400).json({
          status: 'fail',
          message: 'The assigned doctor does not belong to your hospital',
        });
      }
    }

    // Server authoritatively recalculates subtotal and total from line items if updated
    let computedSubtotal = undefined;
    let computedTax = undefined;
    let computedTotal = undefined;

    if (lineItems !== undefined) {
      computedSubtotal = lineItems.reduce(
        (sum, item) => sum + (Number.isInteger(item.amountCents) ? item.amountCents : 0),
        0
      );
      computedTax =
        taxCents !== undefined
          ? (Number.isInteger(taxCents) && taxCents >= 0 ? taxCents : 0)
          : (quote.taxCents || 0);
      computedTotal = computedSubtotal + computedTax;
    } else if (taxCents !== undefined) {
      computedTax = Number.isInteger(taxCents) && taxCents >= 0 ? taxCents : 0;
      computedSubtotal = quote.subtotalCents;
      computedTotal = computedSubtotal + computedTax;
    }

    const updated = await prisma.quotation.update({
      where: { id: quoteId },
      data: {
        ...(doctorId !== undefined ? { doctorId: doctorId || null } : {}),
        ...(lineItems !== undefined ? { lineItems } : {}),
        ...(computedSubtotal !== undefined ? { subtotalCents: computedSubtotal } : {}),
        ...(computedTax !== undefined ? { taxCents: computedTax } : {}),
        ...(computedTotal !== undefined ? { totalCents: computedTotal } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(validUntil !== undefined
          ? { validUntil: validUntil ? new Date(validUntil) : null }
          : {}),
        ...(paymentSchedule !== undefined ? { paymentSchedule } : {}),
        ...(cancellationTerms !== undefined ? { cancellationTerms } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
    });

    return res.status(200).json({
      status: 'ok',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/hospital/quotes/:quoteId/send
 * Hospital transitions a DRAFT quotation to SENT
 */
export async function sendHospitalQuote(req, res, next) {
  try {
    const { quoteId } = req.params;
    const { error, hospital } = await getApprovedHospital(req.user.id);

    if (error === 'NOT_FOUND' || error === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Hospital is not authorized or approved',
      });
    }

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: {
        enquiry: {
          include: {
            case: true,
          },
        },
      },
    });

    if (!quote || quote.enquiry.hospitalId !== hospital.id) {
      return res.status(404).json({
        status: 'fail',
        message: 'Quotation not found for this hospital',
      });
    }

    if (quote.status !== 'DRAFT') {
      return res.status(400).json({
        status: 'fail',
        message: `Only DRAFT quotations can be sent. Current status is ${quote.status}`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark quote SENT
      const sentQuote = await tx.quotation.update({
        where: { id: quoteId },
        data: { status: 'SENT' },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
            },
          },
        },
      });

      // 2. Mark enquiry RESPONDED
      await tx.enquiry.update({
        where: { id: quote.enquiryId },
        data: { status: 'RESPONDED' },
      });

      // 3. The case moves to QUOTE_SENT only when a hospital sends its first quote (via enforceStageTransition)
      if (quote.enquiry.case.stage === 'QUOTE_REQUESTED') {
        const nextStage = enforceStageTransition(quote.enquiry.case.stage, 'QUOTE_SENT');
        await tx.medicalCase.update({
          where: { id: quote.enquiry.caseId },
          data: { stage: nextStage },
        });
      }

      return sentQuote;
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Quotation sent to patient successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/cases/:caseId/quotes
 * Patient lists all sent/accepted quotes received for their case
 */
export async function getPatientQuotes(req, res, next) {
  try {
    const caseId = req.params.caseId || req.params.id;
    const patientId = req.user.id;

    // Verify patient owns the case
    const medicalCase = await prisma.medicalCase.findFirst({
      where: { id: caseId, deletedAt: null },
    });

    if (!medicalCase) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (medicalCase.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // Return non-draft quotes
    const quotes = await prisma.quotation.findMany({
      where: {
        enquiry: {
          caseId,
        },
        status: {
          in: ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            qualifications: true,
            yearsExperience: true,
            languages: true,
          },
        },
        enquiry: {
          select: {
            id: true,
            hospital: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                country: true,
                accreditations: true,
                languages: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      status: 'ok',
      data: quotes,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/quotes/:quoteId
 * Patient views full details of a received quotation
 */
export async function getPatientQuoteById(req, res, next) {
  try {
    const { quoteId } = req.params;
    const patientId = req.user.id;

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: {
        doctor: true,
        enquiry: {
          include: {
            case: true,
            hospital: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                country: true,
                accreditations: true,
                languages: true,
              },
            },
          },
        },
      },
    });

    if (!quote || quote.status === 'DRAFT') {
      return res.status(404).json({
        status: 'fail',
        message: 'Quotation not found',
      });
    }

    if (quote.enquiry.case.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the case associated with this quotation',
      });
    }

    return res.status(200).json({
      status: 'ok',
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/quotes/:quoteId/accept
 * Patient accepts a received quotation
 */
export async function acceptPatientQuote(req, res, next) {
  try {
    const { quoteId } = req.params;
    const patientId = req.user.id;

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: {
        enquiry: {
          include: {
            case: true,
          },
        },
      },
    });

    if (!quote || quote.status === 'DRAFT') {
      return res.status(404).json({
        status: 'fail',
        message: 'Quotation not found',
      });
    }

    if (quote.enquiry.case.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the case associated with this quotation',
      });
    }

    if (quote.status !== 'SENT') {
      return res.status(400).json({
        status: 'fail',
        message: `Quotation cannot be accepted because current status is ${quote.status}`,
      });
    }

    if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
      return res.status(400).json({
        status: 'fail',
        message: 'This quotation has expired and can no longer be accepted',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark quote ACCEPTED
      const acceptedQuote = await tx.quotation.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' },
      });

      // 2. Advance case stage to CONSULTATION only if currently QUOTE_SENT (via enforceStageTransition)
      // A patient accepting a quote never moves the case backwards or sideways.
      if (quote.enquiry.case.stage === 'QUOTE_SENT') {
        const nextStage = enforceStageTransition(quote.enquiry.case.stage, 'CONSULTATION');
        await tx.medicalCase.update({
          where: { id: quote.enquiry.caseId },
          data: { stage: nextStage },
        });
      }

      return acceptedQuote;
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Quotation accepted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/quotes/:quoteId/reject
 * Patient declines / rejects a quotation
 */
export async function rejectPatientQuote(req, res, next) {
  try {
    const { quoteId } = req.params;
    const { reason } = req.body;
    const patientId = req.user.id;

    const quote = await prisma.quotation.findUnique({
      where: { id: quoteId },
      include: {
        enquiry: {
          include: {
            case: true,
          },
        },
      },
    });

    if (!quote || quote.status === 'DRAFT') {
      return res.status(404).json({
        status: 'fail',
        message: 'Quotation not found',
      });
    }

    if (quote.enquiry.case.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the case associated with this quotation',
      });
    }

    if (quote.status !== 'SENT') {
      return res.status(400).json({
        status: 'fail',
        message: `Quotation cannot be rejected because current status is ${quote.status}`,
      });
    }

    const rejectionNote = reason
      ? `${quote.notes ? quote.notes + '\n' : ''}[Patient Declined]: ${reason}`
      : quote.notes;

    const rejectedQuote = await prisma.quotation.update({
      where: { id: quoteId },
      data: {
        status: 'REJECTED',
        notes: rejectionNote,
      },
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Quotation declined',
      data: rejectedQuote,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createQuotation,
  getHospitalQuotes,
  getHospitalQuoteById,
  updateHospitalQuote,
  sendHospitalQuote,
  getPatientQuotes,
  getPatientQuoteById,
  acceptPatientQuote,
  rejectPatientQuote,
};
