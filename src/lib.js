import {
  FRICTION,
  BULLET_COLOR,
  BULLET_SIZE,
  ITEM_TYPES,
  ENEMY_SPEED,
  x,
  y,
  c,
  animId,
  addBullet,
  addEnemy,
  addItem,
  canvas,
  BONUS_TYPES,
  EVENT_TYPES,
} from './constants.js';

import {
  rotate,
  randomScreenEdgeCoords,
  randomCoords,
  getRandomByWeight,
  getWeightMap,
  getRandomWeightMapIndex,
} from './util.js';
export const debug = true;
const allowEnemySpawn = false;
const allowPlayerShoot = true;
function strokeCircle(circle) {
  c.beginPath();
  c.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2, false);
  c.lineWidth = '2';
  c.strokeStyle = 'white';
  c.stroke();
  c.restore();
}

export class Circle {
  constructor(x, y, r, color, vel) {
    this.x = x;
    this.oldX = x;
    this.renderX = x;
    this.y = y;
    this.oldY = y;
    this.renderY = y;
    this.r = r;
    this.initialR = r;
    this.killValue = Math.floor((r / 3) * 10);
    this.color = color;
    this.alpha = 1;
    this.vel = vel;
    this.fixed = false;
  }

  preDraw(lagOffset) {
    //Use the `lagOffset` and previous x/y positions to
    //calculate the render positions
    this.renderX = (this.x - this.oldX) * lagOffset + this.oldX;
    this.renderY = (this.y - this.oldY) * lagOffset + this.oldY;
  }
  postDraw() {
    this.oldX = this.x;
    this.oldY = this.y;
  }
  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.globalAlpha = this.alpha;
    c.beginPath();
    c.arc(this.renderX, this.renderY, this.r, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.restore();

    if (this.image) {
      try {
        c.drawImage(
          this.image,
          this.renderX - (this.r * 2) / 2,
          this.renderY - (this.r * 2) / 2,
          this.r * 2,
          this.r * 2
        );
      } catch (error) {
        console.error('img failed to be drawn', this.image);
      }
    }
    this.postDraw();
  }

  updatePosition() {
    if (this.fixed) return;
    if (this.vel && !isNaN(this.vel?.y)) this.y += this.vel.y;
    if (this.vel && !isNaN(this.vel?.x)) this.x += this.vel.x;
  }

  applyGlobalScale() {
    //this.r = this.initialR * scaleMod;
  }

  update() {
    this.updatePosition();
    this.applyGlobalScale();
  }

  enforceMapBoundaries() {
    if (this.x - this.r < 0) {
      this.x = this.r;
      this.vel.x *= -1;
    }
    if (this.x + this.r > canvas.width) {
      this.x = canvas.width - this.r;
      this.vel.x *= -1;
    }
    if (this.y - this.r < 0) {
      this.y = this.r;
      this.vel.y *= -1;
    }
    if (this.y + this.r > canvas.height) {
      this.y = canvas.height - this.r;
      this.vel.y *= -1;
    }
  }

  inMap() {
    return (
      this.x - this.r > 0 &&
      this.x + this.r < canvas.width &&
      this.y - this.r > 0 &&
      this.y + this.r < canvas.height
    );
  }
}

