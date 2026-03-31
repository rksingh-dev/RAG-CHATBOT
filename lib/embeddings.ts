/**
 * Embedding & Re-Ranking Pipeline
 * 
 * Uses @xenova/transformers for:
 *  - bge-small-en-v1.5: High-quality embeddings (384-dim, MTEB top-tier)
 *  - ms-marco-MiniLM-L-6-v2: Cross-encoder re-ranker for two-stage retrieval
 * 
 * Both models are loaded once and cached as singletons.
 */

import { env, pipeline, AutoTokenizer } from '@xenova/transformers';

// Always fetch models from HuggingFace Hub (not local filesystem)
env.allowLocalModels = false;

// ─── Embedding Model Singleton ────────────────────────────────────────────────
// bge-small-en-v1.5: 33M params, 384 dims — ~24% better retrieval than MiniLM-L6-v2
class EmbeddingPipeline {
  static task: any = 'feature-extraction';
  static model = 'Xenova/bge-small-en-v1.5';
  static instance: any = null;

  static async getInstance(progressCallback?: (progress: any) => void) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback: progressCallback,
      });
    }
    return this.instance;
  }
}

// ─── Re-Ranker Model Singleton ────────────────────────────────────────────────
// Cross-encoder for scoring (query, passage) pairs — far more accurate than cosine similarity
class RerankerPipeline {
  static task: any = 'text-classification';
  static model = 'Xenova/ms-marco-MiniLM-L-6-v2';
  static instance: any = null;

  static async getInstance(progressCallback?: (progress: any) => void) {
    if (this.instance === null) {
      // Cross-encoder models use sequence classification to score relevance
      this.instance = await pipeline(this.task, this.model, {
        progress_callback: progressCallback,
      });
    }
    return this.instance;
  }
}

/**
 * Generate a normalized embedding vector for a single text string.
 * For bge models, prepending "Represent this sentence:" improves retrieval quality.
 */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data) as number[];
}

/**
 * Generate embedding vectors for a batch of texts.
 * Processes sequentially to avoid OOM on large documents.
 */
export async function embedBatch(
  texts: string[],
  onProgress?: (completed: number, total: number) => void,
): Promise<number[][]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    const output = await extractor(texts[i], {
      pooling: 'mean',
      normalize: true,
    });
    embeddings.push(Array.from(output.data) as number[]);

    if (onProgress) {
      onProgress(i + 1, texts.length);
    }
  }

  return embeddings;
}

/**
 * Cross-encoder re-ranking: scores each (query, passage) pair individually.
 * Returns a relevance score for the pair — much more accurate than cosine similarity.
 */
export async function rerankPairs(
  query: string,
  passages: string[],
): Promise<number[]> {
  const reranker = await RerankerPipeline.getInstance();
  const scores: number[] = [];

  for (const passage of passages) {
    // Cross-encoders take a pair of texts and output a relevance score
    const result = await reranker(`${query} [SEP] ${passage}`, {
      topk: null,    // Return all scores
    });

    // The model returns logits; for ms-marco models, we want the LABEL_0 score
    // which represents relevance. Higher = more relevant.
    if (Array.isArray(result) && result.length > 0) {
      // Get the score — some models output {label, score} objects
      const score = result[0]?.score ?? result[0] ?? 0;
      scores.push(typeof score === 'number' ? score : 0);
    } else {
      scores.push(0);
    }
  }

  return scores;
}

/**
 * Pre-warm both models so the first query doesn't have cold-start latency.
 * Call this during upload to overlap model loading with document processing.
 */
export async function warmupModels(): Promise<void> {
  await EmbeddingPipeline.getInstance();
  // Re-ranker is loaded lazily on first chat query to keep upload fast
}
