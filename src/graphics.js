const KEY = 'memory-palace-graphics';

const DEFAULTS = {
  water: 'flow',
  light: 'simple',
};

export function loadGraphics() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      water: ['cube', 'still', 'flow'].includes(saved.water) ? saved.water : DEFAULTS.water,
      light: saved.light === 'shadow' ? 'shadow' : 'simple',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveGraphics(next) {
  const value = { ...loadGraphics(), ...next };
  localStorage.setItem(KEY, JSON.stringify(value));
  return value;
}

export function applyLights(renderer, sunLight, meshes, settings) {
  const shadow = settings.light === 'shadow';
  renderer.shadowMap.enabled = shadow;
  renderer.shadowMap.type = 2;
  sunLight.castShadow = shadow;
  if (shadow) {
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 8;
    sunLight.shadow.camera.far = 220;
    sunLight.shadow.camera.left = -90;
    sunLight.shadow.camera.right = 90;
    sunLight.shadow.camera.top = 90;
    sunLight.shadow.camera.bottom = -90;
  }
  for (const mesh of meshes) {
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
  }
}
