# Coding Conventions (Shared)

## Language & types
- TypeScript everywhere. No plain `.js` files in either FrontEnd or BackEnd.
- All shared data shapes (Room, Player, Pellet, etc.) live in `shared/types/`
  and are imported by both projects. Never duplicate or redefine them.

## Naming
- Team IDs: `"team-1"`, `"team-2"`, ..., `"team-N"`. Never letters.
- Field names MUST match the spec's JSON exactly (`respawnDelaySeconds`, etc.).
- File names: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components.

## Comments
- Every function implementing a spec rule: one-line ref to the phase/section.
- No commented-out code in commits.

## What NOT to do
- Don't add libraries without checking with the user first.
- Don't invent mechanics beyond the spec — flag ideas instead.
