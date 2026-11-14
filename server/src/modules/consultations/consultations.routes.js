import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  appointmentIdParamSchema,
  proposeAppointmentSchema,
  listAppointmentsQuerySchema,
} from './consultations.schemas.js';
import {
  proposeAppointment,
  getAppointments,
  acceptAppointment,
  declineAppointment,
} from './consultations.controller.js';

const router = Router();

router.use(requireAuth);

// GET /api/appointments - List appointments for authenticated hospital or patient
router.get('/', validate({ query: listAppointmentsQuerySchema }), getAppointments);

// POST /api/appointments/propose - Hospital proposes appointment
router.post(
  '/propose',
  requireRole('HOSPITAL'),
  validate({ body: proposeAppointmentSchema }),
  proposeAppointment
);

// POST /api/appointments/:id/accept - Patient accepts slot
router.post(
  '/:id/accept',
  requireRole('PATIENT'),
  validate({ params: appointmentIdParamSchema }),
  acceptAppointment
);

// POST /api/appointments/:id/decline - Patient declines
router.post(
  '/:id/decline',
  requireRole('PATIENT'),
  validate({ params: appointmentIdParamSchema }),
  declineAppointment
);

export default router;
