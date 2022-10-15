'use strict';

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
import { game, resetGame } from './state';

import { Enemy, Item, BonusSet } from './lib.js';

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
  xpBarEl,
  set_x,
  set_y,
  lvlEl,
  XP_PER_KILL,
  levelUpScreen,
  levelUpOptionsEl,
  pauseScreen,
  playerStatsEl,
  STAT_DISPLAYS,
  playerColorEl,
  submitScoreDiv,
  submitScoreButton,
  leaderboard,
  playerStatsWrapper,
  userContainer,
  signInDiv,
  signInButton,
  DEBUG_ENABLED,
  MAX_LEVEL,
} from './constants.js';

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

let levelUpScreenShowing = false;

function main() {
  game.animId.set(requestAnimationFrame(main));
  const now = performance.now();
  const elapsed = now - window.start;
  window.start = now;
  window.lag += elapsed;
  c.fillStyle = 'rgba(16, 16, 16, 1)';
  c.fillRect(0, 0, canvas.width, canvas.height);

  const nextFrameActions = game.nextFrameActionQueue.value;
  if (nextFrameActions.length > 0) {
    nextFrameActions.forEach((action) => action());
    game.nextFrameActionQueue.reset();
  }

  while (window.lag >= window.frameDuration) {
    update();
    window.lag -= window.frameDuration;
  }

  game.settings.enemies.spawnTime.set(
    game.settings.enemies.spawnTime.value - elapsed
  );
  if (game.settings.enemies.spawnTime.value <= 0) {
    Enemy.spawn();
    game.settings.enemies.spawnTime.reset();
  }

  render(window.lag / window.frameDuration);
  c.fillStyle = 'rgba(255,255,255,.6)';
  c.font = '12px sans-serif';
  c.fillText(`${elapsed}ms`, canvas.width - 50, canvas.height - 12);
}

let debugRenders = [];

