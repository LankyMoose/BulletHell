window.fps = 60;
window.start = performance.now();
window.frameDuration = 1000 / window.fps;
window.animFrameDuration = window.frameDuration;
window.lag = 0;

window.requestAnimationFrame = (function () {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, window.frameDuration);
    }
  );
})();

import {
  Player,
  player,
  Enemy,
  Particle,
  Item,
  BonusSet,
  DamageText,
  resetPlayer,
  handleBonusSelection,
  resetBonusPool,
  debug,
  maxLevel,
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
  clearAnimId,
  playerColorEl,
  submitScoreDiv,
  submitScoreButton,
  leaderboard,
  playerStatsWrapper,
  userContainer,
  signInDiv,
  signInButton,
  events,
  removeEvent,
  randomEvent,
} from './constants.js';

import { rectCircleCollision, radians_to_degrees, rotate } from './util.js';
import {
  loadScores,
  login,
  logout,
  submitScore,
  userData,
} from './firebase.js';
//import {  } from './util.js';

userData.subscribe((res) => {
  renderUser(res);
});

let enemySpawnInterval;
let enemySpawnTime = 1000;
let gameRunning = false;
let levelUpScreenShowing = false;

let nextFrameActionQueue = [];

function main() {
  setAnimId(requestAnimationFrame(main));
  const now = performance.now();
  const elapsed = now - window.start;
  window.start = now;
  window.lag += elapsed;
  //c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = 'rgba(50, 50, 50, 1)';
  c.fillRect(0, 0, canvas.width, canvas.height);

  if (nextFrameActionQueue.length > 0) {
    nextFrameActionQueue.forEach((action) => action());
    nextFrameActionQueue = [];
  }

  while (window.lag >= window.frameDuration) {
    update();
    window.lag -= window.frameDuration;
  }
  render(window.lag / window.frameDuration);

  heatBarEl.value = player.heat;
}

let debugRenders = [];

function update() {
  player.update();
  if (debug) player.xp += 50 * player.xpMulti;

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    b.update();
    if (!b.inMap()) removeBullet(i);
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
      }
    }
    e.update();
    const num_bullets = bullets.length;
    for (let j = 0; j < num_bullets; j++) {
      if (enemyDestroyed) break;
      const [hit, kill] = bullets[j].handleEnemyCollision(e);
      enemyDestroyed = kill;
      if (hit) {
        addScore(100);
        scoreEl.innerText = score;
        bulletsToRemove.push(j);
      }
    }
    if (!enemyDestroyed) {
      for (let j = 0; j < abilityEffects.length; j++) {
        const ae = abilityEffects[j];
        const [hit, kill] = ae.handleEnemyCollision(e);
        enemyDestroyed = kill;
        //if (hit) removeBullet(j);
      }
    }

    if (enemyDestroyed) {
      enemiesToRemove.push(i);
      player.xp += XP_PER_KILL + e.initialR * player.xpMulti;
      addScore(e.killValue);
      player.kills++;
      player.heat += e.r * 0.15;
      //player.heat += 30;
      handleProgression();
      if (player.xp >= player.next_level) queuePlayerLevelUp();
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dist = Math.hypot(player.x - item.x, player.y - item.y);
    if (dist - item.r - player.r < 1) {
      player.items.push({ ...item.itemType });
      removeItem(i);
      continue;
    }

    item.update();
    if (item.i > 540) {
      removeItem(i);
    }
  }
  for (let i = 0; i < abilityEffects.length; i++) {
    const ae = abilityEffects[i];
    ae.update();
    if (ae.remainingFrames <= 0) removeAbilityEffect(i);
  }
  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    if (evt.activations == 0 && evt.remainingMs <= 0) {
      removeEvent(i);
      continue;
    }
    evt.remainingMs -= window.animFrameDuration;

    if (evt.remainingMs <= 0 && evt.activations > 0) {
      evt.functions.forEach((f) => f(evt));
      if (evt.activations > 0) evt.remainingMs = evt.cooldown;
      evt.activations -= 1;
    }
  }
  for (let i = 0; i < damageTexts.length; i++) {
    const d = damageTexts[i];
    d.update();
    if (d.alpha <= 0) removeDamageText(i);
  }

  if (debug) {
    if (player.xp >= player.next_level) queuePlayerLevelUp();
    handleProgression();
  }

  player.heat -= 0.025;
  //player.heat -= 0.0;
  if (player.heat < 0) player.heat = 0;
}

function queuePlayerLevelUp() {
  if (player.level >= maxLevel) return;
  nextFrameActionQueue.push(() => {
    player.level++;
    player.next_level *= XP_REQ_MULTI_PER_LEVEL;
    player.onLevelUp();
    handleProgression();
    showLevelUpScreen();
  });
}

