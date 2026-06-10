# Task Plan: Fixture 链接 + 可折叠 Round

## Goal

1. 在 Current ladder 面板加 fixture 链接，指向 TROLS fixture.php（带正确的 competition / section[/ team]）。
2. 比赛结果按 Round 折叠：每个 Round 单独可折叠，最新一轮默认展开、其余折叠。

## Current Phase

用户已确认：Feature 1 做**每个球队一个 fixture 链接**（需抓球队代码）

## Phases

| Phase | 名称 | 状态 |
|-------|------|------|
| 1 | 调研 fixture.php 参数 + 现状 | complete |
| 2 | 确认 Feature 1 范围 → 每队链接 | complete |
| 3 | 数据层：抓 fixture 队代码，LadderEntry 加 teamCode | complete |
| 4 | 修复 build*Url 硬编码 daytime=AA 的 bug | complete |
| 5 | Feature 1：ladder 每行加该队 fixture 链接 | complete |
| 6 | Feature 2：Round 折叠（最新展开/其余折叠/降序） | complete |
| 7 | typecheck / lint / build 验证 | complete（本地三项通过；线上视觉待确认）|
| 8 | 提交并部署 | pending（待用户）|

## 重要：teamCode 需要数据刷新才会出现

LadderEntry 新增了 `teamCode`，但**旧缓存里没有**。部署后：
- fixture 链接只在缓存含 teamCode 的 section 上显示
- cron 会在 ~2 天内刷新所有 section 填充 teamCode；或某 section 被访问触发按需/后台刷新即可立即出现
- 不需要 DB migration（JSONB，缺字段即视为无）

## Key Decisions

- fixture.php 可用 GET 链接（已验证 200）。
- build*Url 的 daytime 改用 `results.source.competitionCode`（修 bug）。
- **待定**：Feature 1 是 section 级单链接，还是每个 ladder 行一个该队的 fixture 链接。
  - section 级：零额外数据，立即可做。
  - 每队级：需抓 fixture 页解析「队名→队代码」并改 schema，工作量大。

## Encountered Errors

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| — | — | — |
