'use strict';
import { Player } from './lib';
import { x, y, BONUS_TYPES, EVENT_TYPES } from './constants';
import { getRandomIndexByWeight } from './util';

class GameState {
  static #defaults = {
    score: () => 0,
    animId: () => null,
    allowEnemySpawn: () => true,
    allowPlayerShoot: () => true,
    playerDashTime: () => 2000,
    allowAbilities: () => true,
    entities: {
      abilityEffects: () => [],
      enemyAbilityEffects: () => [],
      bullets: () => [],
      enemyBullets: () => [],
      blackHoles: () => [],
      enemies: () => [],
      events: () => [],
      particles: () => [],
      items: () => [],
      turrets: () => [],
      damageTexts: () => [],
      player: () => new Player(x, y, 24, 'white', { x: 0, y: 0 }),
      // player: () =>
      //   Object.assign(new Player(x, y, 24, 'white', { x: 0, y: 0 }), {
      //     level: 7,
      //     xp: 1000,
      //     //invulnerable: true,
      //   }),
    },
    bonuses: () => [...BONUS_TYPES],
    running: () => false,
    nextFrameActionQueue: () => [],
  };
  animId = {
    value: GameState.#defaults.animId(),
    set: (id) => (this.animId.value = id),
    reset: () => {
      window.cancelAnimationFrame(this.animId.value);
      this.animId.value = GameState.#defaults.animId();
    },
  };
  settings = {
    enemies: {
      spawnTime: {
        value: 1000,
        set: (num) => {
          this.settings.enemies.spawnTime.value = num;
        },
        reset: () =>
          (this.settings.enemies.spawnTime.value = this.enemySpawnTime),
      },
      allowSpawn: {
        value: GameState.#defaults.allowEnemySpawn(),
        set: (bool) => (this.settings.enemies.allowSpawn.value = bool),
      },
    },
    player: {
      allowShoot: {
        value: GameState.#defaults.allowPlayerShoot(),
        set: (bool) => (this.settings.player.allowShoot.value = bool),
      },
      allowAbilities: {
        value: true,
        set: (bool) => (this.settings.player.allowAbilities.value = bool),
      },
      allowDash: {
        value: true,
        set: (bool) => (this.settings.player.allowDash.value = bool),
      },
      allowMove: {
        value: true,
        set: (bool) => (this.settings.player.allowMove.value = bool),
      },
      applyMaxSpeed: {
        value: true,
        set: (bool) => (this.settings.player.applyMaxSpeed.value = bool),
      },
      movementControls: 'keyboard',
    },
  };
  entities = {
    player: {
      value: GameState.#defaults.entities.player(),
      reset: () =>
        (this.entities.player.value = GameState.#defaults.entities.player()),
    },
    abilityEffects: {
      value: GameState.#defaults.entities.abilityEffects(),
      add: (ae) => this.entities.abilityEffects.value.push(ae),
      remove: (indxArray) => {
        this.entities.abilityEffects.value =
          this.entities.abilityEffects.value.filter(
            (_, i) => indxArray.indexOf(i) == -1
          );
      },
      reset: () =>
        (this.entities.abilityEffects.value =
          GameState.#defaults.entities.abilityEffects()),
    },
    enemyAbilityEffects: {
      value: GameState.#defaults.entities.enemyAbilityEffects(),
      add: (eae) => this.entities.enemyAbilityEffects.value.push(eae),
      remove: (indxArray) => {
        this.entities.enemyAbilityEffects.value =
          this.entities.enemyAbilityEffects.value.filter(
            (_, i) => indxArray.indexOf(i) == -1
          );
      },
      reset: () =>
        (this.entities.enemyAbilityEffects.value =
          GameState.#defaults.entities.enemyAbilityEffects()),
    },
    blackHoles: {
      value: GameState.#defaults.entities.blackHoles(),
      add: (bh) => this.entities.blackHoles.value.push(bh),
      remove: (indxArray) => {
        this.entities.blackHoles.value = this.entities.blackHoles.value.filter(
          (_, i) => indxArray.indexOf(i) == -1
        );
      },
      reset: () =>
        (this.entities.blackHoles.value =
          GameState.#defaults.entities.blackHoles()),
    },
    bullets: {
      value: GameState.#defaults.entities.bullets(),
      add: (blt) => this.entities.bullets.value.push(blt),
      remove: (indxArray) => {
        this.entities.bullets.value = this.entities.bullets.value.filter(
          (_, i) => indxArray.indexOf(i) == -1
        );
      },
      reset: () =>
        (this.entities.bullets.value = GameState.#defaults.entities.bullets()),
    },
    enemyBullets: {
      value: GameState.#defaults.entities.enemyBullets(),
      add: (blt) => this.entities.enemyBullets.value.push(blt),
      remove: (indxArray) => {
        this.entities.enemyBullets.value =
          this.entities.enemyBullets.value.filter(
            (_, i) => indxArray.indexOf(i) == -1
          );
      },
      reset: () =>
        (this.entities.enemyBullets.value =
          GameState.#defaults.entities.bullets()),
    },
    damageTexts: {
      value: GameState.#defaults.entities.damageTexts(),
      add: (bh) => this.entities.damageTexts.value.push(bh),
      remove: (indxArray) => {
        this.entities.damageTexts.value =
          this.entities.damageTexts.value.filter(
            (_, i) => indxArray.indexOf(i) == -1
          );
      },
      reset: () =>
        (this.entities.damageTexts.value =
          GameState.#defaults.entities.damageTexts()),
    },
    enemies: {
      value: GameState.#defaults.entities.enemies(),
      add: (bh) => this.entities.enemies.value.push(bh),
      remove: (indxArray) => {
        this.entities.enemies.value = this.entities.enemies.value.filter(
          (_, i) => indxArray.indexOf(i) == -1
        );
      },
      removeKilled: () => {
        this.entities.enemies.value = this.entities.enemies.value.filter(
          (e) => !e.killed
        );
      },
      reset: () =>
        (this.entities.enemies.value = GameState.#defaults.entities.enemies()),
    },
    events: {
      value: GameState.#defaults.entities.events(),
      add: (evt) => this.entities.events.value.push(evt),
      remove: (indxArray) => {
        this.entities.events.value = this.entities.events.value.filter(
          (_, i) => indxArray.indexOf(i) == -1
        );
      },
      reset: () =>
        (this.entities.events.value = GameState.#defaults.entities.events()),
      random: (type) => {
        const filteredEvents = EVENT_TYPES.filter(
          (e) => e.type == type && e.weight > 0
        );
        const evtIndex = getRandomIndexByWeight(filteredEvents);
        return filteredEvents[evtIndex];
      },
    },
    particles: {
      value: GameState.#defaults.entities.particles(),
      add: (evt) => this.entities.particles.value.push(evt),
      remove: (indxArray) => {
        this.entities.particles.value = this.entities.particles.value.filter(
          (_, i) => indxArray.indexOf(i) == -1
        );
      },
      reset: () =>
        (this.entities.particles.value =
          GameState.#defaults.entities.particles()),
    },
    items: {
      value: GameState.#defaults.entities.items(),
      add: (evt) => this.entities.items.value.push(evt),
      remove: (indxArray) => {
        this.entities.items.value = this.entities.items.value.filter(
          (_, i) => indxArray.indexOf(i) == -1
        );
      },
      reset: () =>
        (this.entities.items.value = GameState.#defaults.entities.items()),
    },
    turrets: {
      value: GameState.#defaults.entities.turrets(),
      add: (evt) => this.entities.turrets.value.push(evt),
      remove: (indxArray) => {
        this.entities.turrets.value = this.entities.turrets.value.filter(
          (_, i) => indxArray.indexOf(i) == -1
        );
      },
      reset: () =>
        (this.entities.turrets.value = GameState.#defaults.entities.turrets()),
    },
  };
  score = {
    value: GameState.#defaults.score(),
    add: (num) => (this.score.value += num),
    reset: () => (this.score.value = GameState.#defaults.score()),
  };
  bonuses = {
    value: GameState.#defaults.bonuses(),
    add: (bonus) => this.bonuses.value.push(bonus),
    remove: (bonus) => {
      for (let i = 0; i < this.bonuses.value.length; i++) {
        if (this.bonuses.value[i].name == bonus.name) {
          this.bonuses.value.splice(i, 1);
        }
      }
    },
    reset: () => (this.bonuses = GameState.#defaults.bonuses()),
  };
  running = {
    value: GameState.#defaults.running(),
    set: (bool) => (this.running.value = bool),
    reset: () => (this.running.value = GameState.#defaults.running()),
  };
  nextFrameActionQueue = {
    value: GameState.#defaults.nextFrameActionQueue(),
    add: (fn) => this.nextFrameActionQueue.value.push(fn),
    reset: () => {
      this.nextFrameActionQueue.value =
        GameState.#defaults.nextFrameActionQueue();
      // console.log(
      //   'nextFrameActionQueue reset',
      //   this.nextFrameActionQueue.value
      // );
    },
  };

  constructor() {
    this.enemySpawnTime = 1000;
    this.settings.enemies.spawnTime.value = 1000;
  }
}

export let game = new GameState();
export const resetGame = () => (game = new GameState());
