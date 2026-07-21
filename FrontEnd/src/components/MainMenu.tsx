import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLocalPlayer } from '../store/selectors';
import { setName } from '../store/localPlayerSlice';
import { useRoomSync } from '../hooks/useRoomSync';

export function MainMenu() {
  const dispatch = useDispatch();
  const localPlayer = useSelector(selectLocalPlayer);
  const [joinCode, setJoinCode] = useState('');
  const { createRoom, joinRoom } = useRoomSync();

  const handleCreateRoom = () => {
    createRoom(localPlayer.name);
  };

  const handleJoinRoom = () => {
    if (!joinCode) return;
    joinRoom(joinCode, localPlayer.name);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md mx-auto mt-20">
      <h2 className="text-3xl font-bold text-white mb-4">Join or Create Room</h2>
      
      <div className="w-full space-y-2">
        <label className="text-sm text-gray-400 font-medium">Your Name</label>
        <input 
          type="text" 
          value={localPlayer.name}
          onChange={(e) => dispatch(setName(e.target.value))}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white outline-none focus:border-game-accent"
          placeholder="Enter your name"
        />
      </div>

      <div className="w-full h-px bg-gray-700 my-2"></div>

      <button 
        onClick={handleCreateRoom}
        className="w-full bg-game-accent hover:bg-game-accent-glow text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Create New Room
      </button>

      <div className="w-full h-px bg-gray-700 my-2"></div>

      <div className="w-full space-y-3 flex flex-col">
        <input 
          type="text" 
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white outline-none focus:border-game-accent text-center text-xl tracking-widest font-mono uppercase"
          placeholder="ROOM CODE"
          maxLength={4}
        />
        <button 
          onClick={handleJoinRoom}
          disabled={joinCode.length !== 4}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
