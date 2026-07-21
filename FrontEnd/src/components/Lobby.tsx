import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRoom, selectLocalPlayer } from '../store/selectors';
import { setReady } from '../store/localPlayerSlice';
import { useRoomSync } from '../hooks/useRoomSync';
import type { Room } from '../../../shared/types/room';

export function Lobby() {
  const room = useSelector(selectRoom);
  const localPlayer = useSelector(selectLocalPlayer);
  const dispatch = useDispatch();
  const { presenceMap, joinTeam, kickPlayer, updateSettings, startRound } = useRoomSync();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const isHost = room.hostId === localPlayer.id;


  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  const enforceMin = (key: keyof Room['settings'], min: number, raw: string) => {
    let val = parseInt(raw);
    if (isNaN(val) || val < min) val = min;
    updateSettings({ [key]: val });
  };

  // NOTE: For now, we allow starting if we're host (presence validation will be strictly done server-side)
  const canStart = isHost; 

  const myTeamId = Object.keys(room.teams).find((tId) => room.teams[tId].playerIds.includes(localPlayer.id));

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(room.teams).map(([teamId, team]) => {
              const isMyTeam = myTeamId === teamId;
              const iAmLeader = team.leaderId === localPlayer.id;

              return (
                <div key={teamId} className={`flex flex-col rounded-lg border transition-colors ${isMyTeam ? 'border-game-accent/60 bg-game-accent/5' : 'border-gray-700 bg-gray-800'}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60">
                    <h4 className="font-bold text-white capitalize">{teamId.replace('-', ' ')}</h4>
                    <span className="text-xs text-gray-400 tabular-nums">{team.playerIds.length}/{room.settings.teamCap}</span>
                  </div>
                  <div className="flex-1 px-3 py-2 space-y-1.5 min-h-[120px]">
                    {team.playerIds.length === 0 && <p className="text-sm text-gray-600 italic py-3 text-center">No players yet</p>}
                    {team.playerIds.map((pId) => {
                      const isMe = pId === localPlayer.id;
                      const isThisLeader = pId === team.leaderId;
                      // Fallback name rendering until server-provided presence is fully mapped
                      const displayName = isMe ? localPlayer.name : (presenceMap[pId]?.name ?? pId);

                      return (
                        <div key={pId} className="flex items-center justify-between rounded px-3 py-2 text-sm bg-black/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`truncate ${isMe ? 'text-game-accent font-semibold' : 'text-gray-300'}`}>{displayName}</span>
                            {isThisLeader && <span title="Team Leader">👑</span>}
                          </div>
                          <div className="shrink-0 ml-2">
                            {iAmLeader && !isMe && (
                              <button onClick={() => kickPlayer(pId)} className="text-xs text-red-400 hover:text-red-300 uppercase font-bold">Kick</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-3 pb-3 pt-1">
                    {!isMyTeam ? (
                      <button onClick={() => joinTeam(teamId)} disabled={team.playerIds.length >= room.settings.teamCap} className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded transition-colors">
                        Join {teamId.replace('-', ' ')}
                      </button>
                    ) : (
                      <div className="w-full py-2 text-center text-xs text-game-accent font-medium">Your team</div>
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
            <SettingField label="Team Count (min 2)">
              <input type="number" min="2" value={room.settings.teamCount || ''} disabled={!isHost} onBlur={(e) => enforceMin('teamCount', 2, e.target.value)} onChange={(e) => updateSettings({ teamCount: parseInt(e.target.value) || 2 })} className="lobby-input" />
            </SettingField>
            <SettingField label="Team Cap">
              <input type="number" min="1" value={room.settings.teamCap || ''} disabled={!isHost} onBlur={(e) => enforceMin('teamCap', 1, e.target.value)} onChange={(e) => updateSettings({ teamCap: parseInt(e.target.value) || 1 })} className="lobby-input" />
            </SettingField>
            <SettingField label="Round Duration (s)">
              <input type="number" min="30" value={room.settings.roundDurationSeconds || ''} disabled={!isHost} onBlur={(e) => enforceMin('roundDurationSeconds', 30, e.target.value)} onChange={(e) => updateSettings({ roundDurationSeconds: parseInt(e.target.value) || 30 })} className="lobby-input" />
            </SettingField>
            <SettingField label="Respawn Mode">
              <select disabled={!isHost} value={room.settings.respawnDelaySeconds === null ? 'none' : 'timer'} onChange={(e) => updateSettings({ respawnDelaySeconds: e.target.value === 'none' ? null : 5 })} className="lobby-input">
                <option value="none">No respawn</option>
                <option value="timer">Respawn after N seconds</option>
              </select>
              <input type="number" min="1" max="60" value={room.settings.respawnDelaySeconds ?? 5} disabled={!isHost || room.settings.respawnDelaySeconds === null} onChange={(e) => updateSettings({ respawnDelaySeconds: parseInt(e.target.value) || 1 })} className="lobby-input mt-2 transition-opacity" style={{ opacity: room.settings.respawnDelaySeconds !== null ? 1 : 0, pointerEvents: room.settings.respawnDelaySeconds !== null ? 'auto' : 'none' }} tabIndex={room.settings.respawnDelaySeconds !== null ? 0 : -1} aria-hidden={room.settings.respawnDelaySeconds === null} />
            </SettingField>
          </div>
          <div className="space-y-3">
            <button onClick={() => dispatch(setReady(!localPlayer.isReady))} className={`w-full py-3 rounded-lg font-bold text-white transition-all ${localPlayer.isReady ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20' : 'bg-gray-600 hover:bg-gray-500'}`}>
              {localPlayer.isReady ? '✓ Ready' : 'Click to Ready Up'}
            </button>
            {isHost && (
              <button onClick={startRound} disabled={!canStart} className="w-full py-4 bg-game-accent hover:bg-game-accent-glow disabled:bg-gray-800 disabled:text-gray-500 text-white font-extrabold text-xl rounded-lg transition-all shadow-lg shadow-game-accent/20 disabled:shadow-none">
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, children }: { label: string; children: React.ReactNode; }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      {children}
    </div>
  );
}
