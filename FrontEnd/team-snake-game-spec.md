# Team Snake Battle — Game Specification (Phase-Wise)

This document is the single source of truth for implementation. It is written to be
literal and unambiguous, and broken into numbered phases. Each phase is a
self-contained unit of work — implement and verify one phase completely before
starting the next. Do not skip ahead. Do not combine phases.

If you are an AI agent implementing this: work through Section 2 (Data Models) once
at the start, then implement Sections 4 onward strictly in phase order. Each phase
lists exactly what to build and how to know it's done.

---

## 1. Tech Stack (fixed — do not substitute)

- Frontend: React + Redux Toolkit + Tailwind CSS
- Realtime sync: Supabase Realtime (Postgres + Broadcast channels only). Do NOT
  build a custom WebSocket server. Do NOT use Supabase's database tables for
  position updates — use `channel.send()` / `channel.on('broadcast', ...)` only,
  since position updates happen too fast for a normal DB write.
- Rendering: HTML5 Canvas (not SVG, not DOM elements per snake segment).
- Movement model: **client-authoritative**. Each client simulates its own snake
  locally and broadcasts its state ~10 times per second (every 100ms). Other
  clients only render what they receive over the channel — they never simulate
  another player's snake. There is no server-side physics and no reconciliation.
  This is a deliberate, permanent scope decision, not a placeholder.

---

## 2. Core Data Models (reference this section throughout — do not invent new fields)

### Room

```json
{
  "code": "ABCD",
  "hostId": "player-uuid",
  "status": "lobby | in_round | round_ended",
  "settings": {
    "roundDurationSeconds": 180,
    "respawnDelaySeconds": null,
    "teamCap": 5,
    "teamCount": 3
  },
  "teams": {
    "team-1": { "leaderId": "player-uuid", "playerIds": ["p1", "p2"] },
    "team-2": { "leaderId": "player-uuid", "playerIds": ["p3"] },
    "team-3": { "leaderId": "player-uuid", "playerIds": ["p4"] }
  },
  "map": {
    "width": 4000,
    "height": 4000,
    "pipes": [
      { "id": "pipe-1", "x": 100, "y": 100, "linkedPipeId": "pipe-2" },
      { "id": "pipe-2", "x": 3800, "y": 3800, "linkedPipeId": "pipe-1" }
    ],
    "confusionOrb": { "x": 2000, "y": 2000, "active": true }
  },
  "debuff": { "teams": ["team-2", "team-3"], "expiresAt": 1234567890 }
}
```

Field rules:
- `settings.respawnDelaySeconds`: `null` means "no respawn". A positive number is
  seconds until respawn. Never store the literal value `Infinity` in JSON — always
  use `null` for "no respawn".
- `settings.teamCap`: max players allowed on ONE team. Teams may have fewer players
  than this — uneven team sizes are allowed and expected.
- `settings.teamCount`: host-set number of teams for this room (e.g. 2, 3, 4...).
  Team IDs are always `"team-1"` through `"team-N"` where N = teamCount. Do not use
  letters ("A", "B") anywhere in code — always use this `team-N` string format so
  the logic works for any team count without special-casing 2 teams.
- `map.confusionOrb`: `null` when not currently on the map (eaten, respawn pending).
- `debuff.teams`: an ARRAY of team IDs, not a single team. When the orb is eaten,
  this array is set to every team ID except the eater's team. Example: if a
  `team-2` player eats the orb in a 4-team game, `debuff.teams` becomes
  `["team-1", "team-3", "team-4"]`.
- `debuff` is `null` when no debuff is active.

### Player

```json
{
  "id": "player-uuid",
  "name": "Krutarth",
  "team": "team-1",
  "alive": true,
  "color": "#3B82F6",
  "segments": [ { "x": 100, "y": 200 }, { "x": 95, "y": 200 } ],
  "direction": { "x": 1, "y": 0 },
  "boosting": false,
  "score": 0,
  "kills": 0,
  "inPipeTransit": null
}
```

Field rules:
- `segments[0]` is always the head.
- `direction` is a unit vector (`x` and `y` each between -1 and 1, magnitude 1).
- `color`: each player gets a unique individual color at spawn, independent of team.
  This is used for on-screen rendering. It is NOT the same thing as the team
  highlight (green/red) described in Section 11 — a player has both an individual
  color AND a team highlight, shown together.
