import {
  Player,
  player,
  Enemy,
  Particle,
  Item,
  BonusSet,
  DamageText,
  resetPlayer,
} from './lib.js';

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
  abilityEffects,
  removeAbilityEffect,
  ITEM_TYPES,
  clearAnimId,
  playerColorEl,
  submitScoreDiv,
  submitScoreButton,
  leaderboard,
} from './constants.js';

import { detectCollision, radians_to_degrees, rotate } from './util.js';
import { loadScores, submitScore } from './firebase.js';
//import {  } from './util.js';

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
    let enemyDestroyed = false;
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist - e.r - player.r < 0.01) {
      player.life -= 3;
      renderPlayerLife();
      if (player.life <= 0) {
        return endGame();
      } else {
        player.vel.x += e.vel.x * 3;
        player.vel.y += e.vel.y * 3;
        // if (player.vel.x == 0) {

        // } else {
        //   player.vel.x *= e.vel.x * 3;
        // }
        // if (player.vel.y == 0) {
        //   player.vel.y += e.vel.y * 3;
        // } else {
        //   player.vel.y *= e.vel.y * 3;
        // }
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
          enemyDestroyed = true;
        }
      }
    }
    for (let j = 0; j < abilityEffects.length; j++) {
      const ae = abilityEffects[j];
      if (ae.shapeType == 'square') {
        const angle = radians_to_degrees(ae.angle);
        const rotatedEnemyCoords = rotate(
          player.x,
          player.y,
          e.x,
          e.y,
          angle,
          true
        );
        const projectedEnemy = {
          x: rotatedEnemyCoords.x,
          y: rotatedEnemyCoords.y,
          r: e.r,
        };
        if (detectCollision(ae, projectedEnemy)) {
          let isCrit = false;
          if (player.critChance > 0) {
            isCrit = player.critChance / 100 > Math.random();
          }
          const damage = Math.floor(
            isCrit ? player.damage * player.critDamageMulti : player.damage
          );
          addDamageText(new DamageText(e.x, e.y, damage, isCrit));
          if (e.r - damage > Enemy.minSize) {
            e.r -= damage;
          } else {
            enemyDestroyed = true;
          }
        }
      } else {
        const dist = Math.hypot(ae.x - e.x, ae.y - e.y);
        if (dist - e.r - ae.r < 1) {
          let isCrit = false;
          if (player.critChance > 0) {
            isCrit = player.critChance / 100 > Math.random();
          }
          const damage = Math.floor(
            isCrit ? player.damage * player.critDamageMulti : player.damage
          );
          addDamageText(new DamageText(e.x, e.y, damage, isCrit));
          if (e.r - damage > Enemy.minSize) {
            e.r -= damage;
          } else {
            enemyDestroyed = true;
          }
        }
      }
    }

    if (enemyDestroyed) {
      enemiesToRemove.push(i);

      nextFrameActionQueue.push(() => {
        player.xp += XP_PER_KILL + e.r * player.xpMulti;
        if (player.xp >= player.next_level) {
          player.level++;
          player.next_level *= XP_REQ_MULTI_PER_LEVEL;
          player.onLevelUp();
          pauseGame();
          showLevelUpScreen();
        }

        addScore(e.killValue);
        player.kills++;
        player.heat += 5 - Math.log(5);
        handleProgression();
      });
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

  for (let i = 0; i < abilityEffects.length; i++) {
    const ae = abilityEffects[i];
    ae.update();
    if (ae.remainingFrames <= 0) removeAbilityEffect(i);
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
    window.clearInterval(enemySpawnInterval);
    enemySpawnInterval = window.setInterval(Enemy.spawn, enemySpawnTime);
  }
  if (player.kills % 10 == 0 && items.length <= 2) {
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
  if (gameRunning) return false;
  resetScore();
  submitScoreDiv.style.display = 'none';
  submitScoreButton.setAttribute('disabled', '');

  gameRunning = true;
  menu.classList.add('hide');
  clearBullets();
  clearEnemies();
  clearParticles();
  clearItems();
  enemySpawnInterval = window.setInterval(Enemy.spawn, enemySpawnTime);
  player.color = playerColorEl.value;
  main();
  attachEventHandlers();
  window.setShootInterval();
  player.startAbilityCooldowns();
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
  clearAnimId();
  window.clearInterval(enemySpawnInterval);
  window.clearShootInterval();
  gameRunning = false;
  Object.assign(player.inputs, new Player().inputs);
  player.stopAbilityCooldowns();
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
  enemySpawnInterval = window.setInterval(Enemy.spawn, enemySpawnTime);
  player.startAbilityCooldowns();
  window.setShootInterval();
  main();
}

function endGame() {
  clearAnimId(animId);
  window.clearInterval(enemySpawnInterval);
  window.clearShootInterval();
  player.stopAbilityCooldowns();

  gameRunning = false;
  menu.classList.remove('hide');
  menuScoreEl.innerText = score;
  scoreEl.innerText = 0;
  menuKillsEl.innerText = player.kills;
  killsEl.innerText = 0;

  resetPlayer();
  renderPlayerLife();
  heatBarEl.value = 0;
  xpBarEl.value = 0;
  lvlEl.innerHTML = 1;
  enemySpawnInterval = null;
  enemySpawnTime = 1000;

  removeEventHandlers();

  submitScoreDiv.style.display = 'block';
  submitScoreButton.removeAttribute('disabled');
}

window.renderPlayerLife = () => {
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
    if (b.type == 'attribute') {
      btn.dataset.rarity = b.rarity;
      for (let mod of b.modifiers) {
        const amount = mod.amounts[b.rarity];
        const displayKey = PLAYER_STAT_DISPLAYS.find(
          (item) => item.key == mod.key
        );
        btn.innerHTML = `${displayKey.displayText}: ${
          amount > 0 ? `+${amount}` : amount
        }<br />`;
      }
    } else {
      btn.dataset.item = true;
    }
    levelUpOptionsEl.appendChild(btn);
  });
}

