#!/usr/bin/env node

/**
 * Quick WebSocket connection test for LLM Arena
 * Tests just the connection without running a full experiment
 */

const io = require('socket.io-client');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🔗 Testing WebSocket Connection...');
console.log('=================================');

async function testWebSocketConnection() {
  let socket;
  let connectionConfirmed = false;
  
  try {
    console.log('🚀 Connecting to:', BASE_URL);
    
    // Create socket with same config as frontend
    socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      forceNew: true
    });

    // Set up event listeners
    socket.on('connect', () => {
      console.log('✅ Connected! Socket ID:', socket.id);
      console.log('🚀 Transport:', socket.io.engine.transport.name);
    });

    socket.on('connection-confirmed', (data) => {
      console.log('✅ Connection confirmed by server:', data);
      connectionConfirmed = true;
    });

    socket.on('upgrade', () => {
      console.log('⬆️ Transport upgraded to:', socket.io.engine.transport.name);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Test joining an experiment room
    socket.on('joined-experiment', (data) => {
      console.log('🏠 Experiment join confirmed:', data);
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 15000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        
        // Test joining experiment room
        socket.emit('join-experiment', 'test-experiment');
        
        // Wait a bit for confirmation
        setTimeout(() => {
          resolve(true);
        }, 2000);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    console.log('\n📊 Connection Test Results:');
    console.log(`   Connection: ${socket.connected ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Transport: ${socket.io.engine.transport.name}`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   Server Confirmation: ${connectionConfirmed ? '✅ Received' : '⚠️ Missing'}`);

    if (socket.connected && connectionConfirmed) {
      console.log('\n🎉 WebSocket connection test PASSED!');
      return true;
    } else {
      console.log('\n⚠️ WebSocket connection test PARTIAL - connection works but may have issues');
      return false;
    }

  } catch (error) {
    console.error('\n❌ WebSocket connection test FAILED:', error.message);
    return false;
  } finally {
    if (socket) {
      socket.disconnect();
      console.log('🔌 Disconnected from test');
    }
  }
}

// Run the test
testWebSocketConnection()
  .then((success) => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ WebSocket is working correctly!');
      console.log('   You can now run streaming experiments in the UI.');
    } else {
      console.log('⚠️ WebSocket has issues but may still work with fallback.');
      console.log('   Check the server logs and try refreshing the UI.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 