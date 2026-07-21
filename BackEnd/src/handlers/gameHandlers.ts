import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';

export function registerGameHandlers(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>
) {
  socket.on('input:direction', ({ x, y }) => {
    // Stub
    console.log('input:direction', x, y);
  });

  socket.on('input:boost', ({ boosting }) => {
    // Stub
    console.log('input:boost', boosting);
  });
}
