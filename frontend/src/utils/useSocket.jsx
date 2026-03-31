import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (queueId, onUpdate) => {
  const socketRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const nextSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);

    const handleQueueUpdate = (data) => {
      console.log('📝 Queue Update via Socket:', data);
      onUpdateRef.current?.(data);
    };

    const handleConnectError = (err) => {
      console.error('🔌 Socket Connect Error:', err.message);
    };

    nextSocket.on('queue_update', handleQueueUpdate);
    nextSocket.on('connect_error', handleConnectError);

    return () => {
      nextSocket.off('queue_update', handleQueueUpdate);
      nextSocket.off('connect_error', handleConnectError);
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  useEffect(() => {
    if (queueId && socketRef.current) {
      socketRef.current.emit('join_queue_room', queueId);
    }
  }, [queueId]);

  return socket;
};

export const useAdminSocket = (onUpdate) => {
  const socketRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const nextSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);

    const handleAdminUpdate = () => {
      console.log('📊 Admin Stats Update via Socket');
      onUpdateRef.current?.();
    };

    nextSocket.on('admin_stats_update', handleAdminUpdate);

    return () => {
      nextSocket.off('admin_stats_update', handleAdminUpdate);
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  return socket;
};
