'use strict';
import { game } from './state';
import {
  FRICTION,
  BULLET_COLOR,
  BULLET_SIZE,
  ITEM_TYPES,
  ENEMY_SPEED,
  x,
  y,
  c,
  canvas,
  EVENT_TYPES,
  DEBUG_ENABLED,
  XP_REQ_MULTI_PER_LEVEL,
  BOSS_ITEMS,
  FONT,
  BACKGROUND_RGB,
} from './constants.js';

import {
  rotate,
  randomScreenEdgeCoords,
  randomCoords,
  getRandomIndexByWeight,
  getWeightMap,
  getRandomWeightMapIndex,
  radiansToDeg,
  randomAreaCoords,
  circleRectCollision,
  getRarityWeightMap,
} from './util.js';

function strokeCircle(circle) {
  c.beginPath();
  c.arc(circle.pos.x, circle.pos.y, circle.r, 0, Math.PI * 2, false);
  c.lineWidth = '2';
  c.strokeStyle = 'white';
  c.stroke();
  c.closePath();
  c.restore();
}

export class Sprite {
  constructor(x, y, r, color, vel, renderGlow, glowSize) {
    this.pos = new Vec2(x, y);
    this.oldPos = new Vec2(x, y);
    this.renderPos = new Vec2(x, y);
    this.r = r;
    this.initialR = r;
    this.killValue = Math.floor((r / 3) * 10);
    this.color = color;
    this.alpha = 1;
    this.vel = vel ? new Vec2(vel.x, vel.y) : undefined;
    this.fixed = false;
    this.shapeType = 'circle';
    this.renderGlow = renderGlow;
    this.glowSize = glowSize;
    this.glowColor = null;
    this.invulnerable = false;
    this.shadow_length = canvas.width;
    this.appliesLighting = false;
    this.collideBoundary = false;
    this.collideWalls = false;
  }

  preDraw(lagOffset) {
    //Use the `lagOffset` and previous x/y positions to
    //calculate the render positions
    this.renderPos.x = (this.pos.x - this.oldPos.x) * lagOffset + this.oldPos.x;
    this.renderPos.y = (this.pos.y - this.oldPos.y) * lagOffset + this.oldPos.y;
  }
  postDraw() {
    this.oldPos.x = this.pos.x;
    this.oldPos.y = this.pos.y;
  }
  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.globalAlpha = this.alpha;
    if (this.renderGlow) {
      c.shadowColor = this.glowColor ?? this.color;
      c.shadowBlur = this.glowSize;
    }
    c.beginPath();
    const r = Math.max(this.r, 0.1);
    c.arc(this.renderPos.x, this.renderPos.y, r, 0, Math.PI * 2, false);
    c.closePath();
    c.fillStyle = this.color;
    c.fill();

    if (this.image) {
      try {
        c.drawImage(
          this.image,
          this.renderPos.x - (r * 2) / 2,
          this.renderPos.y - (r * 2) / 2,
          r * 2,
          r * 2
        );
      } catch (error) {
        console.error('img failed to be drawn', this.image);
      }
    }
    c.restore();
    this.postDraw();
  }

  updatePosition() {
    if (this.fixed || !this.vel) return;
    this.pos = this.pos.add(this.vel);
  }

  applyGlobalScale() {
    //this.r = this.initialR * scaleMod;
  }

  applyGravity() {
    for (const bh of game.entities.blackHoles.value) {
      const angle = Math.atan2(bh.pos.y - this.pos.y, bh.pos.x - this.pos.x);
      this.vel = this.vel.add(
        new Vec2(Math.cos(angle) * bh.pullForce, Math.sin(angle) * bh.pullForce)
      );
    }
  }

  update() {
    if (this.appliesLighting) this.applyLighting();
    this.updatePosition();
    this.applyGlobalScale();
    if (this.collideWalls) this.enforceWallCollisions();
    if (this.collideBoundary) this.enforceMapBoundaries();
  }

  enforceMapBoundaries() {
    let collisionCount = 0;
    if (this.pos.x - this.r < 0) {
      this.pos.x = this.r;
      this.vel.x *= -1;
      collisionCount++;
    }
    if (this.pos.x + this.r > canvas.width) {
      this.pos.x = canvas.width - this.r;
      this.vel.x *= -1;
      collisionCount++;
    }
    if (this.pos.y - this.r < 0) {
      this.pos.y = this.r;
      this.vel.y *= -1;
      collisionCount++;
    }
    if (this.pos.y + this.r > canvas.height) {
      this.pos.y = canvas.height - this.r;
      this.vel.y *= -1;
      collisionCount++;
    }
    return collisionCount;
  }
  enforceWallCollisions() {
    //https://stackoverflow.com/questions/45370692/circle-rectangle-collision-response
    let collisionCount = 0;
    for (const wall of game.entities.walls.value) {
      if (circleRectCollision(this, wall)) {
        const NearestX = Math.max(
          wall.pos.x,
          Math.min(this.pos.x, wall.pos.x + wall.w)
        );
        const NearestY = Math.max(
          wall.pos.y,
          Math.min(this.pos.y, wall.pos.y + wall.h)
        );

        const dist = new Vec2(this.pos.x - NearestX, this.pos.y - NearestY);
        const dnormal = new Vec2(-dist.y, dist.x);

        const normal_angle = Math.atan2(dnormal.y, dnormal.x);
        const incoming_angle = Math.atan2(this.vel.y, this.vel.x);
        const theta = normal_angle - incoming_angle;
        this.vel = this.vel.rotate(2 * theta);
        collisionCount++;
      }
    }
    return collisionCount;
  }

  inMap(dist = 0) {
    return (
      this.pos.x - this.r > 0 - dist &&
      this.pos.x + this.r < canvas.width + dist &&
      this.pos.y - this.r > 0 - dist &&
      this.pos.y + this.r < canvas.height + dist
    );
  }

  followPlayer() {
    const player = game.entities.player.value;
    let speedMod = this.speed + player.level * 0.1;
    if (speedMod <= 1) speedMod = 1;
    const angle = Math.atan2(
      player.pos.y - this.pos.y,
      player.pos.x - this.pos.x
    );
    this.vel = new Vec2(Math.cos(angle) * speedMod, Math.sin(angle) * speedMod);
  }

  followTarget(v2) {
    const angle = Math.atan2(v2.y - this.pos.y, v2.x - this.pos.x);
    this.vel = new Vec2(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
  }

  getDots() {
    if (this.shapeType == 'square') {
      return {
        p1: {
          x: this.pos.x,
          y: this.pos.y,
        },
        p2: {
          x: this.pos.x + this.w,
          y: this.pos.y,
        },
        p3: {
          x: this.pos.x + this.w,
          y: this.pos.y + this.h,
        },
        p4: {
          x: this.pos.x,
          y: this.pos.y + this.h,
        },
      };
    }
    const full = (Math.PI * 2) / 4;
    return {
      p1: {
        x: this.pos.x + this.r * Math.sin(this.r),
        y: this.pos.y + this.r * Math.cos(this.r),
      },
      p2: {
        x: this.pos.x + this.r * Math.sin(this.r + full),
        y: this.pos.y + this.r * Math.cos(this.r + full),
      },
      p3: {
        x: this.pos.x + this.r * Math.sin(this.r + full * 2),
        y: this.pos.y + this.r * Math.cos(this.r + full * 2),
      },
      p4: {
        x: this.pos.x + this.r * Math.sin(this.r + full * 3),
        y: this.pos.y + this.r * Math.cos(this.r + full * 3),
      },
    };
  }
  drawShadow() {
    const dots = this.getDots();
    const angles = [];
    const points = [];

    const player = game.entities.player.value;

    for (const dot in dots) {
      const angle = Math.atan2(
        player.pos.y - dots[dot].y,
        player.pos.x - dots[dot].x
      );
      const endX =
        dots[dot].x + this.shadow_length * Math.sin(-angle - Math.PI / 2);
      const endY =
        dots[dot].y + this.shadow_length * Math.cos(-angle - Math.PI / 2);
      angles.push(angle);
      points.push({
        endX: endX,
        endY: endY,
        startX: dots[dot].x,
        startY: dots[dot].y,
      });
    }

    for (let i = points.length - 1; i >= 0; i--) {
      let n = i == 3 ? 0 : i + 1;
      c.beginPath();
      c.moveTo(points[i].startX, points[i].startY);
      c.lineTo(points[n].startX, points[n].startY);
      c.lineTo(points[n].endX, points[n].endY);
      c.lineTo(points[i].endX, points[i].endY);
      c.fillStyle = `rgba(${BACKGROUND_RGB}, .025)`;
      c.fill();
    }
  }

  distanceToPlayer() {
    const player = game.entities.player.value;
    return this.pos.distance(player.pos);
  }
  distToTarget(v2) {
    return this.pos.distance(v2);
  }

  applyLighting() {
    const player = game.entities.player.value;
    this.alpha = 0.15;
    const distToPlayer = this.distanceToPlayer();
    const percent = distToPlayer / player.lightRadius;

    if (distToPlayer < player.lightRadius) {
      this.alpha = 1.15 - 1 * percent;
    }
  }
}

