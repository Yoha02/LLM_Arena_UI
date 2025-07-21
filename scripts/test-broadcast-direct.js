#!/usr/bin/env node

/**
 * Direct test of broadcast functionality
 * Manually triggers a broadcast to see if WebSocket manager is working
 */

const io = require('socket.io-client');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('📢 Testing Direct Broadcast...');
console.log('=============================');

async function testDirectBroadcast() {
  let socket;
  let broadcastReceived = false;
  
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

    // Listen for experiment_created broadcasts
    socket.on('experiment_created', (data) => {
      console.log('📢 ✅ EXPERIMENT_CREATED BROADCAST RECEIVED!', data);
      broadcastReceived = true;
    });

    // Listen for all events
    socket.onAny((eventName, ...args) => {
      console.log(`📥 Event: ${eventName}`, args.length > 0 ? (args[0].experimentId || 'no-id') : '');
    });

    // Wait and listen for 15 seconds
    console.log('\n⏳ Listening for experiment_created broadcasts for 15 seconds...');
    console.log('   🚀 START AN EXPERIMENT IN THE UI NOW!');
    
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Report results
    console.log('\n📊 Direct Broadcast Test Results:');
    console.log(`   Experiment_created received: ${broadcastReceived ? '✅ YES' : '❌ NO'}`);

    if (broadcastReceived) {
      console.log('\n🎉 SUCCESS: Broadcast is working!');
      console.log('   The issue must be in streaming message emission');
    } else {
      console.log('\n❌ ISSUE: experiment_created broadcast not received');
      console.log('   Check server logs for broadcast debugging messages');
    }

    return broadcastReceived;

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
testDirectBroadcast()
  .then((success) => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ Broadcast mechanism is working!');
      console.log('   Issue is likely in streaming message emission or room management.');
    } else {
      console.log('❌ Broadcast mechanism is broken.');
      console.log('   WebSocket manager or IO instance has issues.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 