function render(lagOffset) {
  player.draw(lagOffset);
  for (const bullet of bullets) {
    bullet.draw(lagOffset);
  }
  for (const enemy of enemies) {
    enemy.draw(lagOffset);
  }
  for (const particle of particles) {
    particle.draw(lagOffset);
  }
  for (const item of items) {
    item.draw(lagOffset);
  }
  for (const ae of abilityEffects) {
    ae.draw(lagOffset);
  }
  for (const evt of events) {
    for (const vfx of evt.vfx) {
      vfx(evt);
    }
  }
  for (const dt of damageTexts) {
    dt.draw(lagOffset);
  }
  renderAbilityCooldowns();
  debugRenders.forEach((f) => f());
  debugRenders = [];
}

function renderAbilityCooldowns() {
  const playerAbilities = player.items.filter((i) => i.isAbility);
  for (let i = 0; i < playerAbilities.length; i++) {
    const ability = playerAbilities[i];
    const iconHeight = 24;
    const iconWidth = 60;
    const gap = 10 * i;
    let leftOffset = i * iconWidth + canvas.width / 2;
    leftOffset -= playerAbilities.length * (iconWidth / 2);
    const topOffset = iconHeight + 10;
    const curMs = ability.cooldown - ability.remainingMs;
    const percent = curMs / ability.cooldown;
    const padding = 4;
    c.save();
    c.textAlign = 'center';
    c.font = '14px sans-serif';
    c.fillStyle = ability.getColor();
    c.globalAlpha = 0.25;
    c.fillRect(leftOffset + gap, topOffset, iconWidth, iconHeight);
    c.fillRect(leftOffset + gap, topOffset, iconWidth * percent, iconHeight);
    c.globalAlpha = 1;
    c.fillStyle = 'white';
    c.fillText(
      ability.name,
      leftOffset + gap + padding + iconWidth / 2,
      topOffset + padding + 14,
      iconWidth
    );

    c.restore();
  }
}

function handleProgression() {
  scoreEl.innerText = score;
  killsEl.innerText = player.kills;

  if (player.kills % 20 == 0) {
    enemySpawnTime -= 4;
    window.clearInterval(enemySpawnInterval);
    enemySpawnInterval = window.setInterval(Enemy.spawn, enemySpawnTime);
  }
  if (!debug && player.kills % 10 == 0 && items.length <= 2) {
    Item.spawn();
  }
  if (player.heat >= player.maxHeat) {
    const newEvt = randomEvent();
    events.push({ ...newEvt });
    console.log('added event', newEvt);
    player.heat = 0;
  }
  heatBarEl.value = player.heat;
  xpBarEl.value = (player.xp / player.next_level) * 100;
  lvlEl.innerHTML = player.level;
}

function startGame() {
  if (gameRunning) return false;
  resetBonusPool();
  window.start = performance.now();
  resetScore();
  submitScoreDiv.style.display = 'none';
  signInDiv.style.display = 'none';
  submitScoreButton.setAttribute('disabled', '');
  signInButton.setAttribute('disabled', '');
  startButton.setAttribute('disabled', '');
  gameRunning = true;
  menu.classList.add('hide');
  window.document.activeElement?.blur();
  canvas.focus();
  clearBullets();
  clearEnemies();
  clearParticles();
  clearItems();
  if (debug)
    Enemy.spawn(
      {
        fixed: true,
        invulnerable: true,
        r: 50,
      },
      { x: canvas.width / 2 + 100, y: canvas.height / 2 - 100 }
    );
  enemySpawnInterval = window.setInterval(Enemy.spawn, enemySpawnTime);
  player.color = playerColorEl.value;
  main();
  attachEventHandlers();
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
  canvas.style.filter = 'blur(2px)';
  clearAnimId();
  window.clearInterval(enemySpawnInterval);
  gameRunning = false;
  Object.assign(player.inputs, new Player().inputs);
  renderPlayerStats();
}

function resumeGame() {
  canvas.style.filter = 'blur(0)';
  renderPlayerStats();
  hidePlayerStats();
  window.start = performance.now();
  gameRunning = true;
  enemySpawnInterval = window.setInterval(Enemy.spawn, enemySpawnTime);
  main();
}

function renderPlayerStats() {
  playerStatsWrapper.style.opacity = 1;
  playerStatsEl.innerHTML = '';
  Object.entries(player).forEach(([k, v]) => {
    const displayKey = PLAYER_STAT_DISPLAYS.find((item) => item.key == k);
    if (!displayKey) return;
    playerStatsEl.innerHTML += `<p>${displayKey.displayText}: ${v.toFixed(
      2
    )}</p>`;
  });
}

function hidePlayerStats() {
  playerStatsWrapper.style.opacity = 0;
}

