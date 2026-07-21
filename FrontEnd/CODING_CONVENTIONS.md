# Coding Conventions

Precise, minimal rules for this project — follow these exactly, do not deviate for
style preference. Consistency matters more than any individual choice here.

## Language & structure

- TypeScript everywhere, no plain `.js` files. Every data shape from
  `team-snake-game-spec.md` Section 2 (Room, Player, etc.) must have a matching
  TypeScript `interface` or `type`, defined once in `src/types/` and imported
  everywhere it's used. Do not redefine these shapes inline in multiple files.
- Folder structure:
  ```
  src/
    types/          — shared TypeScript types (Room, Player, etc.)
    store/          — Redux Toolkit slices, one file per slice
    game/           — game loop, collision, movement, canvas rendering logic
                      (plain TypeScript, framework-agnostic where possible)
    realtime/       — Socket.IO client setup and event handling
    components/     — React components (Lobby, GameCanvas, RoundEndScreen, etc.)
    hooks/          — custom React hooks
  ```
- Keep game logic (collision checks, movement math, round-end calculation) in
  plain TypeScript functions under `src/game/`, separate from React components.
  Components should call these functions, not contain the logic inline. This
  matters because these functions need to be testable and match the spec's
  pseudocode directly.

## Redux Toolkit

- One slice per concern: `roomSlice`, `playersSlice`, `mapSlice` (pipes, orb),
  `debuffSlice`. Do not put everything in one giant slice.
- Slice state shape should mirror the JSON shapes in the spec's Section 2 as
  closely as possible — if the spec shows `room.settings.teamCap`, the Redux state
  should have the same nesting, not a flattened or renamed version.
- Use `createSlice` and its generated action creators. Do not hand-write action
  type strings.
- Selectors: write a selector function for any state access used in more than one
  component, under `src/store/selectors.ts`. Do not repeat the same
  `state.players.byId[id]`-style access inline across many components.

## Naming

- Team IDs: always the string format `team-1`, `team-2`, ... — see the spec's
  Section 3. Never a letter, never a zero-indexed number alone.
- Match field names EXACTLY as shown in the spec's JSON examples
  (`respawnDelaySeconds`, not `respawnDelay` or `respawn_delay`). This matters
  because the spec, the code, and the Supabase payloads must all agree on field
  names without a translation layer.
- Booleans: prefix with `is`/`has`/`can` where natural (`isBoosting` is fine,
  but the spec already defines the field as `boosting` — match the spec's exact
  name even if it doesn't follow this prefix rule, spec field names always win).

## Canvas rendering

- One `<canvas>` element for the main game view. Do not render individual snake
  segments as DOM elements — always draw via the Canvas 2D context.
- Keep the render loop and the simulation/update loop conceptually separate
  functions, even if called from the same `requestAnimationFrame` callback:
  `update(deltaTime)` then `render(ctx)`. Do not interleave game-state mutation and
  drawing calls in the same block.
- The minimap is a second, small canvas (or a section of the same canvas drawn
  last) — do not implement it with DOM/CSS positioned dots.

## Comments

- Every function implementing a rule from the spec should have a one-line comment
  referencing the phase and section, e.g. `// Phase 4 — head-to-head collision,
  see spec Section 4`. This makes it fast to cross-check code against the spec
  during review.
- Do not leave commented-out code in commits — delete it, git history preserves it.

## Error handling

- Socket.IO events should have error handling — listen for 'error' events and
  show connection status to the user.

## What NOT to do

- Do not add libraries beyond what's specified (Socket.IO, RTK, Tailwind, plus
  standard React tooling) without checking with the user first — extra
  dependencies slow down a one-day build.
- The client NEVER simulates its own collisions, lobby mutations, or any
  game state decisions. It only sends inputs and renders what the server
  broadcasts. See the websocket-client-sync skill.
- Do not "improve" or add mechanics beyond what `team-snake-game-spec.md`
  describes, even if they seem like natural extensions — flag ideas to the user
  instead of implementing them unprompted.
