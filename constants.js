export const menu = document.getElementById('menu');
export const startButton = document.getElementById('startButton');
export const scoreEl = document.getElementById('scoreEl');
export const menuScoreEl = document.getElementById('menuScoreEl');
export const killsEl = document.getElementById('killsEl');
export const menuKillsEl = document.getElementById('menuKillsEl');
export const heatBarEl = document.getElementById('heat');
export const xpBarEl = document.getElementById('xp');
export const lvlEl = document.getElementById('level');
export const levelUpScreen = document.getElementById('levelup');
export const levelUpOptionsEl = document.getElementById('levelup_options');
export const pauseScreen = document.getElementById('pause');
export const playerStatsEl = document.getElementById('player_stats');

export const canvas = document.querySelector('canvas');
export const c = canvas.getContext('2d');
canvas.width = innerWidth;
canvas.height = innerHeight;
export let x = canvas.width / 2;
export let y = canvas.height / 2;

export const XP_PER_KILL = 100;
export const XP_REQ_MULTI_PER_LEVEL = 1.5;

export let animId;
export const setAnimId = (id) => (animId = id);

export const FRICTION = 0.97;
export const BULLET_COLOR = 'rgba(255,255,255,.75)';
export const BULLET_SIZE = 5;
export const ENEMY_SPEED = 0.6;

export const PLAYER_STAT_DISPLAYS = [
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
    key: 'shootSpeed',
    displayText: 'Bullet Cooldown',
  },
  {
    key: 'damage',
    displayText: 'Damage',
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
    key: 'friction',
    displayText: 'Friction',
  },
];

export const BONUS_TYPES = [
  {
    name: 'Max Health',
    weight: 5,
    modifiers: [
      {
        key: 'maxLife',
        amounts: [20, 50, 80],
      },
    ],
  },
  {
    name: 'Speed Boost',
    weight: 5,
    modifiers: [
      {
        key: 'maxSpeed',
        amounts: [2, 5, 8],
      },
    ],
  },
  {
    name: 'Bullet Speed',
    weight: 5,
    modifiers: [
      {
        key: 'bulletSpeed',
        amounts: [1, 3, 5],
      },
    ],
  },
  {
    name: 'Bullet Cooldown',
    weight: 5,
    modifiers: [
      {
        key: 'shootSpeed',
        amounts: [-4, -10, -18],
      },
    ],
  },
  {
    name: 'XP Multiplier',
    weight: 5,
    modifiers: [
      {
        key: 'xpMulti',
        amounts: [0.2, 0.5, 1],
      },
    ],
  },
  {
    name: 'Weight Increase',
    weight: 5,
    modifiers: [
      {
        key: 'friction',
        amounts: [-0.02, -0.05, -0.09],
      },
    ],
  },
  {
    name: 'Critical Chance',
    weight: 5,
    modifiers: [
      {
        key: 'critChance',
        amounts: [4, 8, 16],
      },
    ],
  },
  {
    name: 'Critical Multiplier',
    weight: 5,
    modifiers: [
      {
        key: 'critDamageMulti',
        amounts: [0.07, 0.15, 0.35],
      },
    ],
  },
];
export const BONUS_WEIGHT_MAP = [
  ...BONUS_TYPES.map((t, i) => Array(t.weight).fill(i)),
]
  .join()
  .split(',')
  .map((a) => parseInt(a));

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
];
export const ITEM_WEIGHT_MAP = [
  ...ITEM_TYPES.map((t, i) => Array(t.weight).fill(i)),
]
  .join()
  .split(',')
  .map((a) => parseInt(a));

export let bullets = [];
export const addBullet = (b) => bullets.push(b);
export const removeBullet = (i) => bullets.splice(i, 1);
export const clearBullets = () => (bullets = []);

export let enemies = [];
export const addEnemy = (e) => enemies.push(e);
export const removeEnemy = (i) => enemies.splice(i, 1);
export const clearEnemies = () => (enemies = []);

export let particles = [];
export const addParticle = (p) => particles.push(p);
export const removeParticle = (i) => particles.splice(i, 1);
export const clearParticles = () => (particles = []);

export let items = [];
export const addItem = (i) => items.push(i);
export const removeItem = (i) => items.splice(i, 1);
export const clearItems = () => (items = []);

export let damageTexts = [];
export const addDamageText = (i) => damageTexts.push(i);
export const removeDamageText = (i) => damageTexts.splice(i, 1);
export const clearDamageTexts = () => (damageTexts = []);

export let score = 0;
export const addScore = (amnt) => (score += amnt);
export const resetScore = () => (score = 0);

export const set_x = (val) => (x = val);
export const set_y = (val) => (y = val);
