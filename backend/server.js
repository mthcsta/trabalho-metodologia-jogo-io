const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors'); // Importa o módulo cors

const app = express();
app.use(cors({ origin: '*' }));

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true
  }
});

const players = {};  // Certifique-se de declarar a variável players aqui


const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server is running!');
});

io.on('connection', (socket) => {
  console.log('A player connected');

  // Recebe o evento quando um jogador se conecta
  socket.on('join', (player) => {
    players[socket.id] = { position: player.position, angle: player.angle };
        
    // Informa o jogador recém-conectado sobre todos os jogadores existentes
    socket.emit('updatePlayers', players);

    // Informa a todos os jogadores sobre o novo jogador
    io.emit('updatePlayers', players);
  });

  // Recebe o evento quando um jogador move a nave
  socket.on('move', ({ position, angle, isDead }) => {
    if (players[socket.id]) {
      players[socket.id].position = position;
      players[socket.id].angle = angle;
      players[socket.id].isDead = isDead;
      io.emit('updatePlayers', players);
    }
  });

  // Recebe o evento quando um jogador atira
  socket.on('shoot', (bullet) => {
    io.emit('newBullet', bullet);
  });

  socket.on('bulletHitEnemy', (data) => {
    // Lógica para tratar o evento de tiro atingindo o inimigo
    // Aqui você pode realizar as ações necessárias quando um inimigo é atingido
    console.log(`Inimigo ${data.enemyId} foi atingido por um tiro`);

    players[data.enemyId].isDead = true; // Marca o inimigo como morto

    // Emitir um evento específico para o inimigo que foi atingido
    io.to(data.enemyId).emit('enemyHit', { message: 'Você foi atingido! FIM DE JOGO.' });
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
