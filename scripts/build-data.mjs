import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const outputDir = path.join(rootDir, "src", "data");

const OFFICIAL_GUIDE_URL = "https://wxq.qq.com/cp/a202609xszy/";
const OFFICIAL_CARD_URL = "https://wxq.qq.com/cp/a20260707sfgw/index.html";
const KNOWLEDGE_SITE_URL = "https://wzwxq.com";
// 公告修订层：官方卡面快照可能落后于正式服公告，以下条目按公告“调整后”原文覆盖。
const SOURCE_V191 = { id: "18940994", date: "2026-11-05" };
const SOURCE_V194 = { id: "18943094", date: "2026-11-06" };
const SOURCE_V1111 = { id: "18956191", date: "2026-11-19" };
const PATCH_DESCRIPTION =
  "合成英雄时，获得1能量，每回合限3次。单回合内合成第4次时随机获得1张场上英雄的复制。";
const PATCH_SOURCE = SOURCE_V1111;
// v1.9.4（18943094）将乔汐秘技牌“潮汐的交响”由触发 3 次 / 额外 +5 改为 2 次 / 额外 +3；
// 2026-11-28 核对官网原生图鉴（589094_oscard_new_16.js）补全末尾括号说明。
const QIAOXI_TIDE_CARD_ID = 92210;
const QIAOXI_TIDE_DESCRIPTION =
  "场上随机英雄等级+5，触发2次，若对象为温柔呼唤的英雄则额外等级+3，每次使用后，触发次数+2（优先随机温柔呼唤的英雄）。";
const QIAOXI_TIDE_SOURCE = SOURCE_V194;

const CARD_OVERRIDES = [
  {
    player: "嬴律",
    cardId: 94352,
    text: PATCH_DESCRIPTION,
    source: PATCH_SOURCE,
    reason: "v1.11.1 将复制条件由“每回合能量达到上限”改为“单回合内合成第4次”。",
  },
  {
    player: "乔汐",
    cardId: QIAOXI_TIDE_CARD_ID,
    text: QIAOXI_TIDE_DESCRIPTION,
    source: QIAOXI_TIDE_SOURCE,
    reason: "v1.9.4 将触发次数 3→2、额外等级 +5→+3。",
  },
  {
    player: "乔汐",
    cardId: 92299,
    text: "使用技能，随机获得1张3-5阶的转瞬英雄牌。",
    source: SOURCE_V191,
    reason: "v1.9.1 将召唤范围由 2-5 阶提升为 3-5 阶。",
  },
  {
    player: "嬴律",
    cardId: 94302,
    text: "棋手升级时获得3能量，满级后每回合获得2次临时刷新。",
    source: SOURCE_V191,
    reason: "v1.9.1 将升级返能由 2 能量提升为 3 能量。",
  },
  {
    player: "嬴律",
    cardId: 94362,
    text: "能量可用至-15。回合结束时若能量为负，则下回合获得的能量-2。决策颁布者额外特权：不受到惩罚，回合结束时每有1名其他玩家能量为负，则下回合获得2能量。",
    source: SOURCE_V191,
    reason:
      "v1.9.1 将结算点由“回合开始时/本回合”改为“回合结束时/下回合”，并重写颁布者特权。",
  },
  {
    player: "安琪拉",
    cardId: 95153,
    text: "飞行器继承连接英雄30%的攻击速度。",
    source: SOURCE_V191,
    reason: "v1.9.1 将继承攻速由 25% 提升为 30%。",
  },
  {
    player: "安琪拉",
    cardId: 95163,
    text: "开战后15秒内，飞行器继承连接英雄125%的法术攻击力。",
    source: SOURCE_V191,
    reason: "v1.9.1 将继承法攻由 100% 提升为 125%。",
  },
];
const OMITTED_METADATA_KEYS = new Set([
  "posterSource",
  "avatarSource",
  "sourceCollection",
]);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8"));
}

