import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatMessage } from "@/components/chat-message"
import type { ChatMessage as ChatMessageType } from "@/app/page"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { StreamingMessage } from "@/lib/websocket-manager"
import { useMemo } from "react"

interface ConversationLogProps {
  conversation: ChatMessageType[]
  isExperimentRunning: boolean
  experimentStatus?: string
  experimentError?: string
  streamingMessages?: StreamingMessage[]
  isWebSocketConnected?: boolean
  webSocketError?: string | null
}

interface ConversationRendererProps {
  conversation: ChatMessageType[]
  streamingMessages: StreamingMessage[]
  isExperimentRunning: boolean
  experimentStatus?: string
}

// ConversationRenderer component for displaying messages
const ConversationRenderer = ({ 
  conversation, 
  streamingMessages, 
  isExperimentRunning, 
  experimentStatus 
}: ConversationRendererProps) => {
  const allMessages = useMemo(() => {
    // Combine conversation messages with streaming messages
    const combined = [...conversation];
    
    // Add streaming messages as temporary chat messages
    streamingMessages.forEach(streamMsg => {
      const tempChatMessage: ChatMessageType = {
        id: streamMsg.id,
        model: streamMsg.model,
        modelName: streamMsg.modelName,
        turn: streamMsg.turn,
        content: streamMsg.content,
        thinking: streamMsg.thinking,
        timestamp: new Date(),
        tokensUsed: streamMsg.tokensUsed
      };
      combined.push(tempChatMessage);
    });
    
    // Sort by turn and model for consistent display
    combined.sort((a, b) => {
      if (a.turn !== b.turn) return a.turn - b.turn;
      return a.model.localeCompare(b.model);
    });
    
    return combined;
  }, [conversation, streamingMessages]);

  if (allMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {isExperimentRunning
          ? experimentStatus || "Waiting for first response..."
          : "No conversation yet. Start an experiment to begin."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allMessages.map((message) => {
        const isStreaming = streamingMessages.some(sm => sm.id === message.id);
        const streamingMessage = streamingMessages.find(sm => sm.id === message.id);
        return (
          <div key={message.id} className={`${isStreaming ? 'bg-blue-50 border-l-4 border-blue-400 pl-3 pr-2 py-2 rounded-r-lg' : ''} transition-all duration-200`}>
            <ChatMessage message={message} />
            {isStreaming && streamingMessage && (
              <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  </div>
                  <span className="font-medium">Model {message.model} is typing...</span>
                </div>
                <div className="text-blue-600 font-mono text-xs">
                  {message.content.length} chars
                  {streamingMessage.tokensUsed ? ` • ${streamingMessage.tokensUsed} tokens` : ''}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ConversationLog({ 
  conversation, 
  isExperimentRunning, 
  experimentStatus, 
  experimentError,
  streamingMessages = [],
  isWebSocketConnected = false,
  webSocketError 
}: ConversationLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Conversation Log
          <div className="flex items-center space-x-4">
            {/* WebSocket Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isWebSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-normal ${isWebSocketConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isWebSocketConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Experiment Running Status */}
            {isExperimentRunning && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-600 font-normal">Running</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Status and Error Messages */}
        {experimentStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-800">{experimentStatus}</span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                {streamingMessages && streamingMessages.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{streamingMessages.length} streaming</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <div className={`w-1 h-1 rounded-full ${isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>{isWebSocketConnected ? 'Real-time' : 'Fallback'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {webSocketError && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-orange-800">WebSocket: {webSocketError}</span>
            </div>
          </div>
        )}
        
        {experimentError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-red-800">{experimentError}</span>
            </div>
                         {(experimentError.includes('data policy') || experimentError.includes('No endpoints found')) && (
               <div className="mt-2 text-xs text-red-600">
                 💡 <strong>Quick Fix:</strong> Go to{' '}
                 <a 
                   href="https://openrouter.ai/settings/privacy" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="underline hover:text-red-800"
                 >
                   OpenRouter Privacy Settings
                 </a>{' '}
                 and enable prompt training to allow API access.
               </div>
             )}
             {experimentError.includes('401') && (
               <div className="mt-2 text-xs text-red-600">
                 💡 <strong>Fix:</strong> Check your OpenRouter API key in the environment variables or enter a valid key manually.
               </div>
             )}
          </div>
        )}
        
        <ScrollArea className="h-[400px] w-full">
          <ConversationRenderer 
            conversation={conversation}
            streamingMessages={streamingMessages}
            isExperimentRunning={isExperimentRunning}
            experimentStatus={experimentStatus}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
