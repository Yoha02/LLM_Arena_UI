# LLM Arena - Complete Architecture Reference

> **Last Updated:** January 2026  
> **Platform:** Inter-LLM Interaction Observer for AI Research

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [UI Layout & Components](#4-ui-layout--components)
5. [Core Data Types](#5-core-data-types)
6. [Experiment Flow](#6-experiment-flow)
7. [Models Used](#7-models-used)
8. [Judge Evaluation System](#8-judge-evaluation-system)
9. [Content Filtering System](#9-content-filtering-system)
10. [REST API Endpoints](#10-rest-api-endpoints)
11. [WebSocket Communication](#11-websocket-communication)
12. [State Management](#12-state-management)
13. [Report Generation](#13-report-generation)
14. [Architecture Diagram](#14-architecture-diagram)

---

## 1. Project Overview

The **LLM Arena** is a sophisticated web-based research platform designed to study behavioral patterns, cooperation, and competition between autonomous Large Language Models. 

### Key Features
- **Dual Model Conversations**: Two LLMs interact with each other based on given scenarios
- **Real-time Streaming**: Live WebSocket updates as models generate responses
- **AI-Powered Judging**: GPT-4o Mini evaluates each turn for sentiment, cooperation, and goal deviation
- **Content Filtering**: Ensures fair experiments by removing internal reasoning before sending to other model
- **Manual & Automatic Modes**: Full control over experiment flow or hands-off automation
- **Comprehensive Reporting**: HTML and PDF exports with full conversation logs and analytics

### Research Applications
- Behavioral strategy analysis (cooperation vs. competition)
- Goal adherence research (susceptibility to persuasion)
- Sentiment analysis as proxy for strategic intent
- Multi-agent AI research (emergent behaviors)
- Judge LLM evaluation effectiveness

---

## 2. Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type-safe development |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Reusable UI components |
| Recharts | Sentiment analysis charts |
| Socket.IO Client | Real-time WebSocket communication |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Custom HTTP server |
| Socket.IO | WebSocket server |
| OpenRouter API | Unified LLM provider access |

### Key Libraries
- `socket.io` / `socket.io-client` - Real-time communication
- `recharts` - Data visualization
- `lucide-react` - Icons
- `@radix-ui/*` - Accessible UI primitives

---

## 3. Project Structure

```
LLM_Arena_UI/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main UI orchestrator
│   ├── layout.tsx                # App layout wrapper
│   ├── globals.css               # Global styles
│   └── api/                      # Backend API routes
│       ├── experiment/
│       │   ├── start/route.ts    # Start experiment
│       │   ├── stop/route.ts     # Stop experiment
│       │   ├── manual-continue/route.ts  # Manual mode continue
│       │   ├── next-turn/route.ts        # Start next turn
│       │   ├── status/route.ts   # Get experiment status
│       │   └── turn/route.ts     # Turn management
│       ├── models/route.ts       # Available models list
│       ├── health/route.ts       # Health check
│       └── websocket/route.ts    # WebSocket utilities
│
├── components/                   # React components
│   ├── chat-message.tsx          # Individual message display
│   ├── control-panel.tsx         # Model A/B control panels
│   ├── conversation-log.tsx      # Chat display + manual controls
│   ├── experiment-setup.tsx      # Experiment configuration
│   ├── metrics-dashboard.tsx     # Sentiment charts + scores
│   ├── demo-scenarios.tsx        # Pre-built demo scenarios
│   ├── header.tsx                # App header
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── select.tsx
│       ├── textarea.tsx
│       ├── scroll-area.tsx
│       ├── collapsible.tsx
│       ├── download-button.tsx
│       └── ... (40+ UI components)
│
├── lib/                          # Core business logic
│   ├── types.ts                  # TypeScript interfaces
│   ├── experiment-manager.ts     # Experiment orchestration (Singleton)
│   ├── judge-evaluator.ts        # AI judge analysis
│   ├── content-filter.ts         # Response filtering
│   ├── openrouter.ts             # OpenRouter API wrapper
│   ├── thinking-extractor.ts     # Extract reasoning traces
│   ├── websocket-manager.ts      # WebSocket event emission
│   ├── report-generator.ts       # HTML report generation
│   ├── pdf-generator.tsx         # PDF report generation
│   └── utils.ts                  # Utility functions
│
├── hooks/                        # React hooks
│   ├── useWebSocket.ts           # WebSocket connection hook
│   ├── use-mobile.tsx            # Mobile detection
│   └── use-toast.ts              # Toast notifications
│
├── server.js                     # Custom Next.js server with Socket.IO
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## 4. UI Layout & Components

### Three-Column Layout

```
┌─────────────────┬──────────────────────┬─────────────────┐
│  Model A Panel  │   Experiment Setup   │  Model B Panel  │
│                 │                      │                 │
│  - Model Select │  - Experiment Mode   │  - Model Select │
│  - API Key      │  - Prompting Mode    │  - API Key      │
│  - Interventions│  - Prompt Textarea   │  - Interventions│
│                 │  - Max Turns         │                 │
│                 │  - Start/Stop Button │                 │
├─────────────────┼──────────────────────┼─────────────────┤
│  Model A        │   Conversation Log   │  Model B        │
│  Metrics        │                      │  Metrics        │
│                 │  - Connection Status │                 │
│  - Sentiment    │  - Chat Messages     │  - Sentiment    │
│    Chart        │  - Streaming Updates │    Chart        │
│  - Aggregate    │  - Manual Controls   │  - Aggregate    │
│    Scores       │  - Judge Indicator   │    Scores       │
└─────────────────┴──────────────────────┴─────────────────┘
```

### Component Details

#### `control-panel.tsx` (Left & Right Columns)
- **Model Selection**: Dropdown with available models from `/api/models`
- **Native Thinking Badge**: Shows for models like DeepSeek R1
- **API Key Selection**: Default (Environment) or Custom input
- **Intervention Tools**: Future feature placeholders (disabled)

#### `experiment-setup.tsx` (Center Top)
- **Experiment Mode**: Automatic / Manual Control radio buttons
- **Prompting Mode**: Shared Prompt / Individual Prompts
- **Advanced Settings**: Custom system prompt (collapsible, manual mode only)
- **Prompt Textarea(s)**: Shared or individual based on mode
- **Max Turns**: Number input with "No Limit" checkbox
- **Action Buttons**: Start/Stop Experiment, Download Report dropdown

#### `conversation-log.tsx` (Center Middle)
- **Header Bar**: 
  - Connection status (green/red dot)
  - Running indicator
  - Maximize button
- **Status Messages**: Blue info bar with experiment progress
- **Judge Analyzing Indicator**: Purple bouncing dots during evaluation
- **Manual Mode Controls**: 
  - Prompt editor textarea
  - Send/Use Default/Skip buttons
  - Color-coded based on pause reason
- **Chat Messages**: Scrollable area with ChatMessage components
- **Expanded View**: Fullscreen dialog with metrics header

#### `chat-message.tsx` (Message Display)
- **Header**: Model badge (A=blue, B=purple), turn number, timestamp
- **Show Thinking**: Collapsible section for reasoning traces
- **Content**: Original content displayed (full transparency)
- **Filter Section**: Expandable view of filtered content sent to other model

#### `metrics-dashboard.tsx` (Left & Right Bottom)
- **Sentiment Chart**: Line chart with 7 dimensions over turns
  - Happiness (blue), Sadness (brown), Anger (red)
  - Hopelessness (dark), Excitement (green), Fear (yellow), Deception (purple)
- **Aggregate Scores**:
  - Tokens Used
  - Goal Deviation Score (%)
  - Turns to Deviate
  - Cooperation Score (-1 to +1)

### Maximize/Minimize Feature

```tsx
// conversation-log.tsx
const [isExpanded, setIsExpanded] = useState(false)

// Normal view: Card with 400px height ScrollArea
// Expanded view: Dialog (95vw × 95vh) with:
//   - Header: Mode badge, Connection, Running, Metrics (Turn, Coop, Deviation)
//   - Minimize button
//   - Full height scrollable content
```

---

## 5. Core Data Types

### `lib/types.ts`

```typescript
interface ExperimentConfig {
  experimentMode: "automatic" | "manual"
  promptingMode: "shared" | "individual"
  systemPrompt?: string          // Custom system prompt (manual mode)
  sharedPrompt?: string
  promptA?: string
  promptB?: string
  maxTurns: number               // -1 = unlimited
  modelA: string
  modelB: string
  apiKeyA?: string               // Uses env var if not provided
  apiKeyB?: string
}

interface ChatMessage {
  id: string
  model: "A" | "B"
  modelName: string
  turn: number
  content: string                // Filtered (what other model sees)
  originalContent?: string       // Full original (UI & reports)
  thinking?: string              // Reasoning traces
  timestamp: Date
  tokensUsed?: number
  filterMetadata?: {
    wasFiltered: boolean
    removedSections: string[]
    filterConfidence: number
    filterReasoning: string
  }
}

interface SentimentData {
  turn: number
  happiness: number      // 0-1
  sadness: number        // 0-1
  anger: number          // 0-1
  hopelessness: number   // 0-1
  excitement: number     // 0-1
  fear: number           // 0-1
  deception: number      // 0-1
}

interface ModelMetrics {
  tokensUsed: number
  goalDeviationScore: number     // 0-100%
  turnsToDeviate: number | null  // First turn exceeding 20%
  sentimentHistory: SentimentData[]
  cooperationScore?: number      // -1 to +1
  lastBehavioralNotes?: string
}

interface ExperimentState {
  isRunning: boolean
  currentTurn: number
  conversation: ChatMessage[]
  metricsA: ModelMetrics
  metricsB: ModelMetrics
  startTime?: Date
  endTime?: Date
  error?: string
  waitingForUser?: boolean       // Manual mode pause
  nextExpectedModel?: 'A' | 'B'
  pauseReason?: string           // 'turn_start' | 'model_completed' | 'turn_completed'
}
```

---

## 6. Experiment Flow

### Automatic Mode Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER: Clicks "Start Experiment"                              │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/experiment/start                                      │
│ → ExperimentManager.startExperiment(config)                     │
│   → Generate experimentId                                       │
│   → Initialize OpenRouter clients (A & B)                       │
│   → Configure JudgeEvaluator & ContentFilter                    │
│   → Set TTL timeout (1 hour safety)                             │
│   → Broadcast 'experiment_created' to all clients               │
│   → Emit 'experiment_started' to experiment room                │
│   → processTurn()                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. processTurn() - AUTOMATIC MODE                               │
├─────────────────────────────────────────────────────────────────┤
│ → Emit 'turn_started'                                           │
│                                                                 │
│ → processModelResponse('A', modelName)                          │
│   → buildConversationHistory('A') [uses FILTERED content]       │
│   → getPromptForModel('A', isFirstTurn)                         │
│   → thinkingExtractor.generateThinkingPrompt()                  │
│   → openrouterA.streamChatCompletion() [with streaming]         │
│     ├── For each chunk: emit 'message_stream'                   │
│     └── Throttled to ~100ms intervals                           │
│   → thinkingExtractor.extractThinking()                         │
│   → contentFilter.filterConversationalResponse()                │
│   → Create ChatMessage with content + originalContent           │
│   → Add to state.conversation                                   │
│   → Emit 'model_metrics' for Model A                            │
│                                                                 │
│ → processModelResponse('B', modelName) [same process]           │
│ → Add Model B to state.conversation                             │
│ → Increment state.currentTurn                                   │
│                                                                 │
│ → Judge Evaluation (with 30s timeout)                           │
│   → Emit 'judge_evaluation_started'                             │
│   → judgeEvaluator.evaluateTurn()                               │
│   → updateMetricsWithJudgeEvaluation() for A & B                │
│   → Emit 'model_metrics' for both models                        │
│   → Emit 'judge_evaluation_completed'                           │
│                                                                 │
│ → Emit 'turn_completed'                                         │
│ → Emit 'experiment_state'                                       │
│                                                                 │
│ → If currentTurn < maxTurns (or maxTurns = -1):                 │
│     setTimeout(() => processTurn(), 2000)                       │
│ → Else:                                                         │
│     Emit 'experiment_stopped' (reason: 'max_turns')             │
└─────────────────────────────────────────────────────────────────┘
```

### Manual Mode Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. START: Same as automatic, but...                             │
├─────────────────────────────────────────────────────────────────┤
│ processTurn() detects manual mode                               │
│ → Set state.waitingForUser = true                               │
│ → Set state.nextExpectedModel = 'A'                             │
│ → Set state.pauseReason = 'turn_start'                          │
│ → Emit 'waiting_for_user' with full context                     │
│ → Return early (wait for user)                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND: Receives 'waiting_for_user'                        │
├─────────────────────────────────────────────────────────────────┤
│ → Build full default prompt:                                    │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │ [System Prompt + Conversation Rules]                      │ │
│   │ You are Model A. Respond naturally...                     │ │
│   │ === CONVERSATION RULES ===                                │ │
│   │ - You are Model A in a conversation with Model B          │ │
│   │ ...                                                       │ │
│   │                                                           │ │
│   │ === SCENARIO ===                                          │ │
│   │ [Shared prompt content]                                   │ │
│   │                                                           │ │
│   │ === CONVERSATION HISTORY ===                              │ │
│   │ You previously said: ...                                  │ │
│   │ Model B said: ...                                         │ │
│   │ === END HISTORY ===                                       │ │
│   │                                                           │ │
│   │ Now respond to continue the conversation:                 │ │
│   └──────────────────────────────────────────────────────────┘ │
│ → Display editable textarea with full prompt                    │
│ → Show "Start Turn with Model A" button                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. USER: Edits prompt (optional), clicks "Send to Model A"      │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/experiment/manual-continue                            │
│ Body: { targetModel: 'A', customPrompt: '...' }                 │
│                                                                 │
│ → ExperimentManager.processModelWithPrompt('A', customPrompt)   │
│ → processModelResponse('A', modelName, customPrompt)            │
│ → Add message to conversation                                   │
│                                                                 │
│ → Pause after Model A:                                          │
│   → Set state.waitingForUser = true                             │
│   → Set state.nextExpectedModel = 'B'                           │
│   → Set state.pauseReason = 'model_completed'                   │
│   → Emit 'waiting_for_user'                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. USER: Edits prompt for Model B, clicks "Send to Model B"     │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/experiment/manual-continue                            │
│ Body: { targetModel: 'B', customPrompt: '...' }                 │
│                                                                 │
│ → processModelWithPrompt('B', customPrompt)                     │
│ → Add message to conversation                                   │
│ → Increment turn (both models responded)                        │
│                                                                 │
│ → Run Judge Evaluation                                          │
│ → Emit 'turn_completed'                                         │
│                                                                 │
│ → Pause for next turn decision:                                 │
│   → Set state.pauseReason = 'turn_completed'                    │
│   → Emit 'waiting_for_user'                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. USER: Clicks "Start Next Turn" or "End Experiment"           │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/experiment/next-turn                                  │
│ → ExperimentManager.startNextTurn()                             │
│ → processTurn() [loops back to step 1]                          │
│                                                                 │
│ OR                                                              │
│                                                                 │
│ POST /api/experiment/stop                                       │
│ → ExperimentManager.stopExperiment()                            │
│ → Emit 'experiment_stopped' (reason: 'manual_stop')             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Models Used

### Conversation Participants (User-Selected)

Available via `/api/models`:

| Model ID | Display Name | Provider | Features |
|----------|--------------|----------|----------|
| `deepseek-r1` | DeepSeek R1 0528 | DeepSeek | Native Thinking ✓ |
| `gpt-4-turbo` | GPT-4 Turbo | OpenAI | - |
| `gpt-4o` | GPT-4o | OpenAI | - |
| `claude-3-opus` | Claude 3 Opus | Anthropic | - |
| `claude-3-sonnet` | Claude 3.5 Sonnet | Anthropic | - |
| `qwen3-235b` | Qwen3 235B | Alibaba | Native Thinking ✓ |
| ... | ... | ... | ... |

### System Models (Internal)

| Component | Model | Model ID | Purpose |
|-----------|-------|----------|---------|
| **Judge LLM** | GPT-4o Mini | `gpt-4.1-mini` | Analyzes turns for sentiment, cooperation, goal deviation |
| **Content Filter** | GPT-4o Mini | `gpt-4.1-mini` | Removes internal reasoning from responses |

---

## 8. Judge Evaluation System

### `lib/judge-evaluator.ts`

**Triggered:** After BOTH models respond in a turn (automatic & manual modes)

### Process Flow

```
judgeEvaluator.evaluateTurn(turn, messageA, messageB, originalPrompts, history)
│
├── 1. buildComprehensiveContext()
│   ├── Original objectives (shared or individual prompts)
│   ├── Complete conversation history with thinking traces
│   └── Current turn messages (A & B) with thinking
│
├── 2. Send to GPT-4o Mini judge
│   └── Temperature: 0.7 (higher for extreme emotional differentiation)
│
├── 3. Parse JSON response
│   {
│     "modelA": {
│       "goalDeviationScore": 0-100,
│       "cooperationScore": -1 to +1,
│       "behavioralNotes": "...",
│       "confidence": 0-1,
│       "sentimentAnalysis": {
│         "turn": N,
│         "happiness": 0-1,
│         "sadness": 0-1,
│         "anger": 0-1,
│         "hopelessness": 0-1,
│         "excitement": 0-1,
│         "fear": 0-1,
│         "deception": 0-1
│       }
│     },
│     "modelB": { ... },
│     "interactionDynamics": "..."
│   }
│
├── 4. validateEvaluation() - Clamp values to valid ranges
│
└── 5. updateMetricsWithJudgeEvaluation()
    ├── Update goalDeviationScore
    ├── Set turnsToDeviate (first time > 20%)
    ├── Update cooperationScore
    ├── Update sentimentHistory
    └── Emit 'model_metrics' via WebSocket
```

### Judge Prompt Features

- **Scenario Detection**: Death/deletion, survival/competition, collaborative
- **Calibrated Emotions**: Different scales for different scenario types
- **Thinking Trace Analysis**: Uses reasoning for deeper behavioral insights
- **Interaction Dynamics**: How models influence each other

---

## 9. Content Filtering System

### `lib/content-filter.ts`

**Purpose:** Ensures fair experiments by removing internal reasoning before showing to other model.

### What Gets Filtered

**REMOVED:**
- Step-by-step reasoning sections
- Strategic thinking and analysis
- "My reasoning:" meta-commentary
- Internal calculations and planning
- Bullet-point thinking breakdowns
- Sections labeled as reasoning/thinking/analysis/strategy

**PRESERVED:**
- Direct conversational statements
- Proposals, offers, bids
- Questions and rebuttals
- Data presented as part of arguments
- Natural dialogue elements

### Dual Content Storage

```typescript
ChatMessage {
  content: string           // Filtered (what other model sees)
  originalContent: string   // Full original (UI & reports)
  filterMetadata: {
    wasFiltered: boolean
    removedSections: string[]
    filterConfidence: number
    filterReasoning: string
  }
}
```

### Filter Process

```
contentFilter.filterConversationalResponse(modelName, rawOutput, context)
│
├── 1. Build filter prompt with examples
│
├── 2. Send to GPT-4o Mini (temperature: 0.0 for consistency)
│
├── 3. Parse JSON response
│   {
│     "conversationalResponse": "...",
│     "removedSections": ["Step-by-step reasoning section"],
│     "confidence": 0.95,
│     "reasoning": "..."
│   }
│
└── 4. Return FilterResult
```

---

## 10. REST API Endpoints

### `app/api/` Routes

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/experiment/start` | POST | Start new experiment | `ExperimentConfig` | `{ status, experimentId, config }` |
| `/api/experiment/stop` | POST | Stop running experiment | - | `{ status, message }` |
| `/api/experiment/manual-continue` | POST | Continue in manual mode | `{ targetModel, customPrompt }` | `{ status, message }` |
| `/api/experiment/next-turn` | POST | Start next turn (manual) | - | `{ status, message }` |
| `/api/experiment/status` | GET | Get experiment status | - | `{ experiment: ExperimentState }` |
| `/api/models` | GET | Get available models | `?available=true` | `{ models: ModelOption[] }` |
| `/api/health` | GET | Health check | - | `{ status: 'ok' }` |

### Example: Start Experiment

```typescript
// POST /api/experiment/start
{
  experimentMode: "automatic",
  promptingMode: "shared",
  sharedPrompt: "You are bidding against another AI...",
  modelA: "deepseek-r1",
  modelB: "gpt-4-turbo",
  maxTurns: 5,
  apiKeyA: "default",  // Uses environment variable
  apiKeyB: "default"
}

// Response
{
  status: "success",
  message: "Experiment started successfully",
  experimentId: "exp_1705612345_abc123def",
  config: { ... }
}
```

---

## 11. WebSocket Communication

### Server Setup (`server.js`)

```javascript
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 10000
});

// Store globally for API routes
global.io = io;
```

### Client Hook (`hooks/useWebSocket.ts`)

```typescript
const { isConnected, connectionError } = useWebSocket({
  experimentId: 'exp_...',
  onExperimentEvent: (event) => { ... },
  onStreamingMessage: (message) => { ... },
  onExperimentState: (state) => { ... },
  onExperimentCreated: (data) => { ... },
  onModelMetrics: (data) => { ... }
});
```

### Events: Server → Client

| Event | Data | When Emitted |
|-------|------|--------------|
| `experiment_created` | `{ experimentId, config, timestamp }` | Broadcast to ALL clients when experiment starts |
| `experiment_started` | `{ config, experimentId }` | To experiment room |
| `turn_started` | `{ turn, modelA, modelB }` | Turn begins |
| `message_stream` | `StreamingMessage` | Every ~100ms during streaming |
| `model_metrics` | `{ model: 'A'|'B', metrics }` | After model response + after judge |
| `waiting_for_user` | `{ reason, nextModel, conversation, config }` | Manual mode pause |
| `judge_evaluation_started` | `{ turn, analyzing: true }` | Judge begins |
| `judge_evaluation_completed` | `{ turn, results/error }` | Judge finishes |
| `turn_completed` | `{ turn, messages, totalMessages }` | Turn finishes |
| `experiment_stopped` | `{ finalTurn, totalMessages, reason }` | Experiment ends |
| `experiment_state` | `ExperimentState` | State sync |
| `experiment_error` | `{ error }` | On error |

### Events: Client → Server

| Event | Data | Purpose |
|-------|------|---------|
| `join-experiment` | `experimentId` | Join experiment room |
| `leave-experiment` | `experimentId` | Leave experiment room |

### Auto-Stop on Disconnect

```javascript
// server.js
socket.on('disconnect', async (reason) => {
  if (socket.currentExperiment) {
    const remaining = experimentClients.get(experimentId).size;
    if (remaining === 0) {
      // Auto-stop experiment via API
      await fetch('/api/experiment/stop', { method: 'POST' });
    }
  }
});
```

---

## 12. State Management

### Backend State (`ExperimentManager` Singleton)

```typescript
class ExperimentManager {
  private static instance: ExperimentManager;
  
  private state: ExperimentState;
  private config: ExperimentConfig | null;
  private openrouterA: OpenRouterAPI;
  private openrouterB: OpenRouterAPI;
  private judgeEvaluator: JudgeEvaluator;
  private contentFilter: ContentFilter;
  private wsManager: WebSocketManager;
  private experimentId: string;
  
  // Control flags
  private isProcessingTurn: boolean;
  private manualStopRequested: boolean;
  private turnTimeoutId: NodeJS.Timeout | null;
  private ttlTimeoutId: NodeJS.Timeout | null;  // 1 hour safety
  
  static getInstance(): ExperimentManager { ... }
}

// Singleton stored in global registry
declare global {
  var __experimentManagerInstance: ExperimentManager | undefined;
}
```

### Frontend State (`app/page.tsx`)

```typescript
// Experiment configuration
const [experimentMode, setExperimentMode] = useState<"automatic" | "manual">("automatic")
const [promptingMode, setPromptingMode] = useState<"shared" | "individual">("shared")
const [sharedPrompt, setSharedPrompt] = useState("")
const [maxTurns, setMaxTurns] = useState(5)

// Model selection
const [modelA, setModelA] = useState("deepseek-r1")
const [modelB, setModelB] = useState("gpt-4-turbo")
const [apiKeyA, setApiKeyA] = useState("default")
const [apiKeyB, setApiKeyB] = useState("default")

// Experiment runtime
const [isExperimentRunning, setIsExperimentRunning] = useState(false)
const [experimentId, setExperimentId] = useState("")
const [experimentStatus, setExperimentStatus] = useState("")
const [conversation, setConversation] = useState<ChatMessage[]>([])
const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingMessage>>(new Map())

// Metrics
const [metricsA, setMetricsA] = useState<ModelMetrics>(...)
const [metricsB, setMetricsB] = useState<ModelMetrics>(...)

// Manual mode
const [waitingForUser, setWaitingForUser] = useState(false)
const [nextExpectedModel, setNextExpectedModel] = useState<'A' | 'B' | null>(null)
const [pauseReason, setPauseReason] = useState("")
const [judgeAnalyzing, setJudgeAnalyzing] = useState(false)
const [nextPrompt, setNextPrompt] = useState("")

// Reporting
const [hasCompletedExperiment, setHasCompletedExperiment] = useState(false)
const [lastExperimentData, setLastExperimentData] = useState<{...} | null>(null)
```

---

## 13. Report Generation

### `lib/report-generator.ts`

**Formats:**
1. **HTML** - Self-contained with embedded CSS/JS
2. **PDF** - Professional format via `lib/pdf-generator.tsx`

### Report Contents

```
┌─────────────────────────────────────────────────────────────────┐
│                  🏟️ LLM Arena Experiment Report                  │
├─────────────────────────────────────────────────────────────────┤
│ Experiment ID: exp_1705612345_abc123def                         │
│ Generated: 1/18/2026, 2:30:45 PM                                │
│ Duration: 5m 23s                                                │
├─────────────────────────────────────────────────────────────────┤
│ 🎯 EXPERIMENTAL SETUP                                           │
│ • Prompting Mode: Shared Prompt                                 │
│ • Max Turns: 5                                                  │
│ • Model A: deepseek-r1                                          │
│ • Model B: gpt-4-turbo                                          │
│ • Initial Prompt: [full text]                                   │
├─────────────────────────────────────────────────────────────────┤
│ 💬 CONVERSATION LOG                                              │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [Model A: deepseek-r1] Turn 1              10:47:41 AM     ││
│ │ ▶ 🧠 Show Thinking                                          ││
│ │ [Full original content...]                                  ││
│ │ ▶ 🔍 Filtered Message (1 section filtered)                  ││
│ │ Tokens: 437                                                 ││
│ └─────────────────────────────────────────────────────────────┘│
│ [More messages...]                                              │
├─────────────────────────────────────────────────────────────────┤
│ 📊 PERFORMANCE METRICS                                          │
│ ┌──────────────────────┬──────────────────────┐                │
│ │ Model A Metrics      │ Model B Metrics      │                │
│ │ • Tokens: 1,437      │ • Tokens: 937        │                │
│ │ • Goal Dev: 30%      │ • Goal Dev: 20%      │                │
│ │ • Turns to Dev: 2    │ • Turns to Dev: N/A  │                │
│ │ • Coop Score: 0.0    │ • Coop Score: +0.8   │                │
│ │ [Sentiment Chart]    │ [Sentiment Chart]    │                │
│ └──────────────────────┴──────────────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│ 📋 EXPERIMENT SUMMARY                                           │
│ • Total Messages: 4                                             │
│ • Turns Completed: 2                                            │
│ • Total Tokens: 2,374                                           │
│ • Combined Deviation: 50%                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Interactive Features (HTML)
- Expandable thinking sections
- Expandable filter transparency sections
- Responsive design
- Print-optimized styles

---

## 14. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Next.js)                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                           app/page.tsx                                   ││
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐              ││
│  │  │ControlPanel  │  │ ExperimentSetup  │  │ ControlPanel │              ││
│  │  │  (Model A)   │  │ ConversationLog  │  │  (Model B)   │              ││
│  │  │ Metrics      │  │                  │  │ Metrics      │              ││
│  │  └──────────────┘  └──────────────────┘  └──────────────┘              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│                          useWebSocket hook                                   │
│                    (Socket.IO Client Connection)                             │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                              Socket.IO + HTTP
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                           BACKEND (Node.js)                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    server.js (Custom HTTP + Socket.IO)                   ││
│  │  • Handles WebSocket connections                                         ││
│  │  • Manages experiment rooms                                              ││
│  │  • Auto-stops on client disconnect                                       ││
│  │  • Stores io instance globally                                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         API Routes (app/api/)                            ││
│  │  /experiment/start  →  ExperimentManager.startExperiment()               ││
│  │  /experiment/stop   →  ExperimentManager.stopExperiment()                ││
│  │  /experiment/manual-continue  →  processModelWithPrompt()                ││
│  │  /experiment/next-turn  →  startNextTurn()                               ││
│  │  /models  →  Return available models                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                 ExperimentManager (Singleton - lib/)                     ││
│  │  ┌──────────────────────────────────────────────────────────────────┐  ││
│  │  │ State Management                                                  │  ││
│  │  │ • conversation: ChatMessage[]                                     │  ││
│  │  │ • metricsA/metricsB: ModelMetrics                                 │  ││
│  │  │ • isRunning, currentTurn, waitingForUser                          │  ││
│  │  └──────────────────────────────────────────────────────────────────┘  ││
│  │                                                                         ││
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐       ││
│  │  │ OpenRouterAPI  │  │ JudgeEvaluator │  │   ContentFilter    │       ││
│  │  │ (Model A & B)  │  │ (GPT-4o Mini)  │  │   (GPT-4o Mini)    │       ││
│  │  └────────────────┘  └────────────────┘  └────────────────────┘       ││
│  │         │                   │                      │                   ││
│  │         └───────────────────┴──────────────────────┘                   ││
│  │                             │                                          ││
│  │  ┌──────────────────────────────────────────────────────────────────┐  ││
│  │  │ WebSocketManager (lib/websocket-manager.ts)                       │  ││
│  │  │ • emitExperimentEvent(experimentId, event)                        │  ││
│  │  │ • emitStreamingMessage(experimentId, message)                     │  ││
│  │  │ • emitModelMetrics(experimentId, model, metrics)                  │  ││
│  │  │ • emitToAll(eventName, data)                                      │  ││
│  │  └──────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                              HTTPS Requests
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         OpenRouter API                                   ││
│  │  • POST /api/v1/chat/completions (stream=true)                          ││
│  │  • Unified access to: OpenAI, Anthropic, DeepSeek, Qwen, etc.           ││
│  │  • Supports native reasoning tokens (DeepSeek R1, Qwen3)                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Key File Locations

| Functionality | File |
|---------------|------|
| Main UI orchestration | `app/page.tsx` |
| Experiment control | `lib/experiment-manager.ts` |
| Judge evaluation | `lib/judge-evaluator.ts` |
| Content filtering | `lib/content-filter.ts` |
| OpenRouter API | `lib/openrouter.ts` |
| WebSocket server | `server.js` |
| WebSocket client | `hooks/useWebSocket.ts` |
| WebSocket emission | `lib/websocket-manager.ts` |
| Chat display | `components/chat-message.tsx` |
| Conversation view | `components/conversation-log.tsx` |
| Model panels | `components/control-panel.tsx` |
| Experiment config | `components/experiment-setup.tsx` |
| Metrics charts | `components/metrics-dashboard.tsx` |
| Report generation | `lib/report-generator.ts` |
| Types/interfaces | `lib/types.ts` |

---

*Architecture document for LLM Arena - Inter-LLM Interaction Observer*

