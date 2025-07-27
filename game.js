document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Menu elements
  const menuScreen = document.getElementById('menuScreen');
  const startBtn = document.getElementById('startBtn');
  const menuMusic = document.getElementById('menuMusic');

  // Allow music to play only once user interacts with the page
  function playMenuMusic() {
    menuMusic.volume = 0.5;
    menuMusic.play().catch(() => {
      // Wait for user gesture (click) to allow autoplay
    });
  }

  // Try to play menu music on first interaction
  window.addEventListener("click", () => {
    playMenuMusic();
  }, { once: true });

  // Start button: stop music and start the game
  startBtn.addEventListener('click', () => {
    menuMusic.pause();
    menuMusic.currentTime = 0;
    menuScreen.style.display = 'none';
    canvas.style.display = 'block';
    startGame(); // Call the main game loop
  });


  // Load backgrounds
  const backgrounds = [
    'assets/background1.png',
    'assets/background2.png',
    'assets/background3.png'
  ];
  const bgImages = backgrounds.map(src => {
    const img = new Image();
    img.src = src;
    return img;
  });

  // Load images
  const ghostImg = new Image(); ghostImg.src = 'assets/ghost.png';
  const hammerImg = new Image(); hammerImg.src = 'assets/bonk.png';
  const playerImg = new Image(); playerImg.src = 'assets/chief.png';

  // Game state
  let currentLevel = 0;
  let gameWon = false;

  const player = {
    x: 50, y: 370, width: 80, height: 110,
    dx: 3, dy: 0, gravity: 0.8,
    jumping: false, onGround: true,
    health: 100, attacking: false,
    facingRight: true, invincibleTime: 0,
  };

  const ghost = {
    x: 500, y: 325, width: 160, height: 200, dx: 1, alive: true,
  };

  let ghostBullets = [];

  function spawnBullet() {
    if (currentLevel === 1 && ghost.alive) {
      ghostBullets.push({
        x: ghost.x + ghost.width / 2,
        y: ghost.y + ghost.height / 2,
        width: 10, height: 5,
        dx: player.x > ghost.x ? 4 : -4,
      });
    }
  }

  const platforms = [
    [],
    [{ x: 250, y: canvas.height - 120, width: 100, height: 40 }],
    []
  ];

  const traps = [
    [],
    [{ x: 300, y: canvas.height - 20, width: 40, height: 20 }],
    [
      { x: 250, y: canvas.height - 20, width: 50, height: 20 },
      { x: 500, y: canvas.height - 20, width: 50, height: 20 }
    ]
  ];

  const keys = {};
  document.addEventListener('keydown', e => keys[e.key] = true);
  document.addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === 'z') player.attacking = false;
  });

  function resetLevel() {
    player.x = 50; player.y = 400; player.dy = 0;
    player.onGround = true; player.attacking = false;
    player.invincibleTime = 0;
    ghost.alive = true; ghostBullets = [];

    if (currentLevel === 0) { ghost.x = 500; ghost.y = 325; ghost.dx = 1; }
    else if (currentLevel === 1) { ghost.x = 600; ghost.y = 325; ghost.dx = 2; }
    else if (currentLevel === 2) { ghost.x = 450; ghost.y = 325; ghost.dx = -2; }
  }

  function handlePlatformCollision() {
    player.onGround = false;
    platforms[currentLevel].forEach(platform => {
      const nextX = player.x + player.dx;
      const nextY = player.y + player.dy;
      const playerBottom = nextY + player.height;
      const platTop = platform.y;
      const platBottom = platform.y + platform.height;
      const platLeft = platform.x;
      const platRight = platform.x + platform.width;

      const isOverlappingX = nextX + player.width > platLeft && nextX < platRight;
      const isLanding = playerBottom > platTop && player.y + player.height <= platTop;

      if (isOverlappingX && isLanding && player.dy >= 0) {
        player.y = platTop - player.height;
        player.dy = 0;
        player.onGround = true;
      }
    });
  }

  function handleTrapCollision() {
    traps[currentLevel].forEach(t => {
      if (
        player.x + player.width > t.x &&
        player.x < t.x + t.width &&
        player.y + player.height > t.y &&
        player.y < t.y + t.height
      ) {
        player.health -= 1;
        if (player.health <= 0) {
          player.health = 0;
          alert("Game Over!");
          location.reload();
        }
      }
    });
  }

  function handleGhostCollision() {
    if (!ghost.alive || player.attacking || player.invincibleTime > 0) return;

    const touching = (
      player.x + player.width > ghost.x &&
      player.x < ghost.x + ghost.width &&
      player.y + player.height > ghost.y &&
      player.y < ghost.y + ghost.height
    );

    if (touching) {
      player.health -= 10;
      player.invincibleTime = 60;
      if (player.health <= 0) {
        alert("Game Over!");
        location.reload();
      }
    }
  }

  function handleBulletCollision() {
    ghostBullets = ghostBullets.filter(bullet => {
      const hitPlayer = (
        bullet.x < player.x + player.width &&
        bullet.x + bullet.width > player.x &&
        bullet.y < player.y + player.height &&
        bullet.y + bullet.height > player.y
      );

      if (hitPlayer) {
        player.health -= 5;
        if (player.health <= 0) {
          alert("Game Over!");
          location.reload();
        }
        return false;
      }

      const hitPlatform = platforms[currentLevel].some(p =>
        bullet.x < p.x + p.width &&
        bullet.x + bullet.width > p.x &&
        bullet.y < p.y + p.height &&
        bullet.y + bullet.height > p.y
      );

      const onScreen = bullet.x > 0 && bullet.x < canvas.width;
      return !hitPlatform && onScreen;
    });
  }

  function update() {
    if (gameWon) return;

    if (player.invincibleTime > 0) player.invincibleTime--;

    if (keys['a']) { player.x -= player.dx; player.facingRight = false; }
    if (keys['d']) { player.x += player.dx; player.facingRight = true; }
    if (keys['w'] && player.onGround) {
      player.dy = -12;
      player.onGround = false;
    }
    if (keys['z']) player.attacking = true;

    player.dy += player.gravity;
    player.y += player.dy;

    handlePlatformCollision();

    if (player.y + player.height >= canvas.height - 20) {
      player.y = canvas.height - player.height - 20;
      player.dy = 0;
      player.onGround = true;
    }

    handleTrapCollision();
    handleGhostCollision();
    handleBulletCollision();

    if (ghost.alive) {
      ghost.x += ghost.dx;
      if (ghost.x < 400 || ghost.x > 600) ghost.dx *= -1;
    }

    if (player.attacking && ghost.alive) {
      const attackRange = 40;
      const inRange = player.facingRight
        ? player.x + player.width + attackRange >= ghost.x && player.x < ghost.x
        : player.x - attackRange <= ghost.x + ghost.width && player.x > ghost.x;

      const verticallyAligned = player.y < ghost.y + ghost.height && player.y + player.height > ghost.y;

      if (inRange && verticallyAligned) {
        ghost.alive = false;
        setTimeout(() => {
          currentLevel++;
          if (currentLevel >= bgImages.length) {
            gameWon = true;
          } else {
            resetLevel();
          }
        }, 1000);
      }
    }

    ghostBullets.forEach(b => b.x += b.dx);
  }

  setInterval(() => {
    if (currentLevel === 1 && ghost.alive) spawnBullet();
  }, 2000);

  function drawHealthBar() {
    ctx.fillStyle = 'red';
    ctx.fillRect(20, 20, 100, 10);
    ctx.fillStyle = 'lime';
    ctx.fillRect(20, 20, player.health, 10);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(20, 20, 100, 10);
  }

  function drawPlatforms() {
    ctx.fillStyle = '#8B4513';
    platforms[currentLevel].forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
  }

  function drawTraps() {
    ctx.fillStyle = 'red';
    traps[currentLevel].forEach(t => ctx.fillRect(t.x, t.y, t.width, t.height));
  }

  function drawBullets() {
    ctx.fillStyle = 'purple';
    ghostBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameWon) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.fillText('You Win!', canvas.width / 2 - 100, canvas.height / 2);
      return;
    }

    ctx.drawImage(bgImages[currentLevel], 0, 0, canvas.width, canvas.height);
    drawPlatforms();
    drawTraps();
    drawBullets();

    if (player.facingRight) {
      ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(playerImg, -player.x - player.width, player.y, player.width, player.height);
      ctx.restore();
    }

    if (ghost.alive) {
      ctx.drawImage(ghostImg, ghost.x, ghost.y, ghost.width, ghost.height);
    }

    if (player.attacking) {
      const hammerWidth = 150;
      const hammerHeight = 150;
      const hammerX = player.facingRight
        ? player.x + player.width
        : player.x - hammerWidth;
      ctx.drawImage(hammerImg, hammerX, player.y - 50, hammerWidth, hammerHeight);
    }

    drawHealthBar();
    ctx.fillStyle = '#333';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Global start
  window.startGame = function () {
    resetLevel();
    loop();
  };
});
