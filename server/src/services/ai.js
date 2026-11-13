import {
  AI_SYSTEM_PROMPT,
  allowlistedCaseInputSchema,
  buildReadinessUserPrompt,
  buildMatchingUserPrompt,
} from './ai.schemas.js';

/**
 * AI Provider Wrapper
 * Supports: gemini | claude | mock (default: mock)
 *
 * Rules:
 * - Never log inputs or outputs (strictly enforce PHI & privacy rules).
 * - Never send names, emails, phone numbers, or clinical record text to providers.
 * - Enforce 20s timeout per attempt.
 * - Retry once on invalid JSON or validation failure.
 */

const TIMEOUT_MS = 20000;

/**
 * Determine configured AI provider
 */
export function getAIProvider() {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase().trim();
  if (provider === 'gemini') return 'gemini';
  if (provider === 'claude' || provider === 'anthropic') return 'claude';
  return 'mock';
}

/**
 * Sanitize case inputs against strict allowlist.
 * Excludes all patient identifiers, names, emails, phone numbers, and raw documents.
 */
export function sanitizeAllowlistedInput(rawInput) {
  const parsed = allowlistedCaseInputSchema.safeParse(rawInput || {});
  const safeData = parsed.success
    ? parsed.data
    : {
        ageRange: 'Adult',
        country: 'Not specified',
        treatmentCategory: 'General Medical Coordination',
        budgetRange: 'Not specified',
        urgency: 'Standard',
        preferredDestinations: [],
        languages: ['en'],
      };

  const result = {
    ageRange: safeData.ageRange,
    country: safeData.country,
    treatmentCategory: safeData.treatmentCategory,
    budgetRange: safeData.budgetRange,
    urgency: safeData.urgency,
    preferredDestinations: safeData.preferredDestinations,
    languages: safeData.languages,
  };

  // If candidate hospitals are provided for matching, sanitize each candidate to public fields only
  if (Array.isArray(rawInput?.candidateHospitals)) {
    result.candidateHospitals = rawInput.candidateHospitals.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      accreditations: Array.isArray(h.accreditations) ? h.accreditations : [],
      languages: Array.isArray(h.languages) ? h.languages : ['English'],
      minPriceCents: h.minPriceCents,
      maxPriceCents: h.maxPriceCents,
      rating: typeof h.rating === 'number' ? h.rating : 4.5,
    }));
  }

  return result;
}

/**
 * Mock provider implementation
 * Realistic simulation requiring no external API key.
 * Ranks candidates by treatment match, destination preference, and rating.
 */
async function executeMockProvider({ task, input, schema }) {
  if (task === 'readiness' || task === 'qualification') {
    const hasCategory =
      input.treatmentCategory &&
      input.treatmentCategory !== 'General Medical Coordination';
    const hasBudget =
      input.budgetRange && input.budgetRange !== 'Not specified';
    const hasDestinations =
      Array.isArray(input.preferredDestinations) &&
      input.preferredDestinations.length > 0;

    let readinessLevel = 'MEDIUM';
    const missingInfo = [];
    const suggestedNextSteps = [];

    if (hasCategory && hasBudget && hasDestinations) {
      readinessLevel = 'HIGH';
      missingInfo.push('Exact target arrival dates');
      missingInfo.push('Passport validity confirmation for accompanying travelers');
      suggestedNextSteps.push(
        'Request structured quotes from matched accredited hospitals'
      );
      suggestedNextSteps.push(
        'Coordinate an introductory tele-consultation with chosen hospital coordinator'
      );
    } else if (hasCategory || hasDestinations) {
      readinessLevel = 'MEDIUM';
      missingInfo.push('Estimated budget allocation');
      missingInfo.push('Recent diagnostic scans or lab reports for clinical intake review');
      suggestedNextSteps.push(
        'Upload diagnostic reports to complete the clinical review file'
      );
      suggestedNextSteps.push('Indicate preferred travel timeline and budget range');
    } else {
      readinessLevel = 'LOW';
      missingInfo.push('Specific procedure or medical specialty preference');
      missingInfo.push('Target destination country');
      missingInfo.push('Diagnostic records');
      suggestedNextSteps.push(
        'Clarify the specific treatment required and preferred destination country'
      );
    }

    const mockOutput = {
      readinessLevel,
      missingInfo,
      suggestedNextSteps,
    };

    return schema.parse(mockOutput);
  }

  if (task === 'matching' || task === 'provider_matching') {
    const candidates = Array.isArray(input.candidateHospitals)
      ? [...input.candidateHospitals]
      : [];

    if (candidates.length === 0) {
      return schema.parse({ matches: [] });
    }

    const preferredDestinations = (input.preferredDestinations || []).map((d) =>
      d.toLowerCase()
    );

    // Score and rank candidates by treatment match, destination preference, and rating
    const scoredCandidates = candidates.map((cand) => {
      let score = 55; // Base score for approved partner hospital

      // Destination preference match (+20)
      const candCountry = (cand.country || '').toLowerCase();
      const candCity = (cand.city || '').toLowerCase();
      const destinationMatch = preferredDestinations.some(
        (dest) => dest.includes(candCountry) || dest.includes(candCity)
      );
      if (destinationMatch) {
        score += 20;
      }

      // Rating boost (+15 based on 5-star scale)
      const rating = cand.rating || 4.5;
      score += Math.min(15, Math.round((rating / 5) * 15));

      // Accreditations boost (+10)
      if (cand.accreditations && cand.accreditations.length > 0) {
        score += 10;
      }

      const clampedScore = Math.min(99, Math.max(65, score));

      const reasons = [];
      if (destinationMatch) {
        reasons.push(
          `Accredited facility located in preferred destination (${cand.city}, ${cand.country})`
        );
      } else {
        reasons.push(
          `Accredited international patient center in ${cand.city}, ${cand.country}`
        );
      }

      if (cand.accreditations && cand.accreditations.length > 0) {
        reasons.push(
          `Maintains international accreditations: ${cand.accreditations.join(', ')}`
        );
      }

      reasons.push(
        `High patient satisfaction rating (${rating.toFixed(1)}/5) with dedicated international patient desk`
      );

      return {
        hospitalId: cand.id,
        score: clampedScore,
        reasons,
      };
    });

    // Rank descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    const top5 = scoredCandidates.slice(0, 5);
    return schema.parse({ matches: top5 });
  }

  throw new Error(`Unsupported AI task: ${task}`);
}

