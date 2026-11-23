# 万象棋谱 · UI/UX 全面审计

- 审计地址：<http://127.0.0.1:5178>（Vite dev server）
- 审计日期：2026-11-23
- 项目：`/Users/li/Code/Other/wanxiangqi-compendium`
- 方法：modern-web-guidance `2026_11_10-47b4c80e`（检索并读取 dialog、navigation-drawer、accessibility、color、dark-mode、form-factor-adaptation、responsive-table、navbar）；ego-browser 实机检查 1710×944 / 1440×900 / 768×1024 / 430×844 / 414×896 / 390×844 / 320×700；axe-core WCAG 2.2 AA + best-practice；键盘走查；`npm test` 与 `npm run validate:data` 基线。
- 结论：**视觉完成度高，整体是一套有辨识度的「暗色档案馆」设计**。桌面端信息架构、排版层级、筛选与详情抽屉都成立；问题集中在**手机目录密度、移动端头部对齐、粘性筛选面板、微字号/对比度、模态与路由无障碍**。本次为审计，未改动源代码。

## 1. 总体评价

| 维度 | 评价 | 说明 |
|---|---|---|
| 视觉设计 | A- | 墨绿/玉青/暖金的档案感统一，宋体标题与数字字体有辨识度；首页棋盘、卡片、抽屉形成完整叙事。 |
| 信息架构 | A- | 一级导航清晰，目录筛选与 URL 同步，详情抽屉层级完整；未知路由、SPA 标题是短板。 |
| 桌面体验 | A- | 1440/1710 下网格、筛选、抽屉稳定，无横向溢出，图片全部加载。 |
| 移动体验 | C+ | 390/414 目录为单列 2.9 万 px 长页；筛选面板遮挡 8px；头部操作区不右对齐；列表模式状态标签换行。 |
| 无障碍 | C+ | 目录搜索名称变成「86 条」、移动端搜索按钮无名称、对比度大量不达标、搜索遮罩无焦点管理。 |
| 性能 | B | 603 条数据 1.7MB 全量 eager import；首屏 JS 1.79MB（gzip 321KB）、CSS 54KB，可接受但可再拆。 |

## 2. 高优先级问题（P1）

### P1-1 手机端目录「一列长页」：60 条卡片 = 2.9 万 px

**证据（390×844）：** 目录网格单列 348px，卡片 348×472（图片 336px），60 张卡网格高 28,459px，整页 29,408px，「继续翻阅」在 y≈29,029。

**断点断崖：**

| 宽度 | 列数 | 页面高度 |
|---|---|---|
| 320 | 1 | 25,377px |
| 360 | 1 | 27,660px |
| 390 | 1 | 29,408px |
| 414 | 1 | 30,825px |
| 430 | 2（193.5px/列） | 10,666px |

原因：`src/styles.css:2336` 的 `@media (max-width: 420px)` 把所有常见手机宽度强制为单列；而 `src/styles.css:2298` 在 ≤760 已经提供了双列规则。390px 下注入双列做预览，卡片 174px、整页 10,066px，视觉可读性仍成立（见 `screenshots/audit-catalog-390-2col.jpg`）。

**建议：** 把单列断点从 420px 收紧到 360px，或改为 `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`；≤360px 保留单列。同一条 420px 媒体查询还控制 `.category-grid`，收紧后 390px 首页分类会变为两列，需顺带截图确认（通常更紧凑）。预计常见手机目录页高度从约 3 万 px 降到约 1 万 px。

### P1-2 移动端筛选面板：8px 被头部盖住，且长期占 24% 视口

**证据（390×844）：** `.filter-panel` 高 203px（占视口 24%），`position: sticky; top:61px`，而 header 高 69px → 面板顶部 8px 永远压在 header 下方。320px 时面板高 249px，占 844 视口的 30%（若浏览器可视高度 700，则约 36%）。

原因：`src/styles.css:2294` 写死 `top: 61px`；`src/styles.css:939-941` 基础值也是 67px，而实际 header 为 69px。滚动后两个断点都有 2–8px 重叠。

