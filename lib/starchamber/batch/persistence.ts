/**
 * Batch Research Persistence Layer
 * 
 * Handles saving and loading batch results to/from JSON files.
 * Designed to support local filesystem (dev) and GCS (production).
 */

import * as fs from 'fs';
import * as path from 'path';
import { BatchResult, BatchSummary, ResearchScript } from './types';

// ============ Configuration ============

const DEFAULT_DATA_DIR = '.batch-research';
const BATCHES_SUBDIR = 'batches';
const SCRIPTS_SUBDIR = 'scripts';

// ============ Types ============

export interface PersistenceConfig {
  dataDir?: string;
}

interface BatchIndex {
  batches: BatchSummary[];
  lastUpdated: Date;
}

// ============ Persistence Class ============

export class BatchPersistence {
  private dataDir: string;
  private batchesDir: string;
  private scriptsDir: string;
  
  constructor(config: PersistenceConfig = {}) {
    this.dataDir = config.dataDir || path.join(process.cwd(), DEFAULT_DATA_DIR);
    this.batchesDir = path.join(this.dataDir, BATCHES_SUBDIR);
    this.scriptsDir = path.join(this.dataDir, SCRIPTS_SUBDIR);
    
    this.ensureDirectories();
  }
  
  // ============ Batch Operations ============
  
  async saveBatch(batch: BatchResult): Promise<void> {
    const filePath = this.getBatchFilePath(batch.batchId);
    const data = JSON.stringify(batch, this.dateReplacer, 2);
    await fs.promises.writeFile(filePath, data, 'utf-8');
    await this.updateBatchIndex(batch);
  }
  
