import { BLOCKS, DEFAULT_HOTBAR, TEMPLATES, WOOLS } from './blocks.js';

export const HOTBAR_SIZE = 9;
export const BACKPACK_SIZE = 27;
export const STACK_MAX = 64;

function cleanType(type) {
  if (!type || type === 'bedrock' || !BLOCKS[type]) return null;
  return type;
}

export function stackOf(slot) {
  if (!slot) return null;
  if (typeof slot === 'string') {
    const type = cleanType(slot);
    return type ? { type, count: null } : null;
  }
  const type = cleanType(slot.type);
  if (!type) return null;
  const noteId = type === 'bookshelf' && typeof slot.noteId === 'string' && slot.noteId ? slot.noteId : null;
  if (noteId) return { type, count: 1, noteId };
  if (slot.count == null) return { type, count: null };
  const count = Math.max(1, Math.min(STACK_MAX, Math.floor(Number(slot.count)) || 1));
  return { type, count };
}

function normalizeList(list, size) {
  const next = Array(size).fill(null);
  if (!Array.isArray(list)) return next;
  for (let i = 0; i < size; i++) next[i] = stackOf(list[i]);
  return next;
}

export function loadInventoryState(save) {
  const slot = Number.isInteger(save?.slot) && save.slot >= 0 && save.slot < HOTBAR_SIZE ? save.slot : 5;
  if (Array.isArray(save?.hotbar)) {
    return {
      hotbar: normalizeList(save.hotbar, HOTBAR_SIZE),
      backpack: normalizeList(save.backpack, BACKPACK_SIZE),
      slot,
    };
  }
  const hotbar = DEFAULT_HOTBAR.slice();
  if (Number.isInteger(save?.woolIndex)) {
    const wool = WOOLS[Math.abs(save.woolIndex) % WOOLS.length];
    if (wool) hotbar[8] = wool.id;
  }
  return {
    hotbar: normalizeList(hotbar, HOTBAR_SIZE),
    backpack: Array(BACKPACK_SIZE).fill(null),
    slot,
  };
}

function read(hotbar, backpack, area, index) {
  return (area === 'hotbar' ? hotbar : backpack)[index];
}

function write(hotbar, backpack, area, index, value) {
  (area === 'hotbar' ? hotbar : backpack)[index] = value;
}

function stash(hotbar, backpack, stack) {
  let index = backpack.findIndex((slot) => !slot);
  if (index >= 0) {
    backpack[index] = stack;
    return true;
  }
  index = hotbar.findIndex((slot) => !slot);
  if (index >= 0) {
    hotbar[index] = stack;
    return true;
  }
  return false;
}

export function collectBlock(hotbarIn, backpackIn, type, amount = 1, noteId = null) {
  const kind = cleanType(type);
  if (!kind || amount <= 0) return { hotbar: hotbarIn, backpack: backpackIn, ok: true };
  const hotbar = hotbarIn.map(stackOf);
  const backpack = backpackIn.map(stackOf);
  if (noteId) {
    if ([...hotbar, ...backpack].some((slot) => slot?.noteId === noteId)) return { hotbar, backpack, ok: true };
    const into = (list) => {
      const index = list.findIndex((slot) => !slot);
      if (index < 0) return false;
      list[index] = { type: kind, count: 1, noteId };
      return true;
    };
    if (!into(backpack) && !into(hotbar)) {
      return { hotbar: hotbarIn, backpack: backpackIn, ok: false, reason: 'full' };
    }
    return { hotbar, backpack, ok: true };
  }
  let left = amount;
  for (const slot of backpack) {
    if (!slot || slot.noteId || slot.type !== kind || slot.count == null) continue;
    const room = STACK_MAX - slot.count;
    const put = Math.min(room, left);
    slot.count += put;
    left -= put;
    if (left <= 0) return { hotbar, backpack, ok: true };
  }
  while (left > 0) {
    const index = backpack.findIndex((slot) => !slot);
    if (index < 0) return { hotbar: hotbarIn, backpack: backpackIn, ok: false, reason: 'full' };
    const put = Math.min(STACK_MAX, left);
    backpack[index] = { type: kind, count: put };
    left -= put;
  }
  return { hotbar, backpack, ok: true };
}

