# Progress Log

## Session: 2026-06-10 — 球员（Player）功能

### Phase 1: 调研

- **Status:** complete
- 抓 match_popup.php：球员名是纯文本，**无链接/无 player id**
- 查全站导航 + clubs.php：**无 player 页**，TROLS 不暴露球员数据
- 结论：球员 team/club + 历史只能从我们缓存的 MatchDetails 名单聚合（已有 113 section 数据）
- 选定数据方案 A：新增 player_appearance 表，刷新时 delete+insert
- 写入 findings.md / task_plan.md

### Phase 2-8: 实现完成（2026-06-10）

- **Status:** complete（本地全部验证通过）
- UX 决策：独立页 `/player/[name]` + 比赛列表
- 数据层：
  - `lib/wdta/appearances.ts`：extractAppearances + normalizePlayerKey
  - `player_appearance` 表（PK match_id+player_key+position，index player_key/section_code）
  - `queries.ts`：replaceSectionAppearances（unnest 批量插入）/ getPlayerAppearances / saveSectionResults
  - 3 处刷新写入点（results/refresh/cron）改用 saveSectionResults
- 页面：`app/player/[name]/page.tsx`（服务端查库 + 聚合 teams/matches，日期降序）+ `components/PlayerProfile.tsx` + CSS
- UI：ResultsApp 名单球员名 → `<Link href="/player/...">`
- 脚本：`scripts/backfill-appearances.ts`（npm run db:backfill）
- **Bug 修复**：比分可为小数（1.5）→ points 列 INT 改 REAL（migrate ALTER + unnest ::real[]）
- 回填 prod 库：**4335 行 / 1365 名球员 / 113 section**（301 行含小数比分）
- dev 烟测：/player/Jenny%20Huang 返回 200，team/比赛/比分/胜负/降序都正确；无数据球员显示空状态
- typecheck / lint / build 全过

### 已部署（088632d）+ 线上验证通过

- /player/Jenny%20Huang 线上 200，数据正确；生产库 4335 行已就位

### Phase 9: 球员页改版（2026-06-10，本地完成）

- 需求：Match history 按 Team/Club 分组；复用 +/- 折叠；每场比赛可展开看 detail
- 抽共享组件 `components/MatchDetail.tsx`（MatchDetailBody/PlayerList/RubberRow，含 highlightKey 高亮当前球员），ResultsApp 改用它
- 球员页 `app/player/[name]/page.tsx`：按 team 分组；加载该球员所在 section 的 section_cache，按 matchId 给每场附上 MatchDetails
- `PlayerProfile` 重写为两级折叠：Team 分组 `<details>`（首个默认展开）→ 每场比赛 `<details>` → 展开显示 MatchDetailBody
- CSS：新增 `.collapse-summary`（共享 +/- 徽标）、team-group/match 折叠样式、`.is-highlight`
- typecheck / lint / build 通过；dev 烟测结构正确（team 分组 / 每场 detail 可展开 / 高亮）

### 已部署（多批，2026-06-10）

- f5192ec 球员搜索 + 球员页明细/高亮；60b9581 默认展开最近有结果轮 + 其明细
- 7f29d1d **解析 9 列格式**（Triples/Open Rubbers/Mid Week）

### Phase 10: 排查 53 个 section 解析失败 — 已修复并验证

- 根因：结果表两种列布局。S/D Rubbers=11 单元格(P/R/S/G)；Triples/Open Rubbers/Mid
  Week=9 单元格(P/S/G，无 Rubbers)。`parseMatchRow` 只认 ≥11 → 9 列行全 unknown。
- 修复：parseMatchRow 支持 11/9 两种(抽 parsePlayedRow)；parseTeamScore 带 cols；
  TeamScore.rubbers 可选；ResultsApp 无 rubbers 隐藏 R；stat-grid 自适应。
- 实测重解析 AA019=19/AP022=19/WA002=42 played；AA016 无回归。
- 部署 7f29d1d + 本地重刷 AA019/AP022/WA002 到生产库；**线上验证 AA019 显示比分 2-6、19 S/19 G、无 R** ✅
- 其余 ~50 个由 cron 1–2 天重刷（或全量本地重刷可立即生效）。
- 次要遗留：Mid Week 决赛轮表头 "Grand Final"/"Semi Final" 不被 parseRoundHeader 识别 → 决赛轮被丢弃，后续可单独处理。
