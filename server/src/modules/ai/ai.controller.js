import prisma from '../../config/prisma.js';
import { AI_DISCLAIMER } from '../../services/ai.schemas.js';
import {
  getCachedSummary,
  createQueuedJob,
  processReadinessJob,
  processMatchingJob,
  getLatestCaseSummaries,
} from './ai.service.js';

/**
 * Helper to verify case existence and patient ownership
 */
async function verifyCaseOwnership(caseId, userId) {
  const medicalCase = await prisma.medicalCase.findFirst({
    where: {
      id: caseId,
      deletedAt: null,
    },
  });

  if (!medicalCase) {
    return { error: 'NOT_FOUND', case: null };
  }

  if (medicalCase.patientId !== userId) {
    return { error: 'FORBIDDEN', case: null };
  }

  return { error: null, case: medicalCase };
}

/**
 * POST /api/ai/cases/:caseId/readiness
 * Trigger case readiness assessment
 */
export async function triggerReadiness(req, res, next) {
  try {
    const { caseId } = req.params;
    const { error, case: medicalCase } = await verifyCaseOwnership(caseId, req.user.id);

    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (error === 'FORBIDDEN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // Cache rule: If case already has a COMPLETED result of the same type created
    // after the case's updatedAt, return cached output instead of re-running.
    const cached = await getCachedSummary(medicalCase.id, 'QUALIFICATION', medicalCase.updatedAt);
    if (cached) {
      return res.status(200).json({
        status: 'success',
        cached: true,
        jobId: cached.id,
        data: cached.outputJson,
        disclaimer: AI_DISCLAIMER,
      });
    }

    // Create a new QUEUED job and start processing asynchronously
    const job = await createQueuedJob(medicalCase.id, 'QUALIFICATION');

    // Do NOT await background processing
    processReadinessJob(job.id, medicalCase.id).catch(() => {
      // Background errors are stored on the job record
    });

    return res.status(202).json({
      status: 'success',
      message: 'Readiness evaluation queued',
      jobId: job.id,
      disclaimer: AI_DISCLAIMER,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/cases/:caseId/matching
 * Trigger hospital provider matching
 */
export async function triggerMatching(req, res, next) {
  try {
    const { caseId } = req.params;
    const { error, case: medicalCase } = await verifyCaseOwnership(caseId, req.user.id);

    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (error === 'FORBIDDEN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // Cache rule: If case already has a COMPLETED result of the same type created
    // after the case's updatedAt, return cached output instead of re-running.
    const cached = await getCachedSummary(medicalCase.id, 'PROVIDER_MATCHING', medicalCase.updatedAt);
    if (cached) {
      return res.status(200).json({
        status: 'success',
        cached: true,
        jobId: cached.id,
        data: cached.outputJson,
        disclaimer: AI_DISCLAIMER,
      });
    }

    // Create a new QUEUED job and start processing asynchronously
    const job = await createQueuedJob(medicalCase.id, 'PROVIDER_MATCHING');

    // Do NOT await background processing
    processMatchingJob(job.id, medicalCase.id).catch(() => {
      // Background errors are stored on the job record
    });

    return res.status(202).json({
      status: 'success',
      message: 'Provider matching evaluation queued',
      jobId: job.id,
      disclaimer: AI_DISCLAIMER,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/cases/:caseId/summaries
 * Return latest result per type (QUALIFICATION, PROVIDER_MATCHING)
 */
export async function getCaseSummaries(req, res, next) {
  try {
    const { caseId } = req.params;
    const { error, case: medicalCase } = await verifyCaseOwnership(caseId, req.user.id);

    if (error === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (error === 'FORBIDDEN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    const summaries = await getLatestCaseSummaries(medicalCase.id);

    return res.status(200).json({
      status: 'success',
      data: summaries,
      disclaimer: AI_DISCLAIMER,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  triggerReadiness,
  triggerMatching,
  getCaseSummaries,
};