**建议：**
1. 至少把 sticky top 统一为 69px（最好用 CSS 变量 `--header-height`）。
2. 更推荐手机端把筛选折叠成「筛选」按钮/底部 sheet，或只让搜索框 sticky，让筛选行随内容滚走；当前 203px 的常驻面板是手机目录最大的空间浪费之一。

### P1-3 移动/平板 Header 操作区没有右对齐

**证据：**

- 390px：品牌 x20–159，`.header-actions` x175–264，右侧留下 106px 空白。
- 768px：品牌 x28–195，操作区 x211–300，右侧留下 468px 空白。

原因：`src/styles.css:251` 的 `.main-nav { margin-left:auto }` 在 ≤980px 被 `display:none`，而 `.header-actions` 没有 `margin-left:auto`，因此两个图标紧跟在品牌后面。

**建议：** 在 `@media (max-width:980px)` 中加 `.header-actions { margin-left:auto; }`。这是一行修复，立即恢复移动端「品牌—空白—搜索/菜单」的正常头部分布。

### P1-4 可访问名称缺失/错误（会直接影响读屏）

1. **目录搜索框名称是「86 条」**：`src/components/CatalogView.tsx:84` 的 `<label className="catalog-search">` 包裹了图标、input 和计数 `<kbd>86 条</kbd>`；计算出的 AX name 只有计数，没有「搜索英雄名称、效果或关键词」。建议给 input 加 `aria-label={`搜索${...}名称、效果或关键词`}`，并把计数移出 label 或加 `aria-hidden="true"`。
2. **移动端头部搜索按钮无名称**：`src/App.tsx:93` 的 `.header-search` 在 ≤980px 隐藏了文字 `<span>搜索档案</span>` 和 `<kbd>⌘K</kbd>`，没有 `aria-label`；axe 在所有移动页面报 **critical `button-name`**。建议加 `aria-label="搜索档案"`，并在打开时同步 `aria-expanded`。
3. **全局搜索 combobox 仅靠 placeholder 命名**：`src/components/GlobalSearch.tsx:54` 没有 `<label>`/`aria-label`；placeholder 是「输入英雄、棋手、天赋、阵营或效果…」。建议显式 `aria-label="全站搜索"`。
4. **详情抽屉 `<aside role="dialog">`**：`src/components/DetailDrawer.tsx:50` 触发 axe `aria-allowed-role`；建议迁移到原生 `<dialog>`，或至少改成 `<div role="dialog">`。

### P1-5 全局搜索遮罩：焦点会跑到 body、背景可滚动、Tab 可离开

**证据：**
- `src/components/GlobalSearch.tsx:14-19` 只做 `inputRef.focus()`，没有保存/恢复触发元素；Escape 后 `document.activeElement` 是 `<body>`。
- `body` 的 `overflow` 始终是 visible，背景页面在遮罩打开时仍能滚动。
- 没有 Tab 焦点陷阱：从输入框连续 Tab 会落到结果按钮，再继续 Tab 会离开遮罩进入页面其他控件。
- `role="dialog" aria-modal="true"` 是自定义 `<div>`，背景 `#main-content` 没有 `inert`；`aria-expanded` 恒为 `"true"`；结果数量/空状态没有 `aria-live`。

**建议：** 用原生 `<dialog>` + `showModal()` 重构（浏览器自带 top layer、inert、焦点圈定、Escape、焦点返回）；若保留自定义实现，至少：保存触发元素、锁 `body` 滚动、给 `#main-content`/header/footer 加 `inert`、Tab 循环、Escape 后恢复焦点，并给结果计数加 `role="status" aria-live="polite"`。

### P1-6 从目录中间打开详情，页面会被强制滚到顶部

**证据：** 在 `scrollY=2800` 点击卡片，`hashchange` 触发 `src/App.tsx:29` 的 `window.scrollTo({ top: 0, behavior:'instant' })`，打开抽屉瞬间页面回到顶部；关闭抽屉后仍停在顶部，用户失去原来的浏览位置。