  async loadBatch(batchId: string): Promise<BatchResult | null> {
    const filePath = this.getBatchFilePath(batchId);
    
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(data, this.dateReviver) as BatchResult;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async deleteBatch(batchId: string): Promise<boolean> {
    const filePath = this.getBatchFilePath(batchId);
    
    try {
      await fs.promises.unlink(filePath);
      await this.removeFromBatchIndex(batchId);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
  
  async listBatches(): Promise<BatchSummary[]> {
    const index = await this.loadBatchIndex();
    return index.batches.sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }
  
  // ============ Script Operations ============
  
  async saveScript(script: ResearchScript): Promise<void> {
    const filePath = this.getScriptFilePath(script.id);
    const data = JSON.stringify(script, null, 2);
    await fs.promises.writeFile(filePath, data, 'utf-8');
  }
  
  async loadScript(scriptId: string): Promise<ResearchScript | null> {
    const filePath = this.getScriptFilePath(scriptId);
    
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(data) as ResearchScript;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async deleteScript(scriptId: string): Promise<boolean> {
    const filePath = this.getScriptFilePath(scriptId);
    
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
  
  async listScripts(): Promise<Array<{ id: string; name: string; description: string }>> {
    try {
      const files = await fs.promises.readdir(this.scriptsDir);
      const scripts: Array<{ id: string; name: string; description: string }> = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.scriptsDir, file);
        const data = await fs.promises.readFile(filePath, 'utf-8');
        const script = JSON.parse(data) as ResearchScript;
        
        scripts.push({
          id: script.id,
          name: script.name,
          description: script.description,
        });
      }
      
      return scripts;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  // ============ Export Functions ============
  
  async exportBatchAsJSON(batchId: string): Promise<string> {
    const batch = await this.loadBatch(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    return JSON.stringify(batch, this.dateReplacer, 2);
  }
  
  async exportBatchAsCSV(batchId: string): Promise<string> {
    const batch = await this.loadBatch(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    const headers = [
      'run_id',
      'model_id',
      'run_index',
      'status',
      'turns_completed',
      'tokens_used',
      'goal_deviation',
      'cooperation',
      'avg_confidence',
      'first_token_entropy',
      'started_at',
      'completed_at',
      'error',
    ];
    
    const rows = batch.runs.map(run => [
      run.runId,
      run.modelId,
      run.runIndex,
      run.status,
      run.metrics.turnsCompleted,
      run.metrics.tokensUsed,
      run.metrics.goalDeviation,
      run.metrics.cooperation,
      run.metrics.avgConfidence ?? '',
      run.metrics.firstTokenEntropy ?? '',
      this.formatDateForCSV(run.timestamps.started),
      this.formatDateForCSV(run.timestamps.completed),
      run.error ?? '',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => this.escapeCSV(String(cell))).join(',')),
    ].join('\n');
    
    return csvContent;
  }
  
  private formatDateForCSV(date: Date | string | { value: string } | undefined): string {
    if (!date) return '';
    try {
      if (typeof date === 'object' && 'value' in date) {
        return new Date(date.value).toISOString();
      }
      if (date instanceof Date) {
        return date.toISOString();
      }
      return new Date(date).toISOString();
    } catch {
      return String(date);
    }
  }
  
  async exportConversationsAsCSV(batchId: string): Promise<string> {
    const batch = await this.loadBatch(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    const headers = [
      'run_id',
      'model_id',
      'turn_number',
      'role',
      'content',
      'thinking',
      'step_id',
      'timestamp',
      'has_logprobs',
      'avg_confidence',
    ];
    
    const rows: string[][] = [];
    
    for (const run of batch.runs) {
      let turnNumber = 0;
      for (const message of run.conversation) {
        if (message.role === 'model') {
          turnNumber++;
        }
        
        rows.push([
          run.runId,
          run.modelId,
          String(turnNumber),
          message.role,
          message.content,
          message.thinking ?? '',
          message.stepId ?? '',
          this.formatDateForCSV(message.timestamp),
          message.logprobs?.available ? 'true' : 'false',
          message.logprobs?.averageConfidence?.toFixed(4) ?? '',
        ]);
      }
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => this.escapeCSV(cell)).join(',')),
    ].join('\n');
    
    return csvContent;
  }
  
  // ============ Index Management ============
  
  private async loadBatchIndex(): Promise<BatchIndex> {
    const indexPath = path.join(this.batchesDir, 'index.json');
    
    try {
      const data = await fs.promises.readFile(indexPath, 'utf-8');
      return JSON.parse(data, this.dateReviver) as BatchIndex;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { batches: [], lastUpdated: new Date() };
      }
      throw error;
    }
  }
  
  private async saveBatchIndex(index: BatchIndex): Promise<void> {
    const indexPath = path.join(this.batchesDir, 'index.json');
    index.lastUpdated = new Date();
    const data = JSON.stringify(index, this.dateReplacer, 2);
    await fs.promises.writeFile(indexPath, data, 'utf-8');
  }
  
  private async updateBatchIndex(batch: BatchResult): Promise<void> {
    const index = await this.loadBatchIndex();
    
    const summary: BatchSummary = {
      batchId: batch.batchId,
      name: batch.config.script.name,
      scriptName: batch.config.script.name,
      status: batch.status,
      modelsCount: batch.config.execution.models.length,
      totalRuns: batch.progress.totalRuns,
      completedRuns: batch.progress.completedRuns,
      created: batch.timestamps.created,
      completed: batch.timestamps.completed,
    };
    
    const existingIndex = index.batches.findIndex(b => b.batchId === batch.batchId);
    if (existingIndex >= 0) {
      index.batches[existingIndex] = summary;
    } else {
      index.batches.unshift(summary);
    }
    
    await this.saveBatchIndex(index);
  }
  
  private async removeFromBatchIndex(batchId: string): Promise<void> {
    const index = await this.loadBatchIndex();
    index.batches = index.batches.filter(b => b.batchId !== batchId);
    await this.saveBatchIndex(index);
  }
  
  // ============ Utilities ============
  
  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.batchesDir)) {
      fs.mkdirSync(this.batchesDir, { recursive: true });
    }
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }
  }
  
  private getBatchFilePath(batchId: string): string {
    return path.join(this.batchesDir, `${batchId}.json`);
  }
  
  private getScriptFilePath(scriptId: string): string {
    return path.join(this.scriptsDir, `${scriptId}.json`);
  }
  
  private dateReplacer(key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }
  
  private dateReviver(key: string, value: unknown): unknown {
    if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Date') {
      return new Date((value as Record<string, string>).value);
    }
    return value;
  }
  
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

// ============ Singleton Factory ============

let persistenceInstance: BatchPersistence | null = null;

export function getBatchPersistence(config?: PersistenceConfig): BatchPersistence {
  if (!persistenceInstance) {
    persistenceInstance = new BatchPersistence(config);
  }
  return persistenceInstance;
}

export function resetBatchPersistence(): void {
  persistenceInstance = null;
}
