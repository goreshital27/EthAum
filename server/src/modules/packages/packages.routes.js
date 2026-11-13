import { Router } from 'express';
import { getPackages, getPackageById } from './packages.controller.js';
import { packageQuerySchema, packageIdParamSchema } from './packages.schemas.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

// GET /api/packages
router.get('/', validate({ query: packageQuerySchema }), getPackages);

// GET /api/packages/:id
router.get('/:id', validate({ params: packageIdParamSchema }), getPackageById);

export default router;
