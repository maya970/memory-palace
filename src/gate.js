/**
 * 登录门：创建/导入账户、读链上索引。不加载 3D。
 */
import { onLang, t } from './i18n.js';
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
  const authEl = root.querySelector('#gate-auth');
  const homeEl = root.querySelector('#gate-home');
  const titleEl = root.querySelector('h1');
  let busy = false;

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
      if (button.dataset.light) return;
      button.disabled = next;
    });
  }

  function showHome() {
    const signed = Boolean(loadWallets());
    authEl.classList.toggle('hidden', signed);
    homeEl.classList.toggle('hidden', !signed);
    titleEl.dataset.i18n = signed ? 'signedIn' : 'signIn';
    titleEl.textContent = t(titleEl.dataset.i18n);
  }

  function renderWallets() {
    const addresses = walletAddresses();
    walletEl.innerHTML = addresses
      ? `<span>Arweave</span><code>${escapeHtml(addresses.arweave)}</code><span>Sui</span><code>${escapeHtml(addresses.sui)}</code>`
      : '';
    showHome();
  }

  function finish() {
    setBusy(false);
    root.classList.add('hidden');
    hooks.onIntro();
  }

  async function restore(wallets) {
    paint(0.08, t('findingIndex'));
    const { findManifest } = await import('./chain.js');
    const { resolveBundle } = await import('./remote.js');
    const manifest = await findManifest(wallets, ({ ratio, label }) => paint(ratio, label));
    if (!manifest) {
      idle(t('noChain'));
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
  root.querySelector('#gate-enter').addEventListener('click', () => {
    if (busy) return;
    finish();
  });
  root.querySelector('#gate-write').addEventListener('click', () => {
    if (!busy) hooks.onWriteFirst?.();
  });
  root.querySelector('#gate-create').addEventListener('click', async () => {
    if (busy) return;
    if (loadWallets()) {
      idle(t('hasAccount'));
      renderWallets();
      return;
    }
    setBusy(true);
    paint(null, t('generating'));
    try {
      await createWallets();
      renderWallets();
      hooks.onAccount?.();
      setBusy(false);
      idle('');
      showHome();
    } catch (error) {
      idle(error?.message || t('accountFailed'));
      setBusy(false);
    }
  });
  root.querySelector('#gate-wallet-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    paint(0.04, t('readingAccount'));
    try {
      const wallets = saveWallets(JSON.parse(await file.text()));
      renderWallets();
      hooks.onAccount?.();
      await restore(wallets);
    } catch (error) {
      idle(error?.message || t('accountRejected'));
      setBusy(false);
    }
  });
  root.querySelector('#gate-palace-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    paint(0.2, t('readingFile'));
    try {
      const { resolveBundle } = await import('./remote.js');
      const bundle = await resolveBundle(JSON.parse(await file.text()), ({ ratio, label }) => paint(0.2 + ratio * 0.8, label));
      hooks.onRestore(bundle);
    } catch (error) {
      idle(error?.message || t('fileFailed'));
      setBusy(false);
    }
  });

  renderWallets();
  onLang(renderWallets);
  if (hooks.autoEnter) Promise.resolve().then(() => { if (!busy) finish(); });
  return {
    showHome,
    paint,
    idle,
  };
}
