
import { useSelector, useDispatch } from 'react-redux';
import { selectRoom } from '../store/selectors';
import { socket } from '../realtime/socketClient';
import type { RootState } from '../store/store';
import { useRoomSync } from '../hooks/useRoomSync';
import { setReady } from '../store/localPlayerSlice';
import { useState } from 'react';

function TeamCard({
  teamId,
  teamData,
  room,
  localPlayerId,
  results,
  isWinner,
  playerResults,
  showReadyState,
}: {
  teamId: string;
  teamData: { leaderId: string; playerIds: string[] };
  room: any;
  localPlayerId: string;
  results: { kills: number; score: number } | undefined;
  isWinner: boolean;
  playerResults?: Record<string, { kills: number; score: number }>;
  showReadyState: boolean;
}) {
  const displayName = `Team ${teamId.replace('team-', '')}`;
  return (
    <div
      className={`flex flex-col rounded-xl border transition-all duration-300 ${
        isWinner
          ? 'border-yellow-400/60 bg-yellow-400/5 shadow-lg shadow-yellow-400/10'
          : 'border-white/10 bg-white/3'
      }`}
    >
      {/* Team Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isWinner ? 'border-yellow-400/20' : 'border-white/5'}`}>
        <div className="flex items-center gap-2">
          {isWinner && <span className="text-[10px] font-bold uppercase tracking-widest bg-yellow-400/20 text-yellow-200 px-2 py-0.5 rounded">Winner</span>}
          <h4 className={`font-bold text-base capitalize ${isWinner ? 'text-yellow-300' : 'text-white'}`}>
            {displayName}
          </h4>
        </div>
        {results && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              <span className="text-white font-semibold">{results.kills}</span> kills
            </span>
            <span className={`font-bold ${isWinner ? 'text-yellow-300' : 'text-blue-400'}`}>
              {results.score.toLocaleString()} pts
            </span>
          </div>
        )}
      </div>

      {/* Players */}
      <div className="px-3 py-2 space-y-1.5 min-h-[60px]">
        {teamData.playerIds.length === 0 && (
          <p className="text-xs text-gray-600 italic text-center py-2">No players</p>
        )}
        {teamData.playerIds.map((pId) => {
          const player = room.players?.[pId];
          const isMe = pId === localPlayerId;
          const isReady = player?.isReady ?? false;
          const displayN = player?.name ?? pId;

          return (
            <div
              key={pId}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                showReadyState && isReady ? 'bg-green-500/10 border border-green-500/20' : 'bg-black/20'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${showReadyState && isReady ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className={`truncate ${isMe ? 'text-blue-400 font-semibold' : 'text-gray-300'}`}>
                  {displayN}
                  {isMe && ' (you)'}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {playerResults && (
                  <div className="text-xs font-mono text-gray-400 flex gap-3">
                    <span>{playerResults[pId]?.kills || 0} K</span>
                    <span className="text-blue-300">{(playerResults[pId]?.score || 0).toLocaleString()} pts</span>
                  </div>
                )}
                {showReadyState && (
                  <span className={`text-xs font-bold shrink-0 ${isReady ? 'text-green-400' : 'text-gray-600'}`}>
                    {isReady ? 'READY' : 'NOT READY'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RoundEndOverlay() {
  const room = useSelector(selectRoom);
  const localPlayerId = useSelector((state: RootState) => state.localPlayer.id);
  const localPlayerIsReady = useSelector((state: RootState) => state.localPlayer.isReady);
  const roundResults = useSelector((state: RootState) => state.room.roundResults);
  const matchResults = useSelector((state: RootState) => state.room.matchResults);
  const { setReadyState } = useRoomSync();
  const dispatch = useDispatch();
  const [showingMatchResults, setShowingMatchResults] = useState(false);

  if (!room) return <div className="text-white">Loading room...</div>;
  if (room.status !== 'round_ended' && room.status !== 'match_ended') return null;

  const isHost = room.hostId === localPlayerId;
  const isMatchEnded = room.status === 'match_ended';

  const currentResults = showingMatchResults ? matchResults : roundResults;

  const titleText = currentResults?.winner
    ? `Team ${currentResults.winner.replace('team-', '')} Wins ${showingMatchResults ? 'the Match' : 'the Round'}!`
    : showingMatchResults ? 'Match Complete!' : 'Round Complete!';

  const players = room.players || {};
  const teams = room.teams || {};
  const teamResults = currentResults?.teamResults || {};

  // Compute all players ready (for host button)
  const allPlayersReady = Object.values(players).every(p => p.isReady);
  const playerCount = Object.values(players).length;
  const readyCount = Object.values(players).filter(p => p.isReady).length;

  const sortedTeams = currentResults
    ? Object.entries(teamResults).sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0))
    : Object.entries(teams).map(([id]) => [id, { score: 0, kills: 0 }] as [string, { score: number; kills: number }]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--color-bg-base)]/95 overflow-y-auto animate-slide-up">
      <div className="flex flex-col gap-6 p-8 card-base w-full max-w-4xl m-auto text-white">
      <div className="w-full">

        {/* Header */}
        <div className="text-center mb-6">
            {isMatchEnded ? 'MATCH COMPLETE' : `Round ${room.currentRound} of ${room.settings.roundsPerMatch}`}
          <h2 className="text-4xl font-extrabold font-display text-[var(--color-text-primary)] mb-1">
            {showingMatchResults ? 'Match Results' : 'Round Results'}
          </h2>
          <p 
            className="text-2xl font-bold font-display"
            style={{
              color: currentResults?.winner ? `var(--color-${currentResults.winner})` : 'var(--color-text-secondary)',
              textShadow: currentResults?.winner ? `0 0 16px var(--color-${currentResults.winner})` : 'none'
            }}
          >
            {titleText}
          </p>
        </div>

        {/* Score Table */}
        {roundResults && (
          <div className="mb-5 rounded-xl overflow-hidden border border-white/10 bg-black/40">
            <div className="px-4 py-2 bg-white/5 border-b border-white/5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                {showingMatchResults ? 'Match Results' : 'Round Results'}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Team</th>
                  <th className="px-4 py-2 text-right">Kills</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedTeams.map(([teamId, stats], idx) => (
                  <tr
                    key={teamId}
                    className={`transition-colors ${
                      teamId === currentResults?.winner
                        ? 'bg-yellow-400/10 text-yellow-200'
                        : 'text-gray-300'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium capitalize">
                      {teamId === currentResults?.winner && <span className="mr-2 text-[10px] font-bold bg-yellow-400/20 text-yellow-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Win</span>}
                      {teamId.replace('-', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right">{stats.kills}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-400">{stats.score.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500 font-mono">#{idx + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Team Cards (Always show to display players) */}
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-400 font-medium">
              {!isMatchEnded ? 'Ready to play next round?' : 'Team Rosters & Stats'}
            </p>
            {!isMatchEnded && (
              <span className="text-sm font-semibold text-white">
                {readyCount}/{playerCount} ready
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {Object.entries(teams).map(([teamId, teamData]) => (
              <TeamCard
                key={teamId}
                teamId={teamId}
                teamData={teamData}
                room={room}
                localPlayerId={localPlayerId}
                results={currentResults?.teamResults?.[teamId]}
                isWinner={teamId === currentResults?.winner}
                playerResults={currentResults?.playerResults}
                showReadyState={!isMatchEnded}
              />
            ))}
          </div>

          {/* Ready Button (Only show if not match ended) */}
          {!isMatchEnded && (
            <button
              onClick={() => {
                const newReady = !localPlayerIsReady;
                dispatch(setReady(newReady));
                setReadyState(newReady);
              }}
              className={`w-full py-3 rounded-xl font-bold text-white text-base transition-all mb-3 cursor-pointer ${
                localPlayerIsReady
                  ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'
                  : 'bg-gray-700 hover:bg-gray-600 border border-white/10'
              }`}
            >
              {localPlayerIsReady ? 'Ready! (click to unready)' : 'Click to Ready Up'}
            </button>
          )}
        </>

        {/* Action Buttons */}
        {isMatchEnded && !showingMatchResults ? (
          <button
            onClick={() => setShowingMatchResults(true)}
            className="w-full btn-primary py-4 text-xl"
          >
            View Match Results
          </button>
        ) : isHost ? (
          <button
            onClick={() => {
              if (isMatchEnded) {
                socket.emit('round:returnLobby', {});
              } else {
                socket.emit('round:start', {});
              }
            }}
            disabled={!isMatchEnded && !allPlayersReady}
            className="w-full py-4 text-xl btn-primary cursor-pointer"
          >
            {isMatchEnded
              ? 'Return to Lobby'
              : allPlayersReady
              ? 'Start Next Round'
              : `Waiting for players... (${readyCount}/${playerCount} ready)`}
          </button>
        ) : (
          <div className="py-4 bg-black/20 rounded-xl border border-[var(--color-border-default)] text-center">
            <p className="text-[var(--color-text-secondary)] text-sm animate-pulse font-bold tracking-wide">
              {isMatchEnded
                ? 'Waiting for host to return to lobby...'
                : allPlayersReady
                ? 'All ready — waiting for host to start...'
                : `Waiting for all players to ready up (${readyCount}/${playerCount})...`}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
