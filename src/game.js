'use strict';

import { game, resetGame } from './state';
import {
  Sprite,
  Enemy,
  Item,
  BonusSet,
  Projectile,
  Polygon,
  Vec2,
} from './lib.js';
import { Howler } from 'howler';

import {
  HTML,
  canvas,
  c,
  set_x,
  set_y,
  XP_PER_KILL,
  STAT_DISPLAYS,
  DEBUG_ENABLED,
  MAX_LEVEL,
  FONT,
  setFPS,
  BACKGROUND_RGB,
  PLAYER_COLOR,
  canvas_BG,
  canvas_UI,
  c_UI,
} from './constants.js';

import {
  loadScores,
  login,
  logout,
  submitScore,
  userData,
} from './firebase.js';

setFPS(60);
import { GAME_VOLUME, musicPlayer } from './vfx.js';

musicPlayer.play();
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
  c.globalAlpha = 1;
  c.fillStyle = `rgb(${BACKGROUND_RGB})`;
  c.fillRect(0, 0, game.width, game.height);

  c_UI.clearRect(0, 0, game.width, game.height);

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
  game.entities.enemies.value.sort(
    (a, b) => a.distanceToPlayer() - b.distanceToPlayer()
  );

  render(window.lag / window.frameDuration);
  c_UI.save();
  c_UI.fillStyle = 'rgba(255,255,255,.6)';
  c_UI.font = '12px ' + FONT;
  c_UI.fillText(
    `${Math.floor(elapsed)}ms`,
    canvas.width - 100,
    canvas.height - 100
  );
  c_UI.restore();
}

let debugRenders = [];

function update() {
  const player = game.entities.player.value;
  if (DEBUG_ENABLED) player.xp += 50 * player.xpMulti;

  game.entities.blackHoles.update();

  player.update();
  game.camera.followV2(player.ghost ? player.ghost.pos : player.pos);

  game.entities.bullets.update();

  const ebLen = game.entities.enemyBullets.length;
  for (let i = 0; i < ebLen; i++) {
    const b = game.entities.enemyBullets.value[i];
    b.update();
    if (!player.invulnerable) {
      const [hit, kill] = b.handleEnemyCollision(player);
      if (kill) {
        player.renderLife();
        if (player.rewinds == 0) return endGame();
        player.rewind();
      }
      if (hit) b.removed = true;
    }
  }
  game.entities.enemyBullets.removeFlagged();

  const eaeLen = game.entities.enemyAbilityEffects.length;
  for (let i = 0; i < eaeLen; i++) {
    const eae = game.entities.enemyAbilityEffects.value[i];
    eae.update();
    const [hit, kill] = eae.handleEnemyCollision(player);
    if (kill) {
      player.renderLife();
      if (player.rewinds == 0) return endGame();
      player.rewind();
    }
    if (hit && eae.destroyOnCollision) eae.removed = true;
  }
  game.entities.enemyAbilityEffects.removeFlagged();

  const eLen = game.entities.enemies.length;
  let aeLen = game.entities.abilityEffects.length;
  let bLen = game.entities.bullets.length;
  for (let i = 0; i < eLen; i++) {
    const e = game.entities.enemies.value[i];
    e.update();
    const [hit, kill] = Projectile.handleEnemyCollision(e, player, true);
    if (kill) {
      player.renderLife();
      if (player.rewinds == 0) return endGame();
      player.rewind();
    }
    // if (hit) {
    //   player.vel.x += e.vel.x * 3;
    //   player.vel.y += e.vel.y * 3;
    // }

    for (let j = 0; j < bLen; j++) {
      const b = game.entities.bullets.value[j];
      const [hit, kill] = b.handleEnemyCollision(e);
      e.removed = kill;
      if (hit) {
        game.score.add(100);
        HTML.scoreEl.innerText = game.score.value;
        b.removed = true;
      }
      if (e.removed) break;
    }
    if (!e.removed) {
      for (let j = 0; j < aeLen; j++) {
        const ae = game.entities.abilityEffects.value[j];
        const [hit, kill] = ae.handleEnemyCollision(e);
        if (kill) e.removed = true;
        if (hit && ae.destroyOnCollision) ae.removed = true;
        if (e.removed) break;
      }
    }

    if (e.removed) {
      player.xp += XP_PER_KILL + e.initialR * player.xpMulti;
      game.score.add(e.killValue);
      player.onKill();
      handleProgression();
      if (player.xp >= player.next_level) queuePlayerLevelUp();
    }
  }
  game.entities.bullets.removeFlagged();
  game.entities.abilityEffects.removeFlagged();
  game.entities.enemies.removeFlagged();

  game.entities.turrets.update();
  const tLen = game.entities.turrets.length;
  bLen = game.entities.bullets.length;
  aeLen = game.entities.abilityEffects.length;
  for (let i = 0; i < tLen; i++) {
    const t = game.entities.turrets.value[i];
    for (let j = 0; j < bLen; j++) {
      const b = game.entities.bullets.value[j];
      const [hit, kill] = b.handleEnemyCollision(t);
      t.removed = kill;
      if (hit) b.removed = true;
      if (t.removed) break;
    }
    if (!t.removed) {
      for (let j = 0; j < aeLen; j++) {
        const ae = game.entities.abilityEffects.value[j];
        const [hit, kill] = ae.handleEnemyCollision(t);
        if (kill) t.removed = true;
        if (hit && ae.destroyOnCollision) ae.removed = true;
        if (t.removed) break;
      }
    }
  }
  game.entities.turrets.removeFlagged();
  game.entities.particles.update();

  const iLen = game.entities.items.length;
  for (let i = 0; i < iLen; i++) {
    const item = game.entities.items.value[i];
    if (item.distanceToPlayer() - item.r - player.r < 1) {
      player.items.push({ ...item.itemType });
      item.removed = true;
      continue;
    }

    item.update();
    if (item.i > 540) {
      item.removed = true;
    }
  }
  game.entities.items.removeFlagged();
  game.entities.abilityEffects.update();
  game.entities.events.update();
  game.entities.damageTexts.update();
}