function onBonusSelected(bonus) {
  console.log('bonus selected', bonus);
  if (bonus.type == 'attribute') {
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
  } else if (bonus.type == 'ability') {
    player.items.push({ ...ITEM_TYPES.find((it) => it.name == bonus.name) });
  }
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
  let triggerResume = false;
  switch (e.key.toLowerCase()) {
    case 'space':
      return false;
    case 'escape':
      togglePause();
      break;
    case 'a':
      player.inputs.left = true;
      triggerResume = true;
      break;
    case 'd':
      player.inputs.right = true;
      triggerResume = true;
      break;
    case 'w':
      player.inputs.up = true;
      triggerResume = true;
      break;
    case 's':
      player.inputs.down = true;
      triggerResume = true;
      break;
    default:
      break;
  }
  if (triggerResume && !gameRunning && !levelUpScreenShowing) togglePause();
}

function handleKeyUp(e) {
  switch (e.key.toLowerCase()) {
    case 'space':
      return false;
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
      break;
    default:
      break;
  }
}

startButton.addEventListener('click', () => {
  startGame();
});

submitScoreButton.addEventListener('click', async () => {
  console.log('submitting score...');
  const res = await submitScore(score);
  if (res) alert('score submitted!');
});

document.addEventListener('mousemove', (e) => (player.lastMouseMove = e));

window.clearShootInterval = function () {
  window.clearInterval(playerShootTimer);
};
window.setShootInterval = function () {
  playerShootTimer = window.setInterval(() => {
    if (player.lastMouseMove) Player.shoot();
  }, player.shootSpeed);
};

addEventListener('resize', () => {
  const old = { x, y };
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  set_x(canvas.width / 2);
  set_y(canvas.height / 2);
  [...enemies, ...bullets, ...abilityEffects].forEach((el) => {
    el.x += x - old.x;
    el.y += y - old.y;
  });

  player.x = x;
  player.y = y;
});

async function renderLeaderboard() {
  const scores = await loadScores();
  leaderboard.innerHTML = `
    <ol>
      ${scores
        .map((entry) => {
          return `
        <li>
          ${entry.username} ${entry.score}
        </li>
        `;
        })
        .join()}
    </ol>
  `;
}

(async () => {
  renderLeaderboard();
})();
