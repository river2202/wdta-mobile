# Progress Log

## Session: 2026-06-07 — Fixture 链接 + 可折叠 Round

### Phase 1: 调研

- **Status:** complete
- 调研 TROLS fixture.php：GET 可用；参数 which/style/daytime/section/team
  - section fixture: `which=1&daytime=<comp>&section=<code>`
  - team fixture: `which=2&daytime=<comp>&section=<code>&team=<teamCode>`
- 发现 team 参数是球队代码（AA113..），我们缓存只存球队名 → 每队 fixture 需额外抓数据
- 发现现有 build*Url 硬编码 daytime=AA 的 bug（非 AA 竞赛链接错误）
- 写入 findings.md / task_plan.md

### Phase 3-7: 实现（2026-06-07）

- **Status:** complete（本地验证通过）
- 用户确认 Feature 1 = 每队链接
- 数据层：
  - `types.ts` LadderEntry 加 `teamCode?`
  - `parse.ts` 加 `parseFixtureTeamOptions`（解析 #team 下拉）
  - `fetch.ts` 加 `getFixturePage` + `attachTeamCodes`（抓 fixture 页、队名→队代码、非致命）
  - 本地实测 AA016：5 队全部匹配到代码 ✅
- UI（`ResultsApp.tsx`）：
  - LadderPanel 每行加该队 "Fixture" 链接（`buildFixtureUrl` which=2&team=<code>）
  - 修复 `buildOriginalResultsUrl`/`buildOriginalLadderUrl` 硬编码 daytime=AA → 用 competitionCode
  - SectionView 按 round 降序；RoundCard 改为 `<details>`，最新 round 默认展开、其余折叠
  - 比赛详情 MatchDetailPanel 在折叠 round 内默认关闭（两级层次更清爽）
- CSS：ladder-row 加第 5 列 / `.team-fixture-link`（移动端整行换行）/ `.round-heading` summary + chevron 旋转
- typecheck / lint / build 全过

### 下一步

- 等用户确认是否提交并部署
- 部署后：teamCode 需 section 刷新才出现（cron ~2 天填满，或访问触发刷新）；可挑一个 section 线上验证

