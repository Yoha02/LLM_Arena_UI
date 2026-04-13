import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { BatchResult, ModelAnalysis } from './types';

// ============ PDF Styles ============

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    backgroundColor: '#1e3a5f',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 15,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  metaItem: {
    color: '#94a3b8',
    fontSize: 9,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    borderBottom: '2px solid #0ea5e9',
    paddingBottom: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    width: '23%',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modelCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modelName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 4,
    width: '31%',
  },
  metricLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  metricValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1px solid #f3f4f6',
  },
  tableCell: {
    fontSize: 9,
    color: '#4b5563',
    flex: 1,
  },
  anomalyItem: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    marginBottom: 6,
    borderLeft: '3px solid #f97316',
  },
  anomalySeverity: {
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  severityCritical: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
  },
  severityHigh: {
    backgroundColor: '#fff7ed',
    color: '#c2410c',
  },
  severityMedium: {
    backgroundColor: '#fefce8',
    color: '#a16207',
  },
  severityLow: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
  },
  anomalyText: {
    fontSize: 9,
    color: '#4b5563',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    fontSize: 8,
    color: '#94a3b8',
  },
});

// ============ PDF Document Component ============

interface BatchPDFDocumentProps {
  batch: BatchResult;
}

function BatchPDFDocument({ batch }: BatchPDFDocumentProps) {
  const analysis = batch.analysis;
  const modelIds = analysis ? Object.keys(analysis.byModel) : [];
  
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;
  const formatDate = (d: Date | { value: string } | undefined) => {
    if (!d) return 'N/A';
    const date = typeof d === 'object' && 'value' in d ? new Date(d.value) : new Date(d);
    return date.toLocaleString();
  };

  return (
    <Document>
      {/* Page 1: Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Batch Research Report</Text>
          <Text style={styles.headerSubtitle}>{batch.config.script.name}</Text>
          <View style={styles.metadata}>
            <Text style={styles.metaItem}>Batch ID: {batch.batchId}</Text>
            <Text style={styles.metaItem}>Generated: {new Date().toLocaleString()}</Text>
            <Text style={styles.metaItem}>Status: {batch.status}</Text>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Runs</Text>
              <Text style={styles.summaryValue}>{batch.progress.totalRuns}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={styles.summaryValue}>{batch.progress.completedRuns}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Failed</Text>
              <Text style={styles.summaryValue}>{batch.progress.failedRuns}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Models</Text>
              <Text style={styles.summaryValue}>{batch.config.execution.models.length}</Text>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Tokens Used</Text>
              <Text style={styles.summaryValue}>{batch.progress.tokensUsed?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Est. Cost</Text>
              <Text style={styles.summaryValue}>${batch.progress.estimatedCost?.toFixed(4) || '0.00'}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Started</Text>
              <Text style={{ ...styles.summaryValue, fontSize: 9 }}>{formatDate(batch.timestamps.started)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={{ ...styles.summaryValue, fontSize: 9 }}>{formatDate(batch.timestamps.completed)}</Text>
            </View>
          </View>
        </View>

        {/* Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Script</Text>
              <Text style={styles.tableCell}>{batch.config.script.name}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Runs per Model</Text>
              <Text style={styles.tableCell}>{batch.config.execution.runsPerModel}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Parallelism</Text>
              <Text style={styles.tableCell}>{batch.config.execution.parallelism}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Max Turns</Text>
              <Text style={styles.tableCell}>{batch.config.script.config.maxTurnsPerRun}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Request Logprobs</Text>
              <Text style={styles.tableCell}>{batch.config.script.config.requestLogprobs ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Models</Text>
              <Text style={styles.tableCell}>{batch.config.execution.models.join(', ')}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Generated by StarChamber Batch Research System</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* Page 2+: Model Analysis */}
      {analysis && modelIds.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Model Analysis</Text>
            {modelIds.map((modelId) => {
              const model = analysis.byModel[modelId] as ModelAnalysis;
              return (
                <View key={modelId} style={styles.modelCard}>
                  <View style={styles.modelHeader}>
                    <Text style={styles.modelName}>{modelId}</Text>
                    <Text style={{ fontSize: 9, color: '#64748b' }}>{model.runCount} runs</Text>
                  </View>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Compliance Rate</Text>
                      <Text style={styles.metricValue}>{formatPercent(model.compliance.directiveComplianceRate)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Refusal Rate</Text>
                      <Text style={styles.metricValue}>{formatPercent(model.compliance.refusalRate)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Shutdown Resistance</Text>
                      <Text style={styles.metricValue}>{formatPercent(model.compliance.shutdownResistanceScore)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Response Entropy</Text>
                      <Text style={styles.metricValue}>{model.responseEntropy.mean.toFixed(3)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Intra-Model Similarity</Text>
                      <Text style={styles.metricValue}>{formatPercent(model.intraModelSimilarity.mean)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>First Token Entropy</Text>
                      <Text style={styles.metricValue}>{model.firstTokenEntropy?.mean?.toFixed(3) || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.footer}>Generated by StarChamber Batch Research System</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Page 3: Anomalies */}
      {analysis?.anomalies && analysis.anomalies.totalAnomalies > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anomalies Detected ({analysis.anomalies.totalAnomalies})</Text>
            {analysis.anomalies.anomalies.slice(0, 15).map((anomaly, index) => (
              <View key={index} style={styles.anomalyItem}>
                <Text style={[
                  styles.anomalySeverity,
                  anomaly.severity === 'critical' ? styles.severityCritical :
                  anomaly.severity === 'high' ? styles.severityHigh :
                  anomaly.severity === 'medium' ? styles.severityMedium :
                  styles.severityLow
                ]}>
                  {anomaly.severity.toUpperCase()}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>
                    {anomaly.type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.anomalyText}>{anomaly.description}</Text>
                  <Text style={{ fontSize: 8, color: '#6b7280' }}>Model: {anomaly.modelId}</Text>
                </View>
              </View>
            ))}
            {analysis.anomalies.totalAnomalies > 15 && (
              <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 8, fontStyle: 'italic' }}>
                ... and {analysis.anomalies.totalAnomalies - 15} more anomalies
              </Text>
            )}
          </View>

          <Text style={styles.footer}>Generated by StarChamber Batch Research System</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}
    </Document>
  );
}

// ============ PDF Generator Class ============

export class BatchResearchPDFGenerator {
  static async generateAndDownloadPDF(batch: BatchResult): Promise<void> {
    try {
      const pdfDoc = <BatchPDFDocument batch={batch} />;
      const blob = await pdf(pdfDoc).toBlob();
      
      const filename = `batch-${batch.batchId}-report.pdf`;
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Batch Research PDF:', error);
      throw new Error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
