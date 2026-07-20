# Branch Naming

Branches map directly to phases from `team-snake-game-spec.md`, so it's always
clear what a branch is for and which phase it belongs to.

## Format

```
<type>/phase<N>-<short-slug>
```

- `type`: `feat`, `fix`, `chore`, or `docs` — same vocabulary as commit types.
- `N`: the phase number from the spec (0 through 11). Use `misc` instead of a
  number for work that isn't tied to a specific phase.
- `short-slug`: 2-4 words, lowercase, hyphen-separated, describing the specific
  piece of work (not the whole phase, if the phase is being split across multiple
  branches).

## Examples

```
feat/phase0-project-setup
feat/phase1-snake-movement
feat/phase1-pellet-growth
feat/phase3-realtime-broadcast
feat/phase4-team-collision
feat/phase6-round-timer
feat/phase9-confusion-orb-debuff
fix/phase8-pipe-momentum-bug
docs/misc-spec-update
```

## Rules

- `main` is always kept in a working, playable state. Never commit directly to
  `main` — always branch, then merge back once a phase's "Done when" criteria is
  met.
- One branch per meaningful chunk of work. It's fine to have several branches for
  one phase (e.g. `feat/phase9-confusion-orb-scramble` and
  `feat/phase9-confusion-orb-fog`) if the phase is large — better to keep pull
  requests small and reviewable than to cram a whole phase into one branch.
- Do not start a branch for Phase N+1 until Phase N's branches are merged and the
  "Done when" criteria for Phase N is verified working on `main`.
- Delete a branch after it's merged — don't let merged branches pile up.
