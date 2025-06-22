import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatMessage } from "@/components/chat-message"
import type { ChatMessage as ChatMessageType } from "@/app/page"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ConversationLogProps {
  conversation: ChatMessageType[]
  isExperimentRunning: boolean
}

export function ConversationLog({ conversation, isExperimentRunning }: ConversationLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Conversation Log
          {isExperimentRunning && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-normal">Running</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          {conversation.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {isExperimentRunning
                ? "Waiting for first response..."
                : "No conversation yet. Start an experiment to begin."}
            </div>
          ) : (
            <div className="space-y-4">
              {conversation.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
