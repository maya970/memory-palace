import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadGraphics } from './graphics.js';

export const WEATHERS = {
  clear: {
    label: '晴', wet: 0, snow: 0, puddle: 0, rain: 0, flakes: 0,
    fog: 0.0048, fogColor: 0x9ec4e8, sky: 0x87c5ea,
    sun: 2.55, hemi: 0.72, sunColor: 0xfff1d0, bloom: 0.26, shafts: 0.9,
    indoorSun: 0.08, indoorHemi: 0.55, indoorColor: 0xffc27a,
  },
  rain: {
    label: '雨', wet: 0.84, snow: 0, puddle: 0.92, rain: 1, flakes: 0,
    fog: 0.02, fogColor: 0x6d7682, sky: 0x5c6570,
    sun: 0.5, hemi: 0.34, sunColor: 0xc8d0d8, bloom: 0.2, shafts: 0.12,
    indoorSun: 0.05, indoorHemi: 0.62, indoorColor: 0xffb56a,
  },
  storm: {
    label: '雷暴', wet: 1, snow: 0, puddle: 1, rain: 1.7, flakes: 0,
    fog: 0.032, fogColor: 0x2e343c, sky: 0x252a32,
    sun: 0.18, hemi: 0.2, sunColor: 0x8899aa, bloom: 0.16, shafts: 0.05,
    indoorSun: 0.04, indoorHemi: 0.7, indoorColor: 0xff9a4a,
  },
  mist: {
    label: '雾', wet: 0.3, snow: 0, puddle: 0.22, rain: 0, flakes: 0,
    fog: 0.046, fogColor: 0xc4b8a6, sky: 0xccc3b4,
    sun: 0.85, hemi: 0.48, sunColor: 0xffe6c8, bloom: 0.34, shafts: 0.5,
    indoorSun: 0.07, indoorHemi: 0.58, indoorColor: 0xffc090,
  },
  snow: {
    label: '雪', wet: 0.1, snow: 0.94, puddle: 0, rain: 0, flakes: 1,
    fog: 0.016, fogColor: 0xd5e2ee, sky: 0xdbe6f2,
    sun: 1.3, hemi: 0.64, sunColor: 0xf7fbff, bloom: 0.28, shafts: 0.35,
    indoorSun: 0.08, indoorHemi: 0.6, indoorColor: 0xffd7a8,
  },
  dusk: {
    label: '黄昏', wet: 0.16, snow: 0, puddle: 0.12, rain: 0, flakes: 0,
    fog: 0.014, fogColor: 0xb08a62, sky: 0xb08a62,
    sun: 2.05, hemi: 0.36, sunColor: 0xffc17a, bloom: 0.5, shafts: 1,
    indoorSun: 0.06, indoorHemi: 0.52, indoorColor: 0xffb060,
  },
};

export const climate = {
  uWet: { value: 0 },
  uSnow: { value: 0 },
  uPuddle: { value: 0 },
};

export function makeSurface(map, transparent, type) {
  const shared = {
    map,
    transparent,
    alphaTest: transparent ? 0.15 : 0,
    depthWrite: !transparent,
    side: THREE.FrontSide,
  };
  if (loadGraphics().light === 'simple') {
    return new THREE.MeshLambertMaterial(shared);
  }
  const shiny = type === 'water' || type === 'ice' || type === 'glass' || type === 'gold' || type === 'iron' || type === 'diamond';
  const mat = new THREE.MeshStandardMaterial({
    ...shared,
    roughness: shiny ? 0.18 : type === 'grass' || type === 'sand' || type === 'snow' ? 0.92 : 0.7,
    metalness: type === 'gold' || type === 'iron' ? 0.65 : 0.04,
    envMapIntensity: 1,
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
        float up = smoothstep(0.22, 0.86, vWn.y);
        float wet = uWet * (0.35 + 0.65 * up);
        diffuseColor.rgb *= 1.0 - wet * 0.55;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 0.99), uSnow * up);
        float puddle = uPuddle * up * smoothstep(0.15, 0.7, 0.5 + 0.5 * sin(vWx.x * 1.7) * sin(vWx.z * 1.4));
        roughnessFactor = mix(roughnessFactor, 0.05, max(wet * up, puddle));
        metalnessFactor = mix(metalnessFactor, 0.28, puddle * 0.8);`);
  };
  mat.customProgramCacheKey = () => `climate-${type}`;
  return mat;
}

export function installEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.95;
}

export function setClimate(name, ctx, indoor) {
  const w = WEATHERS[name] || WEATHERS.clear;
  climate.uWet.value = indoor ? w.wet * 0.15 : w.wet;
  climate.uSnow.value = indoor ? 0 : w.snow;
  climate.uPuddle.value = indoor ? 0 : w.puddle;
  ctx.scene.background = new THREE.Color(indoor ? 0x1a120c : w.sky);
  ctx.scene.fog = new THREE.FogExp2(indoor ? 0x1a120c : w.fogColor, indoor ? 0.008 : w.fog);
  ctx.hemi.color.set(indoor ? w.indoorColor : w.sunColor);
  ctx.hemi.groundColor.set(indoor ? 0x3a2418 : 0x3a2a22);
  ctx.hemi.intensity = indoor ? w.indoorHemi : w.hemi;
  ctx.sunLight.color.set(indoor ? w.indoorColor : w.sunColor);
  ctx.sunLight.intensity = indoor ? w.indoorSun : w.sun;
  ctx.sun.material.color.set(w.sunColor);
  ctx.sun.visible = !indoor;
  ctx.atmosphere?.setWeather(w, indoor);
  return w;
}
