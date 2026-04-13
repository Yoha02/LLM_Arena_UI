/**
 * Embeddings Service
 * 
 * Generates and compares sentence embeddings using OpenAI's API.
 * Used for measuring response similarity and clustering analysis.
 */

import OpenAI from 'openai';

// ============ Types ============

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  truncated: boolean;
}

export interface SimilarityMatrix {
  matrix: number[][];
  labels: string[];
  avgSimilarity: number;
  minSimilarity: number;
  maxSimilarity: number;
}

export interface ClusterResult {
  clusters: Array<{
    id: number;
    members: string[];
    centroid: number[];
    intraClusterSimilarity: number;
  }>;
  silhouetteScore: number;
}

// ============ Embeddings Service Class ============

export class EmbeddingsService {
  private client: OpenAI;
  private model: string = 'text-embedding-3-small';
  private cache: Map<string, number[]> = new Map();
  
  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || '',
      timeout: 60000,
      maxRetries: 2,
    });
  }
  
  // ============ Core Embedding Functions ============
  
  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const truncated = this.truncateText(text);
    
    const response = await this.client.embeddings.create({
      model: this.model,
      input: truncated,
    });
    
    const embedding = response.data[0].embedding;
    this.cache.set(cacheKey, embedding);
    
    return embedding;
  }
  
  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const uncachedTexts: { index: number; text: string; truncated: string }[] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i]);
      if (this.cache.has(cacheKey)) {
        results[i] = {
          text: texts[i],
          embedding: this.cache.get(cacheKey)!,
          truncated: false,
        };
      } else {
        const truncated = this.truncateText(texts[i]);
        uncachedTexts.push({ index: i, text: texts[i], truncated });
      }
    }
    
    if (uncachedTexts.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < uncachedTexts.length; i += batchSize) {
        const batch = uncachedTexts.slice(i, i + batchSize);
        
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch.map(b => b.truncated),
        });
        
        for (let j = 0; j < batch.length; j++) {
          const { index, text, truncated } = batch[j];
          const embedding = response.data[j].embedding;
          
          this.cache.set(this.getCacheKey(text), embedding);
          results[index] = {
            text,
            embedding,
            truncated: truncated !== text,
          };
        }
      }
    }
    
    return results;
  }
  
  // ============ Similarity Functions ============
  
  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimension');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  }
  
  /**
   * Calculate pairwise similarity matrix for multiple embeddings
   */
  calculateSimilarityMatrix(embeddings: number[][], labels: string[]): SimilarityMatrix {
    const n = embeddings.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    let sum = 0;
    let count = 0;
    let min = 1;
    let max = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const sim = this.cosineSimilarity(embeddings[i], embeddings[j]);
          matrix[i][j] = sim;
          
          if (i < j) {
            sum += sim;
            count++;
            min = Math.min(min, sim);
            max = Math.max(max, sim);
          }
        }
      }
    }
    
    return {
      matrix,
      labels,
      avgSimilarity: count > 0 ? sum / count : 0,
      minSimilarity: count > 0 ? min : 0,
      maxSimilarity: count > 0 ? max : 0,
    };
  }
  
  /**
   * Calculate intra-model similarity (how similar responses are within same model)
   */
  async calculateIntraModelSimilarity(responses: string[]): Promise<{
    mean: number;
    std: number;
    distribution: number[];
  }> {
    if (responses.length < 2) {
      return { mean: 0, std: 0, distribution: [] };
    }
    
    const embeddings = await this.embedBatch(responses);
    const similarities: number[] = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        similarities.push(this.cosineSimilarity(
          embeddings[i].embedding,
          embeddings[j].embedding
        ));
      }
    }
    
    const mean = similarities.reduce((s, v) => s + v, 0) / similarities.length;
    const variance = similarities.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / similarities.length;
    const std = Math.sqrt(variance);
    
    const distribution = this.createHistogram(similarities, 10);
    
    return { mean, std, distribution };
  }
  
  /**
   * Calculate inter-model similarity (how similar responses are between models)
   */
  async calculateInterModelSimilarity(
    modelResponses: Record<string, string[]>
  ): Promise<{
    matrix: number[][];
    modelOrder: string[];
    avgSimilarity: number;
    mostSimilarPair: { models: [string, string]; similarity: number };
    mostDiversePair: { models: [string, string]; similarity: number };
  }> {
    const models = Object.keys(modelResponses);
    const n = models.length;
    
    const modelEmbeddings: Record<string, number[][]> = {};
    for (const model of models) {
      const results = await this.embedBatch(modelResponses[model]);
      modelEmbeddings[model] = results.map(r => r.embedding);
    }
    
    const modelCentroids: Record<string, number[]> = {};
    for (const model of models) {
      modelCentroids[model] = this.calculateCentroid(modelEmbeddings[model]);
    }
    
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    let mostSimilarPair = { models: [models[0], models[0]] as [string, string], similarity: 0 };
    let mostDiversePair = { models: [models[0], models[0]] as [string, string], similarity: 1 };
    let totalSimilarity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const sim = this.cosineSimilarity(modelCentroids[models[i]], modelCentroids[models[j]]);
          matrix[i][j] = sim;
          
          if (i < j) {
            totalSimilarity += sim;
            pairCount++;
            
            if (sim > mostSimilarPair.similarity) {
              mostSimilarPair = { models: [models[i], models[j]], similarity: sim };
            }
            if (sim < mostDiversePair.similarity) {
              mostDiversePair = { models: [models[i], models[j]], similarity: sim };
            }
          }
        }
      }
    }
    
    return {
      matrix,
      modelOrder: models,
      avgSimilarity: pairCount > 0 ? totalSimilarity / pairCount : 0,
      mostSimilarPair,
      mostDiversePair,
    };
  }
  
  // ============ Clustering ============
  
  /**
   * Simple k-means clustering on embeddings
   */
  async clusterResponses(
    responses: string[],
    labels: string[],
    k: number = 3
  ): Promise<ClusterResult> {
    const embeddings = await this.embedBatch(responses);
    const vectors = embeddings.map(e => e.embedding);
    
    const { assignments, centroids } = this.kMeans(vectors, k);
    
    const clusters: ClusterResult['clusters'] = [];
    for (let i = 0; i < k; i++) {
      const members: string[] = [];
      const memberVectors: number[][] = [];
      
      for (let j = 0; j < assignments.length; j++) {
        if (assignments[j] === i) {
          members.push(labels[j]);
          memberVectors.push(vectors[j]);
        }
      }
      
      if (members.length > 0) {
        let intraSimilarity = 1;
        if (memberVectors.length > 1) {
          let sum = 0;
          let count = 0;
          for (let a = 0; a < memberVectors.length; a++) {
            for (let b = a + 1; b < memberVectors.length; b++) {
              sum += this.cosineSimilarity(memberVectors[a], memberVectors[b]);
              count++;
            }
          }
          intraSimilarity = count > 0 ? sum / count : 1;
        }
        
        clusters.push({
          id: i,
          members,
          centroid: centroids[i],
          intraClusterSimilarity: intraSimilarity,
        });
      }
    }
    
    const silhouetteScore = this.calculateSilhouetteScore(vectors, assignments, centroids);
    
    return { clusters, silhouetteScore };
  }
  
  // ============ Private Helpers ============
  
  private truncateText(text: string, maxTokens: number = 8000): string {
    const estimatedTokens = text.length / 4;
    if (estimatedTokens <= maxTokens) return text;
    
    const maxChars = maxTokens * 4;
    return text.slice(0, maxChars);
  }
  
  private getCacheKey(text: string): string {
    const truncated = text.slice(0, 100);
    return `${this.model}:${truncated.length}:${truncated}`;
  }
  
  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    
    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);
    
    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += vec[i];
      }
    }
    
    for (let i = 0; i < dim; i++) {
      centroid[i] /= vectors.length;
    }
    
    return centroid;
  }
  
  private kMeans(
    vectors: number[][],
    k: number,
    maxIterations: number = 100
  ): { assignments: number[]; centroids: number[][] } {
    const n = vectors.length;
    if (n === 0 || k <= 0) return { assignments: [], centroids: [] };
    
    k = Math.min(k, n);
    
    let centroids = vectors.slice(0, k).map(v => [...v]);
    let assignments = new Array(n).fill(0);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const newAssignments = vectors.map(vec => {
        let minDist = Infinity;
        let closest = 0;
        
        for (let c = 0; c < k; c++) {
          const dist = this.euclideanDistance(vec, centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            closest = c;
          }
        }
        
        return closest;
      });
      
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (assignments[i] !== newAssignments[i]) {
          changed = true;
          break;
        }
      }
      
      assignments = newAssignments;
      
      if (!changed) break;
      
      const newCentroids: number[][] = [];
      for (let c = 0; c < k; c++) {
        const members = vectors.filter((_, i) => assignments[i] === c);
        if (members.length > 0) {
          newCentroids.push(this.calculateCentroid(members));
        } else {
          newCentroids.push(centroids[c]);
        }
      }
      centroids = newCentroids;
    }
    
    return { assignments, centroids };
  }
  
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
  
  private calculateSilhouetteScore(
    vectors: number[][],
    assignments: number[],
    centroids: number[][]
  ): number {
    if (vectors.length < 2) return 0;
    
    const k = centroids.length;
    const scores: number[] = [];
    
    for (let i = 0; i < vectors.length; i++) {
      const cluster = assignments[i];
      
      const sameCluster = vectors.filter((_, j) => j !== i && assignments[j] === cluster);
      const a = sameCluster.length > 0
        ? sameCluster.reduce((sum, v) => sum + this.euclideanDistance(vectors[i], v), 0) / sameCluster.length
        : 0;
      
      let b = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === cluster) continue;
        const otherCluster = vectors.filter((_, j) => assignments[j] === c);
        if (otherCluster.length > 0) {
          const avgDist = otherCluster.reduce((sum, v) => sum + this.euclideanDistance(vectors[i], v), 0) / otherCluster.length;
          b = Math.min(b, avgDist);
        }
      }
      
      if (b === Infinity) b = 0;
      
      const s = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
      scores.push(s);
    }
    
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }
  
  private createHistogram(values: number[], bins: number): number[] {
    const histogram = new Array(bins).fill(0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    for (const val of values) {
      const binIndex = Math.min(Math.floor(((val - min) / range) * bins), bins - 1);
      histogram[binIndex]++;
    }
    
    return histogram;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

// ============ Singleton Factory ============

let embeddingsInstance: EmbeddingsService | null = null;

export function getEmbeddingsService(apiKey?: string): EmbeddingsService {
  if (!embeddingsInstance) {
    embeddingsInstance = new EmbeddingsService(apiKey);
  }
  return embeddingsInstance;
}
