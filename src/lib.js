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
} from './constants.js';

import {
  rotate,
  randomScreenEdgeCoords,
  randomCoords,
  getRandomByWeight,
  getWeightMap,
  getRandomWeightMapIndex,
  radiansToDeg,
  rectCircleCollision,
  degreesToRad,
} from './util.js';

function strokeCircle(circle) {
  c.beginPath();
  c.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2, false);
  c.lineWidth = '2';
  c.strokeStyle = 'white';
  c.stroke();
  c.closePath();
  c.restore();
}

export class Sprite {
  constructor(x, y, r, color, vel, renderGlow, glowSize) {
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
    this.renderGlow = renderGlow;
    this.glowSize = glowSize;
    this.invulnerable = false;
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
    if (this.renderGlow) {
      c.shadowColor = this.color;
      c.shadowBlur = this.glowSize;
    }
    c.beginPath();
    c.arc(this.renderX, this.renderY, this.r, 0, Math.PI * 2, false);
    c.closePath();
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
    if (this.vel && !isNaN(this.vel.y)) this.y += this.vel.y;
    if (this.vel && !isNaN(this.vel.x)) this.x += this.vel.x;
  }

  applyGlobalScale() {
    //this.r = this.initialR * scaleMod;
  }

  applyGravity() {
    for (const bh of game.entities.blackHoles.value) {
      const angle = Math.atan2(bh.y - this.y, bh.x - this.x);
      const vel = {
        x: Math.cos(angle) * bh.pullForce,
        y: Math.sin(angle) * bh.pullForce,
      };
      this.vel.x += vel.x;
      this.vel.y += vel.y;
    }
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
      this.x - this.r * 2 > 0 &&
      this.x + this.r < canvas.width &&
      this.y - this.r > 0 &&
      this.y + this.r < canvas.height
    );
  }
}

export class Boss extends Sprite {
  constructor() {
    super(...arguments);
    this.speed = 1;
    this.bulletCooldown = 1000;
    this.bulletTick = 900;
    this.bulletSpeed = 6;
    this.damage = 0;
    this.damageReduction = 0.5;
    this.maxLife = (game.entities.player.value.level / 5) * 420;
    this.life = this.maxLife;
  }

  static spawn(coords) {
    if (!coords) coords = randomScreenEdgeCoords(150);
    game.entities.enemies.add(
      new Boss(coords.x, coords.y, 150, 'black', {
        x: 0,
        y: 0,
      })
    );
    // game.entities.abilityEffects.add(
    //   new LightningBeam(
    //     { x: 100, y: 100 },
    //     { x: canvas.width - 100, y: canvas.height - 100 }
    //   )
    // );
  }

