/**
 * PCA Analysis Module
 * 
 * Reduces high-dimensional embedding vectors to 2D for visualization.
 * Matches the Artificial Hivemind (NeurIPS 2025) methodology.
 */

export interface PCAResult {
  points: PCAPoint[];
  varianceExplained: [number, number];
  clusterTightness: Record<string, number>;
}

export interface PCAPoint {
  x: number;
  y: number;
  modelId: string;
  runIndex: number;
  label: string;
}

/**
 * Simple PCA implementation for 2D projection.
 * Uses power iteration to find the top-2 eigenvectors of the covariance matrix.
 */
export function computePCA(
  embeddings: number[][],
  labels: Array<{ modelId: string; runIndex: number; label: string }>
): PCAResult | null {
  if (embeddings.length < 3 || embeddings[0].length < 2) return null;

  const n = embeddings.length;
  const d = embeddings[0].length;

  const mean = new Array(d).fill(0);
  for (const vec of embeddings) {
    for (let j = 0; j < d; j++) mean[j] += vec[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  const centered = embeddings.map(vec => vec.map((v, j) => v - mean[j]));

  const pc1 = powerIteration(centered, d);
  const deflected = deflate(centered, pc1);
  const pc2 = powerIteration(deflected, d);

  const totalVariance = centered.reduce(
    (sum, vec) => sum + vec.reduce((s, v) => s + v * v, 0),
    0
  );

  const var1 = centered.reduce((sum, vec) => {
    const proj = dot(vec, pc1);
    return sum + proj * proj;
  }, 0);
  const var2 = deflected.reduce((sum, vec) => {
    const proj = dot(vec, pc2);
    return sum + proj * proj;
  }, 0);

  const points: PCAPoint[] = centered.map((vec, i) => ({
    x: dot(vec, pc1),
    y: dot(vec, pc2),
    modelId: labels[i]?.modelId || `unknown-${i}`,
    runIndex: labels[i]?.runIndex || i,
    label: labels[i]?.label || `Point ${i}`,
  }));

  const byModel: Record<string, PCAPoint[]> = {};
  for (const p of points) {
    if (!byModel[p.modelId]) byModel[p.modelId] = [];
    byModel[p.modelId].push(p);
  }

  const clusterTightness: Record<string, number> = {};
  for (const [modelId, pts] of Object.entries(byModel)) {
    if (pts.length < 2) { clusterTightness[modelId] = 0; continue; }
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const avgDist = pts.reduce((s, p) => s + Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2), 0) / pts.length;
    clusterTightness[modelId] = avgDist;
  }

  return {
    points,
    varianceExplained: [
      totalVariance > 0 ? var1 / totalVariance : 0,
      totalVariance > 0 ? var2 / totalVariance : 0,
    ],
    clusterTightness,
  };
}

function powerIteration(data: number[][], d: number, iterations = 50): number[] {
  let vec = Array.from({ length: d }, () => Math.random() - 0.5);
  let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  vec = vec.map(v => v / norm);

  for (let iter = 0; iter < iterations; iter++) {
    const newVec = new Array(d).fill(0);
    for (const row of data) {
      const proj = dot(row, vec);
      for (let j = 0; j < d; j++) newVec[j] += proj * row[j];
    }
    norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
    if (norm === 0) break;
    vec = newVec.map(v => v / norm);
  }

  return vec;
}

function deflate(data: number[][], component: number[]): number[][] {
  return data.map(row => {
    const proj = dot(row, component);
    return row.map((v, j) => v - proj * component[j]);
  });
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
