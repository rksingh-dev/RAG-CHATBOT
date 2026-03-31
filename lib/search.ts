/**
 * Advanced Hybrid Search with HyDE, Multi-Query, Re-Ranking & Parent-Child
 * 
 * Complete 7-stage retrieval pipeline:
 *  1. HyDE: Generate hypothetical answer → embed for better semantic matching
 *  2. Multi-Query: Generate 3 query variants for broader recall
 *  3. Dense retrieval: Cosine similarity on embeddings (all query variants)
 *  4. Sparse retrieval: BM25 keyword scoring (all query variants)
 *  5. Reciprocal Rank Fusion: Merge all rankings into one
 *  6. Cross-encoder re-ranking: Fine-grained scoring of top candidates
 *  7. MMR diversity + Parent expansion: Return parent chunks for rich context
 */

import { store, DocumentChunk } from '@/lib/store';
import { embedText, rerankPairs } from '@/lib/embeddings';
import { generateHyDE, generateQueryVariants } from '@/lib/query';

// ─── Cosine Similarity ───────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Reciprocal Rank Fusion ──────────────────────────────────────────────────

interface RankedItem {
  id: string;
  score: number;
}

function reciprocalRankFusion(
  ...rankings: RankedItem[][]
): Map<string, number> {
  const k = 60;
  const fusedScores = new Map<string, number>();

  for (const ranking of rankings) {
    for (let rank = 0; rank < ranking.length; rank++) {
      const item = ranking[rank];
      const current = fusedScores.get(item.id) || 0;
      fusedScores.set(item.id, current + 1 / (k + rank + 1));
    }
  }

  return fusedScores;
}

// ─── MMR Diversity ───────────────────────────────────────────────────────────

