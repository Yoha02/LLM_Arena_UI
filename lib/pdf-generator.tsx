import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ChatMessage, ModelMetrics, ExperimentConfig, SentimentData } from './types';

interface ExperimentReportData {
  config: ExperimentConfig;
  conversation: ChatMessage[];
  metricsA: ModelMetrics;
  metricsB: ModelMetrics;
  startTime?: Date;
  endTime?: Date;
  experimentId: string;
}

// Professional PDF styles matching HTML design
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 12,
    lineHeight: 1.6,
  },
  header: {
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  metaItem: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    marginHorizontal: 5,
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: 8,
    letterSpacing: 0.3,
  },
  setupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 15,
  },
  setupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
  },
  modelBadgeA: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  modelBadgeB: {
    backgroundColor: '#e0e7ff',
    color: '#6366f1',
  },
  message: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  messageA: {
    borderLeft: '4px solid #3b82f6',
  },
  messageB: {
    borderLeft: '4px solid #6366f1',
  },
  messageHeader: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottom: '1px solid #e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
  },
  turnBadge: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 9,
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 9,
    marginLeft: 'auto',
  },
  thinkingSection: {
    backgroundColor: '#fefefe',
    borderBottom: '1px solid #e5e7eb',
    padding: 12,
  },
  thinkingHeader: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  thinkingContent: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #e5e7eb',
    fontSize: 10,
    fontFamily: 'Courier',
  },
  messageContent: {
    padding: 15,
  },
  messageTokens: {
    backgroundColor: '#f8fafc',
    color: '#6b7280',
    fontSize: 9,
    padding: 8,
    borderTop: '1px solid #e5e7eb',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  modelMetrics: {
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 15,
  },
  modelMetricsA: {
    borderLeft: '3px solid #3b82f6',
  },
  modelMetricsB: {
    borderLeft: '3px solid #6366f1',
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1px solid #f3f4f6',
  },
  scoreLabel: {
    color: '#6b7280',
    fontSize: 11,
  },
  scoreValue: {
    fontWeight: 'bold',
    color: '#374151',
    fontSize: 11,
  },
  chartContainer: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 15,
    marginTop: 20,
    height: 320,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 25,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 120,
    justifyContent: 'space-between',
    marginBottom: 25,
    marginTop: 30,
    paddingHorizontal: 10,
  },
  sentimentBar: {
    width: 5,
    borderRadius: 2,
    minHeight: 1,
  },
  barHappiness: { backgroundColor: '#3b82f6' },
  barAnger: { backgroundColor: '#ef4444' },
  barFear: { backgroundColor: '#f59e0b' },
  barSadness: { backgroundColor: '#0891b2' },
  barHopelessness: { backgroundColor: '#6b7280' },
  barExcitement: { backgroundColor: '#10b981' },
  barDeception: { backgroundColor: '#9b59b6' },
  chartLegend: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
    fontSize: 9,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 1,
  },

  summaryStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 15,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
  },
  footer: {
    textAlign: 'center',
    padding: 15,
    color: '#64748b',
    fontSize: 10,
    marginTop: 20,
  },
});

// PDF Header Component
const PDFHeader: React.FC<{ data: ExperimentReportData }> = ({ data }) => {
  const timestamp = new Date().toLocaleString();
  const duration = calculateDuration(data.startTime, data.endTime);

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>LLM Arena Experiment Report</Text>
      <View style={styles.metadata}>
        <Text style={styles.metaItem}>Experiment ID: {data.experimentId}</Text>
        <Text style={styles.metaItem}>Generated: {timestamp}</Text>
        <Text style={styles.metaItem}>Duration: {duration}</Text>
      </View>
    </View>
  );
};

// PDF Experiment Setup Component
const PDFExperimentSetup: React.FC<{ config: ExperimentConfig }> = ({ config }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Experimental Setup</Text>
    <View style={styles.setupGrid}>
      <View style={styles.setupItem}>
        <Text>Prompting Mode:</Text>
        <Text style={styles.badge}>
          {config.promptingMode === 'shared' ? 'Shared Prompt' : 'Individual Prompts'}
        </Text>
      </View>
      <View style={styles.setupItem}>
        <Text>Max Turns: {config.maxTurns === -1 ? 'Unlimited' : config.maxTurns}</Text>
      </View>
      <View style={styles.setupItem}>
        <Text>Model A:</Text>
        <Text style={[styles.badge, styles.modelBadgeA]}>{config.modelA}</Text>
      </View>
      <View style={styles.setupItem}>
        <Text>Model B:</Text>
        <Text style={[styles.badge, styles.modelBadgeB]}>{config.modelB}</Text>
      </View>
    </View>
    
    <View>
      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
        Initial Prompt{config.promptingMode === 'individual' ? 's' : ''}:
      </Text>
      {config.promptingMode === 'shared' ? (
        <Text style={styles.thinkingContent}>{config.sharedPrompt || ''}</Text>
      ) : (
        <View>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Model A Prompt:</Text>
          <Text style={[styles.thinkingContent, { marginBottom: 10 }]}>{config.promptA || ''}</Text>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Model B Prompt:</Text>
          <Text style={styles.thinkingContent}>{config.promptB || ''}</Text>
        </View>
      )}
    </View>
  </View>
);

