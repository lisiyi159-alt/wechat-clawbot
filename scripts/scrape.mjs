#!/usr/bin/env node
/*
 * scrape.mjs — 从公众号文章 / 列表页 / 港交所披露易抓取素材，
 *              产出「待人工确认」的候选数据到 data/scraped.json，
 *              并打印可粘贴进 data/data.js 的 ipoQueue / hotspots 片段。
 *
 * 设计原则：公众号文本是定性素材，脚本不直接覆盖已发布的 data/data.js，
 *          而是先落到 review 文件，你确认后再誊抄，避免把未经核实的内容上线。
 *
 * 用法：node scripts/scrape.mjs   （或 npm run scrape）
 *      来源在 scripts/sources.config.js 中配置。
 * 需要：Node ≥ 18（内置 fetch）、可访问目标站点的网络（受限/代理下常见 403）。
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractArticle, extractCompanies, extractHotspots, stripHtml, decodeEntities } from "./lib/extract.mjs";
import SOURCES from "./sources.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "..", "data", "scraped.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";

async function get(url, { json = false } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9", Referer: new URL(url).origin },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return json ? r.json() : r.text();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((res) => setTimeout(res, attempt * 1500));
    }
  }
}

// ---- 适配器 --------------------------------------------------------------

async function fromArticle(url) {
  const html = await get(url);
  const art = extractArticle(html, url);
  return {
    ...art,
    companies: extractCompanies(art.text),
    hotspots: extractHotspots(art.text),
  };
}

async function fromListing(src) {
  const html = await get(src.url);
  const re = new RegExp(`https?://[^"'\\s]*${src.linkPattern}[^"'\\s]*`, "gi");
  const links = [...new Set((html.match(re) || []).map((u) => u.replace(/&amp;/g, "&")))].slice(0, src.max || 8);
  const arts = [];
  for (const link of links) {
    try { arts.push(await fromArticle(link)); }
    catch (e) { console.warn(`  · 跳过 ${link}：${e.message}`); }
  }
  return arts;
}

// 港交所披露易「上市申请文件」查询（title search servlet，返回 JSON）
async function fromHkexnews(src) {
  const to = new Date();
  const from = new Date(to.getTime() - (src.days || 45) * 864e5);
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const url =
    "https://www1.hkexnews.hk/search/titleSearchServlet.do?" +
    new URLSearchParams({
      sortDir: "0", sortByOptions: "DateTime", category: "0", market: "SEHK",
      stockId: "-1", documentType: "-1", fromDate: fmt(from), toDate: fmt(to),
      title: "", searchType: "0", t: "00000000", lang: "zh",
    }).toString();

  const raw = await get(url);
  // 返回体常为带 BOM/前缀的 JSON，result 字段是被转义的 JSON 字符串
  const obj = JSON.parse(raw.replace(/^[^{]*/, ""));
  let rows = obj.result;
  if (typeof rows === "string") rows = JSON.parse(decodeEntities(rows));

  const APPROVE = /申請版本|上市文件|聆訊後資料集|招股章程|配發結果|全球發售/;
  const companies = [];
  for (const r of rows || []) {
    const title = stripHtml(String(r.TITLE || r.NEWS_TITLE || ""));
    const name = decodeEntities(String(r.STOCK_NAME || r.LONG_TEXT || "").trim());
    if (!name) continue;
    if (src.onlyHealthcare && !/医疗|医药|生物|健康|制药|药|基因|细胞|器械|诊断|医学/.test(name)) continue;
    companies.push({
      name,
      status: /聆訊後|招股章程|全球發售/.test(title) ? "已通过聆讯" : "递表",
      filedAt: normDate(String(r.DATE_TIME || r.NEWS_DATE_TIME || "")),
      note: title.slice(0, 40),
      docType: (title.match(APPROVE) || [])[0] || "",
    });
  }
  // 去重（同名保留最新一条）
  const dedup = new Map();
  for (const c of companies) if (!dedup.has(c.name)) dedup.set(c.name, c);
  return [...dedup.values()];
}

