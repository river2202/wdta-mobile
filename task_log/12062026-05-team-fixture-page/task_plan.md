# Task Plan: Team Fixture 页面

## Goal

新页面 `/team/[section]/[team]` 替代 ladder 上指向 TROLS 的 fixture 链接：
顶部显示 team/club/competition/section；整季赛程按日期排列；已打的折叠显示结果（可展开详情）；
未打显示 TBD；下一场标 upcoming + Home/Away；Away 显示对手俱乐部地址/电话/导航按钮；
保留 WDTA 原始链接；打开自动滚动到 upcoming。

## Phases

| Phase | 名称 | 状态 |
|-------|------|------|
| 1 | 调研 fixture.php team 页结构（含 GPS 坐标）| complete |
| 2 | 解析器 lib/wdta/teamFixture.ts（venues+rounds+finals）+ 多 section 实测 | complete |
| 3 | DB：team_fixture_cache 表 + queries + migrate | complete |
| 4 | API：GET /api/teams/[section]/[team]/fixture（24h 缓存）| complete |
| 5 | 页面 + components/TeamFixture.tsx（合并已打结果、upcoming、导航、自动滚动）| complete |
| 6 | ResultsApp ladder 日历图标 → 内部 /team 链接 | complete |
| 7 | preview 验证（移动端截图 + 自动滚动）+ build | complete |
| 8 | 提交部署（待用户确认）| pending |

## 关键决策

- 单请求数据源（fixture.php which=2）：场地信息含 `pop_map(name,lat,lng)` GPS → 导航用经纬度
- 已打结果从 section_cache 按 round 号合并，展开复用 MatchDetailBody
- 页面渲染只读 DB；缓存 miss 由客户端 loader 调 API（与 results 页同模式）

## Encountered Errors

| 错误 | 尝试 | 解决 |
|------|------|------|
| 解析器选中最外层嵌套表格（venues 计数 19≠5、teamName 污染）| 1 | innermostTable：取含 marker 文本中最短的表 |
| finals 正则贪婪匹配（"wood FinalsPrelim Final"）| 1 | 限定已知决赛名（Grand/Semi/Prelim…）|
| lint react-hooks/purity：server 组件内 Date.now() | 1 | 移入 isCacheFresh 辅助函数 |
| .collapse-summary CSS 在球员页平铺改版时被误删 → 团队页折叠行显示默认 ▶ | 1 | 重新加回共享样式 |
