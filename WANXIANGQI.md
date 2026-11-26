# 王者万象棋 · 知识库

> 这是本站的长期知识底稿：记录《王者万象棋》的赛季状态、版本、数据源、玩法口径、自动化流程和更新历史。
> **每次自动/手动更新前先读本文件；每次数据或版本变化后必须同步更新本文件。**
> 机器可读的赛季表格由 `tests/knowledge.test.ts` 校验，数据不一致时测试会失败。

## 基本信息

| 项 | 当前值 |
| --- | --- |
| 站点 | <https://wanxiangqi-compendium.netlify.app> |
| 仓库 | <https://github.com/e69d8e/wanxiangqi-compendium> |
| 文档更新时间 | 2026-11-26 |
| 默认赛季 | S1 正式服 |
| 当前版本 | v1.11.1 |
| 版本日期 | 2026-11-19 |
| 数据核验日 | 2026-11-21 |
| 结构化条目 | 603 条（当前 581） |
| 自动化节奏 | 每周六 10:00（Asia/Shanghai） |

站点的定位是「可检索、可追溯的正式服资料库」，不是攻略站，也不是体验服情报站。所有条目保留来源、版本状态和核验标记；公告修订优先于滞后的静态卡面。

## 当前赛季状态

<!-- AUTO:SEASONS:START -->
| 赛季 | 状态 | 版本 | 版本日期 | 核验日期 | 总 / 当前 | 英雄 | 棋手 | 天赋 | 装备 | 效果牌 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 正式服 | v1.11.1 | 2026-11-19 | 2026-11-21 | 603 / 581 | 86 / 86 | 21 / 21 | 300 / 299 | 95 / 77 | 101 / 98 |
<!-- AUTO:SEASONS:END -->

表格口径：

- 「总」包含历史与补充收录；「当前」只统计 `versionStatus !== "historical_pending"` 的条目。
- 分类顺序固定为英雄、棋手、天赋、装备、效果牌，对应数据文件 `heroes/players/talents/equipment/effects.json`。
- 新赛季必须单独一行；旧赛季不得被新赛季覆盖。

## 最新正式服公告

- 版本：**v1.11.1**
- 公告：`18956191`，2026-11-19 版本更新公告
- 详情：<https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=18956191&tab=2>
- 已确认修订：嬴律「并购红利」（卡 94352）——合成英雄时获得 1 能量，每回合限 3 次；单回合内合成第 4 次时，随机获得 1 张场上英雄的复制。
- 更早的公告修订（v1.9.1 / v1.9.4）见 `DATA_NOTES.md` 与 `VERIFICATION.md`。

公告只按原文明确写出的「调整后」文本覆盖卡面。找不到明确原文时保留原卡面并记录 pending，不猜、不补写。

## 玩法速览

以下是站点机制页采用的稳定口径，详细文本与来源见 `src/data/mechanics.ts`：

- 对局为 6 名棋手参与，初始生命值 60。
- 天赋三选一；棋手有 6 级专属能力。
- 英雄等级范围为 1–999，升级消耗能量。
- 购牌、出售、合成、刷新与竞拍围绕能量运转；能量可累积。
- 升级能量阶梯为 7 / 13 / 17 / 23 / 27（社区汇总，待端内复核）。
- 核心关键词包括登场、夺取、牺牲、整备、开团、闪现、复生、退场、凯旋、败阵、图腾、觉醒、临时等级、永久等级、阿科米亚核心、转瞬、古币等。

机制页的「升级能量」明确标注为社区数据，不能当作官方公告结论。

## 赛季与数据源

### S1（当前正式服）

- `datasetId`：`s1-live`
- 数据方式：legacy（源站没有 S1 的 dataset manifest）
- 图鉴目录：
  - <https://wzwxq.com/explorer-catalogs/hero.json>
  - <https://wzwxq.com/explorer-catalogs/equipment.json>
  - <https://wzwxq.com/explorer-catalogs/talent.json>
  - <https://wzwxq.com/explorer-catalogs/effect.json>
