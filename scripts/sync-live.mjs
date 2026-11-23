import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const configPath = path.join(rootDir, "seasons.config.json");

const SITE_URL = "https://wzwxq.com";
const ASSET_BASE = "https://assets.wanxiangqiwiki.com/assets";
const USER_AGENT = "wanxiangqi-compendium-weekly-sync/1.1";
const NEWS_API = "https://apps.game.qq.com/cmc/cross";
const NEWS_SERVICE_ID = 389;
const NEWS_SECRET = "9784d353d1f9ca34a59b61752630dade";
const ANNOUNCEMENT_CHANNEL = 7061;
const writeChanges = process.argv.includes("--write");

const catalogDefinitions = [
  { type: "hero", file: "hero.json", label: "英雄" },
  { type: "equipment", file: "equipment.json", label: "装备" },
  { type: "talent", file: "talent.json", label: "天赋" },
  { type: "effect", file: "effect.json", label: "效果牌" },
];

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchText(
  url,
  { attempts = 3, timeout = 30_000, headers = {}, allow404 = false } = {},
) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9",
          "User-Agent": USER_AGENT,
          ...headers,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(timeout),
      });
      if (allow404 && response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1000);
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`获取失败 ${url}：${reason}`);
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  if (text == null) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`返回内容不是 JSON：${url}`);
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error(`JSON 解析失败：${url}`);
  }
}