**建议：** `onHash` 只在**视图发生变化**时滚顶；同视图内 `item` 参数的增删（打开/关闭详情）不滚顶。例如比较前后 `readHash().view`，若相同且只是 item 变化则跳过 `scrollTo`。这是移动端长目录里最容易让用户迷失的 bug。

## 3. 中优先级问题（P2）

### P2-1 关闭详情会多压一条历史记录，浏览器 Back 重新打开抽屉

`src/App.tsx:79-83` 的 `closeItem` 通过 `window.location.hash = ...` 关闭详情，属于 push。打开卡片 → 关闭 → 浏览器 Back，会回到带 `item=` 的地址，抽屉重新打开；从首页英雄卡打开后关闭，还会落到英雄目录而不是首页。

**建议：** 若抽屉是从页面内打开的，关闭用 `history.back()`（回到打开前的视图和滚动位置）；深链直接进入时用 `history.replaceState` 去掉 `item`，并提供目录兜底。

### P2-2 列表模式：StatusBadge 被挤到第二行

`src/styles.css:1151` 的 `.compact-list > button` 是 5 列 `52px minmax(150px,.8fr) minmax(0,2fr) 56px 92px`，而 `src/styles.css:2259` 在 ≤980px 改成 3 列 `46px minmax(0,1fr) 74px`，但 DOM 仍有 5 个可见子项（图片、名称、效果、品阶、StatusBadge；效果已 `display:none`）。结果：第一行高度约 104px，状态徽章掉到图片下方，文字被截成「当前收」。

**建议：** 媒体查询改为 4 列 `46px minmax(0,1fr) 30px auto`，保留 `.list-effect { display:none }`，让图片、名称、品阶、状态各占一列。

### P2-3 微字号与对比度：axe 在目录页就有 124 个 color-contrast 节点

关键不达标项（均为 1710px 桌面测量）：

| 位置 | 字号/颜色 | 对比度 |
|---|---|---|
| 目录 `.card-index`（60 个） | 9.5px `#ffffff66` | 3.81:1 |
| 目录卡片底部「查阅 →」（60 个） | 9.5px `#ffffff33` | **1.86:1** |
| 目录 `.result-meta` 右侧提示 | 9.5px `#ffffff3d` | 约 1.9:1 |
| 目录 `.chapter-number` | 52px 幽灵数字 | 1.49:1 |
| 机制页能量累计值（4–5 个，真实数据） | 12.5px `#ffffff45` | 2.4:1 |
| 机制页计算器免责声明 | 10.5px `#ffffff3d` | 2.17:1 |
| 机制页术语序号（36 个） | 小号幽灵数字 | 1.41:1 |
| 首页能量步骤「能量」标签（7px） | `#ffffff4d` | 2.68:1 |
| 页脚品牌说明 / 底部版权 | 10.5px `#5d6f66` / 8px `#4a5b53` | 3.63:1 / 2.69:1 |

系统性事实：页面存在大量 7–10.5px 的元信息（7px×5、7.5px×5、8px、8.5px、9px×9、9.5px×2、10px×15）；桌面正文 15px 可以，但元信息低于舒适阅读区，更不适合手机。

**建议：**
1. 真实数据（能量累计值、免责声明、卡片「查阅」）提升到至少 4.5:1；可直接用 `--paper-dim`/`--muted` 或提高透明度。
2. 纯装饰数字（`.chapter-number`、规则序号、来源序号）用 `aria-hidden="true"` 并适当提高颜色；若保留「幽灵」视觉，至少不要让它承担信息。
3. 元信息最小 11–12px，正文/次要正文 13px；移动端不要再降到 8px。
4. 目录卡片底部「查阅 →」是唯一的点击暗示，当前 1.86:1 近乎不可见，应改成玉青色或 `--paper-dim`。

### P2-4 卡片语义：`<button>` 里包 `<h2>`/`<p>`，读屏名称是一长串

