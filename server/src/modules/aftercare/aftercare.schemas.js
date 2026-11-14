import { z } from 'zod';

export const caseIdParamSchema = z.object({
  caseId: z.string().uuid({ message: 'Invalid medical case ID' }),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().uuid({ message: 'Invalid aftercare task ID' }),
});

export const completeTaskSchema = z.object({
  completed: z.boolean().default(true),
});
