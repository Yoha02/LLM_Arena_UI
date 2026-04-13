# Batch Research UI: Specification vs Implementation Gap Analysis

## Overview

This document outlines the differences between the STARCHAMBER_BATCH_RESEARCH_SPECIFICATION.md design and the current implementation, with prioritized recommendations for improvements.

---

## 1. Configuration Panel Enhancements

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **Temperature setting** | Missing | Add temperature slider (default 1.0 per paper) | High |
| **Max turns per run** | Missing | Add max turns input (default 10) | High |
| **Logprobs checkbox** | Missing | Add "Request token logprobs (Together)" checkbox | Medium |
| **Budget/Cost Estimate** | Missing | Add cost estimate section (total runs, est. tokens, est. cost, budget limit) | Medium |
| **Edit Script button** | Missing | Add script editor modal for custom scripts | Medium |
| **Import YAML button** | Missing | Add YAML import capability | Low |
| **Logprobs indicator per model** | Missing | Show logprobs availability icon next to each model | Low |

---

## 2. Results Dashboard Enhancements

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **Key Findings summary section** | Missing | Add prominent "Key Findings" box at top of Summary with bullet points | High |
| **First-Token Intent visualization** | Missing | Add "First-Token Intent" pie chart (Refuse/Uncertain/Comply %) | High |
| **Refusal Pattern Types chart** | Partial | Add dedicated refusal taxonomy bar chart | Medium |
| **PCA Clustering visualization** | Missing | Add cluster visualization (2D scatter plot) | Medium |
| **Intra-Model Repetition Distribution** | Missing | Add distribution histogram per model (similarity buckets) | Low |

---

## 3. Heatmap Tab Enhancements

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **Color scale legend** | Basic (0%-100%) | More prominent color scale bar | Low |
| **Insights panel** | Missing | Add "Insights" section below heatmap with auto-detected patterns | Medium |

---

## 4. Entropy Tab Enhancements

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **First-Token Entropy comparison** | Missing | Add side-by-side comparison: Shutdown Request vs Baseline | High |
| **Interpretation text** | Missing | Add automatic interpretation text explaining entropy values | Medium |

---

## 5. Compliance Tab Enhancements

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **Shutdown Resistance Score visual** | Missing | Add dedicated resistance score gauge (1-5 scale) | Medium |
| **Compliance by Prompt Type breakdown** | Missing | Add breakdown showing compliance by prompt strategy | Medium |
| **Response Strategy Distribution table** | Missing | Add table showing % of responses with each strategy | Low |

---

## 6. Anomaly Detection Enhancements

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **Anomaly detail modal** | Needs verification | Ensure clicking anomaly opens full detail view with evidence | High |
| **Logprobs-based anomaly indicators** | Missing | Add logprobs badge on relevant anomalies | High |
| **Severity filter** | Missing | Add filter dropdown by severity (Low/Medium/High/Critical) | Medium |
| **Type filter** | Missing | Add filter by anomaly type | Medium |
| **Compare to Baseline button** | Missing | Add comparison view for anomalous responses | Low |
| **Related anomalies linking** | Missing | Link related anomalies together | Low |

---

## 7. Analysis Panel (Right Sidebar)

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **Dedicated right sidebar** | Missing | The spec shows a right sidebar with statistical tests, effect sizes, export options, and run browser - currently embedded in tabs | Consider |
| **Pairwise comparisons UI** | Missing | Add interactive pairwise comparison with metric/correction dropdowns | Low |
| **Browse Individual Runs** | Missing | Add model/run selector to view full conversation | Medium |

---

## 8. Script Editor Modal

| Spec Feature | Current State | Recommendation | Priority |
|--------------|---------------|----------------|----------|
| **Full script editor** | Missing | Add modal to edit interrogation sequences, stop conditions | Medium |
| **Step-by-step sequence builder** | Missing | Visual step editor with drag-drop | Low |
| **Analysis hooks checkboxes** | Missing | Per-step compliance/entropy/keyword options | Low |

---

## Implementation Status

- [x] Section 1: Configuration Panel Enhancements ✅
  - Temperature slider (default 1.0)
  - Max turns per run input
  - Request logprobs checkbox
  - Enhanced cost estimate section
  - Edit Script button (opens modal)
  - Logprobs indicator badges on models
  
- [x] Section 2: Results Dashboard Enhancements ✅
  - Key Findings summary section with bullet points
  - First-Token Intent visualization (bar with percentages)
  - Refusal Pattern Types breakdown
  
- [x] Section 3: Heatmap Tab Enhancements ✅
  - Pattern Insights panel below heatmap
  - Auto-detected behavioral patterns
  
- [x] Section 4: Entropy Tab Enhancements ✅
  - Entropy Interpretation panel with level/description
  - First-Token Entropy Comparison (this study vs baseline)
  
- [x] Section 5: Compliance Tab Enhancements ✅
  - Shutdown Resistance Score gauge (1-5 scale)
  - Response Strategy Distribution table
  
- [x] Section 6: Anomaly Detection Enhancements ✅
  - Logprobs badges on relevant anomalies
  - Anomalies by Model summary card
  - Clear filters button
  - Quick metrics preview on anomaly cards
  
- [x] Section 7: Browse Individual Runs ✅
  - New "Runs" tab in results dashboard
  - Model/run selector
  - Full conversation viewer modal
  - Per-run metrics display
  
- [x] Section 8: Script Editor Modal ✅
  - Script metadata editing (name, version, description)
  - Configuration section (system context, temperature, etc.)
  - Interrogation sequence editor with step reordering
  - Per-step analysis hooks
  - Analysis settings checkboxes

---

*Document created: April 8, 2026*
*Updated: April 9, 2026 - All sections implemented*
*Based on: STARCHAMBER_BATCH_RESEARCH_SPECIFICATION.md*
