import { z } from 'zod';

export const appointmentIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid appointment ID: must be a valid UUID' }),
});

export const proposeAppointmentSchema = z
  .object({
    caseId: z.string().uuid({ message: 'Valid case ID is required' }),
    doctorId: z.string().uuid({ message: 'Valid doctor ID is required' }).optional().nullable(),
    type: z.enum(['EXPLORATORY', 'FORMAL'], {
      errorMap: () => ({ message: "Appointment type must be either 'EXPLORATORY' or 'FORMAL'" }),
    }),
    slots: z
      .array(z.string().datetime({ message: 'Each slot must be an ISO 8601 UTC date string' }))
      .min(1, 'At least 1 time slot is required')
      .max(3, 'At most 3 time slots can be proposed'),
    timezone: z.string().max(50).optional().default('UTC'),
  })
  .refine(
    (data) => {
      const now = new Date();
      return data.slots.every((slot) => new Date(slot) > now);
    },
    {
      message: 'All proposed appointment slots must be in the future',
      path: ['slots'],
    }
  );

export const listAppointmentsQuerySchema = z.object({
  caseId: z.string().uuid().optional(),
  status: z
    .enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional(),
  type: z.enum(['EXPLORATORY', 'FORMAL']).optional(),
});