function applyMMR(
  candidates: Array<{ chunk: DocumentChunk; score: number }>,
  topK: number,
  lambda: number = 0.7,
): Array<{ chunk: DocumentChunk; score: number }> {
  if (candidates.length <= topK) return candidates;

  const selected: Array<{ chunk: DocumentChunk; score: number }> = [];
  const remaining = [...candidates];

  remaining.sort((a, b) => b.score - a.score);
  selected.push(remaining.shift()!);

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0;
    let bestMMRScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = candidate.score;

      let maxSimToSelected = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(candidate.chunk.embedding, sel.chunk.embedding);
        if (sim > maxSimToSelected) maxSimToSelected = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimToSelected;

      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

// ─── Dense Search Helper ─────────────────────────────────────────────────────

function denseSearch(
  queryEmbedding: number[],
  chunks: DocumentChunk[],
): RankedItem[] {
  return chunks
    .map(chunk => ({
      id: chunk.id,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score);
}

// ─── Main Search Pipeline ─────────────────────────────────────────────────────

export interface SearchResult {
  /** The content returned to the LLM (parent chunk if available, else child) */
  content: string;
  /** The original child chunk content that matched */
  matchedContent: string;
  docTitle: string;
  score: number;
  chunkIndex: number;
  estimatedPage: number;
  rank: number;
  /** Whether parent expansion was used */
  expandedToParent: boolean;
}

export interface SearchOptions {
  topK?: number;
  rerankerCandidates?: number;
  useReranker?: boolean;
  mmrLambda?: number;
  /** Enable HyDE query expansion (default: true) */
  useHyDE?: boolean;
  /** Enable multi-query expansion (default: true) */
  useMultiQuery?: boolean;
  /** Expand child matches to parent chunks (default: true) */
  expandToParent?: boolean;
}

/**
 * Full advanced search pipeline:
 * 1. HyDE hypothetical document generation
 * 2. Multi-query variant generation
 * 3. Dense retrieval with all query variants
 * 4. Sparse BM25 with all query variants
 * 5. RRF fusion of all rankings
 * 6. Cross-encoder re-ranking
 * 7. MMR diversity + parent chunk expansion
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    topK = 5,
    rerankerCandidates = 20,
    useReranker = true,
    mmrLambda = 0.7,
    useHyDE = true,
    useMultiQuery = true,
    expandToParent = true,
  } = options;

  const searchChunks = store.getSearchChunks();
  if (searchChunks.length === 0) return [];

  console.log(`[Search] Starting pipeline for: "${query.slice(0, 60)}..."`);
  console.log(`[Search] ${searchChunks.length} searchable chunks`);

  // ── Stage 1 & 2: Query Expansion (HyDE + Multi-Query) in parallel ──
  const allRankings: RankedItem[][] = [];

  // Original query embedding — always included
  const originalEmbedding = await embedText(query);
  allRankings.push(denseSearch(originalEmbedding, searchChunks));

  // BM25 with original query
  const bm25Original = store.scoreBM25(query);
  const sparseOriginal: RankedItem[] = [...bm25Original.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
  allRankings.push(sparseOriginal);

  // HyDE and Multi-Query run in parallel for speed
  const expansionPromises: Promise<void>[] = [];

  if (useHyDE) {
    expansionPromises.push(
      (async () => {
        try {
          const hydeText = await generateHyDE(query);
          if (hydeText !== query) {
            const hydeEmbedding = await embedText(hydeText);
            allRankings.push(denseSearch(hydeEmbedding, searchChunks));
            console.log('[Search] ✓ HyDE ranking added');
          }
        } catch (err) {
          console.warn('[Search] HyDE failed, skipping:', err);
        }
      })(),
    );
  }

  if (useMultiQuery) {
    expansionPromises.push(
      (async () => {
        try {
          const variants = await generateQueryVariants(query);
          for (const variant of variants) {
            // Dense search with variant embedding
            const variantEmbedding = await embedText(variant);
            allRankings.push(denseSearch(variantEmbedding, searchChunks));

            // BM25 with variant
            const bm25Variant = store.scoreBM25(variant);
            const sparseVariant: RankedItem[] = [...bm25Variant.entries()]
              .map(([id, score]) => ({ id, score }))
              .sort((a, b) => b.score - a.score);
            allRankings.push(sparseVariant);
          }
          console.log(`[Search] ✓ Multi-query: ${variants.length} variants added`);
        } catch (err) {
          console.warn('[Search] Multi-query failed, skipping:', err);
        }
      })(),
    );
  }

  // Wait for all expansions to complete
  await Promise.all(expansionPromises);

  console.log(`[Search] Fusing ${allRankings.length} ranking lists via RRF`);

  // ── Stage 5: Reciprocal Rank Fusion ──
  const fusedScores = reciprocalRankFusion(...allRankings);

  // Get top N candidates for re-ranking
  const candidateIds = [...fusedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, rerankerCandidates)
    .map(([id]) => id);

  const chunkMap = new Map(searchChunks.map(c => [c.id, c]));

  let candidates = candidateIds
    .map(id => ({
      chunk: chunkMap.get(id)!,
      score: fusedScores.get(id) || 0,
    }))
    .filter(c => c.chunk);

  // ── Stage 6: Cross-encoder re-ranking ──
  if (useReranker && candidates.length > 0) {
    try {
      const passages = candidates.map(c => c.chunk.content);
      const rerankerScores = await rerankPairs(query, passages);

      candidates = candidates.map((c, i) => ({
        ...c,
        score: rerankerScores[i] || 0,
      }));

      candidates.sort((a, b) => b.score - a.score);
      console.log('[Search] ✓ Re-ranking complete');
    } catch (err) {
      console.warn('[Search] Re-ranker failed, using RRF scores:', err);
    }
  }

  // ── Stage 7: MMR diversity filtering ──
  const diverseResults = applyMMR(candidates, topK, mmrLambda);

  // ── Parent Expansion: Replace child content with parent content ──
  const results: SearchResult[] = diverseResults.map((item, rank) => {
    let finalContent = item.chunk.content;
    let expandedToParent = false;

    if (expandToParent && item.chunk.metadata.parentIndex !== undefined) {
      const parentContent = store.getParentContent(item.chunk);
      if (parentContent !== item.chunk.content) {
        finalContent = parentContent;
        expandedToParent = true;
      }
    }

    return {
      content: finalContent,
      matchedContent: item.chunk.content,
      docTitle: item.chunk.docTitle,
      score: item.score,
      chunkIndex: item.chunk.metadata.chunkIndex,
      estimatedPage: item.chunk.metadata.estimatedPage,
      rank: rank + 1,
      expandedToParent,
    };
  });

  // Deduplicate parent content (multiple children might map to same parent)
  const seen = new Set<string>();
  const deduped = results.filter(r => {
    const key = r.content.slice(0, 200);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[Search] Final: ${deduped.length} results (${deduped.filter(r => r.expandedToParent).length} parent-expanded)`);

  return deduped;
}

export { cosineSimilarity as calculateCosineSimilarity };
