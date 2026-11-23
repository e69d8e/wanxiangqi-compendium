import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const dataDir = path.join(rootDir, "src", "data");
const imagesDir = path.resolve(rootDir, "public", "images");
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

const requestedSeason = process.argv.find((arg) => arg.startsWith("--season="))?.split("=")[1];
const config = JSON.parse(await readFile(path.join(rootDir, "seasons.config.json"), "utf8"));
const seasonIds = requestedSeason
  ? config.seasons.filter((season) => season.id === requestedSeason).map((season) => season.id)
  : config.seasons.map((season) => season.id);
if (requestedSeason && seasonIds.length === 0) {
  throw new Error(`未知赛季：${requestedSeason}`);
}

const sources = [
  { file: "heroes.json", kind: "hero", remote: (item) => item.thumbnail || item.image },
  { file: "equipment.json", kind: "equipment", remote: (item) => item.thumbnail || item.image },
  { file: "talents.json", kind: "talent", remote: (item) => item.thumbnail || item.image },
  { file: "effects.json", kind: "effect", remote: (item) => item.thumbnail || item.image },
  { file: "players.json", kind: "player", remote: (item) => item.avatar || item.portrait },
];

async function readSeasonJson(seasonId, filename) {
  return JSON.parse(
    await readFile(path.join(dataDir, "seasons", seasonId, filename), "utf8"),
  );
}

function remoteUrl(value, season) {
  if (!value || typeof value !== "string") return null;
  if (/^https?:\/\//.test(value)) return value;
  return new URL(value, season.sourceUrl).href;
}

function resolveTarget(item, seasonId) {
  if (
    typeof item.localImage !== "string" ||
    !item.localImage.startsWith(`/images/${seasonId}/`) ||
    !item.localImage.endsWith(".webp")
  ) {
    throw new Error(`非法 localImage：${item.localImage ?? "缺失"}`);
  }
  const target = path.resolve(
    rootDir,
    "public",
    item.localImage.replace(/^\/+/, ""),
  );
  if (!target.startsWith(`${imagesDir}${path.sep}`)) {
    throw new Error(`图片目标越出 public/images：${target}`);
  }
  return target;
}

async function fileExists(target) {
  try {
    return (await stat(target)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function fetchImage(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          "User-Agent": "wanxiangqi-compendium-image-sync/1.0",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      }
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength === 0) throw new Error("远程图片为空");
      return Buffer.from(bytes);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const jobs = [];
for (const season of config.seasons.filter((entry) => seasonIds.includes(entry.id))) {
  for (const source of sources) {
    const items = await readSeasonJson(season.id, source.file);
    for (const item of items) {
      if (item.kind !== source.kind) {
        throw new Error(`${season.id}/${source.file} 中 ${item.id} 的 kind 应为 ${source.kind}`);
      }
      jobs.push({
        season: season.id,
        id: item.id,
        name: item.name,
        kind: item.kind,
        url: remoteUrl(source.remote(item), season),
        target: resolveTarget(item, season.id),
      });
    }
  }
}

await mkdir(imagesDir, { recursive: true });
const failures = [];
let downloaded = 0;
let skipped = 0;
let completed = 0;
let cursor = 0;

async function processJob(job, index) {
  const label = `${job.season}/${job.kind}/${job.id}（${job.name}）`;
  let temporaryTarget;
  try {
    if (!job.url) throw new Error("缺少远程图片 URL");
    if (await fileExists(job.target)) {
      skipped += 1;
      return;
    }

    await mkdir(path.dirname(job.target), { recursive: true });
    const bytes = await fetchImage(job.url);
    temporaryTarget = `${job.target}.${process.pid}.${index}.tmp`;
    await writeFile(temporaryTarget, bytes);
    await rename(temporaryTarget, job.target);
    temporaryTarget = undefined;
    downloaded += 1;
  } catch (error) {
    failures.push({
      season: job.season,
      id: job.id,
      name: job.name,
      kind: job.kind,
      url: job.url,
      error: error instanceof Error ? error.message : String(error),
    });
    if (temporaryTarget) {
      // temporaryTarget 由已校验的 job.target 派生，且仍位于 public/images 内。
      await rm(temporaryTarget, { force: true }).catch(() => {});
    }
    console.error(`失败 ${label}：${failures.at(-1).error}`);
  } finally {
    completed += 1;
    if (completed % 50 === 0 || completed === jobs.length) {
      console.log(`进度 ${completed}/${jobs.length}：新下载 ${downloaded}，跳过 ${skipped}，失败 ${failures.length}`);
    }
  }
}

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= jobs.length) return;
    await processJob(jobs[index], index);
  }
}

console.log(`准备处理 ${jobs.length} 张主条目图片（赛季：${seasonIds.join("、")}），并发 ${CONCURRENCY}。`);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

console.log("\n图片处理完成");
console.log(`总数：${jobs.length}`);
console.log(`新下载：${downloaded}`);
console.log(`已存在跳过：${skipped}`);
console.log(`成功可用（下载+跳过）：${downloaded + skipped}`);
console.log(`失败：${failures.length}`);
if (failures.length > 0) {
  console.log("失败清单：");
  for (const failure of failures) {
    console.log(`- ${failure.season}/${failure.kind}/${failure.id}（${failure.name}）\n  URL: ${failure.url ?? "缺失"}\n  原因: ${failure.error}`);
  }
}
