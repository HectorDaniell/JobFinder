/**
 * Port: abstraction for generating embeddings (text → vectors).
 * Used in layer 2 of the matching funnel (semantic similarity).
 * Implementations: Voyage AI, local fastembed, OpenAI, etc.
 */

export interface EmbedderPort {
  /**
   * Embed a batch of texts into vectors.
   * Typically 1024 dimensions.
   */
  embed(texts: string[]): Promise<number[][]>;

  /**
   * Embed a single text.
   */
  embedOne(text: string): Promise<number[]>;

  /**
   * Compute cosine similarity between two vectors.
   * Returns 0–1.
   */
  similarity(vecA: number[], vecB: number[]): number;
}
