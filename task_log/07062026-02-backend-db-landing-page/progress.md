# Progress Log

## Session: 2026-06-05

### Phase 1: 代码分析与架构设计

- **Status:** complete
- **Started:** 2026-06-05
- **Actions taken:**
  - 阅读 README.md，了解整体架构和 MVP 范围
  - 阅读 app/page.tsx、components/ResultsApp.tsx、lib/wdta/fetch.ts、lib/wdta/parse.ts、lib/wdta/types.ts、scripts/refresh-wdta-results.ts、app/api/results/refresh/route.ts
  - 检查 data/wdta-results.json 的实际数据结构
  - 识别出核心硬编码问题：2 sections 限制、单一 competition code、标题硬编码
  - 设计 Landing page 方案：`/` 选择页 + `/results` 结果页，localStorage 记忆
  - 写入 findings.md（中文架构分析）和 task_plan.md（实现规划）

### Phase 2: 架构方向决策（2026-06-05）

- **Status:** complete
- **决策**：用户确认要支持所有 team，升级为后端数据库 + 云函数方案
- **选定技术栈**：
  - 数据库：Vercel Postgres（Neon）
  - 云函数：Next.js API Routes（已有框架，复用）
  - 定时刷新：Vercel Cron（替代 GitHub Actions）
  - 前端：不变（Next.js App Router + React）
- **关键变化**：
  - 删除 `data/wdta-results.json` 静态缓存
  - 删除 `scripts/refresh-wdta-results.ts`
  - 删除 `.github/workflows/refresh-results.yml`
  - 新增 DB schema、lib/db 层、多个 API routes
  - Landing page 从 API 获取 competition/section 列表（动态发现，不硬编码）
  - 结果页从 API 获取比赛数据（按需缓存到 DB）
- 详见 findings.md 第八节

### Phase 3–9: 完整实现（2026-06-05）

- **Status:** complete
- 安装 `@vercel/postgres` 依赖
- 新建 `lib/db/` 层（index.ts / queries.ts / schema.sql）
- 重构 `lib/wdta/fetch.ts`（移除硬编码，新增 fetchSingleSectionResults / fetchCompetitionOptions / fetchSectionOptions）
- `lib/wdta/parse.ts` 新增 `parseCompetitionOptions`
- 新建 5 个 API routes（competitions / sections / results / refresh / cron）
- 新建 `components/LandingPage.tsx`（competition + section 选择 UI）
- 改写 `app/page.tsx` 为 Landing page（cookie 有值自动 redirect，?change=1 显示选择器）
- 新建 `app/results/page.tsx`（DB 直接读取，自动 fetch 如果 stale）
- 新建 `app/results/loading.tsx`（Suspense loading skeleton）
- 更新 `components/ResultsApp.tsx`（动态标题、新 refresh endpoint、Change section 按钮）
- 新增 Landing page CSS 样式到 `globals.css`
- 新建 `vercel.json`（Cron 每日 20:00 UTC）
- 新建 `.env.example`（记录所需环境变量）
- 新建 `scripts/db-migrate.ts`（建表脚本）
- 删除旧文件：`scripts/refresh-wdta-results.ts`、`.github/workflows/refresh-results.yml`
- lint / typecheck / build 全部通过 ✅

### 下一步（Phase 3 开始）

1. 确认 Vercel Postgres 已在项目中配置（需要用户操作 Vercel Dashboard）
2. 新建 `lib/db/schema.sql` 和 `lib/db/index.ts`
3. 实现 `lib/db/queries.ts`（competition_index / section_index / section_cache 的 CRUD）
4. 实现 API routes（从简单的 competitions 开始）
5. 新建 Landing page 组件
6. 调整 results 页从 API 读取数据

### Session: 2026-06-07 — 修复死循环 + 抓取健壮性

- **修复 `/` ↔ `/results` 重定向死循环**：`/results` 加载失败不再跳回 `/`
- **`/results` 改为只读 DB**：渲染时绝不现抓 TROLS（杜绝渲染超时）
  - 缓存命中（fresh/stale）→ 直接渲染 ResultsApp
  - 未命中 → `components/SectionLoader.tsx`（客户端带 spinner 调 API 抓取）
- **抓取健壮性（`lib/wdta/fetch.ts`）**：加 8s 单请求超时、详情限并发(5)、单场失败不致命
- **Cron 分批错开（`app/api/cron/refresh-all`）**：每次刷最旧的一批(6)、section 间隔 1.5s、50s 墙钟预算、按陈旧度轮转；`maxDuration=60` Hobby 安全
- **出错页**：不再自动清 cookie，提供 Retry + 返回重选两个按钮
- `lib/db/queries.ts`：`getStaleSectionCodes` → `getStaleSections(maxAgeMs, limit)`（按陈旧度排序、带 competition_code）
- API 路由加 `maxDuration=60`（results / refresh）
- lint / typecheck / build 全部通过 ✅
