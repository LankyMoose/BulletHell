import { canvas } from './constants.js';
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

export function randomCoords() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
  };
}