let subData = {
  score: 0,
  kills: 0,
};

function endGame() {
  clearAnimId(animId);
  window.clearInterval(enemySpawnInterval);

  gameRunning = false;
  menu.classList.remove('hide');
  menuScoreEl.innerText = score;
  scoreEl.innerText = 0;
  menuKillsEl.innerText = player.kills;
  killsEl.innerText = 0;

  subData = {
    score,
    kills: player.kills,
  };

  resetPlayer();
  renderPlayerLife();
  heatBarEl.value = 0;
  xpBarEl.value = 0;
  lvlEl.innerHTML = 1;
  enemySpawnInterval = null;
  enemySpawnTime = 1000;

  removeEventHandlers();
  startButton.removeAttribute('disabled');
  if (userData.user) {
    submitScoreDiv.style.display = 'block';
    submitScoreButton.removeAttribute('disabled');
  } else {
    signInDiv.style.display = 'block';
    signInButton.removeAttribute('disabled');
  }

  renderLeaderboard();
}

window.renderPlayerLife = () => {
  lifeEl.innerText = `${player.life}/${player.maxLife}`;
};

function hideLevelUpScreen() {
  levelUpScreenShowing = false;
  levelUpOptionsEl.innerHTML = '';
  levelUpScreen.classList.add('hide');
  resumeGame();
}
function showLevelUpScreen() {
  pauseGame();
  levelUpScreenShowing = true;
  levelUpScreen.classList.remove('hide');
  const bonusSet = new BonusSet();
  levelUpOptionsEl.innerHTML = '';
  bonusSet.items.forEach((b) => {
    const btn = Object.assign(document.createElement('button'), {
      type: 'button',
      innerHTML: b.name + '<br />',
      onclick: () => {
        onBonusSelected(b);
      },
    });
    switch (b.type) {
      case 'attribute':
        btn.dataset.rarity = b.rarity;
        btn.innerHTML = '';
        renderBonusModifiers(btn, b);
        break;
      case 'ability':
        btn.dataset.item = true;
        btn.style.backgroundColor = b.color;
        console.log('btn color', b.color);
        break;
      case 'upgrade':
        btn.dataset.rarity = b.rarity;
        renderBonusModifiers(btn, b);
        break;
      default:
        break;
    }
    levelUpOptionsEl.appendChild(btn);
  });
}

function renderBonusModifiers(btn, bonus) {
  for (let mod of bonus.modifiers) {
    const amount = mod.amounts[bonus.rarity];
    const displayKey = PLAYER_STAT_DISPLAYS.find((item) => item.key == mod.key);
    btn.innerHTML += `${displayKey.displayText}: ${
      amount > 0 ? `+${amount.toFixed(2)}` : amount.toFixed(2)
    }<br />`;
  }
}

function onBonusSelected(bonus) {
  handleBonusSelection(bonus);
  hideLevelUpScreen();
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
      return false;
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
    case ' ':
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
  submitScoreButton.setAttribute('disabled', '');
  const success = await submitScore(subData.score, subData.kills);
  submitScoreButton.removeAttribute('disabled');
  if (success) {
    submitScoreDiv.style.display = 'none';
    alert('score submitted!');
    renderLeaderboard();
  } else {
    alert('failed to submit your score :C');
  }
});

signInButton.addEventListener('click', async () => {
  const res = await login();
  if (res) {
    signInDiv.style.display = 'none';
    signInButton.setAttribute('disabled', '');
    submitScoreDiv.style.display = 'block';
    submitScoreButton.removeAttribute('disabled');
  }
});

document.addEventListener('mousemove', (e) => (player.lastMouseMove = e));
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();
});
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
  leaderboard.innerHTML = 'Loading...';
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
        .join('')}
    </ol>
  `;
}

renderLeaderboard();

function renderUser(userData) {
  userContainer.innerHTML = '';
  if (userData.user) {
    const userDataRow = Object.assign(document.createElement('div'), {
      className: 'user-data',
    });
    userDataRow.append(
      Object.assign(document.createElement('img'), {
        src: userData.user.photoURL,
      }),
      Object.assign(document.createElement('span'), {
        innerText: userData.user.displayName,
      }),
      Object.assign(document.createElement('button'), {
        innerText: 'Log out',
        type: 'button',
        onclick: async () => {
          await logout();
          submitScoreDiv.style.display = 'none';
          submitScoreButton.setAttribute('disabled', '');
          signInDiv.style.display = 'block';
          signInButton.removeAttribute('disabled');
        },
      })
    );
    userContainer.appendChild(userDataRow);
  }
  userContainer.appendChild(
    Object.assign(document.createElement('span'), {
      innerText: `Your top score: ${userData.topScore}`,
    })
  );
}
