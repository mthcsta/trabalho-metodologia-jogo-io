import Phaser from 'phaser';
import io from 'socket.io-client';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

const socket = io('http://localhost:3000'); // Altere o endereço conforme necessário

let player;
let cursors;
let bullets;

const game = new Phaser.Game(config);

function preload() {
  this.load.image('ship', 'path/to/your/spaceship.png'); // Substitua pelo caminho da sua imagem da nave
  this.load.image('bullet', 'path/to/your/bullet.png'); // Substitua pelo caminho da sua imagem do tiro
}

function create() {
  player = this.physics.add.sprite(400, 300, 'ship').setCollideWorldBounds(true);
  bullets = this.physics.add.group();

  cursors = this.input.keyboard.createCursorKeys();

  this.physics.world.setBounds(0, 0, 800, 600);

  socket.emit('join', { x: player.x, y: player.y });

  socket.on('updatePlayers', (players) => {
    Object.keys(players).forEach((id) => {
      const remotePlayer = players[id];
      if (id !== socket.id) {
        // Atualiza a posição do jogador remoto
        if (!remotePlayer.sprite) {
          remotePlayer.sprite = this.physics.add.sprite(remotePlayer.x, remotePlayer.y, 'ship');
        } else {
          remotePlayer.sprite.setPosition(remotePlayer.x, remotePlayer.y);
        }
      }
    });
  });

  socket.on('newBullet', (bullet) => {
    // Cria um novo tiro
    const newBullet = bullets.create(bullet.x, bullet.y, 'bullet');
    newBullet.setVelocity(bullet.velocityX, bullet.velocityY);
  });
}

function update() {
  if (cursors.up.isDown) {
    // Implemente a lógica para acelerar a nave para frente
    this.physics.velocityFromRotation(player.rotation, 200, player.body.velocity);
  } else {
    player.setAcceleration(0);
  }

  if (cursors.left.isDown) {
    player.setAngularVelocity(-300);
  } else if (cursors.right.isDown) {
    player.setAngularVelocity(300);
  } else {
    player.setAngularVelocity(0);
  }

  if (this.input.activePointer.isDown) {
    // Implemente a lógica para atirar quando o botão esquerdo do mouse for pressionado
    const bullet = {
      x: player.x,
      y: player.y,
      velocityX: Math.cos(player.rotation) * 500,
      velocityY: Math.sin(player.rotation) * 500
    };
    socket.emit('shoot', bullet);
  }

  // Implemente a lógica para enviar a posição da nave para o servidor
  socket.emit('move', { x: player.x, y: player.y });
}