- `inPipeTransit`: `null` normally. While moving through a pipe:
  `{ "pipeId": "pipe-1", "progress": 0.0 }`, where `progress` goes from `0.0` to
  `1.0`. See Phase 8.

---

## 3. Team & Collision Logic — the ONE rule that makes multi-team work

Read this before implementing anything. Every rule in this spec is written to be
**binary from each viewer's perspective**, so it works correctly no matter how many
teams exist (2, 3, 10 — doesn't matter). Never write code that special-cases
"exactly 2 teams" or hardcodes team IDs.

- From any player's point of view, every other player is either:
  - **Teammate**: `otherPlayer.team === me.team`
  - **Non-teammate**: `otherPlayer.team !== me.team` (this covers ALL other teams,
    regardless of how many there are)
- Collision rules only ever check "teammate vs non-teammate" — never "which specific
  team". See Phase 5.
- Team highlight color is only ever "green if teammate, red if non-teammate" — never
  a per-team color scheme. See Phase 11.
- The Confusion Orb debuffs "every team except the eater's team" — see Phase 9.

---

## PHASE 0 — Project Setup

**Goal:** empty React + RTK + Tailwind project that runs, with a Supabase project
created and connected.

Steps:
1. Scaffold a React + TypeScript project (Vite recommended).
2. Install and configure Redux Toolkit, Tailwind CSS.
3. Create a Supabase project (or reuse an existing one). Store the URL and anon key
   in environment variables, never hardcoded.
4. Add a single test page that connects to a Supabase Realtime channel and logs
   "connected" to the console.

**Done when:** app runs locally, console shows a successful Supabase Realtime
connection.

---

## PHASE 1 — Single-Player Snake Core (no networking, no teams)

**Goal:** one snake, one player, movement, growth, self-collision, on a Canvas.

Steps:
1. Render a Canvas game loop using `requestAnimationFrame`.
2. Implement a single snake: `segments`, `direction`, moves at a fixed speed.
3. Keyboard input changes `direction` (arrow keys or WASD — pick one, be consistent).
4. Spawn simple pellets (static positions or random) on the map. Eating a pellet
   (head position overlaps pellet position) removes the pellet, adds one segment,
   increases `score`.
5. Self-collision: if the head touches any of the snake's own body segments, the
   snake dies (reset for now — no respawn/round logic yet, this phase is purely to
   validate the movement and collision primitives).

**Done when:** you can play a single working snake game in the browser — move,
eat, grow, die on self-collision.

---

## PHASE 2 — Lobby: Rooms, Teams, Host Settings

**Goal:** full lobby flow, no game/movement logic yet — this phase is only about
room state and team assignment.

Steps:
1. Room creation: generate a 4-letter room code, create a `Room` object (see
   Section 2) with `status: "lobby"`, current player becomes `hostId`.
2. Room join: another player enters the code and joins the room, `team: null`
   initially (unassigned).
3. Host sets `settings.teamCount` in the lobby UI (numeric input, minimum 2).
   The UI then shows that many team panels (`team-1`, `team-2`, ... `team-N`).
4. Player clicks a team panel to join that team. The FIRST player to join a given
   team becomes that team's `leaderId`.
5. Kick logic: a team leader can click another player on their own team and select
   "Kick". On kick:
   - Build a list of all OTHER team IDs (excluding the kicked player's current team)
     that have fewer players than `settings.teamCap`.
   - If that list is empty (every other team is full), disable the kick action and
     show "No team has space" — do not perform the kick.
   - Otherwise, pick one team ID at random from that list and move the kicked
     player into it. Do NOT let the kicking leader choose which team — it must be
     random among teams with space.
6. Host sets `settings.roundDurationSeconds` (numeric, minimum 30).
7. Host sets respawn mode with exactly two UI options:
   - "No respawn" → `settings.respawnDelaySeconds = null`
   - "Respawn after N seconds" → shows a numeric input (min 1, max 60) →
     `settings.respawnDelaySeconds = N`
8. Host sets `settings.teamCap` (numeric, minimum 1).
9. "Start Round" button (host only): sets `status = "in_round"`.

**Done when:** you can create a room, set team count, have multiple players join
different teams, kick works and reassigns to a random team with space, and all
host settings are saved on the Room object correctly before starting.

---

## PHASE 3 — Realtime Position Sync (2 clients see each other move)

**Goal:** wire Phase 1's single-player movement into a real multiplayer broadcast
so two separate browser clients can see each other's snakes moving live. Teams and
collision rules are NOT enforced yet in this phase — just get positions syncing.

Steps:
1. On entering `in_round`, each client joins a Supabase Realtime channel named after
   the room code.
2. Every 100ms, each client broadcasts its own player state:
   `{ playerId, segments, direction, boosting, alive }`.
3. Every client listens for broadcasts from all other players and stores their
   latest received state (e.g. in Redux) keyed by `playerId`.
4. Render loop: draw your OWN snake from local simulation, and draw every OTHER
   player's snake from the last broadcast state received for them (no interpolation
   or prediction needed — just draw the latest known position).

**Done when:** two browser windows/devices in the same room show both snakes moving
in real time, each controlled independently.

---

## PHASE 4 — Team-Aware Collision & Death

**Goal:** apply the real collision rules from Section 3, including team pass-through,
head-to-head size rule, death, and pellet drops. No respawn/round-timer logic yet —
that's Phase 6.

Collision check — run this locally every tick, checking your OWN head only:

```
myHead = mySnake.segments[0]

for otherPlayer in allPlayers:
  if otherPlayer.id == me.id: continue
  if otherPlayer.alive == false: continue

  isTeammate = (otherPlayer.team == me.team)

  // Default rule: teammates pass through completely, skip entirely.
  // EXCEPTION: if a debuff is active and applies to my team (Phase 9),
  // isTeammate is treated as false for this check instead.
  if isTeammate and NOT (debuff is active AND me.team is in debuff.teams):
    continue  // no collision possible with this player at all

  for segment in otherPlayer.segments:
    if myHead collides with segment (distance < collision_radius):

      if segment == otherPlayer.segments[0]:
        // HEAD-TO-HEAD collision
        if mySnake.length > otherPlayer.length:
          otherPlayer dies
        else if mySnake.length < otherPlayer.length:
          I die
        else:
          both die   // exact tie — this is the intentional default
      else:
        // HEAD-TO-BODY collision — size is IGNORED here, always fatal to the head
        I die

      stop checking further collisions this tick
```

On death (applies regardless of which branch above triggered it):
- Set `alive = false` on the snake that died.
- Convert every segment of the dead snake into pellets at those exact positions
  (any snake, on any team, can eat these afterward — pellets have no team).
- Attribute the kill: increment `kills` by 1 on the snake that did NOT die in the
  collision (the survivor), and this counts toward that snake's team total.
- Respawn/round-end handling is Phase 6 — for this phase, a dead snake just stays
  dead and stops rendering/broadcasting.

**Done when:** with 2+ clients on different teams, colliding correctly kills the
right snake per the rules above, teammates pass through each other with zero
effect, and dying converts your body into eatable pellets for others.

---

## PHASE 5 — Pellets & Scoring

**Goal:** replace Phase 1's placeholder pellets with the real density-based system,
and confirm scoring is tracked correctly per player and per team.

Steps:
1. At round start, scatter pellets across the map at varying density (some areas
   denser than others — a simple approach: divide the map into a grid of zones,
   assign each zone a random density tier, and place N pellets per zone based on
   its tier).
2. Eating a pellet: remove it, add `pelletValue` to `score`, add one segment to the
   snake's length.
3. Pellets dropped from a dead snake (Phase 4) work the same way — anyone eating
   them gets the score and length.
4. Team score = sum of `score` across every player who has been on that team this
   round (see Phase 6 for when this is used).

**Done when:** pellets of visibly different density exist on the map, eating any
pellet (map-spawned or death-dropped) correctly updates score and length.

---

## PHASE 6 — Round Lifecycle: Timer, Vote, Respawn, Winner

**Goal:** rounds now start, run for a bounded time, end correctly under all three
end conditions, and correctly declare a winner across any number of teams.

Round end conditions — check every tick, in this order, stop at the first true one:

1. **Timer expiry**: `now >= roundStartTime + settings.roundDurationSeconds`
2. **Unanimous end vote**: every currently-alive player has cast an "end round" vote
   (add a vote button in the UI; track votes in room state; clear votes when the
   round ends or restarts)
3. **Team wipe with no respawn**: `settings.respawnDelaySeconds === null` AND at
   least one team currently has zero alive players

Respawn handling (runs continuously during the round, independent of the above):
- If `settings.respawnDelaySeconds !== null`: when a player dies, after that many
  seconds, respawn them at a random safe location with a starting minimum length,
  set `alive = true`.
- If `settings.respawnDelaySeconds === null`: a dead player stays dead for the rest
  of the round. This is what can trigger end condition 3 above.

When a round ends:
1. Freeze movement (stop processing/broadcasting position updates).
2. Compute, for every team ID from `"team-1"` to `"team-N"`:
   - `teamKills` = sum of `kills` across all players who were on that team this round
   - `teamScore` = sum of `score` across all players who were on that team this round
3. Determine winner:
   ```
   find the team(s) with the highest teamKills
   if exactly one team has the highest teamKills: that team wins
   if multiple teams are tied on teamKills:
     among only those tied teams, find the one(s) with the highest teamScore
     if exactly one: that team wins
     if still tied: it's a tie between those teams
   ```
4. Set `status = "round_ended"`, display winner + full per-team breakdown
   (kills and score for every team, not just the winner).
5. Host gets a "Start Next Round" button: resets all player positions, scores,
   kills, and alive states, keeps the SAME team assignments, sets
   `status = "in_round"` again, restarts the timer.

**Done when:** a round correctly ends on timer/vote/wipe, respawn timing works as
configured, and the winner calculation is correct for 2 teams AND for 3+ teams
(test with at least 3 teams to confirm no 2-team assumptions leaked into the code).

---

## PHASE 7 — Boost

**Goal:** speed boost that costs length.

Steps:
1. Add a boost input (held key or button). While held, set `boosting = true` on the
   local player.
2. While `boosting === true`: increase movement speed by a fixed multiplier, and
   remove one tail segment every fixed number of ticks (e.g. every 5 ticks) as the
   cost. Do not let boosting shrink the snake below a minimum length (e.g. 3
   segments) — stop the length cost (but keep the speed) if at minimum length, or
   disable boosting entirely at minimum length — pick one and be consistent, note
   which one you picked in your PR description.
3. `boosting` state is already part of the broadcast payload (Phase 3) — confirm
   other clients render the speed change correctly.

**Done when:** holding boost visibly speeds up the snake and visibly shrinks it
over time; releasing boost stops both effects immediately.

---

## PHASE 8 — Teleport Pipes

**Goal:** fixed-pair pipes with gradual (non-instant) transit.

Steps:
1. Pipes are defined in fixed pairs at map creation (`pipe.linkedPipeId`) — this
   pairing never changes during a round.
2. When a snake's head touches a pipe (and `inPipeTransit` is currently `null`):
   set `inPipeTransit = { pipeId: <id of pipe touched>, progress: 0.0 }`.
3. While `inPipeTransit` is not null, each tick: advance `progress` toward `1.0`
   over a fixed short duration (e.g. 500ms total), and move the snake's head along
   an interpolated straight-line path from the entry pipe's position to the linked
   pipe's position based on current `progress`.
4. The snake's segments remain fully collidable during the ENTIRE transit — do not
   suppress or skip the Phase 4 collision check while `inPipeTransit` is active.
5. When `progress` reaches `1.0`: set `inPipeTransit = null`. The snake is now at
   the linked pipe's exact position, continuing in the SAME `direction` and
   `boosting` state it had before entering — do not reset or change these values.
6. No cooldown: immediately after exiting, the snake (or any other snake) can enter
   any pipe again right away.
7. Two snakes entering linked pipes at the same time: no special code needed — treat
   them as two completely independent transit events happening in parallel; they
   will each independently arrive at the other's entry point.
8. If a snake's head arrives at the exit point and another snake's body already
   occupies that space: this is just a normal Phase 4 collision check at that
   position, evaluated the same as any other tick — no special exit protection.

**Done when:** entering a pipe visibly moves the snake smoothly (not instantly) to
the linked pipe over ~500ms, direction/boost state carries through unchanged, and
collisions during transit work exactly like collisions anywhere else on the map.

---

## PHASE 9 — Confusion Orb (multi-team debuff + fog-of-war + shadow effect)

**Goal:** the full special ability — hardest phase, do this last before polish.

Orb spawn/consumption:
1. One `map.confusionOrb` can exist at a time, at a fixed or random position.
2. When any snake's head touches it: remove the orb (`map.confusionOrb = null`),
   and set:
   ```
   room.debuff = {
     teams: <every team ID from "team-1" to "team-N" EXCEPT the eater's team>,
     expiresAt: now + 10000   // 10 seconds
   }
   ```
3. Schedule the orb to respawn at a new position after a fixed delay (e.g. 15
   seconds) after being consumed.

While `room.debuff !== null` and `now < room.debuff.expiresAt`, for every player
whose `team` is present in `room.debuff.teams`, apply ALL of the following on
THEIR client only (players on the eater's team see no change at all):

1. **Friendly-fire enabled**: in the Phase 4 collision check, treat teammates the
   same as non-teammates for this player only — i.e. do NOT skip the collision
   check for teammate segments during this window (see the exception already noted
   in the Phase 4 pseudocode).
2. **Color/name scramble**: do not use real per-player colors or team highlight
   colors when rendering other snakes. Assign each currently-visible snake a
   randomized color for the duration of the effect (re-shuffle is not required each
   frame — assigning once when the debuff starts and holding it for the duration is
   fine). Do not render name labels above any snake during this effect.
3. **Minimap goes neutral**: do not show green/red indicators on the minimap for
   this player during the effect — show a single neutral/uniform dot color instead
   for all other players.
4. **Fog-of-war (reduced visibility)**: shrink this player's visible view radius on
   the main canvas (e.g. reduce the visible area by roughly half) — do NOT darken
   or blur the whole screen for this part, it's specifically a smaller visible
   radius around the player's own snake, with everything beyond that radius simply
   not rendered.
5. **Shadow/delusion visual effect**: apply BOTH of these together:
   - A CSS filter/overlay on the game canvas or its container — some combination of
     blur, desaturation, and a vignette (darkened edges) to sell disorientation.
   - Faint duplicate "ghost" outlines rendered near real snakes — i.e. for each
     visible snake, additionally draw one or more semi-transparent duplicate
     outlines offset slightly from the real position, so it's briefly unclear
     which outline is the real snake.

When `now >= room.debuff.expiresAt`: set `room.debuff = null`. All affected
players' clients immediately revert — real colors/names return, minimap returns to
green/red, fog-of-war radius returns to normal, shadow/ghost effects are removed,
and teammate collisions resume passing through harmlessly.

**Done when:** eating the orb in a 3+ team room correctly debuffs every OTHER team
simultaneously (verify the eater's own team is unaffected and every other team IS
affected, not just one), and each debuffed player's client shows: scrambled colors,
no names, neutral minimap, reduced view radius, blur/vignette, and ghost outlines —
all at once, for exactly 10 seconds, then a clean revert.

---

## PHASE 10 — Team Visual Indicators (normal, non-debuffed state)

**Goal:** the standard (non-debuffed) rendering rules, per Section 3's binary logic.

Rules (apply from each LOCAL viewer's own perspective — every client computes this
independently based on its own player's team):
- **On-screen snakes** (within current camera/view): show that snake's individual
  `color`, its name label above it, and a team highlight outline —
  **green if `otherPlayer.team === me.team`, red otherwise** (this "otherwise"
  covers every other team at once, regardless of how many exist — do not build a
  per-team color palette here, it's strictly binary).
- **Off-screen snakes** (outside current view): show a low-opacity dot on the
  minimap — green if teammate, red otherwise. No individual color, no name, on the
  minimap.
- This entire section is superseded by Phase 9's rules while a debuff affects the
  local player's team.

**Done when:** in a 3+ team test room, a player correctly sees green for their own
teammates and red for players on BOTH of the other two teams (not just one), both
on-screen and on the minimap.

---

## PHASE 11 — Win Screen & Polish

**Goal:** final presentation layer, lowest risk, do last.

Steps:
1. Round-end screen shows the winning team (or "Tie" if applicable) plus a table of
   every team's kills and score, per Phase 6's calculation.
2. Any remaining visual polish: transitions, sound effects, animations — optional,
   only if time remains.

**Done when:** round-end screen is clear and accurate for any number of teams.

---

## If you run out of time

Phases 0-6 are the core game and must not be skipped. Phases 7-11 add depth but the
game is playable and demonstrable without them, in this order of safest-to-cut:
Phase 11 (polish) → Phase 9 (Confusion Orb) → Phase 8 (pipes) → Phase 7 (boost).
Never cut Phase 4 (collision) or Phase 6 (round lifecycle) — without those there is
no game.
