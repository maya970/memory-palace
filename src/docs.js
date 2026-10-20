import { findManifest, manifestRows } from './chain.js';
import { readStored } from './remote.js';
import { parseShelf, plainText, sanitizeHtml } from './notes.js';
import { loadWallets } from './wallets.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function where(note) {
  const pos = parseShelf(note.shelf);
  return pos ? `${pos.x}, ${pos.y}, ${pos.z}` : '背包';
}

function storeName(store) {
  if (store === 'walrus') return 'Walrus';
  if (store === 'arweave') return 'Arweave';
  return '本地';
}

function fieldOf(note, key) {
  if (key === 'order') return note.order == null || note.order === '' ? Number.POSITIVE_INFINITY : Number(note.order);
  if (key === 'cue') return note.cue || '';
  if (key === 'title') return note.title || '未命名';
  if (key === 'where') return where(note);
  return storeName(note.store);
}

export function createDocs(root, hooks) {
  const body = root.querySelector('#docs-body');
  const statusEl = root.querySelector('[data-status]');
  const countEl = root.querySelector('#docs-count');
  const searchEl = root.querySelector('#docs-search');
  const meter = root.querySelector('.meter');
  const fill = root.querySelector('.meter-fill');
  const reader = root.querySelector('#docs-read');
  const tableWrap = root.querySelector('.doc-table-wrap');
  const palaceButton = root.querySelector('#docs-open-palace');
  let mode = 'local';
  let chain = null;
  let busy = false;
  let source = [];
  let query = '';
  let sortKey = 'order';
  let sortDir = 1;
  let reading = null;

  function paint(ratio, label) {
    meter.hidden = false;
    if (ratio == null) fill.classList.add('indeterminate');
    else {
      fill.classList.remove('indeterminate');
      fill.style.width = `${Math.max(6, Math.round(ratio * 100))}%`;
    }
    statusEl.textContent = label || '';
  }

  function idle(message) {
    meter.hidden = true;
    fill.classList.remove('indeterminate');
    statusEl.textContent = message || '';
  }

  function ordered(notes) {
    const needle = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (!needle) return true;
      const text = `${note.title || ''} ${note.cue || ''} ${where(note)} ${note.html ? plainText(note.html) : ''}`.toLowerCase();
      return text.includes(needle);
    }).sort((a, b) => {
      const av = fieldOf(a, sortKey);
      const bv = fieldOf(b, sortKey);
      let diff = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'zh');
      if (diff === 0) diff = (b.updated || 0) - (a.updated || 0);
      return diff * sortDir;
    });
  }

  function paintHeaders() {
    root.querySelectorAll('[data-sort]').forEach((button) => {
      const on = button.dataset.sort === sortKey;
      button.classList.toggle('on', on);
      button.querySelector('i').textContent = on ? (sortDir > 0 ? ' ↑' : ' ↓') : '';
    });
  }

  function rowsOf(notes) {
    source = notes;
    const rows = ordered(notes);
    const total = notes.length;
    countEl.textContent = query.trim() ? `${rows.length} / ${total} 篇` : `${total} 篇`;
    body.innerHTML = rows.length
      ? rows.map((note, index) => `<tr data-index="${index}">
          <td>${note.order != null ? note.order : ''}</td>
          <td>${escapeHtml(note.cue || '')}</td>
          <td>${escapeHtml(note.title || '未命名')}</td>
          <td>${escapeHtml(where(note))}</td>
          <td>${storeName(note.store)}</td>
        </tr>`).join('')
      : `<tr><td colspan="5">${total ? '没有符合的文稿' : '还没有写过的文稿'}</td></tr>`;
    body._rows = rows;
    paintHeaders();
  }

  function showTable() {
    reader.classList.add('hidden');
    tableWrap.classList.remove('hidden');
    searchEl.parentElement.classList.remove('hidden');
  }

  function showNote(note) {
    reading = note;
    tableWrap.classList.add('hidden');
    searchEl.parentElement.classList.add('hidden');
    reader.classList.remove('hidden');
    palaceButton.classList.toggle('hidden', mode !== 'local' || !parseShelf(note.shelf));
    root.querySelector('#docs-kicker').textContent = note.cue || '文稿';
    root.querySelector('#docs-title').textContent = note.title || '未命名';
    root.querySelector('#docs-where').textContent = `${note.order != null ? `第 ${note.order} 处 · ` : ''}${where(note)} · ${storeName(note.store)}`;
    root.querySelector('#docs-body-read').innerHTML = sanitizeHtml(note.html || '<p>这篇还没有正文。</p>');
  }

  async function showChain() {
    const wallets = loadWallets();
    if (!wallets) {
      rowsOf([]);
      idle('先导入或创建一个账户，才能查看链上的文稿');
      return;
    }
    if (!chain) {
      busy = true;
      paint(0.1, '正在查找链上的最新索引');
      try {
        chain = await findManifest(wallets, ({ ratio, label }) => {
          if (mode === 'chain') paint(ratio, label);
        });
        if (mode === 'chain') idle(chain ? '' : '这个账户在链上还没有文稿');
      } catch (error) {
        chain = null;
        if (mode === 'chain') idle(error?.message || '链上的索引没有打开');
      } finally {
        busy = false;
      }
    }
    if (mode === 'chain') rowsOf(chain ? manifestRows(chain) : []);
  }

  function render() {
    showTable();
    root.querySelector('#docs-local').classList.toggle('on', mode === 'local');
    root.querySelector('#docs-chain').classList.toggle('on', mode === 'chain');
    if (mode === 'local') {
      idle('');
      rowsOf(hooks.localNotes());
      return;
    }
    showChain();
  }

  body.addEventListener('click', async (event) => {
    const row = event.target.closest('tr[data-index]');
    if (!row || busy) return;
    const note = body._rows[Number(row.dataset.index)];
    if (!note) return;
    if (note.html || !note.ref) {
      showNote(note);
      return;
    }
    busy = true;
    paint(null, '正在打开这一篇');
    try {
      const full = await readStored(note.store, note.ref);
      idle('');
      showNote({ ...note, ...full });
    } catch (error) {
      idle(error?.message || '这一篇没有打开');
    } finally {
      busy = false;
    }
  });

  root.querySelector('#docs-close').addEventListener('click', () => hooks.onClose());
  root.querySelector('#docs-back').addEventListener('click', () => {
    reading = null;
    showTable();
  });
  palaceButton.addEventListener('click', () => {
    if (reading) hooks.onOpenLocal(reading);
  });
  searchEl.addEventListener('input', () => {
    query = searchEl.value;
    rowsOf(source);
  });
  root.querySelectorAll('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      if (sortKey === button.dataset.sort) sortDir *= -1;
      else {
        sortKey = button.dataset.sort;
        sortDir = 1;
      }
      rowsOf(source);
    });
  });
  root.querySelector('#docs-local').addEventListener('click', () => {
    mode = 'local';
    render();
  });
  root.querySelector('#docs-chain').addEventListener('click', () => {
    mode = 'chain';
    render();
  });

  return {
    isOpen: () => !root.classList.contains('hidden'),
    open() {
      chain = null;
      mode = 'local';
      reading = null;
      root.classList.remove('hidden');
      render();
    },
    close() {
      root.classList.add('hidden');
      showTable();
    },
  };
}