`src/components/CatalogView.tsx:99-103` 每个卡片是 `<button class="catalog-card">`，内部包含 `<h2>`、`<p>`、图片 `alt` 和 StatusBadge。Chrome 仍暴露 60 个 h2，但按钮的 accessible name 变成例如：

> 苏烈 001 1 阶 河洛 · 近战 · 牺牲 苏烈 牺牲：苏烈的等级永久+2。 当前收录 查阅 →

标题被图片 `alt` 重复，读屏用户听到超长名称。首页分类/阵营/工具卡也有同类 `<button>` 包块级内容的问题。

**建议：** 目录卡改为 `<a>` 或 `<article>` + 内部链接；用 `aria-labelledby` 指向标题、`aria-describedby` 指向摘要，装饰图 `alt=""`。首页卡片同理改为链接/按钮的语义组合。

### P2-5 SPA 标题、路由焦点与未知路由

- `document.title` 在所有视图都保持「万象棋谱 · 王者万象棋资料库」；切页后读屏没有页面标题变化。建议每个 View 设置 `document.title = `${页面名} · 万象棋谱``。
- 点击导航后焦点仍停在导航按钮上，SPA 切页没有被宣告。建议切页后把焦点移到 `main h1`（加 `tabIndex={-1}`）或使用 `aria-live` 区域播报。
- `#/not-a-view?season=s1` 会渲染 Home，但 URL 不变、导航没有 active 项。建议 `replaceState` 到 `#/home` 或显示 404 视图。

### P2-6 移动菜单缺少状态语义与 Escape 关闭

`src/App.tsx:93` 的菜单按钮只有动态 `aria-label`（打开导航/关闭导航），没有 `aria-expanded`、`aria-controls`。菜单打开后按 Escape 不会关闭（仅点击按钮），页面仍可滚动。

**建议：** 给按钮加 `aria-expanded={menuOpen}`、`aria-controls="main-nav"`，给 nav 加 `id="main-nav"`；在全局 keydown 中当 `menuOpen` 且 Escape 时关闭并归还焦点。

## 4. 低优先级问题（P3）

- **点击目标 <24px**：首页「查看棋手修订档案」135×23、页脚若干链接高 22px；桌面端可接受但建议统一 ≥24px（粗指针 ≥44px）。
- **`color-scheme` 只写在 meta**：`index.html:8` 有 `<meta name="color-scheme" content="dark">`，但 `src/styles.css` 没有 CSS `color-scheme: dark`；`getComputedStyle(document.documentElement).colorScheme` 实测为 `"normal"`。建议 `:root { color-scheme: dark; }`，同时改善原生滚动条/表单控件在暗色下的呈现。
- **滚动条占位**：`DetailDrawer.tsx:19-20,36` 锁定 body overflow，但没有 `scrollbar-gutter: stable`；本机 macOS 滚动条宽度为 0 看不到跳动，Windows 可能发生横向位移。
- **装饰元素被读屏读取**：首页棋盘坐标（A–F、FIG.01）、巨大「万」字、章节幽灵数字等应加 `aria-hidden="true"`，避免读屏噪声。
- **数据加载**：`src/data/index.ts` 用 `import.meta.glob('./seasons/*/*.json', { eager: true })` 一次加载 1.7MB、603 条；如果未来加赛季，建议按季动态 import，至少把 JSON 拆到路由级 chunk。
- **未知路由 404**：当前静默回退首页；见 P2-5。

## 5. 已达到的标准（通过项）

