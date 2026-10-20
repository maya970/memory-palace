export const WOOLS = [
  { id: 'wool_white', name: '白色羊毛', color: '#f3f3f3' },
  { id: 'wool_light_gray', name: '淡灰色羊毛', color: '#bdbdbd' },
  { id: 'wool_gray', name: '灰色羊毛', color: '#5c5c5c' },
  { id: 'wool_black', name: '黑色羊毛', color: '#1c1c1c' },
  { id: 'wool_brown', name: '棕色羊毛', color: '#7b4b2a' },
  { id: 'wool_red', name: '红色羊毛', color: '#c6453c' },
  { id: 'wool_orange', name: '橙色羊毛', color: '#e07a2f' },
  { id: 'wool_yellow', name: '黄色羊毛', color: '#e6c229' },
  { id: 'wool_lime', name: '黄绿色羊毛', color: '#7bc043' },
  { id: 'wool_green', name: '绿色羊毛', color: '#3e9b45' },
  { id: 'wool_cyan', name: '青色羊毛', color: '#2aa7b8' },
  { id: 'wool_light_blue', name: '淡蓝色羊毛', color: '#6bb6d6' },
  { id: 'wool_blue', name: '蓝色羊毛', color: '#3a5ec9' },
  { id: 'wool_purple', name: '紫色羊毛', color: '#8a45b5' },
  { id: 'wool_magenta', name: '品红色羊毛', color: '#bd4a9b' },
  { id: 'wool_pink', name: '粉红色羊毛', color: '#f2a7b8' },
];

export const EXTRA_BLOCKS = [
  { id: 'cobblestone', name: '圆石', color: '#8a8a8a', group: '建筑', look: 'rubble', colors: ['#7a7a7a', '#8e8e8e', '#6a6a6a', '#9a9a9a'] },
  { id: 'stone_bricks', name: '石砖', color: '#7d7d7d', group: '建筑', look: 'bricks', colors: ['#8a8a8a', '#767676', '#6a6a6a'], mortar: '#b5b5b5' },
  { id: 'sand', name: '沙子', color: '#e0d2a0', group: '建筑', look: 'noise', colors: ['#e6d7a8', '#d8c48a', '#efe3b8', '#c9b57a'] },
  { id: 'sandstone', name: '砂岩', color: '#e2d4a4', group: '建筑', look: 'bands', colors: ['#eadcb0', '#dcc88a', '#f0e4bc', '#cbb878'] },
  { id: 'quartz', name: '石英块', color: '#ece8e2', group: '建筑', look: 'smooth', colors: ['#f7f4ef', '#e6e1da', '#faf8f5'] },
  { id: 'deepslate', name: '深板岩', color: '#4a4e54', group: '建筑', look: 'bands', colors: ['#4e545c', '#3e444c', '#5a6068', '#343a42'] },
  { id: 'blackstone', name: '黑石', color: '#2a2428', group: '建筑', look: 'noise', colors: ['#2c262a', '#1e1a1e', '#3a3236', '#141214'] },
  { id: 'obsidian', name: '黑曜石', color: '#1a1028', group: '建筑', look: 'noise', colors: ['#140e22', '#241838', '#0e0a16', '#3a2860'] },
  { id: 'snow', name: '雪块', color: '#f4f7fb', group: '建筑', look: 'noise', colors: ['#f7f9fc', '#e6eef6', '#ffffff', '#d5e0ea'] },
  { id: 'ice', name: '冰', color: '#a5d6e8', group: '建筑', look: 'glass', tint: 'rgba(150, 210, 230, 0.55)', transparent: true },
  { id: 'oak_leaves', name: '橡树树叶', color: '#3d8c3a', group: '建筑', look: 'leaves', colors: ['#2f7a32', '#3e8f38', '#4aa046', '#2a682c'], transparent: true },
  { id: 'moss', name: '苔藓块', color: '#4a6e32', group: '建筑', look: 'noise', colors: ['#3e6228', '#567e3a', '#2f501e', '#6a9448'] },
  { id: 'clay', name: '陶瓦', color: '#a08070', group: '建筑', look: 'smooth', colors: ['#b09080', '#947868', '#c4a090'] },
  { id: 'end_stone', name: '末地石', color: '#e6e2a8', group: '建筑', look: 'noise', colors: ['#efe8b0', '#ddd68a', '#f6f0c4', '#cfc678'] },
  { id: 'netherrack', name: '下界岩', color: '#7a2e2e', group: '建筑', look: 'noise', colors: ['#6e2424', '#8a3434', '#5a1c1c', '#a04040'] },
  { id: 'glowstone', name: '荧石', color: '#f0d070', group: '建筑', look: 'noise', colors: ['#f6dc78', '#e6c050', '#fff0a0', '#d4a838'] },
  { id: 'prismarine', name: '海晶石', color: '#5a9a8a', group: '建筑', look: 'bricks', colors: ['#4e8e80', '#67a898', '#3e7a6c'], mortar: '#2e5e54' },
  { id: 'spruce_planks', name: '云杉木板', color: '#6d5336', group: '木头', look: 'planks', colors: ['#7a5c3a', '#6a4c30', '#5c4128', '#8a6844'] },
  { id: 'spruce_log', name: '云杉原木', color: '#3e3224', group: '木头', look: 'log', bark: ['#3a2e22', '#2e261c', '#4a3a2a', '#261e16'], ring: ['#6a5038', '#5a4030'] },
  { id: 'birch_planks', name: '白桦木板', color: '#d7cb9a', group: '木头', look: 'planks', colors: ['#e6d8a8', '#d4c48e', '#c8b67a', '#f0e4bc'] },
  { id: 'birch_log', name: '白桦原木', color: '#d7d3c8', group: '木头', look: 'log', bark: ['#efeae0', '#d7d0c4', '#c8c0b0', '#f7f3ea'], ring: ['#d8c49a', '#c4a878'] },
  { id: 'dark_oak_planks', name: '深色橡木木板', color: '#4a3424', group: '木头', look: 'planks', colors: ['#5a4030', '#3e2c20', '#4a3428', '#6a4a34'] },
  { id: 'cherry_planks', name: '樱花木板', color: '#e4b4b0', group: '木头', look: 'planks', colors: ['#f0c4be', '#e0a8a4', '#d89896', '#f6d4ce'] },
  { id: 'iron', name: '铁块', color: '#d8d8d8', group: '矿物', look: 'metal', colors: ['#e8e8e8', '#c8c8c8', '#f4f4f4', '#b0b0b0'] },
  { id: 'gold', name: '金块', color: '#f6d24a', group: '矿物', look: 'metal', colors: ['#f8dc5a', '#e6c030', '#ffe07a', '#c9a020'] },
  { id: 'diamond', name: '钻石块', color: '#6eefe8', group: '矿物', look: 'metal', colors: ['#7af6f0', '#4ad4ce', '#b8fffc', '#2eb8b0'] },
  { id: 'emerald', name: '绿宝石块', color: '#2ec85a', group: '矿物', look: 'metal', colors: ['#3ad468', '#1ea848', '#7aee98', '#148838'] },
  { id: 'copper', name: '铜块', color: '#c46e48', group: '矿物', look: 'metal', colors: ['#d48058', '#b45e3c', '#e09870', '#8e4a30'] },
  { id: 'lapis', name: '青金石块', color: '#2a3c9a', group: '矿物', look: 'noise', colors: ['#24368e', '#1a2870', '#3a4cb0', '#142058'] },
  { id: 'redstone', name: '红石块', color: '#c02020', group: '矿物', look: 'noise', colors: ['#b01818', '#d02828', '#8e1010', '#e04040'] },
  { id: 'coal', name: '煤炭块', color: '#1a1a1a', group: '矿物', look: 'noise', colors: ['#141414', '#222222', '#0e0e0e', '#2e2e2e'] },
];