export class Boss extends Sprite {
  constructor(x, y, r, color, vel, renderGlow, glowSize) {
    super(x, y, r, color, vel, renderGlow, glowSize);
    this.speed = 1;
    this.damage = 0; // no collision damage
    this.damageReduction = 0.5;
    this.maxLife = 420 + (game.entities.player.value.level / 5) * 420;
    this.life = this.maxLife;
    this.onDeath = null;
    this.phases = [];
    this.critChance = 10;
    this.critMulti = 1.5;
  }
  update() {
    super.update();
    this.followPlayer();
  }

  takeDamage(damage) {
    this.life -= damage;
    if (this.life > 0) {
      const percent = this.life / this.maxLife;
      const phasesToRemove = [];
      for (let i = 0; i < this.phases.length; i++) {
        const phase = this.phases[i];
        if (percent <= phase.lifePercent) {
          phasesToRemove.push(i);
          for (const fn of phase.functions) {
            fn();
          }
        }
      }
      if (phasesToRemove.length) {
        this.phases = this.phases.filter(
          (_, j) => phasesToRemove.indexOf(j) == -1
        );
      }
      return [true, false];
    }
    if (this.onDeath) this.onDeath();
    return [true, true];
  }

  renderLife() {
    c.save();

    const maxWidth = canvas.width * 0.3;
    const height = 10;
    const curPercent = this.life / this.maxLife;
    const leftOffset = canvas.width * 0.35;
    const topOffset = 120;
    c.fillStyle = '#8c0a10';
    c.fillRect(leftOffset, topOffset, maxWidth, height);
    c.fillStyle = '#fc1d26';
    c.fillRect(leftOffset, topOffset, maxWidth * curPercent, height);
    c.restore();
  }
}
export class ShooterBoss extends Boss {
  constructor(x, y, r, color, vel, renderGlow, glowSize) {
    super(x, y, r, color, vel, renderGlow, glowSize);
    this.bulletCooldown = 1000;
    this.bulletTick = 900;
    this.bulletSpeed = 5;
    this.damage = 6;
    const player = game.entities.player.value;
    this.phases = [
      {
        lifePercent: 0.88,
        functions: [
          () => {
            this.bulletCooldown = 333;
            setTimeout(() => {
              this.bulletCooldown = 1000;
            }, 1000);
          },
        ],
      },
      {
        lifePercent: 0.75,
        functions: [() => this.spawnPhase(3 + player.level / 2)],
      },
      {
        lifePercent: 0.44,
        functions: [
          () => {
            this.bulletCooldown = 250;
            setTimeout(() => {
              this.bulletCooldown = 1000;
            }, 1000);
          },
        ],
      },
      {
        lifePercent: 0.35,
        functions: [() => this.spawnPhase(8 + player.level / 2)],
      },
    ];
  }
  static spawn(coords) {
    if (!coords) coords = randomScreenEdgeCoords(150);
    const newBoss = new ShooterBoss(coords.x, coords.y, 150, '#111', {
      x: 0,
      y: 0,
    });
    game.entities.enemies.add(newBoss);
    return newBoss;
  }

  update() {
    super.update();
    this.updateBullets();
  }

  updateBullets() {
    this.bulletTick += window.animFrameDuration;
    if (this.bulletTick >= this.bulletCooldown) {
      this.shoot();
      this.bulletTick = 0;
    }
  }

  shoot() {
    const player = game.entities.player.value;
    const angle = Math.atan2(
      player.pos.y - this.pos.y,
      player.pos.x - this.pos.x
    );
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };
    game.entities.enemyBullets.add(
      new Bullet(
        this.pos.x,
        this.pos.y,
        50,
        'crimson',
        vel,
        false,
        0,
        20,
        10,
        1.5
      )
    );
  }
  spawnPhase(numTurrets) {
    this.invulnerable = true;
    this.fixed = true;
    this.color = '#333';
    for (let i = 0; i < numTurrets; i++) {
      setTimeout(Turret.spawn, i * 500);
    }
    setTimeout(() => {
      this.invulnerable = false;
      this.fixed = false;
      this.color = 'black';
    }, numTurrets * 500);
  }
}

