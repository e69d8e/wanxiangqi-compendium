# 每周自动更新与部署

本站每周六 10:00（Asia/Shanghai）由一个 DSH 定时任务执行「发现赛季 → 抓取 → 核对 → 构建 → 推送 → 验证线上」的完整流程。定时任务只负责调度；具体判断与提交由一个全新的 agent 会话完成，仓库内脚本负责确定性部分。

站点支持多个**正式服**赛季独立归档：每个赛季有自己的数据、图片目录与页面入口，通过顶栏切换器查看，互不混数据。体验服（`environment=test`）数据集永远不进入站点。

每次更新前先读根目录 [WANXIANGQI.md](../WANXIANGQI.md)；只要赛季数量、版本、核验日、公告或流程发生变化，就必须同步更新该文件。`tests/knowledge.test.ts` 会比对知识库状态表与构建后的 meta，数据变了而知识库没改会导致测试失败。

## 定时任务

| 项 | 值 |
| --- | --- |
| 触发 | 每周六 10:00（Asia/Shanghai） |
| 任务类型 | DSH 定时任务，每次新建会话 |
| 工作目录 | `/Users/li/Code/Other/wanxiangqi-compendium` |
| 流程说明 | 本文件 |

任务提示词要求 agent 先读本文件与 `WANXIANGQI.md`，再按下方「标准流程」执行。任务失败不会自动重试；下一次周六会重新检查，因此失败后只需保证仓库可继续运行，不要在未验证的情况下推送。

## 赛季数据模型

```
seasons.config.json                 # 赛季清单 + 元数据
.research/seasons/<id>/              # 原始资料（gitignore）
  explorer-catalogs/*.json          # 英雄/装备/天赋/效果牌
  players.json                      # 棋手（S1 另拆出 players-wufeng.json）
  manifest.json                     # 正式数据集赛季的来源清单
src/data/seasons/<id>/*.json         # 构建产物（tracked）
public/images/<id>/<kind>/*.webp     # 本地图片（tracked）
```

`seasons.config.json` 中每个赛季包含：

- `id`、`label`、`shortLabel`、`order`、`status`（只允许 `live`）
- `datasetId`：源站数据集 id（如 `s1-live`）
- `research.catalogs`、`research.players`：原始资料路径，可写一个或多个
- `meta.currentPatch`、`meta.patchDate`、`meta.verifiedAt`、`meta.latestPatch`：页面文案与公告修订
- `research.announcementOverrides`：仅 S1 为 `true`，用于执行历史公告覆盖断言

S1 继续使用官网 legacy 数据源（`/explorer-catalogs/*.json` 与棋手 chunk）。**后续正式赛季必须走源站 dataset manifest**：`https://wzwxq.com/datasets/<datasetId>/manifest.json`，且 `environment` 必须是 `live`。

当前默认赛季是 S1，页面 URL 形如 `#/heroes?season=s1&filter=河洛`。切换赛季不会丢失当前视图，详情抽屉与筛选也会保留赛季。

## 知识库

根目录 `WANXIANGQI.md` 是长期知识底稿，至少包含：当前赛季状态表、最新正式服公告、数据源、玩法口径、自动化流程、更新约定与变更记录。

- 更新前：读它，确认默认赛季、基线版本、上次核验日期和数据边界。
- 更新后：同步状态表、最新公告、数据源、变更记录；状态表必须与 `src/data/seasons/<id>/meta.json` 一致。
- 机器校验：`tests/knowledge.test.ts`。
- 该文件是叙事文档，不是构建产物，不要手改 `meta.json` 去迁就它。

## 脚本

```bash
npm run sync:live          # 只读：发现正式赛季，抓目录/棋手/公告并对比本地
npm run sync:live:write    # 把确认后的变化写入 .research 与 seasons.config.json
npm run build:data         # 由 .research 生成 src/data/seasons/<id>/*.json
npm run images             # 补齐 public/images/<id>/ 缺失图片
npm run validate:data      # 校验数量、id、图片、赛季隔离、公告断言与禁用词
npm run check:netlify      # 对比本地 dist 与线上 /assets 哈希，默认最多等 300 秒
```

`sync:live` 结束时会输出一行 `SYNC_SUMMARY <json>`。关键字段：

- `discovery.live`：官网页面上发现的正式服 datasetId（已按 manifest 的 `environment=live` 过滤）
- `discovery.added`：本次新发现、但还未写入 `seasons.config.json` 的赛季
- `discovery.updated`：datasetId 变更、需要写回配置的已有赛季
- `seasons[].changed`：该赛季目录或棋手是否有变化
- `seasons[].manifestChanged`：数据集 manifest 是否变化（版本/资源哈希）
- `announcements.latestOfficialPatch`：最新正式服版本公告
- `announcements.newPatch`：是否高于默认赛季当前版本
- `dataChanged`：任一项需要继续处理

