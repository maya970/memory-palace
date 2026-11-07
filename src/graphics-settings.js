/** 本机画质偏好（水、光、天气）。live 为 false 时只存设置，不驱动渲染。 */
const KEY = 'memory-palace-graphics';
let live = false;

const DEFAULTS = {
  water: 'flow',
  light: 'simple',
  weather: 'dusk',
};

export function loadGraphics() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const light = saved.light === 'cinematic' ? 'cinematic' : 'simple';
    const weather = ['clear', 'rain', 'storm', 'mist', 'snow', 'dusk'].includes(saved.weather)
      ? saved.weather
      : DEFAULTS.weather;
    return {
      water: ['cube', 'still', 'flow'].includes(saved.water) ? saved.water : DEFAULTS.water,
      light,
      weather,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function graphicsLive() {
  return live;
}

export function beginGraphics() {
  live = true;
}

export function currentGraphics() {
  const saved = loadGraphics();
  return live ? saved : { ...saved, light: 'simple', water: 'cube' };
}

export function saveGraphics(next) {
  const value = { ...loadGraphics(), ...next };
  localStorage.setItem(KEY, JSON.stringify(value));
  return value;
}