async function readFileIfExists(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function readJsonIfExists(file) {
  const text = await readFileIfExists(file);
  return text == null ? null : JSON.parse(text);
}

function canonical(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonical(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function indexBy(items, key) {
  return new Map(items.map((item) => [key(item), item]));
}

function diffRecords(previous, next, key, label) {
  const previousMap = indexBy(previous, key);
  const nextMap = indexBy(next, key);
  const added = [...nextMap.keys()].filter((id) => !previousMap.has(id));
  const removed = [...previousMap.keys()].filter((id) => !nextMap.has(id));
  const changed = [...nextMap.keys()].filter(
    (id) =>
      previousMap.has(id) &&
      canonical(previousMap.get(id)) !== canonical(nextMap.get(id)),
  );
  const describe = (ids) =>
    ids.length
      ? ids
          .slice(0, 12)
          .map((id) => label(nextMap.get(id) ?? previousMap.get(id), id))
      : [];
  return {
    added: describe(added),
    removed: describe(removed),
    changedItems: describe(changed),
    addedCount: added.length,
    removedCount: removed.length,
    changedCount: changed.length,
  };
}

function printDiff(result) {
  const parts = [];
  if (result.addedCount) parts.push(`新增 ${result.addedCount}：${result.added.join("、")}`);
  if (result.removedCount) parts.push(`移除 ${result.removedCount}：${result.removed.join("、")}`);
  if (result.changedCount) parts.push(`改动 ${result.changedCount}：${result.changedItems.join("、")}`);
  return parts.length ? parts.join("；") : "内容无差异";
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function datasetBase(datasetId) {
  return `${SITE_URL}/datasets/${datasetId}/`;
}

function normalizePlayers(items) {
  if (!Array.isArray(items)) throw new Error("棋手数据不是数组");
  return items;
}

function playerItems(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return null;
}

async function writeSeasonFile(season, relativePath, text) {
  const file = path.join(rootDir, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

async function checkPlayerFile({ season, liveItems, rawText, write, label }) {
  const playerPath = Array.isArray(season.research.players)
    ? season.research.players[0]
    : season.research.players;
  if (!playerPath) throw new Error(`${season.id} 未配置棋手资料路径`);
  const localRaw = await readJsonIfExists(path.join(rootDir, playerPath));
  const localItems = playerItems(localRaw) ?? [];
  const diff = diffRecords(
    localItems,
    liveItems,
    (player) => player.name,
    (player, name) => {
      const cardCount = Array.isArray(player?.cards) ? player.cards.length : 0;
      return `${name}（${cardCount} 张关联卡）`;
    },
  );
  const changed = localRaw == null || canonical(localItems) !== canonical(liveItems);

  if (changed && write) {
    const text = rawText ?? `${JSON.stringify(liveItems, null, 2)}\n`;
    await writeSeasonFile(season, playerPath, text);
  }

  return {
    label,
    localCount: localItems.length,
    liveCount: liveItems.length,
    changed,
    ...diff,
  };
}

async function checkLegacyCatalog(season, definition) {
  const url = `${SITE_URL}/explorer-catalogs/${definition.file}`;
  const text = await fetchText(url);
  let live;
  try {
    live = JSON.parse(text);
  } catch {
    throw new Error(`${definition.label}目录不是合法 JSON：${url}`);
  }
  if (
    live?.schema !== "explorer-catalog/v1" ||
    live?.type !== definition.type ||
    !Array.isArray(live.items)
  ) {
    throw new Error(`${definition.label}目录结构异常：${url}`);
  }

  const localPath = path.join(rootDir, season.research.catalogs, definition.file);
  const local = await readJsonIfExists(localPath);
  const diff = diffRecords(
    local?.items ?? [],
    live.items,
    (item) => item.id,
    (item) => `${item?.name ?? "未知"}（${item?.id ?? "?"}）`,
  );
  const changed = !local || canonical(local) !== canonical(live);

  if (changed && writeChanges) {
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, text);
  }

  return {
    type: definition.type,
    label: definition.label,
    url,
    localCount: local?.items?.length ?? 0,
    liveCount: live.items.length,
    liveCurrentCount: live.currentCount ?? null,
    changed,
    ...diff,
  };
}

function decodeJsSingleQuoted(raw) {
  let output = "";
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (character !== "\\") {
      output += character;
      continue;
    }
    const next = raw[index + 1];
    index += 1;
    switch (next) {
      case "'":
      case '"':
      case "\\":
        output += next;
        break;
      case "n":
        output += "\n";
        break;
      case "r":
        output += "\r";
        break;
      case "t":
        output += "\t";
        break;
      case "b":
        output += "\b";
        break;
      case "f":
        output += "\f";
        break;
      case "v":
        output += "\v";
        break;
      case "0":
        output += "\0";
        break;
      case "x":
        output += String.fromCharCode(parseInt(raw.slice(index + 1, index + 3), 16));
        index += 2;
        break;
      case "u":
        output += String.fromCharCode(parseInt(raw.slice(index + 1, index + 5), 16));
        index += 4;
        break;
      case "\n":
        break;
      default:
        output += next;
    }
  }
  return output;
}

function extractJsonParseArrays(source) {
  const arrays = [];
  const pattern = /JSON\.parse\('((?:[^'\\]|\\.)*)'\)/g;
  for (const match of source.matchAll(pattern)) {
    try {
      const value = JSON.parse(decodeJsSingleQuoted(match[1]));
      if (Array.isArray(value)) arrays.push(value);
    } catch {
      // 同一 bundle 中可能存在无关的 JSON.parse 片段，交给候选校验过滤。
    }
  }
  return arrays;
}

async function fetchSiteBundle() {
  const home = await fetchText(`${SITE_URL}/`);
  const scripts = [...home.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(
    (match) => match[1],
  );
  const mainScript =
    scripts.find((source) => /\/assets\/site-[A-Za-z0-9_-]+\.js/.test(source)) ??
    scripts[0];
  if (!mainScript) throw new Error("官网首页中找不到主 bundle");
  const url = new URL(mainScript, `${SITE_URL}/`).href;
  return { url, source: await fetchText(url) };
}

async function fetchLivePlayers() {
  const home = await fetchText(`${SITE_URL}/`);
  const scripts = [...home.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(
    (match) => match[1],
  );
  const mainScript =
    scripts.find((source) => /\/assets\/site-[A-Za-z0-9_-]+\.js/.test(source)) ??
    scripts[0];
  if (!mainScript) throw new Error("官网首页中找不到主 bundle");

  const mainSource = await fetchText(new URL(mainScript, `${SITE_URL}/`).href);
  const chunk = mainSource.match(/chessplayerFacts-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!chunk) throw new Error("主 bundle 中找不到棋手数据 chunk");

  const chunkSource = await fetchText(`${ASSET_BASE}/${chunk}`);
  const candidates = extractJsonParseArrays(chunkSource).filter(
    (value) =>
      value.length >= 10 &&
      value.every((entry) => entry && typeof entry.name === "string") &&
      value.some(
        (entry) =>
          Array.isArray(entry.cards) || Array.isArray(entry.skillSections),
      ),
  );
  if (candidates.length === 0) {
    throw new Error("棋手 chunk 中找不到完整的棋手数组");
  }
  return candidates.sort((left, right) => right.length - left.length)[0];
}

async function checkLegacyPlayers(season) {
  const live = await fetchLivePlayers();
  return checkPlayerFile({
    season,
    liveItems: live,
    rawText: `${JSON.stringify(live, null, 2)}\n`,
    write: writeChanges,
    label: "棋手",
  });
}

async function checkLegacySeason(season) {
  const catalogs = [];
  for (const definition of catalogDefinitions) {
    const result = await checkLegacyCatalog(season, definition);
    catalogs.push(result);
    console.log(
      `\n[${season.id}/${result.label}] 线上 ${result.liveCount} / 本地 ${result.localCount}；` +
        `${result.changed ? "有变化" : "无变化"}`,
    );
    if (result.changed) console.log(`  ${printDiff(result)}`);
  }
  const players = await checkLegacyPlayers(season);
  console.log(
    `\n[${season.id}/棋手] 线上 ${players.liveCount} / 本地 ${players.localCount}；` +
      `${players.changed ? "有变化" : "无变化"}`,
  );
  if (players.changed) console.log(`  ${printDiff(players)}`);
  return {
    id: season.id,
    datasetId: season.datasetId ?? null,
    mode: "legacy",
    changed: catalogs.some((result) => result.changed) || players.changed,
    catalogs,
    players,
  };
}

function newSeasonFromManifest(manifest, order) {
  const seasonId = String(manifest.seasonId);
  const datasetId = String(manifest.datasetId);
  return {
    id: seasonId,
    label: `${seasonId.toUpperCase()} 正式服`,
    shortLabel: seasonId.toUpperCase(),
    status: "live",
    order,
    datasetId,
    sourceUrl: datasetBase(datasetId),
    research: {
      catalogs: `.research/seasons/${seasonId}/explorer-catalogs`,
      players: [`.research/seasons/${seasonId}/players.json`],
      announcementOverrides: false,
    },
    meta: {
      currentPatch: manifest.patchId ? `v${manifest.patchId}` : "待核验",
      patchDate: String(manifest.source?.observedAt ?? "").slice(0, 10) || today(),
      verifiedAt: today(),
      officialUrl: "https://wxq.qq.com/",
      officialGuideUrl: "https://wxq.qq.com/cp/a202609xszy/",
    },
  };
}

async function fetchManifest(datasetId) {
  if (!datasetId) return null;
  return fetchJson(`${SITE_URL}/datasets/${datasetId}/manifest.json`, {
    allow404: true,
  });
}

async function checkDatasetResource(season, datasetId, manifest, relativePath, localRelative, label, type) {
  const url = `${datasetBase(datasetId)}${relativePath}`;
  const text = await fetchText(url);
  const expected = manifest.resources?.[relativePath]?.sha256;
  if (expected && sha256(text) !== expected) {
    throw new Error(`${season.id}/${relativePath} 的 sha256 与 manifest 不一致`);
  }
  const localPath = path.join(rootDir, localRelative);
  const localText = await readFileIfExists(localPath);
  let live;
  let local;
  try {
    live = JSON.parse(text);
    local = localText == null ? null : JSON.parse(localText);
  } catch {
    throw new Error(`${season.id}/${relativePath} 不是合法 JSON`);
  }

  if (type === "players") {
    const liveItems = playerItems(live);
    const localItems = playerItems(local) ?? [];
    if (!liveItems) throw new Error(`${season.id}/${relativePath} 缺少 items 数组`);
    const diff = diffRecords(
      localItems,
      liveItems,
      (player) => player.name,
      (player, name) => `${name}（${Array.isArray(player?.cards) ? player.cards.length : 0} 张关联卡）`,
    );
    const changed = localText == null || canonical(localItems) !== canonical(liveItems);
    if (changed && writeChanges) await writeSeasonFile(season, localRelative, text);
    return {
      type,
      label,
      url,
      localCount: localItems.length,
      liveCount: liveItems.length,
      changed,
      ...diff,
    };
  }

  if (
    live?.schema !== "explorer-catalog/v1" ||
    live?.type !== type ||
    !Array.isArray(live.items)
  ) {
    throw new Error(`${season.id}/${relativePath} 目录结构异常`);
  }
  const diff = diffRecords(
    local?.items ?? [],
    live.items,
    (item) => item.id,
    (item) => `${item?.name ?? "未知"}（${item?.id ?? "?"}）`,
  );
  const changed = localText == null || canonical(local) !== canonical(live);
  if (changed && writeChanges) await writeSeasonFile(season, localRelative, text);
  return {
    type,
    label,
    url,
    localCount: local?.items?.length ?? 0,
    liveCount: live.items.length,
    liveCurrentCount: live.currentCount ?? null,
    changed,
    ...diff,
  };
}

async function checkDatasetSeason(season, manifest) {
  const datasetId = String(manifest.datasetId);
  if (manifest.schema !== "game-dataset-manifest/v1") {
    throw new Error(`${season.id} manifest schema 异常`);
  }
  if (manifest.environment !== "live") {
    throw new Error(`${season.id} 数据集环境为 ${manifest.environment}，拒绝同步到正式站点`);
  }
  if (String(manifest.seasonId) !== season.id) {
    throw new Error(`${season.id} manifest seasonId=${manifest.seasonId} 不一致`);
  }

  const manifestRelative = `.research/seasons/${season.id}/manifest.json`;
  const localManifest = await readJsonIfExists(path.join(rootDir, manifestRelative));
  const manifestChanged =
    localManifest == null || canonical(localManifest) !== canonical(manifest);
  if (manifestChanged && writeChanges) {
    await writeSeasonFile(season, manifestRelative, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const catalogResults = [];
  for (const definition of catalogDefinitions) {
    const relativePath = `explorer-catalogs/${definition.file}`;
    const result = await checkDatasetResource(
      season,
      datasetId,
      manifest,
      relativePath,
      `${season.research.catalogs}/${definition.file}`,
      definition.label,
      definition.type,
    );
    catalogResults.push(result);
    console.log(
      `\n[${season.id}/${result.label}] 线上 ${result.liveCount} / 本地 ${result.localCount}；` +
        `${result.changed ? "有变化" : "无变化"}`,
    );
    if (result.changed) console.log(`  ${printDiff(result)}`);
  }

  const players = await checkDatasetResource(
    season,
    datasetId,
    manifest,
    "players.json",
    Array.isArray(season.research.players)
      ? season.research.players[0]
      : season.research.players,
    "棋手",
    "players",
  );
  console.log(
    `\n[${season.id}/棋手] 线上 ${players.liveCount} / 本地 ${players.localCount}；` +
      `${players.changed ? "有变化" : "无变化"}`,
  );
  if (players.changed) console.log(`  ${printDiff(players)}`);

  return {
    id: season.id,
    datasetId,
    mode: "dataset",
    manifestChanged,
    changed: manifestChanged || catalogResults.some((result) => result.changed) || players.changed,
    catalogs: catalogResults,
    players,
  };
}

async function discoverLiveDatasets(config) {
  const { url, source } = await fetchSiteBundle();
  const ids = [
    ...new Set(
      [...source.matchAll(/\bs\d+-(?:live|test)(?:-[A-Za-z0-9._-]+)?\b/g)].map(
        (match) => match[0],
      ),
    ),
  ].filter((id) => !id.includes("-test"));
  const discovered = [];
  for (const datasetId of ids) {
    const manifest = await fetchManifest(datasetId);
    if (!manifest) continue;
    if (manifest.environment !== "live" || !manifest.seasonId) continue;
    discovered.push({ datasetId, manifest });
  }

  const configuredDatasetIds = new Set(config.seasons.map((season) => season.datasetId));
  const added = [];
  const updated = [];
  for (const entry of discovered) {
    if (configuredDatasetIds.has(entry.datasetId)) continue;
    const existing = config.seasons.find((season) => season.id === entry.manifest.seasonId);
    if (existing) {
      if (existing.datasetId !== entry.datasetId) {
        existing.datasetId = entry.datasetId;
        existing.sourceUrl = datasetBase(entry.datasetId);
        updated.push(existing.id);
      }
      continue;
    }
    const season = newSeasonFromManifest(
      entry.manifest,
      Math.max(0, ...config.seasons.map((item) => item.order)) + 1,
    );
    config.seasons.push(season);
    config.defaultSeason = season.id;
    added.push(season.id);
  }

  return { bundleUrl: url, ids, discovered, added, updated };
}

function versionFromTitle(title) {
  return title.match(/v(\d+\.\d+\.\d+)/i)?.[1] ?? null;
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchAnnouncements() {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash("md5")
    .update(`${NEWS_SECRET}web_pc${NEWS_SERVICE_ID}${timestamp}`)
    .digest("hex");
  const query = new URLSearchParams({
    serviceId: String(NEWS_SERVICE_ID),
    withtop: "yes",
    logic: "or",
    typeids: "1,2",
    sortby: "sIdxTime",
    r1: "userobj",
    start: "0",
    limit: "20",
    source: "web_pc",
    filter: "channel",
    exclusiveChannel: "40",
    exclusiveChannelSign: signature,
    time: String(timestamp),
    chanid: String(ANNOUNCEMENT_CHANNEL),
  });
  const text = await fetchText(`${NEWS_API}?${query}`, {
    headers: { Referer: `${SITE_URL}/` },
  });
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("公告接口返回内容无法解析");
  let payload;
  try {
    payload = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("公告接口返回的 JSON 解析失败");
  }
  if (String(payload.status) !== "0") {
    throw new Error(`公告接口返回失败状态：${payload.status} ${payload.msg ?? ""}`);
  }
  const items = payload.data?.items;
  if (!Array.isArray(items)) throw new Error("公告接口返回的 items 不是数组");
  return items.map((item) => ({
    id: String(item.iId ?? ""),
    date: String(item.sIdxTime ?? "").slice(0, 10),
    time: String(item.sIdxTime ?? "").slice(11, 16),
    title: cleanText(item.sTitle),
    summary: cleanText(item.sDesc),
    version: versionFromTitle(cleanText(item.sTitle)),
    official: !cleanText(item.sTitle).includes("体验服"),
    url: `https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=${item.iId}&tab=2`,
  }));
}

console.log(`检查线上资料（${writeChanges ? "写入模式" : "只读模式"}）……`);
const config = JSON.parse(await readFile(configPath, "utf8"));

const discovery = await discoverLiveDatasets(config);
let configDirty = discovery.added.length > 0 || discovery.updated.length > 0;
console.log(
  `\n发现正式服数据集：${discovery.discovered.map((entry) => entry.datasetId).join("、") || "无"}` +
    (discovery.added.length ? `；新增赛季：${discovery.added.join("、")}` : "") +
    (discovery.updated.length ? `；更新 datasetId：${discovery.updated.join("、")}` : ""),
);
if (discovery.added.length > 0) {
  console.log("⚠️ 已把新正式服赛季加入内存配置；--write 时写入 seasons.config.json。");
}

const seasonResults = [];
for (const season of [...config.seasons].sort((left, right) => left.order - right.order)) {
  const manifest = await fetchManifest(season.datasetId);
  if (manifest) {
    if (manifest.environment !== "live") {
      console.log(`\n[${season.id}] 数据集 ${season.datasetId} 为 ${manifest.environment}，跳过。`);
      continue;
    }
    if (manifest.seasonId !== season.id) {
      throw new Error(`配置 ${season.id} 与 manifest seasonId=${manifest.seasonId} 不一致`);
    }
    const result = await checkDatasetSeason(season, manifest);
    if (writeChanges && (result.manifestChanged || result.changed)) {
      season.meta.patchDate = String(manifest.source?.observedAt ?? "").slice(0, 10) || season.meta.patchDate;
      season.meta.verifiedAt = today();
      if (result.manifestChanged && manifest.patchId) {
        season.meta.currentPatch = `v${manifest.patchId}`;
      }
      configDirty = true;
    }
    seasonResults.push(result);
  } else if (season.id === "s1" || season.datasetId === "s1-live") {
    const result = await checkLegacySeason(season);
    if (writeChanges && result.changed) {
      season.meta.verifiedAt = today();
      configDirty = true;
    }
    seasonResults.push(result);
  } else {
    throw new Error(`${season.id} 找不到 dataset manifest：${season.datasetId}`);
  }
}

if (writeChanges && configDirty) {
  config.seasons.sort((left, right) => left.order - right.order);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(
    discovery.added.length > 0 || discovery.updated.length > 0
      ? `已写入赛季配置：新增 ${discovery.added.join("、") || "无"}；更新 ${discovery.updated.join("、") || "无"}`
      : "已更新赛季配置的核验日期/数据集信息。",
  );
}

const announcements = await fetchAnnouncements();
console.log("\n== 官方公告（最近 10 条）==");
for (const announcement of announcements.slice(0, 10)) {
  const tag = announcement.official ? "正式服" : "体验服";
  console.log(
    `[${tag}] ${announcement.date} ${announcement.time} ` +
      `${announcement.id} ${announcement.title}`,
  );
}

const defaultSeason =
  config.seasons.find((season) => season.id === config.defaultSeason) ??
  config.seasons[0];
const baselineVersion = String(defaultSeason?.meta.currentPatch ?? "").replace(/^v/, "");
const officialPatches = announcements.filter(
  (announcement) =>
    announcement.official &&
    announcement.version &&
    /更新公告/.test(announcement.title),
);
const latestOfficialPatch = officialPatches.sort((left, right) =>
  compareVersions(right.version, left.version),
)[0];
const newPatch =
  Boolean(latestOfficialPatch?.version) &&
  Boolean(baselineVersion) &&
  compareVersions(latestOfficialPatch.version, baselineVersion) > 0;
const versionMismatch =
  Boolean(latestOfficialPatch?.version) &&
  Boolean(baselineVersion) &&
  latestOfficialPatch.version !== baselineVersion;

// 已配置数据集的 manifest 公告 id，可用于后续精确匹配赛季公告。
for (const season of config.seasons) {
  const manifest = await fetchManifest(season.datasetId);
  if (manifest?.source?.announcementIds?.length) {
    console.log(
      `[${season.id}] manifest 依据公告：${manifest.source.announcementIds.join("、")}`,
    );
  }
}

console.log(`\n站点默认赛季：${defaultSeason?.id ?? "未知"} · ${defaultSeason?.meta.currentPatch ?? "未知"}（${defaultSeason?.meta.patchDate ?? "未知"}）`);
if (latestOfficialPatch) {
  console.log(
    `最新正式服版本公告：${latestOfficialPatch.title}（${latestOfficialPatch.date}，${latestOfficialPatch.id}）`,
  );
}
if (newPatch) {
  console.log(`⚠️ 发现高于站点基线的新正式服版本：v${latestOfficialPatch.version}，需要人工核对公告并更新数据。`);
} else if (versionMismatch) {
  console.log(`⚠️ 最新正式服版本公告 v${latestOfficialPatch.version} 与站点默认赛季 ${defaultSeason?.meta.currentPatch} 不一致，请核对。`);
} else {
  console.log("未发现高于站点基线的新正式服版本公告。");
}

const dataChanged =
  seasonResults.some((result) => result.changed) ||
  discovery.added.length > 0;
console.log(
  dataChanged
    ? writeChanges
      ? "\n结论：已把最新赛季目录/棋手数据写入 .research，请继续执行构建、图片下载与校验。"
      : "\n结论：检测到数据变化；确认后加 --write 写入 .research 与赛季配置。"
    : "\n结论：线上正式服目录与棋手数据均无变化。",
);

const summary = {
  checkedAt: new Date().toISOString(),
  write: writeChanges,
  discovery: {
    bundleUrl: discovery.bundleUrl,
    ids: discovery.ids,
    live: discovery.discovered.map((entry) => entry.datasetId),
    added: discovery.added,
    updated: discovery.updated,
  },
  seasons: seasonResults.map((result) => ({
    id: result.id,
    datasetId: result.datasetId,
    mode: result.mode,
    changed: result.changed,
    manifestChanged: result.manifestChanged ?? false,
    catalogs: result.catalogs.map(({ type, changed, localCount, liveCount, addedCount, removedCount, changedCount }) => ({
      type, changed, localCount, liveCount, addedCount, removedCount, changedCount,
    })),
    players: {
      changed: result.players.changed,
      localCount: result.players.localCount,
      liveCount: result.players.liveCount,
      addedCount: result.players.addedCount,
      removedCount: result.players.removedCount,
      changedCount: result.players.changedCount,
    },
  })),
  announcements: {
    latestOfficialPatch: latestOfficialPatch ?? null,
    baselineSeason: defaultSeason?.id ?? null,
    baselineVersion: defaultSeason?.meta.currentPatch ?? null,
    newPatch,
    versionMismatch,
  },
  dataChanged,
};
console.log(`SYNC_SUMMARY ${JSON.stringify(summary)}`);
