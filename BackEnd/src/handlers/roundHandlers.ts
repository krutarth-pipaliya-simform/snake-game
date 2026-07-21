import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';

export function registerRoundHandlers(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>
) {
  socket.on('round:start', () => {
    // Stub
    console.log('round:start');
  });

  socket.on('round:voteEnd', () => {
    // Stub
    console.log('round:voteEnd');
  });
}
