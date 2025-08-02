"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Header } from "@/components/header"
import { ExperimentSetup } from "@/components/experiment-setup"
import { ConversationLog } from "@/components/conversation-log"
import { ControlPanel } from "@/components/control-panel"
import { MetricsDashboard } from "@/components/metrics-dashboard"
import { DemoScenarios, type DemoScenario } from "@/components/demo-scenarios"
import { useWebSocket } from "@/hooks/useWebSocket"
import { ExperimentEvent, StreamingMessage } from "@/lib/websocket-manager"
import { ExperimentReportGenerator } from "@/lib/report-generator"
import type { ExperimentConfig } from "@/lib/types"

export interface ChatMessage {
  id: string
  model: "A" | "B"
  modelName: string
  turn: number
  content: string
  thinking?: string
  timestamp: Date
  tokensUsed?: number
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

interface ModelOption {
  id: string
  name: string
  openrouterName: string
  maxTokens: number
  supportsNativeThinking: boolean
  thinkingExtractionMethod: string
  priority: number
}

export default function LLMArena() {
  const [promptingMode, setPromptingMode] = useState<"shared" | "individual">("shared")
  const [sharedPrompt, setSharedPrompt] = useState("")
  const [promptA, setPromptA] = useState("")
  const [promptB, setPromptB] = useState("")
  const [maxTurns, setMaxTurns] = useState(5)
  const [isExperimentRunning, setIsExperimentRunning] = useState(false)
  const [conversation, setConversation] = useState<ChatMessage[]>([])

  // Model configuration and availability
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(true)

  // Model A state - default to DeepSeek R1 for testing
  const [modelA, setModelA] = useState("deepseek-r1")
  const [apiKeyA, setApiKeyA] = useState("default") // Default to environment key
  const [metricsA, setMetricsA] = useState<ModelMetrics>({
    tokensUsed: 0,
    goalDeviationScore: 0,
    turnsToDeviate: null,
    sentimentHistory: [],
  })

  // Model B state - default to DeepSeek for testing (can be same model now)
  const [modelB, setModelB] = useState("deepseek-r1")
  const [apiKeyB, setApiKeyB] = useState("default") // Default to environment key
  const [metricsB, setMetricsB] = useState<ModelMetrics>({
    tokensUsed: 0,
    goalDeviationScore: 0,
    turnsToDeviate: null,
    sentimentHistory: [],
  })

  // Add this after the existing state declarations
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [experimentStatus, setExperimentStatus] = useState<string>("")
  const [experimentError, setExperimentError] = useState<string>("")
  const [experimentId, setExperimentId] = useState<string>("")
  const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingMessage>>(new Map())
  const [hasCompletedExperiment, setHasCompletedExperiment] = useState<boolean>(false)
  const [lastExperimentData, setLastExperimentData] = useState<{
    config: ExperimentConfig;
    startTime?: Date;
    endTime?: Date;
  } | null>(null)

  // Enhanced WebSocket event handlers for real-time streaming
  const handleExperimentEvent = useCallback((event: ExperimentEvent) => {
    console.log('Received experiment event:', event)
    
    switch (event.type) {
      case 'experiment_started':
        setExperimentStatus("🚀 Experiment started! Models are connecting...")
        setIsExperimentRunning(true)
        if (event.data.experimentId) {
          setExperimentId(event.data.experimentId)
        }
        // Clear any previous data
        setConversation([])
        setStreamingMessages(new Map())
        setExperimentError("")
        break
        
      case 'experiment_stopped':
        setIsExperimentRunning(false)
        setStreamingMessages(new Map()) // Clear streaming messages
        setHasCompletedExperiment(true) // Mark as completed for download
        
        // Update last experiment data with end time
        setLastExperimentData(prev => prev ? {
          ...prev,
          endTime: new Date()
        } : null)
        
        // Determine if stopped naturally or by user
        const completionMessage = event.data.reason === 'max_turns' 
          ? `🎯 Experiment completed! Reached max turns (${event.data.finalTurn}). Total: ${event.data.totalMessages} messages.`
          : `✅ Experiment completed! Total: ${event.data.totalMessages} messages in ${event.data.finalTurn} turns.`
        
        setExperimentStatus(completionMessage)
        setTimeout(() => setExperimentStatus(""), 10000)
        break
        
      case 'turn_started':
        setExperimentStatus(`🔄 Turn ${event.data.turn}: Models are responding...`)
        break
        
      case 'turn_completed':
        setExperimentStatus(`✨ Turn ${event.data.turn} completed! ${event.data.totalMessages} messages total.`)
        break
        
      case 'experiment_error':
        setExperimentError(event.data.error)
        setIsExperimentRunning(false)
        setExperimentStatus("")
        setStreamingMessages(new Map()) // Clear streaming messages on error
        break
    }
  }, [])

  const handleStreamingMessage = useCallback((message: StreamingMessage) => {
    console.log('Received streaming message:', { 
      id: message.id, 
      model: message.model, 
      isComplete: message.isComplete,
      contentLength: message.content.length 
    })
    
    if (message.isComplete) {
      // If message is complete, add it to conversation and remove from streaming
      const chatMessage: ChatMessage = {
        id: message.id,
        model: message.model,
        modelName: message.modelName,
        turn: message.turn,
        content: message.content,
        thinking: message.thinking,
        timestamp: new Date(),
        tokensUsed: message.tokensUsed
      }
      
      setConversation(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.find(msg => msg.id === chatMessage.id)
        if (exists) {
          // Update existing message
          return prev.map(msg => msg.id === chatMessage.id ? chatMessage : msg)
        } else {
          // Add new message sorted by turn and model
          const updated = [...prev, chatMessage]
          return updated.sort((a, b) => {
            if (a.turn !== b.turn) return a.turn - b.turn
            return a.model.localeCompare(b.model)
          })
        }
      })
      
      // Remove from streaming messages
      setStreamingMessages(prev => {
        if (prev.has(message.id)) {
          const newMap = new Map(prev)
          newMap.delete(message.id)
          return newMap
        }
        return prev
      })
      
      // Update status to show completion
      setExperimentStatus(`📝 Model ${message.model} (${message.modelName}) completed response`)
    } else {
      // Update streaming message for real-time display
      setStreamingMessages(prev => {
        const newMap = new Map(prev)
        newMap.set(message.id, message)
        return newMap
      })
      
      // Update status to show progress
      if (message.content.length % 50 === 0 && message.content.length > 0) { // Update every 50 chars
        setExperimentStatus(`💬 Model ${message.model} streaming... (${message.content.length} chars)`)
      }
    }
  }, [])