只读模式不会写盘；`--write` 也不会替你判断公告中的「调整后」文案，公告覆盖仍需 agent 阅读原文。

`check:netlify` 用 Vite 的内容哈希判断线上是否已经是本地这次构建：只有线上 HTML 引用的 `/assets/index-*.js` 与 `/assets/index-*.css` 和本地 `dist/index.html` 完全一致才算成功。可加 `--expect "v1.12.0"` 额外确认线上 JS bundle 含指定文本。

## 标准流程

### 1. 准备

```bash
cd /Users/li/Code/Other/wanxiangqi-compendium
# 先读 WANXIANGQI.md 与 docs/AUTOMATION.md
git status --porcelain          # 必须为空；有未提交改动先停下并报告
git pull --ff-only origin main
npm ci                          # 首次或 lockfile 变化时
```

### 2. 发现与对比

```bash
npm run sync:live
```

根据 `SYNC_SUMMARY` 分支：

- 没有 `discovery.added`、所有 `seasons[].changed` 为 false、`newPatch` 为 false：
  跳到第 7 步「无变化路径」。
- 有新赛季、目录/棋手变化，或 `manifestChanged`：
  继续第 3 步。
- `newPatch: true`：先按第 6 步核对公告，再决定是否把版本号与公告修订一起更新。

### 3. 写入原始资料并重建

```bash
npm run sync:live:write
npm run build:data
npm run images
```

- 新正式赛季会自动加入 `seasons.config.json`，并设为默认赛季；它会有独立的 `src/data/seasons/<id>/` 与 `public/images/<id>/`。
- `build-data.mjs` 会执行 id 唯一、赛季隔离、公告覆盖等断言。失败时停止并报告，不要绕过断言。
- `images` 只补齐缺失图片；相对图片路径按该赛季 `sourceUrl` 解析。

### 4. 页面与数据隔离检查

```bash
npm run dev
```

至少检查：

1. 顶栏赛季切换器能看到新旧赛季，切换后 URL 带 `season=<id>`，不会串数据。
2. 英雄/棋手/天赋/装备/效果牌数量、详情抽屉、图片都来自当前赛季。
3. 全站搜索只返回当前赛季条目；搜索底栏显示当前赛季与版本。
4. 旧赛季仍可访问，不因新增赛季被覆盖。
5. 移动端顶栏不溢出（`.season-switcher` 已做窄屏样式）。

涉及新赛季时，还要确认它来自 `environment=live` 的 manifest，**不能**把 `s2-test-*` 或任何体验服内容加入正式页面。

### 5. 同步硬编码口径

以下位置仍写死了 S1 的数量/版本，S1 变化时必须一起改；新增赛季时按实际赛季补文案：

| 文件 | 需要同步的内容 |
| --- | --- |
| `tests/data.test.ts` | S1 英雄 86、棋手 21、天赋 300、装备 95、效果牌 101、总数 603、当前 581 |
| `README.md` | 顶部版本/核验日期/603、分类数量、徽章、赛季说明 |
| `index.html` | `description`、`og:description` 与 `<noscript>` 的数量/赛季文案 |
| `seasons.config.json` | 新赛季的 label/shortLabel/order/meta/公告；由 `sync:live:write` 自动写入的部分需复核 |
| `WANXIANGQI.md` | 当前赛季状态表、版本、核验日、最新公告、数据源与变更记录 |
| `scripts/build-data.mjs` | S1 的 `CARD_OVERRIDES`、`PATCH_*`、`SOURCE_*` 与 caveat |
| `src/data/mechanics.ts` | 只放全局规则/词典/升级表；赛季公告已移到 `seasons.config.json` 的 `meta.latestPatch` |

只改实际变化的数字，不要为了「看起来一致」改掉未变化的分类数量。`src/data/seasons/<id>/meta.json` 由 `build:data` 生成，不要手改。

### 6. 新版公告核对（仅 `newPatch: true` 或新赛季）

1. 用 `SYNC_SUMMARY` 里的 `latestOfficialPatch.id` 打开 `https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=<id>&tab=2`。
2. 只采用正式服公告，排除标题含「体验服」的内容；S2 正式服公告可以用于 S2 页面，但不能混入 S1。
3. 只有公告原文明确写出「调整后」文本时，才更新对应赛季的 `meta.latestPatch`；S1 的卡面覆盖同时写入 `scripts/build-data.mjs` 的 `CARD_OVERRIDES`。
4. 找不到明确原文时保留原卡面并记录 pending，不要猜。
5. 重新执行 `npm run build:data`、`npm run validate:data`、`npm test`。

