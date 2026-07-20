---
name: supabase-realtime-sync
description: Use this skill for any task involving Supabase Realtime channels, broadcasting player state, or receiving/rendering other players' positions in the Team Snake Battle game. Covers Phase 3 (position sync) and any later phase that broadcasts additional state (boost, debuff, pipe transit).
---

# Supabase Realtime Sync — How This Project Uses It

## Core pattern

This project uses Supabase Realtime **Broadcast** only — not Postgres Changes, not
Presence (except optionally for join/leave detection in the lobby). Broadcast is
the right tool because position updates happen many times per second and don't
need to be persisted to a database table.

```javascript
// Joining the room's channel (do this once, on entering in_round)
const channel = supabase.channel(`room-${roomCode}`, {
  config: { broadcast: { self: false } }
});

channel.on('broadcast', { event: 'player_state' }, (payload) => {
  // payload.payload is the player state object sent by another client
  // store it in Redux, keyed by playerId — do NOT trigger local simulation
  // from this, just update what gets rendered
});

channel.subscribe();
```

```javascript
// Sending your own state — call this on an interval, every 100ms
channel.send({
  type: 'broadcast',
  event: 'player_state',
  payload: {
    playerId: myId,
    segments: mySnake.segments,
    direction: mySnake.direction,
    boosting: mySnake.boosting,
    alive: mySnake.alive,
    // add fields here as later phases require (e.g. inPipeTransit) —
    // always extend this same payload shape, don't create a second channel
  }
});
```

## Rules specific to this project

- One channel per room, named by room code. Do not create a new channel per
  feature — extend the existing `player_state` broadcast payload as new fields
  become necessary in later phases (boost, pipe transit, debuff).
- `{ self: false }` — a client should never process its own broadcast; it already
  knows its own state from local simulation.
- Never simulate another player's movement between broadcasts. Render exactly the
  last received state for each other player — no dead-reckoning, no interpolation.
  This is a deliberate simplicity choice for a one-day build.
- Room-level state that isn't per-player (e.g. `room.debuff`, `map.confusionOrb`,
  round timer, votes) should also go over broadcast on the same channel, using a
  different `event` name (e.g. `'room_state'`), sent by whichever client action
  triggered the change (e.g. the client whose snake ate the orb sends the debuff
  update). There is no separate backend authority in this project — any client can
  broadcast a room-state change when it locally detects the trigger condition.
- Always unsubscribe from the channel (`channel.unsubscribe()` or
  `supabase.removeChannel(channel)`) when a player leaves the room or the
  component unmounts, to avoid stale listeners.

## Common mistakes to avoid

- Do not use `await` inside the 100ms broadcast interval in a way that could let
  intervals stack up if a call is slow — use `setInterval` with a plain (non-async)
  callback, or guard against overlapping sends.
- Do not put position data in Supabase Presence — Presence is for "who is online",
  not for high-frequency state.
- Do not forget `{ self: false }` — without it you'll see your own snake stutter
  or double-render from processing your own broadcasts.
