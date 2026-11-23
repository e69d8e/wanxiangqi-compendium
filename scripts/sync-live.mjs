import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const researchDir = path.join(rootDir, ".research");
const catalogsDir = path.join(researchDir, "catalogs");
const playerPath = path.join(researchDir, "player-array-1.json");
const metaPath = path.join(rootDir, "src", "data", "meta.json");

const SITE_URL = "https://wzwxq.com";
const ASSET_BASE = "https://assets.wanxiangqiwiki.com/assets";
const USER_AGENT = "wanxiangqi-compendium-weekly-sync/1.0";
const NEWS_API = "https://apps.game.qq.com/cmc/cross";
const NEWS_SERVICE_ID = 389;
const NEWS_SECRET = "9784d353d1f9ca34a59b61752630dade";
const ANNOUNCEMENT_CHANNEL = 7061; // 官网资讯列表的「公告」频道
const writeChanges = process.argv.includes("--write");

const catalogDefinitions = [
  { type: "hero", file: "hero.json", label: "英雄" },
  { type: "equipment", file: "equipment.json", label: "装备" },
  { type: "talent", file: "talent.json", label: "天赋" },
  { type: "effect", file: "effect.json", label: "效果牌" },
];

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchText(url, { attempts = 3, timeout = 30_000, headers = {} } = {}) {
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

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
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
    ids.length ? ids.slice(0, 12).map((id) => label(nextMap.get(id) ?? previousMap.get(id), id)) : [];
  return {
    added: describe(added),
    removed: describe(removed),
    changedItems: describe(changed),
    addedCount: added.length,
    removedCount: removed.length,
    changedCount: changed.length,
  };
}

