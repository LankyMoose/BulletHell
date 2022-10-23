'use strict';
import { Player } from './lib';
import { x, y, BONUS_TYPES, EVENT_TYPES, HTML } from './constants';
import { getRandomIndexByWeight } from './util';
import { showLevelUpScreen } from './game';

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
      this.bonuses.value = this.bonuses.value.filter(
        (b) => b.name != bonus.name
      );
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
  _length = 0;
  value = [];
  constructor() {}
  get length() {
    return this._length;
  }

  add(e) {
    this.value.push(e);
    this._length++;
  }
  reset() {
    this.value = [];
    this._length = 0;
  }
  removeFlagged() {
    this.value = this.value.filter((e) => !e.removed);
    this._length = this.value.length;
  }
  update() {
    for (let i = 0; i < this._length; i++) {
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

  update() {
    for (let i = 0; i < this._length; i++) {
      const evt = this.value[i];
      if (!evt) throw new Error('trying to execute non-existing event');
      if (evt.activations == 0 && evt.remainingMs <= 0) {
        if (evt.onExit) {
          for (const fn of evt.onExit) {
            fn();
          }
        }
        evt.removed = true;
        if (evt.type == 'boss')
          game.nextFrameActionQueue.add(() => {
            HTML.levelUpHeadingEl.textContent = '';
            showLevelUpScreen();
          });
        continue;
      }
      evt.remainingMs -= window.animFrameDuration;

      if (evt.remainingMs <= 0 && evt.activations > 0) {
        evt.functions.forEach((f) => f(evt));
        if (evt.activations > 0) evt.remainingMs = evt.cooldown;
        evt.activations -= 1;
      }
    }
    this.removeFlagged();
  }
}

export let game = new GameState();
export const resetGame = () => (game = new GameState());
