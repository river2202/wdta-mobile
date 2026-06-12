# Progress Log

## Session: 2026-06-12 — Team Fixture 页面

### Phase 1: 调研

- **Status:** complete
- fixture.php?which=2 单请求返回：section 全部球队场地（地址/电话/联系人/**GPS 坐标**）+ 该队整季赛程（Rd/Date/Home/Away/Bye/No Play/Finals）
- 详见 findings.md

### Phase 2-7: 实现完成（2026-06-12，本地验证通过）

- 解析器 `lib/wdta/teamFixture.ts`：venues（地址/电话/联系人/GPS）+ rounds（含 Bye/No Play）+ finals
  - 实测 AA016（5 venues）/ AA019 Triples（8）/ WA002 MidWeek（6）全部精确
- DB：`team_fixture_cache` 表（migrate 已对生产库执行）
- API：`/api/teams/[section]/[team]/fixture`（24h 缓存，miss 时抓取）
- 页面 `/team/[section]/[team]`：服务端只读 DB；miss 用 TeamFixtureLoader（同 SectionLoader 模式）
- `components/TeamFixture.tsx`：
  - 头部 team/club 地址/competition/section + Original WDTA fixture 链接
  - 已打：折叠行（Rd/日期/对手/H-A/WIN-LOST/比分，+/- 展开 MatchDetailBody）
  - 未打 TBD + H/A；Bye/No Play 虚线行；Finals 列表
  - upcoming 高亮卡：AWAY 时场地卡（地址/Melway/Club 电话 tel:/联系人/Navigate=Google Maps GPS 导航）
  - 打开自动滚动到 upcoming（实测 scrollY=333/499）
- ResultsApp ladder 日历图标 → 内部 /team 链接（实测 5 个链接全内部，0 个 TROLS 残留）
- generateMetadata（team 名标题/canonical）
- typecheck / lint / build 全过；preview 移动端截图验证（含展开明细 rubbers）

### 下一步

- 等用户确认提交部署（DB 迁移已在生产库执行过，部署即生效）
