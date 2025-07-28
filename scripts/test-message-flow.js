#!/usr/bin/env node

/**
 * Test script to diagnose streaming message flow
 * Tests if messages are being sent by backend and received by frontend
 */

const io = require('socket.io-client');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🔍 Diagnostic: Testing Streaming Message Flow...');
console.log('===============================================');

async function testMessageFlow() {
  let socket;
  let messageReceived = false;
  let experimentsReceived = [];
  let allEvents = [];
  
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

    // Listen for ALL events
    socket.onAny((eventName, ...args) => {
      console.log(`📥 Event received: ${eventName}`, args.length > 0 ? (args[0].id || args[0].experimentId || 'no-id') : '');
      allEvents.push({ eventName, data: args[0] });
    });

    // Specific listeners
    socket.on('message_stream', (message) => {
      console.log('📨 ✅ STREAMING MESSAGE RECEIVED!', {
        id: message.id,
        model: message.model,
        isComplete: message.isComplete,
        contentLength: message.content.length
      });
      messageReceived = true;
    });

    socket.on('experiment_created', (data) => {
      console.log('📢 Experiment created:', data.experimentId);
      experimentsReceived.push(data.experimentId);
      
      // Auto-join the experiment
      socket.emit('join-experiment', data.experimentId);
      console.log('🏠 Auto-joined experiment:', data.experimentId);
    });

    // Wait for events
    console.log('\n⏳ Listening for events for 30 seconds...');
    console.log('   (Start an experiment in the UI now)');
    
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Report results
    console.log('\n📊 Diagnostic Results:');
    console.log(`   Total events received: ${allEvents.length}`);
    console.log(`   Streaming messages: ${messageReceived ? '✅ YES' : '❌ NONE'}`);
    console.log(`   Experiments detected: ${experimentsReceived.length}`);
    
    if (allEvents.length > 0) {
      console.log('\n📋 Event Summary:');
      const eventCounts = {};
      allEvents.forEach(event => {
        eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
      });
      Object.entries(eventCounts).forEach(([name, count]) => {
        console.log(`   ${name}: ${count} times`);
      });
    }

    if (messageReceived) {
      console.log('\n🎉 SUCCESS: Streaming messages are flowing correctly!');
    } else if (experimentsReceived.length > 0) {
      console.log('\n⚠️ PARTIAL: Experiments detected but no streaming messages received');
      console.log('   This suggests a room joining or message emission issue');
    } else {
      console.log('\n❌ ISSUE: No experiments or messages detected');
      console.log('   Make sure to start an experiment in the UI during the test');
    }

    return messageReceived;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  } finally {
    if (socket) {
      socket.disconnect();
      console.log('\n🔌 Disconnected from diagnostic test');
    }
  }
}

// Run the test
testMessageFlow()
  .then((success) => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ Streaming message flow is working!');
    } else {
      console.log('⚠️ Streaming messages not detected. Check server logs.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Diagnostic failed:', error);
    process.exit(1);
  }); 