import { RoomSimulation } from './RoomSimulation';

const rooms = new Map<string, RoomSimulation>();

export function getRoom(code: string): RoomSimulation | undefined {
  return rooms.get(code);
}

export function setRoom(code: string, room: RoomSimulation) {
  rooms.set(code, room);
}
