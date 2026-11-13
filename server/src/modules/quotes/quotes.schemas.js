import { z } from 'zod';

/**
 * UUID parameter schemas
 */
export const enquiryIdParamSchema = z.object({
  enquiryId: z.string().uuid({ message: 'Invalid enquiry ID: must be a valid UUID' }),
});

export const quoteIdParamSchema = z.object({
  quoteId: z.string().uuid({ message: 'Invalid quote ID: must be a valid UUID' }),
});

export const caseIdParamSchema = z.object({
  caseId: z.string().uuid({ message: 'Invalid case ID: must be a valid UUID' }),
});

/**
 * Query schema for hospital enquiries listing
 */
export const listEnquiriesQuerySchema = z.object({
  status: z
    .enum(['NEW', 'VIEWED', 'RESPONDED', 'DECLINED', 'EXPIRED'])
    .optional(),
  urgency: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Query schema for quotes listing
 */
export const listQuotesQuerySchema = z.object({
  status: z
    .enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Update enquiry metadata by hospital
 */
export const updateEnquirySchema = z.object({
  assignedToName: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  respondBy: z.string().datetime().or(z.date()).optional().nullable(),
});

/**
 * Decline enquiry by hospital
 */
export const declineEnquirySchema = z.object({
  reason: z.string().max(1000).optional().default('Hospital unable to accommodate case requirements'),
});

/**
 * Patient creating an enquiry to a hospital
 */
export const createEnquirySchema = z.object({
  hospitalId: z.string().uuid({ message: 'Valid hospital ID is required' }),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  notes: z.string().max(2000).optional().nullable(),
});

/**
 * Line item schema for quotation
 */
export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(300),
  category: z
    .enum([
      'PROCEDURE',
      'SURGEON_FEE',
      'ANESTHESIA',
      'HOSPITAL_STAY',
      'MEDICATION',
      'DIAGNOSTICS',
      'IMPLANT',
      'ACCOMMODATION',
      'TRANSPORT',
      'OTHER',
    ])
    .default('PROCEDURE'),
  amountCents: z
    .number()
    .int()
    .min(0, 'Amount must be a non-negative integer in cents'),
});

/**
 * Payment milestone / schedule schema
 */
export const paymentScheduleSchema = z.object({
  depositBps: z.number().int().min(0).max(10000).optional(),
  depositCents: z.number().int().min(0).optional(),
  balanceCents: z.number().int().min(0).optional(),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        amountCents: z.number().int().min(0),
        dueDescription: z.string().max(200).optional(),
      })
    )
    .optional(),
});

/**
 * Create quotation schema
 * Validates financial integrity:
 * - sum(lineItems.amountCents) === subtotalCents
 * - subtotalCents + taxCents === totalCents
 */
export const createQuotationSchema = z
  .object({
    doctorId: z.string().uuid().optional().nullable(),
    lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    subtotalCents: z.number().int().min(0, 'Subtotal must be non-negative integer cents'),
    taxCents: z.number().int().min(0, 'Tax must be non-negative integer cents').default(0),
    totalCents: z.number().int().min(0, 'Total must be non-negative integer cents'),
    currency: z.string().length(3).default('USD'),
    validUntil: z.string().datetime().or(z.date()).optional().nullable(),
    paymentSchedule: paymentScheduleSchema.optional().nullable(),
    cancellationTerms: z.string().max(3000).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    status: z.enum(['DRAFT', 'SENT']).default('DRAFT'),
  })
  .refine(
    (data) => {
      const calculatedSubtotal = data.lineItems.reduce(
        (sum, item) => sum + item.amountCents,
        0
      );
      return calculatedSubtotal === data.subtotalCents;
    },
    {
      message: 'Subtotal must equal the exact sum of line items amounts in cents',
      path: ['subtotalCents'],
    }
  )
  .refine(
    (data) => data.subtotalCents + data.taxCents === data.totalCents,
    {
      message: 'Total must equal subtotalCents + taxCents',
      path: ['totalCents'],
    }
  );

/**
 * Update quotation schema
 */
export const updateQuotationSchema = z
  .object({
    doctorId: z.string().uuid().optional().nullable(),
    lineItems: z.array(lineItemSchema).min(1).optional(),
    subtotalCents: z.number().int().min(0).optional(),
    taxCents: z.number().int().min(0).optional(),
    totalCents: z.number().int().min(0).optional(),
    currency: z.string().length(3).optional(),
    validUntil: z.string().datetime().or(z.date()).optional().nullable(),
    paymentSchedule: paymentScheduleSchema.optional().nullable(),
    cancellationTerms: z.string().max(3000).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.lineItems && data.subtotalCents !== undefined) {
        const calculatedSubtotal = data.lineItems.reduce(
          (sum, item) => sum + item.amountCents,
          0
        );
        return calculatedSubtotal === data.subtotalCents;
      }
      return true;
    },
    {
      message: 'Subtotal must equal the exact sum of line items amounts in cents',
      path: ['subtotalCents'],
    }
  )
  .refine(
    (data) => {
      if (
        data.subtotalCents !== undefined &&
        data.taxCents !== undefined &&
        data.totalCents !== undefined
      ) {
        return data.subtotalCents + data.taxCents === data.totalCents;
      }
      return true;
    },
    {
      message: 'Total must equal subtotalCents + taxCents',
      path: ['totalCents'],
    }
  );

/**
 * Reject quotation schema
 */
export const rejectQuotationSchema = z.object({
  reason: z.string().max(1000).optional().nullable(),
});
