import { RoomSimulation } from './RoomSimulation';
import type { Server } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';
import type { Segment } from '@shared/types/player';
import type { Pellet } from '@shared/types/pellet';

const SPEED = 300; // pixels per second
const COLLISION_RADIUS = 15;
const SEGMENT_DISTANCE = 15;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

let nextPelletId = 0;

function spawnPellet(room: RoomSimulation): Pellet {
  return {
    id: String(nextPelletId++),
    x: Math.random() * (room.map.width - 200) + 100,
    y: Math.random() * (room.map.height - 200) + 100,
    tier: 'small', // simplified for backend
  };
}

export function simulateTick(room: RoomSimulation, io: Server<ClientEvents, ServerEvents>) {
  room.tickCount++;
  const dt = 0.05; // 50ms per tick (20Hz)
  const moveDist = SPEED * dt;

  const now = Date.now();
  const allPlayers = Object.values(room.players);

  // Clear expired debuffs
  if (room.debuff && now > room.debuff.expiresAt) {
    console.log(`[Effect Expiration] Debuff expired in room ${room.code}`);
    room.debuff = null;
  }

  // 0. Respawn Logic
  if (room.settings.respawnDelaySeconds !== null) {
    for (const player of allPlayers) {
      if (!player.alive && player.diedAt !== null) {
        if (now - player.diedAt >= room.settings.respawnDelaySeconds * 1000) {
          player.alive = true;
          player.diedAt = null;
          player.score = Math.floor(player.score * 0.5); // 50% score penalty on death
          const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
          const spawnX = Math.random() * (room.map.width - 400) + 200;
          const spawnY = Math.random() * (room.map.height - 400) + 200;
          player.direction = dirs[Math.floor(Math.random() * dirs.length)];
          player.segments = [];
          for (let i = 0; i < 5; i++) {
            player.segments.push({ x: spawnX - (player.direction.x * i * 15), y: spawnY - (player.direction.y * i * 15) });
          }
        }
      }
    }
  }

  // 1. Move players
  for (const player of allPlayers) {
    if (!player.alive) continue;

    const head = { ...player.segments[0] };
    if (!head) continue; // safety check

    // Handle Pipe Transit
    if (player.inPipeTransit) {
      player.inPipeTransit.progress += 0.1; // 50ms per tick, 500ms total

      const entryPipe = room.map.pipes.find((p: any) => p.id === player.inPipeTransit!.pipeId);
      const exitPipe = room.map.pipes.find((p: any) => p.id === entryPipe?.linkedPipeId);

      if (entryPipe && exitPipe) {
        if (player.inPipeTransit.progress >= 1.0) {
          // Transit complete
          head.x = exitPipe.x;
          head.y = exitPipe.y;
          player.inPipeTransit = null;
          player.ignoredPipeId = exitPipe.id;
        } else {
          // Interpolate
          head.x = entryPipe.x + (exitPipe.x - entryPipe.x) * player.inPipeTransit.progress;
          head.y = entryPipe.y + (exitPipe.y - entryPipe.y) * player.inPipeTransit.progress;
        }
      } else {
        // Fallback if pipes missing
        player.inPipeTransit = null;
      }
      
      const oldHead = player.segments[0];
      const d = Math.sqrt((head.x - oldHead.x) ** 2 + (head.y - oldHead.y) ** 2);
      const steps = Math.max(1, Math.floor(d / 15));
      
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        player.segments.unshift({
          x: oldHead.x + (head.x - oldHead.x) * t,
          y: oldHead.y + (head.y - oldHead.y) * t
        });
        player.segments.pop();
      }
      
      continue; // Skip normal movement
    }

    const isActuallyBoosting = player.boosting && player.segments.length > 3;
    const speedMultiplier = isActuallyBoosting ? 1.5 : 1.0;
    const currentMoveDist = moveDist * speedMultiplier;

    head.x += player.direction.x * currentMoveDist;
    head.y += player.direction.y * currentMoveDist;

    // Clamp to map and kill if they hit the boundary
    if (head.x <= 0 || head.x >= room.map.width || head.y <= 0 || head.y >= room.map.height) {
      player.alive = false;
    }
    
    // Clamp to map visually just in case
    head.x = Math.max(0, Math.min(room.map.width, head.x));
    head.y = Math.max(0, Math.min(room.map.height, head.y));

    // Simple segment trailing for the backend:
    // Insert new head, pop tail
    player.segments.unshift(head);
    
    // Boosting shrinks the snake predictably (every 15 ticks instead of 5, giving 3x more boost time)
    if (isActuallyBoosting && room.tickCount % 15 === 0) {
        const droppedTail = player.segments.pop(); // additional pop to shrink
        if (droppedTail) {
            player.score = Math.max(0, player.score - 10); // Lose score corresponding to the segment
            room.map.pellets.push({
                id: String(nextPelletId++),
                x: droppedTail.x,
                y: droppedTail.y,
                tier: 'small',
            });
        }
    }
    
    // Always pop one to maintain length unless eating
    player.segments.pop();

    // Check if entered a pipe this tick
    if (player.alive && !player.inPipeTransit) {
      let stillInIgnored = false;
      for (const pipe of room.map.pipes) {
        if (distance(head, pipe) < COLLISION_RADIUS * 2) {
          if (pipe.id === player.ignoredPipeId) {
            stillInIgnored = true;
            continue;
          }
          player.inPipeTransit = { pipeId: pipe.id, progress: 0.0 };
          player.ignoredPipeId = null;
          break; // Only enter one pipe
        }
      }
      if (!stillInIgnored) {
        player.ignoredPipeId = null;
      }
    }
  }

  // 2. Collision & Pellets
  for (const player of allPlayers) {
    if (!player.alive || player.segments.length === 0) continue;
    
    const head = player.segments[0];
    
    // Check pellet eating
    for (let i = room.map.pellets.length - 1; i >= 0; i--) {
      const pellet = room.map.pellets[i];
      const pelletRadius = pellet.tier === 'large' ? 15 : pellet.tier === 'medium' ? 10 : 6;
      if (distance(head, pellet) < COLLISION_RADIUS + pelletRadius) {
        room.map.pellets.splice(i, 1);
        player.score += 10;
        player.segments.push({ ...player.segments[player.segments.length - 1] }); // grow 1 segment
      }
    }
    
    // Check Confusion Orb
    if (room.map.confusionOrb && room.map.confusionOrb.active) {
      if (distance(head, room.map.confusionOrb) < COLLISION_RADIUS + 25) { // Orb radius ~25
        console.log(`[Orb Pickup Detection] Player ${player.id} on team ${player.team} collected the Confusion Orb!`);
        room.map.confusionOrb.active = false;
        room.map.confusionOrb.spawnsAt = Date.now() + 25000;
        const debuffedTeams = Object.keys(room.teams).filter(id => id !== player.team);
        console.log(`[Backend Processing] Debuffing teams: ${debuffedTeams.join(', ')}`);
        room.debuff = {
          teams: debuffedTeams,
          expiresAt: Date.now() + 15000, // 15 seconds
          clearedPlayers: []
        };
        console.log(`[Event Emission] Set room.debuff:`, room.debuff);
        
        // Schedule reactivation after 25 seconds (15s debuff + 10s cooldown)
        setTimeout(() => {
          if (room.map.confusionOrb) {
            room.map.confusionOrb.active = true;
            room.map.confusionOrb.spawnsAt = null;
            room.map.confusionOrb.x = Math.random() * (room.map.width - 400) + 200;
            room.map.confusionOrb.y = Math.random() * (room.map.height - 400) + 200;
            io.to(room.code).emit('room:state', room.toClientRoom()); // Re-sync orb pos
          }
        }, 25000);
      }
    }
    
    // Check player collisions (per spec Phase 4 pseudocode)
    let died = false;
    for (const other of allPlayers) {
      if (!other.alive || other.segments.length === 0) continue;

      // Per spec: ALWAYS skip self — self-collision is intentionally not fatal
      if (player.id === other.id) continue;

      const isTeammate = player.team === other.team;
      // Debuff applies friendly-fire: only skip teammates when debuff is NOT active on this player's team
      const debuffActive = !!(
        room.debuff && 
        room.debuff.teams.includes(player.team || '') &&
        !room.debuff.clearedPlayers?.includes(player.id)
      );
      if (isTeammate && !debuffActive) continue;

      for (let i = 0; i < other.segments.length; i++) {
        const seg = other.segments[i];
        if (distance(head, seg) < COLLISION_RADIUS) {
          if (i === 0) {
            // Head-to-Head: larger snake wins; equal size = both die
            if (player.segments.length > other.segments.length) {
              other.alive = false;
              player.kills += 1;
            } else if (player.segments.length < other.segments.length) {
              player.alive = false;
              other.kills += 1;
              died = true;
            } else {
              player.alive = false;
              other.alive = false;
              died = true;
            }
          } else {
            // Head-to-Body: always fatal to the head-owner
            player.alive = false;
            other.kills += 1;
            died = true;
          }
          break;
        }
      }
      if (died) break;
    }
  }

  // Handle death (drop pellets)
  for (const player of allPlayers) {
    if (!player.alive && player.segments.length > 0) {
      player.diedAt = Date.now();
      
      if (room.debuff) {
        room.debuff.clearedPlayers = room.debuff.clearedPlayers || [];
        if (!room.debuff.clearedPlayers.includes(player.id)) {
          room.debuff.clearedPlayers.push(player.id);
        }
      }

      // Turn segments into pellets
      for (const seg of player.segments) {
        room.map.pellets.push({
          id: String(nextPelletId++),
          x: seg.x,
          y: seg.y,
          tier: 'small',
        });
      }
      player.segments = []; // Clear segments so we don't drop again
    }
  }

  // Refill pellets if too low
  while (room.map.pellets.length < 50) {
    room.map.pellets.push(spawnPellet(room));
  }

  // 3. Round end condition check (Phase 6)
  if (room.settings.roundDurationSeconds && room.roundStartedAt) {
    const elapsedSeconds = (Date.now() - room.roundStartedAt) / 1000;
    if (elapsedSeconds >= room.settings.roundDurationSeconds) {
      if (room.currentRound < room.settings.roundsPerMatch) {
        room.status = 'round_ended';
        // Auto-start next round after a delay, but we'll do this on the frontend or via a timeout here.
        // For now just set round_ended, and in roundHandlers we wait or we just set match_ended?
        // Wait, the user said "after the match ends people will be in the room again"
      } else {
        room.status = 'match_ended';
      }
      
      if (room.tickInterval) {
        clearInterval(room.tickInterval);
        room.tickInterval = null;
      }
      
      // Reset ready state for all players so they must re-ready for next round
      for (const p of Object.values(room.players)) { p.isReady = false; }
      
      const results = room.calculateRoundResults();
      console.log(`[Round] Round ended for room ${room.code}. Status: ${room.status}`);
      io.to(room.code).emit('round:ended', results);
      io.to(room.code).emit('room:state', room.toClientRoom());
      
      if (room.status === 'round_ended') {
        // UI overlay should provide a button to start next round
      } else if (room.status === 'match_ended') {
        // UI overlay should provide a button to return to lobby
      }
    }
  }

  // 4. Broadcast
  if (room.status === 'in_round') {
    io.to(room.code).emit('tick:state', {
      players: Object.values(room.players).map(p => ({
         id: p.id,
         socketId: p.socketId,
         name: p.name,
         team: p.team,
         alive: p.alive,
         color: p.color,
         segments: p.segments,
         direction: p.direction,
         boosting: p.boosting,
         score: p.score,
         kills: p.kills,
         inPipeTransit: p.inPipeTransit,
         lastInputAt: p.lastInputAt,
         isReady: p.isReady,
         diedAt: p.diedAt,
      })),
      map: {
        pellets: room.map.pellets,
        confusionOrb: room.map.confusionOrb,
      },
      debuff: room.debuff,
    });
  }
}