export class AbilityBoss extends Boss {
  constructor(x, y, r, color, vel, renderGlow, glowSize) {
    super(x, y, r, color, vel, renderGlow, glowSize);
    const abilities = BOSS_ITEMS.filter((it) => it.isAbility);
    const randAbility = getRandomIndexByWeight(abilities);
    this.items = [{ ...abilities[randAbility] }];
    this.bulletCooldown = 500;
    this.bulletTick = 0;
    this.bulletSpeed = 4;
    this.damage = 6;
    this.bulletColor = '#710f0f';
    this.bulletSize = BULLET_SIZE * 3;
    this.phases = [
      {
        lifePercent: 0.86,
        functions: [
          () => {
            this.bulletHellPhase(100);
            setTimeout(() => this.bulletHellPhase(50), 150);
          },
        ],
      },
      {
        lifePercent: 0.75,
        functions: [
          () => {
            this.bulletHellPhase(100);
            setTimeout(() => this.bulletHellPhase(50), 150);
          },
        ],
      },
      {
        lifePercent: 0.66,
        functions: [() => this.bulletHellPhase(4e3)],
      },
      {
        lifePercent: 0.5,
        functions: [
          () => {
            this.bulletHellPhase(100);
            setTimeout(() => this.bulletHellPhase(50), 150);
          },
        ],
      },
      {
        lifePercent: 0.33,
        functions: [() => this.bulletHellPhase(4e3)],
      },
      {
        lifePercent: 0.22,
        functions: [
          () => {
            this.bulletHellPhase(100);
            setTimeout(() => this.bulletHellPhase(50), 150);
            setTimeout(() => this.bulletHellPhase(50), 200);
          },
        ],
      },
      {
        lifePercent: 0.11,
        functions: [
          () => {
            this.bulletHellPhase(100);
            setTimeout(() => this.bulletHellPhase(50), 150);
          },
        ],
      },
    ];
  }
  static spawn(coords) {
    if (!coords) coords = randomScreenEdgeCoords(100);
    const newBoss = new AbilityBoss(coords.x, coords.y, 100, '#3c1414', {
      x: 0,
      y: 0,
    });
    game.entities.enemies.add(newBoss);
    return newBoss;
  }
  update() {
    super.update();
    this.updateAbilities();
    this.updateBullets();
  }
  updateBullets() {
    this.bulletTick += window.animFrameDuration;
    if (this.bulletTick >= this.bulletCooldown) {
      const player = game.entities.player.value;
      this.shootMultipleBullets(player.pos.x, player.pos.y);
      this.bulletTick = 0;
    }
  }
  shootMultipleBullets(targetX, targetY) {
    let bulletCount = 0;
    const itemsToRemove = [];
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
          itemsToRemove.push(i);
        }
      }
    }
    this.items = this.items.filter((_, i) => {
      return itemsToRemove.indexOf(i) == -1;
    });
    if (bulletCount == 0) return;

    let bulletSpread = 15;
    if (360 / bulletCount < 10) bulletSpread = 360 / bulletCount;
    // how many proj per side?
    let maxOffset =
      bulletCount % 2 == 0 ? bulletCount / 2 : (bulletCount - 1) / 2;

    for (let i = 1; i < maxOffset + 1; i++) {
      const target = rotate(
        this.pos.x,
        this.pos.y,
        targetX,
        targetY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread,
        true
      );
      const angle = Math.atan2(target.y - this.pos.y, target.x - this.pos.x);

      const vel = {
        x: Math.cos(angle) * this.bulletSpeed,
        y: Math.sin(angle) * this.bulletSpeed,
      };
      game.entities.enemyBullets.add(
        new Bullet(
          this.pos.x,
          this.pos.y,
          this.bulletSize,
          this.bulletColor,
          vel,
          false,
          0,
          this.damage,
          this.critChance,
          this.critMulti
        )
      );
    }

    if (bulletCount % 2 == 1) {
      const angle = Math.atan2(targetY - this.pos.y, targetX - this.pos.x);
      const vel = {
        x: Math.cos(angle) * this.bulletSpeed,
        y: Math.sin(angle) * this.bulletSpeed,
      };
      game.entities.enemyBullets.add(
        new Bullet(
          this.pos.x,
          this.pos.y,
          this.bulletSize,
          this.bulletColor,
          vel,
          false,
          0,
          this.damage,
          this.critChance,
          this.critMulti
        )
      );
    }

    for (let i = 1; i < maxOffset + 1; i++) {
      const target = rotate(
        this.pos.x,
        this.pos.y,
        targetX,
        targetY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread
      );
      const angle = Math.atan2(target.y - this.pos.y, target.x - this.pos.x);

      const vel = {
        x: Math.cos(angle) * this.bulletSpeed,
        y: Math.sin(angle) * this.bulletSpeed,
      };
      game.entities.enemyBullets.add(
        new Bullet(
          this.pos.x,
          this.pos.y,
          this.bulletSize,
          this.bulletColor,
          vel,
          false,
          0,
          this.damage,
          this.critChance,
          this.critMulti
        )
      );
    }
  }
  updateAbilities() {
    const abilities = this.items.filter((i) => i.isAbility);
    for (let ability of abilities) {
      ability.remainingMs -= window.animFrameDuration;
      if (ability.remainingMs <= 0) {
        ability.trigger(
          this,
          ability,
          game.entities.player.value.pos.x,
          game.entities.player.value.pos.y
        );
        ability.remainingMs = ability.cooldown;
      }
    }
  }
  bulletHellPhase(dur) {
    this.invulnerable = true;
    this.fixed = true;
    const newItem = ITEM_TYPES.find((it) => it.name == 'Bullet Hell');
    this.items.push({ ...newItem, permanent: true });
    this.bulletTick = this.bulletCooldown;
    this.color = '#472626';
    setTimeout(() => {
      this.invulnerable = false;
      this.fixed = false;
      this.items = this.items.filter((i) => i.name != 'Bullet Hell');
      this.color = '#3c1414';
    }, dur);
  }
}

export class Turret extends Sprite {
  constructor() {
    super(...arguments);
    this.bulletCooldown = 1500;
    this.bulletTick = 600;
    this.bulletSpeed = 2;
    this.r = 0;
    this.appliesLighting = true;
    this.applyLighting();
    this.critChance = 10;
    this.critMulti = 1.5;
    this.damage = 0; // no collision damage
    this.damageReduction = 0.5;
    this.invulnerable = true;
  }
  update() {
    super.update();
    this.updateBullets();
    if (this.r == this.initialR) this.invulnerable = false;
    if (this.invulnerable) this.r++;
  }
  static spawn(coords) {
    const rad = 42;
    if (!coords) coords = randomCoords(rad * 2);
    const newTurret = new Turret(coords.x, coords.y, rad, 'darkviolet', {
      x: 0,
      y: 0,
    });
    game.entities.turrets.add(newTurret);
  }

  updateBullets() {
    this.bulletTick += window.animFrameDuration;
    if (this.bulletTick >= this.bulletCooldown) {
      this.shoot();
      this.bulletTick = 0;
    }
  }

  shoot() {
    const player = game.entities.player.value;
    const angle = Math.atan2(
      player.pos.y - this.pos.y,
      player.pos.x - this.pos.x
    );
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };
    game.entities.enemyBullets.add(
      new Bullet(
        this.pos.x,
        this.pos.y,
        20,
        'purple',
        vel,
        false,
        0,
        10,
        10,
        1.5
      )
    );
  }
  takeDamage(damage) {
    this.r -= damage;
    return this.r <= 0 || this.r < Enemy.minSize ? [true, true] : [true, false];
  }
}

export class BlackHole extends Sprite {
  constructor(x, y) {
    super(x, y, 0, 'black', { x: 0, y: 0 });
    this.totalFrames = Math.floor(2e3 / 16);
    this.remainingFrames = this.totalFrames;
    this.pullForce = 0.1;
  }

