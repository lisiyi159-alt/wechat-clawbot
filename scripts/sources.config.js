/*
 * sources.config.js — 抓取来源登记表（用户编辑）。
 *
 * 抓取脚本不会「自动发现」公众号最新文章：微信公众号无公开列表接口、
 * 搜狗微信反爬严重，稳定做法是你把文章链接贴进来。
 *
 * 支持三种 type：
 *   - "article"  单篇文章（微信 mp.weixin.qq.com / 投资界 pedaily.cn / 瑞恩资本等）
 *   - "listing"  列表/专栏页：先抓取页面内的文章链接，再逐篇解析
 *                （linkPattern 用于筛选文章链接；微信公众号首页无法这样抓，请用 article）
 *   - "hkexnews" 港交所披露易「申請版本/新上市申请」结构化查询（权威、结构化）
 *
 * 提示：投行最前线、投资界等公众号文章 → 用 type:"article"，把每期要 review 的推文链接贴进 urls。
 */
export default [
  // —— 港交所披露易：在审/递表结构化数据（最权威，建议保留）——
  {
    name: "港交所披露易-申請版本",
    type: "hkexnews",
    enabled: true,
    days: 45,          // 抓取最近 N 天的上市申请文件
    onlyHealthcare: false, // true 则仅保留疑似医疗健康公司
  },

  // —— 瑞恩资本官网（港股 IPO 递表跟踪，列表页示例）——
  {
    name: "瑞恩资本-港股IPO",
    type: "listing",
    enabled: false, // 打开前请确认列表页 URL 与链接规则
    url: "https://www.ryanbencapital.com/category/hkipo/",
    linkPattern: "ryanbencapital\\.com/\\d{4}/\\d{2}/",
    max: 8,
  },

  // —— 投资界 pedaily（列表页示例）——
  {
    name: "投资界-IPO频道",
    type: "listing",
    enabled: false,
    url: "https://news.pedaily.cn/ipo/",
    linkPattern: "pedaily\\.cn/news/\\d+",
    max: 10,
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
