// Simple keyword-based similarity search
// For a production app, you'd want to use proper embeddings and vector search

export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

export function findRelevantChunks(
  query: string,
  chunks: Array<{ content: string; docId: string; docTitle: string }>,
  topK: number = 3
): Array<{ content: string; docId: string; docTitle: string; score: number }> {
  const scoredChunks = chunks.map(chunk => ({
    ...chunk,
    score: calculateSimilarity(query, chunk.content)
  }));

  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
