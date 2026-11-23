import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distHtmlPath = path.join(rootDir, "dist", "index.html");
const siteUrl = (process.env.NETLIFY_SITE_URL ?? "https://wanxiangqi-compendium.netlify.app").replace(/\/$/, "");
const waitSeconds = Number(readOption("--wait") ?? 300);
const expectedText = readOption("--expect");
const intervalMilliseconds = 5_000;

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  const prefix = `${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function extractAssets(html) {
  return [
    ...new Set(
      [...html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)].map(
        (match) => match[0],
      ),
    ),
  ].sort();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "User-Agent": "wanxiangqi-compendium-deploy-check/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }
  return await response.text();
}

function sameAssets(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

let localHtml;
try {
  localHtml = await readFile(distHtmlPath, "utf8");
} catch {
  console.error(`找不到构建产物：${distHtmlPath}\n请先运行 npm run build。`);
  process.exit(1);
}

const localAssets = extractAssets(localHtml);
if (localAssets.length === 0) {
  console.error(`构建产物中没有找到 /assets 资源：${distHtmlPath}`);
  process.exit(1);
}

console.log(`本地构建资源：${localAssets.join(", ")}`);
console.log(`检查线上站点：${siteUrl}`);
console.log(`最长等待 ${waitSeconds} 秒（每 ${intervalMilliseconds / 1000} 秒重试一次）。`);

const deadline = Date.now() + waitSeconds * 1000;
let lastError = "";
let lastRemoteAssets = [];

while (true) {
  const checkedAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  try {
    const html = await fetchText(`${siteUrl}/?deploy_check=${Date.now()}`);
    const remoteAssets = extractAssets(html);
    lastRemoteAssets = remoteAssets;
    lastError = "";

    if (sameAssets(localAssets, remoteAssets)) {
      console.log(`\n✓ [${checkedAt}] 线上资源与本地构建一致，Netlify 部署已生效。`);
      if (expectedText) {
        const bundle = remoteAssets.find((asset) => asset.endsWith(".js"));
        if (!bundle) {
          console.error("线上没有找到 JS bundle，无法校验期望文本。");
          process.exit(1);
        }
        const source = await fetchText(`${siteUrl}${bundle}`);
        if (!source.includes(expectedText)) {
          console.error(`线上 bundle ${bundle} 中未找到期望文本：“${expectedText}”`);
          process.exit(1);
        }
        console.log(`✓ 线上 bundle ${bundle} 已包含期望文本：“${expectedText}”`);
      }
      process.exit(0);
    }

    console.log(
      `[${checkedAt}] 尚未更新；线上资源：${remoteAssets.length ? remoteAssets.join(", ") : "未找到 /assets 资源"}`,
    );
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    console.log(`[${checkedAt}] 检查失败：${lastError}`);
  }

  if (Date.now() >= deadline) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMilliseconds));
}

console.error(`\n✗ 等待 ${waitSeconds} 秒后仍未检测到新部署。`);
console.error(`本地资源：${localAssets.join(", ")}`);
console.error(`线上资源：${lastRemoteAssets.length ? lastRemoteAssets.join(", ") : "未获取到"}`);
if (lastError) console.error(`最后错误：${lastError}`);
process.exit(1);