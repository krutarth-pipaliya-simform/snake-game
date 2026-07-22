import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';
import { RoomSimulation, nextColor } from '../simulation/RoomSimulation';
import { getRoom, setRoom, getRoomBySocketId } from '../simulation/roomManager';
import { generateRoomCode } from '../utils/roomCode';
import prisma from '../db/prisma';

export function registerRoomHandlers(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>
) {
  // ─── room:create ─────────────────────────────────────────────────────────────
  socket.on('room:create', async ({ hostName }) => {
    const playerId = `player-${socket.id}`;
    const code = generateRoomCode();
    const room = new RoomSimulation(code, playerId, socket.id, hostName || 'Host');

    setRoom(code, room);
    socket.join(code);

    // Persist room record to Postgres for durability/history
    try {
      await prisma.room.create({ data: { code, hostId: playerId } });
    } catch (err) {
      console.error('[DB] Failed to persist room:', err);
      // Non-fatal: room still works from in-memory state
    }

    socket.emit('room:state', room.toClientRoom());
    console.log(`[Room] Created: ${code} by ${hostName} (${playerId})`);
  });

  // ─── room:join ───────────────────────────────────────────────────────────────
  socket.on('room:join', async ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    let room = getRoom(code);

    if (!room) {
      // Check database if it was dropped from memory
      try {
        const dbRoom = await prisma.room.findUnique({ where: { code } });
        if (dbRoom) {
          // Check expiry (e.g., 2 hours)
          const ageHours = (Date.now() - dbRoom.createdAt.getTime()) / (1000 * 60 * 60);
          if (ageHours > 2) {
            socket.emit('error', { message: `Room "${code}" has expired.` });
            return;
          }
          
          // Re-hydrate room in memory
          const playerId = `player-${socket.id}`;
          room = new RoomSimulation(code, playerId, socket.id, playerName || 'Host');
          setRoom(code, room);
        } else {
          socket.emit('error', { message: `Room "${code}" not found.` });
          return;
        }
      } catch (err) {
        console.error('[DB] Failed to query room:', err);
        socket.emit('error', { message: `Room "${code}" not found.` });
        return;
      }
    }

    // Allow joining during in_round (Phase 10: Late Joins)

    const playerId = `player-${socket.id}`;

    // If the room is currently empty, this new player becomes the host
    if (Object.keys(room.players).length === 0) {
      room.hostId = playerId;
      console.log(`[Room] ${room.code} was empty. ${playerId} is the new host.`);
    }

    // Idempotent: update socketId if player is rejoining
    if (room.players[playerId]) {
      room.players[playerId].socketId = socket.id;
    } else {
      room.players[playerId] = {
        id: playerId,
        socketId: socket.id,
        name: playerName || 'Player',
        team: '',
        alive: false,
        color: nextColor(),
        segments: [],
        direction: { x: 1, y: 0 },
        boosting: false,
        score: 0,
        kills: 0,
        inPipeTransit: null,
        lastInputAt: Date.now(),
        isReady: false,
        diedAt: null,
      };

      if (room.status === 'in_round') {
        // Auto-assign team
        const teamIds = Object.keys(room.teams);
        const assignedTeam = teamIds[Math.floor(Math.random() * teamIds.length)] || 'team-1';
        room.players[playerId].team = assignedTeam;
        if (room.teams[assignedTeam] && !room.teams[assignedTeam].playerIds.includes(playerId)) {
          room.teams[assignedTeam].playerIds.push(playerId);
        }
        
        // Mark them as dead so respawn logic picks them up (if respawns are enabled)
        room.players[playerId].diedAt = Date.now();
      }
    }

    socket.join(code);
    io.to(code).emit('room:state', room.toClientRoom());
    console.log(`[Room] ${playerName} (${playerId}) joined ${code}`);
  });

  // ─── team:join ───────────────────────────────────────────────────────────────
  socket.on('team:join', ({ teamId }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const team = room.teams[teamId];
    if (!team) {
      socket.emit('error', { message: `Team "${teamId}" does not exist.` });
      return;
    }
    if (team.playerIds.length >= room.settings.teamCap) {
      socket.emit('error', { message: 'That team is full.' });
      return;
    }

    const playerId = `player-${socket.id}`;
    const player = room.players[playerId];
    if (!player) return;

    // Remove from previous team first
    if (player.team && room.teams[player.team]) {
      const prev = room.teams[player.team];
      prev.playerIds = prev.playerIds.filter(id => id !== playerId);
      if (prev.leaderId === playerId) {
        prev.leaderId = prev.playerIds[0] ?? '';
      }
    }

    team.playerIds.push(playerId);
    if (!team.leaderId) team.leaderId = playerId;
    player.team = teamId;

    io.to(room.code).emit('room:state', room.toClientRoom());
  });

  // ─── team:kick ───────────────────────────────────────────────────────────────
  socket.on('team:kick', ({ targetPlayerId }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const kickerId = `player-${socket.id}`;
    const kicker = room.players[kickerId];
    const target = room.players[targetPlayerId];

    if (!kicker || !target) return;

    // Only team leader can kick players from their own team
    const kickerTeam = kicker.team ? room.teams[kicker.team] : null;
    if (!kickerTeam || kickerTeam.leaderId !== kickerId) {
      socket.emit('error', { message: 'Only the team leader can kick players.' });
      return;
    }
    if (target.team !== kicker.team) {
      socket.emit('error', { message: 'You can only kick players from your own team.' });
      return;
    }

    // Find teams with space (excluding current team) per spec
    const teamsWithSpace = Object.entries(room.teams)
      .filter(([id, t]) => id !== target.team && t.playerIds.length < room.settings.teamCap)
      .map(([id]) => id);

    if (teamsWithSpace.length === 0) {
      socket.emit('error', { message: 'No team has space — cannot kick.' });
      return;
    }

    // Remove from current team
    kickerTeam.playerIds = kickerTeam.playerIds.filter(id => id !== targetPlayerId);
    if (kickerTeam.leaderId === targetPlayerId) {
      kickerTeam.leaderId = kickerTeam.playerIds[0] ?? '';
    }

    // Assign to a RANDOM team with space (per spec — host does not choose)
    const destTeamId = teamsWithSpace[Math.floor(Math.random() * teamsWithSpace.length)];
    const destTeam = room.teams[destTeamId];
    destTeam.playerIds.push(targetPlayerId);
    if (!destTeam.leaderId) destTeam.leaderId = targetPlayerId;
    target.team = destTeamId;

    io.to(room.code).emit('room:state', room.toClientRoom());
    console.log(`[Room] ${kickerId} kicked ${targetPlayerId} to ${destTeamId} in ${room.code}`);
  });

  // ─── settings:update ─────────────────────────────────────────────────────────
  socket.on('settings:update', (settings) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const requesterId = `player-${socket.id}`;
    if (room.hostId !== requesterId) {
      socket.emit('error', { message: 'Only the host can change settings.' });
      return;
    }

    if (settings.roundDurationSeconds !== undefined) {
      room.settings.roundDurationSeconds = Math.max(1, settings.roundDurationSeconds);
    }
    if (settings.teamCap !== undefined) {
      room.settings.teamCap = Math.max(1, settings.teamCap);
    }
    if ('respawnDelaySeconds' in settings) {
      const v = settings.respawnDelaySeconds;
      room.settings.respawnDelaySeconds =
        v === null ? null : Math.min(60, Math.max(1, v ?? 5));
    }
    if (settings.roundsPerMatch !== undefined) {
      room.settings.roundsPerMatch = Math.max(1, settings.roundsPerMatch);
    }
    if (settings.teamCount !== undefined) {
      const newCount = Math.max(2, settings.teamCount);
      if (newCount !== room.settings.teamCount) {
        room.settings.teamCount = newCount;
        room.rebuildTeams(newCount);
      }
    }

    io.to(room.code).emit('room:state', room.toClientRoom());
  });

  // ─── player:ready ──────────────────────────────────────────────────────────────
  socket.on('player:ready', ({ isReady }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const playerId = `player-${socket.id}`;
    const player = room.players[playerId];
    if (player) {
      player.isReady = isReady;
      io.to(room.code).emit('room:state', room.toClientRoom());
    }
  });

  // ─── disconnect cleanup ───────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const playerId = `player-${socket.id}`;
    const player = room.players[playerId];

    if (player?.team && room.teams[player.team]) {
      const team = room.teams[player.team];
      team.playerIds = team.playerIds.filter(id => id !== playerId);
      if (team.leaderId === playerId) {
        team.leaderId = team.playerIds[0] ?? '';
      }
    }

    delete room.players[playerId];

    // If host left, promote the first remaining player
    if (room.hostId === playerId) {
      const remaining = Object.keys(room.players);
      if (remaining.length > 0) {
        room.hostId = remaining[0];
        console.log(`[Room] Host left ${room.code}, new host: ${room.hostId}`);
      } else {
        console.log(`[Room] ${room.code} is now empty.`);
        return; // No one to broadcast to
      }
    }

    io.to(room.code).emit('room:state', room.toClientRoom());
  });
}
