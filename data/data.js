/*
 * ============================================================================
 *  境内二级市场 Review 数据文件（唯一数据源）
 * ============================================================================
 *
 *  每期 review 只需修改本文件即可，无需改动页面代码。
 *
 *  - 指数 / 板块 等行情数据：可手动填写，或运行 `npm run refresh` 用脚本自动抓取
 *    （抓取脚本需在能访问东方财富/新浪等公开接口的网络环境下运行）。
 *  - 排队公司 / 市场热点 / 可比公司：一般为人工整理，参考瑞恩资本等公众号文章。
 *
 *  数值单位说明：
 *  - 指数：点位；涨跌幅：百分比（%）
 *  - 可比公司市值/收入/净利润：亿元人民币
 *
 *  placeholder=true 时，页面顶部会显示「示例数据待更新」提示。
 *  用 refresh 脚本刷新行情后会自动置为 false。
 * ============================================================================
 */
window.DASHBOARD = {
  // ---- 本期 review 元信息 ----------------------------------------------
  meta: {
    title: "境内二级市场定期 Review",
    subtitle: "A 股 + 港股 · 医疗健康板块重点跟踪",
    reviewPeriod: "2026 年 6 月",
    asOf: "2026-06-30", /* AUTO:asOf */
    author: "投研团队",
    placeholder: true, /* AUTO:placeholder */ // 行情为示例数据；运行 refresh 脚本后自动更新
    references: [
      { name: "瑞恩资本 Ryanben Capital", note: "港股 IPO 数据与递表跟踪" },
      { name: "东方财富 / 同花顺", note: "A 股与板块行情" },
      { name: "Wind / 港交所披露易", note: "在审公司与财务数据" },
    ],
  },

  // ---- 一、大盘指数 ----------------------------------------------------
  // change = 本期涨跌幅（%）；用于 review 期区间表现。
  /* <<<AUTO:indices>>> 本块可由 `npm run refresh` 自动覆盖，勿删除标记 */
  indices: {
    aShare: [
      { code: "000001", name: "上证指数", value: 3480.2, change: 2.15 },
      { code: "399001", name: "深证成指", value: 10520.6, change: 1.32 },
      { code: "399006", name: "创业板指", value: 2185.4, change: -0.85 },
      { code: "000300", name: "沪深300", value: 4025.8, change: 1.78 },
      { code: "000688", name: "科创50", value: 985.3, change: 3.42 },
      { code: "399989", name: "中证医疗", value: 6420.1, change: 4.65 },
    ],
    hkShare: [
      { code: "HSI", name: "恒生指数", value: 24150.0, change: 3.05 },
      { code: "HSTECH", name: "恒生科技指数", value: 5480.2, change: 4.10 },
      { code: "HSHCI", name: "恒生医疗保健", value: 3620.5, change: 6.20 },
    ],
  },
  /* <<<END:indices>>> */

  // ---- 二、分板块情况（医疗重点）-------------------------------------
  // 参考申万一级/二级行业。change = 本期涨跌幅（%）。
  sectors: {
    // 全市场板块横向对比（正=领涨，负=领跌）
    /* <<<AUTO:sectors.overview>>> 本块可由 `npm run refresh` 覆盖，勿删除标记 */
    overview: [
      { name: "医药生物", change: 5.8, hot: true },
      { name: "电子", change: 4.2 },
      { name: "计算机", change: 3.6 },
      { name: "国防军工", change: 3.1 },
      { name: "有色金属", change: 2.4 },
      { name: "银行", change: 0.9 },
      { name: "食品饮料", change: -0.6 },
      { name: "房地产", change: -2.3 },
      { name: "煤炭", change: -3.1 },
    ],
    /* <<<END:sectors.overview>>> */
    // 医疗健康细分子板块（本期重点）
    healthcare: [
      { name: "创新药", change: 8.9, note: "BD 出海授权持续催化" },
      { name: "CXO", change: 6.1, note: "海外订单回暖" },
      { name: "医疗器械", change: 4.3, note: "设备更新政策落地" },
      { name: "生物制品", change: 5.5, note: "" },
      { name: "医疗服务", change: 2.8, note: "" },
      { name: "中药", change: -1.2, note: "估值回调" },
      { name: "医药商业", change: 1.6, note: "" },
      { name: "互联网医疗", change: 7.4, note: "AI 医疗重估行情" },
    ],
  },

  // ---- 三、在会 / 递表排队公司（港股医疗为主）------------------------
  // status: 递表 / 聆讯中 / 已通过聆讯 / 招股中；board: 主板 / 18A / 18C
  ipoQueue: {
    summary:
      "截至本期，港交所有效期内上市申请中，医疗健康行业占比约三分之一，仍是递表主力。以下为部分重点跟踪标的（示例，请按瑞恩资本/披露易最新数据更新）。",
    companies: [
      { name: "示例·某创新药企 A", board: "18A", status: "聆讯中", sponsor: "中金公司", filedAt: "2026-04-18", note: "ADC 管线" },
      { name: "示例·某医疗器械 B", board: "主板", status: "递表", sponsor: "海通国际", filedAt: "2026-05-06", note: "手术机器人" },
      { name: "示例·某医疗 AI C", board: "18C", status: "递表", sponsor: "摩根士丹利", filedAt: "2026-05-22", note: "医学影像 AI" },
      { name: "健康之路", board: "主板", status: "递表", sponsor: "中信证券", filedAt: "2026-03-11", note: "互联网医疗平台" },
      { name: "示例·某 CXO D", board: "主板", status: "已通过聆讯", sponsor: "摩根大通", filedAt: "2026-02-28", note: "" },
    ],
  },

  // ---- 四、市场热点 ----------------------------------------------------
  hotspots: [
    { title: "创新药出海（BD 授权）", tag: "医疗", desc: "多笔 license-out 首付款+里程碑刷新纪录，驱动 Biotech 估值重估。", trend: "up" },
    { title: "AI 医疗 / 互联网医疗重估", tag: "医疗", desc: "阿里健康等放量大涨，AI 医疗概念接棒行情。", trend: "up" },
    { title: "GLP-1 减重赛道", tag: "医疗", desc: "国产减重药获批与放量预期升温。", trend: "up" },
    { title: "医疗设备更新政策", tag: "政策", desc: "以旧换新与专项资金落地，利好高端器械。", trend: "up" },
    { title: "科技成长（半导体/算力）", tag: "科技", desc: "国产替代与算力需求延续主线。", trend: "up" },
    { title: "中药板块回调", tag: "医疗", desc: "前期涨幅兑现，估值阶段性回落。", trend: "down" },
  ],

  // ---- 五、二级市场可比公司表现 --------------------------------------
  // 单位：亿元人民币。listing: 港交所 / 港交所（申报中）。
  // note 字段用于标注口径（如「最后一轮」「2025E 年化」等）。
  // 无 P/E 时填 null（页面显示「-」）。
  comparables: {
    unit: "亿元人民币",
    columns: ["市值(TTM)", "收入(TTM)", "净利润(TTM)", "P/S", "P/E"],
    companies: [
      { name: "京东健康", code: "06618.HK", listing: "港交所", mktCap: 1174, revenue: 752, netProfit: 55, ps: 1.56, pe: 21.26 },
      { name: "阿里健康", code: "00241.HK", listing: "港交所", mktCap: 556, revenue: 358, netProfit: 20, ps: 1.55, pe: 27.53 },
      { name: "平安好医生", code: "01833.HK", listing: "港交所", mktCap: 180, revenue: 56, netProfit: 3.9, ps: 3.21, pe: 45.88 },
      { name: "思派健康", code: "00314.HK", listing: "港交所", mktCap: 9.8, revenue: 21.2, netProfit: -1.3, ps: 0.47, pe: null },
      { name: "轻松健康", code: "02661.HK", listing: "港交所", mktCap: 45.8, revenue: 12.9, netProfit: -3.8, ps: 3.56, pe: null },
      { name: "手回科技", code: "02621.HK", listing: "港交所", mktCap: 6.6, revenue: 15.0, netProfit: 8.1, ps: 0.44, pe: 0.81 },
      { name: "镁信科技", code: "", listing: "港交所（申报中）", mktCap: 117, mktCapNote: "最后一轮", revenue: 22.5, revenueNote: "2025E 年化", netProfit: -3.9, netProfitNote: "2025 前 10 个月", ps: 5.2, pe: null },
      { name: "圆心科技", code: "", listing: "港交所（申报中）", mktCap: 275, mktCapNote: "最后一轮", revenue: 103.8, revenueNote: "2025", netProfit: -4.0, netProfitNote: "2025", ps: 2.65, pe: null },
      { name: "暖哇科技", code: "", listing: "港交所（申报中）", mktCap: 35, mktCapNote: "最后一轮", revenue: 10.2, revenueNote: "2025", netProfit: 0.6, netProfitNote: "2025, 经调整", ps: 3.42, pe: 57.8 },
    ],
    // 汇总（可手动填写，或由页面按上表估值倍数自动计算）
    stats: {
      median: { ps: 2.7, pe: 36.7 },
      mean: { ps: 2.5, pe: 38.1 },
    },
  },
};
