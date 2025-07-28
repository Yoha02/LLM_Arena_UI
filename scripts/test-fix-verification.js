#!/usr/bin/env node

/**
 * Test script to verify the WebSocket manager fix
 * Tests if broadcasts and streaming messages now work
 */

const io = require('socket.io-client');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🔧 Testing WebSocket Manager Fix...');
console.log('=================================');

async function testFix() {
  let socket;
  let broadcastReceived = false;
  let streamingReceived = false;
  let testMessagesReceived = [];
  
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

    // Set up listeners
    socket.on('experiment_created', (data) => {
      console.log('📢 ✅ EXPERIMENT_CREATED RECEIVED!', data.experimentId);
      broadcastReceived = true;
    });

    socket.on('message_stream', (message) => {
      console.log('📨 ✅ STREAMING MESSAGE RECEIVED!', {
        id: message.id,
        model: message.model,
        isComplete: message.isComplete,
        contentLength: message.content.length
      });
      streamingReceived = true;
    });

    socket.on('test_message', (data) => {
      console.log('🧪 ✅ TEST MESSAGE RECEIVED:', data.test);
      testMessagesReceived.push(data.test);
    });

    // Listen for all events
    socket.onAny((eventName, ...args) => {
      if (eventName !== 'connection-confirmed' && eventName !== 'joined-experiment') {
        console.log(`📥 Event: ${eventName}`);
      }
    });

    // Wait and listen
    console.log('\n⏳ Listening for 20 seconds...');
    console.log('   🚀 START AN EXPERIMENT IN THE UI NOW!');
    
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Report results
    console.log('\n📊 Fix Verification Results:');
    console.log(`   Experiment broadcast: ${broadcastReceived ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`   Streaming messages: ${streamingReceived ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`   Test messages: ${testMessagesReceived.length > 0 ? `✅ ${testMessagesReceived.length} received` : '❌ NONE'}`);
    console.log(`   Test types: ${testMessagesReceived.join(', ')}`);

    const success = broadcastReceived && streamingReceived && testMessagesReceived.length > 0;

    if (success) {
      console.log('\n🎉 SUCCESS: WebSocket manager fix is working!');
      console.log('   All components are now communicating properly.');
      console.log('   Real-time streaming should work in the UI.');
    } else {
      console.log('\n⚠️ PARTIAL SUCCESS or ISSUES:');
      if (!broadcastReceived) console.log('   - Experiment broadcasts still broken');
      if (!streamingReceived) console.log('   - Streaming messages still broken');  
      if (testMessagesReceived.length === 0) console.log('   - Test messages not working');
    }

    return success;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  } finally {
    if (socket) {
      socket.disconnect();
      console.log('\n🔌 Disconnected from test');
    }
  }
}

// Run the test
testFix()
  .then((success) => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ WebSocket manager fix is SUCCESSFUL!');
      console.log('   Real-time streaming should now work in the UI.');
    } else {
      console.log('❌ WebSocket manager fix needs more work.');
      console.log('   Check server logs for initialization issues.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 