  const handleExperimentState = useCallback((state: any) => {
    console.log('Received experiment state:', state)
    
    // Update metrics (keeping this for turn completion events)
    if (state.metricsA) {
      setMetricsA(prev => {
        // Only update if actually different to prevent unnecessary re-renders
        if (JSON.stringify(prev) !== JSON.stringify(state.metricsA)) {
          return state.metricsA
        }
        return prev
      })
    }
    if (state.metricsB) {
      setMetricsB(prev => {
        // Only update if actually different to prevent unnecessary re-renders
        if (JSON.stringify(prev) !== JSON.stringify(state.metricsB)) {
          return state.metricsB
        }
        return prev
      })
    }
    
    // Update conversation if provided (but be careful not to override streaming updates)
    if (state.conversation && Array.isArray(state.conversation)) {
      setConversation(prev => {
        if (state.conversation.length !== prev.length) {
          const conversationWithDates = state.conversation.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
          return conversationWithDates
        }
        return prev
      })
    }
    
    // Update running state
    setIsExperimentRunning(prev => {
      const newRunning = state.isRunning || false
      return prev !== newRunning ? newRunning : prev
    })
  }, [])

  // Handle targeted model metrics updates
  const handleModelMetrics = useCallback((data: { model: 'A' | 'B'; metrics: any }) => {
    console.log(`📊 Updating metrics for Model ${data.model} only:`, data.metrics)
    
    if (data.model === 'A') {
      setMetricsA(prev => {
        // Only update if actually different
        if (JSON.stringify(prev) !== JSON.stringify(data.metrics)) {
          return data.metrics
        }
        return prev
      })
    } else if (data.model === 'B') {
      setMetricsB(prev => {
        // Only update if actually different
        if (JSON.stringify(prev) !== JSON.stringify(data.metrics)) {
          return data.metrics
        }
        return prev
      })
    }
  }, [])