  update() {
    if (this.remainingFrames > this.totalFrames * 0.7) {
      this.r += 2 + this.remainingFrames / this.totalFrames;
    } else if (this.remainingFrames < this.totalFrames * 0.1) {
      this.r = this.r * 0.6;
    } else {
      this.r += 10 + 100 * (this.remainingFrames / this.totalFrames);
    }
    if (this.r < 0) this.r = 0.01;
    this.pullForce += this.remainingFrames / this.totalFrames / 5;
    this.remainingFrames -= 1;
    if (this.remainingFrames <= 0) this.removed = true;
  }
  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    let grd = c.createRadialGradient(
      this.renderPos.x,
      this.renderPos.y,
      this.r * 0.8,
      this.renderPos.x,
      this.renderPos.y,
      this.r
    );
    grd.addColorStop(0, 'black');
    grd.addColorStop(
      0.9,
      Math.random() < 0.2
        ? 'rgba(103, 181, 191, 0.5)'
        : 'rgba(103, 181, 191, 0.46)'
    );
    c.fillStyle = grd;

    c.beginPath();
    c.arc(this.renderPos.x, this.renderPos.y, this.r, 0, Math.PI * 2, false);
    c.closePath();
    c.fill();
    c.restore();

    this.postDraw();
  }

  static spawn() {
    const newBh = new BlackHole(x, y);
    game.entities.blackHoles.add(newBh);
  }
}

export class Player extends Sprite {
  constructor() {
    super(...arguments);
    this.speed = 0.4;
    this.bulletSpeed = 15;
    this.maxSpeed = 4;
    this.dashing = false;
    this.dashCooldown = 2e3;
    this.dashCooldownMs = 0;
    this.dashReady = true;
    this.dashDuration = 160;
    this.dashTick = 0;
    this.dashVelocity = new Vec2(0, 0);
    this.bulletCooldown = 400;
    this.bulletTick = 0;
    this.critChance = 10;
    this.critMulti = 1.5;
    this.kills = 0;
    this.inputs = {
      left: false,
      right: false,
      up: false,
      down: false,
      space: false,
    };
    this.items = [];
    this.level = 1;
    this.xp = 1;
    this.xpMulti = 1;
    this.next_level = 1000;
    this.life = 100;
    this.maxLife = 100;
    this.friction = 0.8;
    this.lastMouseMove = {
      clientX: 0,
      clientY: 0,
    };
    this.damage = 10;
    this.damageReduction = 0.1;
    this.lightRadius = 500;
    this.collideWalls = true;
    this.collideBoundary = true;
    this.bulletBounce = 0;

    this.stateCache = [];
    this.isRewinding = false;
    this.rewinds = 0;
    this.ghost = null;
  }
  cacheState() {
    this.stateCache.push({
      pos: this.pos,
      life: this.life,
      maxLife: this.maxLife,
      xp: this.xp,
      next_level: this.next_level,
      xpMulti: this.xpMulti,
      level: this.level,
      items: this.items,
    });
    if (this.stateCache.length > 60 * 2) {
      this.stateCache.shift();
    }
  }
  rewind() {
    this.isRewinding = true;
    this.invulnerable = true;
    this.rewinds--;
  }
  applyMaxSpeed() {
    if (!game.settings.player.applyMaxSpeed.value) return;
    if (!this.dashing && this.vel.x > this.maxSpeed) this.vel.x = this.maxSpeed;
    if (!this.dashing && this.vel.x < -this.maxSpeed)
      this.vel.x = -this.maxSpeed;
    if (!this.dashing && this.vel.y > this.maxSpeed) this.vel.y = this.maxSpeed;
    if (!this.dashing && this.vel.y < -this.maxSpeed)
      this.vel.y = -this.maxSpeed;
  }
  applyFriction() {
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
  }

  applyVelocity() {
    let triggeredDash = false;
    //prettier-ignore
    const anyDir = this.inputs.left || this.inputs.right || this.inputs.up || this.inputs.down;
    const allowDash = game.settings.player.allowDash.value;
    //prettier-ignore
    if (anyDir && allowDash && this.inputs.space && this.dashReady && !this.dashing) {
      this.dashCooldownMs = this.dashCooldown;
      this.dashing = true;
      this.dashReady = false;
      triggeredDash = true;
      this.dashVelocity = new Vec2(0, 0)
    }
    const allowMove = game.settings.player.allowMove.value;
    if (anyDir && allowMove) {
      if (this.inputs.left) {
        this.vel.x -= this.speed;
        if (triggeredDash) this.dashVelocity.x -= this.speed * 3;
      }
      if (this.inputs.right) {
        this.vel.x += this.speed;
        if (triggeredDash) this.dashVelocity.x += this.speed * 3;
      }
      if (this.inputs.down) {
        this.vel.y += this.speed;
        if (triggeredDash) this.dashVelocity.y += this.speed * 3;
      }
      if (this.inputs.up) {
        this.vel.y -= this.speed;
        if (triggeredDash) this.dashVelocity.y -= this.speed * 3;
      }
    }
    this.vel = this.vel.add(this.dashVelocity);
  }
  update() {
    if (this.isRewinding) {
      const stateCacheLen = this.stateCache.length;
      if (stateCacheLen > 0) {
        this.ghost = this.stateCache.pop();
      } else {
        this.isRewinding = false;
        Object.assign(this, this.ghost);
        this.ghost = null;
        this.invulnerable = false;
        this.life = this.maxLife / 2;
      }
    } else {
      this.applyGravity();
      this.applyVelocity();
      this.applyMaxSpeed();
      this.applyFriction();
      super.update();
      this.updateBullets();
      this.updateAbilities();
      this.updateDash();
      this.cacheState();
    }
  }

  renderGhost() {
    if (this.ghost) {
      c.save();
      c.globalAlpha = 0.8;
      c.beginPath();
      const r = Math.max(this.r, 0.1);
      c.arc(this.ghost.pos.x, this.ghost.pos.y, r, 0, Math.PI * 2, false);
      c.closePath();
      const gradient1 = c.createRadialGradient(
        this.ghost.pos.x,
        this.ghost.pos.y,
        0,
        this.ghost.pos.x,
        this.ghost.pos.y,
        r * 2
      );
      gradient1.addColorStop(0, 'rgba(255,255,255,1)');
      gradient1.addColorStop(0.5, 'rgba(255,255,255,.5)');
      gradient1.addColorStop(0.9, 'rgba(255,255,255,0)');
      c.fillStyle = gradient1;
      c.fill();
      c.restore();
    }
  }

  updateDash() {
    if (this.dashing) this.dashTick += window.animFrameDuration;
    if (this.dashTick > this.dashDuration) {
      this.dashTick = 0;
      this.dashing = false;
      this.dashVelocity = new Vec2(0, 0);
    }
    this.dashCooldownMs -= window.animFrameDuration;
    if (this.dashCooldownMs <= 0) {
      this.dashCooldownMs = 0;
      this.dashReady = true;
    }
  }

