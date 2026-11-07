/**
 * 雨雪：GPU 着色器按时间缓慢下落，避免粒子闪烁。电影级才启用。
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    sunPos: { value: new THREE.Vector2(0.7, 0.72) },
    sunStrength: { value: 1 },
    indoor: { value: 0 },
    sunTint: { value: new THREE.Color(0xffe0b0) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 sunPos;
    uniform float sunStrength;
    uniform float indoor;
    uniform vec3 sunTint;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec2 delta = (vUv - sunPos) / 16.0;
      float shafts = 0.0;
      vec2 p = vUv;
      for (int i = 0; i < 16; i++) {
        p -= delta;
        vec3 sampleCol = texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb;
        float lum = dot(sampleCol, vec3(0.30, 0.52, 0.18));
        shafts += smoothstep(0.58, 0.95, lum);
      }
      shafts = (shafts / 16.0) * sunStrength * mix(1.0, 0.12, indoor);
      vec3 haze = sunTint * shafts * 0.55;
      vec3 color = src.rgb + haze;
      float vig = smoothstep(1.15, 0.28, distance(vUv, vec2(0.5)));
      color *= mix(0.78, 1.0, vig);
      gl_FragColor = vec4(color, src.a);
    }
  `,
};

export class Atmosphere {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.weather = { rain: 0, flakes: 0, bloom: 0.3, shafts: 0.6, wet: 0 };
    this.indoor = false;
    this.composer = null;
    this.bloom = null;
    this.grade = null;
    this.rain = null;
    this.snow = null;
  }

  ensureComposer() {
    if (this.composer) return;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.7, 0.8);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.resize(this.renderer.domElement.width, this.renderer.domElement.height);
  }

  setWeather(weather, indoor) {
    this.weather = weather;
    this.indoor = Boolean(indoor);
    if (this.bloom) this.bloom.strength = weather.bloom;
    if (this.grade && weather.sunColor != null) this.grade.uniforms.sunTint.value.set(weather.sunColor);
  }

  resize(width, height) {
    this.composer?.setSize(width, height);
    this.bloom?.setSize(width, height);
  }

  render(now, sun, enabled, dt = 0.016, origin) {
    const rainOn = enabled && !this.indoor && this.weather.rain > 0;
    const snowOn = enabled && !this.indoor && this.weather.flakes > 0;
    if (rainOn && !this.rain) {
      this.rain = makeDrops(0xc8d4e4, 18, 480, 5.2, 0.22);
      this.scene.add(this.rain);
    }
    if (snowOn && !this.snow) {
      this.snow = makeDrops(0xf4f8fc, 42, 280, 1.15, 0.38);
      this.scene.add(this.snow);
    }
    if (this.rain) this.rain.visible = rainOn;
    if (this.snow) this.snow.visible = snowOn;
    const t = now * 0.001;
    if (rainOn && this.rain) {
      this.rain.material.uniforms.time.value = t;
      this.rain.material.uniforms.fall.value = 4.6 + this.weather.rain * 1.1;
    }
    if (snowOn && this.snow) this.snow.material.uniforms.time.value = t;
    if (origin) {
      this.rain?.position.set(origin.x, 0, origin.z);
      this.snow?.position.set(origin.x, 0, origin.z);
    }
    if (!enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.ensureComposer();
    if (this.bloom) this.bloom.strength = this.weather.bloom;
    const clip = sun.position.clone().project(this.camera);
    const inFront = clip.z < 1 && clip.x > -1.4 && clip.x < 1.4 && clip.y > -1.4 && clip.y < 1.4;
    this.grade.uniforms.sunPos.value.set(clip.x * 0.5 + 0.5, clip.y * 0.5 + 0.5);
    const roof = this.indoor ? 0.12 : 1;
    this.grade.uniforms.sunStrength.value = (inFront ? this.weather.shafts : 0.1) * roof;
    this.grade.uniforms.indoor.value = this.indoor ? 1 : 0;
    this.composer.render();
  }
}

function makeDrops(color, size, count, fall, sway) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 48;
    positions[i * 3 + 1] = Math.random() * 52 + 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 48;
    seeds[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      fall: { value: fall },
      sway: { value: sway },
      color: { value: new THREE.Color(color) },
      size: { value: size },
      opacity: { value: 0.42 },
    },
    vertexShader: `
      uniform float time;
      uniform float fall;
      uniform float sway;
      uniform float size;
      attribute float seed;
      void main() {
        vec3 p = position;
        float speed = fall * (0.82 + seed * 0.22);
        p.y = mod(p.y - time * speed, 54.0) + 2.0;
        float wave = seed * 18.0 + p.y * 0.07 + time * 0.12;
        p.x += sin(wave) * sway;
        p.z += cos(wave * 0.68) * sway * 0.45;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size / max(1.4, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.48) discard;
        float a = (1.0 - smoothstep(0.08, 0.48, d)) * opacity;
        gl_FragColor = vec4(color, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}
