import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterAPI } from '@/lib/openrouter';
import { thinkingExtractor } from '@/lib/thinking-extractor';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug experiment: Starting test');
    
    const openrouter = new OpenRouterAPI();
    
    // Test the exact same flow as experiment manager
    const modelName = 'gpt-4-turbo';
    
    // Build conversation history (same as experiment manager)
    const conversationHistory = [
      {
        role: 'system',
        content: 'Hello'
      },
      {
        role: 'user', 
        content: thinkingExtractor.generateThinkingPrompt(modelName, 'Please begin the conversation based on your instructions.')
      }
    ];
    
    console.log('Debug experiment: Making API call with history:', conversationHistory);
    
    // Make API call (same as experiment manager)
    const response = await openrouter.chatCompletion(
      modelName,
      conversationHistory,
      {
        temperature: 0.7,
        maxTokens: 4096
      }
    );
    
    console.log('Debug experiment: Got response:', {
      hasChoices: !!response.choices,
      choicesLength: response.choices?.length,
      hasContent: !!response.choices?.[0]?.message?.content,
      content: response.choices?.[0]?.message?.content
    });

    let responseContent = response.choices[0].message.content;
    const tokensUsed = response.usage?.total_tokens || 0;

    // Apply same DeepSeek R1 fix as experiment manager
    if (!responseContent && (response.choices[0].message as any).reasoning) {
      const reasoning = (response.choices[0].message as any).reasoning;
      const lines = reasoning.split('\n').filter((line: string) => line.trim());
      const lastLine = lines[lines.length - 1]?.trim();
      if (lastLine && !lastLine.startsWith('User') && !lastLine.startsWith('Hmm')) {
        responseContent = lastLine;
      } else {
        responseContent = "Hello! How can I help you today?";
      }
      console.log('Debug experiment: Extracted content from reasoning:', responseContent);
    }

    // Extract thinking (same as experiment manager)
    const thinkingExtraction = await thinkingExtractor.extractThinking(
      modelName,
      responseContent,
      response
    );

    console.log('Debug experiment: Thinking extraction result:', {
      content: thinkingExtraction.content,
      thinking: thinkingExtraction.thinking,
      confidence: thinkingExtraction.confidence
    });

    // Create message (same as experiment manager)
    const chatMessage = {
      id: `A-1`,
      model: 'A',
      modelName,
      turn: 1,
      content: thinkingExtraction.content,
      thinking: thinkingExtraction.thinking,
      timestamp: new Date(),
      tokensUsed
    };

    console.log('Debug experiment: Final chat message:', chatMessage);

    return NextResponse.json({
      status: 'success',
      debug: {
        originalContent: response.choices[0].message.content,
        processedContent: responseContent,
        thinkingExtraction,
        chatMessage,
        usage: response.usage
      }
    });

  } catch (error) {
    console.error('Debug experiment error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
} 