async function checkCatalog(definition) {
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

  const localPath = path.join(catalogsDir, definition.file);
  const local = await readJsonIfExists(localPath);
  const diff = diffRecords(
    local?.items ?? [],
    live.items,
    (item) => item.id,
    (item) => `${item?.name ?? "未知"}（${item?.id ?? "?"}）`,
  );
  const changed = !local || canonical(local) !== canonical(live);

  if (changed && writeChanges) {
    await mkdir(catalogsDir, { recursive: true });
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
      case "x": {
        output += String.fromCharCode(parseInt(raw.slice(index + 1, index + 3), 16));
        index += 2;
        break;
      }
      case "u": {
        output += String.fromCharCode(parseInt(raw.slice(index + 1, index + 5), 16));
        index += 4;
        break;
      }
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

async function checkPlayers() {
  const live = await fetchLivePlayers();
  const local = await readJsonIfExists(playerPath);
  const diff = diffRecords(
    local ?? [],
    live,
    (player) => player.name,
    (player, name) => {
      const cardCount = Array.isArray(player?.cards) ? player.cards.length : 0;
      return `${name}（${cardCount} 张关联卡）`;
    },
  );
  const changed = !local || canonical(local) !== canonical(live);

  if (changed && writeChanges) {
    await mkdir(researchDir, { recursive: true });
    await writeFile(playerPath, `${JSON.stringify(live, null, 2)}\n`);
  }

  return {
    label: "棋手",
    localCount: local?.length ?? 0,
    liveCount: live.length,
    changed,
    ...diff,
  };
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

function printDiff(result) {
  const parts = [];
  if (result.addedCount) parts.push(`新增 ${result.addedCount}：${result.added.join("、")}`);
  if (result.removedCount) parts.push(`移除 ${result.removedCount}：${result.removed.join("、")}`);
  if (result.changedCount) parts.push(`改动 ${result.changedCount}：${result.changedItems.join("、")}`);
  if (parts.length === 0) return "内容无差异";
  return parts.join("；");
}

console.log(`检查线上资料（${writeChanges ? "写入模式" : "只读模式"}）……`);

const catalogResults = [];
for (const definition of catalogDefinitions) {
  const result = await checkCatalog(definition);
  catalogResults.push(result);
  console.log(
    `\n[${result.label}] 线上 ${result.liveCount} / 本地 ${result.localCount}；` +
      `${result.changed ? "有变化" : "无变化"}`,
  );
  if (result.changed) console.log(`  ${printDiff(result)}`);
}

const playerResult = await checkPlayers();
console.log(
  `\n[棋手] 线上 ${playerResult.liveCount} / 本地 ${playerResult.localCount}；` +
    `${playerResult.changed ? "有变化" : "无变化"}`,
);
if (playerResult.changed) console.log(`  ${printDiff(playerResult)}`);

const announcements = await fetchAnnouncements();
console.log("\n== 官方公告（最近 10 条）==");
for (const announcement of announcements.slice(0, 10)) {
  const tag = announcement.official ? "正式服" : "体验服";
  console.log(
    `[${tag}] ${announcement.date} ${announcement.time} ` +
      `${announcement.id} ${announcement.title}`,
  );
}

const meta = await readJsonIfExists(metaPath);
const officialPatches = announcements.filter(
  (announcement) =>
    announcement.official &&
    announcement.version &&
    /更新公告/.test(announcement.title),
);
const latestOfficialPatch = officialPatches.sort((left, right) =>
  // 公告接口按时间倒序返回；按版本号取最大，避免同版本补发公告干扰。
  compareVersions(right.version, left.version),
)[0];
const baselineVersion = String(meta?.currentPatch ?? "").replace(/^v/, "");
const newPatch =
  Boolean(latestOfficialPatch?.version) &&
  Boolean(baselineVersion) &&
  compareVersions(latestOfficialPatch.version, baselineVersion) > 0;
const versionMismatch =
  Boolean(latestOfficialPatch?.version) &&
  Boolean(baselineVersion) &&
  latestOfficialPatch.version !== baselineVersion;

console.log(
  `\n站点基线：${meta?.currentPatch ?? "未知"}（${meta?.patchDate ?? "未知"}）`,
);
if (latestOfficialPatch) {
  console.log(
    `最新正式服版本公告：${latestOfficialPatch.title}（${latestOfficialPatch.date}，${latestOfficialPatch.id}）`,
  );
}
if (newPatch) {
  console.log(
    `⚠️ 发现高于站点基线的新正式服版本：v${latestOfficialPatch.version}，需要人工核对公告并更新数据。`,
  );
} else if (versionMismatch) {
  console.log(
    `⚠️ 最新正式服版本公告 v${latestOfficialPatch.version} 与站点基线 ${meta?.currentPatch} 不一致，请核对。`,
  );
} else {
  console.log("未发现高于站点基线的新正式服版本公告。");
}

const dataChanged = catalogResults.some((result) => result.changed) || playerResult.changed;
console.log(
  dataChanged
    ? writeChanges
      ? "\n结论：已把最新目录/棋手数据写入 .research，请继续执行构建与校验。"
      : "\n结论：检测到目录/棋手数据变化；确认后加 --write 写入 .research。"
    : "\n结论：线上目录与棋手数据均无变化。",
);

const summary = {
  checkedAt: new Date().toISOString(),
  write: writeChanges,
  catalogs: catalogResults.map(({ type, changed, localCount, liveCount, addedCount, removedCount, changedCount }) => ({
    type,
    changed,
    localCount,
    liveCount,
    addedCount,
    removedCount,
    changedCount,
  })),
  players: {
    changed: playerResult.changed,
    localCount: playerResult.localCount,
    liveCount: playerResult.liveCount,
    addedCount: playerResult.addedCount,
    removedCount: playerResult.removedCount,
    changedCount: playerResult.changedCount,
  },
  announcements: {
    latestOfficialPatch: latestOfficialPatch ?? null,
    baselineVersion: meta?.currentPatch ?? null,
    newPatch,
    versionMismatch,
  },
  dataChanged,
};
console.log(`SYNC_SUMMARY ${JSON.stringify(summary)}`);