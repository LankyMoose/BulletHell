'use strict';
import {
  AbilityBoss,
  BlackHole,
  Enemy,
  ShooterBoss,
  Boomerang,
  Explode,
  Laser,
  Slash,
  Vortex,
} from './lib.js';
import { game } from './state.js';

export const canvas = document.querySelector('canvas');
export const c = canvas.getContext('2d');
canvas.width = innerWidth;
canvas.height = innerHeight;
export let x = canvas.width / 2;
export let y = canvas.height / 2;
export const set_x = (val) => (x = val);
export const set_y = (val) => (y = val);

export const XP_PER_KILL = 100;
export const XP_REQ_MULTI_PER_LEVEL = 1.25;
export const FRICTION = 0.97;
export const BULLET_COLOR = 'rgba(255,255,255,.75)';
export const BULLET_SIZE = 5;
export const ENEMY_SPEED = 0.6;
export const DEBUG_ENABLED = false;
export const MAX_LEVEL = Infinity;
//export const FONT = 'sans-serif'
export const FONT = 'monospace';
export const BACKGROUND_RGB = '18,18,18';

export const GAME_VOLUME = localStorage.getItem('game_volume') ?? 0.25;
export const PLAYER_COLOR = localStorage.getItem('player_color') ?? '#FFFFFF';

export const setFPS = (numFrames) => {
  window.fps = numFrames;
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
};
export const STAT_DISPLAYS = new Map([
  ['xpMulti', 'XP Multiplier'],
  ['speed', 'Acceleration'],
  ['bulletSpeed', 'Bullet Speed'],
  ['maxSpeed', 'Max Speed'],
  ['bulletCooldown', 'Bullet Cooldown'],
  ['damage', 'Damage'],
  ['size', 'Size'],
  ['critChance', 'Critical Chance'],
  ['critMulti', 'Critical Multiplier'],
  ['maxLife', 'Max Life'],
  ['maxInstances', 'Max Instances'],
  ['maxDistance', 'Max Distance'],
]);

export const BONUS_TYPES = [
  // {
  //   type: 'attribute',
  //   name: '+ Bullet Damage',
  //   weight: 5,
  //   rarity_weights: [9, 6, 4, 2],
  //   modifiers: [
  //     {
  //       key: 'damage',
  //       amounts: [1, 3, 5, 8],
  //     },
  //   ],
  // },
  {
    type: 'attribute',
    name: '+ Max Health',
    weight: 5,
    rarity_weights: [9, 6, 4, 2],
    modifiers: [
      {
        key: 'maxLife',
        amounts: [10, 20, 50, 80],
        triggers: [
          (player, amount) => {
            const percent = player.maxLife / amount;
            player.life += player.maxLife / percent;
          },
        ],
      },
    ],
  },
  {
    type: 'attribute',
    name: '+ Max Speed',
    weight: 5,
    rarity_weights: [9, 6, 4, 2],
    modifiers: [
      {
        key: 'maxSpeed',
        amounts: [0.15, 0.25, 0.35, 0.5],
      },
    ],
  },
  {
    type: 'attribute',
    name: '+ Bullet Speed',
    weight: 5,
    rarity_weights: [9, 6, 4, 2],
    modifiers: [
      {
        key: 'bulletSpeed',
        amounts: [1, 2, 4, 6],
      },
    ],
  },
  {
    type: 'attribute',
    name: '- Bullet Cooldown',
    weight: 5,
    rarity_weights: [9, 6, 4, 2],
    modifiers: [
      {
        key: 'bulletCooldown',
        amounts: [-12, -16, -20, -26],
      },
    ],
  },
  {
    type: 'attribute',
    name: '+ XP Multiplier',
    weight: 8,
    rarity_weights: [9, 6, 4, 2],
    modifiers: [
      {
        key: 'xpMulti',
        amounts: [0.4, 1, 2, 4],
      },
    ],
  },
  {
    type: 'attribute',
    name: '+ Critical Chance',
    weight: 5,
    rarity_weights: [9, 6, 4, 2],
    modifiers: [
      {
        key: 'critChance',
        amounts: [4, 7, 12, 18],
      },
    ],
  },
  {
    type: 'attribute',
    name: '+ Critical Multiplier',
    weight: 5,
    rarity_weights: [9, 6, 4, 2],
    modifiers: [
      {
        key: 'critMulti',
        amounts: [0.07, 0.15, 0.35, 0.5],
      },
    ],
  },
  {
    type: 'ability',
    name: 'Laser',
    weight: 10,
    //weight: 500,
  },
  {
    type: 'ability',
    name: 'Explode',
    weight: 7,
    //weight: 500,
  },
  {
    type: 'ability',
    name: 'Slash',
    weight: 10,
  },
  {
    type: 'ability',
    name: 'Vortex',
    weight: 10,
  },
  {
    type: 'ability',
    name: 'Boomerang',
    weight: 10,
  },
];
const BONUS_UPGRADES = [
  {
    type: 'upgrade',
    name: 'Slash',
    weight: 4,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'damage',
        amounts: [1, 2, 3],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Slash',
    weight: 4,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'size',
        amounts: [4, 9, 15],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Explode',
    weight: 5,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'damage',
        amounts: [1, 2, 4],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Explode',
    weight: 5,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'size',
        amounts: [8, 16, 24],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Laser',
    weight: 5,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'damage',
        amounts: [1, 2, 3],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Laser',
    weight: 5,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'size',
        amounts: [5, 12, 18],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Vortex',
    weight: 5,
    rarity_weights: [9, 2],
    modifiers: [
      {
        key: 'maxInstances',
        amounts: [1, 2],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Vortex',
    weight: 5,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'damage',
        amounts: [1, 2, 4],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Boomerang',
    weight: 5,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'maxDistance',
        amounts: [20, 40, 80],
      },
    ],
  },
  {
    type: 'upgrade',
    name: 'Boomerang',
    weight: 5,
    rarity_weights: [9, 6, 2],
    modifiers: [
      {
        key: 'damage',
        amounts: [1, 2, 3],
      },
    ],
  },
];

