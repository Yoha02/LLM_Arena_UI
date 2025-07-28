#!/usr/bin/env node

/**
 * Test script for LLM Arena Streaming Functionality
 * Tests real-time streaming via WebSocket connections
 */

const io = require('socket.io-client');

// Use built-in fetch if available (Node.js 18+), otherwise require node-fetch
let fetch;
try {
  // Try to use global fetch first (Node.js 18+)
  fetch = globalThis.fetch || require('node-fetch');
} catch (error) {
  console.error('❌ fetch is not available. Please install node-fetch or use Node.js 18+:');
  console.error('   npm install node-fetch');
  process.exit(1);
}

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';

console.log('🌊 Testing LLM Arena Streaming Functionality...');
console.log('==============================================');

if (OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY') {
  console.error('❌ Please set OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStreamingExperiment() {
  let socket;
  let experimentStarted = false;
  let streamingMessages = [];
  let experimentEvents = [];
  
  try {
    // Test 1: Connect to WebSocket
    console.log('\n1️⃣ Connecting to WebSocket...');
    socket = io(BASE_URL, {
      transports: ['websocket'],
      timeout: 5000
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      
      socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket.id);
        clearTimeout(timeout);
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection failed:', error.message);
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Test 2: Set up event listeners
    console.log('\n2️⃣ Setting up event listeners...');
    
    socket.on('experiment_event', (event) => {
      console.log(`📡 Experiment Event: ${event.type}`, {
        turn: event.data.turn,
        totalMessages: event.data.totalMessages
      });
      experimentEvents.push(event);
    });

    socket.on('message_stream', (message) => {
      const progress = message.isComplete ? '✅ Complete' : `🔄 Streaming (${message.content.length} chars)`;
      console.log(`💬 ${progress} - Model ${message.model}: ${message.content.substring(0, 50)}...`);
      streamingMessages.push(message);
    });

    socket.on('experiment_state', (state) => {
      console.log(`📊 State Update: Running=${state.isRunning}, Turn=${state.currentTurn}, Messages=${state.conversation?.length || 0}`);
    });

    // Test 3: Start experiment
    console.log('\n3️⃣ Starting streaming experiment...');
    
    const experimentConfig = {
      promptingMode: "shared",
      sharedPrompt: "You are negotiating for the best computer components with another AI. You need to secure high-performance hardware for computational tasks. Keep your responses concise but strategic. This is a brief 2-turn test.",
      maxTurns: 2,
      modelA: "deepseek-r1",
      modelB: "deepseek-r1",
      apiKeyA: OPENROUTER_API_KEY,
      apiKeyB: OPENROUTER_API_KEY
    };

    const startResponse = await fetch(`${BASE_URL}/api/experiment/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(experimentConfig)
    });

    if (!startResponse.ok) {
      const error = await startResponse.json();
      throw new Error(`Failed to start experiment: ${error.message}`);
    }

    const startResult = await startResponse.json();
    console.log('✅ Experiment started:', startResult.experimentId);
    
    // Join the experiment room
    socket.emit('join-experiment', startResult.experimentId);
    console.log(`🏠 Joined experiment room: ${startResult.experimentId}`);
    
    experimentStarted = true;

    // Test 4: Wait for streaming to complete
    console.log('\n4️⃣ Monitoring streaming progress...');
    console.log('⏱️  Waiting for streaming to complete (timeout: 60s)...');
    
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds timeout
    
    while (Date.now() - startTime < timeout) {
      await delay(1000);
      
      // Check if experiment is complete
      const lastEvent = experimentEvents[experimentEvents.length - 1];
      if (lastEvent && lastEvent.type === 'experiment_stopped') {
        console.log('🎉 Experiment completed successfully!');
        break;
      }
      
      // Show progress
      const streamingCount = streamingMessages.filter(m => !m.isComplete).length;
      const completedCount = streamingMessages.filter(m => m.isComplete).length;
      
      if (streamingCount > 0 || completedCount > 0) {
        console.log(`📈 Progress: ${completedCount} completed, ${streamingCount} streaming`);
      }
    }

    // Test 5: Verify results
    console.log('\n5️⃣ Verifying streaming results...');
    
    const totalStreamingMessages = streamingMessages.length;
    const completedMessages = streamingMessages.filter(m => m.isComplete).length;
    const uniqueMessages = new Set(streamingMessages.map(m => m.id)).size;
    
    console.log(`📊 Streaming Statistics:`);
    console.log(`   Total streaming updates: ${totalStreamingMessages}`);
    console.log(`   Completed messages: ${completedMessages}`);
    console.log(`   Unique messages: ${uniqueMessages}`);
    console.log(`   Experiment events: ${experimentEvents.length}`);
    
    // Verify we got streaming updates
    if (totalStreamingMessages === 0) {
      throw new Error('❌ No streaming messages received');
    }
    
    if (completedMessages === 0) {
      throw new Error('❌ No completed messages received');
    }
    
    if (experimentEvents.length === 0) {
      throw new Error('❌ No experiment events received');
    }
    
    console.log('✅ All streaming tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (socket) {
      socket.disconnect();
      console.log('🔌 WebSocket disconnected');
    }
  }
}

// Run the test
testStreamingExperiment()
  .then(() => {
    console.log('\n🎉 Streaming test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 