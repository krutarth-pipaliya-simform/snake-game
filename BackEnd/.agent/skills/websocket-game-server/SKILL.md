---
name: websocket-game-server
description: Use this skill for any task involving the Node.js backend game server — WebSocket events, the per-room tick loop, server-authoritative collision/movement, or lobby state that now lives on the server. Covers Backend Phases 1-6 from backend-architecture-spec.md. Replaces the old supabase-realtime-sync skill, which is obsolete.
---

# WebSocket Game Server — How This Project's Backend Works

## Core pattern

This project's live game and lobby state is owned entirely by a Node.js backend
process, not by Supabase Realtime and not by any individual client. See
`backend-architecture-spec.md` in the project root for the full design — this
skill covers implementation patterns for it.

```typescript
// server/index.ts — rough shape
import { Server } from "socket.io";

const io = new Server(httpServer, { cors: { origin: "*" } });
const rooms = new Map<string, RoomSimulation>(); // in-memory, per-room state

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) { socket.emit("error", { message: "room not found" }); return; }
    // ...validate, mutate room state, socket.join(roomCode)...
    io.to(roomCode).emit("room:state", serializeRoom(room));
  });

  socket.on("input:direction", ({ x, y }) => {
    // find the player by socket.id, queue the input for the next tick —
    // never trust or apply client-reported position/state directly
  });
});

// Fixed tick loop per room — this IS the game
setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.status !== "in_round") continue;
    simulateTick(room); // movement, collision, pellets, pipes, orb, round-end
    io.to(code).emit("tick:state", serializeTickState(room));
  }
}, 50); // 20Hz
```

## Rules specific to this project

- The server NEVER trusts a client's claim about its own position, score, alive
  status, or kills. Clients send only inputs (`input:direction`, `input:boost`)
  and lobby intents (`team:join`, `team:kick`, `round:voteEnd`). The server
  computes everything else.
- One `RoomSimulation` object per active room, held in server memory (a `Map`
  keyed by room code is fine at small-to-medium scale — see
  `backend-architecture-spec.md` Section 7 for the scaling seam when this isn't
  enough).
- Collision, movement, pellet, pipe, and orb rules are defined in
  `team-snake-game-spec.md` — implement those exact rules inside the server's
  tick loop. Do not re-derive or simplify them; the rules themselves are
  unchanged from the original spec, only WHERE they run has changed.
- Use Socket.IO's room feature (`socket.join(roomCode)`, `io.to(roomCode).emit(...)`)
  to scope broadcasts — never broadcast a room's tick state to every connected
  client globally.
- Persist to Postgres only for durable, non-per-tick data: room metadata created
  at room-creation time, and match results once a round ends. Never write
  per-tick position data to Postgres.
- Client-side rendering (color scramble, fog-of-war, shadow effect for the
  Confusion Orb debuff) stays entirely on the client — the server only decides
  WHO is debuffed and until when (`debuff: { teams, expiresAt }` in the broadcast
  state); how it's rendered is a client concern, see `team-snake-game-spec.md`
  Phase 9/10.

## Common mistakes to avoid

- Do not let a client send its own `segments`/position and have the server
  rebroadcast it unchanged — that reintroduces the trust problem this backend
  exists to solve. The server must compute position from inputs + its own
  simulation, every tick.
- Do not run the tick loop per-connection — run it per-room, once, regardless of
  how many players are in that room.
- Do not block the tick loop with `await`-ing slow I/O (e.g. a Postgres write)
  inside `simulateTick`. Queue durable writes to happen outside the hot loop
  (e.g. only at round-end, fire-and-forget or on a separate async path).
- Do not forget to remove a player from their room's simulation on `disconnect`
  — handle `socket.on("disconnect", ...)` to mark them appropriately (dead,
  removed from team, or however the project decides to handle drops — flag this
  to the user if undecided, it's not yet specified in the spec).