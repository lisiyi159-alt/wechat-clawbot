/*
 * extract.mjs — 纯函数：HTML 解析 + 文本信息抽取。
 * 无外部依赖、无网络，便于离线单测（见 scripts/test-extract.mjs）。
 */

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&nbsp;": " ", "&ldquo;": "“", "&rdquo;": "”", "&mdash;": "—", "&hellip;": "…",
};

export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m] || m);
}

/** 去掉 script/style/标签，压缩空白，得到纯文本。 */
export function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|br|li|h[1-6]|tr|section)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"));
  return m ? decodeEntities(m[1]).trim() : "";
}

/** 从一篇文章 HTML 中抽取 {title, date, source, text}。兼容微信公众号 / pedaily / 一般站点。 */
export function extractArticle(html, url = "") {
  const title =
    metaContent(html, "og:title") ||
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() ||
    "";

  // 发布日期：多种常见来源
  const date =
    metaContent(html, "article:published_time").slice(0, 10) ||
    (html.match(/var\s+(?:oriCreateTime|ct|publish_time)\s*=\s*["']?(\d{4}[-/]\d{1,2}[-/]\d{1,2})/) || [])[1] ||
    (html.match(/"(?:publish_time|dateline|pub(?:lish)?Date)"\s*:\s*"?(\d{4}[-/]\d{1,2}[-/]\d{1,2})/) || [])[1] ||
    (html.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/) || []).slice(1, 4).join("-").replace(/-$/, "") ||
    "";

  // 正文：优先微信 js_content，其次 article/正文容器，最后全文
  let body =
    (html.match(/<div[^>]+id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) || [])[1] ||
    (html.match(/<div[^>]+id=["']js_content["'][^>]*>([\s\S]*?)$/i) || [])[1] ||
    (html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || [])[1] ||
    (html.match(/<div[^>]+class=["'][^"']*(?:article|content|news-?text|main-?text)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) || [])[1] ||
    html;

  return {
    title: decodeEntities(stripTag(title)),
    date: normDate(date),
    source: hostOf(url),
    url,
    text: stripHtml(body),
  };
}

function stripTag(s) { return s.replace(/<[^>]+>/g, "").trim(); }
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\d?\./, ""); } catch { return ""; } }
function normDate(d) {
  if (!d) return "";
  const m = d.match(/(\d{4})[-/年]?(\d{1,2})[-/月]?(\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
}

// 公司名后缀（医疗/科技为主，兼顾通用）
const SUFFIX =
  "科技|生物|医疗|健康|医药|制药|药业|智能|机器人|基因|细胞|诊断|医学|器械|健康科技|数字|数科|集团|控股|股份|国际|医院";
// 触发上市语境的关键词
const IPO_TRIGGERS =
  /递表|递交|向港交所|港交所|联交所|上市申请|通过聆讯|聆讯|招股|挂牌|拟上市|冲击(?:港股|IPO)|IPO|主板|18A|18C|GEM/;
// 名称前常见的连接/助词，需从匹配结果剥离
const LEADING = /^[与和及暨为则也还但而这那各同其一二三四五六七八九十还含约据称：:，,、\s]+/;
// 已知/常见标的：名称不以标准后缀结尾（如「健康之路」），单独补充以提高召回
const KNOWN_NAMES = [
  "健康之路", "手回", "暖哇", "镁信", "圆心", "思派", "药师帮", "叮当", "健之佳",
  "美中嘉和", "脑动极光", "华昊中天", "晶泰", "一脉阳光", "讯飞医疗", "维昇药业",
];

/** 从正文抽取「疑似在审/递表公司」候选（启发式，需人工确认）。 */
export function extractCompanies(text) {
  const found = new Map(); // name -> {name, trigger, context}
  const nameRe = new RegExp(`[\\u4e00-\\u9fa5A-Za-z0-9]{2,10}?(?:${SUFFIX})`, "g");
  const knownRe = new RegExp(`(?:${KNOWN_NAMES.join("|")})(?:${SUFFIX})?`, "g");
  // 按句切分，只在含触发词的句子里找公司名
  const sentences = text.split(/[。！？；\n]/);
  const add = (raw, trig, ctx) => {
    const name = String(raw).replace(LEADING, "").trim();
    if (name.length < 2) return;
    if (/^(?:港交所|联交所|中国医疗|香港医疗|上市公司)$/.test(name)) return;
    if (!found.has(name)) found.set(name, { name, trigger: trig, context: ctx.slice(0, 60) });
  };
  for (const s of sentences) {
    const trig = s.match(IPO_TRIGGERS);
    if (!trig) continue;
    const ctx = s.trim();
    let m;
    while ((m = nameRe.exec(s)) !== null) add(m[0], trig[0], ctx);
    while ((m = knownRe.exec(s)) !== null) add(m[0], trig[0], ctx);
  }
  return [...found.values()];
}

// 市场热点词库（可扩充）
const HOTSPOT_LEXICON = {
  "创新药出海(BD授权)": /出海|license[- ]?out|BD授权|授权交易|首付款|里程碑付款/i,
  "AI医疗/互联网医疗": /AI\s?医疗|人工智能.{0,4}医疗|互联网医疗|医疗大模型|智慧医疗/i,
  "GLP-1减重": /GLP-?1|减重|减肥药|司美格鲁肽|替尔泊肽/i,
  "创新药": /创新药|Biotech|ADC|双抗|细胞治疗|基因治疗/i,
  "CXO": /CXO|CDMO|CRO|外包/i,
  "医疗器械/设备更新": /医疗器械|手术机器人|设备更新|以旧换新|高端影像/i,
  "集采/医保": /集采|带量采购|医保谈判|医保目录|DRG|DIP/i,
  "中药": /中药|中医药|中成药/i,
  "港股18A/18C": /18A|18C|未盈利.{0,4}上市|特专科技/i,
  "脑机接口": /脑机接口|BCI/i,
};

/** 统计正文命中的热点主题，按命中次数排序。 */
export function extractHotspots(text) {
  const hits = [];
  for (const [title, re] of Object.entries(HOTSPOT_LEXICON)) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const count = (text.match(g) || []).length;
    if (count > 0) hits.push({ title, count });
  }
  return hits.sort((a, b) => b.count - a.count);
}
