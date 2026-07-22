import { RoomSimulation } from './RoomSimulation';

const rooms = new Map<string, RoomSimulation>();

/** Reverse index: socketId → roomCode for O(1) lookup */
const socketToRoom = new Map<string, string>();

export function getRoom(code: string): RoomSimulation | undefined {
  return rooms.get(code);
}

export function setRoom(code: string, room: RoomSimulation) {
  rooms.set(code, room);
}

export function deleteRoom(code: string) {
  rooms.delete(code);
}

/** Register a socket → room mapping for O(1) lookups */
export function registerSocket(socketId: string, roomCode: string) {
  socketToRoom.set(socketId, roomCode);
}

/** Unregister a socket when it disconnects or leaves */
export function unregisterSocket(socketId: string) {
  socketToRoom.delete(socketId);
}

/** Find which room a given socket is currently in — O(1) via reverse index */
export function getRoomBySocketId(socketId: string): RoomSimulation | undefined {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : undefined;
}
