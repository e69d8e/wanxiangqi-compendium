# 王者万象棋 · 知识库

> 这是本站的长期知识底稿：记录《王者万象棋》的赛季状态、版本、数据源、玩法口径、自动化流程和更新历史。
> **每次自动/手动更新前先读本文件；每次数据或版本变化后必须同步更新本文件。**
> 机器可读的赛季表格由 `tests/knowledge.test.ts` 校验，数据不一致时测试会失败。

## 基本信息

| 项 | 当前值 |
| --- | --- |
| 站点 | <https://wanxiangqi-compendium.netlify.app> |
| 仓库 | <https://github.com/e69d8e/wanxiangqi-compendium> |
| 文档更新时间 | 2026-11-28 |
| 默认赛季 | S1 正式服 |
| 当前版本 | v1.12.1 |
| 版本日期 | 2026-11-25 |
| 数据核验日 | 2026-11-28 |
| 结构化条目 | 603 条（当前 581） |
| 自动化节奏 | 每周六 10:00（Asia/Shanghai） |

站点的定位是「可检索、可追溯的正式服资料库」，不是攻略站，也不是体验服情报站。所有条目保留来源、版本状态和核验标记；公告修订优先于滞后的静态卡面。

## 当前赛季状态

<!-- AUTO:SEASONS:START -->
| 赛季 | 状态 | 版本 | 版本日期 | 核验日期 | 总 / 当前 | 英雄 | 棋手 | 天赋 | 装备 | 效果牌 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 正式服 | v1.12.1 | 2026-11-25 | 2026-11-28 | 603 / 581 | 86 / 86 | 21 / 21 | 300 / 299 | 95 / 77 | 101 / 98 |
<!-- AUTO:SEASONS:END -->

表格口径：

- 「总」包含历史与补充收录；「当前」只统计 `versionStatus !== "historical_pending"` 的条目。
- 分类顺序固定为英雄、棋手、天赋、装备、效果牌，对应数据文件 `heroes/players/talents/equipment/effects.json`。
- 新赛季必须单独一行；旧赛季不得被新赛季覆盖。

## 最新正式服公告

- 版本：**v1.12.1**
- 公告：`18960194`，2026-11-25 版本更新公告（2026-11-24 19:33 发布）
- 详情：<https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=18960194&tab=2>
- 玩法勘误：修复天赋【帝临】中错误地将「双防」描述为「双抗」的问题。本版本无其他卡牌数值或棋手技能改动；S1 赛季冲刺特权持续至 2026-12-09，S2 仍在体验服测试（S2 前瞻直播定档 2026-11-29 17:00）。
- 前序正式服公告已逐条核对：
  - **v1.11.1**（`18956191`，2026-11-19）：嬴律「并购红利」（卡 94352）改为单回合内合成第 4 次复制；天赋「帝临」取消棋手 4 级天赋商店投放。
  - **v1.10.2**（`18951324`，2026-11-12）：修复偶现双方英雄不对战问题。
  - **v1.10.1**（`18950617`，2026-11-12）：新增天赋「以物易物」（已收录为 `talent-636202`）；帝临「独断·三」增加双防吸收上限 100 点（当时误写为“双抗”，已在 v1.12.1 修复）。
  - 更早的公告修订（v1.9.1 / v1.9.4）见 `DATA_NOTES.md` 与 `VERIFICATION.md`。

公告只按原文明确写出的「调整后」文本覆盖卡面。找不到明确原文时保留原卡面并记录 pending，不猜、不补写。

## 玩法速览

以下是站点机制页采用的稳定口径，详细文本与来源见 `src/data/mechanics.ts`（2026-11-28 已对照官方新手指引实机复核）：

- 对局为 6 名棋手参与，初始生命值 60。
- 天赋三选一，6 名玩家同级获得的天赋品阶相同，白银段位起每局有 1 次天赋刷新；棋手有 6 级专属能力。
- 英雄等级范围为 1–999，升级消耗能量。
- 购牌、出售、合成、刷新与竞拍围绕能量运转；能量可累积；竞拍等待期间地面随机掉落互动道具、1 点能量或 1–2 阶英雄牌。
- 升级能量阶梯为 7 / 13 / 17 / 23 / 27（社区汇总，待端内复核）。
- 官网卡牌筛选列出的 12 个官方关键词为：登场、夺取、牺牲、整备、开团、闪现、复生、退场、凯旋、败阵、图腾、合成；另补充常见相关机制术语（完美复生、觉醒、临时等级、永久等级、阿科米亚核心、转瞬、古币）。