function queuePlayerLevelUp() {
  const player = game.entities.player.value;
  if (player.level >= MAX_LEVEL) return;
  game.nextFrameActionQueue.add(() => {
    player.onLevelUp();
    handleProgression();
    HTML.levelUpHeadingEl.innerText = 'Level up!';
    showLevelUpScreen();
    game.nextFrameActionQueue.reset();
  });
}

function renderBorder() {
  c.save();
  c.beginPath();
  c.fillStyle = 'transparent';
  c.strokeStyle = 'white';
  c.shadowColor = '#aaa';
  c.shadowBlur = 20;
  c.lineJoin = 'bevel';
  c.lineWidth = 15;
  const camera = game.camera;
  c.strokeRect(-camera.x, -camera.y, game.width, game.height);
  c.stroke();
  c.closePath();
  c.restore();
}

function render(lagOffset) {
  for (const enemy of game.entities.enemies.value) {
    enemy.drawShadow();
  }
  //c.drawImage(HTML.img_bg, -game.camera.x, -game.camera.y);
  renderBorder();
  for (const bh of game.entities.blackHoles.value) {
    bh.draw(lagOffset);
  }
  for (const bullet of game.entities.bullets.value) {
    bullet.draw(lagOffset);
  }

  game.entities.player.value.draw(lagOffset);
  //renderPlayerLight();

  for (const wall of game.entities.walls.value) {
    wall.drawShadow();
  }
  for (const wall of game.entities.walls.value) {
    wall.draw();
  }
  for (const bullet of game.entities.enemyBullets.value) {
    if (bullet.inView()) bullet.draw(lagOffset);
  }
  for (const enemy of game.entities.enemies.value) {
    if (enemy.inView()) enemy.draw(lagOffset);
  }
  for (const turret of game.entities.turrets.value) {
    if (turret.inView()) turret.draw(lagOffset);
  }
  for (const particle of game.entities.particles.value) {
    if (particle.inView()) particle.draw(lagOffset);
  }
  for (const item of game.entities.items.value) {
    if (item.inView()) item.draw(lagOffset);
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
  game.entities.player.value.renderGhost();
  game.entities.player.value.renderLife();
  game.entities.player.value.renderDashCooldown();
  game.entities.player.value.renderAbilityCooldowns();

  for (const dt of game.entities.damageTexts.value) {
    dt.draw(lagOffset);
  }
  debugRenders.forEach((f) => f());
  debugRenders = [];

  for (const pg of game.entities.polygons.value) {
    pg.draw();
  }
}

function renderPlayerLight() {
  const player = game.entities.player.value;
  const camera = game.camera;
  const xOffset = player.renderPos.x * camera.zoom - camera.x * camera.zoom;
  const yOffset = player.renderPos.y * camera.zoom - camera.y * camera.zoom;
  c.save();
  c.beginPath();
  c.arc(xOffset, yOffset, player.lightRadius, 0, 2 * Math.PI);
  const gradient1 = c.createRadialGradient(
    xOffset,
    yOffset,
    0,
    xOffset,
    yOffset,
    player.lightRadius
  );
  gradient1.addColorStop(0, 'rgba(255,255,255,.07)');
  gradient1.addColorStop(0.7, 'rgba(255,255,255,.02)');
  gradient1.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gradient1;
  c.fill();
  c.restore();
}

function handleProgression() {
  HTML.scoreEl.innerText = game.score.value;
  const player = game.entities.player.value;
  HTML.killsEl.innerText = player.kills;

  if (
    !DEBUG_ENABLED &&
    player.kills % 5 == 0 &&
    game.entities.items.length <= 2
  ) {
    Item.spawn();
  }
  HTML.xpBarEl.value = (player.xp / player.next_level) * 100;
  HTML.lvlEl.innerHTML = player.level;
}

function startGame() {
  if (game.running.value) return false;
  window.start = performance.now();
  HTML.submitScoreDiv.style.display = 'none';
  HTML.signInDiv.style.display = 'none';
  HTML.submitScoreButton.setAttribute('disabled', '');
  HTML.signInButton.setAttribute('disabled', '');
  HTML.startButton.setAttribute('disabled', '');
  HTML.menu.classList.add('hide');
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
  game.entities.polygons.add(new Polygon());
  //game.entities.walls.add(new Wall());
  game.entities.player.value.color = HTML.playerColorEl.value;
  main();
  attachEventHandlers();
}

function togglePause() {
  if (levelUpScreenShowing) return;
  if (game.running.value) {
    HTML.pauseScreen.classList.remove('hide');
    return pauseGame();
  }
  HTML.pauseScreen.classList.add('hide');
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
  HTML.playerStatsWrapper.style.opacity = 1;
  HTML.playerStatsEl.innerHTML = '';
  Object.entries(game.entities.player.value).forEach(([k, v]) => {
    const displayText = STAT_DISPLAYS.get(k);
    if (!displayText) return;
    HTML.playerStatsEl.innerHTML += `<p>${displayText}: ${v.toFixed(2)}</p>`;
  });
}

function hidePlayerStats() {
  HTML.playerStatsWrapper.style.opacity = 0;
}

let subData = {
  score: 0,
  kills: 0,
};

function endGame() {
  game.animId.reset();
  game.running.set(false);
  HTML.menu.classList.remove('hide');
  HTML.menuScoreEl.innerText = game.score.value;
  HTML.scoreEl.innerText = 0;
  HTML.menuKillsEl.innerText = game.entities.player.value.kills;
  HTML.killsEl.innerText = 0;
  subData = {
    score: game.score.value,
    kills: game.entities.player.value.kills,
  };
  //resetGame();
  HTML.xpBarEl.value = 0;
  HTML.lvlEl.innerHTML = 1;

  removeEventHandlers();
  HTML.startButton.removeAttribute('disabled');
  if (userData.user) {
    HTML.submitScoreDiv.style.display = 'block';
    HTML.submitScoreButton.removeAttribute('disabled');
  } else {
    HTML.signInDiv.style.display = 'block';
    HTML.signInButton.removeAttribute('disabled');
  }

  renderLeaderboard();
}

function hideLevelUpScreen() {
  levelUpScreenShowing = false;
  HTML.levelUpOptionsEl.innerHTML = '';
  HTML.levelUpScreen.classList.add('hide');
  resumeGame();
  musicPlayer.resetLowPass();
}
export function showLevelUpScreen() {
  pauseGame();
  musicPlayer.setLowPass(320);
  levelUpScreenShowing = true;
  HTML.levelUpScreen.classList.remove('hide');
  const bonusSet = new BonusSet();
  HTML.levelUpOptionsEl.innerHTML = '';
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
    HTML.levelUpOptionsEl.appendChild(btn);
  });
}

