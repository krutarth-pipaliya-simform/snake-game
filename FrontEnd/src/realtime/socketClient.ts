import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '../../../shared/types/events';

const WS_URL = import.meta.env.VITE_WS_URL ?? `http://${window.location.hostname}:3001`;

export const socket: Socket<ServerEvents, ClientEvents> = io(WS_URL, {
  autoConnect: false,
  transports: ['websocket'],
});
