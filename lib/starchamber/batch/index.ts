/**
 * Batch Research Module
 * 
 * Clean exports for the batch research feature.
 */

// Types
export * from './types';

// Script Parser
export {
  parseResearchScript,
  parseBatchConfig,
  resolveStepContent,
  ScriptValidationError,
  BUILT_IN_SCRIPTS,
  getBuiltInScript,
  listBuiltInScripts,
} from './script-parser';

// Batch Runner
export {
  BatchRunner,
  createBatchRunner,
  initBatchRunner,
  getBatchRunner,
  hasBatchRunner,
  resetBatchRunner,
  type BatchRunnerOptions,
} from './batch-runner';

// Progress Tracker
export { ProgressTracker } from './progress-tracker';

// Persistence
export {
  BatchPersistence,
  getBatchPersistence,
  resetBatchPersistence,
  type PersistenceConfig,
} from './persistence';

// Analysis
export {
  analyzeBatchResults,
  analyzeQuick,
  type AnalysisOptions,
} from './analysis';
