import { useEffect, useState } from 'react';
import { socket } from './socketClient';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useSocketConnection(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    socket.connect();
    setStatus('connecting');

    socket.on('connect', () => setStatus('connected'));
    socket.on('connect_error', () => setStatus('error'));
    socket.on('disconnect', () => setStatus('disconnected'));

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
    };
  }, []);

  return status;
}
