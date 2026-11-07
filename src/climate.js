import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { currentGraphics } from './graphics.js';

export const WEATHERS = {
  clear: {
    label: '晴', wet: 0, snow: 0, puddle: 0, rain: 0, flakes: 0,
    fog: 0.0048, fogColor: 0x9ec4e8, sky: 0x87c5ea,
    sun: 2.55, hemi: 0.72, sunColor: 0xfff1d0, bloom: 0.26, shafts: 0.9,
  },
  rain: {
    label: '雨', wet: 0.84, snow: 0, puddle: 0.78, rain: 1, flakes: 0,
    fog: 0.02, fogColor: 0x6d7682, sky: 0x5c6570,
    sun: 0.5, hemi: 0.34, sunColor: 0xc8d0d8, bloom: 0.16, shafts: 0.12,
  },
  storm: {
    label: '雷暴', wet: 1, snow: 0, puddle: 0.95, rain: 1.7, flakes: 0,
    fog: 0.032, fogColor: 0x2e343c, sky: 0x252a32,
    sun: 0.18, hemi: 0.2, sunColor: 0x8899aa, bloom: 0.12, shafts: 0.04,
  },
  mist: {
    label: '雾', wet: 0.28, snow: 0, puddle: 0.12, rain: 0, flakes: 0,
    fog: 0.046, fogColor: 0xc4b8a6, sky: 0xccc3b4,
    sun: 0.72, hemi: 0.46, sunColor: 0xe8dcc8, bloom: 0.22, shafts: 0.28,
  },
  snow: {
    label: '雪', wet: 0, snow: 0.94, puddle: 0, rain: 0, flakes: 1,
    fog: 0.016, fogColor: 0xd5e2ee, sky: 0xdbe6f2,
    sun: 1.3, hemi: 0.64, sunColor: 0xf7fbff, bloom: 0.22, shafts: 0.32,
  },
  dusk: {
    label: '黄昏', wet: 0, snow: 0, puddle: 0, rain: 0, flakes: 0,
    fog: 0.014, fogColor: 0xb08a62, sky: 0xb08a62,
    sun: 2.05, hemi: 0.36, sunColor: 0xffc17a, bloom: 0.48, shafts: 1,
  },
};

export const climate = {
  uWet: { value: 0 },
  uSnow: { value: 0 },
  uPuddle: { value: 0 },
};

let pmrem;
let envTarget;
let bakedName = '';

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = `
varying vec3 vDir;
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 ground;
void main() {
  vec3 n = normalize(vDir);
  vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.62, n.y));
  col = mix(ground, col, smoothstep(-0.4, 0.06, n.y));
  gl_FragColor = vec4(col, 1.0);
}
`;

function isMetal(type) {
  return type === 'gold' || type === 'iron' || type === 'copper';
}

function isGlassy(type) {
  return type === 'water' || type === 'ice' || type === 'glass' || type === 'diamond';
}

export function makeSurface(map, transparent, type) {
  const prop = BLOCKS[type]?.solid === false;
  const shared = {
    map,
    transparent,
    alphaTest: transparent ? 0.15 : 0,
    depthWrite: prop ? true : !transparent,
    polygonOffset: prop,
    polygonOffsetFactor: prop ? -2 : 0,
    polygonOffsetUnits: prop ? -2 : 0,
    side: THREE.FrontSide,
  };
  if (currentGraphics().light === 'simple') {
    return new THREE.MeshLambertMaterial(shared);
  }
  const mat = new THREE.MeshStandardMaterial({
    ...shared,
    roughness: isGlassy(type) ? 0.12 : type === 'grass' || type === 'sand' || type === 'snow' ? 0.94 : 0.72,
    metalness: isMetal(type) ? 0.78 : 0,
    envMapIntensity: isGlassy(type) || isMetal(type) ? 1.15 : 0.9,
    emissive: type === 'glowstone' ? new THREE.Color(0xffcc66) : 0x000000,
    emissiveIntensity: type === 'glowstone' ? 1.4 : 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = climate.uWet;
    shader.uniforms.uSnow = climate.uSnow;
    shader.uniforms.uPuddle = climate.uPuddle;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWx;\nvarying vec3 vWn;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vWx = wp.xyz;
        vWn = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWx;\nvarying vec3 vWn;\nuniform float uWet;\nuniform float uSnow;\nuniform float uPuddle;')
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        float up = smoothstep(0.18, 0.88, vWn.y);
        float wet = uWet * (0.28 + 0.72 * up);
        float puddle = uPuddle * up * smoothstep(0.12, 0.72, 0.5 + 0.5 * sin(vWx.x * 1.7) * sin(vWx.z * 1.4));
        diffuseColor.rgb *= 1.0 - wet * 0.28;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 0.99), uSnow * up);
        roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.22, wet);
        roughnessFactor = mix(roughnessFactor, 0.06, puddle);`);
  };
  mat.customProgramCacheKey = () => `climate-${type}`;
  return mat;
}

function bakeSky(scene, weather, name) {
  if (!pmrem) return;
  if (bakedName === name && envTarget) return;
  bakedName = name;
  const wash = Math.min(1, weather.fog * 38);
  const zenith = new THREE.Color(weather.sky).lerp(new THREE.Color(weather.fogColor), wash * 0.55);
  const horizon = new THREE.Color(weather.fogColor);
  const ground = new THREE.Color(0x2a221c);
  const probe = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(12, 24, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        zenith: { value: zenith },
        horizon: { value: horizon },
        ground: { value: ground },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
    }),
  );
  probe.add(sky);
  const sunPower = weather.sun * (1 - wash * 0.82);
  let disc;
  if (sunPower > 0.04) {
    disc = new THREE.Mesh(
      new THREE.SphereGeometry(0.35 + weather.shafts * 0.55, 16, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(weather.sunColor), fog: false }),
    );
    disc.position.set(5.4, 3.6, 3.1).normalize().multiplyScalar(8.2);
    disc.scale.setScalar(0.7 + sunPower * 0.35);
    probe.add(disc);
  }
  if (envTarget) {
    envTarget.dispose();
    envTarget = null;
  }
  envTarget = pmrem.fromScene(probe, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 1;
  sky.geometry.dispose();
  sky.material.dispose();
  if (disc) {
    disc.geometry.dispose();
    disc.material.dispose();
  }
}

export function installEnvironment(renderer, scene) {
  if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
  bakeSky(scene, WEATHERS.dusk, 'dusk');
}

export function setClimate(name, ctx, indoor) {
  const key = WEATHERS[name] ? name : 'clear';
  const w = WEATHERS[key];
  climate.uWet.value = indoor ? w.wet * 0.2 : w.wet;
  climate.uSnow.value = indoor ? 0 : w.snow;
  climate.uPuddle.value = indoor ? 0 : w.puddle;
  ctx.scene.background = new THREE.Color(w.sky);
  ctx.scene.fog = new THREE.FogExp2(w.fogColor, w.fog);
  ctx.hemi.color.set(w.sunColor);
  ctx.hemi.groundColor.set(0x3a2a22);
  ctx.hemi.intensity = w.hemi;
  ctx.sunLight.color.set(w.sunColor);
  ctx.sunLight.intensity = w.sun;
  ctx.sun.material.color.set(w.sunColor);
  ctx.sun.visible = true;
  bakeSky(ctx.scene, w, key);
  ctx.atmosphere?.setWeather(w, indoor);
  return w;
}
