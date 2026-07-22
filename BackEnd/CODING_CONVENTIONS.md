# Backend Coding Conventions

## Structure
- `src/handlers/` — Socket.IO event handlers, one file per concern
- `src/simulation/` — Game loop, physics, collision (pure TS, no framework deps)
- `src/db/` — Prisma client and database helpers
- `src/utils/` — Shared utilities

## Server rules
- NEVER trust client-reported state (position, score, alive, kills)
- Clients send ONLY inputs/intents
- One RoomSimulation per active room, in-memory (Map keyed by room code)
- Tick loop runs per-room, not per-connection
- No `await` inside the tick loop hot path — queue durable writes

## Prisma
- Use Prisma for all DB access
- Write to Postgres only for durable data: room metadata at creation, 
  match results at round-end
- NEVER write per-tick position data to Postgres

## Error handling
- Emit 'error' events to the client socket for validation failures
- Log server errors with `console.error` for now (structured logging later)
