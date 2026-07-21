import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../realtime/supabaseClient';
import { selectRoom, selectLocalPlayer } from '../store/selectors';
import { setRoom } from '../store/roomSlice';
import type { Room } from '../types/room';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceState {
  id: string;
  name: string;
  isReady: boolean;
}

/**
 * Remove a player ID from every team in the room, fixing up leaders as needed.
 * Returns a new Room object (does NOT mutate the input).
 */
function purgePlayerFromRoom(room: Room, playerId: string): Room {
  const next = JSON.parse(JSON.stringify(room)) as Room;
  for (const tId in next.teams) {
    const team = next.teams[tId];
    team.playerIds = team.playerIds.filter((id) => id !== playerId);
    if (team.leaderId === playerId) {
      team.leaderId = team.playerIds.length > 0 ? team.playerIds[0] : '';
    }
  }
  return next;
}

export function useRoomSync() {
  const dispatch = useDispatch();
  const room = useSelector(selectRoom);
  const localPlayer = useSelector(selectLocalPlayer);

  /** Map of presence-id → PresenceState for O(1) lookups */
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceState>>(
    {},
  );
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Keep a mutable ref so event handlers always see latest room without
  // re-subscribing every time room changes.
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const localPlayerRef = useRef(localPlayer);
  useEffect(() => {
    localPlayerRef.current = localPlayer;
  }, [localPlayer]);

  const [isSubscribed, setIsSubscribed] = useState(false);

  // ------------------------------------------------------------------ channel
  useEffect(() => {
    if (!room?.code) return;

    const ch = supabase.channel(`room-${room.code}`, {
      config: { presence: { key: localPlayer.id } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const map: Record<string, PresenceState> = {};
      for (const key in state) {
        const entry = state[key][0] as PresenceState;
        map[entry.id] = entry;
      }
      setPresenceMap(map);
    })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // When someone disconnects, the host purges their stale ID from
        // every team and broadcasts the cleaned-up room.
        // IMPORTANT: Supabase fires leave → join when a user re-tracks
        // (e.g. toggling ready). We debounce with a short delay and then
        // re-check presenceState() to avoid purging players who are
        // still connected.
        if (roomRef.current?.hostId !== localPlayerRef.current.id) return;

        const idsToCheck = (leftPresences as PresenceState[]).map((p) => p.id);

        setTimeout(() => {
          // Re-read live presence — if the player re-joined in the
          // meantime (re-track), they'll be back in the state.
          const currentPresence = ch.presenceState();
          const stillOnlineIds = new Set<string>();
          for (const key in currentPresence) {
            const entry = currentPresence[key][0] as PresenceState;
            stillOnlineIds.add(entry.id);
          }

          const trulyGone = idsToCheck.filter((id) => !stillOnlineIds.has(id));
          if (trulyGone.length === 0) return;

          let updated = roomRef.current!;
          for (const id of trulyGone) {
            updated = purgePlayerFromRoom(updated, id);
          }
          dispatch(setRoom(updated));
          ch.send({
            type: 'broadcast',
            event: 'SYNC_ROOM',
            payload: updated,
          });
        }, 2500);
      })
      .on('presence', { event: 'join' }, () => {
        // Host re-broadcasts room so new joiner gets current state
        if (roomRef.current?.hostId === localPlayerRef.current.id) {
          ch.send({
            type: 'broadcast',
            event: 'SYNC_ROOM',
            payload: roomRef.current,
          });
        }
      })
      .on('broadcast', { event: 'SYNC_ROOM' }, ({ payload }) => {
        dispatch(setRoom(payload as Room));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        }
      });

    setChannel(ch);

    return () => {
      setIsSubscribed(false);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code]);

  // ------------------------------------------ re-track on name / ready change
  useEffect(() => {
    if (!channel || !isSubscribed) return;
    
    channel.track({
      id: localPlayer.id,
      name: localPlayer.name,
      isReady: localPlayer.isReady,
    });
  }, [localPlayer.isReady, localPlayer.name, channel, isSubscribed]);

  // -------------------------------------------------------- broadcast helper
  const broadcastRoom = useCallback(
    (newRoom: Room) => {
      if (channel && (channel as any).state === 'joined') {
        channel.send({
          type: 'broadcast',
          event: 'SYNC_ROOM',
          payload: newRoom,
        });
      }
    },
    [channel],
  );

  return { presenceMap, broadcastRoom };
}
