import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  quoteIdParamSchema,
  listQuotesQuerySchema,
  updateQuotationSchema,
  rejectQuotationSchema,
} from './quotes.schemas.js';
import {
  getHospitalQuotes,
  getHospitalQuoteById,
  updateHospitalQuote,
  sendHospitalQuote,
  getPatientQuoteById,
  acceptPatientQuote,
  rejectPatientQuote,
} from './quotes.controller.js';

// ==========================================
// Hospital Quotes Router: /api/hospital/quotes
// ==========================================
export const hospitalQuotesRoutes = Router();

hospitalQuotesRoutes.use(requireAuth);
hospitalQuotesRoutes.use(requireRole('HOSPITAL'));

// GET /api/hospital/quotes - List quotes for this hospital
hospitalQuotesRoutes.get(
  '/',
  validate({ query: listQuotesQuerySchema }),
  getHospitalQuotes
);

// GET /api/hospital/quotes/:quoteId - View detailed quote
hospitalQuotesRoutes.get(
  '/:quoteId',
  validate({ params: quoteIdParamSchema }),
  getHospitalQuoteById
);

// PATCH /api/hospital/quotes/:quoteId - Update draft quote
hospitalQuotesRoutes.patch(
  '/:quoteId',
  validate({ params: quoteIdParamSchema, body: updateQuotationSchema }),
  updateHospitalQuote
);

// POST /api/hospital/quotes/:quoteId/send - Send draft quote to patient
hospitalQuotesRoutes.post(
  '/:quoteId/send',
  validate({ params: quoteIdParamSchema }),
  sendHospitalQuote
);

// ==========================================
// Patient Quotes Router: /api/quotes
// ==========================================
export const patientQuotesRoutes = Router();

patientQuotesRoutes.use(requireAuth);
patientQuotesRoutes.use(requireRole('PATIENT'));

// GET /api/quotes/:quoteId - Patient views received quote
patientQuotesRoutes.get(
  '/:quoteId',
  validate({ params: quoteIdParamSchema }),
  getPatientQuoteById
);

// POST /api/quotes/:quoteId/accept - Patient accepts quotation
patientQuotesRoutes.post(
  '/:quoteId/accept',
  validate({ params: quoteIdParamSchema }),
  acceptPatientQuote
);

// POST /api/quotes/:quoteId/reject - Patient rejects quotation
patientQuotesRoutes.post(
  '/:quoteId/reject',
  validate({ params: quoteIdParamSchema, body: rejectQuotationSchema }),
  rejectPatientQuote
);

export default {
  hospitalQuotesRoutes,
  patientQuotesRoutes,
};
