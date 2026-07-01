/*
 * sources.config.js — 抓取来源登记表（用户编辑）。
 *
 * 抓取脚本不会「自动发现」公众号最新文章：微信公众号无公开列表接口、
 * 搜狗微信反爬严重，稳定做法是你把文章链接贴进来。
 *
 * 支持三种 type：
 *   - "article"  单篇文章（微信 mp.weixin.qq.com / 投资界 pedaily.cn / 医药魔方 / 瑞恩资本等）
 *   - "listing"  列表/专栏页：先抓取页面内的文章链接，再逐篇解析
 *                （linkPattern 用于筛选文章链接；微信公众号首页无法这样抓，请用 article）
 *   - "hkexnews" 港交所披露易「申請版本/新上市申请」结构化查询（权威、结构化）
 *
 * 提示：受限网络下部分站点可能 403，请在本地正常网络运行；抓到的公司名/热点为
 *      启发式候选，需人工核实（板块、保荐人、口径仍需对披露易/原文）。
 */
export default [
  // —— 港交所披露易：在审/递表结构化数据（最权威，建议保留）——
  {
    name: "港交所披露易-申請版本",
    type: "hkexnews",
    enabled: true,
    days: 45,           // 抓取最近 N 天的上市申请文件
    onlyHealthcare: true, // 仅保留疑似医疗健康公司（本看板聚焦医疗）
  },

  // —— 投资界 pedaily：IPO 频道（列表页，链接格式已确认可用）——
  // 文章链接形如 https://news.pedaily.cn/202603/561349.shtml
  {
    name: "投资界-IPO频道",
    type: "listing",
    enabled: true,
    url: "https://news.pedaily.cn/ipo/",
    linkPattern: "pedaily\\.cn/\\d{6}/\\d+\\.shtml",
    max: 12,
  },

  // —— 瑞恩资本 RyanBen Capital：港股 IPO 跟踪（WordPress 站）——
  // 首页/分类页列出最新文章。permalink 格式可能随站点设置变化，
  // 首次使用请核对 linkPattern（如无结果，改用 article 贴具体文章链接）。
  {
    name: "瑞恩资本-港股IPO",
    type: "listing",
    enabled: false,
    url: "https://www.ryanbencapital.com/",
    linkPattern: "ryanbencapital\\.com/\\d{4}/\\d{2}/\\d{2}/",
    max: 8,
  },

  // —— 医药魔方 ByDrug：定期发布「港股拟 IPO 药企」名单（结构化程度高）——
  // 贴该系列文章链接即可，脚本会抽取其中的公司名与状态候选。
  {
    name: "医药魔方-港股拟IPO药企名单",
    type: "article",
    enabled: false,
    urls: [
      // "https://bydrug.pharmcube.com/news/detail/XXXXXXXX",  // 如「33家港股拟IPO药企」
    ],
  },

  // —— 微信公众号文章（投行最前线 / 投资界 等）：贴具体推文链接 ——
  {
    name: "微信公众号-本期推文",
    type: "article",
    enabled: false,
    urls: [
      // "https://mp.weixin.qq.com/s/XXXXXXXXXXXXXXXX",  // 投行最前线某篇
      // "https://mp.weixin.qq.com/s/YYYYYYYYYYYYYYYY",  // 投资界某篇
    ],
  },
];