export class Player extends Circle {
  constructor() {
    super(...arguments);
    this.speed = 0.5;
    this.bulletSpeed = 17.5;
    this.maxSpeed = 7;
    this.bulletCooldown = 400;
    this.bulletTick = 0;
    this.damage = 6;
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
    this.friction = 0.8;
    this.cooldownRefs = [];
    this.lastMouseMove = null;
  }
  applyVelocity() {
    let dirX = -this.inputs.left + this.inputs.right;
    let dirY = -this.inputs.up + this.inputs.down;

    if (dirX !== 0 && dirY !== 0) {
      dirX *= Math.SQRT1_2;
      dirY *= Math.SQRT1_2;
      console.log(dirX, dirY);
    }

    this.vel.x += this.speed * dirX;
    if (dirY !== 0) {
      if (this.vel.x > this.maxSpeed / 2) {
        this.vel.x = this.maxSpeed / 2;
      } else if (this.vel.x < -this.maxSpeed / 2) {
        this.vel.x = -this.maxSpeed / 2;
      }
    } else {
      if (this.vel.x > this.maxSpeed) {
        this.vel.x = this.maxSpeed;
      } else if (this.vel.x < -this.maxSpeed) {
        this.vel.x = -this.maxSpeed;
      }
    }
    this.vel.y += this.speed * dirY;
    if (dirX !== 0) {
      if (this.vel.y > this.maxSpeed / 2) {
        this.vel.y = this.maxSpeed / 2;
      } else if (this.vel.y < -this.maxSpeed / 2) {
        this.vel.y = -this.maxSpeed / 2;
      }
    } else {
      if (this.vel.y > this.maxSpeed) {
        this.vel.y = this.maxSpeed;
      } else if (this.vel.y < -this.maxSpeed) {
        this.vel.y = -this.maxSpeed;
      }
    }

    if (!dirX) this.vel.x *= this.friction;
    if (!dirY) this.vel.y *= this.friction;
  }
  update() {
    if (this.inputs.left) {
      this.vel.x -= this.speed;
    }
    if (this.inputs.right) {
      this.vel.x += this.speed;
    }
    if (this.inputs.down) {
      this.vel.y += this.speed;
    }
    if (this.inputs.up) {
      this.vel.y -= this.speed;
    }
    if (this.vel.x > this.maxSpeed) this.vel.x = this.maxSpeed;
    if (this.vel.x < -this.maxSpeed) this.vel.x = -this.maxSpeed;
    if (this.vel.y > this.maxSpeed) this.vel.y = this.maxSpeed;
    if (this.vel.y < -this.maxSpeed) this.vel.y = -this.maxSpeed;

    if (
      (!this.inputs.left && !this.inputs.right) ||
      (this.inputs.left && !this.inputs.right && this.vel.x > 0) ||
      (this.inputs.right && !this.inputs.left && this.vel.x < 0)
    ) {
      this.vel.x *= this.friction;
    }
    if (
      (!this.inputs.up && !this.inputs.down) ||
      (this.inputs.up && !this.inputs.down && this.vel.y > 0) ||
      (this.inputs.down && !this.inputs.up && this.vel.y < 0)
    ) {
      this.vel.y *= this.friction;
    }
    this.enforceMapBoundaries();

    super.update();
    this.bulletTick += 16;
    if (this.bulletTick >= this.bulletCooldown) {
      this.shootBullets();
      this.bulletTick = 0;
    }

    const abilities = this.items.filter((i) => i.isAbility);
    for (let ability of abilities) {
      ability.remainingMs -= 16;
      if (ability.remainingMs <= 0) {
        ability.trigger(
          this,
          ability,
          this.lastMouseMove.clientX,
          this.lastMouseMove.clientY
        );
        ability.remainingMs = ability.cooldown;
      }
    }
  }
  draw(lagOffset) {
    super.draw(lagOffset);
    if (debug) strokeCircle(this);
  }

  shootSingleBullet(clientX, clientY) {
    const angle = Math.atan2(clientY - this.y, clientX - this.x);
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };
    addBullet(new Bullet(this.x, this.y, BULLET_SIZE, BULLET_COLOR, vel));
  }

  shootMultipleBullets(clientX, clientY) {
    let bulletCount = 1;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (
        !item.modifiers ||
        !item.modifiers.some((m) => m.key == 'bulletsFired')
      )
        continue;

      item.modifiers.forEach((b) => {
        bulletCount += b.amount;
      });
      if (!item.permanent) {
        item.duration--;
        if (item.duration <= 0) {
          player.items.splice(i, 1);
        }
      }
    }

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

    if (bulletCount % 2 == 1) player.shootSingleBullet(clientX, clientY);

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

  shootBullets() {
    if (!animId) return;
    const { clientX, clientY } = player.lastMouseMove;
    if (!allowPlayerShoot) return;

    const bulletMods = player.items.filter(
      (i) => i.modifiers && i.modifiers.some((m) => m.key == 'bulletsFired')
    );
    if (!bulletMods.length) {
      player.shootSingleBullet(clientX, clientY);
    } else {
      player.shootMultipleBullets(clientX, clientY);
    }
  }

  onLevelUp() {
    this.xp = 1;
  }
}

export let player = new Player(x, y, 20, 'white', { x: 0, y: 0 });

