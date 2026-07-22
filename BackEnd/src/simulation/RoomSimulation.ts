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
    const generatedPipes = [
      { id: 'pipe-1', x: 1500, y: 1500, linkedPipeId: 'pipe-2' },
      { id: 'pipe-2', x: 2500, y: 2500, linkedPipeId: 'pipe-1' },
      { id: 'pipe-3', x: 2500, y: 1500, linkedPipeId: 'pipe-4' },
      { id: 'pipe-4', x: 1500, y: 2500, linkedPipeId: 'pipe-3' }
    ];

    this.map = {
      width: 4000,
      height: 4000,
      pipes: generatedPipes,
      pellets: [],
      confusionOrb: { x: 2000, y: 2000, active: true },
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
    for (const [id, team] of Object.entries(this.teams)) {
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
    for (const teamId of Object.keys(this.teams)) {
      teamResults[teamId] = { score: 0, kills: 0 };
    }
    
    for (const player of Object.values(this.players)) {
      if (!player.team) continue;
      if (!teamResults[player.team]) teamResults[player.team] = { score: 0, kills: 0 };
      
      // Alive teammates' final lengths * 10
      if (player.alive) {
        teamResults[player.team].score += player.segments.length * 10;
      }
      // Sum of teammate kills * 50
      teamResults[player.team].score += player.kills * 50;
      teamResults[player.team].kills += player.kills;
    }
    
    let winner: string | null = null;
    let maxScore = -1;
    let tie = false;
    
    for (const [teamId, stats] of Object.entries(teamResults)) {
      if (stats.score > maxScore) {
        maxScore = stats.score;
        winner = teamId;
        tie = false;
      } else if (stats.score === maxScore) {
        tie = true;
      }
    }
    
    if (tie || maxScore === 0) winner = null;
    
    return { winner, teamResults };
  }
}
