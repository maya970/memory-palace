/** 社区模组面板：筛选、导入、导出宫殿/家具。 */
import specText from '../community-mod.md?raw';
import { catalog, dropHistory, furnitureExport, importMod, officialFurniturePack, palaceExport, searchCatalog } from './community.js';
import { palaceById } from './presets.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function createCommunity(root, hooks) {
  const list = root.querySelector('#community-list');
  const drops = root.querySelector('#drop-list');
  const empty = root.querySelector('#community-empty');
  const count = root.querySelector('#community-count');
  const search = root.querySelector('#community-search');
  const file = root.querySelector('#community-file');
  const dropPane = root.querySelector('#community-drops');
  const resultPane = root.querySelector('#community-results');
  let source = 'all';
  let part = 'all';
  let view = 'mods';

  function paint() {
    root.querySelectorAll('[data-source]').forEach((button) => {
      button.classList.toggle('on', button.dataset.source === source);
    });
    root.querySelectorAll('[data-part]').forEach((button) => {
      button.classList.toggle('on', button.dataset.part === part);
    });
    root.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.toggle('on', button.dataset.view === view);
    });
    const showingDrops = view === 'drops';
    dropPane.classList.toggle('hidden', !showingDrops);
    resultPane.classList.toggle('hidden', showingDrops);
    search.disabled = showingDrops;

    if (showingDrops) {
      const rows = dropHistory();
      count.textContent = `${rows.length} 条投放`;
      drops.innerHTML = rows.length
        ? rows.map((row) => `<button type="button" class="community-drop" data-goto="${row.x},${row.y},${row.z}">
            <strong>${escapeHtml(row.title || row.cue || '未命名')}</strong>
            <span>${row.x}, ${row.y}, ${row.z}</span>
          </button>`).join('')
        : '';
      empty.classList.toggle('hidden', rows.length > 0);
      empty.textContent = '还没有先写入再投放的笔记。';
      return;
    }

    const items = searchCatalog(search.value, source, part);
    count.textContent = `${items.length} 个模组`;
    list.innerHTML = items.map((item) => `<article class="mods-card">
      <p class="apple-kicker">${item.official ? '官方' : '玩家'} · ${item.part === 'palace' ? '宫殿' : '家具'}${item.country ? ` · ${escapeHtml(item.country)}` : ''} · ${escapeHtml(item.author || '未署名')}</p>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.lead || item.credit || '')}</p>
      <div class="community-actions">
        ${item.part === 'palace'
          ? `<button type="button" data-enter="${escapeHtml(item.id)}">进入这座宫殿</button>`
          : `<button type="button" data-furn="${escapeHtml(item.id)}">${item.official ? '已在背包里' : '装上这包家具'}</button>`}
        <button type="button" class="ghost" data-share="${escapeHtml(item.id)}">导出</button>
      </div>
    </article>`).join('');
    empty.classList.toggle('hidden', items.length > 0);
    empty.textContent = search.value.trim()
      ? '没有对上这个检索。换个词，或改成「玩家模组」看自己导入的。'
      : '这一类还是空的。导入一份 JSON，就会出现在玩家模组里。';
  }

  root.querySelector('#community-close').addEventListener('click', () => hooks.onClose());
  search.addEventListener('input', paint);
  root.querySelectorAll('[data-source]').forEach((button) => {
    button.addEventListener('click', () => {
      view = 'mods';
      source = button.dataset.source;
      paint();
    });
  });
  root.querySelectorAll('[data-part]').forEach((button) => {
    button.addEventListener('click', () => {
      view = 'mods';
      part = button.dataset.part;
      paint();
    });
  });
  root.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      view = button.dataset.view;
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
      view = 'mods';
      source = 'player';
      part = result.kind === 'furniture' ? 'furniture' : result.kind === 'palace' ? 'palace' : 'all';
      paint();
      if (result.kind === 'furniture') hooks.onFurnitureInstalled?.(result);
      else if (result.kind === 'palace') hooks.onToast(`「${result.name}」已加入玩家模组，检索后点进入`);
      else {
        if (result.furniture) hooks.onFurnitureInstalled?.(result.furniture);
        hooks.onToast(`「${result.name}」已加入玩家模组`);
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
      view = 'mods';
      paint();
      root.classList.remove('hidden');
      search.focus();
    },
    close() {
      root.classList.add('hidden');
    },
    refresh: paint,
  };
}
