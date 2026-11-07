/**
 * 原创家具几何与桌面覆盖物。solid:false 的摆件仍可被射线选中。
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cache = new Map();

function box(x, y, z, w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x + w / 2 - 0.5, y + h / 2 - 0.5, z + d / 2 - 0.5);
  return geo;
}

export function geometryFromParts(parts) {
  const boxes = (parts || []).filter((part) => Array.isArray(part) && part.length >= 6).map((part) => box(...part.slice(0, 6).map(Number)));
  if (!boxes.length) return new THREE.BoxGeometry(0.5, 0.5, 0.5);
  return mergeGeometries(boxes) || new THREE.BoxGeometry(0.5, 0.5, 0.5);
}

function mesh(parts) {
  return geometryFromParts(parts);
}

export function setFurnitureShape(id, parts) {
  cache.set(id, geometryFromParts(parts));
}

const SHAPES = {
  oak_table: () => mesh([
    [0.02, 0.76, 0.02, 0.96, 0.06, 0.96],
    [0.04, 0.7, 0.04, 0.92, 0.06, 0.92],
    [0.08, 0, 0.08, 0.08, 0.7, 0.08],
    [0.84, 0, 0.08, 0.08, 0.7, 0.08],
    [0.08, 0, 0.84, 0.08, 0.7, 0.08],
    [0.84, 0, 0.84, 0.08, 0.7, 0.08],
    [0.1, 0.18, 0.1, 0.8, 0.05, 0.06],
    [0.1, 0.18, 0.84, 0.8, 0.05, 0.06],
    [0.1, 0.18, 0.1, 0.06, 0.05, 0.8],
    [0.84, 0.18, 0.1, 0.06, 0.05, 0.8],
  ]),
  round_table: () => mesh([
    [0.18, 0.74, 0.18, 0.64, 0.06, 0.64],
    [0.08, 0.74, 0.28, 0.2, 0.06, 0.44],
    [0.72, 0.74, 0.28, 0.2, 0.06, 0.44],
    [0.28, 0.74, 0.08, 0.44, 0.06, 0.2],
    [0.28, 0.74, 0.72, 0.44, 0.06, 0.2],
    [0.44, 0, 0.44, 0.12, 0.74, 0.12],
    [0.4, 0.28, 0.4, 0.2, 0.06, 0.2],
  ]),
  tea_table: () => mesh([
    [0.06, 0.4, 0.06, 0.88, 0.05, 0.88],
    [0.1, 0.36, 0.1, 0.8, 0.04, 0.8],
    [0.12, 0, 0.12, 0.07, 0.36, 0.07],
    [0.81, 0, 0.12, 0.07, 0.36, 0.07],
    [0.12, 0, 0.81, 0.07, 0.36, 0.07],
    [0.81, 0, 0.81, 0.07, 0.36, 0.07],
    [0.16, 0.12, 0.16, 0.68, 0.04, 0.04],
    [0.16, 0.12, 0.8, 0.68, 0.04, 0.04],
  ]),
  writing_desk: () => mesh([
    [0.01, 0.72, 0.06, 0.98, 0.06, 0.88],
    [0.02, 0.68, 0.72, 0.96, 0.16, 0.22],
    [0.04, 0, 0.1, 0.1, 0.72, 0.78],
    [0.86, 0, 0.1, 0.1, 0.72, 0.78],
    [0.16, 0.2, 0.12, 0.3, 0.22, 0.58],
    [0.54, 0.2, 0.12, 0.3, 0.22, 0.58],
    [0.2, 0.28, 0.1, 0.22, 0.04, 0.04],
    [0.58, 0.28, 0.1, 0.22, 0.04, 0.04],
    [0.08, 0.52, 0.08, 0.84, 0.04, 0.06],
  ]),
  oak_chair: () => mesh([
    [0.18, 0.42, 0.16, 0.64, 0.07, 0.62],
    [0.2, 0, 0.18, 0.08, 0.42, 0.08],
    [0.72, 0, 0.18, 0.08, 0.42, 0.08],
    [0.2, 0, 0.72, 0.08, 0.42, 0.08],
    [0.72, 0, 0.72, 0.08, 0.42, 0.08],
    [0.22, 0.16, 0.2, 0.56, 0.04, 0.06],
    [0.22, 0.16, 0.74, 0.56, 0.04, 0.06],
    [0.18, 0.49, 0.74, 0.64, 0.47, 0.08],
    [0.22, 0.58, 0.76, 0.16, 0.28, 0.04],
    [0.62, 0.58, 0.76, 0.16, 0.28, 0.04],
    [0.22, 0.9, 0.74, 0.56, 0.06, 0.08],
  ]),
  stool: () => mesh([
    [0.22, 0.46, 0.22, 0.56, 0.06, 0.56],
    [0.26, 0, 0.26, 0.08, 0.46, 0.08],
    [0.66, 0, 0.26, 0.08, 0.46, 0.08],
    [0.26, 0, 0.66, 0.08, 0.46, 0.08],
    [0.66, 0, 0.66, 0.08, 0.46, 0.08],
    [0.3, 0.18, 0.3, 0.4, 0.04, 0.04],
    [0.3, 0.18, 0.66, 0.4, 0.04, 0.04],
  ]),
  armchair: () => mesh([
    [0.1, 0.36, 0.12, 0.8, 0.12, 0.72],
    [0.08, 0, 0.12, 0.16, 0.36, 0.72],
    [0.76, 0, 0.12, 0.16, 0.36, 0.72],
    [0.1, 0.48, 0.72, 0.8, 0.4, 0.14],
    [0.08, 0.36, 0.12, 0.12, 0.28, 0.6],
    [0.8, 0.36, 0.12, 0.12, 0.28, 0.6],
  ]),
  sofa: () => mesh([
    [0.02, 0.32, 0.1, 0.96, 0.14, 0.72],
    [0, 0.46, 0.68, 1, 0.36, 0.2],
    [0, 0.32, 0.1, 0.12, 0.3, 0.58],
    [0.88, 0.32, 0.1, 0.12, 0.3, 0.58],
    [0.04, 0, 0.14, 0.14, 0.32, 0.14],
    [0.82, 0, 0.14, 0.14, 0.32, 0.14],
  ]),
  bench: () => mesh([
    [0.04, 0.4, 0.22, 0.92, 0.08, 0.56],
    [0.08, 0, 0.26, 0.1, 0.4, 0.48],
    [0.82, 0, 0.26, 0.1, 0.4, 0.48],
  ]),
  bed: () => mesh([
    [0.04, 0.08, 0.06, 0.08, 0.22, 0.08],
    [0.88, 0.08, 0.06, 0.08, 0.22, 0.08],
    [0.04, 0.08, 0.86, 0.08, 0.22, 0.08],
    [0.88, 0.08, 0.86, 0.08, 0.22, 0.08],
    [0.02, 0.22, 0.02, 0.96, 0.1, 0.96],
    [0.06, 0.32, 0.08, 0.88, 0.14, 0.84],
    [0.02, 0.22, 0.02, 0.96, 0.52, 0.08],
    [0.08, 0.46, 0.06, 0.28, 0.08, 0.22],
    [0.4, 0.46, 0.06, 0.28, 0.08, 0.22],
    [0.04, 0.7, 0.02, 0.92, 0.06, 0.08],
  ]),
  wardrobe: () => mesh([
    [0.08, 0.04, 0.16, 0.84, 0.9, 0.68],
    [0.06, 0.94, 0.14, 0.88, 0.06, 0.72],
    [0.1, 0, 0.18, 0.08, 0.04, 0.12],
    [0.82, 0, 0.18, 0.08, 0.04, 0.12],
    [0.1, 0, 0.7, 0.08, 0.04, 0.12],
    [0.82, 0, 0.7, 0.08, 0.04, 0.12],
    [0.12, 0.1, 0.14, 0.36, 0.76, 0.05],
    [0.52, 0.1, 0.14, 0.36, 0.76, 0.05],
    [0.48, 0.1, 0.14, 0.04, 0.76, 0.05],
    [0.4, 0.42, 0.12, 0.08, 0.04, 0.04],
    [0.8, 0.42, 0.12, 0.08, 0.04, 0.04],
    [0.16, 0.72, 0.14, 0.28, 0.08, 0.04],
    [0.56, 0.72, 0.14, 0.28, 0.08, 0.04],
  ]),
  cabinet: () => mesh([
    [0.08, 0, 0.16, 0.84, 0.78, 0.68],
    [0.14, 0.1, 0.12, 0.72, 0.28, 0.08],
    [0.14, 0.44, 0.12, 0.72, 0.26, 0.08],
  ]),
  nightstand: () => mesh([
    [0.16, 0, 0.16, 0.68, 0.52, 0.68],
    [0.22, 0.18, 0.12, 0.56, 0.16, 0.08],
    [0.18, 0.52, 0.18, 0.64, 0.04, 0.64],
  ]),
  dresser: () => mesh([
    [0.04, 0, 0.18, 0.92, 0.7, 0.64],
    [0.1, 0.08, 0.14, 0.8, 0.16, 0.08],
    [0.1, 0.28, 0.14, 0.8, 0.16, 0.08],
    [0.1, 0.48, 0.14, 0.8, 0.16, 0.08],
  ]),
  sideboard: () => mesh([
    [0.02, 0, 0.22, 0.96, 0.58, 0.56],
    [0.06, 0.58, 0.18, 0.88, 0.06, 0.64],
  ]),
  coat_rack: () => mesh([
    [0.46, 0, 0.46, 0.08, 0.92, 0.08],
    [0.18, 0.78, 0.46, 0.64, 0.06, 0.08],
    [0.28, 0, 0.28, 0.44, 0.06, 0.44],
  ]),
  screen: () => mesh([
    [0.08, 0, 0.46, 0.28, 0.96, 0.08],
    [0.36, 0, 0.42, 0.28, 0.96, 0.08],
    [0.64, 0, 0.48, 0.28, 0.96, 0.08],
  ]),
  chalkboard: () => mesh([
    [0.06, 0.12, 0.42, 0.88, 0.76, 0.08],
    [0.42, 0, 0.4, 0.16, 0.12, 0.16],
  ]),
  cloth: () => mesh([
    [0.01, 0.02, 0.01, 0.98, 0.04, 0.98],
    [0.01, -0.16, 0.01, 0.04, 0.18, 0.98],
    [0.95, -0.16, 0.01, 0.04, 0.18, 0.98],
    [0.01, -0.16, 0.01, 0.98, 0.18, 0.04],
    [0.01, -0.16, 0.95, 0.98, 0.18, 0.04],
  ]),
  sheet: () => mesh([
    [0.02, 0.02, 0.02, 0.96, 0.06, 0.96],
    [0.02, -0.12, 0.02, 0.04, 0.14, 0.96],
    [0.94, -0.12, 0.02, 0.04, 0.14, 0.96],
    [0.02, -0.1, 0.9, 0.96, 0.12, 0.08],
  ]),
  pillow: () => mesh([
    [0.2, 0, 0.16, 0.6, 0.14, 0.46],
    [0.24, 0.1, 0.2, 0.52, 0.08, 0.38],
  ]),
  cushion: () => mesh([
    [0.16, 0, 0.16, 0.68, 0.1, 0.68],
    [0.22, 0.08, 0.22, 0.56, 0.06, 0.56],
  ]),
  open_notebook: () => mesh([
    [0.1, 0, 0.16, 0.38, 0.04, 0.68],
    [0.52, 0, 0.16, 0.38, 0.04, 0.68],
    [0.46, 0, 0.16, 0.08, 0.1, 0.68],
    [0.14, 0.04, 0.2, 0.3, 0.02, 0.6],
    [0.56, 0.04, 0.2, 0.3, 0.02, 0.6],
    [0.12, 0.02, 0.18, 0.02, 0.06, 0.64],
    [0.86, 0.02, 0.18, 0.02, 0.06, 0.64],
  ]),
  letter_stack: () => mesh([
    [0.2, 0, 0.26, 0.6, 0.03, 0.48],
    [0.22, 0.03, 0.28, 0.56, 0.03, 0.44],
    [0.24, 0.06, 0.3, 0.52, 0.03, 0.4],
    [0.28, 0.09, 0.34, 0.22, 0.02, 0.16],
  ]),
  ink_pen: () => mesh([
    [0.42, 0.02, 0.12, 0.06, 0.04, 0.58],
    [0.43, 0.02, 0.7, 0.04, 0.04, 0.12],
    [0.4, 0.01, 0.08, 0.1, 0.06, 0.08],
  ]),
  pencil_cup: () => mesh([
    [0.34, 0, 0.34, 0.32, 0.04, 0.32],
    [0.36, 0.04, 0.36, 0.28, 0.2, 0.04],
    [0.36, 0.04, 0.6, 0.28, 0.2, 0.04],
    [0.36, 0.04, 0.36, 0.04, 0.2, 0.28],
    [0.6, 0.04, 0.36, 0.04, 0.2, 0.28],
    [0.44, 0.22, 0.4, 0.04, 0.32, 0.04],
    [0.52, 0.22, 0.46, 0.04, 0.38, 0.04],
    [0.4, 0.22, 0.5, 0.04, 0.26, 0.04],
  ]),
  inkwell: () => mesh([
    [0.34, 0, 0.34, 0.32, 0.16, 0.32],
    [0.4, 0.16, 0.4, 0.2, 0.08, 0.2],
  ]),
  desk_lamp: () => mesh([
    [0.3, 0, 0.3, 0.4, 0.05, 0.4],
    [0.46, 0.05, 0.46, 0.08, 0.28, 0.08],
    [0.48, 0.3, 0.4, 0.22, 0.06, 0.06],
    [0.36, 0.34, 0.3, 0.4, 0.16, 0.28],
    [0.4, 0.48, 0.34, 0.32, 0.04, 0.2],
  ]),
  candle: () => mesh([
    [0.43, 0.02, 0.43, 0.14, 0.03, 0.14],
    [0.445, 0.05, 0.445, 0.11, 0.30, 0.11],
    [0.47, 0.35, 0.47, 0.06, 0.09, 0.06],
  ]),
  teacup: () => mesh([
    [0.36, 0, 0.36, 0.28, 0.16, 0.28],
    [0.62, 0.04, 0.44, 0.12, 0.06, 0.12],
  ]),
  teapot: () => mesh([
    [0.3, 0.04, 0.3, 0.4, 0.28, 0.4],
    [0.42, 0.32, 0.42, 0.16, 0.1, 0.16],
    [0.7, 0.14, 0.42, 0.16, 0.08, 0.16],
    [0.22, 0.14, 0.42, 0.1, 0.16, 0.08],
  ]),
  vase: () => mesh([
    [0.38, 0, 0.38, 0.24, 0.12, 0.24],
    [0.34, 0.12, 0.34, 0.32, 0.28, 0.32],
    [0.4, 0.4, 0.4, 0.2, 0.16, 0.2],
  ]),
  fruit_bowl: () => mesh([
    [0.24, 0, 0.24, 0.52, 0.1, 0.52],
    [0.32, 0.1, 0.32, 0.16, 0.12, 0.16],
    [0.5, 0.1, 0.38, 0.16, 0.14, 0.16],
    [0.4, 0.1, 0.5, 0.14, 0.1, 0.14],
  ]),
  photo_frame: () => mesh([
    [0.22, 0.08, 0.44, 0.56, 0.08, 0.08],
    [0.22, 0.56, 0.44, 0.56, 0.08, 0.08],
    [0.22, 0.08, 0.44, 0.08, 0.56, 0.08],
    [0.7, 0.08, 0.44, 0.08, 0.56, 0.08],
    [0.3, 0.16, 0.46, 0.4, 0.4, 0.04],
    [0.44, 0, 0.46, 0.12, 0.08, 0.06],
  ]),
  clock: () => mesh([
    [0.32, 0.08, 0.42, 0.36, 0.36, 0.1],
    [0.46, 0, 0.44, 0.08, 0.08, 0.08],
  ]),
  glasses: () => mesh([
    [0.22, 0.02, 0.4, 0.2, 0.08, 0.16],
    [0.58, 0.02, 0.4, 0.2, 0.08, 0.16],
    [0.42, 0.04, 0.44, 0.16, 0.04, 0.08],
  ]),
  stamp: () => mesh([[0.36, 0, 0.36, 0.28, 0.12, 0.28]]),
  envelope: () => mesh([[0.2, 0, 0.32, 0.6, 0.04, 0.36]]),
  key_dish: () => mesh([
    [0.28, 0, 0.28, 0.44, 0.06, 0.44],
    [0.4, 0.06, 0.42, 0.2, 0.04, 0.08],
  ]),
  jewelry_box: () => mesh([
    [0.26, 0, 0.3, 0.48, 0.18, 0.4],
    [0.28, 0.18, 0.32, 0.44, 0.04, 0.36],
  ]),
  comb: () => mesh([[0.22, 0.02, 0.44, 0.56, 0.04, 0.12]]),
  plant_pot: () => mesh([
    [0.34, 0, 0.34, 0.32, 0.22, 0.32],
    [0.38, 0.22, 0.38, 0.08, 0.22, 0.08],
    [0.5, 0.22, 0.42, 0.08, 0.28, 0.08],
    [0.44, 0.22, 0.52, 0.08, 0.18, 0.08],
  ]),
  book_stack: () => mesh([
    [0.22, 0, 0.26, 0.56, 0.08, 0.48],
    [0.24, 0.08, 0.28, 0.52, 0.08, 0.44],
    [0.26, 0.16, 0.3, 0.48, 0.08, 0.4],
  ]),
  coat: () => mesh([
    [0.28, 0.12, 0.4, 0.44, 0.72, 0.16],
    [0.18, 0.52, 0.4, 0.16, 0.28, 0.16],
    [0.66, 0.52, 0.4, 0.16, 0.28, 0.16],
  ]),
  dress: () => mesh([
    [0.34, 0.48, 0.4, 0.32, 0.36, 0.14],
    [0.22, 0.08, 0.38, 0.56, 0.42, 0.2],
  ]),
  shirt: () => mesh([
    [0.26, 0.08, 0.4, 0.48, 0.18, 0.32],
    [0.3, 0.26, 0.42, 0.4, 0.08, 0.28],
  ]),
  scarf: () => mesh([
    [0.18, 0.04, 0.42, 0.64, 0.08, 0.16],
    [0.7, 0.04, 0.42, 0.1, 0.36, 0.16],
  ]),
  hat: () => mesh([
    [0.22, 0, 0.22, 0.56, 0.06, 0.56],
    [0.32, 0.06, 0.32, 0.36, 0.16, 0.36],
  ]),
  shoes: () => mesh([
    [0.18, 0, 0.28, 0.28, 0.12, 0.44],
    [0.54, 0, 0.28, 0.28, 0.12, 0.44],
  ]),
  robe: () => mesh([
    [0.26, 0.08, 0.38, 0.48, 0.8, 0.18],
    [0.42, 0.72, 0.36, 0.16, 0.16, 0.22],
  ]),
};

export function furnitureGeometry(type) {
  if (cache.has(type)) return cache.get(type);
  const make = SHAPES[type] || SHAPES[type.replace(/_(red|blue|linen|check|green|white|navy|rose|patch)$/, '')];
  if (!make) {
    if (type.startsWith('cloth_')) cache.set(type, SHAPES.cloth());
    else if (type.startsWith('sheet_') || type === 'quilt_patch') cache.set(type, SHAPES.sheet());
    else if (type.startsWith('pillow_')) cache.set(type, SHAPES.pillow());
    else return null;
    return cache.get(type);
  }
  const geo = make();
  cache.set(type, geo);
  return geo;
}

export const FURNITURE_BLOCKS = [
  { id: 'oak_table', name: '方桌', color: '#b5884a', group: '家具', furnish: 'table', look: 'wood' },
  { id: 'round_table', name: '圆桌', color: '#8a6844', group: '家具', furnish: 'table', look: 'wood' },
  { id: 'tea_table', name: '茶几', color: '#6d5336', group: '家具', furnish: 'table', look: 'wood' },
  { id: 'writing_desk', name: '书桌', color: '#7a5c3a', group: '家具', furnish: 'table', look: 'wood' },
  { id: 'oak_chair', name: '椅子', color: '#b5884a', group: '家具', furnish: 'seat', look: 'wood' },
  { id: 'stool', name: '凳子', color: '#8d6240', group: '家具', furnish: 'seat', look: 'wood' },
  { id: 'armchair', name: '扶手椅', color: '#7b4b2a', group: '家具', furnish: 'seat', look: 'cloth' },
  { id: 'sofa', name: '沙发', color: '#6a3a4a', group: '家具', furnish: 'seat', look: 'cloth' },
  { id: 'bench', name: '长凳', color: '#6d5336', group: '家具', furnish: 'seat', look: 'wood' },
  { id: 'bed', name: '床', color: '#d8c8a8', group: '家具', furnish: 'bed', look: 'cloth' },
  { id: 'wardrobe', name: '衣柜', color: '#5a4030', group: '家具', furnish: 'wardrobe', look: 'wood' },
  { id: 'cabinet', name: '柜子', color: '#6b4a2b', group: '家具', furnish: 'wardrobe', look: 'wood' },
  { id: 'nightstand', name: '床头柜', color: '#8c5a32', group: '家具', furnish: 'stand', look: 'wood' },
  { id: 'dresser', name: '五斗柜', color: '#4a3424', group: '家具', furnish: 'wardrobe', look: 'wood' },
  { id: 'sideboard', name: '餐边柜', color: '#7a5c3a', group: '家具', furnish: 'stand', look: 'wood' },
  { id: 'coat_rack', name: '衣帽架', color: '#6b4a2b', group: '家具', furnish: 'stand', look: 'wood' },
  { id: 'screen', name: '屏风', color: '#c4a070', group: '家具', furnish: 'stand', look: 'wood' },
  { id: 'chalkboard', name: '黑板', color: '#2a2a28', group: '家具', furnish: 'stand', noteHost: true, look: 'item' },

  { id: 'cloth_linen', name: '素色桌布', color: '#efe6d2', group: '布艺', place: 'cover', covers: ['table'], solid: false, look: 'cloth' },
  { id: 'cloth_red', name: '红桌布', color: '#c6453c', group: '布艺', place: 'cover', covers: ['table'], solid: false, look: 'cloth' },
  { id: 'cloth_blue', name: '蓝桌布', color: '#3a5ec9', group: '布艺', place: 'cover', covers: ['table'], solid: false, look: 'cloth' },
  { id: 'cloth_check', name: '格纹桌布', color: '#e6c229', group: '布艺', place: 'cover', covers: ['table'], solid: false, look: 'check' },
  { id: 'cloth_green', name: '绿桌布', color: '#3e9b45', group: '布艺', place: 'cover', covers: ['table'], solid: false, look: 'cloth' },
  { id: 'sheet_white', name: '白床单', color: '#f4f0e8', group: '布艺', place: 'cover', covers: ['bed'], solid: false, look: 'cloth' },
  { id: 'sheet_navy', name: '藏青床单', color: '#243868', group: '布艺', place: 'cover', covers: ['bed'], solid: false, look: 'cloth' },
  { id: 'sheet_rose', name: '玫瑰床单', color: '#d48aa0', group: '布艺', place: 'cover', covers: ['bed'], solid: false, look: 'cloth' },
  { id: 'quilt_patch', name: '拼布被子', color: '#c08050', group: '布艺', place: 'cover', covers: ['bed'], solid: false, look: 'check' },
  { id: 'pillow_white', name: '白枕头', color: '#f7f3ea', group: '布艺', place: 'cover', covers: ['bed', 'seat'], solid: false, look: 'cloth' },
  { id: 'pillow_blue', name: '蓝枕头', color: '#6bb6d6', group: '布艺', place: 'cover', covers: ['bed', 'seat'], solid: false, look: 'cloth' },
  { id: 'cushion', name: '坐垫', color: '#c6453c', group: '布艺', place: 'cover', covers: ['seat', 'bed'], solid: false, look: 'cloth' },

  { id: 'open_notebook', name: '摊开的笔记', color: '#f0e4bc', group: '小物', place: 'prop', noteHost: true, solid: false, look: 'item' },
  { id: 'letter_stack', name: '一叠信', color: '#efe3b8', group: '小物', place: 'prop', noteHost: true, solid: false, look: 'item' },
  { id: 'ink_pen', name: '笔', color: '#2a2420', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'pencil_cup', name: '笔筒', color: '#8c5a32', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'inkwell', name: '墨水瓶', color: '#1a2038', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'desk_lamp', name: '台灯', color: '#d8c48a', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'candle', name: '蜡烛', color: '#f6e6b8', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'teacup', name: '茶杯', color: '#f0e4d0', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'teapot', name: '茶壶', color: '#6a8a6a', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'vase', name: '花瓶', color: '#7aa0b8', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'fruit_bowl', name: '果盆', color: '#c46e48', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'photo_frame', name: '相框', color: '#6b4a2b', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'clock', name: '座钟', color: '#c9a020', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'glasses', name: '眼镜', color: '#3a3a3a', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'stamp', name: '印章', color: '#8a3d22', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'envelope', name: '信封', color: '#e8dcc0', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'key_dish', name: '钥匙碟', color: '#c8b090', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'jewelry_box', name: '首饰盒', color: '#8a45b5', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'comb', name: '梳子', color: '#d4a878', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'plant_pot', name: '盆栽', color: '#3e9b45', group: '小物', place: 'prop', solid: false, look: 'item' },
  { id: 'book_stack', name: '一叠书', color: '#8a3d22', group: '小物', place: 'prop', solid: false, look: 'item' },

  { id: 'coat', name: '外套', color: '#3a3a48', group: '衣橱', place: 'hang', solid: false, look: 'cloth' },
  { id: 'dress', name: '裙子', color: '#bd4a9b', group: '衣橱', place: 'hang', solid: false, look: 'cloth' },
  { id: 'shirt', name: '叠好的衬衫', color: '#e8e8e8', group: '衣橱', place: 'prop', solid: false, look: 'cloth' },
  { id: 'scarf', name: '围巾', color: '#c6453c', group: '衣橱', place: 'hang', solid: false, look: 'cloth' },
  { id: 'hat', name: '帽子', color: '#4a3424', group: '衣橱', place: 'prop', solid: false, look: 'cloth' },
  { id: 'shoes', name: '鞋子', color: '#3e2c20', group: '衣橱', place: 'prop', solid: false, look: 'cloth' },
  { id: 'robe', name: '长袍', color: '#3a5ec9', group: '衣橱', place: 'hang', solid: false, look: 'cloth' },
];

export function surfaceLift(spec) {
  if (!spec?.furnish) return 0;
  if (spec.furnish === 'table') return spec.id === 'tea_table' ? 0.42 : 0.8;
  if (spec.furnish === 'bed') return 0.46;
  if (spec.furnish === 'seat') return 0.48;
  if (spec.furnish === 'stand') return 0.58;
  if (spec.furnish === 'wardrobe') return 0.96;
  return 0;
}

export function sitsOnFurniture(held) {
  return held?.place === 'cover' || held?.place === 'prop';
}

export function canPlaceOn(held, supportType, nx, ny, nz) {
  const spec = held;
  if (!spec?.place) return true;
  if (!supportType) return false;
  if (spec.place === 'cover') return ny === 1 && spec.covers?.includes(supportType.furnish);
  if (spec.place === 'prop' || spec.place === 'hang') return nx !== 0 || ny !== 0 || nz !== 0;
  return true;
}
