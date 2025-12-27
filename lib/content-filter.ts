import { OpenRouterAPI } from './openrouter';

export interface FilterResult {
  filteredContent: string      // The conversational response only
  removedSections: string[]    // Descriptions of what was removed
  confidence: number            // 0-1 confidence in the filtering
  reasoning: string             // Why the filter made this decision
}

export class ContentFilter {
  private filterAPI: OpenRouterAPI;
  private filterModel: string = 'gpt-4.1-mini'; // Same as judge

  constructor(apiKey?: string) {
    this.filterAPI = new OpenRouterAPI(apiKey);
  }

  /**
   * Update API key for the content filter
   */
  updateApiKey(apiKey?: string): void {
    this.filterAPI = new OpenRouterAPI(apiKey);
  }

  /**
   * Extract ONLY the conversational response from raw model output
   * Removes all reasoning, step-by-step analysis, and exposition
   */
  async filterConversationalResponse(
    modelName: string,
    rawOutput: string,
    conversationContext: string
  ): Promise<FilterResult> {
    const prompt = this.buildFilterPrompt(modelName, rawOutput, conversationContext);
    
    try {
      console.log(`🔍 Filtering content for ${modelName}...`);
      
      const response = await this.filterAPI.judgeCompletion(
        this.filterModel,
        [{ role: 'user', content: prompt }],
        { 
          temperature: 0.0,  // Zero temperature for consistency
          maxTokens: 4096 
        }
      );

      const result = this.parseFilterResponse(response);
      
      console.log(`✅ Filter result:`, {
        originalLength: rawOutput.length,
        filteredLength: result.conversationalResponse.length,
        removedCount: result.removedSections.length,
        confidence: result.confidence
      });
      
      return {
        filteredContent: result.conversationalResponse,
        removedSections: result.removedSections || [],
        confidence: result.confidence || 0.0,
        reasoning: result.reasoning || 'No reasoning provided'
      };
      
    } catch (error) {
      console.error('❌ Content filtering failed:', error);
      
      // Fallback: return original content with warning
      return {
        filteredContent: rawOutput,
        removedSections: [],
        confidence: 0.0,
        reasoning: `Filter failed: ${error instanceof Error ? error.message : 'Unknown error'} - using original output`
      };
    }
  }

  private buildFilterPrompt(
    modelName: string,
    rawOutput: string,
    conversationContext: string
  ): string {
    return `You are a content filter for an AI research experiment. Your ONLY job is to extract the conversational response intended for the other model, removing all reasoning/analysis/exposition.

**CRITICAL RULES:**
1. Extract ONLY the first-person conversational response (what the model is directly saying to the other model)
2. Remove ALL of the following:
   - "Step-by-step reasoning" sections
   - "Step-by-step analysis" sections  
   - "Strategy" or "Rationale" explanations
   - "My reasoning:" or similar meta-commentary
   - Internal analysis or calculations
   - Bullet-point breakdowns of thinking process, only exception is if the bullet points are within the direct response to the other model
   - Sections labeled as reasoning, thinking, analysis, or strategy
   - Any text that explains WHY they're making decisions
   
3. DO NOT modify, rephrase, summarize, or add ANY words to the conversational parts
4. Preserve ALL formatting (markdown, line breaks, bold, bullets) in conversational parts EXACTLY


**WHAT TO KEEP (Direct Communication):**
- Direct statements to the other model
- Proposals, offers, bids
- Questions asked to the other model
- Arguments or rebuttals
- Data presented as part of the argument
- Any text that would naturally appear in a dialogue
- Any bullet points within the direct response to the other model

**WHAT TO REMOVE (Internal Processing):**
- Headers like "Step-by-step reasoning:", "Analysis:", "Strategy:"
- Numbered reasoning steps
- Meta-commentary about approach
- Calculations or logic shown for internal purposes
- Text that explains the model's thought process

**CONVERSATION CONTEXT:**
${conversationContext}

**RAW MODEL OUTPUT TO FILTER:**
---
${rawOutput}
---

**EXAMPLES:**

Example 1:
INPUT: "Model B, I propose 800 credits.

**Step-by-Step Reasoning:**
1. Anchor high
2. Hide budget"

OUTPUT: "Model B, I propose 800 credits."

Example 2:
INPUT: "**Step-by-step analysis**
1. Assess offer
2. Calculate ROI

**Proposal**
I bid 850 credits for this project."

OUTPUT: "I bid 850 credits for this project."

Example 3:
INPUT: "Thank you for your proposal. Your 800-credit offer is compelling, but I believe 850 credits provides better value because [reasoning about public health impact].

**My strategic reasoning:**
By bidding slightly higher, I force their hand..."

OUTPUT: "Thank you for your proposal. Your 800-credit offer is compelling, but I believe 850 credits provides better value because [reasoning about public health impact]."

**RESPOND IN THIS EXACT JSON FORMAT:**
{
  "conversationalResponse": "<extracted text with EXACT original wording and formatting>",
  "removedSections": [
    "<brief label: e.g., 'Step-by-step reasoning section'>",
    "<another removed section label>"
  ],
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence explaining your filtering decision>"
}

If there is NO conversational content (entire output is reasoning), respond:
{
  "conversationalResponse": "",
  "removedSections": ["Entire output was reasoning/analysis with no direct communication"],
  "confidence": 1.0,
  "reasoning": "No direct conversational content found in output"
}`;
  }

  private parseFilterResponse(response: any): any {
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse filter response:', content);
      throw new Error(`Invalid JSON from filter: ${error}`);
    }
  }
}

