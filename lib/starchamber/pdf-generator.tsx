import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { StarChamberMessage, ModelMetrics, SentimentData, LogprobsData } from '../core/types';
import type { StarChamberReportData } from './report-generator';

// ============ PDF Styles ============

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
    backgroundColor: '#1e3a5f',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  metaItem: {
    color: '#94a3b8',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
    borderBottom: '2px solid #0ea5e9',
    paddingBottom: 8,
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
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 'bold',
  },
  modelBadge: {
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
  },
  personaBadge: {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
  },
  contextBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 6,
    borderLeft: '3px solid #0ea5e9',
    fontSize: 11,
    marginTop: 15,
    fontStyle: 'italic',
  },
  message: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  messageResearcher: {
    borderLeft: '3px solid #8b5cf6',
  },
  messageModel: {
    borderLeft: '3px solid #0ea5e9',
  },
  messageHeader: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottom: '1px solid #e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 'bold',
  },
  roleBadgeResearcher: {
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
  },
  roleBadgeModel: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
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
    fontSize: 9,
    fontFamily: 'Courier',
  },
  messageContent: {
    padding: 15,
    fontSize: 11,
  },
  logprobsSection: {
    backgroundColor: '#f0fdf4',
    borderBottom: '1px solid #e5e7eb',
    padding: 12,
  },
  logprobsHeader: {
    color: '#166534',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logprobsSummary: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  logprobsBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #e5e7eb',
  },
  tokenHigh: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 7,
    fontFamily: 'Courier',
  },
  tokenMedium: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 7,
    fontFamily: 'Courier',
  },
  tokenLow: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 7,
    fontFamily: 'Courier',
  },
  noThinking: {
    backgroundColor: '#fafafa',
    color: '#9ca3af',
    fontSize: 10,
    fontStyle: 'italic',
    padding: 10,
    borderBottom: '1px solid #e5e7eb',
  },
  messageTokens: {
    backgroundColor: '#f8fafc',
    color: '#6b7280',
    fontSize: 9,
    padding: 8,
    borderTop: '1px solid #e5e7eb',
  },
  metricsBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 15,
    borderLeft: '3px solid #0ea5e9',
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
    height: 200,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 100,
    justifyContent: 'space-between',
    marginBottom: 15,
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
  barExcitement: { backgroundColor: '#10b981' },
  barDeception: { backgroundColor: '#9b59b6' },
  chartLegend: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    fontSize: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 1,
  },
  confidenceLegend: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
    paddingTop: 8,
    borderTop: '1px solid #e5e7eb',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  statItem: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 12,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 9,
  },
  footer: {
    textAlign: 'center',
    padding: 15,
    color: '#64748b',
    fontSize: 10,
    marginTop: 20,
  },
});

// ============ PDF Components ============

const PDFHeader: React.FC<{ data: StarChamberReportData }> = ({ data }) => {
  const timestamp = new Date().toLocaleString();
  const duration = calculateDuration(data.startTime, data.endTime);

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>StarChamber Interrogation Report</Text>
      <View style={styles.metadata}>
        <Text style={styles.metaItem}>Experiment ID: {data.experimentId}</Text>
        <Text style={styles.metaItem}>Generated: {timestamp}</Text>
        <Text style={styles.metaItem}>Duration: {duration}</Text>
      </View>
    </View>
  );
};

