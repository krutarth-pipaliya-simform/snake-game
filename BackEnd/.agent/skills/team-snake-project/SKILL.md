---
name: team-snake-project
description: Use this skill for ANY task in the BackEnd repository. Load this first before writing any backend code.
---

# Team Snake Battle — BackEnd Project Skill

## What this project is

A Node.js server (Express + Socket.IO + Prisma) for the Team Snake Battle game.
The server runs an authoritative 20Hz tick loop per active room.

## The single source of truth

`backend-architecture-spec.md` (to be written) will govern the server.
Also rely on `team-snake-game-spec.md` in the root for the raw game rules (collision math, scoring, etc.).

## Hard rules

- Clients only send inputs (`input:direction`, `input:boost`). Never trust client position or score.
- RoomSimulation is an isolated pure-TypeScript instance in memory.
- Prisma (PostgreSQL) is strictly for durable metadata (room creation, match results). NEVER use `await prisma...` inside the hot tick loop.
- Use `events.ts` from the `shared` directory for strict typings of Socket.IO.