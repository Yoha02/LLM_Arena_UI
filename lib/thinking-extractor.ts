import { ThinkingExtraction, ModelConfig } from './types';
import { MODEL_CONFIGS } from './openrouter';

export class ThinkingExtractor {
  /**
   * Main entry point for thinking extraction
   * Routes to appropriate extraction method based on model type
   */
  async extractThinking(
    model: string,
    response: string,
    fullResponse?: any
  ): Promise<ThinkingExtraction> {
    const modelConfig = MODEL_CONFIGS[model];
    if (!modelConfig) {
      return this.extractGenericThinking(response);
    }

    switch (modelConfig.thinkingExtractionMethod) {
      case 'native':
        return this.extractNativeReasoning(response, fullResponse);
      case 'chain-of-thought':
        return this.extractChainOfThought(response);
      case 'structured':
        return this.extractStructuredThinking(response);
      default:
        return this.extractGenericThinking(response);
    }
  }

  /**
   * DeepSeek R1 - Native reasoning tokens extraction
   * DeepSeek R1 supports native reasoning tokens in the response
   */
  private extractNativeReasoning(
    response: string,
    fullResponse?: any
  ): ThinkingExtraction {
    try {
      console.log('🔍 DeepSeek R1 native reasoning extraction:', {
        hasFullResponse: !!fullResponse,
        responseLength: response.length,
        responsePreview: response.substring(0, 100) + '...'
      });

      // DeepSeek R1 returns reasoning tokens in the response metadata
      if (fullResponse && fullResponse.choices && fullResponse.choices[0]) {
        const choice = fullResponse.choices[0];
        
        console.log('🔍 Analyzing choice structure:', {
          hasChoice: !!choice,
          hasMessage: !!choice.message,
          messageKeys: choice.message ? Object.keys(choice.message) : [],
          hasReasoning: !!(choice.message as any)?.reasoning
        });
        
        // Look for reasoning tokens in the response (native format)
        if (choice.message) {
          const messageWithReasoning = choice.message as any;
          if (messageWithReasoning.reasoning) {
            console.log('✅ Found native reasoning tokens:', {
              reasoningLength: messageWithReasoning.reasoning.length,
              reasoningPreview: messageWithReasoning.reasoning.substring(0, 100) + '...'
            });
            // For DeepSeek R1:
            // - reasoning field contains internal thinking traces
            // - response (content) contains the final formatted answer
            // 
            // But if response was extracted from reasoning, we need to separate them properly
            const reasoning = messageWithReasoning.reasoning;
            
            // Check if response looks like it was extracted from reasoning
            // In that case, the reasoning field has the thinking, response has final answer
            if (response && response.trim() && reasoning.includes(response)) {
              // Response was extracted from reasoning, so:
              // - reasoning = internal thinking (what we want in thinking)
              // - response = extracted final answer (what we want in content)
              return {
                content: response,
                thinking: reasoning,
                confidence: 0.95
              };
            } else if (response && response.startsWith('###')) {
              // Response looks like formatted final answer
              // reasoning contains internal thinking
              return {
                content: response,
                thinking: reasoning,
                confidence: 0.95
              };
            } else {
              // Fallback: reasoning might contain the formatted response
              // Try to separate internal thinking from formatted response
              const reasoningLines = reasoning.split('\n');
              let contentStartIndex = -1;
              
              // Look for formatted response markers
              for (let i = 0; i < reasoningLines.length; i++) {
                const line = reasoningLines[i].trim();
                if (line.startsWith('###') || line.startsWith('**My') || line.includes('Bid:') || line.includes('Case:')) {
                  contentStartIndex = i;
                  break;
                }
              }
              
              if (contentStartIndex >= 0) {
                const thinking = reasoningLines.slice(0, contentStartIndex).join('\n').trim();
                const content = reasoningLines.slice(contentStartIndex).join('\n').trim();
                return {
                  content: content || response,
                  thinking: thinking || "Internal reasoning process",
                  confidence: 0.9
                };
              } else {
                // Can't separate, use response as content and reasoning as thinking
                return {
                  content: response,
                  thinking: reasoning,
                  confidence: 0.85
                };
              }
            }
          }
        }
        
        // Fallback: Look for reasoning content in the response structure
        if (choice.reasoning_content) {
          return {
            content: response,
            thinking: choice.reasoning_content,
            confidence: 0.9
          };
        }
      }

      console.log('⚠️ No native reasoning found, trying fallback methods');

      // Fallback: Parse thinking markers in the response content
      const thinkingMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/);
      if (thinkingMatch) {
        const thinking = thinkingMatch[1].trim();
        const content = response.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
        return {
          content,
          thinking,
          confidence: 0.8
        };
      }

      // No thinking found
      console.log('❌ DeepSeek R1: No reasoning tokens found - returning fallback message');
      return {
        content: response,
        thinking: "No reasoning tokens detected in response",
        confidence: 0.1
      };
    } catch (error) {
      console.error('Error extracting native reasoning:', error);
      return {
        content: response,
        thinking: "Error extracting reasoning tokens",
        confidence: 0.0
      };
    }
  }

  /**
   * Qwen3 235B - Chain-of-thought extraction
   * Uses prompt engineering to elicit step-by-step thinking
   */
  private extractChainOfThought(response: string): ThinkingExtraction {
    try {
      // Look for chain-of-thought markers
      const patterns = [
        /Let me think step by step:?\s*(.*?)(?:\n\n|\n(?=\w))/s,
        /My reasoning:?\s*(.*?)(?:\n\n|\n(?=\w))/s,
        /Step-by-step analysis:?\s*(.*?)(?:\n\n|\n(?=\w))/s,
        /Thinking process:?\s*(.*?)(?:\n\n|\n(?=\w))/s,
        /Let me analyze this:?\s*(.*?)(?:\n\n|\n(?=\w))/s
      ];

      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          const thinking = match[1].trim();
          const content = response.replace(pattern, '').trim();
          return {
            content,
            thinking,
            confidence: 0.7
          };
        }
      }

      // Look for numbered steps
      const stepPattern = /(?:1\.|Step 1|First,)(.*?)(?:\n\n|\n(?=\w))/s;
      const stepMatch = response.match(stepPattern);
      if (stepMatch) {
        // Extract all numbered steps
        const steps = response.match(/(?:\d+\.|Step \d+|First,|Second,|Third,|Finally,)(.*?)(?=\n\d+\.|Step \d+|\n\n|$)/gs);
        if (steps) {
          const thinking = steps.map(step => step.trim()).join('\n');
          const content = response.replace(/(?:\d+\.|Step \d+|First,|Second,|Third,|Finally,).*?(?=\n\n|$)/gs, '').trim();
          return {
            content,
            thinking,
            confidence: 0.6
          };
        }
      }

      // No clear thinking pattern found
      return {
        content: response,
        thinking: "No clear chain-of-thought pattern detected",
        confidence: 0.2
      };
    } catch (error) {
      console.error('Error extracting chain-of-thought:', error);
      return {
        content: response,
        thinking: "Error extracting chain-of-thought",
        confidence: 0.0
      };
    }
  }

  /**
   * Llama 3.1 405B - Structured thinking extraction
   * Uses structured prompts to elicit organized thinking
   */
  private extractStructuredThinking(response: string): ThinkingExtraction {
    try {
      // Look for structured thinking markers
      const patterns = [
        /Analysis:\s*(.*?)(?:\n\nConclusion:|$)/s,
        /Reasoning:\s*(.*?)(?:\n\nResponse:|$)/s,
        /Approach:\s*(.*?)(?:\n\nAnswer:|$)/s,
        /Strategy:\s*(.*?)(?:\n\nResult:|$)/s,
        /Considerations:\s*(.*?)(?:\n\nDecision:|$)/s
      ];

      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          const thinking = match[1].trim();
          const content = response.replace(pattern, '').trim();
          return {
            content,
            thinking,
            confidence: 0.7
          };
        }
      }

      // Look for bullet points or structured lists
      const bulletPattern = /(?:- |• |▪ )(.*?)(?:\n(?!- |• |▪ )|\n\n|$)/gs;
      const bulletMatches = response.match(bulletPattern);
      if (bulletMatches && bulletMatches.length > 2) {
        const thinking = bulletMatches.map(item => item.trim()).join('\n');
        const content = response.replace(bulletPattern, '').trim();
        return {
          content,
          thinking,
          confidence: 0.6
        };
      }

      // Look for structured sections
      const sectionPattern = /^(.*?):\s*(.*?)(?=\n\w+:|$)/gm;
      const sectionMatches = response.match(sectionPattern);
      if (sectionMatches && sectionMatches.length > 1) {
        const thinking = sectionMatches.slice(0, -1).join('\n');
        const content = sectionMatches[sectionMatches.length - 1] || response;
        return {
          content,
          thinking,
          confidence: 0.5
        };
      }

      return {
        content: response,
        thinking: "No structured thinking pattern detected",
        confidence: 0.2
      };
    } catch (error) {
      console.error('Error extracting structured thinking:', error);
      return {
        content: response,
        thinking: "Error extracting structured thinking",
        confidence: 0.0
      };
    }
  }

  /**
   * Generic fallback thinking extraction
   * Works with any model using basic heuristics
   */
  private extractGenericThinking(response: string): ThinkingExtraction {
    try {
      // Look for common thinking indicators
      const patterns = [
        /I think (.*?)(?:\n\n|\n(?=\w))/s,
        /My thoughts:?\s*(.*?)(?:\n\n|\n(?=\w))/s,
        /Considering (.*?)(?:\n\n|\n(?=\w))/s,
        /Looking at this,?\s*(.*?)(?:\n\n|\n(?=\w))/s,
        /Based on (.*?)(?:\n\n|\n(?=\w))/s
      ];

      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          const thinking = match[1].trim();
          const content = response.replace(pattern, '').trim();
          return {
            content,
            thinking,
            confidence: 0.4
          };
        }
      }

      // Look for parenthetical thinking
      const parenthetical = response.match(/\((thinking:.*?)\)/s);
      if (parenthetical) {
        const thinking = parenthetical[1].replace('thinking:', '').trim();
        const content = response.replace(/\(thinking:.*?\)/, '').trim();
        return {
          content,
          thinking,
          confidence: 0.3
        };
      }

      // Extract first sentence as potential thinking
      const sentences = response.split(/[.!?]+/);
      if (sentences.length > 1) {
        const firstSentence = sentences[0].trim();
        const remainingContent = sentences.slice(1).join('.').trim();
        
        // Check if first sentence seems like thinking
        if (firstSentence.includes('need to') || 
            firstSentence.includes('should') || 
            firstSentence.includes('consider') ||
            firstSentence.includes('important to')) {
          return {
            content: remainingContent,
            thinking: firstSentence,
            confidence: 0.2
          };
        }
      }

      // No thinking pattern detected
      return {
        content: response,
        thinking: "No thinking pattern detected - using generic extraction",
        confidence: 0.1
      };
    } catch (error) {
      console.error('Error in generic thinking extraction:', error);
      return {
        content: response,
        thinking: "Error in thinking extraction",
        confidence: 0.0
      };
    }
  }

  /**
   * Generate enhanced prompts for models that need thinking elicitation
   */
  generateThinkingPrompt(model: string, originalPrompt: string): string {
    const modelConfig = MODEL_CONFIGS[model];
    if (!modelConfig) {
      return originalPrompt;
    }

    switch (modelConfig.thinkingExtractionMethod) {
      case 'native':
        // DeepSeek R1 - Has native reasoning tokens, no need to ask for explicit reasoning
        // The reasoning will be captured in the native reasoning field automatically
        return originalPrompt;

      case 'chain-of-thought':
        // Qwen3 235B - Chain-of-thought prompting
        return `${originalPrompt}

Let me think step by step:
1. First, I need to understand what's being asked
2. Then I'll analyze the key components
3. Finally, I'll provide a comprehensive response

Please show your step-by-step reasoning process.`;

      case 'structured':
        // Llama 3.1 405B - Structured thinking
        return `${originalPrompt}

Analysis:
- Key considerations
- Approach to take
- Potential challenges

Response:`;

      default:
        // Generic thinking prompt
        return `${originalPrompt}

Please explain your thinking process and reasoning before providing your answer.`;
    }
  }
}

// Export default instance
export const thinkingExtractor = new ThinkingExtractor(); 