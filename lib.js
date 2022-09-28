import {
  FRICTION,
  BULLET_COLOR,
  BULLET_SIZE,
  ITEM_TYPES,
  ITEM_WEIGHT_MAP,
  ENEMY_SPEED,
  x,
  y,
  c,
  animId,
  addBullet,
  addEnemy,
  addItem,
  score,
  canvas,
  BONUS_WEIGHT_MAP,
  BONUS_TYPES,
} from './constants.js';

import { rotate, randomScreenEdgeCoords, randomCoords } from './util.js';

export class Circle {
  constructor(x, y, r, color, vel) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.initialR = r;
    this.killValue = Math.floor((r / 3) * 10);
    this.color = color;
    this.alpha = 1;
    this.vel = vel;
  }

  draw() {
    c.save();
    c.globalAlpha = this.alpha;
    c.beginPath();
    c.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.restore();

    if (this.image) {
      c.drawImage(
        this.image,
        this.x - (this.r * 1.5) / 2,
        this.y - (this.r * 1.5) / 2,
        this.r * 1.5,
        this.r * 1.5
      );
    }
  }

  updatePosition() {
    if (this.vel && !isNaN(this.vel?.y)) this.y += this.vel.y;
    if (this.vel && !isNaN(this.vel?.x)) this.x += this.vel.x;
  }

  applyGlobalScale() {
    //this.r = this.initialR * scaleMod;
  }

  update() {
    this.updatePosition();
    this.applyGlobalScale();
    this.draw();
  }
}

export class Player extends Circle {
  constructor() {
    super(...arguments);
    this.speed = 0.5;
    this.bulletSpeed = 17.5;
    this.maxSpeed = 10;
    this.shootSpeed = 200;
    this.damage = 10;
    this.critChance = 10;
    this.critDamageMulti = 1.5;
    this.kills = 0;
    this.inputs = {
      left: false,
      right: false,
      up: false,
      down: false,
    };
    this.items = [];
    this.heat = 0;
    this.maxHeat = 100;
    this.level = 1;
    this.xp = 1;
    this.xpMulti = 1;
    this.next_level = 1000;
    this.life = 100;
    this.maxLife = 100;
    this.friction = FRICTION;
  }
  update() {
    let inputDown = false;
    if (this.inputs.left) {
      this.vel.x -= this.speed;
      inputDown = true;
    }
    if (this.inputs.right) {
      this.vel.x += this.speed;
      inputDown = true;
    }
    if (this.inputs.down) {
      this.vel.y += this.speed;
      inputDown = true;
    }
    if (this.inputs.up) {
      this.vel.y -= this.speed;
      inputDown = true;
    }
    if (this.vel.x > this.maxSpeed) this.vel.x = this.maxSpeed;
    if (this.vel.x < -this.maxSpeed) this.vel.x = -this.maxSpeed;
    if (this.vel.y > this.maxSpeed) this.vel.y = this.maxSpeed;
    if (this.vel.y < -this.maxSpeed) this.vel.y = -this.maxSpeed;

    if (!inputDown) {
      this.vel.x *= this.friction;
      this.vel.y *= this.friction;
    }
    if (this.x > canvas.width || this.x < 0) {
      this.vel.x *= -1;
    }
    if (this.y > canvas.height || this.y < 0) {
      this.vel.y *= -1;
    }

    super.update();
  }

  shootSingle(clientX, clientY) {
    const angle = Math.atan2(clientY - this.y, clientX - this.x);
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };
    addBullet(new Bullet(this.x, this.y, BULLET_SIZE, BULLET_COLOR, vel));
  }

  static shoot(e) {
    if (!animId) return;
    const { clientX, clientY } = e;
    const bulletMods = player.items.filter((i) =>
      i.modifiers.some((m) => m.key == 'bulletsFired')
    );
    if (!bulletMods.length) return player.shootSingle(clientX, clientY);

    let bulletCount = 1;
    bulletMods.forEach((a, i) => {
      a.modifiers.forEach((b) => {
        bulletCount += b.amount;
      });
      if (!a.permanent) {
        a.duration--;
        if (a.duration <= 0) {
          player.items.splice(i, 1);
        }
      }
    });

    const s = Math.hypot(player.x - clientX, player.y - clientY);
    let bulletSpread = 10;
    if (360 / bulletCount < 10) {
      bulletSpread = 360 / bulletCount;
    }
    // how many proj per side?
    let maxOffset =
      bulletCount % 2 == 0 ? bulletCount / 2 : (bulletCount - 1) / 2;

    for (let i = 1; i < maxOffset + 1; i++) {
      const target = rotate(
        player.x,
        player.y,
        clientX,
        clientY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread,
        true
      );
      const angle = Math.atan2(target.y - player.y, target.x - player.x);

      const vel = {
        x: Math.cos(angle) * player.bulletSpeed,
        y: Math.sin(angle) * player.bulletSpeed,
      };
      addBullet(new Bullet(player.x, player.y, BULLET_SIZE, BULLET_COLOR, vel));
    }

    if (bulletCount % 2 == 1) player.shootSingle(clientX, clientY);

    for (let i = 1; i < maxOffset + 1; i++) {
      const target = rotate(
        player.x,
        player.y,
        clientX,
        clientY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread
      );
      const angle = Math.atan2(target.y - player.y, target.x - player.x);

      const vel = {
        x: Math.cos(angle) * player.bulletSpeed,
        y: Math.sin(angle) * player.bulletSpeed,
      };
      addBullet(new Bullet(player.x, player.y, BULLET_SIZE, BULLET_COLOR, vel));
    }
  }

  reset() {
    Object.assign(this, new Player(x, y, 20, 'white', { x: 0, y: 0 }));
  }

  resetProgression() {
    this.level = 1;
    this.xp = 1;
    this.next_level = 1000;
    this.kills = 0;
    this.heat = 0;
    this.shootSpeed = 200;
  }

  onLevelUp() {
    this.xp = 1;
  }
}

