import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  enquiryIdParamSchema,
  listEnquiriesQuerySchema,
  updateEnquirySchema,
  declineEnquirySchema,
  createQuotationSchema,
} from './quotes.schemas.js';
import {
  getHospitalEnquiries,
  getHospitalEnquiryById,
  updateHospitalEnquiry,
  declineHospitalEnquiry,
} from './enquiries.controller.js';
import { createQuotation } from './quotes.controller.js';

const router = Router();

// All hospital enquiry routes require authentication and HOSPITAL role
router.use(requireAuth);
router.use(requireRole('HOSPITAL'));

// GET /api/hospital/enquiries - List enquiries for this hospital
router.get(
  '/',
  validate({ query: listEnquiriesQuerySchema }),
  getHospitalEnquiries
);

// GET /api/hospital/enquiries/:enquiryId - View enquiry details
router.get(
  '/:enquiryId',
  validate({ params: enquiryIdParamSchema }),
  getHospitalEnquiryById
);

// PATCH /api/hospital/enquiries/:enquiryId - Update enquiry metadata
router.patch(
  '/:enquiryId',
  validate({ params: enquiryIdParamSchema, body: updateEnquirySchema }),
  updateHospitalEnquiry
);

// POST /api/hospital/enquiries/:enquiryId/decline - Decline enquiry
router.post(
  '/:enquiryId/decline',
  validate({ params: enquiryIdParamSchema, body: declineEnquirySchema }),
  declineHospitalEnquiry
);

// POST /api/hospital/enquiries/:enquiryId/quotes - Create quotation for this enquiry
router.post(
  '/:enquiryId/quotes',
  validate({ params: enquiryIdParamSchema, body: createQuotationSchema }),
  createQuotation
);

export default router;
