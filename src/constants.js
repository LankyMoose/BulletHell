'use strict';
import {
  AbilityBoss,
  BlackHole,
  Boomerang,
  Enemy,
  Kamehameha,
  ShooterBoss,
  Slash,
  SolarFlare,
  Turret,
  Vortex,
} from './lib.js';
import { game } from './state.js';

export const menu = document.getElementById('menu');
export const leaderboard = document.getElementById('leaderboard');
export const startButton = document.getElementById('startButton');
export const userContainer = document.getElementById('user');
export const playerColorEl = document.getElementById('player_color');
export const scoreEl = document.getElementById('scoreEl');
export const menuScoreEl = document.getElementById('menuScoreEl');
export const killsEl = document.getElementById('killsEl');
export const lifeEl = document.getElementById('lifeEl');
export const menuKillsEl = document.getElementById('menuKillsEl');
export const xpBarEl = document.getElementById('xp');
export const lvlEl = document.getElementById('level');

export const gameVolumeEl = document.getElementById('game_volume');

export const musicPrevEl = document.getElementById('music_prev');
export const musicToggleEl = document.getElementById('music_toggle');
export const musicNextEl = document.getElementById('music_next');

export const levelUpScreen = document.getElementById('levelup');
export const levelUpOptionsEl = document.getElementById('levelup_options');
export const levelUpHeadingEl = document.getElementById('levelup_text');

export const pauseScreen = document.getElementById('pause');
export const playerStatsEl = document.getElementById('player_stats');
export const playerStatsWrapper = document.getElementById(
  'player_stats_container'
);
export const submitScoreDiv = document.getElementById('submit_score');
export const submitScoreButton = document.getElementById('submit_button');
export const signInDiv = document.getElementById('sign_in');
export const signInButton = document.getElementById('sign_in_button');

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
export const BACKGROUND_RGB = '24,24,24';

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

export const STAT_DISPLAYS = [
  {
    key: 'xpMulti',
    displayText: 'XP Multiplier',
  },
  {
    key: 'speed',
    displayText: 'Acceleration',
  },
  {
    key: 'bulletSpeed',
    displayText: 'Bullet Speed',
  },
  {
    key: 'maxSpeed',
    displayText: 'Max Speed',
  },
  {
    key: 'bulletCooldown',
    displayText: 'Bullet Cooldown',
  },
  {
    key: 'damage',
    displayText: 'Damage',
  },
  {
    key: 'size',
    displayText: 'Size',
  },
  {
    key: 'critChance',
    displayText: 'Critical Chance',
  },
  {
    key: 'critMulti',
    displayText: 'Critical Multiplier',
  },
  {
    key: 'maxLife',
    displayText: 'Max Life',
  },
  {
    key: 'maxInstances',
    displayText: 'Max Instances',
  },
  {
    key: 'maxDistance',
    displayText: 'Max Distance',
  },
];

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
    name: 'Laser',
    getColor: () => 'aqua',
    isAbility: true,
    cooldown: 4e3,
    //cooldown: 1e3,
    remainingMs: 32,
    size: 22,
    damage: 6,
    trigger: (player, self, cx, cy) => {
      game.entities.abilityEffects.add(
        new Kamehameha(player.x, player.y, self, cx, cy, player)
      );
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
      game.entities.abilityEffects.add(
        new SolarFlare(player.x, player.y, self)
      );
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
    size: 100,
    damage: 10,
    trigger: (player, self, cx, cy) => {
      game.entities.abilityEffects.add(
        new Slash(player.x, player.y, self, { x: 0, y: 0 }, cx, cy, player)
      );
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
        game.entities.abilityEffects.add(
          new Vortex(player.x, player.y, self, player)
        );
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
    //cooldown: 1e3,
    remainingMs: 32,
    size: 70,
    damage: 2,
    maxDistance: 300,
    trigger: (player, self, cx, cy) => {
      game.entities.abilityEffects.add(
        new Boomerang(player.x, player.y, self, { x: 0, y: 0 }, cx, cy, player)
      );
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
  {
    name: 'Laser',
    getColor: () => 'red',
    isAbility: true,
    cooldown: 4e3,
    //cooldown: 1e3,
    remainingMs: 2e3,
    weight: 1,
    size: 22,
    damage: 1,
    trigger: (boss, self, cx, cy) => {
      game.entities.enemyAbilityEffects.add(
        new Kamehameha(boss.x, boss.y, self, cx, cy, boss)
      );
    },
    onAdded: (bonus) => {},
  },
  // {
  //   name: 'Boomerang',
  //   getColor: () => 'red',
  //   isAbility: true,
  //   cooldown: 1500,
  //   //cooldown: 1e3,
  //   remainingMs: 500,
  //   weight: 50,
  //   size: 70,
  //   damage: 2,
  //   trigger: (boss, self, cx, cy) => {
  //     game.entities.enemyAbilityEffects.add(
  //       new Boomerang(boss.x, boss.y, self, { x: 0, y: 0 }, cx, cy, boss)
  //     );
  //   },
  //   onAdded: (bonus) => {},
  // },
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
