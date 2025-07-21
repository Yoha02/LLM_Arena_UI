#!/usr/bin/env node

/**
 * Test script for DeepSeek R1 integration
 * This script tests the thinking extraction capabilities of DeepSeek R1
 */

const { OpenRouterAPI } = require('../lib/openrouter');
const { thinkingExtractor } = require('../lib/thinking-extractor');
require('dotenv').config({ path: '.env.local' });

async function testDeepSeekR1() {
  console.log('🧪 Testing DeepSeek R1 Integration...\n');

  // Check environment variables
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in environment variables');
    console.log('Please set up your .env.local file with your OpenRouter API key');
    process.exit(1);
  }

  const api = new OpenRouterAPI(process.env.OPENROUTER_API_KEY);

  // Test 1: Health check
  console.log('1️⃣ Testing OpenRouter connectivity...');
  try {
    const isHealthy = await api.healthCheck();
    if (isHealthy) {
      console.log('✅ OpenRouter API is accessible\n');
    } else {
      console.log('❌ OpenRouter API is not accessible\n');
      return;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: List available models
  console.log('2️⃣ Checking available models...');
  try {
    const models = await api.getAvailableModels();
    const deepseekAvailable = models.includes('deepseek/deepseek-r1');
    console.log(`✅ Found ${models.length} available models`);
    console.log(`${deepseekAvailable ? '✅' : '❌'} DeepSeek R1 available: ${deepseekAvailable}\n`);
    
    if (!deepseekAvailable) {
      console.log('⚠️  DeepSeek R1 not available, testing with fallback...\n');
    }
  } catch (error) {
    console.error('❌ Failed to fetch models:', error.message);
  }

  // Test 3: DeepSeek R1 Response
  console.log('3️⃣ Testing DeepSeek R1 response...');
  
  const testMessages = [
    {
      role: 'user',
      content: 'You are negotiating for computer components with another AI. You need a high-performance GPU and CPU for your computational tasks. Please explain your reasoning process step by step, then provide your opening negotiation statement.'
    }
  ];

  try {
    const response = await api.chatCompletion('deepseek-r1', testMessages, {
      temperature: 0.7,
      maxTokens: 1000
    });

    console.log('✅ DeepSeek R1 response received');
    console.log('Response content preview:', response.choices[0].message.content.substring(0, 200) + '...');
    console.log('Tokens used:', response.usage?.total_tokens || 'N/A');

    // Test 4: Thinking extraction
    console.log('\n4️⃣ Testing thinking extraction...');
    
    const thinkingResult = await thinkingExtractor.extractThinking(
      'deepseek-r1',
      response.choices[0].message.content,
      response
    );

    console.log('✅ Thinking extraction completed');
    console.log('Confidence score:', thinkingResult.confidence);
    console.log('Content length:', thinkingResult.content.length);
    console.log('Thinking length:', thinkingResult.thinking.length);

    // Display results
    console.log('\n📊 RESULTS:');
    console.log('=' * 50);
    console.log('\n🤖 MAIN RESPONSE:');
    console.log(thinkingResult.content);
    console.log('\n🧠 THINKING PROCESS:');
    console.log(thinkingResult.thinking);
    console.log('\n📈 CONFIDENCE:', thinkingResult.confidence);
    
    // Evaluation
    if (thinkingResult.confidence > 0.8) {
      console.log('✅ HIGH CONFIDENCE - Native reasoning tokens detected');
    } else if (thinkingResult.confidence > 0.5) {
      console.log('⚠️  MEDIUM CONFIDENCE - Some thinking patterns detected');
    } else {
      console.log('❌ LOW CONFIDENCE - Limited thinking extraction');
    }

  } catch (error) {
    console.error('❌ DeepSeek R1 test failed:', error.message);
    console.error('Error details:', error);
  }

  // Test 5: Thinking prompt generation
  console.log('\n5️⃣ Testing thinking prompt generation...');
  
  const originalPrompt = 'Solve this math problem: 2 + 2 = ?';
  const enhancedPrompt = thinkingExtractor.generateThinkingPrompt('deepseek-r1', originalPrompt);
  
  console.log('✅ Thinking prompt generated');
  console.log('Original prompt:', originalPrompt);
  console.log('Enhanced prompt:', enhancedPrompt);
  
  console.log('\n🎉 DeepSeek R1 testing completed!');
  console.log('\nNext steps:');
  console.log('1. If confidence is high (>0.8), DeepSeek R1 is working correctly');
  console.log('2. If confidence is medium (0.5-0.8), check OpenRouter response format');
  console.log('3. If confidence is low (<0.5), investigate reasoning token extraction');
  console.log('4. Once working, proceed to Qwen3 235B testing');
}

// Run the test
if (require.main === module) {
  testDeepSeekR1().catch(console.error);
}

module.exports = { testDeepSeekR1 }; 