机制页的「升级能量」明确标注为社区数据，不能当作官方公告结论。

## 赛季与数据源

### S1（当前正式服）

- `datasetId`：`s1-live`
- 数据方式：legacy（源站没有 S1 的 dataset manifest）
- 腾讯官网原生图鉴接口（2026-11-28 通过 `ego-browser` 实机核对）：
  - 英雄（85）：`https://game.gtimg.cn/images/amside/ide_timer/589094_oscard_new_1.js`
  - 效果牌（98）：`https://game.gtimg.cn/images/amside/ide_timer/589094_oscard_new_2.js`
  - 装备（77）：`https://game.gtimg.cn/images/amside/ide_timer/589094_oscard_new_4.js`
  - 天赋（292）：`https://game.gtimg.cn/images/amside/ide_timer/589094_oscard_new_8.js`
  - 棋手与技能（21）：`https://game.gtimg.cn/images/amside/ide_timer/589094_oscard_new_16.js`
  - 棋手 CMS 档案（21）：`https://vasd-cms.qq.com/cms/osgamewsq/prod/api/v1/osgamewsqwsq_info_article_3019.json`
- 知识站图鉴目录：
  - <https://wzwxq.com/explorer-catalogs/hero.json>
  - <https://wzwxq.com/explorer-catalogs/equipment.json>
  - <https://wzwxq.com/explorer-catalogs/talent.json>
  - <https://wzwxq.com/explorer-catalogs/effect.json>
- 棋手：知识站 `assets.wanxiangqiwiki.com/assets/site-*.js` 引用的 `chessplayerFacts-*.js`
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
src/data/loader.ts                   按赛季动态加载与轻量 meta 入口
src/styles/                          按 @layer 拆分的模块化现代 CSS
public/images/<id>/<kind>/*.webp     赛季隔离图片（tracked）
src/components/                      页面、原生 <dialog> 抽屉/搜索与赛季切换器
scripts/                             build-data / download-images / validate-data / sync-live / check-netlify
docs/AUTOMATION.md                   每周自动更新流程
DATA_NOTES.md                        字段、证据层与公告覆盖细节
VERIFICATION.md                      公告逐条比对、官网接口核对与未决项
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

### 2026-11-28

- **官网全量实机核对与版本推进**：通过 `ego-browser` 直接核对 `wxq.qq.com` 公告页、`a202609xszy` 新手指引及 5 套腾讯官网原生图鉴接口（`589094_oscard_new_{1,2,4,8,16}.js`）；正式服 S1 版本更新至 **v1.12.1**（2026-11-25，`newsid=18960194`），核验日更新至 **2026-11-28**。
- **数据精细修正**：补全乔汐「潮汐的交响」（`92210`）官网原件括号说明`（优先随机温柔呼唤的英雄）`；确认孙膑「时空爆弹」在腾讯官网原件亦为 `100+100%` 并更新 caveat 说明；机制页补充 2 条官方新手指引规则（同级天赋品阶与白银刷新、竞拍等待地面掉落）；记录官网 `heroCards` 85 名（不含镜像中的王维 `#1381`）等比对差异至 `VERIFICATION.md`。
- **现代 Web 全面重构**：按 `modern-web-guidance` 重构前端架构——拆分 6 层 CSS `@layer`、全面改用 `rem` 与 WCAG 2.2 AA/AAA 对比度令牌、将搜索/详情/移动端导航与移动端筛选全部迁移至原生 `<dialog>` + `showModal()` + `closedby="any"` 及跨浏览器回退、补齐 IME 安全回车、`<search>` / 语义 `<table>` / stretched-link 卡片、View Transitions 焦点路由、滚动与历史栈修复、以及按赛季与路由拆包（首屏入口 JS 由 1,792 kB 降至 260 kB）。

### 2026-11-26

- 新建本知识库，作为每周更新前的固定上下文。
- 记录 S1 v1.11.1 基线、603 / 581 计数、正式服公告与数据源。
- 增加机器校验：赛季状态表必须与构建后的 meta 一致。

### 2026-11-23

- 站点完成多赛季改造：`seasons.config.json`、`src/data/seasons/<id>/`、`public/images/<id>/`、顶栏切换器与 `season` 路由。
- 自动化支持发现正式服 dataset，并隔离体验服测试集。
- 基线仍为 S1 v1.11.1；当时无 S2/S3 正式服数据。