- 320 / 390 / 414 / 430 / 768 / 1440 / 1710 全部检查页面**无横向滚动**。
- 首页 5 张 hero 图、目录 603 张本地图片均可加载，无破图。
- 目录筛选与 URL 同步正确（例：`?filter=大河流域&season=s1` → 13 条）；空状态「没有找到对应档案」和清除筛选可用；`layout` 参数可持久化。
- 详情抽屉：焦点初始落在关闭按钮，手动 Tab 焦点圈定在抽屉内（关闭 → summary → 链接循环），Escape 会恢复触发卡片的焦点和 body overflow；不存在焦点逃逸。
- 键盘：⌘/Ctrl+K 打开搜索，`/` 打开搜索（非输入态），↑↓/Home/End/Enter 在搜索框内可用。
- `npm test`：19/19 通过（router、season-switcher、data 三组）；`npm run validate:data`：603 条（当前 581）、603 张本地图片、7 条公告修订断言通过。
- 构建产物：JS 1,791,709 bytes（gzip 321,511），CSS 54,409 bytes（gzip 10,811）；图片目录 5.5MB / 603 文件，最大 144,434 bytes。

## 6. 建议修复顺序

1. **一天内可完成（低风险 CSS/ARIA）**
   - 移动端 header `.header-actions { margin-left:auto; }`
   - 筛选面板 `top: 69px`
   - 目录单列断点 420 → 360（或 auto-fill）
   - 列表模式 4 列修复 StatusBadge
   - 目录搜索 `aria-label`、移动端搜索按钮 `aria-label`、`aria-expanded`/`aria-controls`
   - `:root { color-scheme: dark; }`
2. **本周（交互/无障碍）**
   - 全局搜索改原生 `<dialog>`，补焦点返回、inert、滚动锁、`aria-live`
   - 详情抽屉改原生 `<dialog>`；关闭用 `history.back()`/`replaceState`
   - `onHash` 区分视图切换与 item 开关，修复滚动丢失
   - 目录卡片、首页卡片改成语义链接结构
3. **下一轮（视觉系统）**
   - 统一微字号 token（最低 11–12px）与对比度 token
   - 手机筛选折叠为按钮/底部 sheet
   - 按视图设置 `document.title`，补 404/未知路由
   - 赛季数据按需加载

## 7. 截图证据

- 首页桌面：`screenshots/audit-home-desktop-full.jpg`
- 首页手机（头部右侧空白）：`screenshots/audit-home-mobile.jpg`
- 首页平板（右侧 468px 空白）：`screenshots/audit-home-tablet.jpg`
- 目录手机顶部（筛选面板）：`screenshots/audit-catalog-mobile-top.jpg`
- 目录手机列表（状态换行）：`screenshots/audit-catalog-mobile-list.jpg`
- 目录 430px 双列：`screenshots/audit-catalog-430.jpg`
- 390px 双列预览（注入验证）：`screenshots/audit-catalog-390-2col.jpg`
- 详情抽屉桌面：`screenshots/audit-drawer-desktop.jpg`
- 全局搜索手机：`screenshots/audit-search-mobile.jpg`
- 机制页能量数据：`screenshots/audit-mechanics-energy.jpg`

## 8. 指南依据（modern-web-guidance）

- `dialog` / `navigation-drawer`：优先原生 `<dialog>` + `showModal()`，由浏览器提供 inert、焦点圈定、top layer、Escape、焦点返回；不要手写 role/aria-modal/焦点陷阱；`dialog:modal` 与 `::backdrop` 用 `overscroll-behavior: contain` 限制滚动链。
- `accessibility`：每页一个 `<main>`、一个 h1、顺序标题；所有控件有可访问名称；图标按钮 `aria-label`；目标 ≥24×24；SPA 每视图更新 title；自定义遮罩使用 `inert` 背景。
- `color` / `dark-mode`：正文 4.5:1、非文本 UI 3:1；不能只靠颜色传达状态；`:root { color-scheme: dark; }`，不要只依赖 meta。
- `form-factor-adaptation` / `responsive-table` / `navbar`：手机优先单列内容但避免 3 万 px 长页；导航在窄屏用可展开菜单并暴露 `aria-expanded`；表格在窄屏用可读的换行/卡片化，而不是压缩到不可读。

> 说明：以上为审计结论，源代码未修改。若需要，我可以按第 6 节的顺序直接提交修复补丁，并重新跑测试与 320/390/430/768/1440 的截图回归。
