/*
 * ============================================================================
 *  境内二级市场 Review 数据文件（唯一数据源）
 * ============================================================================
 *
 *  每期 review 只需修改本文件即可，无需改动页面代码。
 *
 *  - 指数 / 板块 等行情数据：可手动填写，或运行 `npm run refresh` 用脚本自动抓取
 *    （抓取脚本需在能访问东方财富/新浪等公开接口的网络环境下运行）。
 *  - 排队公司 / 市场热点 / 可比公司：一般为人工整理，参考瑞恩资本/投行最前线/投资界等。
 *
 *  数值单位说明：
 *  - 指数：value=点位（收盘）；change=区间涨跌幅（%）
 *  - 可比公司市值/收入/净利润：亿元人民币
 *  - 未取得的点位填 null（页面显示「-」），可运行 refresh 自动补全。
 *
 *  本期口径：2026 上半年（截至 6/30 收盘）。指数 change 为「上半年累计涨跌幅」。
 * ============================================================================
 */
window.DASHBOARD = {
  // ---- 本期 review 元信息 ----------------------------------------------
  meta: {
    title: "境内二级市场定期 Review",
    subtitle: "A 股 + 港股 · 医疗健康板块重点跟踪",
    reviewPeriod: "2026 上半年（截至 6/30）",
    asOf: "2026-06-30", /* AUTO:asOf */
    author: "投研团队",
    placeholder: false, /* AUTO:placeholder */
    // 顶部说明条（中性提示，非报错）。留空字符串则不显示。
    dataNote:
      "本期口径为 2026 上半年（截至 6/30 收盘）：指数涨跌为上半年累计涨跌幅，「-」为暂未取得的点位/幅度，" +
      "可运行 `npm run refresh` 自动补全精确行情。板块概念幅度为区间方向性参考。",
    references: [
      { name: "同花顺 / 北京商报（A 股上半年收官）", note: "指数上半年涨跌幅" },
      { name: "21 财经 / 中国基金报", note: "沪深300、港股上半年表现" },
      { name: "投资界 pedaily / 医药魔方 / 动脉网", note: "港股医疗 IPO 排队与上市" },
      { name: "瑞恩资本 Ryanben Capital / 披露易", note: "港股 IPO 递表跟踪" },
    ],
  },

  // ---- 一、大盘指数 ----------------------------------------------------
  // change = 上半年累计涨跌幅（%）；value = 6/30 收盘点位（未取得填 null）。
  /* <<<AUTO:indices>>> 本块可由 `npm run refresh` 自动覆盖，勿删除标记 */
  indices: {
    aShare: [
      { code: "000001", name: "上证指数", value: 4094.4, change: 3.16 },
      { code: "399001", name: "深证成指", value: 16205.56, change: 19.82 },
      { code: "399006", name: "创业板指", value: 4342.71, change: 35.58 },
      { code: "000300", name: "沪深300", value: null, change: 7.55 },
      { code: "000688", name: "科创50", value: null, change: 64.0 },
    ],
    hkShare: [
      { code: "HSI", name: "恒生指数", value: 22900.07, change: -10.73 },
      { code: "HSTECH", name: "恒生科技指数", value: null, change: -18.92 },
      { code: "HSHCI", name: "恒生医疗保健", value: null, change: -17.95 },
    ],
  },
  /* <<<END:indices>>> */

  // ---- 二、分板块情况（医疗重点）-------------------------------------
  // 参考申万一级/二级行业。change = 区间涨跌幅（%），方向性参考。
  sectors: {
    // 全市场板块横向对比（正=领涨，负=领跌）——6 月方向
    /* <<<AUTO:sectors.overview>>> 本块可由 `npm run refresh` 覆盖，勿删除标记 */
    overview: [
      { name: "医药生物", change: 5.2, hot: true, note: "6 月领涨，仅 5 个行业月内收红" },
      { name: "国防军工", change: 2.6, note: "科技成长主线" },
      { name: "电子/半导体", change: 1.8, note: "芯片低位活跃" },
      { name: "银行", change: 1.15, note: "防御避险" },
      { name: "计算机", change: 0.9, note: "" },
      { name: "食品饮料", change: -0.8, note: "" },
      { name: "房地产", change: -2.4, note: "" },
      { name: "有色金属", change: -3.5, note: "高位周期兑现" },
      { name: "PCB/算力", change: -4.6, note: "拥挤交易回调" },
    ],
    /* <<<END:sectors.overview>>> */
    // 医疗健康细分子板块（本期重点）——6 月概念/子板块表现
    healthcare: [
      { name: "CXO（CRO/CDMO）", change: 7.65, note: "海外订单回暖、BD 承接" },
      { name: "GLP-1 / 减重", change: 7.44, note: "信达玛仕度肽 6/27 获批" },
      { name: "肿瘤治疗", change: 7.26, note: "创新药映射" },
      { name: "单抗 / 生物制品", change: 7.23, note: "" },
      { name: "创新药", change: 7.1, note: "出海 BD：Q1 对外授权超 600 亿美元" },
      { name: "医疗器械", change: 3.0, note: "创新器械获批提速" },
      { name: "中药", change: 1.2, note: "6 月随医药反弹" },
      { name: "互联网医疗", change: -1.5, note: "港股医疗 H1 承压（恒生医疗 -17.95%）" },
    ],
  },

  // ---- 三、在会 / 递表排队公司（港股医疗为主）------------------------
  // status: 递表 / 聆讯中 / 已通过聆讯 / 招股中 / 已上市；board: 主板 / 18A / 18C
  ipoQueue: {
    summary:
      "港股医疗 IPO 延续「大年」：据医药魔方/投资界等统计，截至 2026/6/17 港交所排队 IPO 的医疗保健企业约 91 家" +
      "（医药生物约 65、医疗器械与服务约 26），约占递表企业的三分之一；上半年已有约 10 家生物医药登陆港交所。" +
      "以下为部分在审/近期上市标的（在审名单更新建议用 `npm run scrape` 抓披露易/医药魔方等）。",
    companies: [
      // —— 在审（递表 / 聆讯）——
      { name: "和美药业-B", board: "18A", status: "递表", sponsor: "国投证券", filedAt: "2026-06-08", note: "自免/肿瘤生物药，第 3 次递表" },
      { name: "高光制药-B", board: "18A", status: "递表", sponsor: "中金/招银国际", filedAt: "2026-06-08", note: "自免/神经退行创新药，第 2 次递表" },
      { name: "真健康医疗-B", board: "18A", status: "已通过聆讯", sponsor: "中金/星展", filedAt: "2026-06-12", note: "未盈利创新医疗（18A）" },
      { name: "镁信健康", board: "主板", status: "递表", sponsor: "—", filedAt: "2026 更新", note: "医药多元支付平台（更新招股书）" },
      // —— 近期已上市（参考）——
      { name: "恒瑞医药", board: "主板", status: "已上市", sponsor: "摩根士丹利/花旗/华泰国际", filedAt: "2026-05-23", note: "A+H，医药龙头，首日 +25%" },
      { name: "派格生物医药", board: "18A", status: "已上市", sponsor: "—", filedAt: "2026-05-27", note: "GLP-1/代谢" },
      { name: "瑞博生物", board: "18A", status: "已上市", sponsor: "—", filedAt: "2026 H1", note: "小核酸/RNA 疗法" },
      { name: "精锋医疗", board: "主板", status: "已上市", sponsor: "—", filedAt: "2026 H1", note: "手术机器人" },
      { name: "卓正医疗", board: "主板", status: "已上市", sponsor: "—", filedAt: "2026 H1", note: "高端医疗服务/诊所" },
    ],
  },

  // ---- 四、市场热点 ----------------------------------------------------
  hotspots: [
    { title: "创新药出海（BD 授权）", tag: "医疗", desc: "2026Q1 中国创新药对外授权总额超 600 亿美元，双抗/ADC/小核酸领衔。", trend: "up" },
    { title: "GLP-1 减重赛道", tag: "医疗", desc: "信达玛仕度肽 6/27 国内获批；石药×阿斯利康 GLP-1/GIP 重磅交易。", trend: "up" },
    { title: "港股医疗 IPO 大年", tag: "医疗", desc: "约 127 家排队（港股约 92），上半年 10 家生物医药登陆港交所。", trend: "up" },
    { title: "双创 / 科技牛", tag: "科技", desc: "创业板 +35.58%、科创50 超 +64%，AI/半导体/机器人领涨。", trend: "up" },
    { title: "高位周期与算力兑现", tag: "科技", desc: "6 月有色/PCB/算力拥挤交易回调，全月仅 5 个行业收红。", trend: "down" },
    { title: "港股整体承压", tag: "政策", desc: "恒指 H1 -10.73%、恒生科技 -18.92%、恒生医疗 -17.95%，创新药结构性占优。", trend: "down" },
  ],

  // ---- 五、二级市场可比公司表现 --------------------------------------
  // 单位：亿元人民币。数据为附录截图提供的可比公司快照（口径见 note）。
  // listing: 港交所 / 港交所（申报中）。无 P/E 时填 null（页面显示「-」）。
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
