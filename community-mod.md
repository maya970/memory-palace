# 记忆宫殿社区模组细则（给 AI 和作者）

这份文件是给编程助手、玩家和手工作者看的。按这里的 JSON 写出一份 `.json`，用户在登录页或 Esc → **社区模组** → **导入模组** 即可装上。建筑物和家具是两种独立模组，也可以打成一份组合包。不要改游戏源码也能贡献内容。

游戏仓库：<https://github.com/maya970/memory-palace>

## 你要做什么

1. 问清作者要的是「一座宫殿 / 建筑」还是「几件家具」，还是两者都要。
2. 只输出 **一个 UTF-8 JSON 文件**，不要 zip，不要 Minecraft `.schem` / `.litematic`。
3. 手工也可以：在游戏里搭好后点 **导出这座宫殿** 或 **导出家具**，把文件发给别人。
4. 装法：社区模组 → 导入模组。宫殿会进入社区列表，点「进入这座宫殿」才铺进世界。家具会进背包模板栏。

## 总规则

- `kind` 必须是 `memory-palace-mod`，`version` 为 `1`。
- `part` 只能是 `palace`（建筑）、`furniture`（家具）或 `bundle`（家具 + 建筑，一份文件里两样都有）。
- `id`：小写字母、数字、下划线，最长 40。玩家家具的 id 导入后会自动加上 `mod_` 前缀。不要占用游戏已有 id。
- `name` 最长 24 字，`lead` 最长 80 字，`author` 最长 24 字。
- `official` 不要设成 `true`。那是游戏自带包。
- 不要复制魔戒 / 中土、其它受版权保护的影视场景、东京塔等现代商标地标、Minecraft 商业地图或「森罗物语」的模型贴图。
- 可以做：公有领域的历史建筑**类型**（金字塔、希腊神庙、罗马万神殿、木塔、长屋、风车等）的自制缩小轮廓；完全原创的房子和家具。
- 每个方块格只能放一件东西。桌布和桌上的笔不能占同一格，笔放邻格或上一格。
- 若希望「先写笔记再投放」能掉进房间：室内空格脚下要有实心方块，头顶 1～5 格内要有任意方块当屋顶。

## 坐标系与体量

- 一格一个方块。`placed` 每一项是 `[x, y, z, type]`。
- `x`、`z`：整数 **-64 到 64**。`y`：整数 **-2 到 32**。地面草皮大约在 `y = 0`，人站在 `y = 1`。
- `placed` 最多 **40000** 项。超出的丢掉。
- `removed` 可选，字符串键 `"x,y,z"`，表示拆掉默认岛上那一格。一般建筑包留空数组即可。
- `spawn`：`{ "x": 0.5, "y": 1, "z": 4.5, "yaw": 3.14159, "pitch": -0.08 }`。`yaw` 为弧度，`Math.PI` 面朝南。
- 家具造型 `parts` 在**单格内部**：`[x, y, z, w, h, d]`，原点在格子西南下角，边长约 0～1。最多 24 个盒子。

## 建筑模组 `part: "palace"`

```json
{
  "kind": "memory-palace-mod",
  "version": 1,
  "part": "palace",
  "id": "tiny_hut",
  "name": "小木屋",
  "author": "你的名字",
  "lead": "一间有屋顶的木屋，里面有书桌。",
  "spawn": { "x": 0.5, "y": 1, "z": 3.5, "yaw": 3.14159, "pitch": -0.08 },
  "world": {
    "removed": [],
    "placed": [
      [-3, 0, -3, "planks"],
      [3, 0, 3, "planks"],
      [-3, 1, -3, "planks"],
      [3, 4, 3, "spruce_planks"],
      [0, 1, 3, "oak_table"],
      [-1, 1, 1, "bookshelf"],
      [1, 1, 1, "writing_desk"],
      [1, 2, 1, "open_notebook"]
    ]
  }
}
```

写建筑时：先铺地板，再砌墙（中间留空），再盖屋顶，再开门洞（不要在门口写墙），最后放家具。门口南面 `z` 最大的那面墙中间拆掉 `y=1` 和 `y=2`。至少放一个 `bookshelf` 或 `writing_desk` / `open_notebook`，方便当笔记位点。

## 家具模组 `part: "furniture"`

