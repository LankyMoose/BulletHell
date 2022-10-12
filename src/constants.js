'use strict';
import {
  BlackHole,
  Boss,
  Enemy,
  Kamehameha,
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
export const heatBarEl = document.getElementById('heat');
export const xpBarEl = document.getElementById('xp');
export const lvlEl = document.getElementById('level');
export const levelUpScreen = document.getElementById('levelup');
export const levelUpOptionsEl = document.getElementById('levelup_options');
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
export const XP_REQ_MULTI_PER_LEVEL = 1.2;
export const FRICTION = 0.97;
export const BULLET_COLOR = 'rgba(255,255,255,.75)';
export const BULLET_SIZE = 5;
export const ENEMY_SPEED = 0.6;
export const DEBUG_ENABLED = false;
export const MAX_LEVEL = Infinity;

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
    key: 'critDamageMulti',
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
            window.renderPlayerLife();
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
        amounts: [0.35, 0.7, 1.2, 1.6],
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
        amounts: [2, 4, 7, 12],
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
        key: 'critDamageMulti',
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
        amounts: [8, 16, 24],
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
        new Kamehameha(player.x, player.y, self, cx, cy)
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
        new Slash(player.x, player.y, self, { x: 0, y: 0 }, cx, cy)
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
        game.entities.abilityEffects.add(new Vortex(player.x, player.y, self));
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

const renderEventName = (name) => {
  c.save();
  c.fillStyle = 'white';
  const fs = 36;
  c.font = fs + 'px sans-serif';
  c.textAlign = 'center';
  c.fillText(name, canvas.width / 2, 100);
  c.restore();
};

export const EVENT_TYPES = [
  {
    name: 'Horde',
    weight: 1,
    cooldown: 2e3,
    remainingMs: 0,
    activations: 1,
    functions: [
      () => {
        for (let i = 0; i < game.entities.player.value.level * 1.2; i++) {
          Enemy.spawn({ r: 18 });
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
        setTimeout(() => {
          game.entities.enemies.reset();
          game.entities.bullets.reset();
          game.entities.items.reset();
        }, 1000);
      },
    ],
    vfx: [
      (self) => {
        renderEventName('Prepare yourself!');
      },
    ],
    onExit: [
      () => {
        const evt = EVENT_TYPES.find((e) => e.name == `Blackball the great`);
        if (!evt) throw new Error("failed to get event 'Blackball the great'");
        game.entities.events.add({ ...evt });
        game.settings.player.allowShoot.set(true);
        game.settings.player.allowAbilities.set(true);
        game.entities.player.value.invulnerable = false;
      },
    ],
  },
  {
    name: `Blackball the great`,
    weight: 0,
    cooldown: Infinity,
    remainingMs: 0,
    activations: 1,
    functions: [
      () => {
        for (let i = 0; i < 5 + game.entities.player.value.level / 2; i++) {
          Turret.spawn();
        }
        Boss.spawn();
      },
    ],
    vfx: [
      (self) => {
        renderEventName(`Blackball the great`);
      },
    ],
    onExit: [
      () => {
        const evt = EVENT_TYPES.find((e) => e.name == 'Enemy felled!');
        if (!evt) throw new Error("failed to get event 'Enemy felled'");
        game.entities.events.add({ ...evt });
      },
    ],
  },
  {
    name: 'Enemy felled!',
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
        game.entities.player.value.invulnerable = false;
      },
    ],
  },
];
