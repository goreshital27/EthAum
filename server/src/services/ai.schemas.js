import { z } from 'zod';

/**
 * Mandatory AI disclaimer
 * Every AI response surface or output must include this disclaimer.
 */
export const AI_DISCLAIMER = 'AI-assisted coordination, not medical advice';

/**
 * System prompt ensuring AI functions exclusively as a non-clinical travel coordinator.
 * Clinical diagnosis, treatment planning, or medical advice are strictly prohibited.
 */
export const AI_SYSTEM_PROMPT = `You are an AI coordination assistant for EthAum, an international medical tourism coordination platform.

CRITICAL SAFETY & SCOPE RULES:
1. You function SOLELY to support coordination, logistics, case summarization, intake facilitation, and provider matching.
2. You must NEVER provide medical diagnosis, clinical evaluation, treatment planning, prescription advice, or clinical medical recommendations.
3. Every recommendation must be strictly administrative, logistical, and communicative.
4. Output must be strictly valid JSON matching the requested schema without markdown tags, code blocks, or preamble.`;

/**
 * Case Input Allowlist Schema
 * Explicitly restricts inputs to safe non-PHI logistical attributes:
 * ageRange, country, treatmentCategory, budgetRange, urgency, preferredDestinations, languages.
 * Names, emails, phone numbers, and raw medical document texts are strictly forbidden.
 */
export const allowlistedCaseInputSchema = z.object({
  ageRange: z.string().default('Adult'),
  country: z.string().default('Not specified'),
  treatmentCategory: z.string().default('General Medical Coordination'),
  budgetRange: z.string().default('Not specified'),
  urgency: z.string().default('Standard'),
  preferredDestinations: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['en']),
});

/**
 * Readiness check output schema
 * Evaluates administrative and coordination intake completeness.
 */
export const readinessOutputSchema = z.object({
  readinessLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  missingInfo: z.array(z.string()).default([]),
  suggestedNextSteps: z.array(z.string()).default([]),
});

/**
 * Provider matching candidate item schema
 */
export const matchItemSchema = z.object({
  hospitalId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()).min(1),
});

/**
 * Provider matching output schema (maximum 5 matches)
 */
export const providerMatchingOutputSchema = z.object({
  matches: z.array(matchItemSchema).max(5),
});

/**
 * Generate user prompt for readiness assessment
 */
export function buildReadinessUserPrompt(allowlistedInput) {
  return `Evaluate the coordination and intake readiness for this medical tourism inquiry.
Focus strictly on administrative completeness (documentation, travel planning, budget alignment).
DO NOT provide medical diagnosis or treatment advice.

Inquiry Details:
- Patient Country: ${allowlistedInput.country}
- Age Range: ${allowlistedInput.ageRange}
- Treatment Category: ${allowlistedInput.treatmentCategory}
- Budget Range: ${allowlistedInput.budgetRange}
- Preferred Destinations: ${allowlistedInput.preferredDestinations.join(', ') || 'Flexible'}
- Languages: ${allowlistedInput.languages.join(', ')}
- Urgency: ${allowlistedInput.urgency}

Respond with valid JSON matching this schema:
{
  "readinessLevel": "LOW" | "MEDIUM" | "HIGH",
  "missingInfo": ["string"],
  "suggestedNextSteps": ["string"]
}`;
}

/**
 * Generate user prompt for hospital provider matching
 */
export function buildMatchingUserPrompt(allowlistedInput, candidateHospitals) {
  const hospitalSummaries = candidateHospitals.map((h) => ({
    id: h.id,
    name: h.name,
    city: h.city,
    country: h.country,
    accreditations: h.accreditations || [],
    languages: h.languages || [],
    priceRangeUSD:
      h.minPriceCents != null && h.maxPriceCents != null
        ? `$${Math.round(h.minPriceCents / 100)} - $${Math.round(h.maxPriceCents / 100)}`
        : 'Upon enquiry',
  }));

  return `Evaluate and rank candidate accredited hospitals (maximum 5) for this medical tourism coordination inquiry.
Base ranking on destination preference, budget alignment, accreditations, and language compatibility.
DO NOT provide clinical recommendations or medical advice.

Inquiry Requirements:
- Treatment Category: ${allowlistedInput.treatmentCategory}
- Budget Range: ${allowlistedInput.budgetRange}
- Preferred Destinations: ${allowlistedInput.preferredDestinations.join(', ') || 'Flexible'}
- Languages: ${allowlistedInput.languages.join(', ')}
- Urgency: ${allowlistedInput.urgency}

Candidate Accredited Hospitals:
${JSON.stringify(hospitalSummaries, null, 2)}

Respond with valid JSON matching this schema:
{
  "matches": [
    {
      "hospitalId": "<UUID>",
      "score": <0-100 integer>,
      "reasons": ["<reason 1>", "<reason 2>"]
    }
  ]
}`;
}
