import { findManifest } from './chain.js';
import { resolveBundle } from './remote.js';
import { createWallets, loadWallets, saveWallets, walletAddresses } from './wallets.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function createGate(root, hooks) {
  const statusEl = root.querySelector('[data-status]');
  const meter = root.querySelector('.meter');
  const fill = root.querySelector('.meter-fill');
  const walletEl = root.querySelector('#gate-wallet');
  const localButton = root.querySelector('#gate-local');
  let busy = false;
  let prepared = false;

  function paint(ratio, label) {
    meter.hidden = false;
    if (ratio == null) {
      fill.classList.add('indeterminate');
    } else {
      fill.classList.remove('indeterminate');
      fill.style.width = `${Math.max(6, Math.round(ratio * 100))}%`;
    }
    if (label) statusEl.textContent = label;
  }

  function idle(message) {
    meter.hidden = true;
    fill.classList.remove('indeterminate');
    fill.style.width = '0';
    statusEl.textContent = message || '';
  }

  function setBusy(next) {
    busy = next;
    root.querySelectorAll('button').forEach((button) => {
      button.disabled = next || (button.id === 'gate-local' && !prepared);
    });
  }

  function renderWallets() {
    const addresses = walletAddresses();
    walletEl.innerHTML = addresses
      ? `<span>Arweave</span><code>${escapeHtml(addresses.arweave)}</code><span>Sui</span><code>${escapeHtml(addresses.sui)}</code>`
      : '';
    localButton.querySelector('small').textContent = hooks.hasLocal()
      ? '按这台浏览器里的存档走进去'
      : '从一座空宫殿开始';
  }

  function finish() {
    setBusy(false);
    root.classList.add('hidden');
    hooks.onIntro();
  }

  async function restore(wallets) {
    paint(0.08, '正在查找链上的目录');
    const manifest = await findManifest(wallets, ({ ratio, label }) => paint(ratio, label));
    if (!manifest) {
      idle('账户已经在这台浏览器里。链上还没有这份笔记');
      finish();
      return;
    }
    const bundle = await resolveBundle(manifest, ({ ratio, label }) => paint(0.7 + ratio * 0.3, label));
    hooks.onRestore(bundle);
  }

  root.querySelector('#gate-wallet-pick').addEventListener('click', () => {
    if (!busy) root.querySelector('#gate-wallet-file').click();
  });
  root.querySelector('#gate-file-pick').addEventListener('click', () => {
    if (!busy) root.querySelector('#gate-palace-file').click();
  });
  root.querySelector('#gate-local').addEventListener('click', () => {
    if (busy || !prepared) return;
    finish();
  });
  root.querySelector('#gate-create').addEventListener('click', async () => {
    if (busy) return;
    if (loadWallets()) {
      idle('这台浏览器里已经有一个账户');
      renderWallets();
      return;
    }
    setBusy(true);
    paint(null, '正在生成账户');
    try {
      await createWallets();
      renderWallets();
      hooks.onAccount?.();
      finish();
    } catch (error) {
      idle(error?.message || '账户没有生成');
      setBusy(false);
    }
  });
  root.querySelector('#gate-wallet-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    paint(0.04, '正在读取账户');
    try {
      const wallets = saveWallets(JSON.parse(await file.text()));
      renderWallets();
      hooks.onAccount?.();
      await restore(wallets);
    } catch (error) {
      idle(error?.message || '这个账户没有放进来');
      setBusy(false);
    }
  });
  root.querySelector('#gate-palace-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    paint(0.2, '正在读取文件');
    try {
      const bundle = await resolveBundle(JSON.parse(await file.text()), ({ ratio, label }) => paint(0.2 + ratio * 0.8, label));
      hooks.onRestore(bundle);
    } catch (error) {
      idle(error?.message || '这个文件打不开');
      setBusy(false);
    }
  });

  renderWallets();
  return {
    markReady() {
      if (prepared) return;
      prepared = true;
      if (!busy) localButton.disabled = false;
      if (hooks.autoEnter) finish();
    },
  };
}
