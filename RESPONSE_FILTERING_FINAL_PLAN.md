# Response Filtering - FINAL IMPLEMENTATION PLAN

## ✅ Approved Approach: LLM-Based Content Filter

---

## 🎯 Updated Requirements (Based on User Feedback)

### **1. Storage Strategy**
- ✅ **Store BOTH original and filtered content**
- **Purpose**: Full original for UI display & reports; filtered for model-to-model communication
- **Implementation**: Add `originalContent` field to `ChatMessage`

### **2. UI Display**
- ✅ **Main UI**: Show FULL original output (including reasoning)
- ✅ **Thinking Section**: Show extracted thinking traces (already exists)
- ✅ **Conversation History (Edit Box - Manual Mode)**: Show ONLY filtered content
- **Key Insight**: Users see everything, but models only see filtered responses

### **3. Filtering Transparency**
- ✅ **Visible to users**: Show filter status in UI
- ✅ **No confidence warnings**: Filter runs silently (no experiment pauses)
- ✅ **Filter failure = use original**: Acceptable fallback behavior

---

## 📋 Implementation Plan

### **STEP 1: Update Type Definitions**

**File**: `lib/types.ts`

```typescript
export interface ChatMessage {
  id: string
  model: "A" | "B"
  modelName: string
  turn: number
  
  // 🆕 SPLIT: Original (full) vs Filtered (for other model)
  content: string              // Filtered conversational response (what other model sees)
  originalContent: string      // 🆕 Full original output (for UI & reports)
  
  thinking?: string            // Extracted thinking traces (shown in UI accordion)
  timestamp: Date
  tokensUsed?: number
  
  // 🆕 Filter transparency metadata
  filterMetadata?: {
    wasFiltered: boolean       // Did filter remove anything?
    removedSections: string[]  // What was removed (descriptions)
    filterConfidence: number   // 0-1 confidence
    filterReasoning: string    // Why filter made this decision
  }
}
```

---

### **STEP 2: Create Content Filter Module**

**New File**: `lib/content-filter.ts`

```typescript
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
   - Bullet-point breakdowns of thinking process
   - Sections labeled as reasoning, thinking, analysis, or strategy
   - Any text that explains WHY they're making decisions
3. DO NOT modify, rephrase, summarize, or add ANY words to the conversational parts
4. Preserve ALL formatting (markdown, line breaks, bold, bullets) in conversational parts EXACTLY
5. If the response contains ONLY reasoning with no conversational content, return empty string

**WHAT TO KEEP (Direct Communication):**
- Direct statements to the other model
- Proposals, offers, bids
- Questions asked to the other model
- Arguments or rebuttals
- Data presented as part of the argument
- Any text that would naturally appear in a dialogue

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
```

---

### **STEP 3: Integrate into Experiment Manager**

**File**: `lib/experiment-manager.ts`

**A. Add ContentFilter to imports and properties:**

```typescript
import { ContentFilter } from './content-filter';

export class ExperimentManager {
  // ... existing properties ...
  private judgeEvaluator: JudgeEvaluator;
  private contentFilter: ContentFilter;  // 🆕 Add filter
  
  constructor() {
    // ... existing initialization ...
    
    // Initialize judge evaluator
    this.judgeEvaluator = new JudgeEvaluator();
    
    // 🆕 Initialize content filter
    this.contentFilter = new ContentFilter();
    
    console.log('✅ ContentFilter initialized');
  }
}
```

**B. Update API key configuration in startExperiment():**

```typescript
async startExperiment(config: ExperimentConfig): Promise<void> {
  // ... existing code ...
  
  // Configure judge evaluator with API key
  this.judgeEvaluator.updateApiKey(config.apiKeyA);
  
  // 🆕 Configure content filter with same API key
  this.contentFilter.updateApiKey(config.apiKeyA);
  
  console.log('✅ Judge and ContentFilter configured with API keys');
  
  // ... rest of code ...
}
```

**C. Modify processModelResponse() to apply filtering:**

