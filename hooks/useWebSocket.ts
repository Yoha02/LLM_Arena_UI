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
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, need to reconnect manually
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
      // Transport upgraded successfully
    });

    newSocket.on('upgradeError', () => {
      // Transport upgrade failed, will continue with current transport
    });

    // Enhanced reconnection handling
    newSocket.on('reconnect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      setConnectionError(`Reconnecting... (attempt ${attemptNumber})`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed permanently');
      setConnectionError('Connection failed permanently. Please refresh the page.');
      setIsConnected(false);
    });

    // Connection confirmation handler
    newSocket.on('connection-confirmed', () => {
      // Connection confirmed by server
    });

    newSocket.on('joined-experiment', () => {
      // Joined experiment room confirmed
    });

    // Handle experiment creation broadcast
    newSocket.on('experiment_created', (data: any) => {
      // Automatically join the new experiment room
      if (data.experimentId) {
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
      if (onExperimentEventRef.current) {
        try {
          onExperimentEventRef.current(event);
        } catch (error) {
          console.error('Error handling experiment event:', error);
        }
      }
    });

    newSocket.on('message_stream', (message: StreamingMessage) => {
      if (onStreamingMessageRef.current) {
        try {
          onStreamingMessageRef.current(message);
        } catch (error) {
          console.error('Error handling streaming message:', error);
        }
      }
    });

    // Test message listener for development
    newSocket.on('test_message', () => {
      // Test message received - used for debugging
    });

    newSocket.on('experiment_state', (state: ExperimentState) => {
      if (onExperimentStateRef.current) {
        try {
          onExperimentStateRef.current(state);
        } catch (error) {
          console.error('Error handling experiment state:', error);
        }
      }
    });

    newSocket.on('model_metrics', (data: { model: 'A' | 'B'; metrics: any }) => {
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
      socket.emit('join-experiment', experimentId);
      
      // Also try to rejoin after a brief delay to ensure connection
      setTimeout(() => {
        if (socket.connected) {
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