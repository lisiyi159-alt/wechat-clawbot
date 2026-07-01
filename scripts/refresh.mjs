#!/usr/bin/env node
/*
 * refresh.mjs — 自动刷新 data/data.js 中的「大盘指数」与「板块」行情。
 *
 * 数据源：东方财富公开行情接口（push2.eastmoney.com）。
 * 需要能访问该接口的网络环境（受限网络/代理下可能 403，此时请手动填写 data.js）。
 *
 * 用法： node scripts/refresh.mjs   （或 npm run refresh）
 *
 * 说明：接口返回的是「最新一个交易日」的涨跌幅快照，作为 review 的即时参考；
 *      若需严格的 review 区间累计涨跌幅，请在 data/data.js 中手动覆盖 change 字段。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "data", "data.js");

// secid: 沪市指数=1.xxx，深市指数=0.xxx，港股指数=100.xxx
const A_INDICES = [
  { code: "000001", name: "上证指数", secid: "1.000001" },
  { code: "399001", name: "深证成指", secid: "0.399001" },
  { code: "399006", name: "创业板指", secid: "0.399006" },
  { code: "000300", name: "沪深300", secid: "1.000300" },
  { code: "000688", name: "科创50", secid: "1.000688" },
  { code: "399989", name: "中证医疗", secid: "0.399989" },
];
const HK_INDICES = [
  { code: "HSI", name: "恒生指数", secid: "100.HSI" },
  { code: "HSTECH", name: "恒生科技指数", secid: "100.HSTECH" },
  { code: "HSHCI", name: "恒生医疗保健", secid: "100.HSHCI" },
];

async function fetchIndex(it) {
  const url =
    `https://push2.eastmoney.com/api/qt/stock/get?fltt=2&invt=2&secid=${it.secid}` +
    `&fields=f43,f170`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${it.name}`);
  const j = await r.json();
  const d = j && j.data;
  if (!d || d.f43 == null) throw new Error(`空数据: ${it.name}`);
  return { code: it.code, name: it.name, value: Number(d.f43), change: Number(d.f170) };
}

async function fetchSectors() {
  // 申万/东财一级行业板块（m:90 t:2 = 行业板块），取涨跌幅前后各若干
  const url =
    "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=60&po=1&np=1&fltt=2&invt=2" +
    "&fid=f3&fs=m:90+t:2&fields=f12,f14,f3";
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for sectors`);
  const j = await r.json();
  const list = ((j.data && j.data.diff) || []).map((x) => ({ name: x.f14, change: Number(x.f3) }));
  if (!list.length) throw new Error("板块列表为空");
  // 取领涨前 6 + 领跌后 3，突出医药
  const top = list.slice(0, 6);
  const bottom = list.slice(-3);
  const merged = [...top, ...bottom];
  return merged.map((s) => ({
    name: s.name,
    change: s.change,
    ...(/医药|医疗/.test(s.name) ? { hot: true } : {}),
  }));
}

function indent(obj, pad = "      ") {
  return obj
    .map((o) => pad + JSON.stringify(o).replace(/"([a-zA-Z]+)":/g, "$1: ").replace(/,/g, ", "))
    .join(",\n");
}

function splice(src, startMark, endMark, replacement) {
  const s = src.indexOf(startMark);
  const e = src.indexOf(endMark);
  if (s === -1 || e === -1) throw new Error(`未找到标记 ${startMark} / ${endMark}`);
  const afterStart = src.indexOf("\n", s) + 1;
  return src.slice(0, afterStart) + replacement + "\n" + src.slice(e);
}

(async () => {
  console.log("→ 抓取指数与板块行情 (eastmoney)…");
  let aShare, hkShare, overview;
  try {
    aShare = await Promise.all(A_INDICES.map(fetchIndex));
    hkShare = await Promise.all(HK_INDICES.map(fetchIndex));
    overview = await fetchSectors();
  } catch (err) {
    console.error("✗ 抓取失败：" + err.message);
    console.error("  当前网络可能无法访问 eastmoney 接口（受限/代理环境常见）。");
    console.error("  请改为手动编辑 data/data.js 的 indices 与 sectors.overview。");
    process.exit(1);
  }

  let src = readFileSync(DATA_FILE, "utf8");

  const indicesBlock =
    "  indices: {\n" +
    "    aShare: [\n" + indent(aShare) + ",\n    ],\n" +
    "    hkShare: [\n" + indent(hkShare) + ",\n    ],\n" +
    "  },";
  src = splice(src, "/* <<<AUTO:indices>>>", "/* <<<END:indices>>> */", indicesBlock);

  const overviewBlock =
    "    overview: [\n" + indent(overview, "      ") + ",\n    ],";
  src = splice(src, "/* <<<AUTO:sectors.overview>>>", "/* <<<END:sectors.overview>>> */", overviewBlock);

  // 更新 asOf 与 placeholder
  const today = new Date().toISOString().slice(0, 10);
  src = src.replace(/asOf: "[^"]*", \/\* AUTO:asOf \*\//, `asOf: "${today}", /* AUTO:asOf */`);
  src = src.replace(/placeholder: (?:true|false), \/\* AUTO:placeholder \*\//, "placeholder: false, /* AUTO:placeholder */");

  writeFileSync(DATA_FILE, src, "utf8");
  console.log(`✓ 已更新 data/data.js（${aShare.length + hkShare.length} 个指数、${overview.length} 个板块，截至 ${today}）`);
  console.log("  提示：change 为最新交易日涨跌幅快照，如需 review 区间累计涨跌请手动调整。");
})();
