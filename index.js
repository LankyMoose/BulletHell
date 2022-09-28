import {
  menu,
  startButton,
  scoreEl,
  menuScoreEl,
  killsEl,
  menuKillsEl,
  canvas,
  c,
  x,
  y,
  animId,
  setAnimId,
  bullets,
  removeBullet,
  clearBullets,
  enemies,
  clearEnemies,
  removeEnemy,
  particles,
  addParticle,
  removeParticle,
  clearParticles,
  items,
  removeItem,
  clearItems,
  score,
  addScore,
  resetScore,
  heatBarEl,
  xpBarEl,
  set_x,
  set_y,
  lvlEl,
  XP_PER_KILL,
  XP_REQ_MULTI_PER_LEVEL,
  levelUpScreen,
  levelUpOptionsEl,
  pauseScreen,
  playerStatsEl,
  PLAYER_STAT_DISPLAYS,
  addDamageText,
  damageTexts,
  removeDamageText,
  lifeEl,
} from './constants.js';

import {
  Player,
  player,
  Enemy,
  Particle,
  Item,
  BonusSet,
  DamageText,
} from './lib.js';

let playerShootTimer;
let enemySpawnInterval;
let enemySpawnTime = 1000;
let gameRunning = false;
let levelUpScreenShowing = false;

let nextFrameActionQueue = [];

function main() {
  setAnimId(requestAnimationFrame(main));
  //c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = 'rgba(50, 50, 50, 1)';
  c.fillRect(0, 0, canvas.width, canvas.height);

  if (nextFrameActionQueue.length > 0) {
    nextFrameActionQueue.forEach((action) => action());
    nextFrameActionQueue = [];
  }

  player.update();

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    b.update();

    const offscreenX = b.x - b.r < 0 || b.x + b.r > canvas.width;
    const offscreenY = b.y - b.r < 0 || b.y + b.r > canvas.height;
    if (offscreenX || offscreenY) {
      setTimeout(() => {
        removeBullet(i);
      }, 0);
    }
  }
  // investigate pooling?
  const enemiesToRemove = [];
  const bulletsToRemove = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist - e.r - player.r < 0.1) {
      player.life -= 10;
      renderPlayerLife();
      if (player.life <= 0) {
        endGame();
      } else {
        console.log('player took dmg', player.life);
        player.vel.x *= e.vel.x * 3;
        player.vel.y *= e.vel.y * 3;
      }
    }
    e.update();
    const num_bullets = bullets.length;
    for (let j = 0; j < num_bullets; j++) {
      const b = bullets[j];
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist - e.r - b.r < 1) {
        addScore(100);
        scoreEl.innerText = score;

        for (let k = 0; k < e.r * 15; k++) {
          addParticle(
            new Particle(b.x, b.y, Math.random() * 2, 'darkred', {
              x: (Math.random() - 0.5) * (Math.random() * (2 + e.r / 6)),
              y: (Math.random() - 0.5) * (Math.random() * (2 + e.r / 6)),
            })
          );
        }
        let isCrit = false;
        if (player.critChance > 0) {
          isCrit = player.critChance / 100 > Math.random();
        }
        const damage = Math.floor(
          isCrit ? player.damage * player.critDamageMulti : player.damage
        );

        addDamageText(new DamageText(b.x, b.y, damage, isCrit));
        bulletsToRemove.push(j);
        if (e.r - damage > Enemy.minSize) {
          e.r -= damage;
        } else {
          enemiesToRemove.push(i);

          nextFrameActionQueue.push(() => {
            player.xp += XP_PER_KILL * player.xpMulti;
            if (player.xp >= player.next_level) {
              player.level++;
              player.next_level *= XP_REQ_MULTI_PER_LEVEL;
              player.onLevelUp();
              pauseGame();
              showLevelUpScreen();
            }

            addScore(e.killValue);
            player.kills++;
            player.heat += 5;

            handleProgression();
          });
        }
      }
    }
  }
  for (let index of enemiesToRemove) {
    removeEnemy(index);
  }
  for (let index of bulletsToRemove) {
    removeBullet(index);
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.update();
    if (p.alpha <= 0) removeParticle(i);
  }
  for (let i = 0; i < damageTexts.length; i++) {
    const d = damageTexts[i];
    d.update();
    if (d.alpha <= 0) removeDamageText(i);
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dist = Math.hypot(player.x - item.x, player.y - item.y);
    if (dist - item.r - player.r < 1) {
      player.items.push({ ...item.itemType });
      return removeItem(i, 1);
    }

    item.update();
    if (item.i > 540) {
      removeItem(i, 1);
    }
  }

  player.heat -= 0.025;
  if (player.heat < 0) player.heat = 0;
  heatBarEl.value = player.heat;
}

function handleProgression() {
  scoreEl.innerText = score;
  killsEl.innerText = player.kills;

  if (player.kills % 20 == 0) {
    enemySpawnTime -= 5;
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(Enemy.spawn, enemySpawnTime);
  }
  if (player.kills % 5 == 0 && items.length <= 4) {
    Item.spawn();
  }
  if (player.heat >= player.maxHeat) {
    for (let i = 0; i < player.level / 2; i++) {
      Enemy.spawn();
    }
    player.heat = 0;
  }
  heatBarEl.value = player.heat;
  xpBarEl.value = (player.xp / player.next_level) * 100;
  lvlEl.innerHTML = player.level;
}

