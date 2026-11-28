# 《王者万象棋》资料站数据说明

## 数据边界

- 当前数据集定位为 **S1 正式服**，版本基线为 `v1.12.1`（2026-11-25），人工与官网原生图鉴接口核验日期为 2026-11-28。
- 结构化卡牌来自 `.research/catalogs/{hero,equipment,talent,effect}.json`；棋手来自 `.research/player-array-1.json` 的 20 条记录与 `.research/player-wufeng.json`，合计 21 人。
- 输出保留 `historical_pending` 记录用于追溯，但“当前数”只统计 `versionStatus !== "historical_pending"` 的条目。`supplementary` 因不属于 `historical_pending`，按此口径计入当前数；因此分类当前数不一定等于原始 catalog 的 `currentCount`。
- **S2、建木、太乙不得混入本数据集。** 后续赛季或未核验角色应单独存放、单独标注，不能借更新 S1 文件的方式加入，也不能用新赛季文本覆盖当前正式服记录。
- `formal`、`resource`、`trigger` 等研究性归纳与 `original`、`rawBaseStats` 等原始资料并存时，不应把归纳文本当作官方原文。

## 版本与证据优先级

1. 当前正式服公告及公告中的明确修订优先。
2. 官网当前卡牌资料、官网新手指引次之。
3. 知识站整理与社区攻略用于补充展示和检索，不能覆盖更高优先级证据。
4. 无法确认的内容保留 `pending`、`imageStatus` 或历史状态，不猜测补写。

### 公告修订层（`CARD_OVERRIDES`）

`scripts/build-data.mjs` 顶部维护一张 `CARD_OVERRIDES` 表，把官方公告“调整后”原文覆盖到对应棋手技能段与关联卡，并为每条写入 `sourceUpdate` 与修订理由。当前共 7 条，覆盖 `v1.9.1`(18940994)、`v1.9.4`(18943094)、`v1.11.1`(18956191) 三份公告：

| 棋手 | 卡片 | 修订要点 | 公告 |
| --- | --- | --- | --- |
| 嬴律 | 94352 并购红利 | 单回合内合成第 4 次时随机复制 | 18956191 |
| 嬴律 | 94302 投资增值 | 升级返能 2 → 3 能量 | 18940994 |
| 嬴律 | 94362 贷款协议 | 回合结束结算、颁布者特权重写 | 18940994 |
| 乔汐 | 92299 温柔呼唤 | 召唤 2-5 阶 → 3-5 阶 | 18940994 |
| 乔汐 | 92210 潮汐的交响 | 触发 3 → 2 次、+5 → +3 | 18943094 |
| 安琪拉 | 95153 攻速加持 | 25% → 30% | 18940994 |
| 安琪拉 | 95163 打扫战场 | 100% → 125% | 18940994 |

构建后会逐条断言（文本 + `sourceUpdate.id/date`），`npm run validate:data` 也会再验一次。
### 数值分歧层（`ITEM_CAVEATS`）

与公告修订分开：`ITEM_CAVEATS` 用于**无法裁定、但必须如实提示**的数值分歧。当前 1 条——`hero-sunbin`（孙膑·时空爆弹）：镜像图鉴作 `100+100%`，多家第三方攻略作 `50+100%`。注入后写入 `CatalogItem.caveat`，详情抽屉以朱砂色「数值分歧 · 待端内复核」块展示；`validate:data` 断言该字段存在，避免被无意删除。

完整的公告比对表与未决项见 [VERIFICATION.md](./VERIFICATION.md)。**帝临不得误标为 v1.11.1**；其与 v1.8.1 公告仅存在“二选一/二选一种”用字差异，保留卡面写法。

## 字段来源与输出约定