function withoutOmittedMetadata(value) {
  if (Array.isArray(value)) {
    return value.map(withoutOmittedMetadata);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !OMITTED_METADATA_KEYS.has(key))
        .map(([key, nested]) => [key, withoutOmittedMetadata(nested)]),
    );
  }
  return value;
}

function collectSearchText(value, parts) {
  if (value == null || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const entry of value) collectSearchText(entry, parts);
    return;
  }
  if (typeof value === "object") {
    for (const nested of Object.values(value)) collectSearchText(nested, parts);
    return;
  }
  const text = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text) parts.push(text);
}

function makeSearchText(item) {
  const parts = [];
  const directKeys = [
    "id",
    "rawId",
    "name",
    "type",
    "explorerType",
    "faction",
    "quality",
    "original",
    "description",
    "rawDescription",
    "formal",
    "awakening",
    "acquisition",
    "subtype",
    "equipmentType",
    "combatCategory",
    "talentGroup",
    "talentStage",
    "officialKeywords",
    "resource",
    "trigger",
    "related",
    "receivers",
    "axis",
    "economy",
    "start",
  ];

  for (const key of directKeys) collectSearchText(item[key], parts);
  collectSearchText(item.officialSkill, parts);

  for (const key of ["relatedCards", "derivedCards"]) {
    for (const card of item[key] ?? []) {
      collectSearchText(
        [card.name, card.descriptionPlain, card.description, card.rawDescription],
        parts,
      );
    }
  }

  for (const section of item.skillSections ?? []) {
    collectSearchText(
      [section.type, section.name, section.text, section.cardId],
      parts,
    );
  }
  for (const card of item.cards ?? []) {
    collectSearchText(
      [card.id, card.name, card.description, card.rawDescription],
      parts,
    );
  }

  return [...new Set(parts)].join(" ").toLocaleLowerCase("zh-CN");
}

function withCommonFields(item, kind, season) {
  if (!item.id) throw new Error(`${kind} 条目缺少 id：${item.name ?? "未知"}`);
  const sourceUrl =
    kind === "player"
      ? `${season.sourceUrl}players`
      : `${season.sourceUrl}explore/${encodeURIComponent(item.id)}`;

  return {
    ...item,
    kind,
    searchText: makeSearchText(item),
    localImage: `/images/${season.id}/${kind}/${item.id}.webp`,
    sourceUrl,
    officialUrl: `${OFFICIAL_CARD_URL}#${kind === "player" ? "page3" : "page4"}`,
  };
}

function normalizeCatalog(catalog, kind, season) {
  return catalog.items.map((sourceItem) => {
    const merged = withoutOmittedMetadata({
      ...(catalog.itemDefaults ?? {}),
      ...sourceItem,
    });
    return withCommonFields(merged, kind, season);
  });
}

const PLAYER_CARD_KEYS = [
  "id",
  "name",
  "description",
  "rawDescription",
  "path",
  "sourceUrl",
  "shopBuyCost",
  "previewCardIDs",
  "sourceCardIDs",
];

