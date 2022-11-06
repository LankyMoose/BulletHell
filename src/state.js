'use strict';
import { Camera, Player } from './lib';
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
  width = 3000;
  height = 3000;
  animId = {
    value: GameState.#defaults.animId(),
    set: (id) => (this.animId.value = id),
    reset: () => {
      window.cancelAnimationFrame(this.animId.value);
      this.animId.value = GameState.#defaults.animId();
    },
  };
  camera = new Camera(this.width, this.height);
  settings = {
    enemies: {
      spawnTime: {
        value: 500,
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
      value: new Player(this.width / 2, this.height / 2, 24, 'white', {
        x: 0,
        y: 0,
      }),
      reset: () =>
        (this.entities.player.value = new Player(
          this.width / 2,
          this.height / 2,
          24,
          'white',
          {
            x: 0,
            y: 0,
          }
        )),
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
    polygons: new EntityStore(),
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
    this.enemySpawnTime = 500;
    this.settings.enemies.spawnTime.value = 500;
  }
}

class EntityStore {
  #length = 0;
  value = [];
  constructor() {}
  get length() {
    return this.#length;
  }

  add(e) {
    this.value.push(e);
    this.#length++;
  }
  reset() {
    this.value = [];
    this.#length = 0;
  }
  removeFlagged() {
    this.value = this.value.filter((e) => !e.removed);
    this.#length = this.value.length;
  }
  update() {
    for (let i = 0; i < this.length; i++) {
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
    for (let i = 0; i < this.length; i++) {
      const evt = this.value[i];
      if (!evt) throw new Error('trying to execute non-existing event');
      if (evt.activations(evt) == 0 && evt.remainingMs <= 0) {
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

      if (evt.remainingMs <= 0 && evt.activations(evt) > 0) {
        evt.functions.forEach((f) => f(evt));
        if (evt.activations(evt) > 0) evt.remainingMs = evt.cooldown;
        evt._activations -= 1;
      }
    }
    this.removeFlagged();
  }
}

export let game = new GameState();
export const resetGame = () => (game = new GameState());
