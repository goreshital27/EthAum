import { z } from 'zod';

export const enquiryIdParamSchema = z.object({
  enquiryId: z.string().uuid({ message: 'Enquiry ID must be a valid UUID' }),
});

export const documentIdParamSchema = z.object({
  documentId: z.string().uuid({ message: 'Document ID must be a valid UUID' }),
});

export const doctorIdParamSchema = z.object({
  doctorId: z.string().uuid({ message: 'Doctor ID must be a valid UUID' }),
});

export const treatmentIdParamSchema = z.object({
  treatmentId: z.string().uuid({ message: 'Treatment ID must be a valid UUID' }),
});

/**
 * Update Hospital Profile (Provider-reported fields)
 */
export const updateHospitalProfileSchema = z.object({
  description: z.string().max(4000).optional().nullable(),
  languages: z.array(z.string().trim().min(1)).optional(),
  accreditations: z.array(z.string().trim().min(1)).optional(),
  internationalServices: z.array(z.string().trim().min(1)).optional(),
  offersVirtualConsult: z.boolean().optional(),
  city: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
});

/**
 * Add Treatment Offering with Price Range
 */
export const addHospitalTreatmentSchema = z
  .object({
    treatmentId: z.string().uuid({ message: 'Valid treatment procedure ID required' }),
    minPriceCents: z.number().int().min(0, 'Min price must be a non-negative integer in cents'),
    maxPriceCents: z.number().int().min(0, 'Max price must be a non-negative integer in cents'),
    currency: z.string().length(3).default('USD'),
  })
  .refine((data) => data.maxPriceCents >= data.minPriceCents, {
    message: 'Max price must be greater than or equal to min price',
    path: ['maxPriceCents'],
  });

/**
 * Update Treatment Offering Price Range
 */
export const updateHospitalTreatmentSchema = z
  .object({
    minPriceCents: z.number().int().min(0).optional(),
    maxPriceCents: z.number().int().min(0).optional(),
    currency: z.string().length(3).optional(),
  })
  .refine(
    (data) => {
      if (data.minPriceCents !== undefined && data.maxPriceCents !== undefined) {
        return data.maxPriceCents >= data.minPriceCents;
      }
      return true;
    },
    {
      message: 'Max price must be greater than or equal to min price',
      path: ['maxPriceCents'],
    }
  );

/**
 * Create Doctor Profile
 */
export const createDoctorSchema = z.object({
  name: z.string().trim().min(1, 'Doctor name is required').max(120),
  specialty: z.string().trim().min(1, 'Clinical specialty is required').max(120),
  qualifications: z.string().trim().max(300).optional().nullable(),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional().nullable(),
  languages: z.array(z.string().trim()).default(['English']),
  bio: z.string().trim().max(2500).optional().nullable(),
});

/**
 * Update Doctor Profile
 */
export const updateDoctorSchema = createDoctorSchema.partial();

/**
 * Lead Inbox Query Schema
 */
export const listLeadsQuerySchema = z.object({
  status: z
    .enum(['ALL', 'NEW', 'VIEWED', 'RESPONDED', 'DECLINED', 'EXPIRED'])
    .default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
