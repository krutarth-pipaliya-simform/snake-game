import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRoom, selectLocalPlayer } from '../store/selectors';
import { setRoom } from '../store/roomSlice';
import { setReady } from '../store/localPlayerSlice';
import { useRoomSync } from '../hooks/useRoomSync';
import type { Room } from '../types/room';

export function Lobby() {
  const room = useSelector(selectRoom);
  const localPlayer = useSelector(selectLocalPlayer);
  const dispatch = useDispatch();
  const { presenceMap, broadcastRoom } = useRoomSync();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const isHost = room.hostId === localPlayer.id;

  // Derive a flat list of online player IDs from presence for validation
  const onlineIds = new Set(Object.keys(presenceMap));

  // ---------------------------------------------------------------- helpers

  /** Deep-clone current room for immutable updates */
  const cloneRoom = (): Room => JSON.parse(JSON.stringify(room));

  const dispatchAndBroadcast = (next: Room) => {
    dispatch(setRoom(next));
    broadcastRoom(next);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  // ---------------------------------------------------------------- handlers

  const handleTeamCountChange = (valueStr: string) => {
    let count = parseInt(valueStr);
    if (isNaN(count)) count = 0;

    const next = cloneRoom();
    next.settings.teamCount = count;

    // Add new teams
    for (let i = 1; i <= count; i++) {
      const tId = `team-${i}`;
      if (!next.teams[tId]) {
        next.teams[tId] = { leaderId: '', playerIds: [] };
      }
    }
    // Drop teams beyond count
    for (const tId in next.teams) {
      if (parseInt(tId.replace('team-', '')) > count) {
        delete next.teams[tId];
      }
    }
    dispatchAndBroadcast(next);
  };

  const handleJoinTeam = (targetTeamId: string) => {
    const next = cloneRoom();
    const target = next.teams[targetTeamId];

    if (target.playerIds.length >= next.settings.teamCap) return;

    // Remove from current team first
    for (const tId in next.teams) {
      const t = next.teams[tId];
      t.playerIds = t.playerIds.filter((id) => id !== localPlayer.id);
      if (t.leaderId === localPlayer.id) {
        t.leaderId = t.playerIds.length > 0 ? t.playerIds[0] : '';
      }
    }

    // Add to target
    target.playerIds.push(localPlayer.id);
    if (target.playerIds.length === 1) target.leaderId = localPlayer.id;

    dispatchAndBroadcast(next);
  };

  const handleKick = (playerIdToKick: string, currentTeamId: string) => {
    const next = cloneRoom();

    // Build eligible teams list per spec
    const eligible = Object.keys(next.teams).filter(
      (tId) =>
        tId !== currentTeamId &&
        next.teams[tId].playerIds.length < next.settings.teamCap,
    );

    if (eligible.length === 0) {
      alert('No team has space');
      return;
    }

    const destTeamId = eligible[Math.floor(Math.random() * eligible.length)];

    // Remove from current
    const cur = next.teams[currentTeamId];
    cur.playerIds = cur.playerIds.filter((id) => id !== playerIdToKick);
    if (cur.leaderId === playerIdToKick) {
      cur.leaderId = cur.playerIds.length > 0 ? cur.playerIds[0] : '';
    }

    // Add to dest
    const dest = next.teams[destTeamId];
    dest.playerIds.push(playerIdToKick);
    if (dest.playerIds.length === 1) dest.leaderId = playerIdToKick;

    dispatchAndBroadcast(next);
  };

  /** Host removes a disconnected (stale) player from their team entirely. */
  const handleRemoveStale = (playerId: string) => {
    const next = cloneRoom();
    for (const tId in next.teams) {
      const t = next.teams[tId];
      t.playerIds = t.playerIds.filter((id) => id !== playerId);
      if (t.leaderId === playerId) {
        t.leaderId = t.playerIds.length > 0 ? t.playerIds[0] : '';
      }
    }
    dispatchAndBroadcast(next);
  };

  const handleStartGame = () => {
    const next = cloneRoom();
    next.status = 'in_round';
    dispatchAndBroadcast(next);
  };

  const handleSettingChange = (
    key: keyof Room['settings'],
    raw: string,
  ) => {
    let val = parseInt(raw);
    if (isNaN(val)) val = 0;
    const next = cloneRoom();
    (next.settings as any)[key] = val;
    dispatchAndBroadcast(next);
  };

  const enforceMin = (key: keyof Room['settings'], min: number, raw: string) => {
    let val = parseInt(raw);
    if (isNaN(val) || val < min) val = min;
    const next = cloneRoom();
    (next.settings as any)[key] = val;
    dispatchAndBroadcast(next);
  };

  // ----------------------------------------------------------- validation

  // Only consider players who are both in a team AND online
  const teamPlayerIds = new Set(
    Object.values(room.teams).flatMap((t) => t.playerIds),
  );
  const onlineTeamPlayerIds = [...teamPlayerIds].filter((id) =>
    onlineIds.has(id),
  );

  // All online-and-on-a-team players must be ready
  const allOnlineReady =
    onlineTeamPlayerIds.length > 0 &&
    onlineTeamPlayerIds.every((id) => presenceMap[id]?.isReady);

  // Every team that exists must have at least one online player
  const teamEntries = Object.entries(room.teams);
  const allTeamsHaveOnline =
    teamEntries.length > 0 &&
    teamEntries.every(([, t]) =>
      t.playerIds.some((id) => onlineIds.has(id)),
    );

  const canStart = isHost && allTeamsHaveOnline && allOnlineReady;

  // Diagnostics for the host
  let startBlockReason = '';
  if (isHost && !canStart) {
    if (teamEntries.length === 0) {
      startBlockReason = 'No teams configured.';
    } else if (!allTeamsHaveOnline) {
      startBlockReason = 'Every team needs at least one online player.';
    } else if (!allOnlineReady) {
      startBlockReason = 'All players must be ready.';
    }
  }

  // Find which team the local player is on
  const myTeamId = Object.keys(room.teams).find((tId) =>
    room.teams[tId].playerIds.includes(localPlayer.id),
  );

  // ---------------------------------------------------------------- render

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-gray-900 rounded-xl border border-gray-700 w-full max-w-5xl mx-auto mt-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Lobby</h2>
        <div 
          onDoubleClick={handleCopyCode}
          title="Double click to copy"
          className="relative text-xl text-gray-300 bg-black px-4 py-2 rounded-lg font-mono tracking-widest border border-gray-600 cursor-pointer hover:border-gray-500 transition-colors"
        >
          <span className="select-none">ROOM: </span>
          <span className="text-game-accent font-bold select-all">{room.code}</span>
          {copied && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-game-success text-white text-xs font-sans tracking-normal font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
              Copied!
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* ======================== TEAMS ======================== */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Teams</h3>

          {/* Use a stable grid that won't CLS — fixed 2-col on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(room.teams).map(([teamId, team]) => {
              const isMyTeam = myTeamId === teamId;
              const iAmLeader = team.leaderId === localPlayer.id;

              return (
                <div
                  key={teamId}
                  className={`flex flex-col rounded-lg border transition-colors ${
                    isMyTeam
                      ? 'border-game-accent/60 bg-game-accent/5'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  {/* Team header — fixed height */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60">
                    <h4 className="font-bold text-white capitalize">
                      {teamId.replace('-', ' ')}
                    </h4>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {team.playerIds.length}/{room.settings.teamCap}
                    </span>
                  </div>

                  {/* Player list — fixed min-height to prevent CLS */}
                  <div className="flex-1 px-3 py-2 space-y-1.5 min-h-[120px]">
                    {team.playerIds.length === 0 && (
                      <p className="text-sm text-gray-600 italic py-3 text-center">
                        No players yet
                      </p>
                    )}
                    {team.playerIds.map((pId) => {
                      const presence = presenceMap[pId];
                      const isOnline = !!presence;
                      const isMe = pId === localPlayer.id;
                      const isThisLeader = pId === team.leaderId;
                      const isReady = presence?.isReady ?? false;
                      const displayName = isMe
                        ? localPlayer.name
                        : presence?.name ?? 'Disconnected';

                      return (
                        <div
                          key={pId}
                          className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                            isOnline
                              ? 'bg-black/30'
                              : 'bg-red-950/20 border border-red-900/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Ready indicator */}
                            {isOnline ? (
                              isReady ? (
                                <span
                                  className="shrink-0 w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]"
                                  title="Ready"
                                />
                              ) : (
                                <span
                                  className="shrink-0 w-2.5 h-2.5 rounded-full bg-gray-600"
                                  title="Not ready"
                                />
                              )
                            ) : (
                              <span
                                className="shrink-0 w-2.5 h-2.5 rounded-full bg-red-500/70"
                                title="Disconnected"
                              />
                            )}

                            <span
                              className={`truncate ${
                                !isOnline
                                  ? 'text-red-400 line-through'
                                  : isMe
                                    ? 'text-game-accent font-semibold'
                                    : 'text-gray-300'
                              }`}
                            >
                              {displayName}
                            </span>

                            {isThisLeader && (
                              <span title="Team Leader">👑</span>
                            )}

                            {/* Ready / Not Ready badge (online players only) */}
                            {isOnline && (
                              <span
                                className={`shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                                  isReady
                                    ? 'bg-green-900/40 text-green-400'
                                    : 'bg-gray-800 text-gray-500'
                                }`}
                              >
                                {isReady ? 'Ready' : 'Not Ready'}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 ml-2">
                            {/* Team leader can kick online teammates */}
                            {iAmLeader && !isMe && isOnline && (
                              <button
                                onClick={() => handleKick(pId, teamId)}
                                className="text-xs text-red-400 hover:text-red-300 uppercase font-bold"
                              >
                                Kick
                              </button>
                            )}

                            {/* Host can remove disconnected (stale) players */}
                            {!isOnline && isHost && (
                              <button
                                onClick={() => handleRemoveStale(pId)}
                                className="text-xs text-red-400 hover:text-red-300 uppercase font-bold"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Join button — always rendered to keep card height stable */}
                  <div className="px-3 pb-3 pt-1">
                    {!isMyTeam ? (
                      <button
                        onClick={() => handleJoinTeam(teamId)}
                        disabled={
                          team.playerIds.length >= room.settings.teamCap
                        }
                        className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded transition-colors"
                      >
                        Join {teamId.replace('-', ' ')}
                      </button>
                    ) : (
                      <div className="w-full py-2 text-center text-xs text-game-accent font-medium">
                        Your team
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================== SETTINGS ======================== */}
        <div className="space-y-5">
          <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-lg font-bold text-white">Settings</h3>

            {/* Team Count */}
            <SettingField label="Team Count (min 2)">
              <input
                type="number"
                min="2"
                value={room.settings.teamCount || ''}
                disabled={!isHost}
                onBlur={(e) => {
                  let v = parseInt(e.target.value);
                  if (isNaN(v) || v < 2) handleTeamCountChange('2');
                }}
                onChange={(e) => handleTeamCountChange(e.target.value)}
                className="lobby-input"
              />
            </SettingField>

            {/* Team Cap */}
            <SettingField label="Team Cap">
              <input
                type="number"
                min="1"
                value={room.settings.teamCap || ''}
                disabled={!isHost}
                onBlur={(e) => enforceMin('teamCap', 1, e.target.value)}
                onChange={(e) => handleSettingChange('teamCap', e.target.value)}
                className="lobby-input"
              />
            </SettingField>

            {/* Round Duration */}
            <SettingField label="Round Duration (s)">
              <input
                type="number"
                min="30"
                value={room.settings.roundDurationSeconds || ''}
                disabled={!isHost}
                onBlur={(e) =>
                  enforceMin('roundDurationSeconds', 30, e.target.value)
                }
                onChange={(e) =>
                  handleSettingChange('roundDurationSeconds', e.target.value)
                }
                className="lobby-input"
              />
            </SettingField>

            {/* Respawn Mode */}
            <SettingField label="Respawn Mode">
              <select
                disabled={!isHost}
                value={
                  room.settings.respawnDelaySeconds === null ? 'none' : 'timer'
                }
                onChange={(e) => {
                  const next = cloneRoom();
                  next.settings.respawnDelaySeconds =
                    e.target.value === 'none' ? null : 5;
                  dispatchAndBroadcast(next);
                }}
                className="lobby-input"
              >
                <option value="none">No respawn</option>
                <option value="timer">Respawn after N seconds</option>
              </select>
              {/* Always rendered to reserve space — hidden via CSS when not active */}
              <input
                type="number"
                min="1"
                max="60"
                value={room.settings.respawnDelaySeconds ?? 5}
                disabled={!isHost || room.settings.respawnDelaySeconds === null}
                onChange={(e) => {
                  const next = cloneRoom();
                  let v = parseInt(e.target.value);
                  if (isNaN(v)) v = 1;
                  next.settings.respawnDelaySeconds = v;
                  dispatchAndBroadcast(next);
                }}
                className="lobby-input mt-2 transition-opacity"
                style={{
                  opacity: room.settings.respawnDelaySeconds !== null ? 1 : 0,
                  pointerEvents:
                    room.settings.respawnDelaySeconds !== null ? 'auto' : 'none',
                }}
                tabIndex={room.settings.respawnDelaySeconds !== null ? 0 : -1}
                aria-hidden={room.settings.respawnDelaySeconds === null}
              />
            </SettingField>
          </div>

          {/* ---- Actions ---- */}
          <div className="space-y-3">
            <button
              onClick={() => dispatch(setReady(!localPlayer.isReady))}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                localPlayer.isReady
                  ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {localPlayer.isReady ? '✓ Ready' : 'Click to Ready Up'}
            </button>

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className="w-full py-4 bg-game-accent hover:bg-game-accent-glow disabled:bg-gray-800 disabled:text-gray-500 text-white font-extrabold text-xl rounded-lg transition-all shadow-lg shadow-game-accent/20 disabled:shadow-none"
              >
                Start Game
              </button>
            )}

            {isHost && startBlockReason && (
              <p className="text-xs text-center text-red-400">
                {startBlockReason}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tiny wrapper to keep settings fields visually consistent and prevent CLS */
function SettingField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      {children}
    </div>
  );
}