export const ITEM_TYPES = [
  {
    name: 'Extra Projectile',
    image: document.getElementById('img_bullet'),
    permanent: false,
    duration: 20,
    weight: 17,
    modifiers: [
      {
        key: 'bulletsFired',
        amount: 2,
      },
    ],
  },
  {
    name: 'Bullet Hell',
    image: document.getElementById('img_bullets'),
    permanent: false,
    duration: 10,
    weight: 3,
    modifiers: [
      {
        key: 'bulletsFired',
        amount: 8,
      },
    ],
  },
  {
    name: 'Bouncing Bullets',
    image: document.getElementById('img_bulletBounce'),
    permanent: false,
    duration: 30,
    weight: 8,
    modifiers: [
      {
        key: 'bulletBounce',
        amount: 1,
      },
    ],
  },
  {
    name: 'Laser',
    getColor: () => 'aqua',
    isAbility: true,
    cooldown: 4e3,
    //cooldown: 1e3,
    remainingMs: 32,
    size: 22,
    damage: 3,
    trigger: (player, self, cx, cy) => {
      game.entities.abilityEffects.add(new Laser(player, self, cx, cy));
    },
    onAdded: (bonus) => {
      game.bonuses.remove(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        game.bonuses.add(upgrade);
      }
    },
  },
  {
    name: 'Explode',
    getColor: () => 'rgba(255,255,0,.7)',
    isAbility: true,
    cooldown: 8e3,
    remainingMs: 32,
    size: 50,
    damage: 10,
    trigger: (player, self, cx, cy) => {
      game.entities.abilityEffects.add(new Explode(player, self));
    },
    onAdded: (bonus) => {
      game.bonuses.remove(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        game.bonuses.add(upgrade);
      }
    },
  },
  {
    name: 'Slash',
    getColor: () => 'rgba(255,255,255,.8)',
    isAbility: true,
    cooldown: 1.5e3,
    remainingMs: 32,
    size: 85,
    damage: 7,
    trigger: (player, self, cx, cy) => {
      game.entities.abilityEffects.add(new Slash(player, self, cx, cy));
    },
    onAdded: (bonus) => {
      game.bonuses.remove(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        game.bonuses.add(upgrade);
      }
    },
  },
  {
    name: 'Vortex',
    getColor: () => 'rgba(0, 230, 0, .7)',
    isAbility: true,
    cooldown: 4e3,
    remainingMs: 32,
    size: 8,
    damage: 20,
    maxInstances: 3,
    trigger: (player, self, cx, cy) => {
      if (
        game.entities.abilityEffects.value.filter((ae) => ae.name == 'Vortex')
          .length < self.maxInstances
      )
        game.entities.abilityEffects.add(new Vortex(player, self));
    },
    onAdded: (bonus) => {
      game.bonuses.remove(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        game.bonuses.add(upgrade);
      }
    },
  },
  {
    name: 'Boomerang',
    getColor: () => 'orange',
    isAbility: true,
    cooldown: 1800,
    remainingMs: 32,
    size: 70,
    damage: 2,
    maxDistance: 300,
    trigger: (player, self, cx, cy) => {
      game.entities.abilityEffects.add(new Boomerang(player, self, cx, cy));
    },
    onAdded: (bonus) => {
      game.bonuses.remove(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        game.bonuses.add(upgrade);
      }
    },
  },
];

