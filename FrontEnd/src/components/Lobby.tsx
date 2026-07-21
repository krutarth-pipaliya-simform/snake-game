import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRoom, selectLocalPlayer } from '../store/selectors';
import { setReady } from '../store/localPlayerSlice';
import { useRoomSync } from '../hooks/useRoomSync';
import type { Room } from '../../../shared/types/room';

export function Lobby() {
  const room = useSelector(selectRoom);
  const localPlayer = useSelector(selectLocalPlayer);
  const dispatch = useDispatch();
  const { joinTeam, kickPlayer, updateSettings, startRound, setReadyState } = useRoomSync();
  const [copied, setCopied] = useState(false);
  const [teamCountStr, setTeamCountStr] = useState('');
  const [teamCapStr, setTeamCapStr] = useState('');
  const [roundDurationStr, setRoundDurationStr] = useState('');
  const [respawnDelayStr, setRespawnDelayStr] = useState('');
  const [isRespawnEnabled, setIsRespawnEnabled] = useState(false);

  useEffect(() => {
    if (room) {
      setTeamCountStr(room.settings.teamCount.toString());
      setTeamCapStr(room.settings.teamCap.toString());
      setRoundDurationStr(room.settings.roundDurationSeconds.toString());
      setIsRespawnEnabled(room.settings.respawnDelaySeconds !== null);
      if (room.settings.respawnDelaySeconds !== null) {
        setRespawnDelayStr(room.settings.respawnDelaySeconds.toString());
      } else {
        setRespawnDelayStr('5'); // Default back to 5 if it was null
      }
    }
  }, [room?.settings]);

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

  const handleTeamCountBlur = () => {
    const val = parseInt(teamCountStr);
    if (!isNaN(val) && val >= 2) {
      updateSettings({ teamCount: val });
    }
  };

  const handleTeamCapBlur = () => {
    const val = parseInt(teamCapStr);
    if (!isNaN(val) && val >= 1) {
      updateSettings({ teamCap: val });
    }
  };

  const handleRoundDurationBlur = () => {
    const val = parseInt(roundDurationStr);
    if (!isNaN(val) && val >= 30) {
      updateSettings({ roundDurationSeconds: val });
    }
  };

  const handleRespawnDelayBlur = () => {
    if (!isRespawnEnabled) return;
    const val = parseInt(respawnDelayStr);
    if (!isNaN(val) && val >= 1 && val <= 60) {
      updateSettings({ respawnDelaySeconds: val });
    }
  };

  const handleRespawnModeChange = (enabled: boolean) => {
    setIsRespawnEnabled(enabled);
    if (!enabled) {
      updateSettings({ respawnDelaySeconds: null });
    } else {
      const val = parseInt(respawnDelayStr) || 5;
      updateSettings({ respawnDelaySeconds: Math.min(60, Math.max(1, val)) });
    }
  };

  // Start is allowed only if everyone is ready and there is more than 0 players
  const allReady = Object.values(room.players).length > 0 && Object.values(room.players).every(p => p.isReady);
  const canStart = isHost && allReady; 

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(room.teams).map(([teamId, team]) => {
              const isMyTeam = myTeamId === teamId;
              const iAmLeader = team.leaderId === localPlayer.id;

              return (
                <div key={teamId} className={`flex flex-col rounded-lg border transition-colors ${isMyTeam ? 'border-game-accent/60 bg-game-accent/5' : 'border-gray-700 bg-gray-800'}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60">
                    <h4 className="font-bold text-white capitalize">{teamId.replace('-', ' ')}</h4>
                    <span className="text-xs text-gray-400 tabular-nums">{team.playerIds.length}/{room.settings.teamCap}</span>
                  </div>
                  <div className="flex-1 px-3 py-2 space-y-1.5 min-h-[120px] max-h-[300px] overflow-y-auto">
                    {team.playerIds.length === 0 && <p className="text-sm text-gray-600 italic py-3 text-center">No players yet</p>}
                    {team.playerIds.map((pId) => {
                      const isMe = pId === localPlayer.id;
                      const isThisLeader = pId === team.leaderId;
                      // Fallback name rendering until server-provided presence is fully mapped
                      const displayName = isMe ? localPlayer.name : (room.players?.[pId]?.name ?? pId);
                      const isReady = room.players?.[pId]?.isReady ?? false;

                      return (
                        <div key={pId} className="flex items-center justify-between rounded px-3 py-2 text-sm bg-black/30">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Online Indicator (green dot) */}
                            <div className="w-2 h-2 rounded-full bg-game-success shrink-0" title="Online"></div>
                            <span className={`truncate ${isMe ? 'text-game-accent font-semibold' : 'text-gray-300'}`}>{displayName}</span>
                            {isThisLeader && <span title="Team Leader">👑</span>}
                            {isReady && <span title="Ready" className="text-green-500 text-xs font-bold">✓</span>}
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
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-2">
            <h3 className="text-lg font-bold text-white mb-2">Settings</h3>
            <SettingField label="Team Count (min 2)">
              <input 
                type="number" 
                value={teamCountStr} 
                disabled={!isHost} 
                onBlur={handleTeamCountBlur} 
                onChange={(e) => setTeamCountStr(e.target.value)} 
                className={`lobby-input ${parseInt(teamCountStr) < 2 ? 'border-red-500 outline-none focus:border-red-500 focus:ring-red-500' : ''}`} 
              />
              <p className={`text-xs text-red-400 min-h-[16px] transition-opacity ${parseInt(teamCountStr) < 2 ? 'opacity-100' : 'opacity-0'}`}>
                Invalid input: Minimum team count is 2.
              </p>
            </SettingField>
            <SettingField label="Team Cap">
              <input 
                type="number" 
                value={teamCapStr} 
                disabled={!isHost} 
                onBlur={handleTeamCapBlur} 
                onChange={(e) => setTeamCapStr(e.target.value)} 
                className={`lobby-input ${parseInt(teamCapStr) < 1 ? 'border-red-500 outline-none focus:border-red-500 focus:ring-red-500' : ''}`} 
              />
              <p className={`text-xs text-red-400 min-h-[16px] transition-opacity ${parseInt(teamCapStr) < 1 ? 'opacity-100' : 'opacity-0'}`}>
                Invalid input: Minimum team cap is 1.
              </p>
            </SettingField>
            <SettingField label="Round Duration (s)">
              <input 
                type="number" 
                value={roundDurationStr} 
                disabled={!isHost} 
                onBlur={handleRoundDurationBlur} 
                onChange={(e) => setRoundDurationStr(e.target.value)} 
                className={`lobby-input ${parseInt(roundDurationStr) < 30 ? 'border-red-500 outline-none focus:border-red-500 focus:ring-red-500' : ''}`} 
              />
              <p className={`text-xs text-red-400 min-h-[16px] transition-opacity ${parseInt(roundDurationStr) < 30 ? 'opacity-100' : 'opacity-0'}`}>
                Invalid input: Minimum round duration is 30s.
              </p>
            </SettingField>
            <SettingField label="Respawn Mode">
              <select 
                disabled={!isHost} 
                value={isRespawnEnabled ? 'timer' : 'none'} 
                onChange={(e) => handleRespawnModeChange(e.target.value === 'timer')} 
                className="lobby-input"
              >
                <option value="none">No respawn</option>
                <option value="timer">Respawn after N seconds</option>
              </select>
              
              <input 
                type="number" 
                value={respawnDelayStr} 
                disabled={!isHost || !isRespawnEnabled} 
                onBlur={handleRespawnDelayBlur}
                onChange={(e) => setRespawnDelayStr(e.target.value)} 
                className={`lobby-input mt-2 transition-opacity ${isRespawnEnabled && (parseInt(respawnDelayStr) < 1 || parseInt(respawnDelayStr) > 60) ? 'border-red-500 outline-none focus:border-red-500 focus:ring-red-500' : ''}`} 
                style={{ 
                  opacity: isRespawnEnabled ? 1 : 0, 
                  pointerEvents: isRespawnEnabled ? 'auto' : 'none' 
                }} 
                tabIndex={isRespawnEnabled ? 0 : -1} 
                aria-hidden={!isRespawnEnabled} 
              />
              <p className={`text-xs text-red-400 min-h-[16px] transition-opacity ${isRespawnEnabled && (parseInt(respawnDelayStr) < 1 || parseInt(respawnDelayStr) > 60) ? 'opacity-100' : 'opacity-0'}`}>
                Invalid input: Must be between 1 and 60.
              </p>
            </SettingField>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => {
                const newReady = !localPlayer.isReady;
                dispatch(setReady(newReady));
                setReadyState(newReady);
              }} 
              className={`w-full py-2.5 rounded-lg font-bold text-white transition-all ${localPlayer.isReady ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {localPlayer.isReady ? '✓ Ready' : 'Click to Ready Up'}
            </button>
            {isHost ? (
              <button 
                onClick={startRound} 
                disabled={!canStart} 
                className="w-full py-3 bg-game-accent hover:bg-game-accent-glow disabled:bg-gray-800 disabled:text-gray-500 text-white font-extrabold text-lg rounded-lg transition-all shadow-lg shadow-game-accent/20 disabled:shadow-none relative group"
              >
                Start Game
                {!canStart && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 text-center bg-black text-xs text-white p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    All players must be ready
                  </div>
                )}
              </button>
            ) : (
              <div className="w-full h-[52px]"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, children }: { label: string; children: React.ReactNode; }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      {children}
    </div>
  );
}
