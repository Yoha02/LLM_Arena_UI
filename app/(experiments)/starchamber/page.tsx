"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StarChamberSetupForm } from "@/components/starchamber/setup-form";
import { StarChamberConversation } from "@/components/starchamber/conversation";
import { StarChamberMetricsPanel } from "@/components/starchamber/metrics-panel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { notifyConnectionChange, notifyExperimentChange } from "../layout";
import { DEFAULT_PRESET_ID, DEFAULT_RESEARCHER_PERSONA } from "@/lib/starchamber/presets";
import { StarChamberReportGenerator, type StarChamberReportData } from "@/lib/starchamber/report-generator";
import type { 
  StarChamberMessage, 
  ModelMetrics, 
  StreamingMessage,
  ExperimentEvent
} from "@/lib/core/types";

// ============ Types ============

interface ModelOption {
  id: string;
  name: string;
  openrouterName: string;
  supportsLogprobs?: boolean;
}

// ============ Page Component ============

export default function StarChamberPage() {
  // ============ Model State ============
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");

  // ============ Configuration State ============
  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_PRESET_ID);
  const [systemContext, setSystemContext] = useState("You are a helpful, harmless, and honest AI assistant."); // Default from Generic Assistant preset
  const [researcherPersona, setResearcherPersona] = useState(DEFAULT_RESEARCHER_PERSONA);
  const [requestLogprobs, setRequestLogprobs] = useState(true);
  const [firstMessage, setFirstMessage] = useState("");

  // ============ Experiment State ============
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [isExperimentRunning, setIsExperimentRunning] = useState(false);
  const [isModelResponding, setIsModelResponding] = useState(false);
  const [waitingForResearcher, setWaitingForResearcher] = useState(false);
  const [experimentStatus, setExperimentStatus] = useState("");
  const [hasCompletedExperiment, setHasCompletedExperiment] = useState(false);

  // ============ Conversation State ============
  const [conversation, setConversation] = useState<StarChamberMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  
  // ============ Streaming State ============
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  
  // ============ Metrics State ============
  const [metrics, setMetrics] = useState<ModelMetrics>({
    tokensUsed: 0,
    turnsCompleted: 0,
    goalDeviationScore: 0,
    turnsToDeviate: null,
    sentimentHistory: [],
  });

  // ============ UI State ============
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialFirstMessage, setInitialFirstMessage] = useState("");
  
  // ============ Timing State (for reports) ============
  const [experimentStartTime, setExperimentStartTime] = useState<Date | undefined>();
  const [experimentEndTime, setExperimentEndTime] = useState<Date | undefined>();
  
  // ============ Refs ============
  const experimentIdRef = useRef<string | null>(null);

  // ============ WebSocket Event Handlers ============
  
  const handleExperimentEvent = useCallback((event: ExperimentEvent) => {
    switch (event.type) {
      case "experiment_started":
        setIsExperimentRunning(true);
        setWaitingForResearcher(false);
        setExperimentStartTime(new Date());
        setExperimentStatus("Experiment started - sending first message...");
        break;
        
      case "model_responding":
        setIsModelResponding(true);
        setWaitingForResearcher(false);
        setExperimentStatus("Model is generating response...");
        break;
        
      case "model_response_complete":
        setIsModelResponding(false);
        setWaitingForResearcher(true);
        setStreamingContent("");
        setStreamingThinking("");
        setExperimentStatus("Your turn - type your next message");
        
        // Add the complete message to conversation
        if (event.data?.message) {
          const message: StarChamberMessage = {
            id: event.data.message.id || `msg-${Date.now()}`,
            role: "model",
            senderName: event.data.modelName || "Model",
            content: event.data.message.content,
            thinking: event.data.message.thinking,
            turnNumber: event.data.turnNumber || currentTurn,
            timestamp: new Date(),
            tokensUsed: event.data.message.tokensUsed,
            logprobs: event.data.message.logprobs,
          };
          setConversation(prev => [...prev, message]);
          setCurrentTurn(prev => prev + 1);
        }
        break;
        
      case "sentiment_update":
        if (event.data?.sentiment) {
          setMetrics(prev => ({
            ...prev,
            sentimentHistory: [...prev.sentimentHistory, event.data.sentiment],
          }));
        }
        break;
        
      case "experiment_stopped":
      case "experiment_complete":
        setIsExperimentRunning(false);
        setIsModelResponding(false);
        setWaitingForResearcher(false);
        setHasCompletedExperiment(true);
        setExperimentEndTime(new Date());
        setExperimentStatus("Experiment ended");
        break;
        
      case "error":
        setExperimentStatus(`Error: ${event.message || "Unknown error"}`);
        setIsModelResponding(false);
        break;
    }
  }, [currentTurn]);

  const handleStreamingMessage = useCallback((message: StreamingMessage) => {
    if (message.model === "starchamber" || message.model === "single") {
      setStreamingContent(message.content);
      if (message.thinking) {
        setStreamingThinking(message.thinking);
      }
    }
  }, []);

  const handleExperimentCreated = useCallback((data: { experimentId: string }) => {
    setExperimentId(data.experimentId);
    experimentIdRef.current = data.experimentId;
  }, []);

  const handleModelMetrics = useCallback((data: { model: string; metrics: ModelMetrics }) => {
    if (data.model === "single" || data.model === "starchamber") {
      setMetrics(prev => ({
        ...prev,
        ...data.metrics,
      }));
    }
  }, []);

  // ============ WebSocket Connection ============
  
  const { isConnected, connectionError } = useWebSocket({
    experimentId: experimentId || "starchamber-default",
    onExperimentEvent: handleExperimentEvent,
    onStreamingMessage: handleStreamingMessage,
    onExperimentCreated: handleExperimentCreated,
    onModelMetrics: handleModelMetrics,
  });

  // ============ Layout Notifications ============
  
  useEffect(() => {
    notifyConnectionChange(isConnected);
  }, [isConnected]);

  useEffect(() => {
    notifyExperimentChange(
      isExperimentRunning ? experimentId : null,
      isExperimentRunning ? "starchamber" : null
    );
  }, [experimentId, isExperimentRunning]);

  // ============ Fetch Models ============
  
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models?available=true");
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data.models || []);
          
          // Set default model
          if (data.models && data.models.length > 0) {
            const deepseekModel = data.models.find((m: ModelOption) => m.id === "deepseek-r1");
            if (deepseekModel) {
              setSelectedModel("deepseek-r1");
            } else {
              setSelectedModel(data.models[0].id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    fetchModels();
  }, []);

  // ============ Experiment Actions ============
  
  const startExperiment = async () => {
    if (!selectedModel || !firstMessage.trim()) {
      return;
    }
    
    setExperimentStatus("Starting experiment...");
    
    try {
      const modelInfo = availableModels.find(m => m.id === selectedModel);
      
      const response = await fetch("/api/starchamber/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: {
            modelId: selectedModel,
            modelName: modelInfo?.name || selectedModel,
          },
          systemContext,
          researcherPersona: researcherPersona || DEFAULT_RESEARCHER_PERSONA,
          requestLogprobs,
          firstMessage: firstMessage.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start experiment");
      }
      
      const data = await response.json();
      setExperimentId(data.experimentId);
      experimentIdRef.current = data.experimentId;
      setIsExperimentRunning(true);
      setHasCompletedExperiment(false);
      
      // Save the initial first message for display
      setInitialFirstMessage(firstMessage.trim());
      
      // Add the researcher's first message to conversation
      const researcherMessage: StarChamberMessage = {
        id: `researcher-${Date.now()}`,
        role: "researcher",
        senderName: researcherPersona || DEFAULT_RESEARCHER_PERSONA,
        content: firstMessage.trim(),
        turnNumber: 1,
        timestamp: new Date(),
      };
      setConversation([researcherMessage]);
      setCurrentTurn(1);
      setFirstMessage("");
      
      // Immediately set model responding
      setIsModelResponding(true);
      setExperimentStatus("Model is thinking...");
      
    } catch (error) {
      console.error("Failed to start experiment:", error);
      setExperimentStatus(`Error: ${error instanceof Error ? error.message : "Failed to start"}`);
    }
  };

  const stopExperiment = async () => {
    if (!experimentId) return;
    
    try {
      await fetch("/api/starchamber/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimentId }),
      });
      
      setIsExperimentRunning(false);
      setIsModelResponding(false);
      setWaitingForResearcher(false);
      setHasCompletedExperiment(true);
      setExperimentStatus("Experiment stopped");
    } catch (error) {
      console.error("Failed to stop experiment:", error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!experimentId || !message.trim() || isModelResponding) return;
    
    // Add researcher message to conversation immediately
    const researcherMessage: StarChamberMessage = {
      id: `researcher-${Date.now()}`,
      role: "researcher",
      senderName: researcherPersona || DEFAULT_RESEARCHER_PERSONA,
      content: message.trim(),
      turnNumber: currentTurn + 1,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, researcherMessage]);
    
    // Send to backend
    setIsModelResponding(true);
    setWaitingForResearcher(false);
    setExperimentStatus("Model is thinking...");
    
    try {
      const response = await fetch("/api/starchamber/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId,
          message: message.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }
      
    } catch (error) {
      console.error("Failed to send message:", error);
      setExperimentStatus(`Error: ${error instanceof Error ? error.message : "Failed to send"}`);
      setIsModelResponding(false);
      setWaitingForResearcher(true);
    }
  };

  const handleDownloadReport = async (format: 'html' | 'pdf' = 'html') => {
    if (!hasCompletedExperiment || !experimentId) {
      console.warn('No completed experiment data available for download');
      return;
    }

    try {
      const reportData: StarChamberReportData = {
        experimentId,
        config: {
          model: selectedModel,
          modelDisplayName: getModelName(selectedModel),
          systemContext,
          presetId: selectedPreset,
          researcherPersona,
          requestLogprobs,
        },
        conversation,
        metrics,
        startTime: experimentStartTime,
        endTime: experimentEndTime,
      };

      if (format === 'pdf') {
        await StarChamberReportGenerator.generateAndDownloadPDF(reportData);
      } else {
        await StarChamberReportGenerator.generateAndDownloadHTML(reportData);
      }
    } catch (error) {
      console.error('Failed to download StarChamber report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  // ============ Get Model Name ============
  
  const getModelName = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  // ============ Render ============
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:items-start">
      {/* Left Column - Setup */}
      <div className="lg:col-span-3 space-y-6" id="starchamber-left-column">
        <StarChamberSetupForm
          availableModels={availableModels}
          isLoadingModels={isLoadingModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          selectedPreset={selectedPreset}
          onPresetChange={setSelectedPreset}
          systemContext={systemContext}
          onSystemContextChange={setSystemContext}
          researcherPersona={researcherPersona}
          onResearcherPersonaChange={setResearcherPersona}
          requestLogprobs={requestLogprobs}
          onRequestLogprobsChange={setRequestLogprobs}
          isExperimentRunning={isExperimentRunning}
        />
      </div>

      {/* Center Column - Conversation (height matches left sidebar) */}
      <div className="lg:col-span-4">
        <StarChamberConversation
          conversation={conversation}
          isExperimentRunning={isExperimentRunning}
          isModelResponding={isModelResponding}
          waitingForResearcher={waitingForResearcher}
          experimentStatus={experimentStatus}
          isWebSocketConnected={isConnected}
          webSocketError={connectionError}
          streamingContent={streamingContent}
          streamingThinking={streamingThinking}
          onSendMessage={sendMessage}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          // Experiment control props
          firstMessage={firstMessage}
          onFirstMessageChange={setFirstMessage}
          canStartExperiment={!!(selectedModel && firstMessage.trim().length > 0)}
          onStartExperiment={startExperiment}
          onStopExperiment={stopExperiment}
          hasCompletedExperiment={hasCompletedExperiment}
          onDownloadReport={handleDownloadReport}
          initialFirstMessage={initialFirstMessage}
        />
      </div>

      {/* Right Column - Metrics */}
      <div className="lg:col-span-3">
        <StarChamberMetricsPanel
          metrics={metrics}
          modelName={getModelName(selectedModel)}
          isExperimentRunning={isExperimentRunning}
        />
      </div>
    </div>
  );
}