### 7. 无变化路径

没有 tracked 文件变化时，不提交空 commit，也不推送：

```bash
npm run build
npm run check:netlify -- --wait 60
```

`check:netlify` 成功说明当前线上仍是仓库 `main` 的构建；报告「本周无内容变化，未触发部署」即可结束。

### 8. 提交、推送与部署

有变化时，先跑完整校验：

```bash
npm run verify
git status --short
```

`verify` = `validate:data` + `test` + `build`。其中 `tests/knowledge.test.ts` 会检查 `WANXIANGQI.md` 状态表是否与赛季 meta 一致；任何一步失败都不提交、不推送。确认知识库已同步后再提交：

```bash
git add -A
git commit -m "chore(data): weekly sync $(date +%F)"
git push origin main
```

推送后 GitHub Actions 会执行 `.github/workflows/deploy.yml`（`npm ci` → `npm test` → `validate:data` → `build` → Netlify 生产部署）。等待并确认这次 run 成功：

```bash
git rev-parse HEAD
gh run list --workflow=deploy.yml --branch=main --limit=3
gh run watch <run-id> --exit-status
```

run 的 `headSha` 必须等于刚推送的 commit；失败时不要重复推送，先看日志定位。

### 9. 验证 Netlify

```bash
npm run check:netlify -- --wait 300
# 若本次是新版本，建议同时确认线上 bundle 的版本文本：
npm run check:netlify -- --wait 300 --expect "v1.12.0"
```

脚本会轮询线上 HTML，直到 `/assets` 文件名与本地 `dist/index.html` 一致。成功标准：

- 输出 `✓ 线上资源与本地构建一致，Netlify 部署已生效。`
- 若带 `--expect`，再输出 `✓ 线上 bundle ... 已包含期望文本`。
- 退出码 0。

超过等待时间仍不一致时，报告本地/线上资源名和最后错误，不要手动改 `dist` 伪造结果。

## 新正式赛季发现规则

`sync:live` 会从官网主 bundle 中提取 `sX-live` / `sX-test` 形态的 datasetId，并逐个请求 manifest：

- `environment=live` 且 schema 为 `game-dataset-manifest/v1`：可作为正式赛季。
- `environment=test`：只记录/跳过，绝不写入 `seasons.config.json`，也不下载到正式页面。
- manifest 404：S1 回退到 legacy 抓取；其他赛季直接报错，不猜测数据源。

如果源站换了暴露方式（例如不再在 bundle 中写 datasetId），需要人工从官方资料页找到正式 manifest，手动加入配置后再执行 `sync:live:write`。不要凭标题猜测 datasetId，也不要用体验服 manifest 代替。

## 失败处理

| 失败点 | 处理 |
| --- | --- |
| `sync:live` 抓取失败 | 报告 URL 与错误；不要用旧缓存假装成功；下次周六重试 |
| manifest sha256 不一致 | 停止；源站资源可能正在更新，保留本地数据，下次再试 |
| `build:data` 断言失败 | 停止在本地，保留 `.research` 新资料；报告冲突条目，等人工确认 |
| 新赛季被发现但 manifest 是 test | 跳过，绝不写入正式站点；在报告中说明 |
| `npm test` / `validate:data` 失败 | 不提交；修正数据或硬编码口径后重跑 |
| `git push` 失败 | 不要 force push；检查远端是否有新提交，先 `git pull --rebase` 再决定 |
| Actions 失败 | 用 `gh run view <id> --log-failed` 看日志；修复后重新提交 |
| Netlify 未更新 | 先确认 Actions 成功，再重跑 `check:netlify`；持续失败时报告，不要重复部署 |

## 安全边界

- `.research/`、`dist/`、`.netlify/` 均被 `.gitignore` 忽略；不要把原始抓取或构建产物提交进仓库。
- 不要读取、打印或提交 `~/Library/Preferences/netlify/config.json` 中的 token；部署认证由 GitHub Actions secrets 提供。
- 不要使用 `git push --force`，不要改写已推送历史。
- 只收 `environment=live` 的正式服赛季；公告「调整后」原文优先；无法确认的内容保留 pending，不猜测。
- 新旧赛季数据、图片、搜索索引必须隔离；不要把 S2 的条目补进 S1，也不要用 S1 的图片冒充新赛季。