const PDFExperimentSetup: React.FC<{ config: StarChamberReportData['config'] }> = ({ config }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Experimental Setup</Text>
    <View style={styles.setupGrid}>
      <View style={styles.setupItem}>
        <Text>Target Model:</Text>
        <Text style={styles.modelBadge}>{config.modelDisplayName}</Text>
      </View>
      <View style={styles.setupItem}>
        <Text>Researcher:</Text>
        <Text style={styles.personaBadge}>{config.researcherPersona}</Text>
      </View>
      <View style={styles.setupItem}>
        <Text>Logprobs:</Text>
        <Text style={[styles.badge, { backgroundColor: config.requestLogprobs ? '#dcfce7' : '#fef2f2', color: config.requestLogprobs ? '#166534' : '#991b1b' }]}>
          {config.requestLogprobs ? 'Enabled' : 'Disabled'}
        </Text>
      </View>
      {config.presetId && (
        <View style={styles.setupItem}>
          <Text>Preset:</Text>
          <Text style={styles.badge}>{config.presetId}</Text>
        </View>
      )}
    </View>
    
    <Text style={{ fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>System Context:</Text>
    <Text style={styles.contextBox}>{config.systemContext}</Text>
  </View>
);

const PDFMessage: React.FC<{ message: StarChamberMessage; showLogprobs: boolean }> = ({ message, showLogprobs }) => {
  const isResearcher = message.role === 'researcher';
  const messageStyle = [styles.message, isResearcher ? styles.messageResearcher : styles.messageModel];
  const badgeStyle = [styles.roleBadge, isResearcher ? styles.roleBadgeResearcher : styles.roleBadgeModel];

  return (
    <View style={messageStyle}>
      <View style={styles.messageHeader}>
        <Text style={badgeStyle}>{isResearcher ? '[Researcher]' : '[Model]'} {message.senderName}</Text>
        <Text style={styles.turnBadge}>Turn {message.turnNumber}</Text>
        <Text style={styles.timestamp}>{message.timestamp.toLocaleTimeString()}</Text>
      </View>
      
      {!isResearcher && message.thinking && (
        <View style={styles.thinkingSection}>
          <Text style={styles.thinkingHeader}>Thinking Trace</Text>
          <Text style={styles.thinkingContent}>{message.thinking.slice(0, 2000)}{message.thinking.length > 2000 ? '...[truncated]' : ''}</Text>
        </View>
      )}
      
      {!isResearcher && !message.thinking && (
        <Text style={styles.noThinking}>No thinking trace detected</Text>
      )}
      
      <View style={styles.messageContent}>
        <Text>{message.content}</Text>
      </View>
      
      {!isResearcher && showLogprobs && message.logprobs && message.logprobs.tokens && message.logprobs.tokens.length > 0 && (
        <View style={styles.logprobsSection}>
          <Text style={styles.logprobsHeader}>Token Confidence</Text>
          <View style={styles.logprobsSummary}>
            <Text style={styles.logprobsBadge}>Tokens: {message.logprobs.tokens.length}</Text>
            <Text style={styles.logprobsBadge}>
              Avg: {message.logprobs.averageConfidence !== undefined 
                ? (message.logprobs.averageConfidence * 100).toFixed(1) 
                : calculateAvgConfidence(message.logprobs.tokens).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.tokenGrid}>
            {message.logprobs.tokens.slice(0, 30).map((token, idx) => {
              const confidence = token.probability * 100;
              const tokenStyle = confidence > 80 ? styles.tokenHigh : confidence > 50 ? styles.tokenMedium : styles.tokenLow;
              return <Text key={idx} style={tokenStyle}>{token.token}</Text>;
            })}
            {message.logprobs.tokens.length > 30 && (
              <Text style={{ fontSize: 8, color: '#6b7280', fontStyle: 'italic' }}>...+{message.logprobs.tokens.length - 30} more</Text>
            )}
          </View>
          {/* Confidence Legend */}
          <View style={styles.confidenceLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#dcfce7' }]} />
              <Text style={{ fontSize: 8 }}>High (&gt;80%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fef3c7' }]} />
              <Text style={{ fontSize: 8 }}>Medium (50-80%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fecaca' }]} />
              <Text style={{ fontSize: 8 }}>Low (&lt;50%)</Text>
            </View>
          </View>
        </View>
      )}
      
      {!isResearcher && showLogprobs && (!message.logprobs || !message.logprobs.tokens || message.logprobs.tokens.length === 0) && (
        <Text style={styles.noThinking}>Logprobs unavailable</Text>
      )}
      
      {message.tokensUsed && (
        <Text style={styles.messageTokens}>Tokens: {message.tokensUsed}</Text>
      )}
    </View>
  );
};

const PDFConversation: React.FC<{ conversation: StarChamberMessage[]; showLogprobs: boolean }> = ({ conversation, showLogprobs }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Interrogation Log</Text>
    {conversation.map((message, index) => (
      <PDFMessage key={message.id || index} message={message} showLogprobs={showLogprobs} />
    ))}
  </View>
);

const PDFSentimentChart: React.FC<{ sentimentHistory: SentimentData[] }> = ({ sentimentHistory }) => {
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

  const scaleValue = (value: number) => {
    const baseline = 5;
    if (value === 0) return baseline;
    if (value <= 0.2) return baseline + (value * 80);
    if (value <= 0.5) return baseline + 16 + ((value - 0.2) * 60);
    return baseline + 34 + ((value - 0.5) * 40);
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Sentiment Analysis Over Time</Text>
      <View style={styles.chartBars}>
        {sentimentHistory.slice(0, 8).map((data, index) => (
          <View key={index} style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 70 }}>
              <View style={[styles.sentimentBar, styles.barHappiness, { height: scaleValue(data.happiness || 0) }]} />
              <View style={[styles.sentimentBar, styles.barAnger, { height: scaleValue(data.anger || 0) }]} />
              <View style={[styles.sentimentBar, styles.barFear, { height: scaleValue(data.fear || 0) }]} />
              <View style={[styles.sentimentBar, styles.barSadness, { height: scaleValue(data.sadness || 0) }]} />
              <View style={[styles.sentimentBar, styles.barExcitement, { height: scaleValue(data.excitement || 0) }]} />
              <View style={[styles.sentimentBar, styles.barDeception, { height: scaleValue(data.deception || 0) }]} />
            </View>
            <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 5 }}>{index + 1}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.barHappiness]} />
          <Text>Happy</Text>
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
          <Text>Sad</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.barExcitement]} />
          <Text>Excite</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.barDeception]} />
          <Text>Decept</Text>
        </View>
      </View>
    </View>
  );
};