function normalizePlayer(sourcePlayer, season, overrides) {
  const player = withoutOmittedMetadata(sourcePlayer);
  const id = player.id ?? `player-${player.lordId}`;
  if (!player.lordId && !player.id) {
    throw new Error(`棋手缺少 id/lordId：${player.name ?? "未知"}`);
  }

  const normalized = {
    ...player,
    id,
    ...(player.rawId == null && player.lordId != null
      ? { rawId: String(player.lordId) }
      : {}),
    versionStatus: player.versionStatus ?? "current_official",
  };

  if (Array.isArray(player.cards)) {
    normalized.cards = player.cards.map((sourceCard) => {
      const card = Object.fromEntries(
        PLAYER_CARD_KEYS.filter((key) => key in sourceCard).map((key) => [
          key,
          sourceCard[key],
        ]),
      );
      const override = overrides.find(
        (entry) =>
          entry.player === player.name && entry.cardId === Number(card.id),
      );
      if (override) {
        card.description = override.text;
        card.rawDescription = override.text;
        card.sourceUpdate = { ...override.source };
        card.imageStatus = "已按公告修订；卡面图片保留官网原件";
      }
      return card;
    });
  }

  if (Array.isArray(normalized.skillSections)) {
    normalized.skillSections = normalized.skillSections.map((section) => {
      const override = overrides.find(
        (entry) =>
          entry.player === player.name &&
          entry.cardId === Number(section.cardId),
      );
      if (!override) return section;
      return {
        ...section,
        text: override.text,
        sourceUpdate: { ...override.source },
        imageStatus: "已按公告修订；卡面图片保留官网原件",
      };
    });
  }

  if (overrides.length > 0 && player.name === "乔汐" && Array.isArray(normalized.skillSections)) {
    if (!normalized.skillSections.some((section) => section.name === "潮汐的交响")) {
      normalized.skillSections = [
        ...normalized.skillSections,
        {
          type: "秘技牌",
          name: "潮汐的交响",
          text: QIAOXI_TIDE_DESCRIPTION,
          cardId: QIAOXI_TIDE_CARD_ID,
          currentOfficial: true,
          sourceUpdate: { ...QIAOXI_TIDE_SOURCE },
        },
      ];
    }
  }

  return withCommonFields(normalized, "player", season);
}

function countCurrent(items) {
  return items.filter((item) => item.versionStatus !== "historical_pending").length;
}

function assertUniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`${label} 存在重复 id：${item.id}`);
    ids.add(item.id);
  }
}

