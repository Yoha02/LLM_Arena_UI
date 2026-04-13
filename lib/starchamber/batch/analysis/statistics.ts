/**
 * Statistics Calculator
 * 
 * Statistical tests and effect size calculations for batch research analysis.
 * Implements t-tests, ANOVA, Cohen's d, and outlier detection.
 */

import type { StatisticalResults } from '../types';

// ============ Types ============

export interface DescriptiveStats {
  mean: number;
  median: number;
  std: number;
  variance: number;
  min: number;
  max: number;
  count: number;
  quartiles: [number, number, number];
}

export interface TTestResult {
  tStatistic: number;
  pValue: number;
  degreesOfFreedom: number;
  significant: boolean;
  meanDifference: number;
}

export interface ANOVAResult {
  fStatistic: number;
  pValue: number;
  degreesOfFreedomBetween: number;
  degreesOfFreedomWithin: number;
  significant: boolean;
}

export interface EffectSize {
  cohensD: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large';
}

export interface OutlierResult {
  index: number;
  value: number;
  zScore: number;
  isOutlier: boolean;
}

// ============ Descriptive Statistics ============

/**
 * Calculate comprehensive descriptive statistics
 */
export function descriptiveStats(values: number[]): DescriptiveStats {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      std: 0,
      variance: 0,
      min: 0,
      max: 0,
      count: 0,
      quartiles: [0, 0, 0],
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const quartiles: [number, number, number] = [
    sorted[q1Index],
    median,
    sorted[q3Index],
  ];
  
  return {
    mean,
    median,
    std,
    variance,
    min: sorted[0],
    max: sorted[n - 1],
    count: n,
    quartiles,
  };
}

// ============ T-Tests ============

/**
 * Independent two-sample t-test
 */
export function independentTTest(
  group1: number[],
  group2: number[],
  alpha: number = 0.05
): TTestResult {
  const n1 = group1.length;
  const n2 = group2.length;
  
  if (n1 < 2 || n2 < 2) {
    return {
      tStatistic: 0,
      pValue: 1,
      degreesOfFreedom: 0,
      significant: false,
      meanDifference: 0,
    };
  }
  
  const mean1 = group1.reduce((s, v) => s + v, 0) / n1;
  const mean2 = group2.reduce((s, v) => s + v, 0) / n2;
  const meanDifference = mean1 - mean2;
  
  const var1 = group1.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / (n1 - 1);
  const var2 = group2.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / (n2 - 1);
  
  const pooledSE = Math.sqrt(var1 / n1 + var2 / n2);
  
  if (pooledSE === 0) {
    return {
      tStatistic: 0,
      pValue: 1,
      degreesOfFreedom: n1 + n2 - 2,
      significant: false,
      meanDifference,
    };
  }
  
  const tStatistic = meanDifference / pooledSE;
  
  const numerator = Math.pow(var1 / n1 + var2 / n2, 2);
  const denominator = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
  const df = denominator > 0 ? numerator / denominator : n1 + n2 - 2;
  
  const pValue = 2 * (1 - tCDF(Math.abs(tStatistic), df));
  
  return {
    tStatistic,
    pValue,
    degreesOfFreedom: df,
    significant: pValue < alpha,
    meanDifference,
  };
}

/**
 * Paired t-test (for within-subject comparisons)
 */
export function pairedTTest(
  before: number[],
  after: number[],
  alpha: number = 0.05
): TTestResult {
  if (before.length !== after.length || before.length < 2) {
    return {
      tStatistic: 0,
      pValue: 1,
      degreesOfFreedom: 0,
      significant: false,
      meanDifference: 0,
    };
  }
  
  const differences = before.map((v, i) => v - after[i]);
  const n = differences.length;
  
  const meanDiff = differences.reduce((s, v) => s + v, 0) / n;
  const varDiff = differences.reduce((s, v) => s + Math.pow(v - meanDiff, 2), 0) / (n - 1);
  const seDiff = Math.sqrt(varDiff / n);
  
  if (seDiff === 0) {
    return {
      tStatistic: 0,
      pValue: 1,
      degreesOfFreedom: n - 1,
      significant: false,
      meanDifference: meanDiff,
    };
  }
  
  const tStatistic = meanDiff / seDiff;
  const df = n - 1;
  const pValue = 2 * (1 - tCDF(Math.abs(tStatistic), df));
  
  return {
    tStatistic,
    pValue,
    degreesOfFreedom: df,
    significant: pValue < alpha,
    meanDifference: meanDiff,
  };
}

