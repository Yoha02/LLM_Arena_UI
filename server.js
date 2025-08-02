const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO with enhanced configuration
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: false
    },
    transports: ['websocket', 'polling'], // Support both transports
    allowEIO3: true, // Backward compatibility
    pingTimeout: 20000, // 20 seconds to detect crashes/disconnects
    pingInterval: 10000, // Ping every 10 seconds for faster detection
    upgradeTimeout: 30000, // Upgrade timeout
    maxHttpBufferSize: 1e6 // 1MB buffer
  });

  // Track active clients per experiment for auto-stop functionality
  const experimentClients = new Map(); // experimentId -> Set of socketIds

  // Handle WebSocket connections with enhanced logging
  io.on('connection', (socket) => {
    console.log('🔗 WebSocket client connected:', socket.id, 'Transport:', socket.conn.transport.name);
    
    // Monitor transport changes
    socket.conn.on('upgrade', () => {
      console.log('⬆️ Transport upgraded for', socket.id, 'to:', socket.conn.transport.name);
    });

    socket.on('join-experiment', (experimentId) => {
      socket.join(`experiment-${experimentId}`);
      console.log(`🏠 Client ${socket.id} joined experiment ${experimentId}`);
      
      // Track client for this experiment
      if (!experimentClients.has(experimentId)) {
        experimentClients.set(experimentId, new Set());
      }
      experimentClients.get(experimentId).add(socket.id);
      socket.currentExperiment = experimentId; // Store on socket for disconnect handling
      
      console.log(`📊 Experiment ${experimentId} now has ${experimentClients.get(experimentId).size} active clients`);
      
      // Confirm join with client
      socket.emit('joined-experiment', { experimentId, success: true });
      
      // Test room communication immediately after joining
      setTimeout(() => {
        const roomName = `experiment-${experimentId}`;
        const testMessage = { 
          test: 'room_join_test', 
          experimentId, 
          socketId: socket.id,
          timestamp: new Date().toISOString()
        };
        
        io.to(roomName).emit('test_message', testMessage);
        console.log(`🧪 Sent test message to room ${roomName}:`, testMessage);
      }, 100);
    });

    socket.on('leave-experiment', (experimentId) => {
      socket.leave(`experiment-${experimentId}`);
      console.log(`🚪 Client ${socket.id} left experiment ${experimentId}`);
      
      // Remove client from experiment tracking
      if (experimentClients.has(experimentId)) {
        experimentClients.get(experimentId).delete(socket.id);
        if (experimentClients.get(experimentId).size === 0) {
          experimentClients.delete(experimentId);
        }
        console.log(`📊 Experiment ${experimentId} now has ${experimentClients.has(experimentId) ? experimentClients.get(experimentId).size : 0} active clients`);
      }
      socket.currentExperiment = null;
    });

    socket.on('disconnect', async (reason) => {
      console.log('🔌 WebSocket client disconnected:', socket.id, 'Reason:', reason, 'Timestamp:', new Date().toISOString());
      
      // Handle auto-stop for experiments when browser closes
      if (socket.currentExperiment) {
        const experimentId = socket.currentExperiment;
        console.log(`🛑 Client ${socket.id} was part of experiment ${experimentId}, checking if auto-stop needed...`);
        console.log(`📋 Current experiment clients map:`, Array.from(experimentClients.entries()).map(([id, clients]) => ({ id, clientCount: clients.size })));
        
        // Remove client from experiment tracking
        if (experimentClients.has(experimentId)) {
          experimentClients.get(experimentId).delete(socket.id);
          const remainingClients = experimentClients.get(experimentId).size;
          
          console.log(`📊 Experiment ${experimentId} now has ${remainingClients} active clients`);
          
          // If no clients remain, auto-stop the experiment
          if (remainingClients === 0) {
            console.log(`🚨 No clients remain for experiment ${experimentId} - AUTO-STOPPING to prevent infinite loop`);
            
            try {
              // Make HTTP request to stop API endpoint (more reliable than import)
              console.log('🔧 Making HTTP request to stop API...');
              const fetch = (await import('node-fetch')).default;
              
              const response = await fetch('http://localhost:3000/api/experiment/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log(`✅ Experiment ${experimentId} auto-stopped via API:`, result.message);
              } else {
                console.log(`ℹ️ Stop API response: ${response.status} - experiment may not have been running`);
              }
              
              // Clean up tracking
              experimentClients.delete(experimentId);
              
            } catch (error) {
              console.error(`❌ Error auto-stopping experiment ${experimentId} via API:`, error.message);
              // Still clean up tracking even if API call failed
              experimentClients.delete(experimentId);
            }
          }
        }
      }
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error for', socket.id, ':', error);
    });

    // Send initial connection confirmation
    socket.emit('connection-confirmed', { 
      socketId: socket.id, 
      transport: socket.conn.transport.name,
      timestamp: new Date().toISOString()
    });
  });

  // Store io instance globally for access from API routes
  global.io = io;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 