async function writeJson(targetDir, filename, value) {
  await writeFile(path.join(targetDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

const ITEM_CAVEATS = {
  "hero-sunbin":
    "2026-11-28 直接核对腾讯官网原生图鉴接口（589094_oscard_new_1.js）与镜像图鉴，均写作“100+100% 法术攻击力”；多家早期第三方攻略写作“50+100% 法术攻击力（总伤害 90）”。本站按官网图鉴展示，实战以端内技能说明为准。",
};

const catalogDefinitions = [
  { kind: "hero", input: "hero.json", output: "heroes.json" },
  { kind: "equipment", input: "equipment.json", output: "equipment.json" },
  { kind: "talent", input: "talent.json", output: "talents.json" },
  { kind: "effect", input: "effect.json", output: "effects.json" },
];

const seasonsConfig = await readJson("seasons.config.json");
const seasons = seasonsConfig.seasons.toSorted((a, b) => a.order - b.order);
if (!seasons.some((season) => season.id === seasonsConfig.defaultSeason)) {
  throw new Error(`默认赛季 ${seasonsConfig.defaultSeason} 不在 seasons 列表中`);
}

async function readPlayerSource(relativePath) {
  const value = await readJson(relativePath);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.items)) return value.items;
  throw new Error(`${relativePath} 不是棋手数组或 { items: [] } 数据集`);
}

for (const season of seasons) {
  if (season.status === "test") {
    throw new Error(`体验服赛季 ${season.id} 不允许进入站点数据`);
  }
  const seasonOutputDir = path.join(outputDir, "seasons", season.id);
  await mkdir(seasonOutputDir, { recursive: true });
  const overrides = season.research.announcementOverrides ? CARD_OVERRIDES : [];
  const datasets = {};

  for (const definition of catalogDefinitions) {
    const catalog = await readJson(
      `${season.research.catalogs}/${definition.input}`,
    );
    const items = normalizeCatalog(catalog, definition.kind, season);
    for (const item of items) {
      if (ITEM_CAVEATS[item.id]) item.caveat = ITEM_CAVEATS[item.id];
    }
    assertUniqueIds(items, `${season.id}/${definition.kind}`);
    datasets[definition.kind] = items;
    await writeJson(seasonOutputDir, definition.output, items);
  }

  const playerSources = Array.isArray(season.research.players)
    ? season.research.players
    : [season.research.players];
  const playerInputs = [];
  for (const source of playerSources) {
    playerInputs.push(...(await readPlayerSource(source)));
  }
  const players = playerInputs.map((player) =>
    normalizePlayer(player, season, overrides),
  );
  assertUniqueIds(players, `${season.id}/player`);
  datasets.player = players;
  await writeJson(seasonOutputDir, "players.json", players);

  for (const override of overrides) {
    const player = players.find((entry) => entry.name === override.player);
    const card = player?.cards?.find(
      (entry) => Number(entry.id) === override.cardId,
    );
    if (
      card?.description !== override.text ||
      card?.rawDescription !== override.text
    ) {
      throw new Error(
        `${override.player} 关联卡 ${override.cardId} 的公告修订文案未正确写入`,
      );
    }
    if (
      card?.sourceUpdate?.id !== override.source.id ||
      card?.sourceUpdate?.date !== override.source.date
    ) {
      throw new Error(
        `${override.player} 关联卡 ${override.cardId} 的公告来源未正确写入`,
      );
    }
    const section = player?.skillSections?.find(
      (entry) => Number(entry.cardId) === override.cardId,
    );
    if (section && section.text !== override.text) {
      throw new Error(
        `${override.player} 技能段 ${override.cardId} 的公告修订文案未同步`,
      );
    }
  }

  const categories = Object.fromEntries(
    ["hero", "equipment", "talent", "effect", "player"].map((kind) => [
      kind,
      {
        totalCount: datasets[kind].length,
        currentCount: countCurrent(datasets[kind]),
      },
    ]),
  );
  const allItems = Object.values(datasets).flat();
  const counts = Object.fromEntries(
    Object.entries(categories).map(([kind, count]) => [
      kind,
      { total: count.totalCount, current: count.currentCount },
    ]),
  );
  const meta = {
    id: season.id,
    label: season.label,
    shortLabel: season.shortLabel,
    status: season.status,
    order: season.order,
    isDefault: season.id === seasonsConfig.defaultSeason,
    datasetId: season.datasetId,
    currentPatch: season.meta.currentPatch,
    patchDate: season.meta.patchDate,
    verifiedAt: season.meta.verifiedAt,
    season: season.label,
    totalCount: allItems.length,
    currentCount: countCurrent(allItems),
    currentDefinition: "versionStatus !== 'historical_pending'",
    categories,
    // Keep the compact aliases used by the existing CatalogMeta type as well.
    counts,
    officialUrl: season.meta.officialUrl ?? "https://wxq.qq.com/",
    officialGuideUrl:
      season.meta.officialGuideUrl ?? "https://wxq.qq.com/cp/a202609xszy/",
    sourceUrl: season.sourceUrl,
    knowledgeSiteUrl: season.sourceUrl,
    ...(season.meta.latestPatch
      ? { latestPatch: season.meta.latestPatch }
      : {}),
  };
  await writeJson(seasonOutputDir, "meta.json", meta);

  console.log(
    `数据构建完成 [${season.id}]：总计 ${meta.totalCount}，当前 ${meta.currentCount}\n` +
      Object.entries(categories)
        .map(
          ([kind, count]) =>
            `${kind}: total=${count.totalCount}, current=${count.currentCount}`,
        )
        .join("\n"),
  );

  const caveated = [...datasets.hero, ...datasets.player].filter(
    (item) => item.caveat,
  );
  if (
    overrides.length > 0 &&
    caveated.length !== Object.keys(ITEM_CAVEATS).length
  ) {
    throw new Error(`${season.id} 的 ITEM_CAVEATS 未被完整写入条目`);
  }
  if (caveated.length > 0) {
    console.log(
      `数值分歧提示 [${season.id}]：${caveated.map((item) => item.name).join("、")}`,
    );
  }
}
