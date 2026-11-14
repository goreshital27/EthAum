import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/roleCheck.js';
import validate from '../../middleware/validation.js';
import {
  createReviewSchema,
  replyReviewSchema,
  reviewIdParamSchema,
  bookingIdParamSchema,
  hospitalIdParamSchema,
  hospitalReviewsQuerySchema,
} from './reviews.schemas.js';
import {
  createReview,
  replyToReview,
  getBookingReview,
  getPublicHospitalReviews,
} from './reviews.controller.js';

const router = express.Router();

// Patient submits review for a COMPLETED booking (one review per booking)
router.post(
  '/',
  authenticate,
  requireRoles('PATIENT'),
  validate({ body: createReviewSchema }),
  createReview
);

// Hospital adds one public reply to a review
router.post(
  '/:reviewId/reply',
  authenticate,
  requireRoles('HOSPITAL'),
  validate({ params: reviewIdParamSchema, body: replyReviewSchema }),
  replyToReview
);

// Check review for a specific booking
router.get(
  '/booking/:bookingId',
  authenticate,
  validate({ params: bookingIdParamSchema }),
  getBookingReview
);

// Public paginated reviews for a hospital
router.get(
  '/hospital/:hospitalId',
  validate({ params: hospitalIdParamSchema, query: hospitalReviewsQuerySchema }),
  getPublicHospitalReviews
);

export default router;
