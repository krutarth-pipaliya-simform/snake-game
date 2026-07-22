import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';

import { getRoomBySocketId } from '../simulation/roomManager';

export function registerGameHandlers(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>
) {
  socket.on('input:direction', ({ x, y }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.players[`player-${socket.id}`];
    if (player) {
      player.direction = { x, y };
      player.lastInputAt = Date.now();
    }
  });

  socket.on('input:boost', ({ boosting }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.players[`player-${socket.id}`];
    if (player) {
      player.boosting = boosting;
      player.lastInputAt = Date.now();
    }
  });

  // Ping: echo the client's timestamp straight back — no server clock involved
  socket.on('ping:req', ({ t }) => {
    socket.emit('ping:ack', { t });
  });
}
