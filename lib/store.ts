/**
 * Persistent Vector Store with BM25 Index & Parent-Child Support
 * 
 * Stores document chunks with embeddings on disk so data survives
 * server restarts. Supports parent-child chunk relationships:
 * child chunks are used for searching, parent chunks for LLM context.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DocumentChunk {
  id: string;
  content: string;
  docTitle: string;
  embedding: number[];
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    estimatedPage: number;
    parentIndex?: number;
    role: 'search' | 'context' | 'both';
    contextHeader: string;
  };
}

// ─── BM25 Index ───────────────────────────────────────────────────────────────

interface BM25Index {
  df: Record<string, number>;
  tf: Record<string, Record<string, number>>;
  docLengths: Record<string, number>;
  avgDocLength: number;
  totalDocs: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function buildBM25Index(chunks: DocumentChunk[]): BM25Index {
  // Only index search chunks (not parent/context chunks)
  const searchChunks = chunks.filter(c => c.metadata.role === 'search' || c.metadata.role === 'both');

  const df: Record<string, number> = {};
  const tf: Record<string, Record<string, number>> = {};
  const docLengths: Record<string, number> = {};
  let totalLength = 0;

  for (const chunk of searchChunks) {
    const tokens = tokenize(chunk.content);
    docLengths[chunk.id] = tokens.length;
    totalLength += tokens.length;

    const termFreq: Record<string, number> = {};
    const seenTerms = new Set<string>();

    for (const token of tokens) {
      termFreq[token] = (termFreq[token] || 0) + 1;
      if (!seenTerms.has(token)) {
        df[token] = (df[token] || 0) + 1;
        seenTerms.add(token);
      }
    }

    tf[chunk.id] = termFreq;
  }

  return {
    df,
    tf,
    docLengths,
    avgDocLength: searchChunks.length > 0 ? totalLength / searchChunks.length : 0,
    totalDocs: searchChunks.length,
  };
}

function scoreBM25(
  query: string,
  index: BM25Index,
  docIds: string[],
): Map<string, number> {
  const k1 = 1.2;
  const b = 0.75;
  const queryTokens = tokenize(query);
  const scores = new Map<string, number>();

  for (const docId of docIds) {
    let score = 0;
    const docLen = index.docLengths[docId] || 0;

    for (const term of queryTokens) {
      const docFreq = index.df[term] || 0;
      if (docFreq === 0) continue;

      const termFreq = index.tf[docId]?.[term] || 0;
      if (termFreq === 0) continue;

      const idf = Math.log(
        (index.totalDocs - docFreq + 0.5) / (docFreq + 0.5) + 1,
      );

      const tfNorm =
        (termFreq * (k1 + 1)) /
        (termFreq + k1 * (1 - b + b * (docLen / index.avgDocLength)));

      score += idf * tfNorm;
    }

    if (score > 0) {
      scores.set(docId, score);
    }
  }

  return scores;
}

// ─── Store Class ──────────────────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), '.rag-store.json');

class VectorStore {
  private chunks: DocumentChunk[] = [];
  private bm25Index: BM25Index | null = null;
  private loaded = false;
  /** Map from chunk index to chunk for O(1) parent lookup */
  private chunkByIndex: Map<number, DocumentChunk> = new Map();

  private ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;

    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.chunks)) {
          this.chunks = data.chunks;
          this.bm25Index = buildBM25Index(this.chunks);
          this.rebuildIndexMap();
          console.log(`[Store] Loaded ${this.chunks.length} chunks from disk`);
        }
      }
    } catch (err) {
      console.warn('[Store] Failed to load from disk, starting fresh:', err);
      this.chunks = [];
    }
  }

  private rebuildIndexMap() {
    this.chunkByIndex.clear();
    for (const chunk of this.chunks) {
      this.chunkByIndex.set(chunk.metadata.chunkIndex, chunk);
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify({ chunks: this.chunks }), 'utf-8');
      console.log(`[Store] Saved ${this.chunks.length} chunks to disk`);
    } catch (err) {
      console.error('[Store] Failed to save to disk:', err);
    }
  }

  setChunks(newChunks: DocumentChunk[]) {
    this.loaded = true;
    this.chunks = newChunks;
    this.bm25Index = buildBM25Index(this.chunks);
    this.rebuildIndexMap();
    this.saveToDisk();
  }

  addChunks(newChunks: DocumentChunk[]) {
    this.ensureLoaded();
    this.chunks.push(...newChunks);
    this.bm25Index = buildBM25Index(this.chunks);
    this.rebuildIndexMap();
    this.saveToDisk();
  }

  getChunks(): DocumentChunk[] {
    this.ensureLoaded();
    return this.chunks;
  }

  /** Get only the search chunks (child chunks used for vector search) */
  getSearchChunks(): DocumentChunk[] {
    this.ensureLoaded();
    return this.chunks.filter(c => c.metadata.role === 'search' || c.metadata.role === 'both');
  }

  /** Get only the context chunks (parent chunks sent to LLM) */
  getContextChunks(): DocumentChunk[] {
    this.ensureLoaded();
    return this.chunks.filter(c => c.metadata.role === 'context' || c.metadata.role === 'both');
  }

  /**
   * Given a child chunk, find its parent chunk for richer context.
   * Returns the parent's content, or the child's own content if no parent exists.
   */
  getParentContent(chunk: DocumentChunk): string {
    this.ensureLoaded();
    const parentIdx = chunk.metadata.parentIndex;
    if (parentIdx !== undefined) {
      const parent = this.chunkByIndex.get(parentIdx);
      if (parent) return parent.content;
    }
    return chunk.content;
  }

  /** Get a chunk by its index */
  getChunkByIndex(index: number): DocumentChunk | undefined {
    this.ensureLoaded();
    return this.chunkByIndex.get(index);
  }

  scoreBM25(query: string): Map<string, number> {
    this.ensureLoaded();
    if (!this.bm25Index || this.chunks.length === 0) {
      return new Map();
    }
    const searchChunks = this.getSearchChunks();
    return scoreBM25(query, this.bm25Index, searchChunks.map(c => c.id));
  }

  clear() {
    this.chunks = [];
    this.bm25Index = null;
    this.chunkByIndex.clear();
    this.loaded = true;
    try {
      if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
    } catch {}
  }
}

const globalForStore = globalThis as unknown as { vectorStore_v2: VectorStore };
export const store = globalForStore.vectorStore_v2 || new VectorStore();
if (process.env.NODE_ENV !== 'production') globalForStore.vectorStore_v2 = store;