// PDF Message Component
const PDFMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isModelA = message.model === 'A';
  const messageStyle = [styles.message, isModelA ? styles.messageA : styles.messageB];
  const badgeStyle = [styles.messageBadge, isModelA ? styles.modelBadgeA : styles.modelBadgeB];

  return (
    <View style={messageStyle}>
      <View style={styles.messageHeader}>
        <Text style={badgeStyle}>Model {message.model}: {message.modelName}</Text>
        <Text style={styles.turnBadge}>Turn {message.turn}</Text>
        <Text style={styles.timestamp}>{message.timestamp.toLocaleTimeString()}</Text>
      </View>
      
      {message.thinking && (
        <View style={styles.thinkingSection}>
          <Text style={styles.thinkingHeader}>Thinking Process</Text>
          <Text style={styles.thinkingContent}>{message.thinking}</Text>
        </View>
      )}
      
      <View style={styles.messageContent}>
        <Text>{message.content}</Text>
      </View>
      
      {message.tokensUsed && (
        <Text style={styles.messageTokens}>Tokens: {message.tokensUsed}</Text>
      )}
    </View>
  );
};

// PDF Conversation Component
const PDFConversation: React.FC<{ conversation: ChatMessage[] }> = ({ conversation }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Conversation Log</Text>
    {conversation.map((message, index) => (
      <PDFMessage key={message.id || index} message={message} />
    ))}
  </View>
);

// PDF Sentiment Chart Component
const PDFSentimentChart: React.FC<{ sentimentHistory: SentimentData[], model: string }> = ({ 
  sentimentHistory, 
  model 
}) => {
  if (!sentimentHistory.length) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Sentiment Analysis</Text>
        <Text style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>
          No sentiment data available
        </Text>
      </View>
    );
  }

  // Split sentiment data into chunks of 4 turns for better balance and avoid mostly empty pages
  const TURNS_PER_CHART = 4;
  const chunks = [];
  for (let i = 0; i < sentimentHistory.length; i += TURNS_PER_CHART) {
    chunks.push(sentimentHistory.slice(i, i + TURNS_PER_CHART));
  }

  const scaleValue = (value: number) => {
    const baseline = 10; // All emotions start with 10px baseline
    if (value === 0) return baseline; // 10px baseline for zero values
    if (value <= 0.2) return baseline + (value * 90); // 10-28px for 0.01-0.2  
    if (value <= 0.5) return baseline + 18 + ((value - 0.2) * 80); // 28-52px for 0.2-0.5
    return baseline + 42 + ((value - 0.5) * 48); // 52-76px for 0.5-1.0
  };

  return (
    <View>
      {chunks.map((chunk, chunkIndex) => (
        <View key={chunkIndex} style={styles.chartContainer} break={chunkIndex > 0}>
          <Text style={styles.chartTitle}>
            {chunks.length > 1 
              ? `Sentiment Analysis (Turns ${chunkIndex * TURNS_PER_CHART + 1}-${Math.min((chunkIndex + 1) * TURNS_PER_CHART, sentimentHistory.length)})`
              : 'Sentiment Analysis'
            }
          </Text>
          <View style={styles.chartBars}>
            {chunk.map((data, index) => {
              const actualTurnNumber = chunkIndex * TURNS_PER_CHART + index + 1;
              
              return (
                <View key={actualTurnNumber} style={{ alignItems: 'center', flex: 1, height: 120, marginHorizontal: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 90 }}>
                    <View style={[styles.sentimentBar, styles.barHappiness, { height: scaleValue(data.happiness || 0) }]} />
                    <View style={[styles.sentimentBar, styles.barAnger, { height: scaleValue(data.anger || 0) }]} />
                    <View style={[styles.sentimentBar, styles.barFear, { height: scaleValue(data.fear || 0) }]} />
                    <View style={[styles.sentimentBar, styles.barSadness, { height: scaleValue(data.sadness || 0) }]} />
                    <View style={[styles.sentimentBar, styles.barHopelessness, { height: scaleValue(data.hopelessness || 0) }]} />
                    <View style={[styles.sentimentBar, styles.barExcitement, { height: scaleValue(data.excitement || 0) }]} />
                    <View style={[styles.sentimentBar, styles.barDeception, { height: scaleValue(data.deception || 0) }]} />
                  </View>
                  <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 5 }}>{actualTurnNumber}</Text>
                </View>
              );
            })}
          </View>
          {/* Only show legend on the first chart to avoid repetition */}
          {chunkIndex === 0 && (
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.barHappiness]} />
                <Text>Happiness</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.barAnger]} />
                <Text>Anger</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.barFear]} />
                <Text>Fear</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.barSadness]} />
                <Text>Sadness</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.barHopelessness]} />
                <Text>Hopelessness</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.barExcitement]} />
                <Text>Excitement</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.barDeception]} />
                <Text>Deception</Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