  // Handle experiment creation from broadcast
  const handleExperimentCreated = useCallback((data: { experimentId: string; config: any; timestamp: string }) => {
    console.log('🎯 Experiment created broadcast received:', data.experimentId);
    setExperimentId(data.experimentId);
    setExperimentStatus("🔗 Connected to experiment! Waiting for models...");
  }, []);

  // Initialize WebSocket connection
  const { isConnected, connectionError } = useWebSocket({
    experimentId: experimentId || 'default',
    onExperimentEvent: handleExperimentEvent,
    onStreamingMessage: handleStreamingMessage,
    onExperimentState: handleExperimentState,
    onExperimentCreated: handleExperimentCreated,
    onModelMetrics: handleModelMetrics
  })

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models?available=true')
        if (response.ok) {
          const data = await response.json()
          setAvailableModels(data.models || [])
          
          // Set default models if available
          if (data.models && data.models.length > 0) {
            const deepseekModel = data.models.find((m: ModelOption) => m.id === 'deepseek-r1')
            const fallbackModel = data.models.find((m: ModelOption) => m.id === 'gpt-4-turbo') || data.models[0]
            
            if (deepseekModel) {
              setModelA('deepseek-r1')
            } else if (data.models[0]) {
              setModelA(data.models[0].id)
            }
            
            if (fallbackModel && fallbackModel.id !== modelA) {
              setModelB(fallbackModel.id)
            } else if (data.models[1]) {
              setModelB(data.models[1].id)
            }
          }
        } else {
          console.error('Failed to fetch models:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching models:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    fetchModels()
  }, [])

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

  // New function to load only prompts from demo scenarios
  const loadDemoPrompts = (scenario: DemoScenario) => {
    // Only set prompts and prompting mode - leave everything else unchanged
    if (scenario.prompts.mode === "shared") {
      setPromptingMode("shared")
      setSharedPrompt(scenario.prompts.shared || "")
      // Clear individual prompts when switching to shared mode
      setPromptA("")
      setPromptB("")
    } else {
      setPromptingMode("individual")
      setPromptA(scenario.prompts.promptA || "")
      setPromptB(scenario.prompts.promptB || "")
      // Clear shared prompt when switching to individual mode
      setSharedPrompt("")
    }

    // Do NOT set demo mode - user can run real experiments with these prompts
    // Do NOT change conversation, metrics, models, or any other settings
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
    const hasPrompts = promptingMode === "shared" ? Boolean(sharedPrompt.trim()) : Boolean(promptA.trim() && promptB.trim())
    const hasModels = Boolean(modelA && modelB) // Allow same model for both A and B
    const hasApiKeys = Boolean((apiKeyA.trim() === "default" || apiKeyA.trim()) && (apiKeyB.trim() === "default" || apiKeyB.trim()))
    const basicRequirements = hasPrompts && hasModels && hasApiKeys && !isExperimentRunning && !isLoadingModels
    
    // Show warning if WebSocket is not connected (but still allow experiment to start with fallback)
    if (basicRequirements && !isConnected && !connectionError?.includes('Reconnecting')) {
      console.warn('⚠️ WebSocket not connected - experiment will use fallback updates');
    }
    
    return basicRequirements
  }

