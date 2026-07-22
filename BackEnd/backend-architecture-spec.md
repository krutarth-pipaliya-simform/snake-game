# Backend Architecture — Addendum & Migration Spec

This document supersedes the networking model in `team-snake-game-spec.md` Sections
1, 4, 6, 8 (Phase 3 onward). Game RULES (collision math, scoring, win conditions,
pipe behavior, orb behavior) are unchanged — only WHERE that logic runs, and how
clients talk to each other, changes. Read this alongside the original spec, not
instead of it.

If you are an AI agent: this document tells you what moved server-side and why.
`team-snake-game-spec.md` still tells you the game rules themselves (collision
math, win conditions, etc.) — apply those same rules, just executed on the server
per Section 2 below.

---

## 1. What Changed and Why

The original spec chose client-authoritative movement deliberately, to keep a
one-day build small. That assumption breaks once the game needs to support many
concurrent rooms with strangers, not just a few trusted friends, for two reasons:

- **Consistency**: with no single arbiter, different clients can reach different
  conclusions about an ambiguous collision (who died, in what order). At small
  scale with friends this is a minor annoyance; at scale it's a support burden and
  makes the game feel broken.
- **Trust**: a client that decides its own collisions can simply not report its own
  death. This doesn't matter among friends; it matters with strangers.

The fix for both is the same: one authoritative process resolves collisions and
game state, and every client just renders what it's told. This also fixes the
Phase 2 lobby race conditions (two players joining a team at the same instant,
cap violations) for the same underlying reason — one arbiter, not many clients
racing to write shared state.

---

## 2. New Architecture

```
Client (React + Canvas)  <--- WebSocket --->  Game server (Node.js)
   - captures input                              - owns ALL game state
   - renders latest state                         - one in-memory simulation
   - NO local collision/death logic                 object per active room
   - NO local lobby state mutation                - runs a fixed tick loop
                                                     (e.g. 20 ticks/sec)
                                                   - resolves collisions,
                                                     pellets, pipes, orb,
                                                     round lifecycle
                                                   - broadcasts state snapshots
                                                     to all clients in a room
                                                       |
                                                       v
                                                Postgres (keep using Supabase's
                                                Postgres — NOT Supabase Realtime)
                                                   - room metadata
                                                   - match history / results
                                                   - NOT per-tick position data
```

- Transport: WebSocket (e.g. `socket.io` or raw `ws` — `socket.io` is recommended
  for this project because it gives you room grouping, reconnection handling, and
  namespacing without building them yourself, and it's extremely well-documented,
  which matters when an AI coding agent is implementing it).
- Drop Supabase Realtime Broadcast entirely. The WebSocket connection to your own
  backend now carries everything that used to go over Supabase channels: position
  updates, lobby/team changes, round state, debuff state.
- Keep Supabase's Postgres database. It's still useful for data that needs to
  survive a server restart (room metadata, match results) — just stop using it
  for anything that happens every tick.

---

## 3. Server-Side Data Model

One JavaScript/TypeScript object per active room, held in server memory (e.g. in
a `Map<roomCode, RoomSimulation>`), NOT in Postgres, NOT in Supabase — Postgres is
for durability between matches, this is for the live match itself.

```typescript
interface RoomSimulation {
  code: string;
  status: "lobby" | "in_round" | "round_ended";
  settings: {
    roundDurationSeconds: number;
    respawnDelaySeconds: number | null;
    teamCap: number;
    teamCount: number;
  };
  teams: Record<string, { leaderId: string; playerIds: string[] }>; // "team-1", "team-2", ...
  players: Record<string, ServerPlayer>;
  map: {
    width: number;
    height: number;
    pipes: Array<{ id: string; x: number; y: number; linkedPipeId: string }>;
    pellets: Array<{ id: string; x: number; y: number; value: number }>;
    confusionOrb: { x: number; y: number } | null;
  };
  debuff: { teams: string[]; expiresAt: number } | null;
  roundStartedAt: number | null;
  votesToEndRound: Set<string>; // player IDs who voted
}

interface ServerPlayer {
  id: string;
  socketId: string; // maps to the active WebSocket connection
  name: string;
  team: string;
  alive: boolean;
  color: string;
  segments: Array<{ x: number; y: number }>;
  direction: { x: number; y: number };
  boosting: boolean;
  score: number;
  kills: number;
  inPipeTransit: { pipeId: string; progress: number } | null;
  lastInputAt: number;
}
```