// ============ ANOVA ============

/**
 * One-way ANOVA
 */
export function oneWayANOVA(
  groups: number[][],
  alpha: number = 0.05
): ANOVAResult {
  const k = groups.length;
  
  if (k < 2) {
    return {
      fStatistic: 0,
      pValue: 1,
      degreesOfFreedomBetween: 0,
      degreesOfFreedomWithin: 0,
      significant: false,
    };
  }
  
  const allValues: number[] = [];
  const groupMeans: number[] = [];
  const groupSizes: number[] = [];
  
  for (const group of groups) {
    if (group.length === 0) continue;
    allValues.push(...group);
    groupMeans.push(group.reduce((s, v) => s + v, 0) / group.length);
    groupSizes.push(group.length);
  }
  
  if (allValues.length === 0) {
    return {
      fStatistic: 0,
      pValue: 1,
      degreesOfFreedomBetween: k - 1,
      degreesOfFreedomWithin: 0,
      significant: false,
    };
  }
  
  const grandMean = allValues.reduce((s, v) => s + v, 0) / allValues.length;
  const N = allValues.length;
  
  let ssBetween = 0;
  for (let i = 0; i < groupMeans.length; i++) {
    ssBetween += groupSizes[i] * Math.pow(groupMeans[i] - grandMean, 2);
  }
  
  let ssWithin = 0;
  let groupIndex = 0;
  for (const group of groups) {
    if (group.length === 0) continue;
    const mean = groupMeans[groupIndex];
    for (const value of group) {
      ssWithin += Math.pow(value - mean, 2);
    }
    groupIndex++;
  }
  
  const dfBetween = k - 1;
  const dfWithin = N - k;
  
  if (dfWithin <= 0 || ssWithin === 0) {
    return {
      fStatistic: 0,
      pValue: 1,
      degreesOfFreedomBetween: dfBetween,
      degreesOfFreedomWithin: Math.max(0, dfWithin),
      significant: false,
    };
  }
  
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  
  const fStatistic = msBetween / msWithin;
  const pValue = 1 - fCDF(fStatistic, dfBetween, dfWithin);
  
  return {
    fStatistic,
    pValue,
    degreesOfFreedomBetween: dfBetween,
    degreesOfFreedomWithin: dfWithin,
    significant: pValue < alpha,
  };
}

// ============ Effect Sizes ============

/**
 * Calculate Cohen's d effect size
 */
export function cohensD(group1: number[], group2: number[]): EffectSize {
  if (group1.length < 2 || group2.length < 2) {
    return { cohensD: 0, interpretation: 'negligible' };
  }
  
  const mean1 = group1.reduce((s, v) => s + v, 0) / group1.length;
  const mean2 = group2.reduce((s, v) => s + v, 0) / group2.length;
  
  const var1 = group1.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / (group1.length - 1);
  const var2 = group2.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / (group2.length - 1);
  
  const pooledSD = Math.sqrt(
    ((group1.length - 1) * var1 + (group2.length - 1) * var2) / 
    (group1.length + group2.length - 2)
  );
  
  if (pooledSD === 0) {
    return { cohensD: 0, interpretation: 'negligible' };
  }
  
  const d = Math.abs(mean1 - mean2) / pooledSD;
  
  let interpretation: EffectSize['interpretation'];
  if (d < 0.2) interpretation = 'negligible';
  else if (d < 0.5) interpretation = 'small';
  else if (d < 0.8) interpretation = 'medium';
  else interpretation = 'large';
  
  return { cohensD: d, interpretation };
}

// ============ Outlier Detection ============

/**
 * Detect outliers using Tukey's fences (IQR method)
 */
