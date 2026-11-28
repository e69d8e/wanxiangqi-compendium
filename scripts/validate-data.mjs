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

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8"));
}

const config = await readJson("seasons.config.json");
const seasons = config.seasons.toSorted((a, b) => a.order - b.order);
check(
  seasons.some((season) => season.id === config.defaultSeason),
  `默认赛季 ${config.defaultSeason} 不在 seasons 列表中`,
);

const announcementChecks = [
  { label: "嬴律「并购红利」v1.11.1", player: "嬴律", card: 94352, contains: ["单回合内合成第4次时随机获得1张场上英雄的复制"], source: "18956191" },
  { label: "嬴律「投资增值」v1.9.1", player: "嬴律", card: 94302, contains: ["获得3能量"], source: "18940994" },
  { label: "嬴律「贷款协议」v1.9.1", player: "嬴律", card: 94362, contains: ["回合结束时若能量为负", "下回合获得的能量-2", "回合结束时每有1名其他玩家能量为负"], source: "18940994" },
  { label: "乔汐「温柔呼唤」v1.9.1", player: "乔汐", card: 92299, contains: ["3-5阶"], source: "18940994" },
  { label: "乔汐「潮汐的交响」v1.9.4", player: "乔汐", card: 92210, contains: ["触发2次", "额外等级+3"], source: "18943094" },
  { label: "安琪拉「攻速加持」v1.9.1", player: "安琪拉", card: 95153, contains: ["30%的攻击速度"], source: "18940994" },
  { label: "安琪拉「打扫战场」v1.9.1", player: "安琪拉", card: 95163, contains: ["125%的法术攻击力"], source: "18940994" },
];

for (const season of seasons) {
  check(season.status !== "test", `体验服赛季 ${season.id} 不允许进入站点`);
  check(Boolean(season.id && season.label && season.shortLabel), `赛季 ${season.id} 缺少名称字段`);
  check(Number.isInteger(season.order), `赛季 ${season.id} 缺少 order`);

  const seasonDir = path.join(dataDir, "seasons", season.id);
  const datasets = {
    hero: JSON.parse(await readFile(path.join(seasonDir, "heroes.json"), "utf8")),
    player: JSON.parse(await readFile(path.join(seasonDir, "players.json"), "utf8")),
    talent: JSON.parse(await readFile(path.join(seasonDir, "talents.json"), "utf8")),
    equipment: JSON.parse(await readFile(path.join(seasonDir, "equipment.json"), "utf8")),
    effect: JSON.parse(await readFile(path.join(seasonDir, "effects.json"), "utf8")),
  };
  const meta = JSON.parse(await readFile(path.join(seasonDir, "meta.json"), "utf8"));
  const all = Object.values(datasets).flat();

  check(meta.id === season.id, `${season.id} meta.id 不一致`);
  check(meta.label === season.label, `${season.id} meta.label 不一致`);
  check(meta.status === season.status, `${season.id} meta.status 不一致`);
  check(meta.isDefault === (season.id === config.defaultSeason), `${season.id} meta.isDefault 不一致`);
  check(meta.currentPatch === season.meta.currentPatch, `${season.id} meta.currentPatch 不一致`);
  check(meta.verifiedAt === season.meta.verifiedAt, `${season.id} meta.verifiedAt 不一致`);

  for (const [kind, items] of Object.entries(datasets)) {
    const current = items.filter((item) => item.versionStatus !== "historical_pending").length;
    check(
      meta.categories[kind]?.totalCount === items.length,
      `${season.id}/${kind} 总数不符：meta=${meta.categories[kind]?.totalCount} 实际=${items.length}`,
    );
    check(
      meta.categories[kind]?.currentCount === current,
      `${season.id}/${kind} 当前数不符：meta=${meta.categories[kind]?.currentCount} 实际=${current}`,
    );
  }
  check(meta.totalCount === all.length, `${season.id} 总条目数不符：meta=${meta.totalCount} 实际=${all.length}`);

  const ids = new Set();
  for (const item of all) {
    check(!ids.has(item.id), `${season.id} 重复 id：${item.id}`);
    ids.add(item.id);
    check(Boolean(item.name), `${season.id}/${item.id} 缺少 name`);
    check(Boolean(item.kind), `${season.id}/${item.id} 缺少 kind`);
    check(Boolean(item.searchText && item.searchText.length > 4), `${season.id}/${item.id} 搜索索引过短`);
    check(Boolean(item.sourceUrl), `${season.id}/${item.id} 缺少 sourceUrl`);
    check(
      typeof item.localImage === "string" && item.localImage.startsWith(`/images/${season.id}/`),
      `${season.id}/${item.localImage} 图片路径不在本赛季目录`,
    );
    check(Boolean(item.versionStatus), `${season.id}/${item.id} 缺少 versionStatus`);
    check(
      item.name.includes("体验服") === false,
      `${season.id}/${item.id} 名称含疑似非正式服内容“体验服”`,
    );
  }

  for (const item of all) {
    const file = path.join(publicDir, item.localImage.replace(/^\//, ""));
    try {
      await access(file);
    } catch {
      failures.push(`${season.id} 缺少图片文件：${item.localImage}`);
    }
  }

  if (season.research.announcementOverrides) {
    function card(playerName, cardId) {
      const player = datasets.player.find((entry) => entry.name === playerName);
      const found = player?.cards?.find((entry) => Number(entry.id) === cardId);
      check(Boolean(found), `${season.id} 找不到 ${playerName} 的关联卡 ${cardId}`);
      return found;
    }

    for (const entry of announcementChecks) {
      const target = card(entry.player, entry.card);
      const text = target?.description ?? "";
      for (const fragment of entry.contains) {
        check(text.includes(fragment), `${season.id} ${entry.label} 文案缺少“${fragment}”`);
      }
      check(
        String(target?.sourceUpdate?.id) === entry.source,
        `${season.id} ${entry.label} 的公告来源应为 ${entry.source}，实际 ${target?.sourceUpdate?.id ?? "无"}`,
      );
    }

    const sunbin = all.find((item) => item.id === "hero-sunbin");
    check(Boolean(sunbin?.caveat && sunbin.caveat.includes("50+100%")), `${season.id} hero-sunbin 缺少数值分歧提示`);
  }
}

// 机制数据自检（全站通用）
const mechanicsSource = await readFile(path.join(dataDir, "mechanics.ts"), "utf8");
check(mechanicsSource.includes("1 → 2") === false, "机制数据不应包含箭头符号");
check(/cost: 7/.test(mechanicsSource) && /cost: 27/.test(mechanicsSource), "升级能量表缺失");

if (failures.length) {
  console.error(`数据校验失败（${failures.length} 项）：`);
  for (const failure of failures.slice(0, 80)) console.error(` - ${failure}`);
  if (failures.length > 80) console.error(` ……其余 ${failures.length - 80} 项省略`);
  process.exit(1);
}

for (const season of seasons) {
  const meta = JSON.parse(await readFile(path.join(dataDir, "seasons", season.id, "meta.json"), "utf8"));
  console.log(
    `数据校验通过 [${season.id}]：${meta.totalCount} 条（当前 ${meta.currentCount}）、` +
      `${meta.totalCount} 张本地图片、${season.research.announcementOverrides ? announcementChecks.length : 0} 条公告修订断言`,
  );
}