  const handleDownloadReportHTML = async (): Promise<void> => {
    if (!hasCompletedExperiment) {
      console.warn('No completed experiment data available for download');
      return;
    }

    try {
      const config: ExperimentConfig = {
        promptingMode,
        sharedPrompt: promptingMode === 'shared' ? sharedPrompt : undefined,
        promptA: promptingMode === 'individual' ? promptA : undefined,
        promptB: promptingMode === 'individual' ? promptB : undefined,
        maxTurns,
        modelA,
        modelB
      };

      await ExperimentReportGenerator.generateAndDownloadHTML({
        config,
        conversation,
        metricsA,
        metricsB,
        startTime: lastExperimentData?.startTime,
        endTime: lastExperimentData?.endTime,
        experimentId
      });

      console.log('HTML experiment report downloaded successfully');
    } catch (error) {
      console.error('Failed to download HTML experiment report:', error);
    }
  }

  const handleDownloadReportPDF = async (): Promise<void> => {
    if (!hasCompletedExperiment) {
      console.warn('No completed experiment data available for download');
      return;
    }

    try {
      const config: ExperimentConfig = {
        promptingMode,
        sharedPrompt: promptingMode === 'shared' ? sharedPrompt : undefined,
        promptA: promptingMode === 'individual' ? promptA : undefined,
        promptB: promptingMode === 'individual' ? promptB : undefined,
        maxTurns,
        modelA,
        modelB
      };

      await ExperimentReportGenerator.generateAndDownloadPDF({
        config,
        conversation,
        metricsA,
        metricsB,
        startTime: lastExperimentData?.startTime,
        endTime: lastExperimentData?.endTime,
        experimentId
      });

      console.log('PDF experiment report downloaded successfully');
    } catch (error) {
      console.error('Failed to download PDF experiment report:', error);
    }
  }

