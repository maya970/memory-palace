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
    time: { value: 0 },
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
    uniform float time;
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
      shafts = (shafts / 16.0) * sunStrength;
      vec3 haze = vec3(1.0, 0.84, 0.62) * shafts * 0.55;
      vec3 fog = vec3(0.62, 0.58, 0.5);
      vec3 color = mix(src.rgb, fog, 0.18);
      color *= vec3(1.06, 0.98, 0.90);
      color += haze;
      color = mix(color, color * color * (3.0 - 2.0 * color), 0.12);
      float vig = smoothstep(1.15, 0.28, distance(vUv, vec2(0.5)));
      color *= mix(0.72, 1.0, vig);
      gl_FragColor = vec4(color, src.a);
    }
  `,
};

export class Atmosphere {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.72, 0.78);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.rain = makeRain();
    scene.add(this.rain);
  }

  resize(width, height) {
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
  }

  render(now, sun, enabled) {
    this.rain.visible = enabled;
    if (enabled) {
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        let y = pos.getY(i) - (0.55 + (i % 5) * 0.08);
        if (y < 2) y = 58 + (i % 7);
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
    if (!enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const clip = sun.position.clone().project(this.camera);
    const inFront = clip.z < 1 && clip.x > -1.4 && clip.x < 1.4 && clip.y > -1.4 && clip.y < 1.4;
    this.grade.uniforms.sunPos.value.set(clip.x * 0.5 + 0.5, clip.y * 0.5 + 0.5);
    this.grade.uniforms.sunStrength.value = inFront ? 1 : 0.15;
    this.grade.uniforms.time.value = now * 0.001;
    this.composer.render();
  }
}

function makeRain() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 140;
    positions[i * 3 + 1] = Math.random() * 56 + 4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc8d4e4,
    size: 0.08,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}
