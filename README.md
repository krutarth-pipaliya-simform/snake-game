# Neon Snake Battle

A modern, fast-paced, team-based multiplayer snake game built with React, Canvas, Node.js, and Socket.IO.

## Features

- **Team-based Multiplayer**: Play with your friends in teams of up to 5 players per team.
- **Neon Art Style**: Vibrant colors, dynamic glowing effects, and a highly polished UI.
- **Dynamic Items**: 
  - 🟢 **Small Pellets** (65% chance, 10 pts, +1 segment)
  - 🟡 **Medium Pellets** (28% chance, 30 pts, +2 segments)
  - 🔴 **Large Pellets** (7% chance, 75 pts, +3 segments)
- **Portals (Pipes)**: Jump across the map instantly via interconnected pipes.
- **Confusion Orb**: Secure the orb to cast a debuff on the enemy team, blinding them with Fog of War and scrambling their movement controls!
- **Smooth Networking**: 20Hz server tick rate with client-side extrapolation and ping indicator.
- **Minimap**: Track your teammates and map elements easily.

---

## Tech Stack

**Frontend:**
- React (Vite)
- Redux Toolkit (State Management)
- HTML5 Canvas (Rendering)
- Socket.IO-Client (Networking)

**Backend:**
- Node.js & Express
- Socket.IO (Server-authoritative game simulation)
- Prisma & PostgreSQL (Durability and stats)

---

## How to Play Locally

Follow these steps to run the game on your own machine.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- (Optional) PostgreSQL database if you want match history to persist. The game will still run without it (falling back to in-memory state).

### 1. Setup the Backend
Open a terminal and navigate to the `BackEnd` directory:
```bash
cd BackEnd
```

Install the dependencies:
```bash
npm install
```

*(Optional)* Set up the database:
1. Create a `.env` file in the `BackEnd` folder.
2. Add your Postgres connection string: `DATABASE_URL="postgresql://user:password@localhost:5432/snake"`
3. Run `npm run db:push` to sync the schema.

Build the shared types and backend, then start the server:
```bash
npm run build
npm start
```
*You should see `[Server] Running on port 3001` in your console.*

### 2. Setup the Frontend
Open a **new** terminal and navigate to the `FrontEnd` directory:
```bash
cd FrontEnd
```

Install the dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

### 3. Play!
- Open your browser and go to `http://localhost:5173` (or the URL Vite provides).
- Share the link (if playing on a local network) or open multiple tabs to test the multiplayer mechanics.
- Create a room, share the 4-letter room code with your friends, ready up, and fight!

---

## Controls
- **Movement**: Move your mouse cursor (the snake follows it).
- **Boost**: Click and hold the Left Mouse Button (consumes tail segments).
