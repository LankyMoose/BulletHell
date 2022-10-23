'use strict';
import { canvas } from './constants.js';
import { Vec2 } from './lib.js';
/*
 CX @ Origin X  
 CY @ Origin Y
 X  @ Point X to be rotated
 Y  @ Point Y to be rotated  
 anticlock_wise @ to rotate point in clockwise direction or anticlockwise , default clockwise 
 return @ {x,y}  
*/
export function rotate(
  originX,
  originY,
  targetX,
  targetY,
  angle,
  anticlock_wise = false
) {
  let radians, cos, sin, nx, ny;
  if (angle == 0) {
    return { x: parseFloat(targetX), y: parseFloat(targetY) };
  }
  if (anticlock_wise) {
    radians = (Math.PI / 180) * angle;
  } else {
    radians = (Math.PI / -180) * angle;
  }
  cos = Math.cos(radians);
  sin = Math.sin(radians);
  nx = cos * (targetX - originX) + sin * (targetY - originY) + originX;
  ny = cos * (targetY - originY) - sin * (targetX - originX) + originY;
  return { x: nx, y: ny };
}

export function randomScreenEdgeCoords(rad) {
  const coords = {
    x: 0,
    y: 0,
  };
  if (Math.random() < 0.5) {
    // fixed X, random Y
    coords.x = Math.random() < 0.5 ? 0 - rad : canvas.width + rad;
    coords.y = Math.random() * canvas.height;
  } else {
    // fixed Y, random X
    coords.y = Math.random() < 0.5 ? 0 - rad : canvas.height + rad;
    coords.x = Math.random() * canvas.width;
  }
  return coords;
}

export function randomCoords(padding = 0) {
  return {
    x: padding + Math.random() * (canvas.width - padding),
    y: padding + Math.random() * (canvas.height - padding),
  };
}
export function randomAreaCoords(vec2, size) {
  return {
    x: vec2.x + Math.random() * size - size,
    y: vec2.y + Math.random() * size - size,
  };
}

export function circleRectCollision(circle, rect) {
  var distX = Math.abs(circle.pos.x - rect.pos.x - rect.w / 2);
  var distY = Math.abs(circle.pos.y - rect.pos.y - rect.h / 2);

  if (distX > rect.w / 2 + circle.r) {
    return false;
  }
  if (distY > rect.h / 2 + circle.r) {
    return false;
  }

  if (distX <= rect.w / 2) {
    return true;
  }
  if (distY <= rect.h / 2) {
    return true;
  }

  // also test for corner collisions
  var dx = distX - rect.w / 2;
  var dy = distY - rect.h / 2;
  return dx * dx + dy * dy <= circle.r * circle.r;
}

export function radiansToDeg(radians) {
  var pi = Math.PI;
  return radians * (180 / pi);
}
export function degreesToRad(degrees) {
  var pi = Math.PI;
  return degrees * (pi / 180);
}

export function getRandomIndexByWeight(arr) {
  const wm = getWeightMap(arr);
  return getRandomWeightMapIndex(wm);
}
export function getWeightMap(arr) {
  return [...arr.map((t, i) => Array(t.weight).fill(i))]
    .join()
    .split(',')
    .map((a) => parseInt(a));
}

export function getRandomWeightMapIndex(wm) {
  return wm[Math.floor(Math.random() * wm.length)];
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

//https://stackoverflow.com/questions/66849616/how-to-maintain-circle-velocity-after-colliding-with-a-square?noredirect=1&lq=1
