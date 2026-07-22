import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLocalPlayer } from '../store/selectors';
import { setName } from '../store/localPlayerSlice';
import { useRoomSync } from '../hooks/useRoomSync';
import { socket } from '../realtime/socketClient';

export function MainMenu() {
  const dispatch = useDispatch();
  const localPlayer = useSelector(selectLocalPlayer);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { createRoom, joinRoom } = useRoomSync();

  useEffect(() => {
    const handleErr = () => setLoading(false);
    socket.on('error', handleErr);
    return () => {
      socket.off('error', handleErr);
    };
  }, []);

  const handleCreateRoom = () => {
    setLoading(true);
    createRoom(localPlayer.name);
    setTimeout(() => setLoading(false), 5000);
  };

  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinCode || joinCode.length !== 4) return;
    setLoading(true);
    joinRoom(joinCode, localPlayer.name);
    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <div className="flex flex-col items-center gap-8 p-10 card-base w-full max-w-md mx-auto mt-20 relative overflow-hidden">
      {/* Decorative top glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70"></div>
      
      <div className="text-center w-full">
        <h1 className="text-4xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-game-accent to-purple-400 mb-2 drop-shadow-sm uppercase tracking-wider">Team Snake</h1>
        <h2 className="text-sm font-bold text-gray-400 tracking-widest uppercase">Battle Arena</h2>
      </div>
      
      <div className="w-full space-y-2">
        <label className="text-xs tracking-wider text-gray-400 font-bold uppercase">Your Identity</label>
        <input 
          type="text" 
          value={localPlayer.name}
          onChange={(e) => dispatch(setName(e.target.value))}
          className="lobby-input"
          placeholder="Enter your name"
          disabled={loading}
        />
      </div>

      <button 
        onClick={handleCreateRoom}
        disabled={loading}
        className="w-full py-4 btn-primary"
      >
        {loading ? 'INITIALIZING...' : 'CREATE NEW ARENA'}
      </button>

      <div className="w-full flex items-center gap-4 my-2 opacity-50">
        <div className="h-px bg-gray-600 flex-1"></div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Or</span>
        <div className="h-px bg-gray-600 flex-1"></div>
      </div>

      <form onSubmit={handleJoinRoom} className="w-full space-y-3 flex flex-col">
        <input 
          type="text" 
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
          className="lobby-input text-center text-2xl tracking-[0.3em] font-display uppercase font-bold"
          placeholder="CODE"
          maxLength={4}
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={joinCode.length !== 4 || loading}
          className="w-full py-3 btn-primary"
        >
          {loading ? 'LINKING...' : 'JOIN ARENA'}
        </button>
      </form>
    </div>
  );
}
