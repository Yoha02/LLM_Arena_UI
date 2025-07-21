import { Server } from 'socket.io';
import { NextRequest, NextResponse } from 'next/server';

let io: Server;

export async function GET(request: NextRequest) {
  if (!io) {
    // Initialize Socket.IO server
    io = new Server({
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('WebSocket client connected:', socket.id);
      
      socket.on('join-experiment', (experimentId) => {
        socket.join(`experiment-${experimentId}`);
        console.log(`Client ${socket.id} joined experiment ${experimentId}`);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket client disconnected:', socket.id);
      });
    });
  }

  return NextResponse.json({ message: 'WebSocket server initialized' });
}

export { io }; 