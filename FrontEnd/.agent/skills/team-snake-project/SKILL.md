---
name: team-snake-project
description: Use this skill for ANY task in the Team Snake Battle game repository — implementing a phase, fixing a bug, reviewing code, or answering questions about game rules. Load this first for every task in this project before writing any code.
---

# Team Snake Battle — Project Skill

## What this project is

A real-time multiplayer, team-based Slither.io-style snake game. Built with React,
Redux Toolkit, Tailwind CSS, Canvas rendering, and Socket.IO for
networking.

## The single source of truth

`team-snake-game-spec.md` in the project root is the ONLY authority on game rules,
data shapes, and build order. Before writing any code:

1. Read the relevant PHASE section in the spec for the task you've been given.
2. Read Section 2 (Data Models) and Section 3 (Team & Collision Logic) if the task
   touches players, teams, or collisions — these sections apply across all phases.
3. Do not invent or guess at a rule that isn't in the spec. If something is
   ambiguous or missing, stop and ask the user rather than assuming.

## Hard rules (violating these breaks the game)

- Team IDs are always strings `"team-1"` through `"team-N"`. Never hardcode `"A"`
  or `"B"`, never assume exactly 2 teams anywhere in the code.
- Collision/team logic must always be binary from the local player's perspective:
  "is this a teammate, yes or no"
- `respawnDelaySeconds: null` means "no respawn"
- Movement is server-authoritative. Never add client-side physics, position
  reconciliation, or interpolation/prediction.
- Use Socket.IO for real-time events.

## Workflow for this project

1. Confirm which PHASE you're implementing.
2. Re-read that phase's steps.
3. Follow `CODING_CONVENTIONS.md`, `BRANCH_NAMING.md`, and `COMMIT_CONVENTIONS.md`.
