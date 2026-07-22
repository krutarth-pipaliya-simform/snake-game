import type { Room, RoomSettings } from '@shared/types/room';
import type { ServerPlayer } from '@shared/types/server-player';

const PLAYER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

let colorIndex = 0;
export function nextColor(): string {
  return PLAYER_COLORS[colorIndex++ % PLAYER_COLORS.length];
}

export function generateRandomPipes(width: number, height: number): Room['map']['pipes'] {
  const pairCount = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4 pairs
  const pipes: Room['map']['pipes'] = [];
  const padding = 400;
  
  for (let i = 0; i < pairCount; i++) {
    const id1 = `pipe-${i * 2 + 1}`;
    const id2 = `pipe-${i * 2 + 2}`;
    
    const x1 = padding + Math.random() * (width - 2 * padding);
    const y1 = padding + Math.random() * (height - 2 * padding);
    let x2 = padding + Math.random() * (width - 2 * padding);
    let y2 = padding + Math.random() * (height - 2 * padding);
    
    // Ensure portals in a pair are far enough apart to make it an interesting jump
    while (Math.hypot(x2 - x1, y2 - y1) < 1200) {
      x2 = padding + Math.random() * (width - 2 * padding);
      y2 = padding + Math.random() * (height - 2 * padding);
    }
    
    pipes.push(
      { id: id1, x: x1, y: y1, linkedPipeId: id2 },
      { id: id2, x: x2, y: y2, linkedPipeId: id1 }
    );
  }
  return pipes;
}

export class RoomSimulation {
  code: string;
  hostId: string;
  status: Room['status'];
  settings: RoomSettings;
  teams: Room['teams'];
  map: Room['map'];
  debuff: Room['debuff'];
  players: Record<string, ServerPlayer>;
  roundStartedAt: number | null;
  votesToEndRound: Set<string>;
  tickInterval: ReturnType<typeof setInterval> | null;
  currentRound: number;
  tickCount: number;
  matchTeamStats: Record<string, { score: number; kills: number }>;
  matchPlayerStats: Record<string, { score: number; kills: number }>;

  constructor(code: string, hostId: string, hostSocketId: string, hostName: string) {
    this.code = code;
    this.hostId = hostId;
    this.status = 'lobby';
    this.currentRound = 1;
    this.tickCount = 0;
    this.settings = {
      roundDurationSeconds: 180,
      respawnDelaySeconds: null,
      teamCap: 5,
      teamCount: 2,
      roundsPerMatch: 3,
    };
    this.teams = {
      'team-1': { leaderId: '', playerIds: [] },
      'team-2': { leaderId: '', playerIds: [] },
    };

    this.map = {
      width: 4000,
      height: 4000,
      pipes: generateRandomPipes(4000, 4000),
      pellets: [],
      confusionOrb: { 
        x: Math.random() * (4000 - 400) + 200, 
        y: Math.random() * (4000 - 400) + 200, 
        active: true, 
        spawnsAt: null 
      },
    };
    this.debuff = null;
    this.players = {
      [hostId]: {
        id: hostId,
        socketId: hostSocketId,
        name: hostName,
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
      },
    };
    this.roundStartedAt = null;
    this.votesToEndRound = new Set();
    this.tickInterval = null;
    this.matchTeamStats = {};
    this.matchPlayerStats = {};
  }