export function applyDrop(hotbarIn, backpackIn, drag, target) {
  const hotbar = hotbarIn.slice();
  const backpack = backpackIn.slice();
  const unchanged = () => ({ hotbar: hotbarIn, backpack: backpackIn, ok: true, reason: '' });

  if (!drag?.type) return unchanged();

  if (target?.area === 'trash') {
    if (drag.copy || !drag.from) {
      return { hotbar: hotbarIn, backpack: backpackIn, ok: true, reason: drag.copy ? 'template' : '' };
    }
    const discardedNoteId = stackOf(drag.stack)?.noteId || null;
    write(hotbar, backpack, drag.from.area, drag.from.index, null);
    return { hotbar, backpack, ok: true, reason: 'trash', discardedNoteId };
  }

  if (!target) return unchanged();

  if (drag.from && drag.from.area === target.area && drag.from.index === target.index) return unchanged();

  const existing = stackOf(read(hotbar, backpack, target.area, target.index));
  if (drag.copy) {
    const incoming = { type: drag.type, count: null };
    if (existing && existing.type === incoming.type && existing.count == null) return unchanged();
    if (existing && !stash(hotbar, backpack, existing)) {
      return { hotbar: hotbarIn, backpack: backpackIn, ok: false, reason: 'full' };
    }
    write(hotbar, backpack, target.area, target.index, incoming);
    return { hotbar, backpack, ok: true, reason: '' };
  }

  const incoming = stackOf(drag.stack);
  if (!incoming) return unchanged();
  write(hotbar, backpack, drag.from.area, drag.from.index, existing || null);
  write(hotbar, backpack, target.area, target.index, incoming);
  return { hotbar, backpack, ok: true, reason: '' };
}

