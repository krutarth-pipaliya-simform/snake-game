---
name: team-snake-project
description: Use this skill for ANY task in the Team Snake Battle game repository — implementing a phase, fixing a bug, reviewing code, or answering questions about game rules. Load this first for every task in this project before writing any code.
---

# Team Snake Battle — Project Skill

## What this project is

A real-time multiplayer, team-based Slither.io-style snake game. Built with React,
Redux Toolkit, Tailwind CSS, Canvas rendering, and Supabase Realtime for
networking.

## The single source of truth

`team-snake-game-spec.md` in the project root is the ONLY authority on game rules,
data shapes, and build order. Before writing any code:

1. Read the relevant PHASE section in the spec for the task you've been given.
2. Read Section 2 (Data Models) and Section 3 (Team & Collision Logic) if the task
   touches players, teams, or collisions — these sections apply across all phases.
3. Do not invent or guess at a rule that isn't in the spec. If something is
   ambiguous or missing, stop and ask the user rather than assuming — this is a
   game with specific, deliberate design decisions, not generic mechanics.
4. Do not skip ahead to a later phase before the current one is verifiably done
   (see each phase's "Done when" line).

## Hard rules (violating these breaks the game)

- Team IDs are always strings `"team-1"` through `"team-N"`. Never hardcode `"A"`
  or `"B"`, never assume exactly 2 teams anywhere in the code.
- Collision/team logic must always be binary from the local player's perspective:
  "is this a teammate, yes or no" — never a per-team-pair matrix or a per-team
  color palette.
- `respawnDelaySeconds: null` means "no respawn" — never store `Infinity` in state
  or in Supabase.
- Movement is client-authoritative. Never add server-side physics, position
  reconciliation, or interpolation/prediction — this is a deliberate scope
  decision for a one-day build, not a gap to fill in.
- Use Supabase Realtime Broadcast (`channel.send` / `channel.on('broadcast', ...)`)
  for position updates. Never write per-tick position updates to a Postgres table.

## Workflow for this project

1. Confirm which PHASE you're implementing (ask the user if unclear).
2. Re-read that phase's steps and "Done when" criteria in the spec.
3. Implement only what that phase asks for — resist adding functionality from
   later phases even if it seems convenient to do now.
4. After implementing, verify against the "Done when" line before considering the
   task complete.
5. Follow `CODING_CONVENTIONS.md`, `BRANCH_NAMING.md`, and `COMMIT_CONVENTIONS.md`
   in the project root for how the code and commits should look.

## When stuck

If a required behavior isn't covered by the spec, or a phase's instructions
conflict with something you observe in the existing code, stop and describe the
conflict to the user instead of guessing. Getting a game rule wrong is worse than
asking a question.