function update() {
  const player = game.entities.player.value;
  if (DEBUG_ENABLED) player.xp += 50 * player.xpMulti;

  const blackHoles = game.entities.blackHoles.value;
  const blackHolesToRemove = [];
  for (let i = 0; i < blackHoles.length; i++) {
    const bh = blackHoles[i];
    bh.update();
    if (bh.remainingFrames <= 0) blackHolesToRemove.push(i);
  }
  if (blackHolesToRemove.length > 0)
    game.entities.blackHoles.remove(blackHolesToRemove);

  player.update();

  let bulletsToRemove = [];
  let bullets = game.entities.bullets.value;
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    b.update();
    if (!b.inMap()) bulletsToRemove.push(i);
  }
  if (bulletsToRemove.length > 0) {
    game.entities.bullets.remove(bulletsToRemove);
    bulletsToRemove = [];
  }
  const enemyBulletsToRemove = [];
  const enemyBullets = game.entities.enemyBullets.value;
  for (let i = 0; i < enemyBullets.length; i++) {
    const b = enemyBullets[i];
    b.update();
    if (!b.inMap()) {
      enemyBulletsToRemove.push(i);
    } else {
      const dist = Math.hypot(player.x - b.x, player.y - b.y);
      if (!player.invulnerable && dist - b.r - player.r < 0.01) {
        const [hit, kill] = b.handleEnemyCollision(player);
        if (hit) enemyBulletsToRemove.push(i);
        if (kill) return endGame();
      }
    }
  }
  if (enemyBulletsToRemove.length > 0)
    game.entities.enemyBullets.remove(enemyBulletsToRemove);

  const enemyAbilityEffectsToRemove = [];
  const enemyAbilityEffects = game.entities.enemyAbilityEffects.value;
  for (let i = 0; i < enemyAbilityEffects.length; i++) {
    const eae = enemyAbilityEffects[i];
    eae.update();
    const [hit, kill] = eae.handleEnemyCollision(player);
    if (hit && eae.destroyOnCollision) enemyAbilityEffectsToRemove.push(i);
    if (kill) return endGame();
    if (eae.remainingFrames <= 0) enemyAbilityEffectsToRemove.push(i);
  }
  if (enemyAbilityEffectsToRemove.length > 0)
    game.entities.enemyAbilityEffects.remove(enemyAbilityEffectsToRemove);

  // investigate pooling?
  const enemiesToRemove = [];
  bulletsToRemove = [];
  const abilitiesToRemove = [];
  const enemies = game.entities.enemies.value;
  const abilityEffects = game.entities.abilityEffects.value;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    e.update();
    let enemyDestroyed = false;
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (!player.invulnerable && dist - e.r - player.r < 0.01) {
      player.life -= Math.floor(e.damage - e.damage * player.damageReduction);
      if (player.life <= 0) {
        return endGame();
      } else {
        player.vel.x += e.vel.x * 3;
        player.vel.y += e.vel.y * 3;
      }
    }
    let bullets = game.entities.bullets.value;
    const num_bullets = bullets.length;
    for (let j = 0; j < num_bullets; j++) {
      if (enemyDestroyed) break;
      const [hit, kill] = bullets[j].handleEnemyCollision(e);
      enemyDestroyed = kill;
      if (hit) {
        //debugger;
        game.score.add(100);
        scoreEl.innerText = game.score.value;
        bulletsToRemove.push(j);
      }
    }
    if (!enemyDestroyed) {
      for (let j = 0; j < abilityEffects.length; j++) {
        const ae = abilityEffects[j];
        const [hit, kill] = ae.handleEnemyCollision(e);
        enemyDestroyed = kill;
        if (hit && ae.destroyOnCollision) abilitiesToRemove.push(j);
      }
    }

    if (enemyDestroyed) {
      enemiesToRemove.push(i);
      player.xp += XP_PER_KILL + e.initialR * player.xpMulti;
      game.score.add(e.killValue);
      player.onKill();
      handleProgression();
      if (player.xp >= player.next_level) queuePlayerLevelUp();
    }
  }
  if (enemiesToRemove.length > 0) game.entities.enemies.remove(enemiesToRemove);
  if (bulletsToRemove.length > 0) game.entities.bullets.remove(bulletsToRemove);
  if (abilitiesToRemove.length > 0)
    game.entities.abilityEffects.remove(abilitiesToRemove);

  const turrets = game.entities.turrets.value;
  for (let i = 0; i < turrets.length; i++) {
    turrets[i].update();
  }
  const particlesToRemove = [];
  const particles = game.entities.particles.value;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.update();
    if (p.alpha <= 0) particlesToRemove.push(i);
  }
  if (particlesToRemove.length > 0)
    game.entities.particles.remove(particlesToRemove);

  const itemsToRemove = [];
  const items = game.entities.items.value;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dist = Math.hypot(player.x - item.x, player.y - item.y);
    if (dist - item.r - player.r < 1) {
      player.items.push({ ...item.itemType });
      itemsToRemove.push(i);
      continue;
    }

    item.update();
    if (item.i > 540) {
      itemsToRemove.push(i);
    }
  }
  if (itemsToRemove.length > 0) game.entities.items.remove(itemsToRemove);

  const abilityEffectsToRemove = [];
  for (let i = 0; i < game.entities.abilityEffects.value.length; i++) {
    const ae = game.entities.abilityEffects.value[i];
    ae.update();
    if (ae.remainingFrames <= 0) abilityEffectsToRemove.push(i);
  }
  if (abilityEffectsToRemove.length > 0)
    game.entities.abilityEffects.remove(abilityEffectsToRemove);

  const eventsToRemove = [];
  const events = game.entities.events.value;
  for (let i = 0; i < events.length; i++) {
    try {
      const evt = events[i];
      if (!evt) throw new Error('trying to execute non-existing event');
      if (evt.activations == 0 && evt.remainingMs <= 0) {
        if (evt.onExit) {
          for (const fn of evt.onExit) {
            fn();
          }
        }
        //removeEvent(i);
        eventsToRemove.push(i);
        continue;
      }
      evt.remainingMs -= window.animFrameDuration;

      if (evt.remainingMs <= 0 && evt.activations > 0) {
        evt.functions.forEach((f) => f(evt));
        if (evt.activations > 0) evt.remainingMs = evt.cooldown;
        evt.activations -= 1;
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (eventsToRemove.length > 0) game.entities.events.remove(eventsToRemove);

  const damageTextsToRemove = [];
  const damageTexts = game.entities.damageTexts.value;
  for (let i = 0; i < damageTexts.length; i++) {
    const d = damageTexts[i];
    d.update();
    if (d.alpha <= 0) damageTextsToRemove.push(i);
  }
  if (damageTextsToRemove.length > 0)
    game.entities.damageTexts.remove(damageTextsToRemove);
}

function queuePlayerLevelUp() {
  const player = game.entities.player.value;
  if (player.level >= MAX_LEVEL) return;
  game.nextFrameActionQueue.add(() => {
    player.onLevelUp();
    handleProgression();
    showLevelUpScreen();
    game.nextFrameActionQueue.reset();
  });
}

function render(lagOffset) {
  for (const bh of game.entities.blackHoles.value) {
    bh.draw(lagOffset);
  }
  for (const bullet of game.entities.bullets.value) {
    bullet.draw(lagOffset);
  }

  game.entities.player.value.draw(lagOffset);
  renderPlayerLight();

  for (const bullet of game.entities.enemyBullets.value) {
    bullet.draw(lagOffset);
  }

  for (const enemy of game.entities.enemies.value) {
    enemy.draw(lagOffset);
  }
  for (const turret of game.entities.turrets.value) {
    turret.draw(lagOffset);
  }
  for (const particle of game.entities.particles.value) {
    particle.draw(lagOffset);
  }
  for (const item of game.entities.items.value) {
    item.draw(lagOffset);
  }
  for (const ae of game.entities.abilityEffects.value) {
    ae.draw(lagOffset);
  }
  for (const eae of game.entities.enemyAbilityEffects.value) {
    eae.draw(lagOffset);
  }
  for (const evt of game.entities.events.value) {
    if (evt.vfx)
      for (const vfx of evt.vfx) {
        vfx(evt);
      }
  }
  const lifeRenderers = game.entities.enemies.value.filter(
    (ent) => typeof ent.renderLife != 'undefined'
  );
  for (const lr of lifeRenderers) {
    lr.renderLife();
  }
  game.entities.player.value.renderLife();
  game.entities.player.value.renderDashCooldown();
  game.entities.player.value.renderAbilityCooldowns();

  for (const dt of game.entities.damageTexts.value) {
    dt.draw(lagOffset);
  }
  debugRenders.forEach((f) => f());
  debugRenders = [];
}

function renderPlayerLight() {
  const player = game.entities.player.value;
  c.save();
  c.beginPath();
  c.arc(player.x, player.y, 500, 0, 2 * Math.PI);
  const gradient1 = c.createRadialGradient(
    player.x,
    player.y,
    0,
    player.x,
    player.y,
    500
  );
  gradient1.addColorStop(0, 'rgba(255,255,255,.07)');
  gradient1.addColorStop(0.7, 'rgba(255,255,255,.02)');
  gradient1.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gradient1;
  c.fill();
  c.restore();
}

function handleProgression() {
  scoreEl.innerText = game.score.value;
  const player = game.entities.player.value;
  killsEl.innerText = player.kills;

  if (
    !DEBUG_ENABLED &&
    player.kills % 10 == 0 &&
    game.entities.items.value.length <= 2
  ) {
    Item.spawn();
  }
  xpBarEl.value = (player.xp / player.next_level) * 100;
  lvlEl.innerHTML = player.level;
}

function startGame() {
  if (game.running.value) return false;
  window.start = performance.now();
  submitScoreDiv.style.display = 'none';
  signInDiv.style.display = 'none';
  submitScoreButton.setAttribute('disabled', '');
  signInButton.setAttribute('disabled', '');
  startButton.setAttribute('disabled', '');
  menu.classList.add('hide');
  window.document.activeElement?.blur();
  canvas.focus();
  resetGame();
  game.running.set(true);
  if (DEBUG_ENABLED) {
    const newEnemy = new Enemy(
      canvas.width / 2 + 100,
      canvas.height / 2 - 100,
      50
    );
    newEnemy.fixed = true;
    newEnemy.invulnerable = true;
    game.entities.enemies.add(newEnemy);
  }
  game.entities.player.value.color = playerColorEl.value;
  main();
  attachEventHandlers();
}

function togglePause() {
  if (levelUpScreenShowing) return;
  if (game.running.value) {
    pauseScreen.classList.remove('hide');
    return pauseGame();
  }
  pauseScreen.classList.add('hide');
  resumeGame();
}

function pauseGame() {
  canvas.style.filter = 'blur(2px)';
  game.animId.reset();
  game.running.set(false);
  renderPlayerStats();
}

function resumeGame() {
  canvas.style.filter = 'blur(0)';
  renderPlayerStats();
  hidePlayerStats();
  window.start = performance.now();
  game.running.set(true);
  main();
}

function renderPlayerStats() {
  playerStatsWrapper.style.opacity = 1;
  playerStatsEl.innerHTML = '';
  Object.entries(game.entities.player.value).forEach(([k, v]) => {
    const displayKey = STAT_DISPLAYS.find((item) => item.key == k);
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
  game.entities.player.value.renderLife();
  game.animId.reset();
  game.running.set(false);
  menu.classList.remove('hide');
  menuScoreEl.innerText = game.score.value;
  scoreEl.innerText = 0;
  menuKillsEl.innerText = game.entities.player.value.kills;
  killsEl.innerText = 0;

  subData = {
    score: game.score.value,
    kills: game.entities.player.value.kills,
  };
  //resetGame();
  xpBarEl.value = 0;
  lvlEl.innerHTML = 1;

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
        break;
      case 'upgrade':
        btn.dataset.upgrade = true;
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
    const displayKey = STAT_DISPLAYS.find((item) => item.key == mod.key);
    btn.innerHTML += `${displayKey.displayText}: ${
      amount > 0 ? `+${amount.toFixed(2)}` : amount.toFixed(2)
    }<br />`;
  }
}

function onBonusSelected(bonus) {
  game.nextFrameActionQueue.reset();
  game.entities.player.value.handleBonusSelection(bonus);
  hideLevelUpScreen();
}

function attachEventHandlers() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('click', onClick);
}
function removeEventHandlers() {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  canvas.removeEventListener('click', onClick);
}

function onClick(e) {
  //addBlackHole(new BlackHole(x, y));
}

function handleKeyDown(e) {
  let triggerResume = false;
  switch (e.key.toLowerCase()) {
    case 'space':
    case ' ':
      game.entities.player.value.inputs.space = true;
      triggerResume = true;
      break;
    case 'escape':
      return togglePause();
    case 'a':
    case 'arrowleft':
      game.entities.player.value.inputs.left = true;
      triggerResume = true;
      break;
    case 'd':
    case 'arrowright':
      game.entities.player.value.inputs.right = true;
      triggerResume = true;
      break;
    case 'w':
    case 'arrowup':
      game.entities.player.value.inputs.up = true;
      triggerResume = true;
      break;
    case 's':
    case 'arrowdown':
      game.entities.player.value.inputs.down = true;
      triggerResume = true;
      break;
    default:
      break;
  }
  if (triggerResume && !game.running.value && !levelUpScreenShowing)
    togglePause();
}

function handleKeyUp(e) {
  switch (e.key.toLowerCase()) {
    case 'space':
    case ' ':
      game.entities.player.value.inputs.space = false;
      break;
    case 'a':
    case 'arrowleft':
      game.entities.player.value.inputs.left = false;
      break;
    case 'd':
    case 'arrowright':
      game.entities.player.value.inputs.right = false;
      break;
    case 'w':
    case 'arrowup':
      game.entities.player.value.inputs.up = false;
      break;
    case 's':
    case 'arrowdown':
      game.entities.player.value.inputs.down = false;
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
    subData.score = 0;
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

document.addEventListener(
  'mousemove',
  (e) => (game.entities.player.value.lastMouseMove = e)
);
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
  const { enemies, bullets, abilityEffects, player } = game.entities;
  [...enemies.value, ...bullets.value, ...abilityEffects.value].forEach(
    (el) => {
      el.x += x - old.x;
      el.y += y - old.y;
    }
  );

  player.value.x = x;
  player.value.y = y;
});

async function renderLeaderboard() {
  leaderboard.innerHTML = 'Loading...';
  const scores = await loadScores();
  const list = document.createElement('ul');
  list.append(
    ...scores.map((entry) => {
      const item = document.createElement('li');
      item.append(
        Object.assign(document.createElement('img'), {
          src: entry.profile_picture,
        }),
        Object.assign(document.createElement('span'), {
          innerText: `${entry.username} ${entry.score}`,
        })
      );
      return item;
    })
  );
  if (scores.length == 0)
    list.appendChild(
      Object.assign(document.createElement('li'), {
        innerText: 'No high scores yet 🥱',
      })
    );
  leaderboard.innerHTML = '';
  leaderboard.appendChild(list);
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
          if (subData.score > 0) {
            signInDiv.style.display = 'block';
            signInButton.removeAttribute('disabled');
          }
        },
      })
    );
    userContainer.appendChild(userDataRow);
  }
  userContainer.appendChild(
    Object.assign(document.createElement('span'), {
      innerText: `Your top score: ${userData.topScore}`,
      id: 'top-score',
    })
  );
}