export const BOSS_ITEMS = [
  // {
  //   name: 'Boomerang',
  //   getColor: () => 'red',
  //   isAbility: true,
  //   cooldown: 1800,
  //   weight: 6,
  //   remainingMs: 32,
  //   size: 70,
  //   damage: 2,
  //   maxDistance: 300,
  //   trigger: (boss, self, cx, cy) => {
  //     game.entities.enemyAbilityEffects.add(new Boomerang(boss, self, cx, cy));
  //   },
  //   onAdded: (bonus) => {},
  // },
  {
    name: 'Laser',
    getColor: () => 'red',
    isAbility: true,
    cooldown: 4e3,
    remainingMs: 2e3,
    weight: 1,
    size: 22,
    damage: 1,
    trigger: (boss, self, cx, cy) => {
      game.entities.enemyAbilityEffects.add(new Laser(boss, self, cx, cy));
    },
    onAdded: (bonus) => {},
  },
];

const renderEventName = (name) => {
  c.save();
  c.fillStyle = 'white';
  const fs = 36;
  c.font = fs + 'px ' + FONT;
  c.textAlign = 'center';
  c.fillText(name, canvas.width / 2, 100);
  c.restore();
};

export const EVENT_TYPES = [
  {
    name: 'Horde',
    type: '',
    weight: 1,
    cooldown: 2e3,
    remainingMs: 0,
    activations: 1,
    functions: [
      () => {
        const player = game.entities.player.value;
        for (let i = 0; i < player.level / 3; i++) {
          Enemy.spawnGroup(3 + Math.floor(player.level / 3));
        }
      },
    ],
    vfx: [
      (self) => {
        c.save();
        let percent = 1 - (self.remainingMs || 1) / self.cooldown;
        if (percent > 0.5) percent = 1 - percent;
        if (percent < 0) percent = 0;
        c.globalAlpha = percent * 0.3;
        c.fillStyle = 'red';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.restore();
        renderEventName('Horde!');
      },
    ],
    onExit: [],
  },
  {
    name: 'Prepare yourself!',
    type: 'transition',
    weight: 0,
    cooldown: 2e3,
    remainingMs: 0,
    activations: 1,
    functions: [
      () => {
        BlackHole.spawn();
        game.entities.player.value.invulnerable = true;
        game.settings.enemies.allowSpawn.set(false);
        game.settings.player.allowShoot.set(false);
        game.settings.player.allowAbilities.set(false);
        game.settings.player.allowDash.set(false);
        game.settings.player.allowMove.set(false);
        game.settings.player.applyMaxSpeed.set(false);
        setTimeout(() => {
          game.entities.enemies.reset();
          game.entities.bullets.reset();
          game.entities.items.reset();
        }, 1000);
      },
    ],
    vfx: [
      (self) => {
        renderEventName(self.name);
      },
    ],
    onExit: [
      () => {
        const evt = game.entities.events.random('boss');
        game.entities.events.add({ ...evt });
        game.settings.player.allowShoot.set(true);
        game.settings.player.allowAbilities.set(true);
        game.settings.player.allowDash.set(true);
        game.settings.player.allowMove.set(true);
        game.settings.player.applyMaxSpeed.set(true);
        game.entities.player.value.invulnerable = false;
      },
    ],
  },
  {
    name: `Midnight the Dastardly`,
    type: 'boss',
    weight: 5,
    cooldown: Infinity,
    remainingMs: 0,
    activations: 1,
    functions: [
      (evt) => {
        const newBoss = ShooterBoss.spawn();
        newBoss.onDeath = () => {
          evt.cooldown = 0;
          evt.remainingMs = 0;
        };
      },
    ],
    vfx: [
      (self) => {
        renderEventName(self.name);
      },
    ],
    onExit: [
      () => {
        const evt = EVENT_TYPES.find((e) => e.name == 'Enemy felled!');
        game.entities.events.add({ ...evt });
      },
    ],
  },
  {
    name: `Meganoth the Wicked`,
    type: 'boss',
    weight: 5,
    cooldown: Infinity,
    remainingMs: 0,
    activations: 1,
    remainingBosses: 1,
    functions: [
      (evt) => {
        [AbilityBoss.spawn()].forEach((boss) => {
          boss.onDeath = () => {
            evt.remainingBosses -= 1;
            if (evt.remainingBosses == 0) {
              evt.cooldown = 0;
              evt.remainingMs = 0;
            }
          };
        });
      },
    ],
    vfx: [
      (self) => {
        renderEventName(self.name);
      },
    ],
    onExit: [
      () => {
        const evt = EVENT_TYPES.find((e) => e.name == 'Enemy felled!');
        game.entities.events.add({ ...evt });
      },
    ],
  },
  {
    name: 'Enemy felled!',
    type: 'transition',
    weight: 0,
    cooldown: 2e3,
    remainingMs: 0,
    activations: 1,
    functions: [
      () => {
        BlackHole.spawn();
        game.settings.enemies.allowSpawn.set(false);
        game.settings.player.allowShoot.set(false);
        game.settings.player.allowAbilities.set(false);
        game.settings.player.allowDash.set(false);
        game.settings.player.allowMove.set(false);
        game.settings.player.applyMaxSpeed.set(false);
        game.entities.player.value.invulnerable = true;
        setTimeout(() => {
          game.entities.enemies.reset();
          game.entities.enemyBullets.reset();
          game.entities.bullets.reset();
          game.entities.items.reset();
          game.entities.turrets.reset();
        }, 1000);
      },
    ],
    vfx: [
      (self) => {
        renderEventName('Enemy felled!');
      },
    ],
    onExit: [
      () => {
        game.settings.enemies.allowSpawn.set(true);
        game.settings.player.allowShoot.set(true);
        game.settings.player.allowAbilities.set(true);
        game.settings.player.allowDash.set(true);
        game.settings.player.allowMove.set(true);
        game.settings.player.applyMaxSpeed.set(true);
        game.entities.player.value.invulnerable = false;
      },
    ],
  },
];