  /** Serialize to the Room shape sent to clients — strips internal-only fields (socketId, etc.) */
  toClientRoom(): Room {
    const clientPlayers: Room['players'] = {};
    for (const [id, p] of Object.entries(this.players)) {
      clientPlayers[id] = { id: p.id, name: p.name, team: p.team || null, isReady: p.isReady };
    }
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      currentRound: this.currentRound,
      settings: { ...this.settings },
      teams: structuredClone(this.teams),
      map: structuredClone(this.map),
      debuff: this.debuff ? { ...this.debuff } : null,
      players: clientPlayers,
      roundStartedAt: this.roundStartedAt,
    };
  }

  /** Rebuild teams map when teamCount changes — preserves existing teams, evicts players from removed teams */
  rebuildTeams(newCount: number) {
    const next: Room['teams'] = {};
    for (let i = 1; i <= newCount; i++) {
      const id = `team-${i}`;
      next[id] = this.teams[id] ?? { leaderId: '', playerIds: [] };
    }
    // Evict players from teams that no longer exist
    for (const [id, t] of Object.entries(this.teams)) {
      const team = t as { leaderId: string; playerIds: string[] };
      if (!next[id]) {
        for (const pid of team.playerIds) {
          if (this.players[pid]) this.players[pid].team = '';
        }
      }
    }
    this.teams = next;
  }

  calculateRoundResults() {
    const teamResults: Record<string, { score: number; kills: number }> = {};
    const playerResults: Record<string, { score: number; kills: number }> = {};
    for (const teamId of Object.keys(this.teams)) {
      teamResults[teamId] = { score: 0, kills: 0 };
    }
    
    for (const player of Object.values(this.players)) {
      if (!player.team) continue;
      if (!teamResults[player.team]) teamResults[player.team] = { score: 0, kills: 0 };
      
      // Use the actual accumulated score from pellet eating, rather than inventing a new score here
      const playerScore = player.score;
      
      teamResults[player.team].score += playerScore;
      teamResults[player.team].kills += player.kills;
      
      playerResults[player.id] = { score: playerScore, kills: player.kills };
    }
    
    // Update match stats
    for (const [teamId, stats] of Object.entries(teamResults)) {
      if (!this.matchTeamStats[teamId]) this.matchTeamStats[teamId] = { score: 0, kills: 0 };
      this.matchTeamStats[teamId].score += stats.score;
      this.matchTeamStats[teamId].kills += stats.kills;
    }
    for (const [playerId, stats] of Object.entries(playerResults)) {
      if (!this.matchPlayerStats[playerId]) this.matchPlayerStats[playerId] = { score: 0, kills: 0 };
      this.matchPlayerStats[playerId].score += stats.score;
      this.matchPlayerStats[playerId].kills += stats.kills;
    }
    
    let winner: string | null = null;
    let maxKills = -1;
    let maxScoreForTie = -1;
    let tie = false;
    
    for (const [teamId, stats] of Object.entries(teamResults)) {
      if (stats.kills > maxKills) {
        maxKills = stats.kills;
        maxScoreForTie = stats.score;
        winner = teamId;
        tie = false;
      } else if (stats.kills === maxKills) {
        // Tied on kills, check score
        if (stats.score > maxScoreForTie) {
          maxScoreForTie = stats.score;
          winner = teamId;
          tie = false;
        } else if (stats.score === maxScoreForTie) {
          tie = true;
        }
      }
    }
    
    if (tie && maxKills === 0 && maxScoreForTie === 0) winner = null;
    if (tie) winner = null;
    
    let matchWinner: string | null = null;
    let matchMaxKills = -1;
    let matchMaxScoreForTie = -1;
    let matchTie = false;
    
    for (const [teamId, stats] of Object.entries(this.matchTeamStats)) {
      if (stats.kills > matchMaxKills) {
        matchMaxKills = stats.kills;
        matchMaxScoreForTie = stats.score;
        matchWinner = teamId;
        matchTie = false;
      } else if (stats.kills === matchMaxKills) {
        if (stats.score > matchMaxScoreForTie) {
          matchMaxScoreForTie = stats.score;
          matchWinner = teamId;
          matchTie = false;
        } else if (stats.score === matchMaxScoreForTie) {
          matchTie = true;
        }
      }
    }
    
    if (matchTie && matchMaxKills === 0 && matchMaxScoreForTie === 0) matchWinner = null;
    if (matchTie) matchWinner = null;
    
    return {
      roundResults: { winner, teamResults, playerResults },
      matchResults: { winner: matchWinner, teamResults: this.matchTeamStats, playerResults: this.matchPlayerStats }
    };
  }
}
