# 境内二级市场定期 Review 看板

一个用于**定期 review 境内二级市场（A 股 + 港股）**的轻量网页看板，医疗健康板块为重点跟踪对象。

覆盖内容：

1. **大盘指数** — A 股（上证 / 深成 / 创业板 / 沪深300 / 科创50 / 中证医疗）与港股（恒指 / 恒生科技 / 恒生医疗保健）
2. **分板块情况** — 全市场板块横向涨跌对比 + 医疗健康细分子板块（创新药 / CXO / 器械 / 互联网医疗等）
3. **在会 / 递表排队公司** — 以港股医疗递表企业为主
4. **市场热点** — 本期主线与题材
5. **二级市场可比公司表现** — 互联网医疗 / 医疗服务可比公司估值表（对标附录截图）

> 数据参考来源：瑞恩资本（港股 IPO 与递表跟踪）、东方财富 / 同花顺（A 股与板块行情）、Wind / 港交所披露易（在审公司与财务数据）。

## 快速开始

无需构建。两种打开方式：

```bash
# 方式一：本地静态服务器（推荐）
npm start          # 打开 http://localhost:5173

# 方式二：直接双击 index.html 在浏览器中打开（数据以 <script> 内联，file:// 亦可用）
```

## 更新一期 review 的数据

所有数据集中在 **`data/data.js`** 一个文件里，改这一个文件即可，页面代码无需改动。

- `meta` — 本期标题、review 期间、数据截至日期、参考来源
- `indices` — 大盘指数点位与涨跌幅
- `sectors.overview` / `sectors.healthcare` — 板块涨跌幅（医疗细分为人工整理）
- `ipoQueue` — 在会 / 递表排队公司（参考瑞恩资本 / 披露易更新）
- `hotspots` — 市场热点
- `comparables` — 可比公司估值表（单位：亿元人民币；`stats` 为汇总，留空则页面自动计算中位数/平均数）

### 自动刷新行情（可选）

在**能访问东方财富公开接口**的网络环境下，可自动刷新指数与全市场板块涨跌幅：

```bash
npm run refresh
```

脚本会就地更新 `data/data.js` 中带 `<<<AUTO:...>>>` 标记的 `indices` 与 `sectors.overview` 区块，并把 `asOf` 设为当天、`placeholder` 置为 `false`。

注意事项：

- 需 Node.js ≥ 18（使用内置 `fetch`）。
- 受限网络 / 代理环境接口可能返回 403，此时脚本会安全退出并提示改为手动填写。
- 接口返回的是**最新交易日**涨跌幅快照；若需严格的 review **区间累计涨跌幅**，请在 `data/data.js` 中手动覆盖 `change` 字段。
- `sectors.healthcare`、`ipoQueue`、`hotspots`、`comparables` 为人工整理，不会被脚本改动。

## 部署

纯静态站点，可直接部署到 GitHub Pages / 对象存储 / 任意静态托管：把仓库根目录作为站点根即可（入口 `index.html`）。

## 目录结构

```
index.html          # 页面结构
css/styles.css      # 样式
js/app.js           # 渲染逻辑（读取 window.DASHBOARD）
data/data.js        # ★ 唯一数据源，每期 review 编辑此文件
scripts/refresh.mjs # 行情自动抓取（东方财富接口）
scripts/serve.mjs   # 零依赖本地静态服务器
```

> 本页仅用于内部投研 review，数据供参考，不构成投资建议。