export const resetPlayer = () => {
  player = new Player(x, y, 20, 'white', { x: 0, y: 0 });
};

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
    this.speed = 1;
    this.aggroRange = 500;
    this.images = {
      left: ['img_demon', 'img_demon_open'],
      right: ['img_demon_r', 'img_demon_r_open'],
      up: {
        left: ['img_demon_up', 'img_demon_up_open'],
        right: ['img_demon_up_r', 'img_demon_up_r_open'],
      },
      down: {
        left: ['img_demon_down', 'img_demon_down_open'],
        right: ['img_demon_down_r', 'img_demon_down_r_open'],
      },
    };
    this.enteredMap = false;
    this.fixed = false;
    this.invulnerable = false;
  }

  followPlayer() {
    let speedMod = this.speed + player.level / 5;
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
  }
  update() {
    super.update();
    if (!this.fixed) {
      console.log('...not fixed?');
      const dist = Math.hypot(this.x - player.x, this.y - player.y);
      if (dist - player.r - this.r < this.aggroRange) {
        this.followPlayer();
      }
      if (!this.enteredMap && this.inMap()) this.enteredMap = true;
      if (this.enteredMap) this.enforceMapBoundaries();
    }

    this.cur_frame++;
    if (this.cur_frame > this.img_update_frames) Enemy.setImage(this);
  }
  draw(lagOffset) {
    super.draw(lagOffset);
    if (debug) strokeCircle(this);
  }

  static spawn(coords, fixed, invulnerable) {
    if (!allowEnemySpawn && !fixed) return;
    if (!document.hasFocus()) return;
    const rad = Math.random() * (60 - Enemy.minSize) + Enemy.minSize;
    if (!coords) coords = randomScreenEdgeCoords(rad);

    const angle = Math.atan2(player.y - coords.y, player.x - coords.x);
    const vel = {
      x: Math.cos(angle) * ENEMY_SPEED,
      y: Math.sin(angle) * ENEMY_SPEED,
    };
    if (fixed) {
      vel.x = 0;
      vel.y = 0;
    }
    const newEnemy = new Enemy(coords.x, coords.y, rad, 'transparent', vel);
    newEnemy.fixed = fixed;
    newEnemy.invulnerable = invulnerable;
    Enemy.setImage(newEnemy);
    if (!fixed) newEnemy.followPlayer();
    addEnemy(newEnemy);
  }

  static setImage(enemy) {
    enemy.cur_frame = 0;
    enemy.cur_image = enemy.cur_image == 0 ? 1 : 0;

    let imgDir = enemy.x > player.x ? enemy.images.left : enemy.images.right;
    if (enemy.y > player.y - player.r)
      imgDir =
        enemy.x > player.x ? enemy.images.up.left : enemy.images.up.right;
    if (enemy.y < player.y + player.r)
      imgDir =
        enemy.x > player.x ? enemy.images.down.left : enemy.images.down.right;
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

    const spawnableItems = ITEM_TYPES.filter((it) => it.weight);

    const newItemIndex = getRandomByWeight(spawnableItems);

    newItem.itemType = spawnableItems[newItemIndex];

    newItem.image = newItem.itemType.image;

    addItem(newItem);
  }

  update() {
    this.angle = 0.03 * this.i;
    this.x = this.x + this.angle * Math.cos(this.angle);
    this.y = this.y + this.angle * Math.sin(this.angle);
    this.i++;
  }
}

let bonusPool = [...BONUS_TYPES];
export const resetBonusPool = () => (bonusPool = [...BONUS_TYPES]);
export const addBonusToPool = (bonus) => bonusPool.push(bonus);
export const removeBonusFromPool = (bonus) => {
  for (let i = 0; i < bonusPool.length; i++) {
    if (bonusPool[i].name == bonus.name) {
      bonusPool.splice(i, 1);
    }
  }
};
export const handleBonusSelection = (bonus) => {
  if (bonus.type == 'attribute') {
    bonus.modifiers.forEach((m) => {
      const amount = m.amounts[bonus.rarity];
      player[m.key] += amount;
      if (m.triggers) {
        m.triggers.forEach((t) => t(player, amount));
      }
    });
  } else if (bonus.type == 'ability') {
    const itemDef = { ...ITEM_TYPES.find((it) => it.name == bonus.name) };
    player.items.push(itemDef);
    if (itemDef.onAdded) itemDef.onAdded(bonus);
  } else if ((bonus.type = 'upgrade')) {
    const playerItem = player.items.find((i) => i.name == bonus.name);
    bonus.modifiers.forEach((m) => {
      const amount = m.amounts[bonus.rarity];
      playerItem[m.key] += amount;
      if (m.triggers) {
        m.triggers.forEach((t) => t(player, amount));
      }
    });
  }
};