function renderBonusModifiers(btn, bonus) {
  for (const mod of bonus.modifiers) {
    const amount = mod.amounts[bonus.rarity];
    const displayText = STAT_DISPLAYS.get(mod.key);
    if (!displayText) continue;
    btn.innerHTML += `${displayText}: ${
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

HTML.startButton.addEventListener('click', () => {
  startGame();
});

HTML.submitScoreButton.addEventListener('click', async () => {
  HTML.submitScoreButton.setAttribute('disabled', '');
  const success = await submitScore(subData.score, subData.kills);
  HTML.submitScoreButton.removeAttribute('disabled');
  if (success) {
    HTML.submitScoreDiv.style.display = 'none';
    alert('score submitted!');
    renderLeaderboard();
    subData.score = 0;
  } else {
    alert('failed to submit your score :C');
  }
});

HTML.signInButton.addEventListener('click', async () => {
  const res = await login();
  if (res) {
    HTML.signInDiv.style.display = 'none';
    HTML.signInButton.setAttribute('disabled', '');
    HTML.submitScoreDiv.style.display = 'block';
    HTML.submitScoreButton.removeAttribute('disabled');
  }
});

document.addEventListener('mousemove', (e) => {
  const camera = game.camera;
  const xOffset = e.clientX * camera.zoom + camera.x * camera.zoom;
  const yOffset = e.clientY * camera.zoom + camera.y * camera.zoom;
  game.entities.player.value.lastMouseMove = new Vec2(xOffset, yOffset);
});

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();
});

addEventListener('resize', () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  canvas_BG.width = innerWidth;
  canvas_BG.height = innerHeight;
  canvas_UI.width = innerWidth;
  canvas_UI.height = innerHeight;
  set_x(canvas.width / 2);
  set_y(canvas.height / 2);
});
HTML.gameVolumeEl.addEventListener('input', (e) => {
  Howler.volume(e.target.value);
  localStorage.setItem('game_volume', e.target.value);
});
HTML.musicNextEl.addEventListener('click', () => musicPlayer.next());
HTML.musicToggleEl.addEventListener('click', () => musicPlayer.togglePlay());
HTML.musicPrevEl.addEventListener('click', () => musicPlayer.next());
HTML.playerColorEl.value = PLAYER_COLOR;
HTML.playerColorEl.addEventListener('change', (e) => {
  localStorage.setItem('player_color', e.target.value);
});

async function renderLeaderboard() {
  HTML.leaderboard.innerHTML = 'Loading...';
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
  HTML.leaderboard.innerHTML = '';
  HTML.leaderboard.appendChild(list);
}

renderLeaderboard();

function renderUser(userData) {
  HTML.userContainer.innerHTML = '';
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
          HTML.submitScoreDiv.style.display = 'none';
          HTML.submitScoreButton.setAttribute('disabled', '');
          if (subData.score > 0) {
            HTML.signInDiv.style.display = 'block';
            HTML.signInButton.removeAttribute('disabled');
          }
        },
      })
    );
    HTML.userContainer.appendChild(userDataRow);
  }
  HTML.userContainer.appendChild(
    Object.assign(document.createElement('span'), {
      innerText: `Your top score: ${userData.topScore}`,
      id: 'top-score',
    })
  );
}
