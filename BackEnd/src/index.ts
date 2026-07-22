import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { registerRoundHandlers } from './handlers/roundHandlers';
import { registerGameHandlers } from './handlers/gameHandlers';
import type { ClientEvents, ServerEvents } from '@shared/types/events';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));

const httpServer = createServer(app);
const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' },
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  registerRoomHandlers(io, socket);
  registerRoundHandlers(io, socket);
  registerGameHandlers(io, socket);

  // Ping: echo client timestamp straight back — no server clock involved
  socket.on('ping:req', ({ t }: { t: number }) => {
    socket.emit('ping:ack', { t });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

const PORT = parseInt(process.env.PORT ?? '3001');
httpServer.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
