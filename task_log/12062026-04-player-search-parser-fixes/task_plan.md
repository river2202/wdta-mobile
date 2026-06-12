# Task Plan: 球员（Player）功能

## Goal

点击比赛名单里的球员名字，显示该球员的 team/club 以及历史比赛信息（从我们缓存的比赛名单聚合而来）。

## Current Phase

用户已确认：**独立页 `/player/[name]`** + **比赛列表**（日期/section/round/为哪队/对手/比分胜负）。开始实现。

## 关键约束（已调研确认）

- TROLS **无球员页/球员 ID** → 数据只能从我们缓存的 MatchDetails 名单聚合。
- 历史 = **当前赛季已抓取**的比赛；球员按**姓名**匹配（无 id）。
- 依赖刷新进度（cron ~2 天覆盖全部 section）。

## Phases

| Phase | 名称 | 状态 |
|-------|------|------|
| 1 | 调研源站 + 现有数据可行性 | complete |
| 2 | 确认 UX = 独立页 + 比赛列表 | complete |
| 3 | 数据层：player_appearance 表 + extractAppearances + 本地实测 | complete |
| 4 | saveSectionResults 包装，替换 3 处刷新写入点 | complete |
| 5 | 页面：app/player/[name]/page.tsx + PlayerProfile 组件 | complete |
| 6 | UI：ResultsApp 名单里球员名 → Link 到球员页 | complete |
| 7 | backfill 脚本：回填 4335 行 / 113 section（prod 库）| complete |
| 8 | typecheck / lint / build + dev 烟测 | complete |
| 9 | 提交并部署 | pending（待用户）|

## 遇到的错误

| 错误 | 解决 |
|------|------|
| `invalid input syntax for type integer: "1.5"` | WDTA 比分可为小数 → team_points/opp_points 由 INT 改 REAL（CREATE + ALTER），unnest cast 改 ::real[] |

## 实现要点

- 表 `player_appearance`：player_key(规整名)/player_label/team/competition_code/section_code/section_name/round/match_date/match_id/opponent/position/emergency/team_points/opp_points；PK (match_id, player_key, position)；index(player_key)。
- 写入：刷新某 section 时 `DELETE WHERE section_code` + 批量 unnest INSERT（一条语句，避免 N 次往返拖垮 cron）。
- 球员页服务端直接查库聚合（teams 去重 + matches 按日期降序），不单独做 API。
- 名字 URL 用 encodeURIComponent；查库用规整 key，展示用 label。

## Key Decisions

- 数据来源：自有缓存聚合（源站无球员数据）。
- 实现：新增 `player_appearance` 表，刷新 section 时 delete+insert（方案 A）。
- **待定（问用户）**：球员信息的展示方式（独立页 / 就地展开 / 弹层）；历史展示的详细程度。

## Encountered Errors

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| — | — | — |
