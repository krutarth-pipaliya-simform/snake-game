import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';
import { getRoomBySocketId } from '../simulation/roomManager';
import { simulateTick } from '../simulation/tickLoop';

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

    // Spawn players
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    for (const player of Object.values(room.players)) {
      // Auto-assign to a team if they haven't picked one
      if (!player.team) {
        const teamIds = Object.keys(room.teams);
        const assignedTeam = teamIds[Math.floor(Math.random() * teamIds.length)] || 'team-1';
        player.team = assignedTeam;
        if (room.teams[assignedTeam] && !room.teams[assignedTeam].playerIds.includes(player.id)) {
          room.teams[assignedTeam].playerIds.push(player.id);
        }
      }
      
      player.alive = true;
      player.diedAt = null;
      player.score = 0;
      player.kills = 0;
      
      const spawnX = Math.random() * (room.map.width - 400) + 200;
      const spawnY = Math.random() * (room.map.height - 400) + 200;
      player.direction = dirs[Math.floor(Math.random() * dirs.length)];
      
      player.segments = [];
      for (let i = 0; i < 5; i++) {
        player.segments.push({
          x: spawnX - (player.direction.x * i * 15),
          y: spawnY - (player.direction.y * i * 15)
        });
      }
    }
    
    // Start tick loop at ~20Hz (50ms)
    if (room.tickInterval) clearInterval(room.tickInterval);
    room.tickInterval = setInterval(() => simulateTick(room, io), 50);

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
      if (room.currentRound < room.settings.roundsPerMatch) {
        room.status = 'round_ended';
      } else {
        room.status = 'match_ended';
      }

      if (room.tickInterval) {
        clearInterval(room.tickInterval);
        room.tickInterval = null;
      }
      io.to(room.code).emit('round:ended', { winner: null, teamResults: {} });
      io.to(room.code).emit('room:state', room.toClientRoom());

      if (room.status === 'round_ended') {
        setTimeout(() => {
          room.currentRound++;
          room.status = 'in_round';
          room.roundStartedAt = Date.now();
          // Respawn players
          const spawnDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
          for (const p of Object.values(room.players)) {
            p.alive = true;
            p.diedAt = null;
            p.score = 0;
            p.kills = 0;
            const spawnX = Math.random() * (room.map.width - 400) + 200;
            const spawnY = Math.random() * (room.map.height - 400) + 200;
            p.direction = spawnDirs[Math.floor(Math.random() * spawnDirs.length)];
            p.segments = [];
            for (let i = 0; i < 5; i++) {
              p.segments.push({ x: spawnX - (p.direction.x * i * 15), y: spawnY - (p.direction.y * i * 15) });
            }
          }
          room.tickInterval = setInterval(() => simulateTick(room, io), 50);
          io.to(room.code).emit('room:state', room.toClientRoom());
        }, 5000);
      } else if (room.status === 'match_ended') {
        setTimeout(() => {
          room.currentRound = 1;
          room.status = 'lobby';
          for (const p of Object.values(room.players)) { p.isReady = false; }
          io.to(room.code).emit('room:state', room.toClientRoom());
        }, 5000);
      }
    }
  });
}
