// Cosine similarity for embeddings
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Ensure chunk array element matches DocumentChunk interface logic
export function findRelevantChunksByEmbedding(
  queryEmbedding: number[],
  chunks: Array<{ content: string; docTitle: string; embedding: number[] }>,
  topK: number = 3
): Array<{ content: string; docTitle: string; score: number }> {
  
  const scoredChunks = chunks.map(chunk => ({
    content: chunk.content,
    docTitle: chunk.docTitle,
    score: calculateCosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