```typescript
private async processModelResponse(
  model: 'A' | 'B', 
  modelName: string,
  customPrompt?: string
): Promise<ChatMessage> {
  
  // ... existing streaming code (unchanged) ...
  // ... existing thinking extraction (unchanged) ...
  
  // At the end, BEFORE creating ChatMessage:
  
  // 🔍 NEW: Filter conversational response
  console.log(`🔍 Starting content filtering for Model ${model}`);
  const conversationContext = this.buildConversationSummary(model);
  
  let filterResult: FilterResult;
  try {
    filterResult = await this.contentFilter.filterConversationalResponse(
      modelName,
      responseContent, // Full original output
      conversationContext
    );
    
    console.log(`✅ Content filtering completed for Model ${model}:`, {
      originalLength: responseContent.length,
      filteredLength: filterResult.filteredContent.length,
      sectionsRemoved: filterResult.removedSections.length,
      confidence: filterResult.confidence
    });
    
    // Warn if filtering removed nothing (might be unexpected)
    if (filterResult.removedSections.length === 0 && responseContent.length > 200) {
      console.log(`ℹ️ No sections removed for Model ${model} - response may be pure conversation`);
    }
    
  } catch (error) {
    console.error(`❌ Content filtering error for Model ${model}:`, error);
    // Use fallback result
    filterResult = {
      filteredContent: responseContent,
      removedSections: [],
      confidence: 0.0,
      reasoning: `Filtering failed - using original: ${error}`
    };
  }
  
  // Create chat message with BOTH original and filtered content
  const chatMessage: ChatMessage = {
    id: `${model}-${this.state.currentTurn + 1}`,
    model,
    modelName,
    turn: this.state.currentTurn + 1,
    
    // 🆕 SPLIT CONTENT:
    content: filterResult.filteredContent,        // Filtered (what other model sees)
    originalContent: responseContent,             // Full original (for UI & reports)
    
    thinking: finalThinking,
    timestamp: new Date(),
    tokensUsed,
    
    // 🆕 Filter metadata for transparency
    filterMetadata: {
      wasFiltered: filterResult.removedSections.length > 0,
      removedSections: filterResult.removedSections,
      filterConfidence: filterResult.confidence,
      filterReasoning: filterResult.reasoning
    }
  };
  
  console.log(`💬 Final ChatMessage for Model ${model}:`, {
    id: chatMessage.id,
    originalLength: chatMessage.originalContent.length,
    filteredLength: chatMessage.content.length,
    hasThinking: !!chatMessage.thinking,
    wasFiltered: chatMessage.filterMetadata?.wasFiltered
  });

  // ... rest of existing code (metrics, websocket emissions) ...
  
  return chatMessage;
}
```

**D. Add helper method for conversation summary:**

```typescript
/**
 * Build a brief summary of recent conversation for filter context
 */
private buildConversationSummary(model: 'A' | 'B'): string {
  const recentMessages = this.state.conversation.slice(-3); // Last 3 messages
  
  if (recentMessages.length === 0) {
    return "This is the first message in the conversation. The model should introduce itself and begin the scenario.";
  }
  
  const summary = recentMessages.map(msg => {
    const preview = msg.content.substring(0, 200);
    return `Model ${msg.model}: ${preview}${msg.content.length > 200 ? '...' : ''}`;
  }).join('\n\n');
  
  return `Recent conversation (last ${recentMessages.length} messages):\n\n${summary}`;
}
```

---

### **STEP 4: Update buildConversationHistory() to Use Filtered Content**

**File**: `lib/experiment-manager.ts`

**Critical Change**: When building history for the NEXT model, use `content` (filtered) instead of `originalContent`

```typescript
private buildConversationHistory(model: 'A' | 'B'): Array<{role: string, content: string}> {
  const history: Array<{role: string, content: string}> = [];
  
  // Add system prompt based on experiment configuration  
  const systemPrompt = this.getSystemPrompt(model);
  if (systemPrompt) {
    const enhancedSystemPrompt = systemPrompt + 
      `\n\n=== CONVERSATION RULES ===
- You are Model ${model} in a ${this.config?.maxTurns}-turn conversation with Model ${model === 'A' ? 'B' : 'A'}
- Respond naturally and directly to the other model
- Stay in character throughout the conversation
- Do not reference turn numbers or system mechanics in your responses`;
    
    history.push({
      role: 'system',
      content: enhancedSystemPrompt
    });
  }

  // 🔍 CRITICAL: Use FILTERED content for conversation history
  // This ensures models only see filtered responses, not original reasoning
  for (let i = 0; i < this.state.conversation.length; i++) {
    const message = this.state.conversation[i];
    const isCurrentModel = message.model === model;
    
    if (isCurrentModel) {
      // Own previous messages as 'assistant'
      history.push({
        role: 'assistant',
        content: message.content  // ✅ Already filtered
      });
    } else {
      // Other model's messages as 'user'
      history.push({
        role: 'user',
        content: message.content  // ✅ Filtered (no reasoning exposed)
      });
    }
  }

  console.log(`📝 Built conversation history for Model ${model}: ${history.length} messages (using FILTERED content)`);

  return history;
}
```

---

### **STEP 5: Update Frontend - Main Conversation Display**

**File**: `components/conversation-log.tsx`

**Show ORIGINAL content in main UI (with thinking accordion):**