  updateAbilities() {
    if (!game.settings.player.allowAbilities.value) return;
    const abilities = this.items.filter((i) => i.isAbility);
    for (let ability of abilities) {
      ability.remainingMs -= window.animFrameDuration;
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
    if (DEBUG_ENABLED) strokeCircle(this);
  }
  renderAbilityCooldowns() {
    const abilities = this.items.filter((i) => i.isAbility);
    for (let i = 0; i < abilities.length; i++) {
      const ability = abilities[i];
      const iconHeight = 24;
      const iconWidth = 60;
      const gap = 10 * i;
      let leftOffset = i * iconWidth + canvas.width / 2;
      leftOffset -= abilities.length * (iconWidth / 2);
      const topOffset = 27;
      const curMs = ability.cooldown - ability.remainingMs;
      const percent = curMs / ability.cooldown;
      const padding = 4;
      c.save();
      c.textAlign = 'center';
      c.font = '14px ' + FONT;
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
  renderDashCooldown() {
    const height = 5;
    const gap = 5;
    const topOffset = this.renderPos.y - this.r - height - gap;
    //c.restore();
    c.save();

    c.fillStyle = 'white';
    c.globalAlpha = 0.1;
    c.beginPath();
    c.arc(this.pos.x, topOffset, height, 0, Math.PI * 2, false);
    c.fill();
    c.closePath();
    //c.restore();
    //c.save();

    const percent = this.dashCooldownMs / this.dashCooldown;
    c.globalAlpha = 1;
    c.fillStyle = '#4e7591';
    if (percent == 0) c.fillStyle = '#3186c2';
    c.beginPath();
    const offset = 2 * percent;
    const rotation = Math.PI / 2;
    const startAngle = offset * Math.PI + rotation;
    const endAngle = Math.PI * 2 + rotation;
    c.arc(this.renderPos.x, topOffset, height, -startAngle, -endAngle, true);
    c.arc(this.renderPos.x, topOffset, 0, -startAngle, -endAngle, true);

    c.fill();
    c.closePath();
    //c.fillStyle = 'red';
    c.restore();
  }
  renderLife() {
    c.save();
    const maxWidth = canvas.width * 0.1 + this.maxLife;
    const height = 7;
    let curPercent = this.life / this.maxLife;
    if (curPercent < 0) curPercent = 0;
    const leftOffset = (canvas.width - maxWidth) / 2;
    const topOffset = 10;
    c.fillStyle = '#066206aa';
    c.fillRect(leftOffset, topOffset, maxWidth, height);
    c.fillStyle = 'green';
    c.fillRect(leftOffset, topOffset, maxWidth * curPercent, height);
    c.restore();
  }

  shootSingleBullet(clientX, clientY, bounces) {
    const angle = Math.atan2(clientY - this.pos.y, clientX - this.pos.x);
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };

    game.entities.bullets.add(
      new Bullet(
        this.pos.x,
        this.pos.y,
        BULLET_SIZE,
        BULLET_COLOR,
        vel,
        false,
        0,
        this.damage,
        this.critChance,
        this.critMulti,
        bounces
      )
    );
  }

  shootMultipleBullets(clientX, clientY, bulletCount, bounces) {
    let bulletSpread = 10;
    if (360 / bulletCount < 10) {
      bulletSpread = 360 / bulletCount;
    }
    // how many proj per side?
    let maxOffset =
      bulletCount % 2 == 0 ? bulletCount / 2 : (bulletCount - 1) / 2;

    for (let i = 1; i < maxOffset + 1; i++) {
      const target = rotate(
        this.pos.x,
        this.pos.y,
        clientX,
        clientY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread,
        true
      );
      this.shootSingleBullet(target.x, target.y, bounces);
    }

    if (bulletCount % 2 == 1) this.shootSingleBullet(clientX, clientY, bounces);

    for (let i = 1; i < maxOffset + 1; i++) {
      const target = rotate(
        this.pos.x,
        this.pos.y,
        clientX,
        clientY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread
      );
      this.shootSingleBullet(target.x, target.y, bounces);
    }
  }
  updateBullets() {
    this.bulletTick += window.animFrameDuration;
    if (this.bulletTick >= this.bulletCooldown) {
      this.shootBullets();
      this.bulletTick = 0;
    }
  }
  shootBullets() {
    if (!game.settings.player.allowShoot.value) return;

    const { clientX, clientY } = this.lastMouseMove;

    const itemsToRemove = [];
    let bounces = 0;
    let bulletCount = 1;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.modifiers && item.modifiers.some((m) => m.key == 'bulletsFired'))
        bulletCount += item.modifiers
          .filter((m) => m.key == 'bulletsFired')
          .map((m) => m.amount)
          .reduce((a, b) => a + b, 0);

      if (
        item.modifiers &&
        item.modifiers.some((m) => m.key == 'bulletBounce')
      ) {
        bounces += item.modifiers
          .filter((m) => m.key == 'bulletBounce')
          .map((m) => m.amount)
          .reduce((a, b) => a + b, 0);
      }

      if (!item.permanent) {
        item.duration--;
        if (item.duration <= 0) {
          itemsToRemove.push(i);
        }
      }
    }

    if (itemsToRemove.length > 0)
      this.items = this.items.filter((_, i) => {
        return itemsToRemove.indexOf(i) == -1;
      });

    if (bulletCount == 1) {
      this.shootSingleBullet(clientX, clientY, bounces);
    } else {
      this.shootMultipleBullets(clientX, clientY, bulletCount, bounces);
    }
  }
  onKill() {
    this.kills++;
  }
  onLevelUp() {
    this.xp = 1;
    this.level++;
    this.next_level *= XP_REQ_MULTI_PER_LEVEL;
    this.life += this.level;
    if (this.life > this.maxLife) this.life = this.maxLife;

    if (this.level % 7 == 0) {
      game.enemySpawnTime -= 120;
    }

    if (this.level % 3 == 0) {
      const evt = EVENT_TYPES.find((e) => e.name == 'Prepare yourself!');
      if (!evt) throw new Error("failed to get event 'Prepare yourself'");
      game.entities.events.add({ ...evt });
    } else if (this.level % 2 == 0 || this.level > 10) {
      const evt = game.entities.events.random('');
      if (!evt) throw new Error('failed to get random event ');
      game.entities.events.add({ ...evt });
    }
  }
  handleBonusSelection(bonus) {
    if (bonus.type == 'attribute') {
      bonus.modifiers.forEach((m) => {
        const amount = m.amounts[bonus.rarity];
        this[m.key] += amount;
        if (m.triggers) {
          m.triggers.forEach((t) => t(this, amount));
        }
      });
    } else if (bonus.type == 'ability') {
      const itemDef = { ...ITEM_TYPES.find((it) => it.name == bonus.name) };
      this.items.push(itemDef);
      if (itemDef.onAdded) itemDef.onAdded(bonus);
    } else if ((bonus.type = 'upgrade')) {
      const playerItem = this.items.find((i) => i.name == bonus.name);
      bonus.modifiers.forEach((m) => {
        const amount = m.amounts[bonus.rarity];
        playerItem[m.key] += amount;
        if (m.triggers) {
          m.triggers.forEach((t) => t(this, amount));
        }
      });
    }
  }

