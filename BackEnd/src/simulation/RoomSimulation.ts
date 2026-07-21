import type { Room } from '@shared/types/room';

export class RoomSimulation {
  public state: Room;

  constructor(room: Room) {
    this.state = room;
  }
}
