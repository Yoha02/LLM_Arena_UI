import { Server } from 'socket.io';
import { createServer } from 'http';

export interface ExperimentEvent {
  type: 'experiment_started' | 'experiment_stopped' | 'turn_started' | 'turn_completed' | 'message_streaming' | 'message_completed' | 'experiment_error';
  data: any;
  timestamp: Date;
}

export interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  model: 'A' | 'B';
  modelName: string;
  turn: number;
  thinking?: string;
  tokensUsed?: number;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private io: Server | null = null;
  private server: any = null;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(httpServer?: any) {
    if (!this.io) {
      // Use global io instance from custom server
      this.io = (global as any).io;
      console.log('🔧 WebSocket Manager initialized with IO:', !!this.io);
    }
    return this.io;
  }

  public ensureInitialized() {
    if (!this.io) {
      console.log('⚠️ WebSocket Manager not initialized, attempting initialization...');
      this.initialize();
      if (!this.io) {
        console.error('❌ Failed to initialize WebSocket Manager - global.io not available!');
        console.log('🔍 Global object keys:', Object.keys(global));
      }
    }
    return !!this.io;
  }

  public getIO(): Server | null {
    return this.io;
  }

  public emitExperimentEvent(experimentId: string, event: ExperimentEvent) {
    if (!this.ensureInitialized()) {
      console.error('❌ Cannot emit experiment event - WebSocket not initialized');
      return;
    }
    
    this.io!.to(`experiment-${experimentId}`).emit('experiment_event', event);
    console.log(`Emitted event ${event.type} to experiment ${experimentId}`);
  }

  public emitStreamingMessage(experimentId: string, message: StreamingMessage) {
    if (!this.ensureInitialized()) {
      console.error('❌ Cannot emit streaming message - WebSocket not initialized');
      return;
    }
    
    const roomName = `experiment-${experimentId}`;
    const room = this.io!.sockets.adapter.rooms.get(roomName);
    const clientCount = room ? room.size : 0;
    
    console.log(`📡 EMIT STREAMING: Room ${roomName} has ${clientCount} clients, Model ${message.model} ${message.isComplete ? 'completed' : `streaming (${message.content.length} chars)`}`);
    
    if (clientCount === 0) {
      console.warn(`⚠️ NO CLIENTS in room ${roomName}! Available rooms:`, Array.from(this.io!.sockets.adapter.rooms.keys()));
      console.log(`📢 FALLBACK: Broadcasting to ALL clients instead`);
      this.io!.emit('message_stream', message);
      this.io!.emit('test_message', { test: 'fallback_broadcast', messageId: message.id });
    } else {
      console.log(`✅ EMITTING to room with ${clientCount} clients`);
      this.io!.to(roomName).emit('message_stream', message);
      // Also emit a test message to verify the connection
      this.io!.to(roomName).emit('test_message', { test: 'room_emit', messageId: message.id, room: roomName });
    }
  }

  public emitExperimentState(experimentId: string, state: any) {
    if (!this.ensureInitialized()) {
      console.error('❌ Cannot emit experiment state - WebSocket not initialized');
      return;
    }
    
    this.io!.to(`experiment-${experimentId}`).emit('experiment_state', state);
  }

  public emitToAll(eventName: string, data: any) {
    console.log('🔍 EmitToAll called:', eventName);
    if (!this.ensureInitialized()) {
      console.error('❌ Cannot broadcast to all - WebSocket not initialized');
      return;
    }
    
    this.io!.emit(eventName, data);
    console.log(`📢 SUCCESSFULLY BROADCAST ${eventName} to all clients:`, { experimentId: data.experimentId });
  }
}

export default WebSocketManager; 