export class Bonus {
  constructor(type, name, modifiers, rarity) {
    this.type = type;
    this.name = name;
    this.modifiers = modifiers;
    this.rarity = rarity;
  }
}
export class BonusSet {
  constructor() {
    this.items = [];
    this.generate();
  }
  generate() {
    while (this.items.length < 3) {
      const newItemIndex = getRandomByWeight(bonusPool);
      const bonusDef = bonusPool[newItemIndex];

      if (!this.items.some((x) => x.name == bonusDef.name)) {
        let rarity = 0;
        if (bonusDef.rarity_weights) {
          const rarityWeightMap = getWeightMap(bonusDef.rarity_weights);
          rarity = getRandomWeightMapIndex(rarityWeightMap);
        }

        this.items.push(
          new Bonus(bonusDef.type, bonusDef.name, bonusDef.modifiers, rarity)
        );
      }
    }
  }
}

export class DamageText {
  constructor(x, y, dmg, isCrit) {
    this.x = x;
    this.oldX = x;
    this.renderX = x;
    this.y = y;
    this.oldY = y;
    this.renderY = y;

    this.dmg = dmg;
    this.isCrit = isCrit;
    this.alpha = 1;
  }

  update() {
    this.alpha -= 0.05;
  }
  preDraw(lagOffset) {
    this.renderX = (this.x - this.oldX) * lagOffset + this.oldX;
    this.renderY = (this.y - this.oldY) * lagOffset + this.oldY;
  }
  postDraw() {
    this.oldX = this.x;
    this.oldY = this.y;
  }
  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.globalAlpha = this.alpha;
    c.font = `bold ${this.isCrit ? 22 : 14}px sans-serif`;
    //c.strokeStyle = 'black';
    c.fillStyle = 'gold';
    //if (this.isCrit) c.fillStyle = 'orangered';
    c.fillText(this.dmg.toString(), this.renderX, this.renderY);
    //c.strokeText(this.dmg.toString(), this.x, this.y);
    c.restore();
    this.postDraw();
  }
}

export class Kamehameha extends Circle {
  constructor(x, y, itemInstance, clientX, clientY) {
    super(x, y, itemInstance.size, 'yellow', { x: 0, y: 0 });
    this.remainingFrames = 40;
    this.targetX = clientX;
    this.targetY = clientY;
    this.h = 5;
    this.w = this.r;
    this.angle =
      Math.PI / 2 + Math.atan2(this.y - this.targetY, this.x - this.targetX);
    this.shapeType = 'square';
    this.damage = itemInstance.damage;
  }

  update() {
    this.h += 30;
    if (this.remainingFrames > 30) {
      this.w++;
    } else if (this.w > 1) {
      this.w--;
    }
    this.remainingFrames -= 1;
  }

  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    c.transform(cos, sin, -sin, cos, this.renderX, this.renderY);
    c.beginPath();
    c.rect(0 - this.w / 2, 0 + player.r, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.restore();
    this.postDraw();
  }
}

export class SolarFlare extends Circle {
  constructor(x, y, itemInstance) {
    super(x, y, itemInstance.size, 'yellow', { x: 0, y: 0 });
    this.remainingFrames = 20;
    this.shapeType = 'circle';
    this.damage = itemInstance.damage;
  }

  update() {
    super.update();
    // if (this.remainingFrames > 30) {
    //   this.w++;
    // } else if (this.w > 1) {
    //   this.w--;
    // }
    if (this.remainingFrames > 10) {
      this.r += 8;
    } else {
      this.alpha -= 0.1;
    }
    this.remainingFrames -= 1;
  }
}

export class Slash extends Circle {
  constructor(x, y, itemInstance, color, vel, clientX, clientY) {
    super(x, y, itemInstance.size, color, vel);
    this.totalFrames = 14;
    this.remainingFrames = this.totalFrames;
    this.targetX = clientX;
    this.targetY = clientY;
    this.h = this.r;
    this.w = 20;
    //this.angle = Math.PI / 2 + Math.atan2(this.y - this.targetY, this.x - this.targetX);
    this.angle =
      Math.PI + Math.atan2(this.y - this.targetY, this.x - this.targetX);
    this.shapeType = 'square';
    this.damage = itemInstance.damage;
  }

  update() {
    this.x = player.x;
    this.y = player.y;
    this.angle -= Math.PI / this.totalFrames;
    this.remainingFrames -= 1;
  }

  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    c.transform(cos, sin, -sin, cos, this.renderX, this.renderY);
    c.beginPath();
    c.rect(0 - this.w / 2, 0 + player.r, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.restore();
    this.postDraw();
  }
}

// ability ideas
// orbiting projectiles
// AOE temporal field
// dash
// gravity field (throwable?)
// consider i-frames?
// bullet speed a bit weak?

// game ideas
// black hole spawns, transforms graphics rendering and different enemies?
// add life bar

// possible issue - mutli bullets dropping at same time?