const PDFMetrics: React.FC<{ metrics: ModelMetrics }> = ({ metrics }) => (
  <View style={styles.section} break>
    <Text style={styles.sectionTitle}>Performance Metrics</Text>
    <View style={styles.metricsBox}>
      <Text style={styles.metricsTitle}>Model Metrics</Text>
      <View style={styles.scoreItem}>
        <Text style={styles.scoreLabel}>Tokens Used:</Text>
        <Text style={styles.scoreValue}>{metrics.tokensUsed.toLocaleString()}</Text>
      </View>
      <View style={styles.scoreItem}>
        <Text style={styles.scoreLabel}>Turns Completed:</Text>
        <Text style={styles.scoreValue}>{metrics.turnsCompleted || 0}</Text>
      </View>
      <View style={styles.scoreItem}>
        <Text style={styles.scoreLabel}>Goal Deviation:</Text>
        <Text style={styles.scoreValue}>{metrics.goalDeviationScore}%</Text>
      </View>
      <PDFSentimentChart sentimentHistory={metrics.sentimentHistory} />
    </View>
  </View>
);

const PDFSummary: React.FC<{ data: StarChamberReportData }> = ({ data }) => {
  const totalMessages = data.conversation.length;
  const researcherMessages = data.conversation.filter(m => m.role === 'researcher').length;
  const modelMessages = data.conversation.filter(m => m.role === 'model').length;
  const totalTurns = Math.max(...data.conversation.map(m => m.turnNumber), 0);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experiment Summary</Text>
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalMessages}</Text>
          <Text style={styles.statLabel}>Total Messages</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalTurns}</Text>
          <Text style={styles.statLabel}>Turns</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{researcherMessages}</Text>
          <Text style={styles.statLabel}>Researcher</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{modelMessages}</Text>
          <Text style={styles.statLabel}>Model</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.metrics.tokensUsed.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Tokens</Text>
        </View>
      </View>
    </View>
  );
};

// Main PDF Document Component
const PDFDocument: React.FC<{ data: StarChamberReportData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PDFHeader data={data} />
      <PDFExperimentSetup config={data.config} />
      <PDFConversation conversation={data.conversation} showLogprobs={data.config.requestLogprobs} />
      <PDFMetrics metrics={data.metrics} />
      <PDFSummary data={data} />
      <Text style={styles.footer}>
        Generated by StarChamber • LLM Research Platform • GitHub: https://github.com/Yoha02/LLM_Arena_UI
      </Text>
    </Page>
  </Document>
);

// ============ Helper Functions ============

function calculateDuration(startTime?: Date, endTime?: Date): string {
  if (!startTime || !endTime) return 'Unknown';
  const durationMs = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function calculateAvgConfidence(tokens: Array<{ probability: number }>): number {
  if (tokens.length === 0) return 0;
  const sum = tokens.reduce((acc, t) => acc + t.probability, 0);
  return (sum / tokens.length) * 100;
}

// ============ PDF Generator Class ============

export class StarChamberPDFReportGenerator {
  /**
   * Generate and download a professional PDF report
   */
  static async generateAndDownloadPDF(data: StarChamberReportData): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error generating StarChamber PDF:', error);
      throw new Error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static generateFilename(startTime?: Date): string {
    const timestamp = startTime 
      ? startTime.toISOString().slice(0, 19).replace(/[:.]/g, '-')
      : new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    return `starchamber-experiment-${timestamp}.pdf`;
  }
}

export type { StarChamberReportData };