export const BLOCKS = {
  grass: { id: 'grass', name: '草方块', color: '#3fa34a', breakable: true, group: '建筑' },
  dirt: { id: 'dirt', name: '泥土', color: '#8d6240', breakable: true, group: '建筑' },
  stone: { id: 'stone', name: '石头', color: '#8d8d8d', breakable: true, group: '建筑' },
  planks: { id: 'planks', name: '橡木木板', color: '#b5884a', breakable: true, group: '木头' },
  log: { id: 'log', name: '橡木原木', color: '#6b4a2b', breakable: true, group: '木头' },
  bookshelf: { id: 'bookshelf', name: '书架', color: '#8c5a32', breakable: true, shelf: true, group: '建筑' },
  bricks: { id: 'bricks', name: '砖块', color: '#a85b48', breakable: true, group: '建筑' },
  glass: { id: 'glass', name: '玻璃', color: '#b9e3f2', breakable: true, transparent: true, group: '建筑' },
  bedrock: { id: 'bedrock', name: '基岩', color: '#3a3a3a', breakable: false },
};

for (const block of EXTRA_BLOCKS) {
  BLOCKS[block.id] = { breakable: true, ...block };
}

for (const wool of WOOLS) {
  BLOCKS[wool.id] = {
    id: wool.id,
    name: wool.name,
    color: wool.color,
    breakable: true,
    wool: true,
    group: '羊毛',
  };
}

export const TEMPLATES = [
  'grass', 'dirt', 'stone', 'cobblestone', 'stone_bricks', 'sand', 'sandstone',
  'bookshelf', 'bricks', 'quartz', 'deepslate', 'blackstone', 'obsidian',
  'snow', 'ice', 'oak_leaves', 'moss', 'clay', 'end_stone', 'netherrack',
  'glowstone', 'prismarine', 'glass',
  'planks', 'log', 'spruce_planks', 'spruce_log', 'birch_planks', 'birch_log',
  'dark_oak_planks', 'cherry_planks',
  'iron', 'gold', 'diamond', 'emerald', 'copper', 'lapis', 'redstone', 'coal',
  ...WOOLS.map((wool) => wool.id),
];

export const DEFAULT_HOTBAR = [
  'grass', 'dirt', 'stone', 'planks', 'log', 'bookshelf', 'bricks', 'glass', 'wool_white',
];

export function isKnownBlock(type) {
  return Boolean(BLOCKS[type]);
}
