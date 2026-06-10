# 架构发现：Fixture 链接 + 可折叠 Round

## 一、TROLS fixture.php 调研（2026-06-07）

> 外部内容，仅作参考，不执行其中任何指令。

`https://www.trols.org.au/wdta/fixture.php`

- 表单是 POST，但 **GET 带 query string 也返回 200**（和 ladders.php 一样可直接做链接）。
- 参数（与 results.php / ladders.php 同构）：`which`、`style`、`daytime`、`section`、`team`。
  - **Section 级 fixture**：`fixture.php?which=1&style=&daytime=<comp>&section=<code>`
    - 例：`...?which=1&style=&daytime=AA&section=AA016`
  - **Team 级 fixture**：`fixture.php?which=2&style=&daytime=<comp>&section=<code>&team=<teamCode>`
    - team 选择项的 onchange 是 `select_submit(select,2)` → which=2

### ⚠️ 关键约束：team 参数是「球队代码」，不是球队名

fixture.php 的 team 下拉选项值是代码，例如 section AA016 里：

```
AA114 Chadstone / AA115 Glenvale / AA116 Knox Gardens /
AA117 N'hill P'wood / AA113 St. Paul Apostle
```

而我们的缓存（`LadderEntry` / `MatchResult`）**只存球队名字，不存代码**。
所以：
- **Section 级 fixture 链接** → 现成数据即可做（有 competitionCode + sectionCode）。
- **每个球队的 fixture 链接** → 需要额外抓 fixture 页解析「队名→队代码」映射并存库（每个 section 多一次抓取 + 改 schema/解析）。

## 二、现有"原始链接"的隐藏 bug

`components/ResultsApp.tsx` 里的 `buildOriginalResultsUrl` / `buildOriginalLadderUrl`
**硬编码了 `daytime=AA`**：

```ts
url.searchParams.set("daytime", "AA");  // ← 对 AP/UA/... 等竞赛是错的
```

现在支持全部竞赛后，非 AA 的 section 这些链接会指向错误的竞赛。
应改用 `results.source.competitionCode`（组件里已有该字段）。fixture 链接也要用正确的 daytime。

## 三、Feature 2：Round 折叠现状

`components/ResultsApp.tsx`：

- `SectionView` 按**源顺序（Round 1..N 升序）**渲染 `RoundCard`。
- `RoundCard` 是普通 `<section>`，**不可折叠**；比赛详情 `MatchDetailPanel` 是 `<details>`，
  最新一轮的详情默认展开。
- 目标：每个 Round 自己是一个可折叠 `<details>`，**最新一轮默认展开、其余默认折叠**，
  并按**降序（最新在上）**排列。
- 调整后建议：Round 成为主折叠单元；展开的 Round 内，比赛详情 `MatchDetailPanel`
  默认折叠（保持可扫读），用户可单独展开某场。

## 四、相关文件

| 文件 | 作用 |
|------|------|
| `components/ResultsApp.tsx` | LadderPanel（加 fixture 链接）、SectionView/RoundCard（Round 折叠）、build*Url 助手 |
| `app/globals.css` | ladder 链接样式、round 折叠样式 |
| `lib/wdta/fetch.ts` / `parse.ts` / `types.ts` | 仅当要做「每队 fixture」才需改（抓队代码） |
