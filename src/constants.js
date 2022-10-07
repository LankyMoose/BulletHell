import {
  BlackHole,
  Boss,
  Enemy,
  Kamehameha,
  Player,
  player,
  Slash,
  SolarFlare,
  Turret,
  Vortex,
} from './lib.js';
import { getRandomByWeight } from './util.js';

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

export const XP_PER_KILL = 100;
export const XP_REQ_MULTI_PER_LEVEL = 1.2;
export const FRICTION = 0.97;
export const BULLET_COLOR = 'rgba(255,255,255,.75)';
export const BULLET_SIZE = 5;
export const ENEMY_SPEED = 0.6;

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
    displayText: 'Number of instances',
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
      addAbilityEffect(new Kamehameha(player.x, player.y, self, cx, cy));
    },
    onAdded: (bonus) => {
      removeBonusFromPool(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        addBonusToPool(upgrade);
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
      addAbilityEffect(new SolarFlare(player.x, player.y, self));
    },
    onAdded: (bonus) => {
      removeBonusFromPool(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        addBonusToPool(upgrade);
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
      addAbilityEffect(
        new Slash(player.x, player.y, self, { x: 0, y: 0 }, cx, cy)
      );
    },
    onAdded: (bonus) => {
      removeBonusFromPool(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        addBonusToPool(upgrade);
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
        abilityEffects.filter((ae) => ae.name == 'Vortex').length <
        self.maxInstances
      )
        addAbilityEffect(new Vortex(player.x, player.y, self));
    },
    onAdded: (bonus) => {
      removeBonusFromPool(bonus);
      for (const upgrade of BONUS_UPGRADES.filter(
        (bu) => bu.name == bonus.name
      )) {
        addBonusToPool(upgrade);
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
        for (let i = 0; i < player.level * 1.2; i++) {
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
        player.invulnerable = true;
        setAllowEnemySpawn(false);
        setAllowPlayerShoot(false);
        setAllowAbilities(false);
        setTimeout(() => {
          clearEnemies();
          clearBullets();
          clearItems();
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
        const evt = EVENT_TYPES.find((e) => e.name == `Redball the great`);
        if (!evt) throw new Error("failed to get event 'Redball the great'");
        addEvent({ ...evt });
        setAllowPlayerShoot(true);
        setAllowAbilities(true);
        player.invulnerable = false;
      },
    ],
  },
  {
    name: `Redball the great`,
    weight: 0,
    cooldown: Infinity,
    remainingMs: 0,
    activations: 1,
    functions: [
      () => {
        for (let i = 0; i < 5 + player.level / 2; i++) {
          Turret.spawn();
        }
        Boss.spawn();
      },
    ],
    vfx: [
      (self) => {
        renderEventName(`Redball the great`);
      },
    ],
    onExit: [
      () => {
        const evt = EVENT_TYPES.find((e) => e.name == 'Enemy felled!');
        if (!evt) throw new Error("failed to get event 'Enemy felled'");
        addEvent({ ...evt });
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
        setAllowEnemySpawn(false);
        setAllowPlayerShoot(false);
        setAllowAbilities(false);
        player.invulnerable = true;
        setTimeout(() => {
          clearEnemies();
          clearBullets();
          clearTurrets();
          clearEnemyBullets();
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
        setAllowPlayerShoot(true);
        setAllowEnemySpawn(true);
        setAllowAbilities(true);
        player.invulnerable = false;
      },
    ],
  },
];

export let animId;
export const setAnimId = (id) => (animId = id);
export const clearAnimId = () => {
  window.cancelAnimationFrame(animId);
  animId = null;
};
export let enemySpawnTime = 1000;
export const setEnemySpawnTime = (num) => (enemySpawnTime = num);
export const resetEnemySpawnTime = () => (enemySpawnTime = 1000);

export let allowEnemySpawn = true;
export const setAllowEnemySpawn = (val) => (allowEnemySpawn = val);

export let allowPlayerShoot = true;
export let setAllowPlayerShoot = (val) => (allowPlayerShoot = val);

export let allowAbilities = true;
export let setAllowAbilities = (val) => (allowAbilities = val);

export let blackHoles = [];
export const addBlackHole = (bh) => blackHoles.push(bh);
export const removeBlackHole = (i) => blackHoles.splice(i, 1);
export const clearBlackHoles = () => (blackHoles = []);

export let events = [];
export const addEvent = (e) => events.push(e);
export const removeEvent = (i) => events.splice(i, 1);
export const clearEvents = () => (events = []);
export const randomEvent = () => {
  const filteredEvents = EVENT_TYPES.filter((e) => e.weight > 0);
  const evtIndex = getRandomByWeight(filteredEvents);
  return filteredEvents[evtIndex];
};

export let bullets = [];
export const addBullet = (b) => bullets.push(b);
export const removeBullet = (i) => bullets.splice(i, 1);
export const clearBullets = () => (bullets = []);

export let enemyBullets = [];
export const addEnemyBullet = (b) => enemyBullets.push(b);
export const removeEnemyBullet = (i) => enemyBullets.splice(i, 1);
export const clearEnemyBullets = () => (enemyBullets = []);

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

export let turrets = [];
export const addTurret = (i) => turrets.push(i);
export const removeTurret = (i) => turrets.splice(i, 1);
export const clearTurrets = () => (turrets = []);

export let abilityEffects = [];
export const addAbilityEffect = (e) => abilityEffects.push(e);
export const removeAbilityEffect = (i) => abilityEffects.splice(i, 1);
export const clearAbilityEffects = () => (abilityEffects = []);

export let damageTexts = [];
export const addDamageText = (i) => damageTexts.push(i);
export const removeDamageText = (i) => damageTexts.splice(i, 1);
export const clearDamageTexts = () => (damageTexts = []);

export let score = 0;
export const addScore = (amnt) => (score += amnt);
export const resetScore = () => (score = 0);

export const set_x = (val) => (x = val);
export const set_y = (val) => (y = val);

export let bonusPool = [...BONUS_TYPES];
export const resetBonusPool = () => (bonusPool = [...BONUS_TYPES]);
export const addBonusToPool = (bonus) => bonusPool.push(bonus);
export const removeBonusFromPool = (bonus) => {
  for (let i = 0; i < bonusPool.length; i++) {
    if (bonusPool[i].name == bonus.name) {
      bonusPool.splice(i, 1);
    }
  }
};

export const resetPlayer = () => {
  player = new Player(x, y, 20, 'white', { x: 0, y: 0 });
};
