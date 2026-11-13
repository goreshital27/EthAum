import { Router } from 'express';
import { getDoctorById } from './providers.controller.js';
import { doctorIdParamSchema } from './providers.schemas.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

// GET /api/doctors/:id
router.get('/:id', validate({ params: doctorIdParamSchema }), getDoctorById);

export default router;