function startGame() {
  gameRunning = true;
  menu.classList.add('hide');
  clearBullets();
  clearEnemies();
  clearParticles();
  clearItems();
  enemySpawnInterval = setInterval(Enemy.spawn, enemySpawnTime);
  main();
  attachEventHandlers();
  setShootInterval();
  renderPlayerStats();
}

function togglePause() {
  if (levelUpScreenShowing) return;
  if (gameRunning) {
    pauseScreen.classList.remove('hide');
    return pauseGame();
  }
  pauseScreen.classList.add('hide');
  resumeGame();
}

function pauseGame() {
  gameRunning = false;
  Object.assign(player.inputs, new Player().inputs);
  clearInterval(enemySpawnInterval);
  cancelAnimationFrame(animId);
  setAnimId(null);
}

function renderPlayerStats() {
  playerStatsEl.innerHTML = '';
  Object.entries(player).forEach(([k, v]) => {
    const displayKey = PLAYER_STAT_DISPLAYS.find((item) => item.key == k);
    if (!displayKey) return;
    playerStatsEl.innerHTML += `<p>${displayKey.displayText}: ${v}</p>`;
  });
}

function resumeGame() {
  gameRunning = true;
  enemySpawnInterval = setInterval(Enemy.spawn, enemySpawnTime);
  main();
}

function endGame() {
  gameRunning = false;
  menu.classList.remove('hide');
  menuScoreEl.innerText = score;
  scoreEl.innerText = 0;
  resetScore();
  menuKillsEl.innerText = player.kills;
  killsEl.innerText = 0;
  player.resetProgression();
  player.reset();
  renderPlayerLife();
  heatBarEl.value = 0;
  xpBarEl.value = 0;
  lvlEl.innerHTML = 1;
  clearShootInterval();
  clearInterval(enemySpawnInterval);
  enemySpawnInterval = null;
  enemySpawnTime = 1000;
  cancelAnimationFrame(animId);
  setAnimId(null);
  removeEventHandlers();
}

window.renderPlayerLife = function () {
  lifeEl.innerText = `${player.life}/${player.maxLife}`;
};

function hideLevelUpScreen() {
  levelUpScreenShowing = false;
  levelUpOptionsEl.innerHTML = '';
  levelUpScreen.classList.add('hide');
}
function showLevelUpScreen() {
  levelUpScreenShowing = true;
  levelUpScreen.classList.remove('hide');
  const bonusSet = new BonusSet();
  levelUpOptionsEl.innerHTML = '';
  bonusSet.items.forEach((b) => {
    const btn = Object.assign(document.createElement('button'), {
      type: 'button',
      innerHTML: b.name,
      onclick: () => {
        onBonusSelected(b);
      },
    });
    btn.dataset.rarity = b.rarity;
    levelUpOptionsEl.appendChild(btn);
  });
}

function onBonusSelected(bonus) {
  console.log('bonus selected', bonus);
  bonus.modifiers.forEach((m) => {
    //console.log(`gained ${m.key}: ${m.amounts[bonus.rarity]}`);
    //console.log(`prev value: ${player[m.key]}`);
    const amount = m.amounts[bonus.rarity];
    player[m.key] += amount;
    //console.log(`new value: ${player[m.key]}`);
    if (m.triggers) {
      m.triggers.forEach((t) => t(player, amount));
    }
  });
  renderPlayerStats();
  hideLevelUpScreen();
  resumeGame();
}

function attachEventHandlers() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}
function removeEventHandlers() {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
}

function handleKeyDown(e) {
  switch (e.key.toLowerCase()) {
    case 'escape':
      togglePause();
      break;
    case 'a':
      player.inputs.left = true;
      break;
    case 'd':
      player.inputs.right = true;
      break;
    case 'w':
      player.inputs.up = true;
      break;
    case 's':
      player.inputs.down = true;
    default:
      break;
  }
}

function handleKeyUp(e) {
  switch (e.key) {
    case 'a':
      player.inputs.left = false;
      break;
    case 'd':
      player.inputs.right = false;
      break;
    case 'w':
      player.inputs.up = false;
      break;
    case 's':
      player.inputs.down = false;
    default:
      break;
  }
}

startButton.addEventListener('click', () => {
  startGame();
});

let lastMouseMove;
document.addEventListener('mousemove', (e) => (lastMouseMove = e));

window.clearShootInterval = function () {
  clearInterval(playerShootTimer);
};
window.setShootInterval = function () {
  playerShootTimer = setInterval(() => {
    if (lastMouseMove) Player.shoot(lastMouseMove);
  }, player.shootSpeed);
};

addEventListener('resize', () => {
  const old = { x, y };
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  set_x(canvas.width / 2);
  set_y(canvas.height / 2);
  [...enemies, ...bullets].forEach((el) => {
    el.x += x - old.x;
    el.y += y - old.y;
  });

  player.x = x;
  player.y = y;
});
