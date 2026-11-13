import { Router } from 'express';
import { getHospitals } from './providers.controller.js';
import { hospitalQuerySchema } from './providers.schemas.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

// GET /api/hospitals
router.get('/', validate({ query: hospitalQuerySchema }), getHospitals);

export default router;
