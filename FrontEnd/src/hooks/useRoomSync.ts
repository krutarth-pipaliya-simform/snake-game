import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { socket } from '../realtime/socketClient';
import { setRoom } from '../store/roomSlice';
import { setLocalPlayerId } from '../store/localPlayerSlice';
import type { Room } from '../../../shared/types/room';

export function useRoomSync() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen for authoritative room state from server
    socket.on('room:state', (roomState) => {
      const room = roomState as Room;
      dispatch(setRoom(room));
      
      // Update local player ID if it exists in the server players map for our socket
      for (const player of Object.values(room.players || {})) {
        // We know player.id is in the format "player-<socketId>"
        if (player.id === `player-${socket.id}`) {
          dispatch(setLocalPlayerId(player.id));
          break;
        }
      }
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

  const setReadyState = useCallback((isReady: boolean) => {
    socket.emit('player:ready', { isReady });
  }, []);

  const presenceMap: Record<string, any> = {};
  
  // Use a global selector for room to generate presence map, 
  // but it's easier to just return it directly or update it if needed.
  // Actually, Lobby.tsx gets room from selector directly, so it can use room.players directly!
  // Wait, Lobby currently takes presenceMap from here, let's keep it compatible if it relies on it.
  
  return { 
    presenceMap, 
    createRoom, 
    joinRoom, 
    joinTeam, 
    kickPlayer, 
    updateSettings, 
    startRound,
    setReadyState
  };
}
