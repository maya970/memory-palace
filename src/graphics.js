import * as THREE from 'three';
import { loadGraphics } from './graphics-settings.js';

export {
  beginGraphics,
  currentGraphics,
  graphicsLive,
  loadGraphics,
  saveGraphics,
} from './graphics-settings.js';

export function applyLights(renderer, sunLight, meshes, settings) {
  const gfx = settings || loadGraphics();
  const rich = gfx.light !== 'simple';
  const handheld = document.body.classList.contains('handheld');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, rich ? (handheld ? 1.15 : 2) : 1));
  renderer.shadowMap.enabled = rich;
  renderer.shadowMap.type = 2;
  renderer.toneMapping = rich ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = rich ? 1.12 : 1;
  sunLight.castShadow = rich;
  if (!rich) sunLight.intensity = 1.32;
  if (rich) {
    sunLight.shadow.mapSize.set(handheld ? 1024 : 2048, handheld ? 1024 : 2048);
    sunLight.shadow.bias = -0.00035;
    sunLight.shadow.normalBias = 0.04;
    sunLight.shadow.camera.near = 8;
    sunLight.shadow.camera.far = 260;
    sunLight.shadow.camera.left = -110;
    sunLight.shadow.camera.right = 110;
    sunLight.shadow.camera.top = 110;
    sunLight.shadow.camera.bottom = -110;
    sunLight.shadow.camera.updateProjectionMatrix();
  }
  for (const mesh of meshes) {
    mesh.castShadow = rich;
    mesh.receiveShadow = rich;
  }
}