/**
 * Google Gemini Provider implementation
 */
async function executeGeminiProvider({ task, input, schema, signal }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  let prompt = '';
  if (task === 'readiness' || task === 'qualification') {
    prompt = buildReadinessUserPrompt(input);
  } else if (task === 'matching' || task === 'provider_matching') {
    prompt = buildMatchingUserPrompt(input, input.candidateHospitals || []);
  } else {
    throw new Error(`Unsupported AI task: ${task}`);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty response from Gemini API');
  }

  const parsed = JSON.parse(rawText);
  return schema.parse(parsed);
}

/**
 * Anthropic Claude Provider implementation
 */
async function executeClaudeProvider({ task, input, schema, signal }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  let prompt = '';
  if (task === 'readiness' || task === 'qualification') {
    prompt = buildReadinessUserPrompt(input);
  } else if (task === 'matching' || task === 'provider_matching') {
    prompt = buildMatchingUserPrompt(input, input.candidateHospitals || []);
  } else {
    throw new Error(`Unsupported AI task: ${task}`);
  }

  const endpoint = 'https://api.anthropic.com/v1/messages';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: `${AI_SYSTEM_PROMPT}\nYou must output pure, valid JSON ONLY matching the requested schema. No code fences, explanations, or surrounding text.`,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Claude API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.content?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty response from Claude API');
  }

  const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanText);
  return schema.parse(parsed);
}

/**
 * Execute single AI attempt with timeout
 */
async function executeAttempt({ provider, task, input, schema }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (provider === 'gemini') {
      return await executeGeminiProvider({
        task,
        input,
        schema,
        signal: controller.signal,
      });
    }

    if (provider === 'claude') {
      return await executeClaudeProvider({
        task,
        input,
        schema,
        signal: controller.signal,
      });
    }

    // Default to mock provider
    return await executeMockProvider({
      task,
      input,
      schema,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * generateJSON
 * Provider-agnostic wrapper returning zod-validated JSON.
 * Retries once on invalid output or provider error.
 * Enforces 20s timeout and strict input sanitization.
 * Never logs input or output.
 */
export async function generateJSON({ task, input, schema }) {
  const provider = getAIProvider();
  const sanitizedInput = sanitizeAllowlistedInput(input);

  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await executeAttempt({
        provider,
        task,
        input: sanitizedInput,
        schema,
      });
      return result;
    } catch (err) {
      lastError = err;
      // If first attempt failed, retry once without logging payload
      if (attempt === 2) {
        break;
      }
    }
  }

  throw new Error(`AI generation failed after retry: ${lastError?.message || 'Unknown error'}`);
}

export default {
  generateJSON,
  getAIProvider,
  sanitizeAllowlistedInput,
};