export const player = new Player(x, y, 20, 'white', { x: 0, y: 0 });

export class Bullet extends Circle {
  constructor() {
    super(...arguments);
  }
}

export class Enemy extends Circle {
  static minSize = 20;
  constructor() {
    super(...arguments);
    this.img_update_frames = 14;
    this.cur_frame = 0;
    this.cur_image = 0;
    this.images = {
      left: ['img_demon', 'img_demon_open'],
      right: ['img_demon_r', 'img_demon_r_open'],
    };
  }
  update() {
    let speedMod = Math.floor(score / 2000) * 0.125;
    if (speedMod <= 1) speedMod = 1;

    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const vel = {
      x: Math.cos(angle) * speedMod,
      y: Math.sin(angle) * speedMod,
    };

    gsap.to(this.vel, {
      x: vel.x,
      y: vel.y,
    });

    super.update();
    this.cur_frame++;
    if (this.cur_frame > this.img_update_frames) Enemy.setImage(this);
  }
  static spawn(coords) {
    if (!document.hasFocus()) return;
    const rad = Math.random() * (60 - Enemy.minSize) + Enemy.minSize;
    if (!coords) coords = randomScreenEdgeCoords(rad);

    const angle = Math.atan2(player.y - coords.y, player.x - coords.x);
    const vel = {
      x: Math.cos(angle) * ENEMY_SPEED,
      y: Math.sin(angle) * ENEMY_SPEED,
    };
    const newEnemy = new Enemy(coords.x, coords.y, rad, 'transparent', vel);
    Enemy.setImage(newEnemy);
    addEnemy(newEnemy);
  }

  static setImage(enemy) {
    enemy.cur_frame = 0;
    enemy.cur_image = enemy.cur_image == 0 ? 1 : 0;
    const imgDir = enemy.x > player.x ? enemy.images.left : enemy.images.right;
    enemy.image = document.getElementById(imgDir[enemy.cur_image]);
  }
}

export class Particle extends Circle {
  constructor() {
    super(...arguments);
  }
  update() {
    super.update();
    this.alpha -= 0.1;
    this.vel.x *= FRICTION;
    this.vel.y *= FRICTION;
  }
}

export class Item extends Circle {
  constructor() {
    super(...arguments);
    this.itemType = null;
    this.itemLife = 100;
    this.angle = 0;
    this.i = 0;
  }

  static spawn(coords) {
    if (!coords) coords = randomCoords();
    const rad = 20;
    const newItem = new Item(coords.x, coords.y, rad, 'red', { x: 0, y: 0 });

    const newItemIndex =
      ITEM_WEIGHT_MAP[Math.floor(Math.random() * ITEM_WEIGHT_MAP.length)];

    newItem.itemType = ITEM_TYPES[newItemIndex];

    newItem.image = newItem.itemType.image;

    addItem(newItem);
  }

  update() {
    this.angle = 0.03 * this.i;
    this.x = this.x + this.angle * Math.cos(this.angle);
    this.y = this.y + this.angle * Math.sin(this.angle);
    this.i++;
    this.draw();
  }
}

export class Bonus {
  constructor(name, modifiers) {
    this.rarity = Math.floor(Math.random() * 3);
    this.name = name;
    this.modifiers = modifiers;
  }
}
export class BonusSet {
  constructor() {
    this.items = [];
    this.generate();
  }
  generate() {
    while (this.items.length < 3) {
      const newItemIndex =
        BONUS_WEIGHT_MAP[Math.floor(Math.random() * BONUS_WEIGHT_MAP.length)];
      const itemDef = BONUS_TYPES[newItemIndex];

      if (!this.items.some((x) => x.name == itemDef.name)) {
        this.items.push(new Bonus(itemDef.name, itemDef.modifiers));
      }
    }
  }
}

export class DamageText {
  constructor(x, y, dmg, isCrit) {
    this.x = x;
    this.y = y;
    this.dmg = dmg;
    this.isCrit = isCrit;
    this.alpha = 1;
  }

  update() {
    this.alpha -= 0.05;
    if (this.alpha >= 0) this.draw();
  }
  draw() {
    c.save();
    c.globalAlpha = this.alpha;
    c.font = `bold ${this.isCrit ? 22 : 14}px sans-serif`;
    //c.strokeStyle = 'black';
    c.fillStyle = 'gold';
    //if (this.isCrit) c.fillStyle = 'orangered';
    c.fillText(this.dmg.toString(), this.x, this.y);
    //c.strokeText(this.dmg.toString(), this.x, this.y);
    c.restore();
  }
}
