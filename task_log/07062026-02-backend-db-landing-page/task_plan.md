# Task Plan: Landing Page + 后端数据库 + 全 Team 支持

## Goal

把 GitHub-as-cache 静态架构升级为「后端数据库 + Vercel 云函数」动态架构。
任意 competition / section 的比赛结果按需缓存到数据库，Landing page 让家长选择并记住自己的 team，下次直接进入结果页。

## Current Phase

Phase 2 — 架构决策已定，准备开始实现

## Architecture Decision

**后端**：Vercel Postgres（Neon）+ Vercel Cron  
**理由**：
- 结构化 schema，未来扩展更清晰（用户收藏、推送通知等）
- JSONB 列存比赛结果，灵活又可查询
- 可以高效查询「哪些 section 超过 24h 未刷新」
- Neon 免费套餐足够当前规模

## Phases

| Phase | 名称 | 状态 |
|-------|------|------|
| 1 | 代码分析与架构设计 | complete |
| 2 | 架构决策：后端 DB + 云函数 | complete |
| 3 | 数据库 schema + lib/db 层 | pending |
| 4 | API 路由（云函数）实现 | pending |
| 5 | Vercel Cron 配置（vercel.json） | pending |
| 6 | Landing page 组件 | pending |
| 7 | 结果页改为从 API 读取（删除静态 JSON） | pending |
| 8 | 删除旧架构（GitHub Actions workflow、data/ 静态文件） | pending |
| 9 | typecheck / lint / build 验证 | pending |

## Key Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 后端存储 | Vercel Postgres (Neon) | 结构化、可查询、免费套餐够用 |
| 云函数 | Next.js API Routes（已有） | 无需额外平台 |
| 定时刷新 | Vercel Cron（vercel.json） | 替代 GitHub Actions，刷新 DB 而非 commit |
| Section 发现 | 动态从 TROLS 解析，不再硬编码 | 支持任意 competition 的所有 sections |
| 结果获取 | 按需缓存（首次请求时拉取，之后 DB 返回） | 不预缓存冷门 section |
| 选择记忆 | localStorage + cookie 双写（复用现有逻辑） | 与现有代码一致 |
| 路由 | `/` Landing page，`/results` 结果页 | 清晰分离 |

## New File Map

```
删除：
  data/wdta-results.json
  scripts/refresh-wdta-results.ts
  .github/workflows/refresh-results.yml

新建：
  lib/db/index.ts                         DB 连接（@vercel/postgres）
  lib/db/schema.sql                       建表 SQL
  lib/db/queries.ts                       DB 读写函数
  app/api/competitions/route.ts           GET 返回所有 competition
  app/api/competitions/[code]/sections/route.ts  GET 返回 competition 的所有 section
  app/api/sections/[code]/results/route.ts       GET 返回 section 结果（按需刷新）
  app/api/sections/[code]/refresh/route.ts       POST 强制刷新（1h 限流）
  app/api/cron/refresh-all/route.ts              Vercel Cron 每日刷新所有 section
  app/results/page.tsx                    结果页（从 API 读）
  components/LandingPage.tsx              选择 Competition + Section

修改：
  app/page.tsx                            改为 Landing page（读 cookie → redirect 或显示选择）
  app/api/results/refresh/route.ts        重构为 /api/sections/[code]/refresh
  components/ResultsApp.tsx              从 API 获取数据，动态标题，加返回按钮
  lib/wdta/fetch.ts                       移除硬编码 TARGET_SECTIONS 和 COMPETITION_CODE
  vercel.json                            新建/更新，添加 cron 配置
  package.json                           添加 @vercel/postgres 依赖
```

## Encountered Errors

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| — | — | — |
