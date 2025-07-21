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
    pingTimeout: 60000, // Longer ping timeout
    pingInterval: 25000, // Ping interval
    upgradeTimeout: 30000, // Upgrade timeout
    maxHttpBufferSize: 1e6 // 1MB buffer
  });

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
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket client disconnected:', socket.id, 'Reason:', reason);
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