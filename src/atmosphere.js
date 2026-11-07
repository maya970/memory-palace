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
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.7, 0.8);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.rain = makeDrops(0xc8d4e4, 0.08, 900);
    this.snow = makeDrops(0xf4f8fc, 0.14, 700);
    scene.add(this.rain, this.snow);
  }

  setWeather(weather, indoor) {
    this.weather = weather;
    this.indoor = Boolean(indoor);
    this.bloom.strength = weather.bloom;
    if (weather.sunColor != null) this.grade.uniforms.sunTint.value.set(weather.sunColor);
  }

  resize(width, height) {
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
  }

  render(now, sun, enabled) {
    const rainOn = enabled && !this.indoor && this.weather.rain > 0;
    const snowOn = enabled && !this.indoor && this.weather.flakes > 0;
    this.rain.visible = rainOn;
    this.snow.visible = snowOn;
    if (rainOn) drift(this.rain, 0.9 * this.weather.rain, 2);
    if (snowOn) drift(this.snow, 0.22, 58);
    if (!enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const clip = sun.position.clone().project(this.camera);
    const inFront = clip.z < 1 && clip.x > -1.4 && clip.x < 1.4 && clip.y > -1.4 && clip.y < 1.4;
    this.grade.uniforms.sunPos.value.set(clip.x * 0.5 + 0.5, clip.y * 0.5 + 0.5);
    const roof = this.indoor ? 0.12 : 1;
    this.grade.uniforms.sunStrength.value = (inFront ? this.weather.shafts : 0.1) * roof;
    this.grade.uniforms.indoor.value = this.indoor ? 1 : 0;
    this.composer.render();
  }
}

function makeDrops(color, size, count) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 140;
    positions[i * 3 + 1] = Math.random() * 56 + 4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.46, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

function drift(points, speed, resetY) {
  const pos = points.geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    let y = pos.getY(i) - speed;
    if (y < 2) y = resetY + (i % 7);
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
}