function normDate(s) {
  const m = String(s).match(/(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

// ---- 汇总 ----------------------------------------------------------------

function aggregate(articles, hkexCompanies) {
  // 合并 IPO 候选：披露易（结构化，优先）+ 文章启发式
  const ipo = new Map();
  for (const c of hkexCompanies) ipo.set(c.name, { ...c, from: "披露易" });
  for (const a of articles)
    for (const c of a.companies)
      if (!ipo.has(c.name))
        ipo.set(c.name, { name: c.name, status: statusFromTrigger(c.trigger), filedAt: a.date || "", note: c.context, from: a.source || "文章" });

  // 合并热点：按主题累计命中
  const hot = new Map();
  for (const a of articles)
    for (const h of a.hotspots)
      hot.set(h.title, (hot.get(h.title) || 0) + h.count);
  const hotspots = [...hot.entries()].sort((x, y) => y[1] - x[1]).map(([title, count]) => ({ title, mentions: count }));

  return { ipoCandidates: [...ipo.values()], hotspotCandidates: hotspots };
}

function statusFromTrigger(t) {
  if (/聆讯|通过聆讯/.test(t)) return "已通过聆讯";
  if (/招股|挂牌/.test(t)) return "招股中";
  return "递表";
}

// ---- 主流程 --------------------------------------------------------------

(async () => {
  const articles = [];
  let hkexCompanies = [];
  const errors = [];

  for (const src of SOURCES.filter((s) => s.enabled !== false)) {
    process.stdout.write(`→ [${src.type}] ${src.name} … `);
    try {
      if (src.type === "article") {
        for (const u of src.urls || []) articles.push(await fromArticle(u));
        console.log(`${(src.urls || []).length} 篇`);
      } else if (src.type === "listing") {
        const arts = await fromListing(src);
        articles.push(...arts);
        console.log(`${arts.length} 篇`);
      } else if (src.type === "hkexnews") {
        hkexCompanies = await fromHkexnews(src);
        console.log(`${hkexCompanies.length} 家公司`);
      } else {
        console.log("未知类型，跳过");
      }
    } catch (e) {
      console.log(`失败：${e.message}`);
      errors.push(`${src.name}: ${e.message}`);
    }
  }

  const agg = aggregate(articles, hkexCompanies);
  const out = {
    scrapedAt: new Date().toISOString(),
    note: "候选数据，需人工核实后再誊抄进 data/data.js。",
    articles: articles.map((a) => ({ title: a.title, date: a.date, source: a.source, url: a.url, chars: a.text.length })),
    ...agg,
    errors,
  };
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");

  // 打印可粘贴片段
  console.log(`\n✓ 已写入 data/scraped.json（文章 ${articles.length} 篇，IPO 候选 ${agg.ipoCandidates.length} 家）`);
  if (agg.ipoCandidates.length) {
    console.log("\n—— 可粘贴到 data.js › ipoQueue.companies（请人工核实板块/保荐人）——");
    for (const c of agg.ipoCandidates.slice(0, 20))
      console.log(`  { name: "${c.name}", board: "主板", status: "${c.status}", sponsor: "", filedAt: "${c.filedAt}", note: "${(c.note || "").replace(/"/g, "'")}" },  // 来源:${c.from}`);
  }
  if (agg.hotspotCandidates.length) {
    console.log("\n—— 热点候选（按提及次数）——");
    for (const h of agg.hotspotCandidates) console.log(`  ${h.title}  (提及 ${h.mentions})`);
  }
  if (errors.length) console.log(`\n⚠️  ${errors.length} 个来源失败（受限网络下 403 常见，可改在本地网络运行）。`);
  if (!articles.length && !hkexCompanies.length)
    console.log("\n提示：所有来源均为空或未启用。请在 scripts/sources.config.js 中启用来源、粘贴公众号文章链接。");
})();