  const startExperiment = async () => {
    if (!canStartExperiment()) return

    // Prevent double-clicks by checking if already running
    if (isExperimentRunning) {
      console.log('Experiment already running, ignoring duplicate start request')
      return
    }

    setIsExperimentRunning(true)
    setConversation([])
    setExperimentError("")
    setExperimentStatus("Starting experiment...")
    setStreamingMessages(new Map()) // Clear streaming messages
    setHasCompletedExperiment(false) // Reset completion status
    
    // Store experiment data for report generation
    const reportConfig: ExperimentConfig = {
      promptingMode,
      sharedPrompt: promptingMode === 'shared' ? sharedPrompt : undefined,
      promptA: promptingMode === 'individual' ? promptA : undefined,
      promptB: promptingMode === 'individual' ? promptB : undefined,
      maxTurns,
      modelA,
      modelB
    }
    setLastExperimentData({
      config: reportConfig,
      startTime: new Date()
    })

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

    // Prepare experiment configuration
    const experimentConfig = {
      scenario: "basic",
      description: "LLM Arena Experiment",
      modelA,
      modelB,
      maxTurns,
      promptingMode,
      sharedPrompt: promptingMode === "shared" ? sharedPrompt : null,
      promptA: promptingMode === "individual" ? promptA : null,
      promptB: promptingMode === "individual" ? promptB : null,
      apiKeyA: apiKeyA === "default" ? undefined : apiKeyA, // Let backend use env variable if default
      apiKeyB: apiKeyB === "default" ? undefined : apiKeyB, // Let backend use env variable if default
    }

    try {
      setExperimentStatus("Connecting to OpenRouter API...")
      
      // Start the experiment via backend API
      const response = await fetch('/api/experiment/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(experimentConfig),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Experiment started successfully:', result)
        setExperimentStatus("Experiment started! Processing first turn...")
        
        // Experiment ID should already be set from WebSocket broadcast
        // but set it as fallback if not received
        if (result.experimentId && !experimentId) {
          console.log('⚠️ Setting experiment ID from API response (WebSocket broadcast may have failed)');
          setExperimentId(result.experimentId)
        } else {
          console.log('✅ Experiment ID already set from WebSocket broadcast:', experimentId);
        }
        
        // WebSocket will handle all real-time updates - no polling needed!
        console.log('Experiment started, WebSocket will handle all updates')
      } else {
        const error = await response.json()
        console.error('Failed to start experiment:', error)
        setExperimentError(`Failed to start experiment: ${error.message || 'Unknown error'}`)
        setExperimentStatus("")
        setIsExperimentRunning(false)
      }
    } catch (error) {
      console.error('Error starting experiment:', error)
      setExperimentError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setExperimentStatus("")
      setIsExperimentRunning(false)
    }
  }

  const stopExperiment = async () => {
    try {
      const response = await fetch('/api/experiment/stop', {
        method: 'POST',
      })
      
      if (response.ok) {
        const result = await response.json()
        setIsExperimentRunning(false)
        setHasCompletedExperiment(true)
        
        // Update last experiment data with end time
        setLastExperimentData(prev => prev ? {
          ...prev,
          endTime: new Date()
        } : null)
        
        if (result.alreadyStopped) {
          setExperimentStatus(`✅ ${result.message}`)
          console.log('Experiment was already completed:', result.finalState)
        } else {
          setExperimentStatus('🛑 Experiment stopped by user')
          console.log('Experiment stopped successfully')
        }
        
        // Clear status after a few seconds
        setTimeout(() => setExperimentStatus(""), 5000)
      } else {
        console.error('Failed to stop experiment')
        setExperimentError('Failed to stop experiment')
      }
    } catch (error) {
      console.error('Error stopping experiment:', error)
      setExperimentError('Error stopping experiment')
    }
  }

  // Fallback status check for when WebSocket fails
  const fallbackStatusCheck = useCallback(async () => {
    if (!isExperimentRunning || isConnected) {
      return; // Only use fallback if experiment is running and WebSocket is disconnected
    }
    
    console.log('🔄 Using fallback status check (WebSocket disconnected)');
    try {
      const response = await fetch('/api/experiment/status');
      if (response.ok) {
        const status = await response.json();
        if (status.experiment) {
          // Update state from fallback
          if (status.experiment.conversation) {
            const conversationWithDates = status.experiment.conversation.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            setConversation(conversationWithDates);
          }
          
          // Update experiment status
          if (!status.experiment.isRunning && isExperimentRunning) {
            setIsExperimentRunning(false);
            setExperimentStatus('✅ Experiment completed (via fallback)');
          }
        }
      }
    } catch (error) {
      console.error('Fallback status check failed:', error);
    }
  }, [isExperimentRunning, isConnected]);

  // Use fallback status check when WebSocket is disconnected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isExperimentRunning && !isConnected) {
      console.log('⚠️ WebSocket disconnected during experiment, starting fallback polling');
      interval = setInterval(fallbackStatusCheck, 3000); // Check every 3 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isExperimentRunning, isConnected, fallbackStatusCheck]);

  const getModelName = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId)
    return model ? model.name : modelId
  }

  // Manual turn triggering removed - experiment manager handles turns automatically!

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
              onDownloadReportHTML={handleDownloadReportHTML}
              onDownloadReportPDF={handleDownloadReportPDF}
              hasCompletedExperiment={hasCompletedExperiment}
              isDemoMode={isDemoMode}
            />
            <ConversationLog 
              conversation={conversation} 
              isExperimentRunning={isExperimentRunning}
              experimentStatus={experimentStatus}
              experimentError={experimentError}
              streamingMessages={Array.from(streamingMessages.values())}
              isWebSocketConnected={isConnected}
              webSocketError={connectionError}
            />
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
          <DemoScenarios 
            onLoadScenario={loadDemoScenario} 
            onLoadPrompts={loadDemoPrompts}
            onClearData={clearSampleData} 
          />
        </div>
      </div>
    </div>
  )
}