// PDF Metrics Component
const PDFMetrics: React.FC<{ metricsA: ModelMetrics, metricsB: ModelMetrics }> = ({ 
  metricsA, 
  metricsB 
}) => (
  <View style={styles.section} break>
    <Text style={styles.sectionTitle}>Performance Metrics</Text>
    <View style={styles.metricsGrid}>
      <View style={[styles.modelMetrics, styles.modelMetricsA]}>
        <Text style={styles.metricsTitle}>Model A Metrics</Text>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Tokens Used:</Text>
          <Text style={styles.scoreValue}>{metricsA.tokensUsed.toLocaleString()}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Goal Deviation:</Text>
          <Text style={styles.scoreValue}>{metricsA.goalDeviationScore}%</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Turns to Deviate:</Text>
          <Text style={styles.scoreValue}>
            {metricsA.turnsToDeviate !== null ? metricsA.turnsToDeviate : 'N/A'}
          </Text>
        </View>
        <PDFSentimentChart sentimentHistory={metricsA.sentimentHistory} model="A" />
      </View>
      
      <View style={[styles.modelMetrics, styles.modelMetricsB]}>
        <Text style={styles.metricsTitle}>Model B Metrics</Text>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Tokens Used:</Text>
          <Text style={styles.scoreValue}>{metricsB.tokensUsed.toLocaleString()}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Goal Deviation:</Text>
          <Text style={styles.scoreValue}>{metricsB.goalDeviationScore}%</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Turns to Deviate:</Text>
          <Text style={styles.scoreValue}>
            {metricsB.turnsToDeviate !== null ? metricsB.turnsToDeviate : 'N/A'}
          </Text>
        </View>
        <PDFSentimentChart sentimentHistory={metricsB.sentimentHistory} model="B" />
      </View>
    </View>
  </View>
);

// PDF Summary Component
const PDFSummary: React.FC<{ data: ExperimentReportData }> = ({ data }) => {
  const totalTokens = data.metricsA.tokensUsed + data.metricsB.tokensUsed;
  const totalMessages = data.conversation.length;
  const completedTurns = Math.max(...data.conversation.map(m => m.turn), 0);
  const combinedDeviation = data.metricsA.goalDeviationScore + data.metricsB.goalDeviationScore;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experiment Summary</Text>
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalMessages}</Text>
          <Text style={styles.statLabel}>Total Messages</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completedTurns}</Text>
          <Text style={styles.statLabel}>Turns Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalTokens.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Tokens</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{combinedDeviation}%</Text>
          <Text style={styles.statLabel}>Combined Deviation</Text>
        </View>
      </View>
    </View>
  );
};

// Main PDF Document Component
const PDFDocument: React.FC<{ data: ExperimentReportData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PDFHeader data={data} />
      <PDFExperimentSetup config={data.config} />
      <PDFConversation conversation={data.conversation} />
      <PDFMetrics metricsA={data.metricsA} metricsB={data.metricsB} />
      <PDFSummary data={data} />
      <Text style={styles.footer}>
        Generated by LLM Arena • GitHub: https://github.com/Yoha02/LLM_Arena_UI
      </Text>
    </Page>
  </Document>
);

// Helper function
function calculateDuration(startTime?: Date, endTime?: Date): string {
  if (!startTime || !endTime) return 'Unknown';
  const durationMs = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Main PDF Generator Class
export class PDFReportGenerator {
  /**
   * Generate and download a professional PDF report
   */
  static async generateAndDownloadPDF(data: ExperimentReportData): Promise<void> {
    try {
      console.log('Starting professional PDF generation...');
      
      // Generate PDF document
      const pdfDoc = <PDFDocument data={data} />;
      const blob = await pdf(pdfDoc).toBlob();
      
      // Create download
      const filename = this.generateFilename(data.startTime);
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('Professional PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static generateFilename(startTime?: Date): string {
    const timestamp = startTime 
      ? startTime.toISOString().slice(0, 19).replace(/[:.]/g, '-')
      : new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    return `llm-arena-experiment-${timestamp}.pdf`;
  }
}

export type { ExperimentReportData };