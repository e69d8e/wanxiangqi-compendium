# 每周自动更新与部署

本站每周六 10:00（Asia/Shanghai）由 DSH 定时任务执行一次「抓取 → 核对 → 构建 → 推送 → 验证线上」的完整流程。定时任务只负责调度；具体判断与提交由一个全新的 agent 会话完成，仓库内两个脚本负责确定性部分。

## 定时任务

| 项 | 值 |
| --- | --- |
| 触发 | 每周六 10:00（Asia/Shanghai） |
| 任务类型 | DSH 定时任务，每次新建会话 |
| 工作目录 | `/Users/li/Code/Other/wanxiangqi-compendium` |
| 流程说明 | 本文件 |

任务提示词要求 agent 先读本文件，再按下方「标准流程」执行。任务失败不会自动重试；下一次周六会重新检查，因此失败后只需保证仓库可继续运行，不要在未验证的情况下推送。

## 两个脚本

```bash
npm run sync:live          # 只读：抓官网目录、棋手、官方公告，和本地 .research 对比
npm run sync:live:write    # 有变化时写入 .research/catalogs 与 .research/player-array-1.json
npm run check:netlify      # 对比本地 dist 与线上 /assets 哈希，默认最多等 300 秒
```

`sync:live` 结束时会输出一行 `SYNC_SUMMARY <json>`，其中 `dataChanged` 表示目录/棋手是否有变化，`announcements.newPatch` 表示是否出现高于 `src/data/meta.json` 基线的正式服版本公告。它不会自己判断公告里的“调整后”文案是否该覆盖卡面，这部分必须人工/agent 阅读公告原文。

`check:netlify` 用 Vite 的内容哈希判断线上是否已经是本地这次构建：只有线上 HTML 引用的 `/assets/index-*.js` 与 `/assets/index-*.css` 和本地 `dist/index.html` 完全一致才算成功。可加 `--expect "v1.12.0"` 额外确认线上 JS bundle 含指定文本。

## 标准流程

### 1. 准备

```bash
cd /Users/li/Code/Other/wanxiangqi-compendium
git status --porcelain          # 必须为空；有未提交改动先停下并报告
git pull --ff-only origin main
npm ci                          # 首次或 lockfile 变化时
```

### 2. 抓取与对比

```bash
npm run sync:live
```

- 四个目录（英雄/装备/天赋/效果牌）与棋手都显示「无变化」，且 `newPatch: false`：跳到第 6 步「无变化路径」。
- 任一目录/棋手有变化：继续第 3 步。
- `newPatch: true`：先按第 5 步核对公告，再决定是否要把版本号与公告修订一起更新。

### 3. 写入原始资料并重建

```bash
npm run sync:live:write
node scripts/build-data.mjs
```

`build-data.mjs` 会读取 `.research/` 并重写 `src/data/*.json`，同时执行 id 唯一、公告修订文案等断言。若断言失败，说明新资料与现有规则冲突，停止并报告，不要绕过断言。

### 4. 同步硬编码口径

以下位置写死了数量/版本，数据或版本变化时必须一起改，否则页面文案或测试会自相矛盾：

| 文件 | 需要同步的内容 |
| --- | --- |
| `tests/data.test.ts` | 英雄 86、棋手 21、天赋 300、装备 95、效果牌 101、总数 603、当前 581 |
| `README.md` | 顶部版本/核验日期/603、分类数量、徽章、公告修订条数 |
| `index.html` | `og:description` 与 `<noscript>` 中的 603 |
| `src/App.tsx` | 顶栏 `S1 · v1.11.1` |
| `src/components/GlobalSearch.tsx` | 搜索底栏版本 |
| `src/components/Sources.tsx` | 核验日期、总条数、最新公告版本 |
| `src/components/Home.tsx` | 首页公告 id、公告标题/摘要、修订卡文案 |
| `src/data/mechanics.ts` | `latestPatch.version`、`date`、`sourceUpdate`、`changes` |
| `scripts/build-data.mjs` | `meta.currentPatch`、`patchDate`、`verifiedAt`、`PATCH_*`、`CARD_OVERRIDES` |

只改实际变化的数字，不要为了“看起来一致”改掉未变化的分类数量。`meta.json` 由 `build-data.mjs` 生成，不要手改。

### 5. 新版公告核对（仅 `newPatch: true`）

1. 用 `SYNC_SUMMARY` 里的 `latestOfficialPatch.id` 打开 `https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=<id>&tab=2`。
2. 只采用正式服 S1 公告，排除体验服、S2、建木、太乙等内容。
3. 只有当公告原文明确写出「调整后」文本时，才把它加入 `scripts/build-data.mjs` 的 `CARD_OVERRIDES`，并同步首页/机制页的公告摘要。找不到明确原文时保留原卡面并记录 `pending`，不要猜。
4. 更新 `src/data/mechanics.ts` 的 `latestPatch`、`Home.tsx` 的公告 id、`Sources.tsx` 的版本与日期、`build-data.mjs` 的 `PATCH_*`/`meta` 常量。
5. 重新执行 `node scripts/build-data.mjs` 和全部校验。

### 6. 无变化路径

没有 tracked 文件变化时，不提交空 commit，也不推送：

```bash
npm run build
npm run check:netlify -- --wait 60
```

`check:netlify` 成功说明当前线上仍是仓库 `main` 的构建；报告「本周无内容变化，未触发部署」即可结束。

### 7. 提交、推送与部署

有变化时，先跑完整校验：

```bash
npm test
npm run validate:data
npm run build
git status --short
```

任何一步失败都不提交、不推送。全部通过后：

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

### 8. 验证 Netlify

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

## 失败处理

| 失败点 | 处理 |
| --- | --- |
| `sync:live` 抓取失败 | 报告 URL 与错误；不要用旧缓存假装成功；下次周六重试 |
| `build-data` 断言失败 | 停止在本地，保留 `.research` 新资料；报告冲突条目，等人工确认 |
| `npm test` / `validate:data` 失败 | 不提交；修正数据或硬编码口径后重跑 |
| `git push` 失败 | 不要 force push；检查远端是否有新提交，先 `git pull --rebase` 再决定 |
| Actions 失败 | 用 `gh run view <id> --log-failed` 看日志；修复后重新提交 |
| Netlify 未更新 | 先确认 Actions 成功，再重跑 `check:netlify`；持续失败时报告，不要重复部署 |

## 安全边界

- `.research/`、`dist/`、`.netlify/` 均被 `.gitignore` 忽略；不要把原始抓取或构建产物提交进仓库。
- 不要读取、打印或提交 `~/Library/Preferences/netlify/config.json` 中的 token；部署认证由 GitHub Actions secrets 提供。
- 不要使用 `git push --force`，不要改写已推送历史。
- 数据只收正式服 S1；公告“调整后”原文优先；无法确认的内容保留 pending，不猜测。