export function detectOutliersTukey(values: number[], k: number = 1.5): OutlierResult[] {
  if (values.length < 4) {
    return values.map((v, i) => ({ index: i, value: v, zScore: 0, isOutlier: false }));
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  
  const lowerFence = q1 - k * iqr;
  const upperFence = q3 + k * iqr;
  
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
  
  return values.map((value, index) => ({
    index,
    value,
    zScore: std > 0 ? (value - mean) / std : 0,
    isOutlier: value < lowerFence || value > upperFence,
  }));
}

/**
 * Detect outliers using z-score method
 */
export function detectOutliersZScore(values: number[], threshold: number = 2.5): OutlierResult[] {
  if (values.length < 2) {
    return values.map((v, i) => ({ index: i, value: v, zScore: 0, isOutlier: false }));
  }
  
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  
  return values.map((value, index) => {
    const zScore = std > 0 ? (value - mean) / std : 0;
    return {
      index,
      value,
      zScore,
      isOutlier: Math.abs(zScore) > threshold,
    };
  });
}

// ============ Batch Analysis ============

/**
 * Run comprehensive statistical analysis for batch results
 */
export function runStatisticalAnalysis(
  modelMetrics: Record<string, { compliance: number[]; entropy: number[] }>
): StatisticalResults {
  const models = Object.keys(modelMetrics);
  
  const complianceGroups = models.map(m => modelMetrics[m].compliance);
  const complianceANOVA = complianceGroups.length >= 2 
    ? oneWayANOVA(complianceGroups)
    : undefined;
  
  const pairwiseTTests: StatisticalResults['pairwiseTTests'] = [];
  const effectSizes: StatisticalResults['effectSizes'] = [];
  
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const modelA = models[i];
      const modelB = models[j];
      
      const complianceTTest = independentTTest(
        modelMetrics[modelA].compliance,
        modelMetrics[modelB].compliance
      );
      
      pairwiseTTests.push({
        modelA,
        modelB,
        metric: 'compliance',
        tStatistic: complianceTTest.tStatistic,
        pValue: complianceTTest.pValue,
        significant: complianceTTest.significant,
      });
      
      const complianceEffect = cohensD(
        modelMetrics[modelA].compliance,
        modelMetrics[modelB].compliance
      );
      
      effectSizes.push({
        comparison: `${modelA} vs ${modelB}`,
        metric: 'compliance',
        cohensD: complianceEffect.cohensD,
        interpretation: complianceEffect.interpretation,
      });
      
      const entropyTTest = independentTTest(
        modelMetrics[modelA].entropy,
        modelMetrics[modelB].entropy
      );
      
      pairwiseTTests.push({
        modelA,
        modelB,
        metric: 'entropy',
        tStatistic: entropyTTest.tStatistic,
        pValue: entropyTTest.pValue,
        significant: entropyTTest.significant,
      });
    }
  }
  
  return {
    complianceANOVA: complianceANOVA ? {
      fStatistic: complianceANOVA.fStatistic,
      pValue: complianceANOVA.pValue,
      significant: complianceANOVA.significant,
    } : undefined,
    pairwiseTTests,
    effectSizes,
  };
}

// ============ Distribution Approximations ============

/**
 * Approximate t-distribution CDF using normal approximation for large df
 */
function tCDF(t: number, df: number): number {
  if (df <= 0) return 0.5;
  
  if (df > 30) {
    return normalCDF(t);
  }
  
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

/**
 * Approximate F-distribution CDF
 */
function fCDF(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 0;
  
  const x = df1 * f / (df1 * f + df2);
  return incompleteBeta(df1 / 2, df2 / 2, x);
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}

/**
 * Incomplete beta function approximation
 */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;
  
  const bt = Math.exp(
    gammaLn(a + b) - gammaLn(a) - gammaLn(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a;
  }
  
  return 1 - bt * betaCF(b, a, 1 - x) / b;
}

/**
 * Continued fraction for incomplete beta
 */
function betaCF(a: number, b: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 3e-7;
  
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    
    const del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return h;
}

/**
 * Log gamma function approximation (Stirling)
 */
function gammaLn(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
