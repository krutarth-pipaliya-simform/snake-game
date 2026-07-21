import { RoomSimulation } from './RoomSimulation';
import type { Server } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events';

export function simulateTick(room: RoomSimulation, io: Server<ClientEvents, ServerEvents>) {
  // Stub for game loop
}
