import hospitalPortalService from './hospitalPortal.service.js';

/**
 * Middleware helper to resolve the hospital of the authenticated user
 */
async function resolveHospital(req, res) {
  const hospital = await hospitalPortalService.getHospitalByUserId(req.user.id);
  if (!hospital) {
    res.status(404).json({
      status: 'fail',
      message: 'Hospital profile not found for authenticated user',
    });
    return null;
  }
  return hospital;
}

export const hospitalPortalController = {
  /**
   * GET /api/hospital-portal/profile
   */
  async getProfile(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const profile = await hospitalPortalService.getProfile(hospital.id);
      return res.status(200).json({
        status: 'ok',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/hospital-portal/profile
   */
  async updateProfile(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const updated = await hospitalPortalService.updateProfile(
        hospital.id,
        req.body
      );
      return res.status(200).json({
        status: 'ok',
        message: 'Hospital profile updated successfully (Provider-reported)',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/hospital-portal/treatments
   */
  async addTreatment(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const result = await hospitalPortalService.addTreatment(
        hospital.id,
        req.body
      );
      return res.status(201).json({
        status: 'ok',
        message: 'Treatment offering added successfully',
        data: result,
      });
    } catch (error) {
      if (error.message.includes('already offered')) {
        return res.status(409).json({
          status: 'fail',
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * PATCH /api/hospital-portal/treatments/:treatmentId
   */
  async updateTreatment(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const { treatmentId } = req.params;
      const result = await hospitalPortalService.updateTreatment(
        hospital.id,
        treatmentId,
        req.body
      );
      return res.status(200).json({
        status: 'ok',
        message: 'Treatment pricing updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/hospital-portal/treatments/:treatmentId
   */
  async removeTreatment(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const { treatmentId } = req.params;
      await hospitalPortalService.removeTreatment(hospital.id, treatmentId);
      return res.status(200).json({
        status: 'ok',
        message: 'Treatment offering removed',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/hospital-portal/doctors
   */
  async addDoctor(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const doctor = await hospitalPortalService.addDoctor(
        hospital.id,
        req.body
      );
      return res.status(201).json({
        status: 'ok',
        message: 'Specialist doctor added successfully',
        data: doctor,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/hospital-portal/doctors/:doctorId
   */
  async updateDoctor(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const { doctorId } = req.params;
      const doctor = await hospitalPortalService.updateDoctor(
        hospital.id,
        doctorId,
        req.body
      );
      return res.status(200).json({
        status: 'ok',
        message: 'Doctor profile updated successfully',
        data: doctor,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/hospital-portal/doctors/:doctorId
   */
  async removeDoctor(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const { doctorId } = req.params;
      await hospitalPortalService.removeDoctor(hospital.id, doctorId);
      return res.status(200).json({
        status: 'ok',
        message: 'Doctor removed from hospital directory',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/hospital-portal/leads
   */
  async getLeads(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const result = await hospitalPortalService.getLeadInbox(
        hospital,
        req.query
      );
      return res.status(200).json({
        status: 'ok',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/hospital-portal/leads/:enquiryId
   */
  async getLeadCase(req, res, next) {
    try {
      const hospital = await resolveHospital(req, res);
      if (!hospital) return;

      const { enquiryId } = req.params;
      const result = await hospitalPortalService.getLeadCaseDetail(
        hospital,
        enquiryId
      );
      return res.status(200).json({
        status: 'ok',
        data: result,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          status: 'fail',
          message: error.message,
        });
      }
      next(error);
    }
  },
};

export default hospitalPortalController;