export const HTML = {
  menu: document.getElementById('menu'),
  leaderboard: document.getElementById('leaderboard'),
  startButton: document.getElementById('startButton'),
  userContainer: document.getElementById('user'),
  playerColorEl: document.getElementById('player_color'),
  scoreEl: document.getElementById('scoreEl'),
  menuScoreEl: document.getElementById('menuScoreEl'),
  killsEl: document.getElementById('killsEl'),
  menuKillsEl: document.getElementById('menuKillsEl'),
  xpBarEl: document.getElementById('xp'),
  lvlEl: document.getElementById('level'),

  gameVolumeEl: document.getElementById('game_volume'),
  musicPrevEl: document.getElementById('music_prev'),
  musicToggleEl: document.getElementById('music_toggle'),
  musicNextEl: document.getElementById('music_next'),

  levelUpScreen: document.getElementById('levelup'),
  levelUpOptionsEl: document.getElementById('levelup_options'),
  levelUpHeadingEl: document.getElementById('levelup_text'),

  pauseScreen: document.getElementById('pause'),
  playerStatsEl: document.getElementById('player_stats'),
  playerStatsWrapper: document.getElementById('player_stats_container'),

  submitScoreDiv: document.getElementById('submit_score'),
  submitScoreButton: document.getElementById('submit_button'),
  signInDiv: document.getElementById('sign_in'),
  signInButton: document.getElementById('sign_in_button'),
};
HTML.gameVolumeEl.value = GAME_VOLUME;
