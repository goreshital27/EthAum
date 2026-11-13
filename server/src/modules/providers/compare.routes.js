import { Router } from 'express';
import { getCompareHospitals } from './providers.controller.js';
import { compareQuerySchema } from './providers.schemas.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

// GET /api/compare?slugs=a,b,c
router.get('/', validate({ query: compareQuerySchema }), getCompareHospitals);

export default router;
