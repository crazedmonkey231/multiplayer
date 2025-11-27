const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files (client) from /public
app.use(express.static(path.join(__dirname, "../public")));

const players = {}; // { socketId: { x, y, name? } }

// When a client connects
io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  // Create a player for this socket
  players[socket.id] = {
    x: Math.random() * 800,
    y: Math.random() * 600,
  };

  // Send current players to the new client
  socket.emit("currentPlayers", players);

  // Notify others about the new player
  socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

  // Receive input from this client
  socket.on("playerInput", (input) => {
    // Basic movement server-side
    const speed = 5;
    const player = players[socket.id];
    if (!player) return;

    if (input.left) player.x -= speed;
    if (input.right) player.x += speed;
    if (input.up) player.y -= speed;
    if (input.down) player.y += speed;
  });

  // Receive more complex state updates from this client
  socket.on("playerStateUpdate", (state) => {
    const player = players[socket.id];
    if (!player) return;
    // Here you could process more complex state updates
    // For now, we just log it
    console.log(`Received state update from ${socket.id}:`, state);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

// Broadcast game state at fixed intervals
setInterval(() => {
  io.emit("stateUpdate", players);
}, 1000 / 20); // 20 times per second

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
