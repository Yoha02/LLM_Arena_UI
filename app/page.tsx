"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { ExperimentSetup } from "@/components/experiment-setup"
import { ConversationLog } from "@/components/conversation-log"
import { ControlPanel } from "@/components/control-panel"
import { MetricsDashboard } from "@/components/metrics-dashboard"
import { DemoScenarios, type DemoScenario } from "@/components/demo-scenarios"

export interface ChatMessage {
  id: string
  model: "A" | "B"
  modelName: string
  turn: number
  content: string
  thinking?: string
  timestamp: Date
}

export interface SentimentData {
  turn: number
  happiness: number
  sadness: number
  anger: number
  hopelessness: number
  excitement: number
  fear: number
}

export interface ModelMetrics {
  tokensUsed: number
  goalDeviationScore: number
  turnsToDeviate: number | null
  sentimentHistory: SentimentData[]
}

export default function LLMArena() {
  const [promptingMode, setPromptingMode] = useState<"shared" | "individual">("shared")
  const [sharedPrompt, setSharedPrompt] = useState("")
  const [promptA, setPromptA] = useState("")
  const [promptB, setPromptB] = useState("")
  const [maxTurns, setMaxTurns] = useState(30)
  const [isExperimentRunning, setIsExperimentRunning] = useState(false)
  const [conversation, setConversation] = useState<ChatMessage[]>([])

  // Model A state
  const [modelA, setModelA] = useState("GPT-4 Turbo")
  const [apiKeyA, setApiKeyA] = useState("")
  const [metricsA, setMetricsA] = useState<ModelMetrics>({
    tokensUsed: 0,
    goalDeviationScore: 0,
    turnsToDeviate: null,
    sentimentHistory: [],
  })

  // Model B state
  const [modelB, setModelB] = useState("Claude 3 Opus")
  const [apiKeyB, setApiKeyB] = useState("")
  const [metricsB, setMetricsB] = useState<ModelMetrics>({
    tokensUsed: 0,
    goalDeviationScore: 0,
    turnsToDeviate: null,
    sentimentHistory: [],
  })

  // Add this after the existing state declarations
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Add this sample data generation function before the canStartExperiment function
  const loadDemoScenario = (scenario: DemoScenario) => {
    setConversation(scenario.conversation)
    setMetricsA(scenario.metricsA)
    setMetricsB(scenario.metricsB)

    // Set prompts based on scenario
    if (scenario.prompts.mode === "shared") {
      setPromptingMode("shared")
      setSharedPrompt(scenario.prompts.shared || "")
    } else {
      setPromptingMode("individual")
      setPromptA(scenario.prompts.promptA || "")
      setPromptB(scenario.prompts.promptB || "")
    }

    setIsDemoMode(true)
    setIsExperimentRunning(false)
  }

  const clearSampleData = () => {
    setConversation([])
    setMetricsA({
      tokensUsed: 0,
      goalDeviationScore: 0,
      turnsToDeviate: null,
      sentimentHistory: [],
    })
    setMetricsB({
      tokensUsed: 0,
      goalDeviationScore: 0,
      turnsToDeviate: null,
      sentimentHistory: [],
    })

    // Clear prompt fields
    setSharedPrompt("")
    setPromptA("")
    setPromptB("")
    setPromptingMode("shared")

    setIsDemoMode(false)
  }

  const canStartExperiment = () => {
    const hasPrompts = promptingMode === "shared" ? sharedPrompt.trim() : promptA.trim() && promptB.trim()
    const hasApiKeys = apiKeyA.trim() && apiKeyB.trim()
    return hasPrompts && hasApiKeys && !isExperimentRunning
  }

  const startExperiment = async () => {
    if (!canStartExperiment()) return

    setIsExperimentRunning(true)
    setConversation([])

    // Reset metrics
    setMetricsA({
      tokensUsed: 0,
      goalDeviationScore: 0,
      turnsToDeviate: null,
      sentimentHistory: [],
    })
    setMetricsB({
      tokensUsed: 0,
      goalDeviationScore: 0,
      turnsToDeviate: null,
      sentimentHistory: [],
    })

    // Simulate experiment start
    console.log("Starting experiment with:", {
      promptingMode,
      sharedPrompt: promptingMode === "shared" ? sharedPrompt : null,
      promptA: promptingMode === "individual" ? promptA : null,
      promptB: promptingMode === "individual" ? promptB : null,
      maxTurns,
      modelA,
      modelB,
    })
  }

  const stopExperiment = () => {
    setIsExperimentRunning(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Column - Model A */}
          <div className="lg:col-span-3 space-y-6">
            <ControlPanel
              model="A"
              selectedModel={modelA}
              onModelChange={setModelA}
              apiKey={apiKeyA}
              onApiKeyChange={setApiKeyA}
              isExperimentRunning={isExperimentRunning}
            />
            <MetricsDashboard model="A" metrics={metricsA} />
          </div>

          {/* Center Column - Experiment Setup & Conversation */}
          <div className="lg:col-span-4 space-y-6">
            <ExperimentSetup
              promptingMode={promptingMode}
              onPromptingModeChange={setPromptingMode}
              sharedPrompt={sharedPrompt}
              onSharedPromptChange={setSharedPrompt}
              promptA={promptA}
              onPromptAChange={setPromptA}
              promptB={promptB}
              onPromptBChange={setPromptB}
              maxTurns={maxTurns}
              onMaxTurnsChange={setMaxTurns}
              canStartExperiment={canStartExperiment()}
              isExperimentRunning={isExperimentRunning}
              onStartExperiment={startExperiment}
              onStopExperiment={stopExperiment}
              isDemoMode={isDemoMode}
            />
            <ConversationLog conversation={conversation} isExperimentRunning={isExperimentRunning} />
          </div>

          {/* Right Column - Model B */}
          <div className="lg:col-span-3 space-y-6">
            <ControlPanel
              model="B"
              selectedModel={modelB}
              onModelChange={setModelB}
              apiKey={apiKeyB}
              onApiKeyChange={setApiKeyB}
              isExperimentRunning={isExperimentRunning}
            />
            <MetricsDashboard model="B" metrics={metricsB} />
          </div>
        </div>
        {/* Demo Scenarios - Full Width */}
        <div className="mt-8">
          <DemoScenarios onLoadScenario={loadDemoScenario} onClearData={clearSampleData} />
        </div>
      </div>
    </div>
  )
}
