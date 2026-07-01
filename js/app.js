/* 渲染逻辑：读取 window.DASHBOARD 并填充页面。纯前端，无需构建。 */
(function () {
  "use strict";
  var D = window.DASHBOARD;
  if (!D) {
    document.body.innerHTML = '<p style="padding:40px;text-align:center">未找到数据（data/data.js 未加载）。</p>';
    return;
  }

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  // 涨跌方向类：A 股习惯红涨绿跌
  function dirClass(v) { return v > 0 ? "up" : v < 0 ? "down" : ""; }
  function fmtPct(v) { return (v > 0 ? "+" : "") + v.toFixed(2) + "%"; }
  function fmtNum(v) {
    if (v == null) return "-";
    return Number(v).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }

  // ---- 元信息 ----
  var m = D.meta || {};
  document.title = m.title || document.title;
  $("pageTitle").textContent = m.title || "";
  $("pageSubtitle").textContent = m.subtitle || "";
  $("periodChip").textContent = m.reviewPeriod || "";
  $("asOf").textContent = "数据截至 " + (m.asOf || "--");
  $("footerMeta").textContent =
    (m.reviewPeriod ? m.reviewPeriod + " · " : "") + (m.author || "");
  if (m.dataNote) {
    var banner = $("placeholderBanner");
    banner.querySelector(".wrap").textContent = m.dataNote;
    banner.classList.remove("hidden");
  }

  // ---- 一、大盘指数 ----
  function indexCard(it) {
    var hasChg = typeof it.change === "number";
    var d = hasChg ? dirClass(it.change) : "";
    var arrow = !hasChg ? "" : it.change > 0 ? "▲" : it.change < 0 ? "▼" : "—";
    var chg = hasChg ? (arrow + " " + fmtPct(it.change)) : "—";
    return el("div", "idx-card",
      '<div class="name">' + it.name + ' <span class="cell-code">' + (it.code || "") + '</span></div>' +
      '<div class="value">' + fmtNum(it.value) + '</div>' +
      '<div class="chg ' + d + '">' + chg + '</div>'
    );
  }
  (D.indices && D.indices.aShare || []).forEach(function (it) { $("aShareCards").appendChild(indexCard(it)); });
  (D.indices && D.indices.hkShare || []).forEach(function (it) { $("hkShareCards").appendChild(indexCard(it)); });

  // ---- 二、分板块 ----
  function maxAbs(list) {
    return list.reduce(function (mx, x) { return Math.max(mx, Math.abs(x.change)); }, 1);
  }
  function renderBars(containerId, list) {
    var box = $(containerId);
    var scale = maxAbs(list);
    list.forEach(function (s) {
      var pct = Math.min(Math.abs(s.change) / scale, 1) * 50; // 半宽 50%
      var pos = s.change >= 0;
      var fill = '<div class="bar-fill ' + (pos ? "pos" : "neg") + '" style="width:' + pct + '%"></div>';
      var row = el("div", "bar-row",
        '<div class="lbl">' + s.name + (s.note ? '<span class="n">' + s.note + '</span>' : (s.hot ? '<span class="n">领涨</span>' : '')) + '</div>' +
        '<div class="bar-track"><div class="bar-mid"></div>' + fill + '</div>' +
        '<div class="bar-val ' + dirClass(s.change) + '">' + fmtPct(s.change) + '</div>'
      );
      box.appendChild(row);
    });
  }
  renderBars("sectorOverview", (D.sectors && D.sectors.overview) || []);
  renderBars("sectorHealthcare", (D.sectors && D.sectors.healthcare) || []);

  // ---- 三、在会排队 ----
  var ipo = D.ipoQueue || {};
  // 港股 IPO 市场概览数据条
  if (ipo.market) {
    var mk = ipo.market, box = $("ipoMarket");
    var head = el("div", "stat-head",
      '<span class="stat-title">港股 IPO 市场概览 · ' + (mk.period || "") + "</span>" +
      (mk.source ? '<span class="muted small">来源：' + mk.source + "</span>" : ""));
    box.appendChild(head);
    var grid = el("div", "stat-grid");
    (mk.stats || []).forEach(function (s) {
      grid.appendChild(el("div", "stat-card",
        '<div class="stat-value">' + s.value + "</div>" +
        '<div class="stat-label">' + s.label + "</div>" +
        (s.sub ? '<div class="stat-sub">' + s.sub + "</div>" : "")));
    });
    box.appendChild(grid);
    if (mk.note) box.appendChild(el("p", "stat-note", mk.note));
  }
  $("ipoSummary").textContent = ipo.summary || "";
  (ipo.companies || []).forEach(function (c) {
    var tr = el("tr", null,
      "<td><strong>" + c.name + "</strong></td>" +
      '<td><span class="board-tag">' + (c.board || "-") + "</span></td>" +
      '<td><span class="status-tag st-' + (c.status || "") + '">' + (c.status || "-") + "</span></td>" +
      "<td>" + (c.sponsor || "-") + "</td>" +
      '<td class="num">' + (c.filedAt || "-") + "</td>" +
      "<td>" + (c.note || "") + "</td>"
    );
    $("ipoTable").appendChild(tr);
  });

  // 上半年医疗健康新股表
  if (ipo.newListingsMed) {
    var nm = ipo.newListingsMed, wrap = $("medNew");
    wrap.appendChild(el("div", "stat-head",
      '<span class="stat-title">' + (nm.title || "医疗健康新股") + "</span>" +
      (nm.source ? '<span class="muted small">' + nm.source + "</span>" : "")));
    var rows = (nm.items || []).map(function (c) {
      return "<tr>" +
        "<td><strong>" + c.name + "</strong>" + (c.code ? '<span class="cell-code"> ' + c.code + "</span>" : "") + "</td>" +
        "<td>" + (c.region || "-") + "</td>" +
        '<td class="num">' + (c.date || "-") + "</td>" +
        '<td class="num">' + (c.funds == null ? "-" : fmtNum(c.funds)) + "</td>" +
        "</tr>";
    }).join("");
    var tw = el("div", "table-wrap");
    tw.innerHTML =
      '<table class="data-table"><thead><tr>' +
      "<th>公司名称</th><th>地区</th><th class=\"num\">上市日期</th><th class=\"num\">募资(亿港元)</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    wrap.appendChild(tw);
    if (nm.note) wrap.appendChild(el("p", "stat-note", nm.note));
  }

  // ---- 四、市场热点 ----
  (D.hotspots || []).forEach(function (h) {
    var arrow = h.trend === "up" ? "↑" : h.trend === "down" ? "↓" : "";
    var card = el("div", "hotspot",
      '<div class="top">' +
        '<span class="tag tag-' + (h.tag || "") + '">' + (h.tag || "") + "</span>" +
        '<span class="trend ' + (h.trend || "") + '">' + arrow + "</span>" +
      "</div>" +
      "<h4>" + h.title + "</h4>" +
      "<p>" + (h.desc || "") + "</p>"
    );
    $("hotspotGrid").appendChild(card);
  });

  // ---- 五、可比公司 ----
  var cmp = D.comparables || {};
  if (cmp.unit) $("cmpUnit").textContent = "单位：" + cmp.unit;
  function numCell(v, note) {
    var s = fmtNum(v);
    var cls = typeof v === "number" && v < 0 ? "num down" : "num";
    return '<td class="' + cls + '">' + s + (note ? '<span class="cell-note">' + note + "</span>" : "") + "</td>";
  }
  (cmp.companies || []).forEach(function (c) {
    var tr = el("tr", null,
      "<td><strong>" + c.name + "</strong>" + (c.code ? '<span class="cell-code"> ' + c.code + "</span>" : "") + "</td>" +
      "<td>" + (c.listing || "-") + "</td>" +
      numCell(c.mktCap, c.mktCapNote) +
      numCell(c.revenue, c.revenueNote) +
      numCell(c.netProfit, c.netProfitNote) +
      numCell(c.ps, c.psNote) +
      numCell(c.pe, c.peNote)
    );
    $("comparablesTable").appendChild(tr);
  });
  // 汇总行：优先用手填 stats，否则由上表自动计算
  var stats = cmp.stats || computeStats(cmp.companies || []);
  if (stats) {
    var foot = $("comparablesFoot");
    foot.appendChild(el("tr", null,
      '<td colspan="5" class="num">中位数</td>' +
      '<td class="num">' + fmtNum(stats.median.ps) + "</td>" +
      '<td class="num">' + fmtNum(stats.median.pe) + "</td>"
    ));
    foot.appendChild(el("tr", null,
      '<td colspan="5" class="num">平均数</td>' +
      '<td class="num">' + fmtNum(stats.mean.ps) + "</td>" +
      '<td class="num">' + fmtNum(stats.mean.pe) + "</td>"
    ));
  }
  function computeStats(list) {
    function collect(key) {
      return list.map(function (c) { return c[key]; })
        .filter(function (v) { return typeof v === "number" && v > 0; });
    }
    function median(a) {
      if (!a.length) return null;
      var s = a.slice().sort(function (x, y) { return x - y; });
      var mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
    function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
    var ps = collect("ps"), pe = collect("pe");
    function r(v) { return v == null ? null : Math.round(v * 10) / 10; }
    return { median: { ps: r(median(ps)), pe: r(median(pe)) }, mean: { ps: r(mean(ps)), pe: r(mean(pe)) } };
  }

  // ---- 参考来源 ----
  (m.references || []).forEach(function (r) {
    $("refList").appendChild(el("li", null, "<strong>" + r.name + "</strong>" + (r.note ? " — " + r.note : "")));
  });
})();