- 棋手：官网 `assets.wanxiangqiwiki.com/assets/site-*.js` 引用的 `chessplayerFacts-*.js`
- 公告接口：`https://apps.game.qq.com/cmc/cross`（`serviceId=389`、`chanid=7061`，签名密钥只保存在脚本/环境侧，不写入文档或仓库）
- 公告详情：<https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=&lt;id&gt;&tab=2>
- 原始资料：`.research/seasons/s1/explorer-catalogs/`、`.research/seasons/s1/players.json`、`.research/seasons/s1/players-wufeng.json`
- 构建产物：`src/data/seasons/s1/*.json`
- 图片：`public/images/s1/<kind>/<id>.webp`

### 后续正式赛季（S2/S3…）

- 只接受 `environment=live` 的正式服 dataset。
- 清单地址：`https://wzwxq.com/datasets/<datasetId>/manifest.json`
- 资源由 manifest 的 `resources` 给出，并带 sha256；必须校验后写入 `.research/seasons/<id>/`。
- 体验服 / `environment=test` 的数据集（如 `s2-test-*`）永远不进入正式页面，也不写入 `seasons.config.json`。
- 新赛季由 `npm run sync:live:write` 自动加入配置，之后必须补齐该赛季的 `meta.latestPatch`、文案、图片与验证。

## 仓库结构

```text
seasons.config.json                 赛季清单与元数据
.research/seasons/<id>/              原始资料（gitignore）
src/data/seasons/<id>/*.json         构建后的赛季数据（tracked）
public/images/<id>/<kind>/*.webp     赛季隔离图片（tracked）
src/components/                      页面与赛季切换器
scripts/                             build-data / download-images / validate-data / sync-live / check-netlify
docs/AUTOMATION.md                   每周自动更新流程
DATA_NOTES.md                        字段、证据层与公告覆盖细节
VERIFICATION.md                      公告逐条比对与未决项
```

## 自动化

- DSH 定时任务：每周六 10:00（Asia/Shanghai），每次新建会话。
- 任务第一步读取 `docs/AUTOMATION.md` 与本文件，然后执行：
  1. `npm run sync:live`：发现正式赛季，抓目录/棋手/公告并对比。
  2. 有变化时 `npm run sync:live:write`、`npm run build:data`、`npm run images`。
  3. 阅读公告原文，更新对应赛季的 `meta.latestPatch` / `currentPatch` / `verifiedAt`。
  4. 同步本文件、`seasons.config.json`、README/index.html 与测试中的硬编码口径。
  5. `npm run verify`，全部通过后提交并 push。
  6. 等 GitHub Actions 成功，再用 `npm run check:netlify -- --wait 300` 验证线上资源哈希。
- 没有数据变化时不产生空提交；只做线上构建校验。
- 失败时不推送、不伪造线上结果；下一次周六重新检查。

## 更新约定

1. **先读后更**：更新前先读本文件，确认当前默认赛季、基线版本、数据边界和上次核验日期。
2. **按赛季隔离**：新内容进入对应赛季目录；不得把 S2/体验服文本写进 S1。
3. **先公告后卡面**：只有公告明确「调整后」才覆盖；无明确原文保留 pending。
4. **同步本文件**：任何赛季的数量、版本、核验日、公告、数据源或流程变化，都必须更新上面的状态表、最新公告、数据源和变更记录。
5. **测试兜底**：`tests/knowledge.test.ts` 会校验状态表与 `src/data/seasons/*/meta.json` 是否一致；数据变了而本文件没改，`npm test` 会失败。
6. **变更记录只追加**：每次实质性更新追加一条，写清日期、赛季、版本、变化与提交号（如有）。

## 变更记录

### 2026-11-26

- 新建本知识库，作为每周更新前的固定上下文。
- 记录 S1 v1.11.1 基线、603 / 581 计数、正式服公告与数据源。
- 增加机器校验：赛季状态表必须与构建后的 meta 一致。

### 2026-11-23

- 站点完成多赛季改造：`seasons.config.json`、`src/data/seasons/<id>/`、`public/images/<id>/`、顶栏切换器与 `season` 路由。
- 自动化支持发现正式服 dataset，并隔离体验服测试集。
- 基线仍为 S1 v1.11.1；当时无 S2/S3 正式服数据。