```json
{
  "kind": "memory-palace-mod",
  "version": 1,
  "part": "furniture",
  "id": "bamboo_stool",
  "name": "竹凳包",
  "author": "你的名字",
  "lead": "一把矮竹凳。",
  "blocks": [
    {
      "id": "bamboo_stool",
      "name": "竹凳",
      "group": "家具",
      "color": "#c4a070",
      "look": "wood",
      "furnish": "seat",
      "solid": true,
      "noteHost": false,
      "parts": [
        [0.22, 0.42, 0.22, 0.56, 0.08, 0.56],
        [0.26, 0, 0.26, 0.08, 0.42, 0.08],
        [0.66, 0, 0.26, 0.08, 0.42, 0.08],
        [0.26, 0, 0.66, 0.08, 0.42, 0.08],
        [0.66, 0, 0.66, 0.08, 0.42, 0.08]
      ]
    }
  ]
}
```

`blocks[]` 字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 必填。导入后变成 `mod_…` |
| `name` | 背包里显示的中文名，最长 16 字 |
| `group` | `家具` / `布艺` / `小物` / `衣橱` |
| `color` | `#rrggbb` |
| `look` | `wood` / `cloth` / `check` / `item` |
| `furnish` | 大家具：`table` / `bed` / `seat` / `wardrobe` / `stand` |
| `place` | 小物：`cover` 铺在顶上，`prop` 放在顶上，`hang` 挂在侧面 |
| `covers` | `cover` 时填写 `["table"]` 或 `["bed"]` 或 `["seat"]` |
| `solid` | 小物、布、衣服用 `false`，人可以走过去 |
| `noteHost` | `true` 时对准它按 F 可写笔记 |
| `parts` | 必填（自制家具）。没有 parts 就是整格方块 |

不要给已有官方家具另写一份相同 id。官方家居已经在游戏里。

## 组合包 `part: "bundle"`

同一份 JSON 里既有 `blocks` 又有 `world`。先装家具，再把建筑推进社区列表。建筑里的 `type` 可以引用这份包里的家具 id。

## 游戏里已有的方块 id（建筑请优先用这些）

基础：`grass` `dirt` `stone` `cobblestone` `stone_bricks` `sand` `sandstone` `bookshelf` `bricks` `quartz` `deepslate` `blackstone` `obsidian` `snow` `ice` `oak_leaves` `moss` `clay` `end_stone` `netherrack` `glowstone` `prismarine` `glass` `planks` `log` `spruce_planks` `spruce_log` `birch_planks` `birch_log` `dark_oak_planks` `cherry_planks` `iron` `gold` `diamond` `emerald` `copper` `lapis` `redstone` `coal`

羊毛：`wool_white` `wool_light_gray` `wool_gray` `wool_black` `wool_brown` `wool_red` `wool_orange` `wool_yellow` `wool_lime` `wool_green` `wool_cyan` `wool_light_blue` `wool_blue` `wool_purple` `wool_magenta` `wool_pink`

家具：`oak_table` `round_table` `tea_table` `writing_desk` `oak_chair` `stool` `armchair` `sofa` `bench` `bed` `wardrobe` `cabinet` `nightstand` `dresser` `sideboard` `coat_rack` `screen` `chalkboard`

布艺：`cloth_linen` `cloth_red` `cloth_blue` `cloth_check` `cloth_green` `sheet_white` `sheet_navy` `sheet_rose` `quilt_patch` `pillow_white` `pillow_blue` `cushion`

小物：`open_notebook` `letter_stack` `ink_pen` `pencil_cup` `inkwell` `desk_lamp` `candle` `teacup` `teapot` `vase` `fruit_bowl` `photo_frame` `clock` `glasses` `stamp` `envelope` `key_dish` `jewelry_box` `comb` `plant_pot` `book_stack`

衣橱：`coat` `dress` `shirt` `scarf` `hat` `shoes` `robe`

未知的 `type` 导入时会丢掉那一格。自制家具要先出现在同文件的 `blocks` 里，或先导入家具包。

## 给 AI 的工作流程

1. 只生成 JSON，不要生成游戏补丁、不要下载别人的 schematic。
2. 先在脑中画出占地（建议不超过 30×30，高度不超过 20）。
3. 用循环思路列 `placed`：地板、墙、屋顶、门、家具。
4. 检查：门口不是实心；室内有屋顶；没有两件东西同一格；没有版权地名。
5. 把完整 JSON 交给用户保存为 `名字.json`。
6. 提醒用户：社区模组 → 导入模组 → 在「现成宫殿」或「家具包」里点进入 / 装上。

手工作者：在岛上搭好 → 导出这座宫殿；家具则导出当前家具包。两份文件可以分开传。
