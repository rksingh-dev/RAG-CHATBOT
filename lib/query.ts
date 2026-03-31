/**
 * Query Expansion Module — HyDE + Multi-Query
 * 
 * Two research-proven techniques to dramatically improve retrieval:
 * 
 * 1. HyDE (Hypothetical Document Embeddings):
 *    Ask the LLM to write a hypothetical answer, then embed THAT
 *    instead of the question. Questions and answers live in different
 *    semantic spaces — HyDE bridges the gap.
 * 
 * 2. Multi-Query:
 *    Generate 3 reformulations of the user's question, search with
 *    each, then merge via RRF. Different phrasings catch different
 *    chunks that use different vocabulary.
 * 
 * Both use the same Groq LLM that powers the chat responses.
 */

const GROQ_API_KEY = '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Call Groq LLM for a quick, non-streaming completion.
 * Uses llama-3.3-70b with low max_tokens for speed.
 */
async function quickLLM(systemPrompt: string, userPrompt: string, maxTokens: number = 300): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    console.warn('[Query] LLM call failed:', response.status);
    return '';
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── HyDE: Hypothetical Document Embeddings ─────────────────────────────────

/**
 * Generate a hypothetical document passage that would answer the query.
 * This passage is then embedded and used for vector search instead of
 * the original query — dramatically improving semantic match quality.
 * 
 * Paper: "Precise Zero-Shot Dense Retrieval without Relevance Labels" (Gao et al., 2022)
 */
export async function generateHyDE(query: string): Promise<string> {
  const systemPrompt = `You are a technical document writer. Given a question, write a SHORT paragraph (3-5 sentences) that would appear in a real document as the answer to that question. 

Rules:
- Write as if you are the document, not answering a question
- Use factual, specific language (but you can make up plausible details)
- Do NOT start with "The answer is" or similar
- Do NOT mention the question itself
- Keep it under 150 words`;

  const result = await quickLLM(systemPrompt, query, 200);

  if (!result || result.length < 20) {
    console.warn('[HyDE] Generated text too short, falling back to original query');
    return query;
  }

  console.log(`[HyDE] Generated hypothetical doc (${result.length} chars): "${result.slice(0, 80)}..."`);
  return result;
}

// ─── Multi-Query: Generate Query Variants ────────────────────────────────────

/**
 * Generate 3 reformulations of the user's query to capture different
 * vocabulary and perspectives. Each variant is searched independently,
 * then results are fused via RRF.
 * 
 * Example:
 *   Original: "What is the company's revenue?"
 *   Variants: [
 *     "How much money did the company earn?",
 *     "Total annual sales and income figures",
 *     "Financial performance revenue breakdown"
 *   ]
 */
export async function generateQueryVariants(query: string): Promise<string[]> {
  const systemPrompt = `You are a search query optimizer. Given a user question, generate exactly 3 alternative phrasings that capture the same intent but use different words and angles.

Rules:
- Each variant should use DIFFERENT vocabulary than the original
- Include one that's more specific/technical
- Include one that's more general/broad
- Return ONLY a JSON array of 3 strings, nothing else
- Example output: ["variant 1", "variant 2", "variant 3"]`;

  const result = await quickLLM(systemPrompt, query, 200);

  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      const variants = parsed.slice(0, 3).filter((v: any) => typeof v === 'string' && v.length > 5);
      if (variants.length >= 2) {
        console.log(`[MultiQuery] Generated ${variants.length} variants`);
        return variants;
      }
    }
  } catch {
    // Try to extract strings from non-JSON output
    const lines = result.split('\n').filter(l => l.trim().length > 10);
    if (lines.length >= 2) {
      const variants = lines.slice(0, 3).map(l => l.replace(/^[\d\.\-\*]+\s*/, '').replace(/^["']|["']$/g, '').trim());
      console.log(`[MultiQuery] Extracted ${variants.length} variants from text`);
      return variants;
    }
  }

  console.warn('[MultiQuery] Failed to generate variants, using original only');
  return [];
}

// ─── Self-RAG: Validate Retrieved Context ────────────────────────────────────

/**
 * Check if the retrieved context is actually relevant to the query.
 * Returns a filtered list of truly relevant chunks.
 * 
 * This is a lightweight version of Self-RAG that validates retrieval
 * quality before sending context to the final answer LLM.
 */
export async function validateRelevance(
  query: string,
  chunks: Array<{ content: string; index: number }>,
): Promise<number[]> {
  if (chunks.length === 0) return [];

  const chunkList = chunks
    .map(c => `[${c.index}]: "${c.content.slice(0, 200)}..."`)
    .join('\n');

  const systemPrompt = `You are a relevance judge. Given a question and numbered text passages, determine which passages are RELEVANT to answering the question.

Rules:
- Return ONLY a JSON array of the relevant passage numbers
- A passage is relevant if it contains information that helps answer the question
- Be strict: exclude passages that are vaguely related but don't contain useful info
- Example output: [1, 3, 5]`;

  const userPrompt = `Question: ${query}\n\nPassages:\n${chunkList}`;
  const result = await quickLLM(systemPrompt, userPrompt, 100);

  try {
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((n: any) => typeof n === 'number');
      console.log(`[Self-RAG] Validated: ${valid.length}/${chunks.length} chunks relevant`);
      return valid;
    }
  } catch {}

  // If parsing fails, keep all chunks (fail-open)
  console.warn('[Self-RAG] Validation parse failed, keeping all chunks');
  return chunks.map(c => c.index);
}

// ─── Self-RAG: Hallucination Check ──────────────────────────────────────────

/**
 * After generating an answer, verify that every claim is grounded
 * in the provided context. Returns a confidence assessment.
 */
export async function checkGroundedness(
  answer: string,
  context: string,
): Promise<{ grounded: boolean; confidence: number; issues: string[] }> {
  const systemPrompt = `You are a fact-checking judge. Given an AI's answer and the source context it was based on, check if the answer is grounded (only uses information from the context).

Return a JSON object with:
- "grounded": true/false (is the answer fully supported by the context?)
- "confidence": 0.0 to 1.0 (how confident are you in this assessment?)
- "issues": [] (list of any claims not found in context, empty array if none)

Return ONLY the JSON object, nothing else.`;

  const userPrompt = `Answer: ${answer.slice(0, 1000)}\n\nSource Context: ${context.slice(0, 2000)}`;
  const result = await quickLLM(systemPrompt, userPrompt, 200);

  try {
    const parsed = JSON.parse(result);
    return {
      grounded: parsed.grounded ?? true,
      confidence: parsed.confidence ?? 0.5,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return { grounded: true, confidence: 0.5, issues: [] };
  }
}