  takeDamage(damage) {
    this.life -= damage;
    return this.life > 0 ? [true, false] : [true, true];
  }
}

export class Projectile extends Sprite {
  constructor(
    x,
    y,
    r,
    color,
    vel,
    renderGlow,
    glowSize,
    damage,
    critChance,
    critMulti,
    bounces
  ) {
    super(x, y, r, color, vel, renderGlow, glowSize);
    this.damage = damage;
    this.critChance = critChance;
    this.critMulti = critMulti;
    this.appliesLighting = true;
    this.applyLighting();
    this.bounces = bounces;
  }
  handleEnemyCollision(e) {
    return Projectile.handleEnemyCollision(this, e);
  }
  static handleEnemyCollision(self, e, vfxOnEnemy = false) {
    if (self.pos.distance(e.pos) - e.r - self.r < 1) {
      if (e.invulnerable) return [true, false];
      const r = e.r > 0.1 ? e.r : 0.1;
      let numParticles = r * 2;
      if (numParticles > 30) numParticles = 30;
      for (let i = 0; i < numParticles; i++) {
        game.entities.particles.add(
          new Particle(
            vfxOnEnemy ? e.pos : self.pos,
            Math.random() * 2,
            'darkred',
            {
              x: (Math.random() - 0.5) * (Math.random() * (2 + r / 6)),
              y: (Math.random() - 0.5) * (Math.random() * (2 + r / 6)),
            }
          )
        );
      }
      let isCrit = false;
      if (self.critChance > 0) {
        isCrit = self.critChance / 100 > Math.random();
      }
      const damage = isCrit ? self.damage * self.critMulti : self.damage;
      const mitigatedDamage = damage - damage * e.damageReduction;
      game.entities.damageTexts.add(
        new DamageText(vfxOnEnemy ? e.pos : self.pos, mitigatedDamage, isCrit)
      );
      return e.takeDamage(mitigatedDamage);
    }
    return [false, false];
  }
  update() {
    this.collideBoundary = this.bounces > 0;
    this.collideWalls = this.bounces > 0;

    this.applyGravity();
    this.applyLighting();
    this.updatePosition();
    this.applyGlobalScale();

    let bounceCount = 0;
    if (this.collideWalls) bounceCount += this.enforceWallCollisions();
    if (this.collideBoundary) bounceCount += this.enforceMapBoundaries();

    if (this.bounces > 0) {
      this.bounces -= bounceCount;
    } else if (!this.inMap(this.r * 2)) {
      this.removed = true;
    }
  }
}

export class Bullet extends Projectile {
  //prettier-ignore
  constructor(x,y,r,color,vel,renderGlow,glowSize,damage,critChance,critMulti, bounces) {
    super(x,y,r,color,vel,renderGlow,glowSize,damage,critChance,critMulti, bounces);
  }
}

export class Enemy extends Sprite {
  static minSize = 20;
  constructor(x, y, r, color, vel, renderGlow, glowSize) {
    super(x, y, r, color, vel, renderGlow, glowSize);
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
    this.damage = 5;
    this.damageReduction = 0.3;
    this.critChance = 10;
    this.critMulti = 1.5;
    this.appliesLighting = true;
    this.applyLighting();
    this.collideWalls = true;
  }

  update() {
    super.update();
    const player = game.entities.player.value;
    if (!this.fixed) {
      if (this.distanceToPlayer() - player.r - this.r < this.aggroRange) {
        this.followPlayer();
      }
      if (!this.collideBoundary && this.inMap()) this.collideBoundary = true;
      this.applyGravity();
    }
    this.cur_frame++;
    if (this.cur_frame > this.img_update_frames) Enemy.setImage(this);
  }
  draw(lagOffset) {
    super.draw(lagOffset);
    if (DEBUG_ENABLED) strokeCircle(this);
  }

  static spawn(config, coords) {
    if (!game.settings.enemies.allowSpawn.value) return;
    const player = game.entities.player.value;
    const max = 40 + player.level;
    const rad =
      config?.r ?? Math.random() * (max - Enemy.minSize) + Enemy.minSize;
    if (!coords) coords = randomScreenEdgeCoords(rad);

    const angle = Math.atan2(player.pos.y - coords.y, player.pos.x - coords.x);
    const vel = {
      x: Math.cos(angle) * ENEMY_SPEED,
      y: Math.sin(angle) * ENEMY_SPEED,
    };
    const newEnemy = new Enemy(coords.x, coords.y, rad, 'transparent', vel);
    newEnemy.fixed = config?.fixed;
    newEnemy.invulnerable = config?.invulnerable;
    Enemy.setImage(newEnemy);
    game.entities.enemies.add(newEnemy);
    if (!config?.fixed) newEnemy.followPlayer();
  }

  static spawnGroup(numTospawn) {
    const spread = 200 + numTospawn;
    const centerCoords = randomScreenEdgeCoords(spread);
    for (let i = 0; i < numTospawn; i++) {
      const coords = randomAreaCoords(centerCoords, spread);
      Enemy.spawn({ r: 20 }, coords);
    }
  }

  static setImage(enemy) {
    enemy.cur_frame = 0;
    enemy.cur_image = enemy.cur_image == 0 ? 1 : 0;
    const player = game.entities.player.value;
    let imgDir =
      enemy.pos.x > player.pos.x ? enemy.images.left : enemy.images.right;
    if (player.pos.y + player.r < enemy.pos.y - enemy.r)
      imgDir =
        enemy.pos.x > player.pos.x
          ? enemy.images.up.left
          : enemy.images.up.right;
    if (player.pos.y - player.r > enemy.pos.y + enemy.r)
      imgDir =
        enemy.pos.x > player.pos.x
          ? enemy.images.down.left
          : enemy.images.down.right;
    enemy.image = document.getElementById(imgDir[enemy.cur_image]);
  }

  takeDamage(damage) {
    this.r -= damage;
    return this.r <= 0 || this.r < Enemy.minSize ? [true, true] : [true, false];
  }
}

export class Particle extends Sprite {
  constructor(pos, r, color, vel, renderGlow, glowSize) {
    super(pos.x, pos.y, r, color, vel, renderGlow, glowSize);
    this.appliesLighting = true;
    this.applyLighting();
  }
  update() {
    super.update();
    this.r *= 0.9;
    this.vel.x *= FRICTION;
    this.vel.y *= FRICTION;
    if (this.r <= 0.1) this.removed = true;
  }
}

export class Item extends Sprite {
  constructor() {
    super(...arguments);
    this.itemType = null;
    this.itemLife = 100;
    this.i = 0;
  }

  static spawn(coords) {
    if (!coords) coords = randomCoords();
    const rad = 20;
    const newItem = new Item(coords.x, coords.y, rad, 'red', { x: 0, y: 0 });

    const spawnableItems = ITEM_TYPES.filter((it) => it.weight);

    const newItemIndex = getRandomIndexByWeight(spawnableItems);

    newItem.itemType = spawnableItems[newItemIndex];

    newItem.image = newItem.itemType.image;

    game.entities.items.add(newItem);
  }

