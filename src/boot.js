import { bundleToSave } from './bundle.js';
import { markDevice } from './device.js';
import { createGate } from './gate.js';
import { loadGraphics, saveGraphics } from './graphics-settings.js';
import { applyI18n, t } from './i18n.js';
import { writeSave } from './storage.js';
import { markAccountExported, walletFile } from './wallets.js';

markDevice();
applyI18n();

const startEl = document.querySelector('#start');
const introEl = document.querySelector('#intro');
let playMod = null;
let playLoading = null;

function paintLight() {
  const light = loadGraphics().light;
  document.querySelectorAll('.gate-gfx [data-light]').forEach((button) => {
    button.classList.toggle('on', button.dataset.light === light);
  });
}

function paintMeter(root, ratio, label) {
  const meter = root?.querySelector('.meter');
  const fill = root?.querySelector('.meter-fill');
  const status = root?.querySelector('[data-status]');
  if (!meter || !fill) return;
  meter.hidden = false;
  if (ratio == null) fill.classList.add('indeterminate');
  else {
    fill.classList.remove('indeterminate');
    fill.style.width = `${Math.max(8, Math.round(ratio * 100))}%`;
  }
  if (status) status.textContent = label || t('localPreparing');
}

function hideMeter(root) {
  const meter = root?.querySelector('.meter');
  const fill = root?.querySelector('.meter-fill');
  const status = root?.querySelector('[data-status]');
  if (meter) meter.hidden = true;
  if (fill) {
    fill.classList.remove('indeterminate');
    fill.style.width = '0';
  }
  if (status) status.textContent = '';
}

async function loadPlay(root) {
  if (playMod) return playMod;
  if (playLoading) return playLoading;
  paintMeter(root, 0.12, t('localPreparing'));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  playLoading = import('./main.js').then((mod) => {
    playMod = mod;
    return mod;
  }).catch((error) => {
    playLoading = null;
    throw error;
  });
  return playLoading;
}

function restoreAndEnter(bundle) {
  sessionStorage.setItem('memory-palace-enter', '1');
  writeSave(bundleToSave(bundle));
  location.reload();
}

paintLight();
document.querySelectorAll('.gate-gfx [data-light]').forEach((button) => {
  button.addEventListener('click', () => {
    saveGraphics({ light: button.dataset.light });
    paintLight();
  });
});

createGate(startEl, {
  autoEnter: sessionStorage.getItem('memory-palace-enter') === '1',
  onRestore: restoreAndEnter,
  onAccount() {
    hideMeter(startEl);
  },
  async onWriteFirst() {
    try {
      const play = await loadPlay(startEl);
      await play.openWriteFirst();
      hideMeter(startEl);
    } catch {
      paintMeter(startEl, 0, '宫殿没有加载起来');
    }
  },
  onIntro() {
    sessionStorage.removeItem('memory-palace-enter');
    introEl.classList.remove('hidden');
    hideMeter(startEl);
  },
});

document.querySelector('#intro-go').addEventListener('click', async () => {
  const btn = document.querySelector('#intro-go');
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const play = await loadPlay(introEl);
    await play.startFromIntro();
  } catch {
    btn.disabled = false;
    paintMeter(introEl, 0, '宫殿没有加载起来');
  }
});

document.querySelector('#account-export').addEventListener('click', () => {
  const file = walletFile();
  if (!file) return;
  const blob = new Blob([file], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = t('accountFile');
  link.click();
  URL.revokeObjectURL(link.href);
  markAccountExported();
  document.body.classList.toggle('account-pending', false);
  const banner = document.querySelector('#account-banner');
  banner.classList.add('hidden');
});

hideMeter(startEl);