This is the SAME shape as the original spec's `Room`/`Player` types — it's just
now owned by the server process instead of being assembled client-side from
broadcasts. Client-side TypeScript types can stay almost identical; drop any
fields that were client-only concerns (nothing in the original shapes was
client-only, so this should be a near copy-paste into `src/types/`, shared
between client and server if your repo structure allows a shared package).

---

## 4. WebSocket Protocol

### Client → Server events (inputs/intents only — never state)

| Event | Payload | Purpose |
|---|---|---|
| `room:create` | `{ hostName }` | Create a room, become host |
| `room:join` | `{ roomCode, playerName }` | Join an existing room |
| `team:join` | `{ teamId }` | Join a team in the lobby |
| `team:kick` | `{ targetPlayerId }` | Team leader kicks a player |
| `settings:update` | `{ roundDurationSeconds?, respawnDelaySeconds?, teamCap?, teamCount? }` | Host updates settings (host-only, validate server-side) |
| `round:start` | `{}` | Host starts the round |
| `round:voteEnd` | `{}` | Player votes to end the round early |
| `input:direction` | `{ x, y }` | Player changes direction |
| `input:boost` | `{ boosting: boolean }` | Player toggles boost |

### Server → Client events (state only — never trust client-reported state)

| Event | Payload | Purpose |
|---|---|---|
| `room:state` | Full `RoomSimulation` (minus internals like `socketId`) | Sent on join, and whenever lobby state changes |
| `tick:state` | `{ players: ServerPlayer[], map: {...}, debuff }` | Sent every tick (~20/sec) during `in_round` |
| `round:ended` | `{ winner, teamResults: { [teamId]: { kills, score } } }` | Sent once when a round ends |
| `error` | `{ message }` | e.g. "team full", "not host", invalid input rejected |

Rule for implementers: the server NEVER trusts a client's claim about its own
position, score, or death. The client only ever sends *inputs* (direction, boost,
lobby intents). The server computes everything else and is the only source of
truth broadcast back out.

---

## 5. Server Game Loop (per room, once `status === "in_round"`)

```
every tick (e.g. every 50ms for 20Hz):
  for each player with a queued direction/boost input since last tick:
    apply it to that player's server-side state

  for each alive player:
    advance position based on direction + speed (+ boost multiplier)
    if boosting: drain length per the original spec's Phase 7 rule

  run collision detection for ALL players against ALL other players
    (this is now checked ONCE, centrally, using the exact rules from
    team-snake-game-spec.md Section 3 / Phase 4 — teammate pass-through,
    head-to-head size rule, head-to-body always fatal, debuff friendly-fire
    exception — nothing about the rules themselves changes, only that the
    server decides instead of each client deciding for itself)

  handle pellet consumption, pipe transit progress, orb consumption/debuff
    timing — same rules as team-snake-game-spec.md Phases 5, 8, 9

  check round-end conditions (timer, unanimous vote, team wipe) per Phase 6

  broadcast `tick:state` to every client in this room
```

This is the same simulation logic from the original spec's Phases 4-9 — it just
runs once per room on the server instead of once per client in the browser. If
Phase 1's movement/collision functions were written as plain, framework-agnostic
TypeScript, this step is mostly relocating files, not rewriting logic.

---

## 6. Backend Build Phases

Work through these in order. Each assumes the original spec's Phases 0-2 client
work already exists and is being adapted, not thrown away.

### Backend Phase 1 — Server scaffold + WebSocket connection