export function quickMove(hotbarIn, backpackIn, from) {
  const hotbar = hotbarIn.slice();
  const backpack = backpackIn.slice();
  if (from.template) {
    const incoming = { type: from.template, count: null };
    const hot = hotbar.findIndex((slot) => !slot);
    if (hot >= 0) hotbar[hot] = incoming;
    else {
      const bag = backpack.findIndex((slot) => !slot);
      if (bag < 0) return { hotbar: hotbarIn, backpack: backpackIn, ok: false, reason: 'full' };
      backpack[bag] = incoming;
    }
    return { hotbar, backpack, ok: true, reason: '' };
  }
  const source = from.area === 'hotbar' ? hotbar : backpack;
  const stack = stackOf(source[from.index]);
  if (!stack) return { hotbar, backpack, ok: true, reason: '' };
  const dest = from.area === 'hotbar' ? backpack : hotbar;
  const index = dest.findIndex((slot) => !slot);
  if (index < 0) return { hotbar: hotbarIn, backpack: backpackIn, ok: false, reason: 'full' };
  dest[index] = stack;
  source[from.index] = null;
  return { hotbar, backpack, ok: true, reason: '' };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function slotName(stack, hooks) {
  if (!stack) return '空';
  if (stack.noteId) return `书架《${hooks.noteName?.(stack.noteId) || '笔记'}》`;
  return BLOCKS[stack.type].name;
}

function slotMarkup(area, index, slot, selected, hooks, numbered) {
  const stack = stackOf(slot);
  const name = slotName(stack, hooks);
  const count = stack?.noteId ? null : stack?.count;
  return `<button type="button" class="slot ${selected ? 'selected' : ''}" data-area="${area}" data-index="${index}" title="${escapeHtml(name)}${count != null ? ` × ${count}` : ''}">
    ${stack ? `<img alt="" src="${hooks.iconFor(stack.type)}" draggable="false" />` : ''}
    ${numbered ? `<span>${index + 1}</span>` : ''}
    ${stack?.noteId ? '<b class="count note-mark">记</b>' : ''}
    ${count != null ? `<b class="count">${count}</b>` : ''}
  </button>`;
}

export function createInventory(root, hooks) {
  const backpackEl = root.querySelector('#backpack');
  const hotbarEl = root.querySelector('#inv-hotbar');
  const templateEl = root.querySelector('#template-list');
  const ghost = root.querySelector('#drag-ghost');
  let hotbar = DEFAULT_HOTBAR.slice();
  let backpack = Array(BACKPACK_SIZE).fill(null);
  let slot = 5;
  let drag = null;

  function commit(next) {
    if (!next.ok) {
      hooks.onToast(next.reason === 'full' ? '背包和物品栏都满了' : '放不进去');
      render();
      return;
    }
    hotbar = next.hotbar;
    backpack = next.backpack;
    render();
    hooks.onChange();
    if (next.reason === 'trash') {
      hooks.onToast('已经永久销毁');
      if (next.discardedNoteId) hooks.onDiscard?.(next.discardedNoteId);
    }
    if (next.reason === 'template') hooks.onToast('标准方块取不完，不用销毁');
  }

  function renderTemplates() {
    const building = TEMPLATES.filter((type) => !BLOCKS[type].wool);
    const wools = TEMPLATES.filter((type) => BLOCKS[type].wool);
    const group = (title, types) => `<h3>${title}</h3><div class="template-grid">${types.map((type) => `
      <button type="button" class="template" data-template="${type}" title="拖到物品栏，或点一下放进当前选中的格子">
        <img alt="" src="${hooks.iconFor(type)}" draggable="false" />
        <span>${BLOCKS[type].name}</span>
      </button>`).join('')}</div>`;
    templateEl.innerHTML = group('建筑', building) + group('羊毛', wools);
  }

  function render() {
    backpackEl.innerHTML = backpack.map((type, index) => slotMarkup('backpack', index, type, false, hooks, false)).join('');
    hotbarEl.innerHTML = hotbar.map((type, index) => slotMarkup('hotbar', index, type, index === slot, hooks, true)).join('');
    renderHud();
  }

  function renderHud() {
    const selected = slot;
    hooks.hudBar.innerHTML = hotbar.map((item, index) => {
      const stack = stackOf(item);
      const count = stack?.count;
      const name = slotName(stack, hooks);
      return `<button type="button" class="slot ${index === selected ? 'selected' : ''}" data-slot="${index}" title="${escapeHtml(name)}">
        ${stack ? `<img alt="" src="${hooks.iconFor(stack.type)}" draggable="false" />` : ''}
        <span>${index + 1}</span>
        ${stack?.noteId ? '<b class="count note-mark">记</b>' : ''}
        ${count != null && !stack?.noteId ? `<b class="count">${count}</b>` : ''}
      </button>`;
    }).join('');
    const held = stackOf(hotbar[selected]);
    hooks.hudName.textContent = held
      ? (held.noteId || held.count == null ? slotName(held, hooks) : `${BLOCKS[held.type].name} × ${held.count}`)
      : '空着手';
  }

  function endDrag() {
    drag = null;
    ghost.classList.add('hidden');
    root.classList.remove('dragging');
    root.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(event) {
    if (!drag) return;
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    drag.moved = drag.moved || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6;
    root.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const target = under?.closest?.('[data-area]');
    if (target && root.contains(target)) target.classList.add('drag-over');
  }

  function onPointerUp(event) {
    if (!drag) return;
    const current = drag;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const slotEl = under?.closest?.('[data-area]');
    const target = !slotEl || !root.contains(slotEl)
      ? null
      : slotEl.dataset.area === 'trash'
        ? { area: 'trash' }
        : { area: slotEl.dataset.area, index: Number(slotEl.dataset.index) };
    endDrag();

    if (!current.moved && current.copy) {
      commit(applyDrop(hotbar, backpack, current, { area: 'hotbar', index: slot }));
      return;
    }
    if (!current.moved && current.from?.area === 'hotbar' && target?.area !== 'trash') {
      slot = current.from.index;
      render();
      hooks.onChange();
      return;
    }
    if (!current.moved && current.from && target?.area !== 'trash') return;
    if (!target) return;
    commit(applyDrop(hotbar, backpack, current, target));
  }

  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const template = event.target.closest('[data-template]');
    const slotEl = event.target.closest('[data-area]');
    if (!template && !slotEl) return;
    if (slotEl?.dataset.area === 'trash') return;
    event.preventDefault();

    if (event.shiftKey) {
      const from = template
        ? { template: template.dataset.template }
        : { area: slotEl.dataset.area, index: Number(slotEl.dataset.index) };
      commit(quickMove(hotbar, backpack, from));
      return;
    }

    if (template) {
      drag = { type: template.dataset.template, copy: true, from: null, x: event.clientX, y: event.clientY, moved: false };
    } else {
      const area = slotEl.dataset.area;
      const index = Number(slotEl.dataset.index);
      const held = stackOf(read(hotbar, backpack, area, index));
      if (!held) {
        if (area === 'hotbar') {
          slot = index;
          render();
          hooks.onChange();
        }
        return;
      }
      drag = { type: held.type, stack: held, copy: false, from: { area, index }, x: event.clientX, y: event.clientY, moved: false };
    }

    ghost.innerHTML = `<img alt="" src="${hooks.iconFor(drag.type)}" /><em>${escapeHtml(slotName(drag.stack || { type: drag.type, count: null }, hooks))}</em>`;
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    ghost.classList.remove('hidden');
    root.classList.add('dragging');
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });

  root.addEventListener('contextmenu', (event) => {
    if (root.contains(event.target)) event.preventDefault();
  });

  root.querySelector('#inv-close').addEventListener('click', () => hooks.onClose());

  renderTemplates();

  return {
    isOpen: () => !root.classList.contains('hidden'),
    open() {
      root.classList.remove('hidden');
      render();
    },
    close() {
      if (drag) endDrag();
      root.classList.add('hidden');
    },
    select(index) {
      if (index < 0 || index >= HOTBAR_SIZE) return;
      slot = index;
      render();
    },
    selectedType() {
      return stackOf(hotbar[slot])?.type || null;
    },
    collect(type, noteId = null) {
      const next = collectBlock(hotbar, backpack, type, 1, noteId);
      if (!next.ok) return false;
      hotbar = next.hotbar;
      backpack = next.backpack;
      render();
      hooks.onChange();
      return true;
    },
    consumeSelected() {
      const held = stackOf(hotbar[slot]);
      if (!held) return null;
      if (held.count == null) return held;
      hotbar[slot] = held.count <= 1 ? null : { type: held.type, count: held.count - 1 };
      render();
      hooks.onChange();
      return held;
    },
    hasNote(noteId) {
      return [...hotbar, ...backpack].some((slot) => stackOf(slot)?.noteId === noteId);
    },
    clearNote(noteId) {
      const strip = (slot) => {
        const stack = stackOf(slot);
        if (!stack || stack.noteId !== noteId) return stack;
        return { type: stack.type, count: 1 };
      };
      hotbar = hotbar.map(strip);
      backpack = backpack.map(strip);
      render();
    },
    load(save) {
      const state = loadInventoryState(save);
      hotbar = state.hotbar;
      backpack = state.backpack;
      slot = state.slot;
      render();
    },
    toJSON() {
      return { hotbar: hotbar.slice(), backpack: backpack.slice(), slot };
    },
  };
}
