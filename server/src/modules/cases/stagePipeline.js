export const STAGE_PIPELINE = [
  'NEW',
  'QUALIFIED',
  'MEDICAL_REVIEW',
  'QUOTE_REQUESTED',
  'QUOTE_SENT',
  'CONSULTATION',
  'BOOKED',
  'TREATMENT',
  'AFTERCARE',
  'CLOSED',
];

/**
 * Enforces the clinical and coordination stage pipeline transitions.
 *
 * Rules:
 * - A case may only advance to the immediate next sequential stage.
 * - A case may be marked CLOSED from any stage (cancellation / completion).
 * - All other jumps are rejected with an explicit, readable error.
 *
 * @param {string} currentStage - Current stage in the pipeline
 * @param {string} targetStage - Desired next stage
 * @returns {string} The validated target stage
 * @throws {Error} If the transition violates the pipeline sequence
 */
export function enforceStageTransition(currentStage, targetStage) {
  const currentIndex = STAGE_PIPELINE.indexOf(currentStage);
  const targetIndex = STAGE_PIPELINE.indexOf(targetStage);

  if (currentIndex === -1) {
    throw new Error(`Invalid current stage: '${currentStage}'`);
  }
  if (targetIndex === -1) {
    throw new Error(`Invalid target stage: '${targetStage}'`);
  }

  // Idempotent: same stage transition is a no-op
  if (currentStage === targetStage) {
    return targetStage;
  }

  // Next sequential step
  const isNextSequential = targetIndex === currentIndex + 1;

  // Case closure
  const isClosing = targetStage === 'CLOSED' && currentStage !== 'CLOSED';

  if (!isNextSequential && !isClosing) {
    const nextAllowed = STAGE_PIPELINE[currentIndex + 1];
    throw new Error(
      `Invalid stage jump: cannot transition case directly from '${currentStage}' to '${targetStage}'. Next permitted stage is '${nextAllowed}' (or 'CLOSED').`
    );
  }

  return targetStage;
}
