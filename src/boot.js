/**
 * 登录入口：不预加载 Three。点走进去 / 先写一篇 才 import play。
 * 地址栏 ?see=Arweave编号 时跳过账户，只读走进别人分享的宫殿。
 */
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
  playLoading = import('./play.js').then((mod) => {
    playMod = mod;
    if (typeof mod.startFromIntro !== 'function') {
      throw new Error(`宫殿模块不完整：${Object.keys(mod).join(', ') || '空'}`);
    }
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

const seeId = new URLSearchParams(location.search).get('see') || new URLSearchParams(location.search).get('view');

createGate(startEl, {
  autoEnter: !seeId && sessionStorage.getItem('memory-palace-enter') === '1',
  onRestore: restoreAndEnter,
  onAccount() {
    hideMeter(startEl);
  },
  async onWriteFirst() {
    try {
      const play = await loadPlay(startEl);
      await play.openWriteFirst();
      hideMeter(startEl);
    } catch (error) {
      console.error(error);
      paintMeter(startEl, 0, error?.message || '宫殿没有加载起来');
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
  } catch (error) {
    console.error(error);
    btn.disabled = false;
    paintMeter(introEl, 0, error?.message || '宫殿没有加载起来');
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

if (seeId) {
  (async () => {
    startEl.querySelectorAll('button').forEach((button) => {
      if (!button.dataset.light) button.disabled = true;
    });
    paintMeter(startEl, null, t('visitLoading'));
    try {
      const remote = await import('./remote.js');
      const data = await remote.readStored('arweave', seeId);
      let bundle;
      if (remote.isPublicNote(data)) {
        let world = data.palace || { removed: [], placed: [] };
        if (Array.isArray(world)) {
          const { joinWorld } = await import('./bundle.js');
          const chunks = [];
          for (const piece of world) {
            chunks.push(await remote.readStored(remote.pieceStore(piece, 'arweave'), remote.pieceRef(piece)));
          }
          world = joinWorld(chunks);
        }
        bundle = {
          kind: 'memory-palace-exhibit',
          public: true,
          notes: [data],
          world,
          player: data.spawn || null,
        };
      } else {
        bundle = await remote.resolveBundle(data, ({ ratio, label }) => paintMeter(startEl, ratio, label));
      }
      const play = await loadPlay(startEl);
      await play.startVisit(bundle);
      hideMeter(startEl);
    } catch (error) {
      console.error(error);
      startEl.querySelectorAll('button').forEach((button) => {
        if (!button.dataset.light) button.disabled = false;
      });
      paintMeter(startEl, 0, error?.message || t('visitFailed'));
    }
  })();
}
