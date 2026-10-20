const KEY = 'memory-palace-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  localStorage.setItem(KEY, JSON.stringify({ version: 1, ...data }));
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

export function hasSave() {
  return Boolean(localStorage.getItem(KEY));
}