- New `server/` directory (or separate repo — your choice), Node.js + TypeScript.
- Install `socket.io` (server) and `socket.io-client` (client).
- Server holds an in-memory `Map<roomCode, RoomSimulation>`.
- Client connects on app load; confirm a round-trip "ping" event works.

**Done when:** client and server exchange a test message over the socket
connection.

### Backend Phase 2 — Move lobby logic server-side

- Port Phase 2's lobby rules (create/join room, team join, leader kick with
  random-team-with-space, host settings) to run as WebSocket event handlers on
  the server, mutating the in-memory `RoomSimulation`, and broadcasting
  `room:state` after every change.
- Client's lobby UI stays the same visually — it now sends `team:join`,
  `team:kick`, etc. events instead of writing to Supabase directly, and renders
  whatever `room:state` it receives instead of local state.
- Persist room creation to Postgres (for durability/history) but treat the
  in-memory copy as the live source of truth during the lobby and match.

**Done when:** two clients see consistent lobby/team state with no race
conditions, verified by rapid-clicking join/kick from multiple clients at once.

### Backend Phase 3 — Port movement + collision to the server tick loop

- Move Phase 1's movement and Phase 4's collision logic into the server's tick
  loop (Section 5 above). Client stops simulating its own collisions — it only
  sends `input:direction`/`input:boost` and renders `tick:state`.
- Verify the exact same collision rules from `team-snake-game-spec.md` Section 3
  hold: teammate pass-through, head-to-head size check, head-to-body always
  fatal to the head, debuff flips teammate collision to fatal.

**Done when:** 2+ clients see identical, consistent collision outcomes — no
client-side disagreement about who died.

### Backend Phase 4 — Port pellets, scoring, round lifecycle

- Move Phase 5 (pellets/scoring) and Phase 6 (round timer, vote, respawn, winner
  calculation) into the server tick loop / event handlers.
- `round:voteEnd` increments a server-side vote set; server checks unanimity.
- `round:ended` is computed and broadcast by the server per Phase 6's winner
  logic — clients only render the result, they never calculate it themselves.

**Done when:** a round starts, runs, and ends correctly (all three end
conditions) with the winner calculated identically for every client.

### Backend Phase 5 — Port pipes and Confusion Orb

- Move Phase 8 (pipes) and Phase 9 (Confusion Orb) logic into the server tick
  loop. The debuff's client-visible effects (color scramble, name removal,
  fog-of-war, shadow effect) stay entirely client-side rendering choices, driven
  by the `debuff` field the server broadcasts — the server only decides WHO is
  debuffed and for how long, not how it looks.

**Done when:** pipes and the orb behave identically to the original spec's rules,
now server-verified.

### Backend Phase 6 — Client cleanup

- Remove all client-side collision/death logic, direct Supabase writes for
  lobby/game state, and the old Supabase Realtime Broadcast channel setup
  entirely.
- Client code should now only: capture input, send it over the socket, and
  render whatever the server broadcasts.

**Done when:** a code search for Supabase Realtime Broadcast usage in the client
returns nothing; all game logic lives in `server/`.

---

## 7. Scaling Beyond One Server Instance

Not needed for initial launch — build this seam only when you actually need it:

- Each room's simulation lives in ONE server instance's memory, so all clients in
  a room must connect to the SAME instance.
- Add a lightweight "room registry" (a Postgres table or Redis: `roomCode ->
  instanceAddress`) so a client joining a room can be routed to the correct
  instance.
- Run multiple server instances behind a load balancer that only handles the
  initial connection/routing — once connected, a client's socket stays pinned to
  its room's instance for the rest of the match.

---

## 8. Updated Skill File Needed

The `supabase-realtime-sync` skill (`.agent/skills/supabase-realtime-sync/`) is
now obsolete — it documents the Broadcast-only approach this document replaces.
Delete that skill folder and use the new `websocket-game-server` skill provided
alongside this document instead.
