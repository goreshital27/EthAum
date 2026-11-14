import { Router } from 'express';
import { getTreatments, getTreatmentBySlug } from './treatments.controller.js';
import { treatmentSlugParamSchema } from './treatments.schemas.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

// GET /api/treatments
router.get('/', getTreatments);

// GET /api/treatments/:slug
router.get('/:slug', validate({ params: treatmentSlugParamSchema }), getTreatmentBySlug);

export default router;