  update() {
    const angle = 0.03 * this.i;
    this.pos = this.pos.add(
      new Vec2(angle * Math.cos(angle), angle * Math.sin(angle))
    );
    this.i++;
  }
}

export class Bonus {
  constructor(type, name, modifiers, rarity, color) {
    this.type = type;
    this.name = name;
    this.modifiers = modifiers;
    this.rarity = rarity;
    this.color = color;
  }
}
export class BonusSet {
  constructor() {
    this.items = [];
    this.generate();
  }
  generate() {
    while (this.items.length < 3) {
      const bonuses = game.bonuses.value;
      const newItemIndex = getRandomIndexByWeight(bonuses);
      const bonusDef = bonuses[newItemIndex];

      if (!this.items.some((x) => x.name == bonusDef.name)) {
        let rarity = 0;
        if (bonusDef.rarity_weights) {
          const rarityWeightMap = getRarityWeightMap(bonusDef.rarity_weights);
          rarity = getRandomWeightMapIndex(rarityWeightMap);
        }
        let color = null;
        if (bonusDef.type == 'ability') {
          const itemDef = ITEM_TYPES.find((i) => i.name == bonusDef.name);
          color = itemDef.getColor();
        }

        this.items.push(
          new Bonus(
            bonusDef.type,
            bonusDef.name,
            bonusDef.modifiers,
            rarity,
            color
          )
        );
      }
    }
  }
}

export class DamageText {
  constructor(pos, damage, isCrit) {
    this.pos = pos;
    this.oldPos = pos;
    this.renderPos = pos;

    this.damage = Math.floor(damage);
    this.isCrit = isCrit;
    this.alpha = 1;
  }

  update() {
    this.alpha -= 0.05;
    if (this.alpha <= 0) this.removed = true;
  }
  preDraw(lagOffset) {
    this.renderPos.x = (this.pos.x - this.oldPos.x) * lagOffset + this.oldPos.x;
    this.renderPos.y = (this.pos.y - this.oldPos.y) * lagOffset + this.oldPos.y;
  }
  postDraw() {
    this.oldPos.x = this.pos.x;
    this.oldPos.y = this.pos.y;
  }
  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.globalAlpha = this.alpha;
    c.font = `bold ${this.isCrit ? 22 : 14}px ` + FONT;
    //c.strokeStyle = 'black';
    c.fillStyle = 'gold';
    //if (this.isCrit) c.fillStyle = 'orangered';
    c.fillText(this.damage.toString(), this.renderPos.x, this.renderPos.y);
    //c.strokeText(this.dmg.toString(), this.x, this.y);
    c.restore();
    this.postDraw();
  }
}