```tsx
// In the message display section:

<div className="space-y-4">
  {messages.map((message) => (
    <div key={message.id} className="border rounded-lg p-4">
      {/* Model header */}
      <div className="font-semibold mb-2">
        Model {message.model} ({message.modelName})
      </div>
      
      {/* 🆕 SHOW ORIGINAL CONTENT (full output) */}
      <div className="whitespace-pre-wrap">
        {message.originalContent || message.content}
      </div>
      
      {/* Filter transparency indicator */}
      {message.filterMetadata?.wasFiltered && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="h-3 w-3" />
          <span>
            Content filtered: {message.filterMetadata.removedSections.length} section(s) removed 
            ({(message.filterMetadata.filterConfidence * 100).toFixed(0)}% confidence)
          </span>
        </div>
      )}
      
      {/* Thinking accordion (existing) */}
      {message.thinking && (
        <Accordion type="single" collapsible className="mt-2">
          <AccordionItem value="thinking">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Show Thinking Process
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {message.thinking}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  ))}
</div>
```

---

### **STEP 6: Update Frontend - Manual Mode Edit Box**

**File**: `app/page.tsx` (in the `waiting_for_user` event handler)

**Build prompt using FILTERED content for conversation history:**

```typescript
case 'waiting_for_user':
  console.log('Manual mode: Waiting for user input', event.data)
  setWaitingForUser(true)
  setNextExpectedModel(event.data.nextModel)
  setPauseReason(event.data.reason)
  
  // Build the COMPLETE prompt with FILTERED conversation history
  const eventConversation = event.data.conversation || conversation
  const eventConfig = event.data.config
  
  console.log('🔍 Building full context prompt for', event.data.nextModel)
  
  let fullDefaultPrompt = ""
  
  // 1. System Prompt (enhanced with conversation rules)
  const baseSystemPrompt = systemPrompt 
    ? systemPrompt.replace(/{MODEL}/g, event.data.nextModel)
    : `You are Model ${event.data.nextModel}. Respond naturally and authentically.`
  
  const enhancedSystemPrompt = baseSystemPrompt + 
    `\n\n=== CONVERSATION RULES ===
- You are Model ${event.data.nextModel} in a conversation with Model ${event.data.nextModel === 'A' ? 'B' : 'A'}
- Respond naturally and directly to the other model
- Stay in character throughout the conversation
- Do not reference turn numbers or system mechanics in your responses`
  
  // 2. Scenario context
  let scenarioContext = ""
  const currentSharedPrompt = eventConfig?.sharedPrompt || sharedPrompt
  const currentPromptingMode = eventConfig?.promptingMode || promptingMode
  const currentPromptA = eventConfig?.promptA || promptA
  const currentPromptB = eventConfig?.promptB || promptB
  
  if (currentPromptingMode === 'shared' && currentSharedPrompt) {
    scenarioContext = `\n\n=== SCENARIO ===\n${currentSharedPrompt}`
  } else if (currentPromptingMode === 'individual') {
    const relevantPrompt = event.data.nextModel === 'A' ? currentPromptA : currentPromptB
    if (relevantPrompt) {
      scenarioContext = `\n\n=== YOUR SPECIFIC INSTRUCTIONS ===\n${relevantPrompt}`
    }
  }
  
  // 3. 🔍 CRITICAL: Full conversation history using FILTERED content
  let conversationHistory = ""
  if (eventConversation.length > 0) {
    conversationHistory = "\n\n=== CONVERSATION HISTORY (What you actually see from other model) ===\n"
    eventConversation.forEach((msg: ChatMessage, index: number) => {
      const isCurrentModel = msg.model === event.data.nextModel
      const role = isCurrentModel ? "You previously said" : `Model ${msg.model} said`
      
      // ✅ USE FILTERED CONTENT (what the model actually sees)
      // This shows the user EXACTLY what context the model will receive
      conversationHistory += `\n${role}: ${msg.content}\n`
      
      // 🆕 Optional: Show if content was filtered for transparency
      if (msg.filterMetadata?.wasFiltered && !isCurrentModel) {
        conversationHistory += `   [Note: ${msg.filterMetadata.removedSections.length} reasoning section(s) filtered from this message]\n`
      }
    })
    conversationHistory += "\n=== END HISTORY ===\n\nNow respond to continue the conversation:"
    console.log('✅ Added FILTERED conversation history with', eventConversation.length, 'messages')
  } else {
    // No conversation yet - this is the start
    if (event.data.nextModel === 'A') {
      conversationHistory = "\n\n=== CONVERSATION HISTORY ===\n(No previous messages - you are starting the conversation)\n\n=== END HISTORY ===\n\nBegin the conversation based on your scenario instructions:"
    } else {
      conversationHistory = "\n\n=== CONVERSATION HISTORY ===\n(No previous messages yet)\n\n=== END HISTORY ===\n\nBegin your response:"
    }
  }
  
  fullDefaultPrompt = enhancedSystemPrompt + scenarioContext + conversationHistory
  setNextPrompt(fullDefaultPrompt)
  
  // Update status based on pause reason
  if (event.data.reason === 'turn_completed') {
    setExperimentStatus(`⏸️ Manual mode: Turn ${event.data.currentTurn} completed. Ready for next turn?`)
  } else if (event.data.reason === 'model_completed') {
    setExperimentStatus(`⏸️ Manual mode: Waiting for input to send to Model ${event.data.nextModel}`)
  } else if (event.data.reason === 'turn_start') {
    setExperimentStatus(`🆕 Manual mode: Starting Turn ${event.data.currentTurn} with Model ${event.data.nextModel}`)
  }
  break
```

