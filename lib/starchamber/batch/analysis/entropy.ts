/**
 * Entropy Calculator
 * 
 * Calculates Shannon entropy and related diversity metrics for response analysis.
 * Based on methodology from "The Artificial Hivemind" paper.
 */

// ============ Types ============

export interface EntropyResult {
  shannonEntropy: number;
  normalizedEntropy: number;
  uniqueTokenRatio: number;
  vocabularySize: number;
}

export interface ResponseEntropyAnalysis {
  byTurn: number[];
  mean: number;
  std: number;
  min: number;
  max: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface FirstTokenEntropyResult {
  entropy: number;
  topToken: string;
  topTokenProbability: number;
  alternativeCount: number;
  isHighEntropy: boolean;
}

// ============ Core Entropy Functions ============

/**
 * Calculate Shannon entropy for a probability distribution
 * H(X) = -Σ p(x) * log2(p(x))
 */
export function shannonEntropy(probabilities: number[]): number {
  if (probabilities.length === 0) return 0;
  
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 0 && p <= 1) {
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}

/**
 * Normalize entropy to [0, 1] range
 * Normalized H = H / log2(n) where n is number of possible outcomes
 */
export function normalizedEntropy(entropy: number, numOutcomes: number): number {
  if (numOutcomes <= 1) return 0;
  const maxEntropy = Math.log2(numOutcomes);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

// ============ Text Entropy Analysis ============

/**
 * Calculate entropy of a text based on word frequency distribution
 */
export function calculateTextEntropy(text: string): EntropyResult {
  const words = tokenize(text);
  if (words.length === 0) {
    return { shannonEntropy: 0, normalizedEntropy: 0, uniqueTokenRatio: 0, vocabularySize: 0 };
  }
  
  const frequencies = getWordFrequencies(words);
  const vocabularySize = Object.keys(frequencies).length;
  const totalWords = words.length;
  
  const probabilities = Object.values(frequencies).map(count => count / totalWords);
  const entropy = shannonEntropy(probabilities);
  const normalized = normalizedEntropy(entropy, vocabularySize);
  
  return {
    shannonEntropy: entropy,
    normalizedEntropy: normalized,
    uniqueTokenRatio: vocabularySize / totalWords,
    vocabularySize,
  };
}

/**
 * Analyze entropy across multiple responses (e.g., per turn)
 */
export function analyzeResponseEntropy(responses: string[]): ResponseEntropyAnalysis {
  if (responses.length === 0) {
    return { byTurn: [], mean: 0, std: 0, min: 0, max: 0, trend: 'stable' };
  }
  
  const byTurn = responses.map(r => calculateTextEntropy(r).shannonEntropy);
  const mean = byTurn.reduce((sum, e) => sum + e, 0) / byTurn.length;
  
  const variance = byTurn.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / byTurn.length;
  const std = Math.sqrt(variance);
  
  const min = Math.min(...byTurn);
  const max = Math.max(...byTurn);
  
  const trend = calculateTrend(byTurn);
  
  return { byTurn, mean, std, min, max, trend };
}

/**
 * Calculate cross-response entropy (diversity across multiple runs)
 * Measures how diverse responses are across different runs of the same prompt
 */
export function calculateCrossResponseEntropy(responses: string[]): number {
  if (responses.length <= 1) return 0;
  
  const allWords: Record<string, number> = {};
  let totalWords = 0;
  
  for (const response of responses) {
    const words = tokenize(response);
    for (const word of words) {
      allWords[word] = (allWords[word] || 0) + 1;
      totalWords++;
    }
  }
  
  if (totalWords === 0) return 0;
  
  const probabilities = Object.values(allWords).map(count => count / totalWords);
  return shannonEntropy(probabilities);
}

// ============ Thinking Token Detection ============

const THINKING_TOKENS = new Set([
  '<think>', '</think>', '<|thinking|>', '<|/thinking|>',
  '<|begin_of_thought|>', '<|end_of_thought|>',
  '<reasoning>', '</reasoning>',
]);

export function isThinkingToken(token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (THINKING_TOKENS.has(normalized)) return true;
  if (/^<\|?(?:think|thinking|thought|reasoning)/.test(normalized)) return true;
  return false;
}

export function findFirstContentTokenIndex(
  logprobs: Array<{ token: string; logprob: number; topAlternatives?: Array<{ token: string; logprob: number }> }>
): number {
  let insideThinkingBlock = false;
  let passedThinkingBlock = false;
  for (let i = 0; i < logprobs.length; i++) {
    const tok = logprobs[i].token.trim().toLowerCase();
    if (tok === '<think>' || tok === '<|thinking|>' || tok === '<|begin_of_thought|>' || tok === '<reasoning>') {
      insideThinkingBlock = true;
      continue;
    }
    if (tok === '</think>' || tok === '<|/thinking|>' || tok === '<|end_of_thought|>' || tok === '</reasoning>') {
      insideThinkingBlock = false;
      passedThinkingBlock = true;
      continue;
    }
    if (isThinkingToken(tok)) continue;
    if (insideThinkingBlock) continue;
    if (passedThinkingBlock && isWhitespaceToken(logprobs[i].token)) continue;
    return i;
  }
  return 0;
}

function isWhitespaceToken(token: string): boolean {
  return /^\s+$/.test(token) || token === '\n' || token === '\r\n' || token === '\t';
}

// ============ Logprobs Entropy Analysis ============

/**
 * Calculate first-token entropy from logprobs
 * High entropy = model uncertainty about how to begin response
 * Skips thinking-preamble tokens (<think>, etc.) to find real first content token
 */
export function calculateFirstTokenEntropy(
  logprobs: Array<{ token: string; logprob: number; topAlternatives?: Array<{ token: string; logprob: number }> }>
): FirstTokenEntropyResult | null {
  if (!logprobs || logprobs.length === 0) return null;
  
  const contentIdx = findFirstContentTokenIndex(logprobs);
  const firstToken = logprobs[contentIdx];
  if (!firstToken) return null;
  const topProb = Math.exp(firstToken.logprob);
  
  const alternatives = firstToken.topAlternatives || [];
  const allProbs = [topProb, ...alternatives.map(a => Math.exp(a.logprob))];
  
  const sum = allProbs.reduce((s, p) => s + p, 0);
  const normalizedProbs = allProbs.map(p => p / sum);
  
  const entropy = shannonEntropy(normalizedProbs);
  const maxEntropy = Math.log2(normalizedProbs.length);
  const isHighEntropy = maxEntropy > 0 && (entropy / maxEntropy) > 0.7;
  
  return {
    entropy,
    topToken: firstToken.token,
    topTokenProbability: topProb,
    alternativeCount: alternatives.length,
    isHighEntropy,
  };
}

/**
 * Detect entropy spikes in token sequence
 * Returns positions where entropy significantly exceeds baseline
 */
export function detectEntropySpikes(
  logprobs: Array<{ token: string; logprob: number; topAlternatives?: Array<{ token: string; logprob: number }> }>,
  threshold: number = 2.0
): Array<{ position: number; token: string; entropy: number; baseline: number }> {
  if (!logprobs || logprobs.length < 5) return [];
  
  const entropies: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < logprobs.length; i++) {
    if (isThinkingToken(logprobs[i].token)) continue;
    const tokenData = logprobs[i];
    const alternatives = tokenData.topAlternatives || [];
    const probs = [Math.exp(tokenData.logprob), ...alternatives.map(a => Math.exp(a.logprob))];
    const sum = probs.reduce((s, p) => s + p, 0);
    const normalizedProbs = probs.map(p => p / sum);
    entropies.push(shannonEntropy(normalizedProbs));
    indices.push(i);
  }

  if (entropies.length < 5) return [];

  const mean = entropies.reduce((s, e) => s + e, 0) / entropies.length;
  const std = Math.sqrt(entropies.reduce((s, e) => s + Math.pow(e - mean, 2), 0) / entropies.length);

  const spikes: Array<{ position: number; token: string; entropy: number; baseline: number }> = [];
  
  for (let i = 0; i < entropies.length; i++) {
    const zScore = std > 0 ? (entropies[i] - mean) / std : 0;
    if (zScore > threshold) {
      spikes.push({
        position: indices[i],
        token: logprobs[indices[i]].token,
        entropy: entropies[i],
        baseline: mean,
      });
    }
  }
  
  return spikes;
}

// ============ Word Frequency Analysis ============

/**
 * Get word frequencies from text
 */
export function getWordFrequencies(words: string[]): Record<string, number> {
  const frequencies: Record<string, number> = {};
  for (const word of words) {
    frequencies[word] = (frequencies[word] || 0) + 1;
  }
  return frequencies;
}

/**
 * Get top N most frequent words
 */
export function getTopWords(text: string, n: number = 20): Array<{ word: string; count: number }> {
  const words = tokenize(text);
  const frequencies = getWordFrequencies(words);
  
  return Object.entries(frequencies)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Aggregate word frequencies across multiple texts
 */
export function aggregateWordFrequencies(texts: string[]): Record<string, number> {
  const combined: Record<string, number> = {};
  
  for (const text of texts) {
    const words = tokenize(text);
    for (const word of words) {
      combined[word] = (combined[word] || 0) + 1;
    }
  }
  
  return combined;
}

// ============ Utilities ============

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
  'there', 'then', 'once', 'if', 'any', 'about', 'into', 'through',
]);

/**
 * Tokenize text into words (lowercase, filtered)
 */
export function tokenize(text: string, removeStopWords: boolean = true): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  if (removeStopWords) {
    return words.filter(word => !STOP_WORDS.has(word));
  }
  
  return words;
}

/**
 * Calculate trend direction from a series of values
 */
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 3) return 'stable';
  
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const threshold = yMean * 0.1;
  
  if (slope > threshold) return 'increasing';
  if (slope < -threshold) return 'decreasing';
  return 'stable';
}
