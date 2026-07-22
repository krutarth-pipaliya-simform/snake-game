import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRoom, selectLocalPlayer } from '../store/selectors';
import { setReady } from '../store/localPlayerSlice';
import { useRoomSync } from '../hooks/useRoomSync';


export function Lobby() {
  const room = useSelector(selectRoom);
  const localPlayer = useSelector(selectLocalPlayer);
  const dispatch = useDispatch();
  const { joinTeam, kickPlayer, updateSettings, startRound, setReadyState } = useRoomSync();
  const [copied, setCopied] = useState(false);
  const [teamCountStr, setTeamCountStr] = useState('');
  const [teamCapStr, setTeamCapStr] = useState('');
  const [roundDurationStr, setRoundDurationStr] = useState('');
  const [roundsPerMatchStr, setRoundsPerMatchStr] = useState('');
  const [respawnDelayStr, setRespawnDelayStr] = useState('');
  const [isRespawnEnabled, setIsRespawnEnabled] = useState(false);

  useEffect(() => {
    if (room) {
      setTeamCountStr(room.settings.teamCount.toString());
      setTeamCapStr(room.settings.teamCap.toString());
      setRoundDurationStr(room.settings.roundDurationSeconds.toString());
      setRoundsPerMatchStr((room.settings.roundsPerMatch || 1).toString());
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
    if (!isNaN(val) && val >= 1) {
      updateSettings({ roundDurationSeconds: val });
    }
  };

  const handleRoundsPerMatchBlur = () => {
    const val = parseInt(roundsPerMatchStr);
    if (!isNaN(val) && val >= 1) {
      updateSettings({ roundsPerMatch: val });
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
    <div className="flex flex-col gap-8 p-6 md:p-8 card-base w-full max-w-6xl mx-auto mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-[var(--color-text-primary)] tracking-wide">Lobby</h2>
        </div>
        <div 
          onDoubleClick={handleCopyCode}
          title="Double click to copy"
          className="relative flex items-center bg-[var(--bg-panel-raised)] px-4 py-2 rounded-lg border border-[var(--color-border-default)] cursor-pointer hover:border-gray-500 transition-colors"
        >
          <span className="select-none text-xs text-[var(--color-text-secondary)] font-bold tracking-wider mr-3">ROOM CODE</span>
          <span className="text-[var(--color-text-primary)] font-mono font-bold text-lg select-all">{room.code}</span>
          {copied && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-success)] text-white text-xs font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
              Copied!
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* ======================== TEAMS ======================== */}
        <div className="space-y-4">
          <h3 className="text-xl font-display font-bold text-[var(--color-text-primary)]">Teams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(room.teams).map(([teamId, team]) => {
              const isMyTeam = myTeamId === teamId;
              const iAmLeader = team.leaderId === localPlayer.id;

              return (
                <div key={teamId} className={`flex flex-col bg-[var(--bg-panel-raised)] rounded-lg border transition-colors overflow-hidden ${isMyTeam ? 'border-[var(--color-accent-system)] shadow-[0_0_0_1px_var(--color-accent-system)]' : 'border-[var(--color-border-default)]'}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)] bg-black/20">
                    <h4 className="font-display font-bold text-[var(--color-text-primary)] capitalize tracking-wide">{teamId.replace('-', ' ')}</h4>
                    <span className="text-xs font-bold text-[var(--color-text-secondary)] tabular-nums tracking-widest">{team.playerIds.length} / {room.settings.teamCap}</span>
                  </div>
                  <div className="flex-1 px-3 py-2 space-y-1">
                    {team.playerIds.length === 0 && <p className="text-sm text-[var(--color-text-secondary)] italic py-3 text-center">No players yet</p>}
                    {team.playerIds.map((pId) => {
                      const isMe = pId === localPlayer.id;
                      const isThisLeader = pId === team.leaderId;
                      // Fallback name rendering until server-provided presence is fully mapped
                      const displayName = isMe ? localPlayer.name : (room.players?.[pId]?.name ?? pId);
                      const isReady = room.players?.[pId]?.isReady ?? false;

                      return (
                        <div key={pId} className="flex items-center justify-between rounded px-3 py-2.5 text-sm hover:bg-black/20 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`truncate ${isMe ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)]'}`}>{displayName}</span>
                            {isThisLeader && <span className="text-[var(--color-text-secondary)] text-[10px] font-bold uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded">Leader</span>}
                            {isReady && <span className="text-[var(--color-success)] text-[10px] font-bold uppercase tracking-widest bg-[var(--color-success)]/10 px-1.5 py-0.5 rounded">Ready</span>}
                          </div>
                          <div className="shrink-0 ml-2">
                            {iAmLeader && !isMe && (
                              <button onClick={() => kickPlayer(pId)} className="text-[10px] text-[var(--color-danger-alert)] hover:text-red-400 uppercase font-bold tracking-wider cursor-pointer disabled:cursor-not-allowed">Kick</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-3 pb-3 pt-1 mt-auto">
                    {!isMyTeam ? (
                      <button onClick={() => joinTeam(teamId)} disabled={team.playerIds.length >= room.settings.teamCap} className="w-full py-2 btn-secondary uppercase tracking-widest text-xs font-bold cursor-pointer transition-colors">
                        Join Team
                      </button>
                    ) : (
                      <div className="w-full text-center py-2 text-xs text-[var(--color-accent-system)] font-bold uppercase tracking-widest bg-[var(--color-accent-system)]/10 rounded-md">
                        Your Team
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================== SETTINGS ======================== */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-panel-raised)] p-6 rounded-lg border border-[var(--color-border-default)] shadow-sm">
            <h3 className="text-lg font-display font-bold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border-default)] pb-3">Settings</h3>
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <SettingField label="Team Count">
                <input 
                  type="number" 
                  value={teamCountStr} 
                  disabled={!isHost} 
                  onBlur={handleTeamCountBlur} 
                  onChange={(e) => setTeamCountStr(e.target.value)} 
                  className={`lobby-input ${parseInt(teamCountStr) < 2 ? 'border-red-500 outline-none focus:border-red-500 focus:ring-red-500' : ''}`} 
                />
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
              </SettingField>
              <SettingField label="Round Length">
                <input 
                  type="number" 
                  value={roundDurationStr} 
                  disabled={!isHost} 
                  onBlur={handleRoundDurationBlur} 
                  onChange={(e) => setRoundDurationStr(e.target.value)} 
                  className={`lobby-input ${parseInt(roundDurationStr) < 1 ? 'border-red-500 outline-none focus:border-red-500 focus:ring-red-500' : ''}`} 
                />
              </SettingField>
              <SettingField label="Match Rounds">
                <input 
                  type="number" 
                  value={roundsPerMatchStr} 
                  disabled={!isHost} 
                  onBlur={handleRoundsPerMatchBlur} 
                  onChange={(e) => setRoundsPerMatchStr(e.target.value)} 
                  className={`lobby-input ${parseInt(roundsPerMatchStr) < 1 ? 'border-red-500 outline-none focus:border-red-500 focus:ring-red-500' : ''}`} 
                />
              </SettingField>
            </div>

            <div className="mt-3">
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
              </SettingField>
              
              {isRespawnEnabled && (
                <div className="mt-3">
                  <SettingField label="Respawn Delay (s)">
                    <input 
                      type="number" 
                      value={respawnDelayStr} 
                      disabled={!isHost} 
                      onBlur={handleRespawnDelayBlur}
                      onChange={(e) => setRespawnDelayStr(e.target.value)} 
                      className={`lobby-input ${parseInt(respawnDelayStr) < 1 || parseInt(respawnDelayStr) > 60 ? 'border-[var(--color-danger-alert)] outline-none focus:border-[var(--color-danger-alert)]' : ''}`} 
                    />
                  </SettingField>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => {
                const newReady = !localPlayer.isReady;
                dispatch(setReady(newReady));
                setReadyState(newReady);
              }} 
              className={`w-full py-4 text-sm font-bold tracking-widest uppercase transition-all rounded ${localPlayer.isReady ? 'bg-[var(--color-success)] text-gray-900 border-[var(--color-success)] hover:bg-[var(--color-success)]/90 cursor-pointer' : 'btn-primary cursor-pointer'}`}
            >
              {localPlayer.isReady ? 'Ready' : 'Ready Up'}
            </button>
            {isHost ? (
              <button 
                onClick={startRound} 
                disabled={!canStart} 
                className="w-full py-4 btn-primary relative group"
              >
                INITIALIZE GAME
                {!canStart && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 text-center bg-black text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
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