  update() {
    super.update();
    this.updateBullets();
    this.followPlayer();
  }
  updateBullets() {
    this.bulletTick += window.animFrameDuration;
    if (this.bulletTick >= this.bulletCooldown) {
      this.shoot();
      this.bulletTick = 0;
    }
  }
  followPlayer() {
    const player = game.entities.player.value;
    let speedMod = this.speed + player.level / 8;
    if (speedMod <= 1) speedMod = 1;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.vel = {
      x: Math.cos(angle) * speedMod,
      y: Math.sin(angle) * speedMod,
    };
  }
  shoot() {
    const player = game.entities.player.value;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };
    game.entities.enemyBullets.add(
      new Bullet(this.x, this.y, 50, 'crimson', vel, false, 0, 20, 10, 1.5)
    );
  }
  takeDamage(damage) {
    this.life -= damage;
    if (this.life > 0) return [true, false];
    const evt = game.entities.events.value.find(
      (e) => e.name == `Blackball the great`
    );
    if (evt) {
      evt.cooldown = 0;
      evt.remainingMs = 0;
    }
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

export class Turret extends Sprite {
  constructor() {
    super(...arguments);
    this.bulletCooldown = 1500;
    this.bulletTick = 600;
    this.bulletSpeed = 2;
  }
  update() {
    super.update();
    this.updateBullets();
  }
  static spawn(coords) {
    if (!coords) coords = randomCoords();
    const rad = 42;
    const newItem = new Turret(coords.x, coords.y, rad, 'darkviolet', {
      x: 0,
      y: 0,
    });
    game.entities.turrets.add(newItem);
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
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };
    game.entities.enemyBullets.add(
      new Bullet(this.x, this.y, 20, 'purple', vel, false, 0, 10, 10, 1.2)
    );
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
  }
  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    let grd = c.createRadialGradient(
      this.renderX,
      this.renderY,
      this.r * 0.8,
      this.renderX,
      this.renderY,
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
    c.arc(this.renderX, this.renderY, this.r, 0, Math.PI * 2, false);
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
    this.dashVelocity = {
      x: 0,
      y: 0,
    };
    this.bulletCooldown = 400;
    this.bulletTick = 0;
    this.critChance = 10;
    this.critDamageMulti = 1.5;
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
    this.cooldownRefs = [];
    this.lastMouseMove = {
      clientX: 0,
      clientY: 0,
    };
    this.damage = 10;
    this.damageReduction = 0.1;
  }
  applyMaxSpeed() {
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
    const allowDash = game.settings.player.allowDash.value;
    if (allowDash && this.inputs.space && this.dashReady && !this.dashing) {
      this.dashCooldownMs = this.dashCooldown;
      this.dashing = true;
      this.dashReady = false;
      triggeredDash = true;
      this.dashVelocity = {
        x: 0,
        y: 0,
      };
    }
    const allowMove = game.settings.player.allowMove.value;
    if (allowMove) {
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

    this.vel.x += this.dashVelocity.x;
    this.vel.y += this.dashVelocity.y;
  }
  update() {
    this.applyGravity();
    this.applyVelocity();
    this.applyMaxSpeed();
    this.applyFriction();
    this.enforceMapBoundaries();
    super.update();
    this.updateBullets();
    this.updateAbilities();
    this.updateDash();
  }

  updateDash() {
    if (this.dashing) this.dashTick += window.animFrameDuration;
    if (this.dashTick > this.dashDuration) {
      this.dashTick = 0;
      this.dashing = false;
      this.dashVelocity = {
        x: 0,
        y: 0,
      };
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
      c.font = '14px sans-serif';
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
    const topOffset = this.renderY - this.r - height - gap;
    //c.restore();
    c.save();

    c.fillStyle = 'white';
    c.globalAlpha = 0.1;
    c.beginPath();
    c.arc(this.x, topOffset, height, 0, Math.PI * 2, false);
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
    c.arc(this.renderX, topOffset, height, -startAngle, -endAngle, true);
    c.arc(this.renderX, topOffset, 0, -startAngle, -endAngle, true);

    c.fill();
    c.closePath();
    //c.fillStyle = 'red';
    c.restore();
  }
  renderLife() {
    c.save();
    const maxWidth = canvas.width * 0.1 + this.maxLife;
    const height = 7;
    const curPercent = this.life / this.maxLife;
    const leftOffset = (canvas.width - maxWidth) / 2;
    const topOffset = 10;
    c.fillStyle = '#066206aa';
    c.fillRect(leftOffset, topOffset, maxWidth, height);
    c.fillStyle = 'green';
    c.fillRect(leftOffset, topOffset, maxWidth * curPercent, height);
    c.restore();
  }

  shootSingleBullet(clientX, clientY) {
    const angle = Math.atan2(clientY - this.y, clientX - this.x);
    const vel = {
      x: Math.cos(angle) * this.bulletSpeed,
      y: Math.sin(angle) * this.bulletSpeed,
    };
    game.entities.bullets.add(
      new Bullet(
        this.x,
        this.y,
        BULLET_SIZE,
        BULLET_COLOR,
        vel,
        false,
        0,
        this.damage,
        this.critChance,
        this.critDamageMulti
      )
    );
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
          this.items.splice(i, 1);
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
        this.x,
        this.y,
        clientX,
        clientY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread,
        true
      );
      const angle = Math.atan2(target.y - this.y, target.x - this.x);

      const vel = {
        x: Math.cos(angle) * this.bulletSpeed,
        y: Math.sin(angle) * this.bulletSpeed,
      };
      game.entities.bullets.add(
        new Bullet(
          this.x,
          this.y,
          BULLET_SIZE,
          BULLET_COLOR,
          vel,
          false,
          0,
          this.damage,
          this.critChance,
          this.critDamageMulti
        )
      );
    }

    if (bulletCount % 2 == 1) this.shootSingleBullet(clientX, clientY);

    for (let i = 1; i < maxOffset + 1; i++) {
      const target = rotate(
        this.x,
        this.y,
        clientX,
        clientY,
        (bulletCount % 2 == 0 && i == 1 ? 0.5 : i) * bulletSpread
      );
      const angle = Math.atan2(target.y - this.y, target.x - this.x);

      const vel = {
        x: Math.cos(angle) * this.bulletSpeed,
        y: Math.sin(angle) * this.bulletSpeed,
      };
      game.entities.bullets.add(
        new Bullet(
          this.x,
          this.y,
          BULLET_SIZE,
          BULLET_COLOR,
          vel,
          false,
          0,
          this.damage,
          this.critChance,
          this.critDamageMulti
        )
      );
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

    const bulletMods = this.items.filter(
      (i) => i.modifiers && i.modifiers.some((m) => m.key == 'bulletsFired')
    );
    if (!bulletMods.length) {
      this.shootSingleBullet(clientX, clientY);
    } else {
      this.shootMultipleBullets(clientX, clientY);
    }
  }
  onKill() {
    this.kills++;
  }
  onLevelUp() {
    this.xp = 1;
    if (this.level % 5 == 0) {
      const evt = EVENT_TYPES.find((e) => e.name == 'Prepare yourself!');
      if (!evt) throw new Error("failed to get event 'Prepare yourself'");
      game.entities.events.add({ ...evt });
    } else if (this.level % 3 == 0) {
      const evt = game.entities.events.random();
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
    critMulti
  ) {
    super(x, y, r, color, vel, renderGlow, glowSize);
    this.damage = damage;
    this.critChance = critChance;
    this.critMulti = critMulti;
  }
  handleEnemyCollision(e) {
    return Projectile.handleEnemyCollision(this, e);
  }
  static handleEnemyCollision(self, e) {
    if (!DEBUG_ENABLED && (self.invulnerable || e.invulnerable))
      return [false, false];
    const dist = Math.hypot(self.x - e.x, self.y - e.y);
    if (dist - e.r - self.r < 1) {
      let numParticles = e.r * 2;
      if (numParticles > 30) numParticles = 30;
      for (let i = 0; i < numParticles; i++) {
        game.entities.particles.add(
          new Particle(self.x, self.y, Math.random() * 2, 'darkred', {
            x: (Math.random() - 0.5) * (Math.random() * (2 + e.r / 6)),
            y: (Math.random() - 0.5) * (Math.random() * (2 + e.r / 6)),
          })
        );
      }
      let isCrit = false;
      if (self.critChance > 0) {
        isCrit = self.critChance / 100 > Math.random();
      }
      const damage = isCrit ? self.damage * self.critMulti : self.damage;
      const mitigatedDamage = damage - damage * e.damageReduction;
      game.entities.damageTexts.add(
        new DamageText(self.x, self.y, mitigatedDamage, isCrit)
      );
      if (e.invulnerable) return [true, false];
      return e.takeDamage(mitigatedDamage);
    }
    return [false, false];
  }
  update() {
    this.applyGravity();
    super.update();
  }
}

export class Bullet extends Projectile {
  //prettier-ignore
  constructor(x,y,r,color,vel,renderGlow,glowSize,damage,critChance,critMulti) {
    super(...arguments);
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
  }

  followPlayer() {
    const player = game.entities.player.value;
    let speedMod = this.speed + player.level / 5;
    if (speedMod <= 1) speedMod = 1;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.vel = {
      x: Math.cos(angle) * speedMod,
      y: Math.sin(angle) * speedMod,
    };

    // gsap.to(this.vel, {
    //   x: vel.x,
    //   y: vel.y,
    // });
  }
  update() {
    super.update();
    if (!this.fixed) {
      const player = game.entities.player.value;
      const dist = Math.hypot(this.x - player.x, this.y - player.y);
      if (dist - player.r - this.r < this.aggroRange) {
        this.followPlayer();
      }
      if (!this.enteredMap && this.inMap()) this.enteredMap = true;
      if (this.enteredMap) this.enforceMapBoundaries();
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

    const angle = Math.atan2(player.y - coords.y, player.x - coords.x);
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

  static setImage(enemy) {
    enemy.cur_frame = 0;
    enemy.cur_image = enemy.cur_image == 0 ? 1 : 0;
    const player = game.entities.player.value;
    let imgDir = enemy.x > player.x ? enemy.images.left : enemy.images.right;
    if (enemy.y > player.y - player.r)
      imgDir =
        enemy.x > player.x ? enemy.images.up.left : enemy.images.up.right;
    if (enemy.y < player.y + player.r)
      imgDir =
        enemy.x > player.x ? enemy.images.down.left : enemy.images.down.right;
    enemy.image = document.getElementById(imgDir[enemy.cur_image]);
  }

  takeDamage(damage) {
    if (this.r - damage > Enemy.minSize) {
      this.r -= damage;
      return [true, false];
    } else {
      return [true, true];
    }
  }
}

export class Particle extends Sprite {
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

export class Item extends Sprite {
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

    game.entities.items.add(newItem);
  }

  update() {
    this.angle = 0.03 * this.i;
    this.x = this.x + this.angle * Math.cos(this.angle);
    this.y = this.y + this.angle * Math.sin(this.angle);
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
      const newItemIndex = getRandomByWeight(bonuses);
      const bonusDef = bonuses[newItemIndex];

      if (!this.items.some((x) => x.name == bonusDef.name)) {
        let rarity = 0;
        if (bonusDef.rarity_weights) {
          const rarityWeightMap = getWeightMap(bonusDef.rarity_weights);
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
  constructor(x, y, damage, isCrit) {
    this.x = x;
    this.oldX = x;
    this.renderX = x;
    this.y = y;
    this.oldY = y;
    this.renderY = y;

    this.damage = Math.floor(damage);
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
    c.fillText(this.damage.toString(), this.renderX, this.renderY);
    //c.strokeText(this.dmg.toString(), this.x, this.y);
    c.restore();
    this.postDraw();
  }
}

export class Ability extends Sprite {
  constructor(x, y, r, color, vel, renderGlow, glowSize, damage, name) {
    super(x, y, r, color, vel, renderGlow, glowSize);
    this.damage = damage;
    const player = game.entities.player.value;
    this.critChance = player.critChance;
    this.critMulti = player.critDamageMulti;
    this.name = name;
  }
  handleEnemyCollision(e) {
    if (!DEBUG_ENABLED && e.invulnerable) return [false, false];
    if (this.shapeType == 'square') {
      const angle = radiansToDeg(this.angle);
      const rotatedEnemyCoords = rotate(this.x, this.y, e.x, e.y, angle, true);
      const projectedEnemy = {
        x: rotatedEnemyCoords.x,
        y: rotatedEnemyCoords.y,
        r: e.r,
      };
      if (DEBUG_ENABLED) this.color = 'yellow';
      if (rectCircleCollision(this, projectedEnemy)) {
        if (DEBUG_ENABLED) this.color = 'red';
        let isCrit = false;
        if (this.critChance > 0) {
          isCrit = this.critChance / 100 > Math.random();
        }
        const damage = isCrit ? this.damage * this.critMulti : this.damage;
        const mitigatedDamage = damage - damage * e.damageReduction;
        game.entities.damageTexts.add(
          new DamageText(e.x, e.y, mitigatedDamage, isCrit)
        );
        if (e.invulnerable) return [true, false];
        return e.takeDamage(mitigatedDamage);
      }
    } else {
      return Projectile.handleEnemyCollision(this, e);
    }

    return [false, false];
  }
}

export class Kamehameha extends Ability {
  constructor(x, y, itemInstance, clientX, clientY) {
    super(
      x,
      y,
      itemInstance.size,
      itemInstance.getColor(),
      { x: 0, y: 0 },
      false,
      0,
      itemInstance.damage,
      itemInstance.name
    );
    this.remainingFrames = 40;
    this.targetX = clientX;
    this.targetY = clientY;
    this.h = 5;
    this.w = this.r;
    this.angle =
      Math.PI / 2 + Math.atan2(this.y - this.targetY, this.x - this.targetX);
    this.shapeType = 'square';
  }

  update() {
    this.h += 30;
    if (this.remainingFrames > 30) {
      this.w++;
    } else if (this.w > 1) {
      this.w *= 0.9;
    }
    this.remainingFrames -= 1;
  }

  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.translate(this.x, this.y);
    c.rotate(this.angle);
    c.beginPath();
    c.shadowColor = this.color;
    c.shadowBlur = 20;
    c.rect(0 - this.w / 2, 0 + game.entities.player.value.r, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.restore();
    this.postDraw();
  }
}

export class SolarFlare extends Ability {
  constructor(x, y, itemInstance) {
    super(
      x,
      y,
      itemInstance.size,
      itemInstance.getColor(),
      { x: 0, y: 0 },
      true,
      70,
      itemInstance.damage,
      itemInstance.name
    );
    this.remainingFrames = 20;
    this.shapeType = 'circle';
    this.alpha = 0;
  }

  update() {
    super.update();
    if (this.remainingFrames > 10) {
      this.r += 8;
      this.alpha += 0.7;
    } else {
      this.alpha -= 0.7;
    }
    this.remainingFrames -= 1;
  }
}

export class Slash extends Ability {
  constructor(x, y, itemInstance, vel, clientX, clientY) {
    super(
      x,
      y,
      itemInstance.size,
      itemInstance.getColor(),
      vel,
      false,
      0,
      itemInstance.damage,
      itemInstance.name
    );
    this.totalFrames = 14;
    this.remainingFrames = this.totalFrames;
    this.targetX = clientX;
    this.targetY = clientY;
    this.h = this.r;
    this.w = 13;
    this.angle =
      Math.PI + Math.atan2(this.y - this.targetY, this.x - this.targetX);
    this.shapeType = 'square';
  }

  update() {
    const player = game.entities.player.value;
    this.x = player.x;
    this.y = player.y;
    this.angle -= Math.PI / this.totalFrames;
    this.remainingFrames -= 1;
  }

  draw(lagOffset) {
    this.preDraw(lagOffset);
    c.save();
    c.translate(this.x, this.y);
    c.rotate(this.angle);
    c.shadowColor = this.color;
    c.shadowBlur = 10;
    c.beginPath();
    c.rect(0 - this.w / 2, 0 + game.entities.player.value.r, this.w, this.h);
    c.fillStyle = this.color;
    c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.restore();
    this.postDraw();
  }
}

export class Vortex extends Ability {
  constructor(x, y, itemInstance) {
    super(
      x,
      y,
      itemInstance.size,
      itemInstance.getColor(),
      { x: 0, y: 0 },
      false,
      0,
      itemInstance.damage,
      itemInstance.name
    );
    this.remainingFrames = 1;
    this.shapeType = 'circle';
    this.angle = 0;
    this.destroyOnCollision = true;
    this.offset = game.entities.player.value.r;
  }
  update() {
    super.update();
    const player = game.entities.player.value;
    const { x, y } = rotate(
      player.x,
      player.y,
      player.x + this.offset,
      player.y + this.offset,
      this.angle
    );
    this.x = x;
    this.y = y;
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