| 字段/数据 | 来源与处理 |
| --- | --- |
| `id`、`rawId`、`name`、品阶、阵营、卡面描述 | catalog 原始条目；catalog 的 `itemDefaults` 先合并，条目自身字段优先 |
| `officialSkill`、`officialKeywords`、`rawBaseStats`、`growth` | 英雄 catalog 中的官网资料和结构化整理，原样保留 |
| `relatedCards`、`derivedCards` | catalog 的关联/派生卡资料，远程图片地址保留 |
| `version`、`versionStatus`、`sourceUpdate`、`imageStatus`、`evidenceLayer` | 原始资料的版本与证据标记，不由构建脚本统一覆盖 |
| 棋手 `skillSections` | 棋手原始数组或武凤记录，保持原结构 |
| 棋手 `cards` | 仅保留 `id/name/description/rawDescription/path/sourceUrl/shopBuyCost/previewCardIDs/sourceCardIDs`；94352 另加必需的 `sourceUpdate` |
| `kind` | 构建脚本添加：`hero/player/talent/equipment/effect` |
| `searchText` | 由名称、原始/整理描述、阵营、关键词、技能、关联卡等展示文本生成 |
| `image`、`thumbnail`、`avatar` | 保留远程原值；`localImage` 是另加的站内图片路径，不替换远程字段 |
| `sourceUrl` | 卡牌为 `https://wzwxq.com/explore/<id>`，棋手为 `https://wzwxq.com/players`；棋手关联卡内的 `sourceUrl` 仍指原卡面来源 |
| `officialUrl` | 官网图鉴 `https://wxq.qq.com/cp/a20260707sfgw/index.html`：棋手 `#page3`，卡牌 `#page4`；玩法规则另使用 `officialGuideUrl` 指向新手指引 |
| `meta.json` | 由实际输出重新计数，记录版本、核验日期、赛季、分类总数/当前数及官方/知识站 URL；`counts`（`total/current`）与 `sourceUrl` 是兼容现有 `CatalogMeta` 类型的别名，详细分类同时保留在 `categories`（`totalCount/currentCount`） |

构建时会递归移除巨型 `posterSource`、`avatarSource`、`sourceCollection` 元数据，其余有展示价值的字段默认保留。武凤没有 `cards` 是允许的，不补造关联卡。

## 机制与社区数据

- `src/data/mechanics.ts` 的 `coreRules` 依据[官网新手指引](https://wxq.qq.com/cp/a202609xszy/)整理，包括 6 名棋手、60 初始生命值、天赋三选一、6 级专属、英雄 1–999 级、购牌/出售能量、能量累积和竞拍规则。
- `upgradeCosts` 的 1→2/2→3/3→4/4→5/5→6 能量为 **社区数据，待复核**，所以导出 `verification = "community"`，不能显示成已获当前官方公告确认。
- 社区来源：[3DM 手游攻略](https://shouyou.3dmgame.com/gl/639843.html)、[豌豆荚攻略](https://www.wandoujia.com/strategy/18193987052139386997.html)。后续若公告或游戏内实测有不同结果，应更新数值、来源和核验状态。
- `latestPatch` 只记录上述嬴律「并购红利」变化，不汇总无关条目。

## 图片边界

- `download-images.mjs` 下载主条目的 `thumbnail`（缺失时用 `image`）以及棋手 `avatar`，写入 `public/images/<kind>/<id>.webp`。
- 已存在文件会跳过；单张失败只记录，不中断其余下载。关联卡图片不批量下载，仍使用远程地址。
- `localImage` 是固定路径约定；远程 `image/thumbnail/avatar` 始终保留，便于回退和追溯。

## 更新办法

1. 更新 `.research` 中对应的公开原始资料，并核对版本、公告 ID、日期和证据层级；不要把 S2/建木/太乙混入 S1 输入。
2. 如有正式服公告修订，优先修订对应原始条目或有明确目标的构建规则，避免全局文本替换。棋手技能与关联卡需分别核对。
3. 运行构建：

   ```bash
   node scripts/build-data.mjs
   ```

4. 检查 `meta.json` 的总数/当前数、嬴律 94352 文本和 `sourceUpdate`，并确认帝临等其他条目的版本没有被顺带修改。
5. 再运行图片下载：

   ```bash
   node scripts/download-images.mjs
   ```

6. 查看脚本输出的下载、跳过和失败数量；对失败条目核对远程 URL 后重跑。已存在的成功文件不会重复下载。
7. 若机制、术语或升级能量发生变化，同步更新 `src/data/mechanics.ts` 和本说明；社区数据在官方复核前仍须标注待复核。