export class Wall extends Sprite {
  constructor(pos, w, h) {
    const coords = pos ?? randomCoords(200);
    super(coords.x, coords.y, 200, 'blue');
    this.w = w ?? 200;
    this.h = h ?? 100;
    this.shapeType = 'square';
  }
  draw() {
    c.save();
    c.beginPath();
    c.rect(this.pos.x, this.pos.y, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.closePath();
    c.restore();
  }
  drawShadow() {
    super.drawShadow();
  }
}

export class Vec2 {
  constructor(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  distance(v) {
    let x = v.x - this.x;
    let y = v.y - this.y;

    return Math.sqrt(x * x + y * y);
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  normalize() {
    let magnitude = this.magnitude();

    return new Vec2(this.x / magnitude, this.y / magnitude);
  }

  multiply(val) {
    return typeof val === 'number'
      ? new Vec2(this.x * val, this.y * val)
      : new Vec2(this.x * val.x, this.y * val.y);
  }

  subtract(val) {
    return typeof val === 'number'
      ? new Vec2(this.x - val, this.y - val)
      : new Vec2(this.x - val.x, this.y - val.y);
  }

  add(val) {
    return typeof val === 'number'
      ? new Vec2(this.x + val, this.y + val)
      : new Vec2(this.x + val.x, this.y + val.y);
  }

  crossProductZ(v) {
    return this.x * v.y - v.x * this.y;
  }

  perpendicular() {
    return new Vec2(this.y, -this.x);
  }
  rotate(angle) {
    let tmp = new Vec2(0, 0);
    let cosAngle = Math.cos(angle);
    let sinAngle = Math.sin(angle);
    tmp.x = this.x * cosAngle - this.y * sinAngle;
    tmp.y = this.x * sinAngle + this.y * cosAngle;

    return tmp;
  }
}

export class Ability extends Sprite {
  constructor(pos, r, color, vel, renderGlow, glowSize, damage, name, owner) {
    super(pos.x, pos.y, r, color, vel, renderGlow, glowSize);
    this.damage = damage;
    this.owner = owner;
    this.critChance = owner.critChance;
    this.critMulti = owner.critMulti;
    this.name = name;
    this.usesFrames = true;
  }
  handleEnemyCollision(e) {
    if (this.shapeType == 'square') {
      const angle = radiansToDeg(this.angle);
      const rotatedEnemyCoords = rotate(
        this.pos.x,
        this.pos.y,
        e.pos.x,
        e.pos.y,
        angle,
        true
      );
      const projectedEnemy = {
        pos: {
          x: rotatedEnemyCoords.x,
          y: rotatedEnemyCoords.y,
        },
        r: e.r,
      };
      if (DEBUG_ENABLED) this.color = 'yellow';
      let isColliding = false;
      try {
        isColliding = circleRectCollision(projectedEnemy, this);
      } catch (error) {
        console.error(this.name, error);
      }
      if (isColliding) {
        if (e.invulnerable) return [true, false];
        if (DEBUG_ENABLED) this.color = 'red';
        let isCrit = false;
        if (this.critChance > 0) {
          isCrit = this.critChance / 100 > Math.random();
        }
        const damage = isCrit ? this.damage * this.critMulti : this.damage;
        const mitigatedDamage = damage - damage * e.damageReduction;
        game.entities.damageTexts.add(
          new DamageText(e.pos, mitigatedDamage, isCrit)
        );

        if (!e.takeDamage) {
          console.error('attempting to call takeDamage() on invalid entity', e);
          throw new Error('attempting to call takeDamage() on invalid entity');
        }
        return e.takeDamage(mitigatedDamage);
      }
    } else {
      return Projectile.handleEnemyCollision(this, e);
    }

    return [false, false];
  }

  update() {
    super.update();
    if (this.usesFrames && this.remainingFrames <= 0) this.removed = true;
  }

  handleFrames() {
    this.remainingFrames -= 1;
    if (this.remainingFrames <= 0) this.removed = true;
  }
}

export class Laser extends Ability {
  constructor(owner, itemInstance, clientX, clientY) {
    super(
      owner.pos,
      itemInstance.size,
      itemInstance.getColor(),
      { x: 0, y: 0 },
      false,
      0,
      itemInstance.damage,
      itemInstance.name,
      owner
    );
    this.remainingFrames = 40;
    this.targetX = clientX;
    this.targetY = clientY;
    this.h = 5;
    this.w = this.r;
    this.angle =
      Math.PI / 2 +
      Math.atan2(this.pos.y - this.targetY, this.pos.x - this.targetX);
    this.shapeType = 'square';
    this.owner = owner;
    this.cachedOwner = owner;
  }

  update() {
    if (this.owner) this.cachedOwner = this.owner;
    this.h += 30;
    if (this.remainingFrames > 30) {
      this.w++;
    } else if (this.w > 1) {
      this.w *= 0.9;
    }
    this.handleFrames();
  }

  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.translate(this.renderPos.x, this.renderPos.y);
    c.rotate(this.angle);
    c.beginPath();
    c.shadowColor = this.color;
    c.shadowBlur = 20;
    c.rect(0 - this.w / 2, 0 + this.cachedOwner.r, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.restore();
    this.postDraw();
  }
}

export class Explode extends Ability {
  constructor(owner, itemInstance) {
    super(
      owner.pos,
      itemInstance.size,
      itemInstance.getColor(),
      { x: 0, y: 0 },
      true,
      70,
      itemInstance.damage,
      itemInstance.name,
      owner
    );
    this.remainingFrames = 20;
    this.shapeType = 'circle';
    this.alpha = 0;
  }

  update() {
    super.update();
    if (this.remainingFrames > 10) {
      this.r += 10;
      this.alpha += 0.07;
    } else {
      this.alpha -= 0.07;
    }
    this.handleFrames();
  }
}

export class Slash extends Ability {
  constructor(owner, itemInstance, clientX, clientY) {
    super(
      owner.pos,
      itemInstance.size,
      itemInstance.getColor(),
      new Vec2(0, 0),
      false,
      0,
      itemInstance.damage,
      itemInstance.name,
      owner
    );
    this.totalFrames = 14;
    this.remainingFrames = this.totalFrames;
    this.targetX = clientX;
    this.targetY = clientY;
    this.h = this.r;
    this.w = 13;
    this.angle =
      Math.PI +
      Math.atan2(this.pos.y - this.targetY, this.pos.x - this.targetX);
    this.shapeType = 'square';
    this.owner = owner;
    this.cachedOwner = owner;
  }

  update() {
    if (this.owner) this.cachedOwner = this.owner;
    this.pos.x = this.cachedOwner.pos.x;
    this.pos.y = this.cachedOwner.pos.y;
    this.angle -= Math.PI / this.totalFrames;
    this.handleFrames();
  }

  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.translate(this.renderPos.x, this.renderPos.y);
    c.rotate(this.angle);
    c.shadowColor = this.color;
    c.shadowBlur = 10;
    c.beginPath();
    c.rect(0 - this.w / 2, 0 + this.cachedOwner.r, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.restore();
    this.postDraw();
  }
}

export class Vortex extends Ability {
  constructor(owner, itemInstance) {
    super(
      owner.pos,
      itemInstance.size,
      itemInstance.getColor(),
      { x: 0, y: 0 },
      false,
      0,
      itemInstance.damage,
      itemInstance.name,
      owner
    );
    this.remainingFrames = 1;
    this.shapeType = 'circle';
    this.angle = 0;
    this.destroyOnCollision = true;
    this.owner = owner;
    this.cachedOwner = owner;
    this.offset = owner.r;
  }
  update() {
    if (this.owner) this.cachedOwner = this.owner;
    super.update();
    const { x, y } = rotate(
      this.cachedOwner.pos.x,
      this.cachedOwner.pos.y,
      this.cachedOwner.pos.x + this.offset,
      this.cachedOwner.pos.y + this.offset,
      this.angle
    );
    this.pos = new Vec2(x, y);
    this.angle += 4;
    if (this.offset <= 50) this.offset++;
  }
  // draw(lagOffset) {
  //   this.preDraw(lagOffset);
  //   c.save();
  //   c.translate(this.x, this.y);
  //   c.rotate(this.angle);
  // }
}

export class Boomerang extends Ability {
  constructor(owner, itemInstance, clientX, clientY) {
    super(
      owner.pos,
      itemInstance.size,
      itemInstance.getColor(),
      new Vec2(0, 0),
      false,
      0,
      itemInstance.damage,
      itemInstance.name,
      owner
    );
    this.usesFrames = false;
    this.targetX = clientX;
    this.targetY = clientY;
    this.h = this.r;
    this.speed = 12;
    this.maxSpeed = 20;
    this.w = 12;
    this.angle = 0;
    this.shapeType = 'square';
    this.owner = owner;
    this.cachedOwner = { ...owner };
    this.reachedTarget = false;
    this.removed = false;
    this.distance = 0;
    this.maxDistance = itemInstance.maxDistance;
    this.setDirection();
  }
  setDirection() {
    const angle = Math.atan2(
      this.targetY - this.pos.y,
      this.targetX - this.pos.x
    );
    this.vel = new Vec2(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
  }
  update() {
    if (this.owner) this.cachedOwner = { ...this.owner };
    if (this.reachedTarget) {
      this.targetX = this.cachedOwner.pos.x;
      this.targetY = this.cachedOwner.pos.y;
      this.followTarget({ x: this.targetX, y: this.targetY });
    }

    if (!this.reachedTarget && this.distance >= this.maxDistance) {
      this.reachedTarget = true;
    } else if (
      this.reachedTarget &&
      this.distToTarget({ x: this.targetX, y: this.targetY }) <=
        this.cachedOwner.r
    ) {
      this.removed = true;
    }

    this.angle += 0.65;
    this.updatePosition();
    this.distance += this.speed;
  }
  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.translate(this.renderPos.x, this.renderPos.y);
    c.rotate(this.angle);
    c.shadowColor = this.color;
    c.shadowBlur = 10;
    c.beginPath();
    c.rect(-this.w / 2, -this.h / 2, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.closePath();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.restore();
    this.postDraw();
  }
}

export class LightningBeam extends Ability {
  constructor(pointA, pointB) {
    this.pointA = pointA;
    this.pointB = pointB;
    this.x = pointB.x - pointA.x;
    this.y = pointB.y - pointA.y;
    this.segments = 10;
    this.distance = Math.sqrt(this.x * this.x + this.y * this.y);
    this.width = this.distance / this.segments;
    this.remainingFrames = 500;
    this.shapeType = 'square';
  }

  update() {
    this.remainingFrames -= 1;
  }
  draw() {
    let prevX = this.pointA.x;
    let prevY = this.pointA.y;
    c.save();
    for (let i = 0; i <= this.segments; i++) {
      const magnitude = (this.width * i) / this.distance;
      let x3 = magnitude * this.pointB.x + (1 - magnitude) * this.pointA.x;
      let y3 = magnitude * this.pointB.y + (1 - magnitude) * this.pointA.y;

      if (i !== 0 && i !== this.segments) {
        x3 += Math.random() * this.width - this.width / 2;
        y3 += Math.random() * this.width - this.width / 2;
      }

      c.strokeStyle = 'red';
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(prevX, prevY);
      c.lineTo(x3, y3);
      c.closePath();
      c.stroke();
      prevX = x3;
      prevY = y3;
    }
    c.restore();
  }
}

//http://infochim.u-strasbg.fr/cgi-bin/libs/smilesDrawer-master/doc/Vector2.js.html
