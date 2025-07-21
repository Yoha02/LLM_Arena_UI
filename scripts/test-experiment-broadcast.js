#!/usr/bin/env node

/**
 * Test script to verify experiment creation broadcast
 * Listens for experiment_created events and checks room joining
 */

const io = require('socket.io-client');

// Use built-in fetch if available (Node.js 18+), otherwise require node-fetch
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (error) {
  console.error('❌ fetch is not available. Please install node-fetch or use Node.js 18+');
  process.exit(1);
}

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';

console.log('📢 Testing Experiment Creation Broadcast...');
console.log('==========================================');

if (OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY') {
  console.error('❌ Please set OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

async function testExperimentBroadcast() {
  let socket;
  let experimentCreatedReceived = false;
  let experimentId = null;
  let joinConfirmed = false;
  
  try {
    // Connect to WebSocket
    console.log('🔗 Connecting to WebSocket...');
    socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
      
      socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket.id);
        clearTimeout(timeout);
        resolve();
      });
      
      socket.on('connect_error', reject);
    });

    // Set up event listeners
    socket.on('experiment_created', (data) => {
      console.log('📢 Experiment created broadcast received!', {
        experimentId: data.experimentId,
        timestamp: data.timestamp
      });
      experimentCreatedReceived = true;
      experimentId = data.experimentId;
    });

    socket.on('joined-experiment', (data) => {
      console.log('🏠 Auto-joined experiment:', data.experimentId);
      joinConfirmed = true;
    });

    // Start experiment via API (this should trigger the broadcast)
    console.log('\n🚀 Starting experiment via API...');
    
    const experimentConfig = {
      promptingMode: "shared",
      sharedPrompt: "Quick test prompt - negotiate for 1 component only. Keep responses very short.",
      maxTurns: 1,
      modelA: "deepseek-r1", 
      modelB: "deepseek-r1",
      apiKeyA: OPENROUTER_API_KEY,
      apiKeyB: OPENROUTER_API_KEY
    };

    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/experiment/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(experimentConfig)
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️  API response time: ${responseTime}ms`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API failed: ${error.message}`);
    }

    const result = await response.json();
    console.log('✅ API Response received:', {
      status: result.status,
      experimentId: result.experimentId
    });

    // Wait a bit for broadcast and auto-join
    console.log('\n⏳ Waiting for broadcast and auto-join...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check results
    console.log('\n📊 Test Results:');
    console.log(`   API Response Time: ${responseTime}ms`);
    console.log(`   Experiment Created Broadcast: ${experimentCreatedReceived ? '✅ Received' : '❌ Not received'}`);
    console.log(`   Auto-Join Confirmed: ${joinConfirmed ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Experiment ID Match: ${result.experimentId === experimentId ? '✅ Match' : '❌ Mismatch'}`);
    
    const success = experimentCreatedReceived && joinConfirmed && (result.experimentId === experimentId) && responseTime < 5000;
    
    if (success) {
      console.log('\n🎉 Experiment broadcast test PASSED!');
      console.log('   The UI should now receive real-time streaming updates.');
    } else {
      console.log('\n⚠️ Test has issues:');
      if (!experimentCreatedReceived) console.log('   - Broadcast not received');
      if (!joinConfirmed) console.log('   - Auto-join failed');
      if (result.experimentId !== experimentId) console.log('   - ID mismatch');
      if (responseTime >= 5000) console.log('   - API too slow');
    }

    return success;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  } finally {
    if (socket) {
      socket.disconnect();
      console.log('\n🔌 Disconnected');
    }
  }
}

// Run the test
testExperimentBroadcast()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test error:', error);
    process.exit(1);
  }); 