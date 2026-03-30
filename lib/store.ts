export interface DocumentChunk {
  content: string;
  docTitle: string;
  embedding: number[];
}

class Store {
  chunks: DocumentChunk[] = [];

  setChunks(newChunks: DocumentChunk[]) {
    this.chunks = newChunks;
  }

  getChunks(): DocumentChunk[] {
    return this.chunks;
  }

  clear() {
    this.chunks = [];
  }
}

// In Next.js, we need to ensure this is truly a singleton across hot reloads in development
const globalForStore = globalThis as unknown as { store: Store };

export const store = globalForStore.store || new Store();

if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
