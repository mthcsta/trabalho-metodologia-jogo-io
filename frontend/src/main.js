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
let enemies;
let backgroundImage;
let scrollSpeed = 2;
const players = {}; 
const playerSprites = {}; 
let gameOver = false;

const game = new Phaser.Game(config);

function preload() {
  this.load.image('background', 'assets/space.png');
  this.load.image('ship', 'assets/ship.png'); // Substitua pelo caminho da sua imagem da nave
  this.load.image('bullet', 'assets/bullet.png'); // Substitua pelo caminho da sua imagem do tiro
}

function bulletEnemyCollisionHandler(bullet, enemy) {
  socket.emit('bulletHitEnemy', { bulletId: bullet.id, enemyId: enemy.id });
  bullet.destroy();
  enemy.destroy();
}

function create() {
  backgroundImage = this.add.tileSprite(0, 0, game.config.width, game.config.height, 'background');
  backgroundImage.setOrigin(0, 0);

  player = this.physics.add.sprite(400, 300, 'ship').setCollideWorldBounds(true);
  bullets = this.physics.add.group();
  enemies = this.physics.add.group();

  this.physics.add.collider(bullets, enemies, bulletEnemyCollisionHandler, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.physics.world.setBounds(0, 0, 800, 600);

  socket.emit('join', {
    position: {
      x: player.x, 
      y: player.y 
    },
    angle: player.angle
  });

  socket.on('updatePlayers', (updatedPlayers) => {
    Object.keys(updatedPlayers).forEach(playerId => {
      if (playerId !== socket.id) {
        const remotePlayer = updatedPlayers[playerId];
        const remotePlayerPosition = remotePlayer.position;
        const remotePlayerAngle = remotePlayer.angle;

        // Se a sprite para o jogador já existe, atualize sua posição
        if (playerSprites[playerId]) {
          playerSprites[playerId].x = remotePlayerPosition.x;
          playerSprites[playerId].y = remotePlayerPosition.y;
          playerSprites[playerId].angle = remotePlayerAngle;
        } else {
          // Se não existe, crie uma nova sprite
          playerSprites[playerId] = enemies.create(remotePlayerPosition.x, remotePlayerPosition.y, 'ship');
          playerSprites[playerId].id = playerId;
        }
    
        // Atualize as informações do jogador (isso pode incluir outras propriedades além da posição)
        players[playerId] = remotePlayer;
      }
    });
  
    // Verifique se há jogadores que não estão mais presentes e remova suas sprites
    Object.keys(playerSprites).forEach(existingPlayerId => {
      if (!updatedPlayers[existingPlayerId]) {
        // O jogador não está mais presente, remova a sprite
        playerSprites[existingPlayerId].destroy();
        delete playerSprites[existingPlayerId];
        delete players[existingPlayerId];
      }
    });
  });

  socket.on('newBullet', (bullet) => {
    // Cria um novo tiro
    const newBullet = bullets.create(bullet.x, bullet.y, 'bullet');
    newBullet.setVelocity(bullet.velocityX, bullet.velocityY);
  });

  socket.on('enemyHit', (data) => {
    // Lógica para lidar com o evento quando o inimigo é atingido
    console.log(data.message); // Exibe a mensagem recebida do servidor

    const gameOverText = this.add.text(game.config.width / 2, game.config.height / 2, 'FIM DE JOGO', { fontSize: '32px', fill: '#fff' });
    gameOverText.setOrigin(0.5);
    gameOver = true;
    player.destroy();
  });

}

function update() {
  backgroundImage.tilePositionX += scrollSpeed; 
  player.x -= scrollSpeed
  
  if (gameOver) {
    return;
  }

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
      velocityY: Math.sin(player.rotation) * 500,
      direction: player.rotation
    };
    socket.emit('shoot', bullet);
  }

  // Implemente a lógica para enviar a posição da nave para o servidor
  socket.emit('move', {
    position: { x: player.x, y: player.y },
    angle: player.angle
  });
}
