---
name: team-snake-project
description: >
  Use this skill for ANY task in the Team Snake Battle game repository — 
  implementing a phase, fixing a bug, reviewing code, or answering questions 
  about game rules. Load this first for every task before writing any code.
---

# Team Snake Battle — Project Skill

## What this project is

A real-time multiplayer, team-based Slither.io-style snake game.
- **Frontend**: React + Redux Toolkit + TailwindCSS v4 + Canvas rendering
- **Backend**: Node.js + Express + Socket.IO (server-authoritative game loop)
- **Database**: Neon PostgreSQL via Prisma ORM (durable data only)

## Monorepo structure

```
snake-game/
├── FrontEnd/     — React client (Vite + TypeScript)
├── BackEnd/      — Node.js server (Express + Socket.IO + Prisma)
├── shared/       — Shared TypeScript types & constants (imported by both)
├── .agent/       — Root-level agent skills & conventions (common to all)
└── .github/      — PR templates, workflows
```

## The single source of truth

Two documents together are the ONLY authority on game rules & architecture:

- `FrontEnd/team-snake-game-spec.md` — the game RULES: collision math, scoring,
  win conditions, pipe behavior, Confusion Orb behavior, phase-by-phase order.
- `BackEnd/backend-architecture-spec.md` — WHERE that logic runs and how
  clients/server communicate. Supersedes the client-authoritative networking
  in the game spec.

## Hard rules (violating these breaks the game)

- Team IDs: always strings `"team-1"` through `"team-N"`. Never letters, never
  assume exactly 2 teams.
- Collision/team logic: always binary ("teammate vs non-teammate"), never a
  per-team matrix.
- `respawnDelaySeconds: null` = "no respawn". Never store `Infinity`.
- Movement & collision are SERVER-authoritative. Clients only send inputs.
- Use WebSocket (Socket.IO) for all live state. Postgres is for durable data only.

## Workflow

1. Confirm which phase you're implementing (client or backend phase).
2. Read that phase's spec and "Done when" criteria.
3. Implement only what that phase asks for.
4. Follow conventions in `CODING_CONVENTIONS.md` (root), plus FE/BE-specific ones.
