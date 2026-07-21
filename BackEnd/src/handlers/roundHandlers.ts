import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';
import { getRoomBySocketId } from '../simulation/roomManager';

export function registerRoundHandlers(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>
) {
  socket.on('round:start', () => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const requesterId = `player-${socket.id}`;
    if (room.hostId !== requesterId) {
      socket.emit('error', { message: 'Only the host can start the round.' });
      return;
    }
    if (room.status !== 'lobby') return;

    room.status = 'in_round';
    room.roundStartedAt = Date.now();

    io.to(room.code).emit('room:state', room.toClientRoom());
    console.log(`[Round] Started in room ${room.code}`);
  });

  socket.on('round:voteEnd', () => {
    const room = getRoomBySocketId(socket.id);
    if (!room || room.status !== 'in_round') return;

    const playerId = `player-${socket.id}`;
    room.votesToEndRound.add(playerId);

    // Check if all alive players have voted
    const alivePlayers = Object.values(room.players).filter(p => p.alive);
    const allVoted = alivePlayers.length > 0 &&
      alivePlayers.every(p => room.votesToEndRound.has(p.id));

    if (allVoted) {
      room.status = 'round_ended';
      io.to(room.code).emit('round:ended', { winner: null, teamResults: {} });
    }
  });
}
