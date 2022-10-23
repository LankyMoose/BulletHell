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
      value: new Player(x, y, 24, 'white', {
        x: 0,
        y: 0,
      }),
      reset: () =>
        (this.entities.player.value = new Player(x, y, 24, 'white', {
          x: 0,
          y: 0,
        })),
    },
    abilityEffects: new EntityStore(),
    enemyAbilityEffects: new EntityStore(),
    blackHoles: new EntityStore(),
    bullets: new EntityStore(),
    enemyBullets: new EntityStore(),
    damageTexts: new EntityStore(),
    enemies: new EntityStore(),
    events: new EventStore(),
    particles: new EntityStore(),
    items: new EntityStore(),
    turrets: new EntityStore(),
    walls: new EntityStore(),
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

class EntityStore {
  constructor() {
    this.value = [];
  }
  add(e) {
    this.value.push(e);
  }
  reset() {
    this.value = [];
  }
  removeFlagged() {
    this.value = this.value.filter((e) => !e.removed);
  }
  update() {
    for (let i = 0; i < this.value.length; i++) {
      this.value[i].update();
    }
    this.removeFlagged();
  }
}
class EventStore extends EntityStore {
  constructor() {
    super();
  }
  random(type) {
    const filteredEvents = EVENT_TYPES.filter(
      (e) => e.type == type && e.weight > 0
    );
    const evtIndex = getRandomIndexByWeight(filteredEvents);
    return filteredEvents[evtIndex];
  }
}

export let game = new GameState();
export const resetGame = () => (game = new GameState());
