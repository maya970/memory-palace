import * as THREE from 'three';
import { BUILD_MAX, BUILD_MIN, Y_MIN, Y_MAX } from './palace.js';

const FALL = 10;
const SPREAD = 5;

function keyOf(x, y, z) {
  return `${x},${y},${z}`;
}

function parseKey(key) {
  return key.split(',').map(Number);
}

const VERT = `
uniform float time;
uniform float waves;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 p = position;
  vNormal = normal;
  if (waves > 0.5 && normal.y > 0.5) {
    p.y += sin(p.x * 1.8 + time * 2.2) * 0.045 + cos(p.z * 1.5 - time * 1.7) * 0.035;
  }
  vWorld = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const FRAG = `
uniform float time;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float ripple = sin(vWorld.x * 2.6 + time * 1.9) * sin(vWorld.z * 2.2 - time * 1.4);
  vec3 deep = vec3(0.05, 0.24, 0.44);
  vec3 bright = vec3(0.38, 0.72, 0.86);
  vec3 col = mix(deep, bright, 0.42 + ripple * 0.18 + max(vNormal.y, 0.0) * 0.16);
  float alpha = vNormal.y > 0.4 ? 0.58 : 0.78;
  gl_FragColor = vec4(col, alpha);
}
`;

export class WaterView {
  constructor(scene) {
    this.scene = scene;
    this.dirty = true;
    this.flowed = new Set();
    this.playerSources = new Set();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waves: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = null;
  }

  invalidate() {
    this.dirty = true;
  }

  markSource(x, y, z) {
    this.playerSources.add(keyOf(x, y, z));
  }

  forget(x, y, z) {
    const key = keyOf(x, y, z);
    this.playerSources.delete(key);
    this.flowed.delete(key);
  }

  update(now, settings) {
    this.material.uniforms.time.value = now * 0.001;
    this.material.uniforms.waves.value = settings.water === 'cube' ? 0 : 1;
  }

  clear() {
    this.dropMesh();
    this.flowed.clear();
    this.playerSources.clear();
    this.dirty = true;
  }

  dropMesh() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh = null;
  }

  rebuild(world, settings) {
    this.dropMesh();
    this.dirty = false;
    if (settings.water === 'cube') return;
    const positions = [];
    const normals = [];
    const add = (ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz) => {
      positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    };
    const quad = (a, b, c, d, n) => {
      add(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], n[0], n[1], n[2]);
      add(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], n[0], n[1], n[2]);
    };
    for (const [key, type] of world.blocks) {
      if (type !== 'water') continue;
      const [x, y, z] = parseKey(key);
      const top = world.get(x, y + 1, z) === 'water' ? 1 : 0.88;
      const faces = [
        [world.get(x, y + 1, z) !== 'water', [[x, y + top, z], [x + 1, y + top, z], [x + 1, y + top, z + 1], [x, y + top, z + 1]], [0, 1, 0]],
        [world.get(x, y - 1, z) !== 'water', [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [x, y, z]], [0, -1, 0]],
        [world.get(x, y, z + 1) !== 'water', [[x, y, z + 1], [x, y + top, z + 1], [x + 1, y + top, z + 1], [x + 1, y, z + 1]], [0, 0, 1]],
        [world.get(x, y, z - 1) !== 'water', [[x + 1, y, z], [x + 1, y + top, z], [x, y + top, z], [x, y, z]], [0, 0, -1]],
        [world.get(x + 1, y, z) !== 'water', [[x + 1, y, z + 1], [x + 1, y + top, z + 1], [x + 1, y + top, z], [x + 1, y, z]], [1, 0, 0]],
        [world.get(x - 1, y, z) !== 'water', [[x, y, z], [x, y + top, z], [x, y + top, z + 1], [x, y, z + 1]], [-1, 0, 0]],
      ];
      for (const [open, pts, n] of faces) {
        if (open) quad(pts[0], pts[1], pts[2], pts[3], n);
      }
    }
    if (!positions.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.scene.add(this.mesh);
  }

  tick(world, settings) {
    if (settings.water !== 'flow') return false;
    const keep = new Set();
    const add = [];
    const tryAdd = (x, y, z) => {
      if (x < BUILD_MIN || x > BUILD_MAX || z < BUILD_MIN || z > BUILD_MAX || y < Y_MIN || y > Y_MAX) return;
      if (world.isSolid(x, y, z)) return;
      const key = keyOf(x, y, z);
      if (world.get(x, y, z) === 'water') {
        keep.add(key);
        return;
      }
      add.push([x, y, z]);
      keep.add(key);
    };
    for (const [key, type] of world.blocks) {
      if (type !== 'water') continue;
      const [x, y, z] = parseKey(key);
      if (!world.isSolid(x, y - 1, z) && world.get(x, y - 1, z) !== 'water') {
        for (let d = 1; d <= FALL; d += 1) {
          const ny = y - d;
          if (ny < Y_MIN) break;
          if (world.isSolid(x, ny, z)) break;
          tryAdd(x, ny, z);
          if (world.get(x, ny, z) === 'water' && world.isSolid(x, ny - 1, z)) break;
        }
      }
      if (this.playerSources.has(key)) {
        for (let d = 1; d <= SPREAD; d += 1) {
          tryAdd(x + d, y, z);
          tryAdd(x - d, y, z);
          tryAdd(x, y, z + d);
          tryAdd(x, y, z - d);
        }
      }
    }
    let changed = false;
    for (const key of [...this.flowed]) {
      if (keep.has(key)) continue;
      const [x, y, z] = parseKey(key);
      if (world.get(x, y, z) === 'water' && !this.playerSources.has(key)) {
        world.setBlock(x, y, z, null);
        this.flowed.delete(key);
        changed = true;
      }
    }
    for (const [x, y, z] of add) {
      if (world.get(x, y, z) === 'water') continue;
      if (!world.setBlock(x, y, z, 'water', 'flow')) continue;
      this.flowed.add(keyOf(x, y, z));
      changed = true;
    }
    if (changed) this.dirty = true;
    return changed;
  }
}
