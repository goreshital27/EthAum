import { Router } from 'express';
import { getTreatments, getTreatmentBySlug } from './treatments.controller.js';

const router = Router();

// GET /api/treatments
router.get('/', getTreatments);

// GET /api/treatments/:slug
router.get('/:slug', getTreatmentBySlug);

export default router;
