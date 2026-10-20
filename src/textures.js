import * as THREE from 'three';
import { BLOCKS, WOOLS } from './blocks.js';

const cache = new Map();

function hash(x, y, seed) {
  let n = x * 374761393 + y * 668265263 + seed * 144067;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function canvas(draw) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  draw(c.getContext('2d'), 16, 16);
  return c;
}

function noise(ctx, seed, colors) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = hash(x, y, seed);
      ctx.fillStyle = colors[Math.min(colors.length - 1, Math.floor(n * colors.length))];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function toTexture(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function pack(top, side, bottom, transparent = false) {
  return {
    top: toTexture(top),
    side: toTexture(side),
    bottom: toTexture(bottom),
    icon: side.toDataURL(),
    transparent,
    uniform: top === side && side === bottom,
  };
}

function grassTextures() {
  const top = canvas((ctx) => noise(ctx, 1, ['#2f8f3a', '#3fa34a', '#4caf50', '#66bb6a']));
  const side = canvas((ctx) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (y < 4) {
          const n = hash(x, y, 2);
          ctx.fillStyle = y === 3 && n > 0.55 ? '#2e7d32' : n > 0.6 ? '#66bb6a' : '#43a047';
        } else {
          const n = hash(x, y, 3);
          ctx.fillStyle = n > 0.72 ? '#a67c52' : n > 0.4 ? '#8d6240' : '#6e4b32';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const bottom = canvas((ctx) => noise(ctx, 4, ['#6e4b32', '#8d6240', '#a67c52']));
  return pack(top, side, bottom);
}

function dirtTextures() {
  const face = canvas((ctx) => noise(ctx, 5, ['#6e4b32', '#8d6240', '#7a5638', '#a67c52']));
  return pack(face, face, face);
}

function stoneTextures() {
  const face = canvas((ctx) => noise(ctx, 6, ['#7d7d7d', '#8e8e8e', '#9a9a9a', '#6f6f6f']));
  return pack(face, face, face);
}

function plankTextures() {
  const face = canvas((ctx) => {
    const rows = ['#c49655', '#b5884a', '#a67b3d', '#c9a066'];
    for (let band = 0; band < 4; band++) {
      for (let y = band * 4; y < band * 4 + 4; y++) {
        for (let x = 0; x < 16; x++) {
          const n = hash(x, band, 7);
          ctx.fillStyle = n > 0.85 ? '#d7b57a' : rows[band];
          if (y === band * 4) ctx.fillStyle = '#8a6233';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  });
  return pack(face, face, face);
}

function logTextures() {
  const side = canvas((ctx) => {
    const cols = ['#6b4a2b', '#5c3e24', '#7d5a36', '#4e3420'];
    for (let x = 0; x < 16; x++) {
      const stripe = cols[x % cols.length];
      for (let y = 0; y < 16; y++) {
        const n = hash(x, y, 8);
        ctx.fillStyle = n > 0.9 ? '#3e2918' : stripe;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  const top = canvas((ctx) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const d = Math.sqrt(dx * dx + dy * dy);
        const ring = Math.floor(d);
        ctx.fillStyle = ring % 2 === 0 ? '#c4a06a' : '#a67c45';
        if (d > 7) ctx.fillStyle = '#6b4a2b';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  return pack(top, side, top);
}

function bookshelfTextures() {
  const planks = canvas((ctx) => {
    const rows = ['#c49655', '#b5884a', '#a67b3d', '#c9a066'];
    for (let band = 0; band < 4; band++) {
      for (let y = band * 4; y < band * 4 + 4; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = y === band * 4 ? '#8a6233' : rows[band];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  });
  const side = canvas((ctx) => {
    ctx.fillStyle = '#b5884a';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#6e4a28';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 7, 16, 2);
    ctx.fillRect(0, 15, 16, 1);
    const colors = ['#8c2f2f', '#2f4f8c', '#c4a15a', '#2f6e45', '#6b3f8c', '#8c3f5a', '#3f6f8c', '#d7d0c0', '#2c2c2c', '#c45a28'];
    const paintRow = (y0, seed) => {
      let x = 1;
      let i = seed;
      while (x < 15) {
        const w = i % 3 === 0 ? 2 : 1;
        const width = Math.min(w, 15 - x);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(x, y0, width, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(x, y0, width, 1);
        x += width;
        i++;
      }
    };
    paintRow(1, 1);
    paintRow(9, 4);
  });
  return pack(planks, side, planks);
}

function brickTextures() {
  const face = canvas((ctx) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 4);
        const offset = row % 2 ? 4 : 0;
        const mx = (x + offset) % 8 === 0;
        const my = y % 4 === 0;
        if (mx || my) ctx.fillStyle = '#d7c3b2';
        else {
          const n = hash(x, y, 9);
          ctx.fillStyle = n > 0.75 ? '#b56a56' : n > 0.4 ? '#a85b48' : '#8e4638';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  return pack(face, face, face);
}

function glassTextures() {
  const face = canvas((ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(186, 226, 240, 0.45)';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(3, 3, 4, 6);
  });
  return pack(face, face, face, true);
}

function bedrockTextures() {
  const face = canvas((ctx) => noise(ctx, 11, ['#2a2a2a', '#3a3a3a', '#1c1c1c', '#4a4a4a']));
  return pack(face, face, face);
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function woolTextures(hex) {
  const base = hexToRgb(hex);
  const face = canvas((ctx) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = hash(x, y, base.r + base.b + 3) - 0.5;
        const scale = 1 + n * 0.14;
        const r = Math.max(0, Math.min(255, Math.round(base.r * scale)));
        const g = Math.max(0, Math.min(255, Math.round(base.g * scale)));
        const b = Math.max(0, Math.min(255, Math.round(base.b * scale)));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  return pack(face, face, face);
}

let ready = false;

export function loadTextures() {
  if (ready) return cache;
  cache.set('grass', grassTextures());
  cache.set('dirt', dirtTextures());
  cache.set('stone', stoneTextures());
  cache.set('planks', plankTextures());
  cache.set('log', logTextures());
  cache.set('bookshelf', bookshelfTextures());
  cache.set('bricks', brickTextures());
  cache.set('glass', glassTextures());
  cache.set('bedrock', bedrockTextures());
  for (const wool of WOOLS) cache.set(wool.id, woolTextures(wool.color));
  ready = true;
  return cache;
}

export function texturesFor(type) {
  if (!ready) loadTextures();
  return cache.get(type) || cache.get('stone');
}

export function iconFor(type) {
  return texturesFor(type).icon;
}

export function blockColor(type) {
  return BLOCKS[type]?.color || '#ffffff';
}
