import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import {
  enquiryIdParamSchema,
  doctorIdParamSchema,
  treatmentIdParamSchema,
  updateHospitalProfileSchema,
  addHospitalTreatmentSchema,
  updateHospitalTreatmentSchema,
  createDoctorSchema,
  updateDoctorSchema,
  listLeadsQuerySchema,
} from './hospitalPortal.schemas.js';
import hospitalPortalController from './hospitalPortal.controller.js';

const router = Router();

// All hospital portal routes require authentication and HOSPITAL role
router.use(requireAuth);
router.use(requireRole('HOSPITAL'));

// 1. Hospital Profile Management
router.get('/profile', hospitalPortalController.getProfile);
router.patch(
  '/profile',
  validate({ body: updateHospitalProfileSchema }),
  hospitalPortalController.updateProfile
);

// 2. Treatments Offered with Price Ranges
router.post(
  '/treatments',
  validate({ body: addHospitalTreatmentSchema }),
  hospitalPortalController.addTreatment
);
router.patch(
  '/treatments/:treatmentId',
  validate({
    params: treatmentIdParamSchema,
    body: updateHospitalTreatmentSchema,
  }),
  hospitalPortalController.updateTreatment
);
router.delete(
  '/treatments/:treatmentId',
  validate({ params: treatmentIdParamSchema }),
  hospitalPortalController.removeTreatment
);

// 3. Doctors Management (Managed directly by hospital)
router.post(
  '/doctors',
  validate({ body: createDoctorSchema }),
  hospitalPortalController.addDoctor
);
router.patch(
  '/doctors/:doctorId',
  validate({
    params: doctorIdParamSchema,
    body: updateDoctorSchema,
  }),
  hospitalPortalController.updateDoctor
);
router.delete(
  '/doctors/:doctorId',
  validate({ params: doctorIdParamSchema }),
  hospitalPortalController.removeDoctor
);

// 4. Lead Inbox & Case Review
router.get(
  '/leads',
  validate({ query: listLeadsQuerySchema }),
  hospitalPortalController.getLeads
);
router.get(
  '/leads/:enquiryId',
  validate({ params: enquiryIdParamSchema }),
  hospitalPortalController.getLeadCase
);

export default router;
