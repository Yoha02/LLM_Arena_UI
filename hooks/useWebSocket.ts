import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ExperimentEvent, StreamingMessage } from '@/lib/websocket-manager';
import { ExperimentState } from '@/lib/types';

interface UseWebSocketProps {
  experimentId?: string;
  onExperimentEvent?: (event: ExperimentEvent) => void;
  onStreamingMessage?: (message: StreamingMessage) => void;
  onExperimentState?: (state: ExperimentState) => void;
  onExperimentCreated?: (data: { experimentId: string; config: any; timestamp: string }) => void;
  onModelMetrics?: (data: { model: 'A' | 'B'; metrics: any }) => void;
}

export const useWebSocket = ({
  experimentId,
  onExperimentEvent,
  onStreamingMessage,
  onExperimentState,
  onExperimentCreated,
  onModelMetrics
}: UseWebSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isInitialized = useRef(false);
  
  // Use refs to avoid stale closures
  const onExperimentEventRef = useRef(onExperimentEvent);
  const onStreamingMessageRef = useRef(onStreamingMessage);
  const onExperimentStateRef = useRef(onExperimentState);
  const onExperimentCreatedRef = useRef(onExperimentCreated);
  const onModelMetricsRef = useRef(onModelMetrics);
  
  // Update refs when handlers change but don't cause re-renders
  useEffect(() => {
    onExperimentEventRef.current = onExperimentEvent;
  }, [onExperimentEvent]);
  
  useEffect(() => {
    onStreamingMessageRef.current = onStreamingMessage;
  }, [onStreamingMessage]);
  
  useEffect(() => {
    onExperimentStateRef.current = onExperimentState;
  }, [onExperimentState]);
  
  useEffect(() => {
    onExperimentCreatedRef.current = onExperimentCreated;
  }, [onExperimentCreated]);
  
  useEffect(() => {
    onModelMetricsRef.current = onModelMetrics;
  }, [onModelMetrics]);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      return;
    }
    
    isInitialized.current = true;
    
    // Initialize socket connection with automatic host detection
    // No URL parameter = automatically connects to the same host that served the page
    const newSocket = io({
      transports: ['websocket', 'polling'], // Allow polling fallback
      upgrade: true, // Allow transport upgrades
      timeout: 10000, // Longer timeout
      reconnection: true,
      reconnectionAttempts: 10, // More retry attempts
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: false, // Reuse existing connection if possible
      rememberUpgrade: true // Remember successful upgrades
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Enhanced connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id, 'Transport:', newSocket.io.engine.transport.name);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, need to reconnect manually
        console.log('🔄 Attempting manual reconnection...');
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
    });

    // Monitor transport changes
    newSocket.on('upgrade', () => {
      console.log('⬆️ Transport upgraded to:', newSocket.io.engine.transport.name);
    });

    newSocket.on('upgradeError', (error) => {
      console.warn('⚠️ Transport upgrade failed:', error);
    });

    // Enhanced reconnection handling
    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      setConnectionError(`Reconnecting... (attempt ${attemptNumber})`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('💥 All reconnection attempts failed');
      setConnectionError('Connection failed permanently. Please refresh the page.');
      setIsConnected(false);
    });

    // Connection confirmation handler
    newSocket.on('connection-confirmed', (data: any) => {
      console.log('✅ Connection confirmed:', data);
    });

    newSocket.on('joined-experiment', (data: any) => {
      console.log('🏠 Joined experiment confirmed:', data);
    });

    // Handle experiment creation broadcast
    newSocket.on('experiment_created', (data: any) => {
      console.log('📢 New experiment created:', data.experimentId);
      
      // Automatically join the new experiment room
      if (data.experimentId) {
        console.log('🔄 Auto-joining experiment room:', data.experimentId);
        newSocket.emit('join-experiment', data.experimentId);
      }
      
      // Notify the parent component
      if (onExperimentCreatedRef.current) {
        try {
          onExperimentCreatedRef.current(data);
        } catch (error) {
          console.error('Error handling experiment created event:', error);
        }
      }
    });

    // Experiment event handlers with safe callback checks
    newSocket.on('experiment_event', (event: ExperimentEvent) => {
      console.log('📡 Received experiment event:', event.type, event.data);
      if (onExperimentEventRef.current) {
        try {
          onExperimentEventRef.current(event);
        } catch (error) {
          console.error('Error handling experiment event:', error);
        }
      }
    });

    newSocket.on('message_stream', (message: StreamingMessage) => {
      console.log('📨 ✅ RECEIVED STREAMING MESSAGE:', { 
        id: message.id, 
        model: message.model, 
        isComplete: message.isComplete,
        contentLength: message.content.length,
        content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
      });
      if (onStreamingMessageRef.current) {
        try {
          onStreamingMessageRef.current(message);
        } catch (error) {
          console.error('Error handling streaming message:', error);
        }
      } else {
        console.warn('⚠️ No streaming message handler available');
      }
    });

    // Add test message listener to verify WebSocket communication
    newSocket.on('test_message', (data) => {
      console.log('🧪 ✅ TEST MESSAGE RECEIVED:', data);
    });

    // Add test listener to see if we receive ANY events
    newSocket.onAny((eventName, ...args) => {
      if (eventName.includes('stream') || eventName.includes('experiment') || eventName.includes('test')) {
        console.log(`🔍 Received event: ${eventName}`, args.length > 0 ? args[0] : '');
      }
    });

    newSocket.on('experiment_state', (state: ExperimentState) => {
      console.log('Received experiment state:', state);
      if (onExperimentStateRef.current) {
        try {
          onExperimentStateRef.current(state);
        } catch (error) {
          console.error('Error handling experiment state:', error);
        }
      }
    });

    newSocket.on('model_metrics', (data: { model: 'A' | 'B'; metrics: any }) => {
      console.log(`📊 Received metrics for Model ${data.model}:`, data.metrics);
      if (onModelMetricsRef.current) {
        try {
          onModelMetricsRef.current(data);
        } catch (error) {
          console.error('Error handling model metrics:', error);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      isInitialized.current = false;
    };
  }, []); // Empty dependencies to prevent re-initialization

  useEffect(() => {
    // Join experiment room when experimentId changes and socket is connected
    if (socket && experimentId && isConnected) {
      console.log('🏠 Manually joining experiment room:', experimentId);
      socket.emit('join-experiment', experimentId);
      
      // Also try to rejoin after a brief delay to ensure connection
      setTimeout(() => {
        if (socket.connected) {
          console.log('🔄 Re-joining experiment room to ensure connection:', experimentId);
          socket.emit('join-experiment', experimentId);
        }
      }, 1000);
    }
  }, [socket, experimentId, isConnected]);

  const joinExperiment = (id: string) => {
    if (socket && isConnected) {
      socket.emit('join-experiment', id);
    }
  };

  const leaveExperiment = (id: string) => {
    if (socket && isConnected) {
      socket.emit('leave-experiment', id);
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    joinExperiment,
    leaveExperiment
  };
}; 