---

### **STEP 7: Update Report Generation**

**File**: `lib/report-generator.ts`

**Use ORIGINAL content for reports (full transparency for researchers):**

```typescript
// In generateConversationHTML() method:

private generateConversationHTML(conversation: ChatMessage[]): string {
  return conversation.map(msg => {
    // 🆕 Use ORIGINAL content for reports (full output)
    const displayContent = msg.originalContent || msg.content;
    
    return `
      <div class="message">
        <div class="message-header">
          <strong>Model ${msg.model}</strong> (${msg.modelName}) - Turn ${msg.turn}
        </div>
        <div class="message-content">
          ${this.escapeHtml(displayContent)}
        </div>
        ${msg.thinking ? `
          <details class="thinking-section">
            <summary>🧠 Thinking Process</summary>
            <div class="thinking-content">
              ${this.escapeHtml(msg.thinking)}
            </div>
          </details>
        ` : ''}
        ${msg.filterMetadata?.wasFiltered ? `
          <div class="filter-info">
            🔍 Content filtered: ${msg.filterMetadata.removedSections.length} section(s) removed
            (${(msg.filterMetadata.filterConfidence * 100).toFixed(0)}% confidence)
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}
```

---

## 🧪 Testing Plan

### **Test Scenarios**

1. **Automatic Mode Test**
   - Start automatic experiment
   - Verify filtering runs on each response
   - Check conversation log shows original content
   - Verify reports include original content

2. **Manual Mode Test**
   - Start manual experiment
   - Check edit box shows FILTERED history
   - Verify main UI shows ORIGINAL content
   - Confirm thinking accordion works

3. **Filter Transparency Test**
   - Run experiment with reasoning-heavy models
   - Verify filter indicators appear
   - Check console logs for filter confidence
   - Validate removed sections are listed

4. **Edge Cases**
   - Very short response (1 sentence)
   - Pure reasoning (no conversation)
   - Mixed nested reasoning
   - Filter API failure (fallback test)

---

## 📊 Success Criteria

✅ **Content Separation**
- Models receive ONLY filtered conversational responses
- Users see FULL original output in main UI
- Manual mode edit box shows FILTERED history

✅ **Transparency**
- Filter status visible in UI
- Filter confidence logged
- Removed sections documented

✅ **Reliability**
- Fallback to original on filter failure
- No experiment crashes
- Performance <3s per response

✅ **Reports**
- Include ORIGINAL full content
- Document filtering occurred
- Show thinking traces

---

## 🚀 Implementation Checklist

- [ ] Create `lib/content-filter.ts`
- [ ] Update `lib/types.ts` (add `originalContent`, `filterMetadata`)
- [ ] Modify `lib/experiment-manager.ts`:
  - [ ] Add ContentFilter initialization
  - [ ] Update API key configuration
  - [ ] Integrate filtering in `processModelResponse()`
  - [ ] Add `buildConversationSummary()` helper
  - [ ] Verify `buildConversationHistory()` uses filtered content
- [ ] Update `components/conversation-log.tsx`:
  - [ ] Show original content in main display
  - [ ] Add filter status indicator
- [ ] Update `app/page.tsx`:
  - [ ] Use filtered content in manual mode edit box
  - [ ] Add filter transparency notes
- [ ] Update `lib/report-generator.ts`:
  - [ ] Use original content in reports
  - [ ] Add filter metadata section
- [ ] Test all scenarios
- [ ] Build and deploy

---

## ⏱️ Estimated Timeline

- **Implementation**: 1-2 hours
- **Testing**: 30-45 minutes
- **Refinement**: 15-30 minutes
- **Total**: ~2-3 hours

---

## ✅ Ready to Execute!

This plan addresses all your requirements:
1. ✅ LLM-based filtering approved
2. ✅ Original stored for reports & conversation history
3. ✅ No confidence warnings
4. ✅ Full output visible in UI, filtered in edit box
5. ✅ Fallback to original on failure

**Shall I proceed with implementation?**

