const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors'); // Importa o módulo cors

const app = express();
app.use(cors({ origin: '*' }));

const players = {};

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*'
  }
});


const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server is running!');
});

io.on('connection', (socket) => {
  console.log('A player connected');

  // Recebe o evento quando um jogador se conecta
  socket.on('join', (player) => {
    players[socket.id] = player;
    io.emit('updatePlayers', players);
  });

  // Recebe o evento quando um jogador move a nave
  socket.on('move', (position) => {
    if (!players[socket.id]) return;
    players[socket.id].position = position;
    io.emit('updatePlayers', players);
  });

  // Recebe o evento quando um jogador atira
  socket.on('shoot', (bullet) => {
    io.emit('newBullet', bullet);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected');
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });

});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
