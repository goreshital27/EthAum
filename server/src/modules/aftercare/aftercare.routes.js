import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/roleCheck.js';
import validate from '../../middleware/validation.js';
import {
  caseIdParamSchema,
  taskIdParamSchema,
  completeTaskSchema,
} from './aftercare.schemas.js';
import {
  markTreatmentComplete,
  getAftercareTasks,
  updateAftercareTask,
} from './aftercare.controller.js';

const router = express.Router();

// Hospital marks treatment complete: transitions stage BOOKED -> TREATMENT -> AFTERCARE and creates AftercareTasks
router.post(
  '/cases/:caseId/complete-treatment',
  authenticate,
  requireRoles('HOSPITAL'),
  validate({ params: caseIdParamSchema }),
  markTreatmentComplete
);

// Get aftercare tasks for a case (Patient, Hospital, Admin)
router.get(
  '/cases/:caseId/tasks',
  authenticate,
  validate({ params: caseIdParamSchema }),
  getAftercareTasks
);

// Patient or Hospital updates an aftercare task (completing all moves case to CLOSED)
router.patch(
  '/tasks/:taskId',
  authenticate,
  validate({ params: taskIdParamSchema, body: completeTaskSchema }),
  updateAftercareTask
);

export default router;
