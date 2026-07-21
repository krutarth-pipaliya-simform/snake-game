import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { socket } from '../realtime/socketClient';
import { setRoom } from '../store/roomSlice';
import type { Room } from '../../../shared/types/room';

export function useRoomSync() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen for authoritative room state from server
    socket.on('room:state', (roomState) => {
      dispatch(setRoom(roomState as Room));
    });

    socket.on('error', ({ message }) => {
      console.error('[Server Error]', message);
    });

    return () => {
      socket.off('room:state');
      socket.off('error');
    };
  }, [dispatch]);

  const createRoom = useCallback((hostName: string) => {
    socket.emit('room:create', { hostName });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socket.emit('room:join', { roomCode, playerName });
  }, []);

  const joinTeam = useCallback((teamId: string) => {
    socket.emit('team:join', { teamId });
  }, []);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    socket.emit('team:kick', { targetPlayerId });
  }, []);

  const updateSettings = useCallback((settings: Partial<Room['settings']>) => {
    socket.emit('settings:update', settings);
  }, []);

  const startRound = useCallback(() => {
    socket.emit('round:start', {});
  }, []);

  // Return empty presence map for compatibility with UI until fully wired
  const presenceMap: Record<string, any> = {};
  return { 
    presenceMap, 
    createRoom, 
    joinRoom, 
    joinTeam, 
    kickPlayer, 
    updateSettings, 
    startRound 
  };
}
