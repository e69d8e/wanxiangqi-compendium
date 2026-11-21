import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const dataDir = path.join(rootDir, "src", "data");
const publicDir = path.join(rootDir, "public");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function readJson(name) {
  return JSON.parse(await readFile(path.join(dataDir, name), "utf8"));
}

const datasets = {
  hero: await readJson("heroes.json"),
  player: await readJson("players.json"),
  talent: await readJson("talents.json"),
  equipment: await readJson("equipment.json"),
  effect: await readJson("effects.json"),
};
const meta = await readJson("meta.json");
const all = Object.values(datasets).flat();

// 1. 数量口径与 meta.json 一致
for (const [kind, items] of Object.entries(datasets)) {
  const current = items.filter((item) => item.versionStatus !== "historical_pending").length;
  check(
    meta.categories[kind].totalCount === items.length,
    `${kind} 总数不符：meta=${meta.categories[kind].totalCount} 实际=${items.length}`,
  );
  check(
    meta.categories[kind].currentCount === current,
    `${kind} 当前数不符：meta=${meta.categories[kind].currentCount} 实际=${current}`,
  );
}
check(meta.totalCount === all.length, `总条目数不符：meta=${meta.totalCount} 实际=${all.length}`);

// 2. id 唯一、必需字段齐全
const ids = new Set();
for (const item of all) {
  check(!ids.has(item.id), `重复 id：${item.id}`);
  ids.add(item.id);
  check(Boolean(item.name), `${item.id} 缺少 name`);
  check(Boolean(item.kind), `${item.id} 缺少 kind`);
  check(Boolean(item.searchText && item.searchText.length > 4), `${item.id} 搜索索引过短`);
  check(Boolean(item.sourceUrl), `${item.id} 缺少 sourceUrl`);
  check(Boolean(item.localImage), `${item.id} 缺少 localImage`);
  check(Boolean(item.versionStatus), `${item.id} 缺少 versionStatus`);
}

// 3. 本地图片与 JSON 一一对应（防止卡片出现空图）
for (const item of all) {
  const file = path.join(publicDir, item.localImage.replace(/^\//, ""));
  try {
    await access(file);
  } catch {
    failures.push(`缺少图片文件：${item.localImage}`);
  }
}

// 4. 公告修订层必须存在且与官方公告“调整后”原文一致
function card(playerName, cardId) {
  const player = datasets.player.find((entry) => entry.name === playerName);
  const found = player?.cards?.find((entry) => Number(entry.id) === cardId);
  check(Boolean(found), `找不到 ${playerName} 的关联卡 ${cardId}`);
  return found;
}

const announcementChecks = [
  {
    label: "嬴律「并购红利」v1.11.1",
    item: card("嬴律", 94352),
    contains: ["单回合内合成第4次时随机获得1张场上英雄的复制"],
    source: "18956191",
  },
  {
    label: "嬴律「投资增值」v1.9.1",
    item: card("嬴律", 94302),
    contains: ["获得3能量"],
    source: "18940994",
  },
  {
    label: "嬴律「贷款协议」v1.9.1",
    item: card("嬴律", 94362),
    contains: ["回合结束时若能量为负", "下回合获得的能量-2", "回合结束时每有1名其他玩家能量为负"],
    source: "18940994",
  },
  {
    label: "乔汐「温柔呼唤」v1.9.1",
    item: card("乔汐", 92299),
    contains: ["3-5阶"],
    source: "18940994",
  },
  {
    label: "乔汐「潮汐的交响」v1.9.4",
    item: card("乔汐", 92210),
    contains: ["触发2次", "额外等级+3"],
    source: "18943094",
  },
  {
    label: "安琪拉「攻速加持」v1.9.1",
    item: card("安琪拉", 95153),
    contains: ["30%的攻击速度"],
    source: "18940994",
  },
  {
    label: "安琪拉「打扫战场」v1.9.1",
    item: card("安琪拉", 95163),
    contains: ["125%的法术攻击力"],
    source: "18940994",
  },
];

for (const entry of announcementChecks) {
  const text = entry.item?.description ?? "";
  for (const fragment of entry.contains) {
    check(text.includes(fragment), `${entry.label} 文案缺少“${fragment}”`);
  }
  check(
    String(entry.item?.sourceUpdate?.id) === entry.source,
    `${entry.label} 的公告来源应为 ${entry.source}，实际 ${entry.item?.sourceUpdate?.id ?? "无"}`,
  );
}

// 5. 不得混入体验服/未上线内容
const forbidden = ["体验服", "S2", "建木"];
for (const item of all) {
  for (const term of forbidden) {
    check(!item.name.includes(term), `${item.id} 名称含疑似非正式服内容“${term}”`);
  }
}

// 5b. 数值分歧提示必须存在且带来源说明
const sunbin = all.find((item) => item.id === "hero-sunbin");
check(Boolean(sunbin?.caveat && sunbin.caveat.includes("50+100%")), "hero-sunbin 缺少数值分歧提示");

// 6. 机制数据自检
const mechanicsSource = await readFile(path.join(rootDir, "src", "data", "mechanics.ts"), "utf8");
check(mechanicsSource.includes("1 → 2") === false, "机制数据不应包含箭头符号");
check(/cost: 7/.test(mechanicsSource) && /cost: 27/.test(mechanicsSource), "升级能量表缺失");

if (failures.length) {
  console.error(`数据校验失败（${failures.length} 项）：`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  `数据校验通过：${all.length} 条（当前 ${meta.currentCount}）、${all.length} 张本地图片、` +
    `${announcementChecks.length} 条公告修订断言`,
);