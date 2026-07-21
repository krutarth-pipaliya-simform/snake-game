import { RoomSimulation } from './RoomSimulation';

const rooms = new Map<string, RoomSimulation>();

export function getRoom(code: string): RoomSimulation | undefined {
  return rooms.get(code);
}

export function setRoom(code: string, room: RoomSimulation) {
  rooms.set(code, room);
}

export function deleteRoom(code: string) {
  rooms.delete(code);
}

/** Find which room a given socket is currently in */
export function getRoomBySocketId(socketId: string): RoomSimulation | undefined {
  for (const room of rooms.values()) {
    for (const p of Object.values(room.players)) {
      if (p.socketId === socketId) return room;
    }
  }
  return undefined;
}
