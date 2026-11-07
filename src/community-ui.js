import specText from '../community-mod.md?raw';
import { catalog, dropHistory, furnitureExport, importMod, officialFurniturePack, palaceExport } from './community.js';
import { palaceById } from './presets.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function createCommunity(root, hooks) {
  const list = root.querySelector('#community-list');
  const drops = root.querySelector('#drop-list');
  const file = root.querySelector('#community-file');
  let tab = 'palace';

  function paint() {
    root.querySelectorAll('[data-tab]').forEach((button) => {
      button.classList.toggle('on', button.dataset.tab === tab);
    });
    const items = catalog().filter((item) => {
      if (tab === 'palace') return item.part === 'palace';
      if (tab === 'furniture') return item.part === 'furniture';
      return false;
    });
    list.innerHTML = items.map((item) => `<article class="community-card">
      <div>
        <p class="apple-kicker">${item.official ? '官方' : escapeHtml(item.author || '玩家')}</p>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.lead || item.credit || '')}</p>
      </div>
      <div class="community-actions">
        ${item.part === 'palace'
          ? `<button type="button" data-enter="${escapeHtml(item.id)}">进入这座宫殿</button>`
          : `<button type="button" data-furn="${escapeHtml(item.id)}">${item.official ? '已在背包里' : '装上这包家具'}</button>`}
        <button type="button" class="ghost" data-share="${escapeHtml(item.id)}">导出</button>
      </div>
    </article>`).join('') || '<p class="apple-lead">还没有这一类模组。</p>';

    const rows = dropHistory();
    drops.innerHTML = rows.length
      ? rows.map((row) => `<button type="button" class="community-drop" data-goto="${row.x},${row.y},${row.z}">
          <strong>${escapeHtml(row.title || row.cue || '未命名')}</strong>
          <span>${row.x}, ${row.y}, ${row.z}</span>
        </button>`).join('')
      : '<p class="apple-lead">还没有先写入再投放的笔记。</p>';
  }

  root.querySelector('#community-close').addEventListener('click', () => hooks.onClose());
  root.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      tab = button.dataset.tab;
      paint();
    });
  });
  root.querySelector('#community-import').addEventListener('click', () => file.click());
  root.querySelector('#community-spec').addEventListener('click', () => {
    hooks.download(specText, 'community-mod.md', 'text/markdown;charset=utf-8');
  });
  root.querySelector('#community-export-palace').addEventListener('click', () => {
    hooks.download(JSON.stringify(palaceExport(hooks.world(), hooks.spawn(), '我的宫殿'), null, 2), '宫殿模组.json', 'application/json');
  });
  root.querySelector('#community-export-furniture').addEventListener('click', () => {
    hooks.download(JSON.stringify(furnitureExport(false), null, 2), '官方家居.json', 'application/json');
  });
  root.querySelector('#community-export-my-furniture').addEventListener('click', () => {
    try {
      hooks.download(JSON.stringify(furnitureExport(true), null, 2), '我的家具.json', 'application/json');
    } catch (error) {
      hooks.onToast(error?.message || '还没有自己的家具');
    }
  });
  file.addEventListener('change', async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    try {
      const result = importMod(JSON.parse(await picked.text()));
      paint();
      if (result.kind === 'furniture') hooks.onFurnitureInstalled?.(result);
      else if (result.kind === 'palace') hooks.onToast(`「${result.name}」已加入社区，点进入这座宫殿`);
      else {
        if (result.furniture) hooks.onFurnitureInstalled?.(result.furniture);
        hooks.onToast(`「${result.name}」已加入社区`);
      }
    } catch (error) {
      hooks.onToast(error?.message || '这个模组打不开');
    }
  });
  list.addEventListener('click', (event) => {
    const enter = event.target.closest('[data-enter]');
    if (enter) {
      const preset = palaceById(enter.dataset.enter) || catalog().find((item) => item.id === enter.dataset.enter);
      if (preset?.world) hooks.onApplyPalace(preset);
      return;
    }
    const furn = event.target.closest('[data-furn]');
    if (furn) {
      if (furn.dataset.furn === 'official-home') {
        hooks.onToast('官方家居已经在背包右侧。');
        return;
      }
      const pack = catalog().find((item) => item.id === furn.dataset.furn);
      if (pack) {
        importMod(pack);
        hooks.onFurnitureInstalled?.({ name: pack.name });
        paint();
      }
      return;
    }
    const share = event.target.closest('[data-share]');
    if (!share) return;
    const item = catalog().find((entry) => entry.id === share.dataset.share);
    if (!item) return;
    const body = item.part === 'palace' && item.id !== 'imported'
      ? palaceById(item.id) || item
      : item.id === 'official-home' ? officialFurniturePack() : item;
    hooks.download(JSON.stringify({ kind: 'memory-palace-mod', version: 1, ...body }, null, 2), `${item.name}.json`, 'application/json');
  });
  drops.addEventListener('click', (event) => {
    const row = event.target.closest('[data-goto]');
    if (!row) return;
    const [x, y, z] = row.dataset.goto.split(',').map(Number);
    hooks.onGoto(x, y, z);
  });

  return {
    isOpen: () => !root.classList.contains('hidden'),
    open() {
      paint();
      root.classList.remove('hidden');
    },
    close() {
      root.classList.add('hidden');
    },
    refresh: paint,
  };
}
