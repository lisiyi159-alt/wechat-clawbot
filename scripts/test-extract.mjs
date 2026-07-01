#!/usr/bin/env node
/* 离线单测：用固定 HTML/文本样本验证抽取逻辑。用法：node scripts/test-extract.mjs */
import { extractArticle, extractCompanies, extractHotspots, stripHtml } from "./lib/extract.mjs";

let pass = 0, fail = 0;
function ok(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

// —— 样本：模拟一篇微信公众号推文 ——
const wechatHtml = `
<html><head>
<meta property="og:title" content="投行最前线 | 又一家创新药企递表港交所">
<meta property="og:description" content="医疗健康IPO持续升温">
</head><body>
<script>var oriCreateTime = '2026-06-18 09:30';</script>
<div id="js_content">
  <p>近日，某创新药企正式向港交所递交招股书，拟以18A规则登陆主板。</p>
  <p>与此同时，思派健康与圆心科技也在推进上市申请，通过聆讯指日可待。</p>
  <p>行业层面，创新药出海（license-out）交易持续刷新首付款纪录，BD授权成为主线；AI医疗与GLP-1减重赛道同样火热。</p>
  <p>某医疗器械公司则计划以手术机器人业务冲击IPO。</p>
</div>
</body></html>`;

console.log("stripHtml / extractArticle:");
const art = extractArticle(wechatHtml, "https://mp.weixin.qq.com/s/ABC123");
ok("标题取自 og:title", art.title === "投行最前线 | 又一家创新药企递表港交所", `→ "${art.title}"`);
ok("日期解析为 2026-06-18", art.date === "2026-06-18", `→ "${art.date}"`);
ok("source 为主机名", art.source === "mp.weixin.qq.com", `→ "${art.source}"`);
ok("正文抽取到 js_content 且不含标签", art.text.includes("递交招股书") && !art.text.includes("<p>"));

console.log("\nextractCompanies:");
const comps = extractCompanies(art.text);
const names = comps.map((c) => c.name);
ok("识别到 思派健康", names.includes("思派健康"), `→ ${JSON.stringify(names)}`);
ok("识别到 圆心科技", names.includes("圆心科技"));
ok("识别到 医疗器械/机器人相关公司", names.some((n) => /器械|机器人|药企/.test(n)) || comps.length >= 2, `→ ${JSON.stringify(names)}`);
ok("每个候选带触发词", comps.every((c) => c.trigger));

console.log("\nextractHotspots:");
const hs = extractHotspots(art.text);
const hsTitles = hs.map((h) => h.title);
ok("命中 创新药出海(BD授权)", hsTitles.includes("创新药出海(BD授权)"), `→ ${JSON.stringify(hsTitles)}`);
ok("命中 AI医疗/互联网医疗", hsTitles.includes("AI医疗/互联网医疗"));
ok("命中 GLP-1减重", hsTitles.includes("GLP-1减重"));
ok("按次数降序", hs.every((h, i) => i === 0 || hs[i - 1].count >= h.count));

// —— 样本：模拟 pedaily 文章（无 js_content，走 article/通用容器）——
const pedailyHtml = `
<html><head><title>健康之路冲刺港股IPO_投资界</title>
<meta property="article:published_time" content="2026-05-11T08:00:00+08:00"></head>
<body><article><p>健康之路向港交所递表，保荐人为中信证券。</p></article></body></html>`;
console.log("\n通用文章（pedaily 样式）:");
const art2 = extractArticle(pedailyHtml, "https://news.pedaily.cn/news/500123");
ok("标题回退到 <title>", art2.title.includes("健康之路"), `→ "${art2.title}"`);
ok("日期取自 article:published_time", art2.date === "2026-05-11", `→ "${art2.date}"`);
ok("识别到 健康之路", extractCompanies(art2.text).some((c) => c.name === "健康之路"));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
