import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';
// import { getRoom, createRoom } from '../simulation/roomManager';

export function registerRoomHandlers(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>
) {
  socket.on('room:create', ({ hostName }) => {
    // Stub
    console.log('room:create', hostName);
  });

  socket.on('room:join', ({ roomCode, playerName }) => {
    // Stub
    console.log('room:join', roomCode, playerName);
  });
  
  socket.on('team:join', ({ teamId }) => {
    // Stub
    console.log('team:join', teamId);
  });

  socket.on('team:kick', ({ targetPlayerId }) => {
    // Stub
    console.log('team:kick', targetPlayerId);
  });

  socket.on('settings:update', (settings) => {
    // Stub
    console.log('settings:update', settings);
  });
}
