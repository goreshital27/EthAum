import { z } from 'zod';

export const caseIdParamSchema = z.object({
  caseId: z.string().uuid({ message: 'Invalid case ID format: must be a valid UUID' }),
});

export default {
  caseIdParamSchema,
};
