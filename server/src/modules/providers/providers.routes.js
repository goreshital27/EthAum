import { Router } from 'express';
import {
  getHospitals,
  getHospitalBySlug,
  getHospitalReviews,
} from './providers.controller.js';
import {
  hospitalQuerySchema,
  hospitalSlugParamSchema,
  hospitalReviewsQuerySchema,
} from './providers.schemas.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

// GET /api/hospitals
router.get('/', validate({ query: hospitalQuerySchema }), getHospitals);

// GET /api/hospitals/:slug
router.get('/:slug', validate({ params: hospitalSlugParamSchema }), getHospitalBySlug);

// GET /api/hospitals/:slug/reviews
router.get(
  '/:slug/reviews',
  validate({ params: hospitalSlugParamSchema, query: hospitalReviewsQuerySchema }),
  getHospitalReviews
);

export default router;
