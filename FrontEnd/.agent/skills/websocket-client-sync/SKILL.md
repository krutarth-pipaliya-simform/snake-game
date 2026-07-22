---
name: websocket-client-sync
description: >
  Use this skill for any task involving the Socket.IO client connection,
  sending inputs to the server, or receiving/rendering server-broadcast
  state. Replaces the old supabase-realtime-sync skill.
---

# WebSocket Client Sync — How the Frontend Connects

## Core pattern
- Client connects via Socket.IO to `VITE_WS_URL`
- Client sends ONLY inputs: `input:direction`, `input:boost`, `room:create`, etc.
- Client NEVER computes position, collision, or lobby state locally
- Client renders whatever the server broadcasts via `tick:state` and `room:state`

## Socket client singleton
- Defined in `src/realtime/socketClient.ts`
- Typed with `ClientEvents` and `ServerEvents` from `shared/types/events.ts`

## Rules
- Never send position/state claims to the server — only inputs/intents
- Always handle 'error' events and show connection status
- Unsubscribe from events on component unmount
