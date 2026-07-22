---
name: backend-server-sync
description: Use this skill for any task involving setting up Socket.IO event listeners, emitting state, or integrating the tick loop with the network layer.
---

# BackEnd Server Sync & Room Management

## Socket.IO patterns
- All listeners are registered in `src/handlers/`.
- Validations (like "is this team full?") occur synchronously in the handler. If they fail, emit an `error` event.
- If they succeed, mutate the `RoomSimulation` instance directly.
- The tick loop in `src/simulation/tickLoop.ts` runs on a `setInterval` (~20Hz).

## Emitting State
- Use `io.to(roomCode).emit('tick:state', ...)` for high-frequency physics data (positions, pellets).
- Use `io.to(roomCode).emit('room:state', ...)` for low-frequency mutations (players joining, settings changing).

## Room simulation lifecycle
- Created on `room:create` (stored in `roomManager.ts` Map).
- Destroyed when everyone leaves or an explicit cleanup occurs.
