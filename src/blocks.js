export const WOOLS = [
  { id: 'wool_white', name: '白色羊毛', color: '#f3f3f3' },
  { id: 'wool_red', name: '红色羊毛', color: '#c6453c' },
  { id: 'wool_orange', name: '橙色羊毛', color: '#e07a2f' },
  { id: 'wool_yellow', name: '黄色羊毛', color: '#e6c229' },
  { id: 'wool_green', name: '绿色羊毛', color: '#3e9b45' },
  { id: 'wool_cyan', name: '青色羊毛', color: '#2aa7b8' },
  { id: 'wool_blue', name: '蓝色羊毛', color: '#3a5ec9' },
  { id: 'wool_purple', name: '紫色羊毛', color: '#8a45b5' },
];

export const BLOCKS = {
  grass: { id: 'grass', name: '草方块', color: '#3fa34a', breakable: true },
  dirt: { id: 'dirt', name: '泥土', color: '#8d6240', breakable: true },
  stone: { id: 'stone', name: '石头', color: '#8d8d8d', breakable: true },
  planks: { id: 'planks', name: '橡木木板', color: '#b5884a', breakable: true },
  log: { id: 'log', name: '橡木原木', color: '#6b4a2b', breakable: true },
  bookshelf: { id: 'bookshelf', name: '书架', color: '#8c5a32', breakable: true, shelf: true },
  bricks: { id: 'bricks', name: '砖块', color: '#a85b48', breakable: true },
  glass: { id: 'glass', name: '玻璃', color: '#b9e3f2', breakable: true, transparent: true },
  bedrock: { id: 'bedrock', name: '基岩', color: '#3a3a3a', breakable: false },
};

for (const wool of WOOLS) {
  BLOCKS[wool.id] = {
    id: wool.id,
    name: wool.name,
    color: wool.color,
    breakable: true,
    wool: true,
  };
}

export const TEMPLATES = [
  'grass', 'dirt', 'stone', 'planks', 'log', 'bookshelf', 'bricks', 'glass',
  ...WOOLS.map((wool) => wool.id),
];

export const DEFAULT_HOTBAR = [
  'grass', 'dirt', 'stone', 'planks', 'log', 'bookshelf', 'bricks', 'glass', 'wool_white',
];

export function isKnownBlock(type) {
  return Boolean(BLOCKS[type]);
}
