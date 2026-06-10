# 架构分析：WDTA Mobile Results

> 本文档为中文架构分析，记录当前系统设计及 Landing Page 功能的扩展方案。

---

## 一、当前架构总览

### 整体数据流

```
GitHub Actions（每日定时）
  → scripts/refresh-wdta-results.ts
    → lib/wdta/fetch.ts（POST TROLS 网站）
    → lib/wdta/parse.ts（Cheerio 解析 HTML）
    → data/wdta-results.json（写入 Git 仓库）
  → commit 触发 Vercel 重新部署
    → app/page.tsx（静态读取 JSON）
    → components/ResultsApp.tsx（客户端渲染）
```

**设计哲学**：GitHub 做持久缓存，Vercel 做静态分发。没有数据库，没有运行时存储。源站不可用时，上次提交的 JSON 仍然可以服务用户。

### 文件职责

| 文件 | 职责 |
|------|------|
| `lib/wdta/fetch.ts` | 向 TROLS 发 HTTP 请求，拼装 CachedResults |
| `lib/wdta/parse.ts` | Cheerio 解析：竞赛名、Section 列表、比赛结果、积分榜、比赛详情 |
| `lib/wdta/types.ts` | 所有 TypeScript 类型定义 |
| `scripts/refresh-wdta-results.ts` | 入口脚本，调用 fetch，写 JSON 文件 |
| `data/wdta-results.json` | 唯一持久缓存，提交至 Git |
| `app/page.tsx` | Next.js Server Component，读取 cookie 确定初始 section，渲染 ResultsApp |
| `components/ResultsApp.tsx` | 客户端主组件，包含 section tabs、积分榜、比赛卡片、刷新逻辑 |
| `app/api/results/refresh/route.ts` | 手动刷新 API，1 小时限流，内存 runtimeCache |

---

## 二、当前的硬编码局限

### 1. 两个 Section 固定写死

`lib/wdta/fetch.ts`（第 16-19 行）：
```ts
export const TARGET_SECTIONS: SectionTarget[] = [
  { label: "Girls S/D Rubbers Section 1", fallbackCode: "AA016" },
  { label: "Girls S/D Rubbers Section 2", fallbackCode: "AA017" },
];
```

整个 fetch 流程只会拉取这两个 section 的数据。其他 team（Section 3、Section 4 等）完全无法使用。

### 2. 刷新脚本断言恰好 2 个 Section

`scripts/refresh-wdta-results.ts`（第 10 行）：
```ts
if (results.sections.length !== 2) {
  throw new Error(`Expected 2 sections, parsed ${results.sections.length}`);
}
```

增加 sections 前必须先移除此断言。

### 3. Competition Code 固定为 `AA`（Saturday AM）

`lib/wdta/fetch.ts`（第 15 行）：
```ts
export const COMPETITION_CODE = "AA";
```

Saturday PM、Wednesday AM 等其他 competition 完全没有支持。当前 MVP 可接受，但架构设计上需为扩展留空间。

### 4. 结果页标题硬编码

`components/ResultsApp.tsx`（第 161 行）：
```tsx
<h1>Girls S/D Rubbers</h1>
```

同样只适用于 Girls S/D Rubbers 类别。

---

## 三、Landing Page 功能设计方案

### 用户旅程

```
首次访问 /
  → 无 localStorage 记录
  → 显示 Landing page
    → 选 Competition（单选下拉）
    → 选 Section（单选下拉，根据 competition 过滤）
    → 点击 Show
      → 写入 localStorage + cookie
      → 跳转到 /results?section=AA016

再次访问 /
  → 读取 localStorage 记录（competitionCode + sectionCode）
  → 直接跳转 /results?section=AA016（客户端跳转，Landing page 不闪现）
```

### 路由结构

```
/           → app/page.tsx（Landing page Server Component）
/results    → app/results/page.tsx（原 page.tsx 的内容移过来）
```

`/` 的 Server Component 依然读取 cookie，如果 cookie 里有合法的 section，直接 `redirect()` 到 `/results?section=XX`，避免客户端跳转闪烁。

Landing page 的客户端逻辑：在 `useEffect` 里读 localStorage，有记录则立刻跳转（兜底处理，cookie 不可用时）。

### 数据来源

Landing page 的选项来自缓存 JSON。不依赖运行时 TROLS 请求，保持纯静态分发。

- **Competition 列表**：从 `results.source.competitionName` + `results.source.competitionCode` 组装，MVP 只有一条（Saturday AM）
- **Section 列表**：`results.sections.map(s => ({code: s.sectionCode, name: s.sectionName}))`

Landing page 通过 props 接收这些选项（来自 Server Component 传入），而不是在客户端再次读取 JSON。

### 新组件：LandingPage.tsx

```tsx
// components/LandingPage.tsx
"use client"
export function LandingPage({
  competitions: CompetitionOption[],
  sections: SectionOption[],
}) {
  // state: selectedCompetition, selectedSection
  // useEffect: 读 localStorage，有记录则 router.push("/results?section=XX")
  // render: 两个下拉 + Show 按钮
  // onClick Show: 写 localStorage/cookie，router.push
}
```

---

## 四、数据层扩展方案

### MVP 方案：扩展 sections，不改 schema

**优点**：改动最小，现有 `ResultsApp` 不需要修改（已支持 N 个 section tab）

**步骤**：
1. 将 `TARGET_SECTIONS` 移至新文件 `lib/wdta/config.ts`，方便扩展
2. 在 `config.ts` 中加入所有已知 section：Section 1 到 Section N（可查询 TROLS 得知当前赛季有多少个 section）
3. 移除 `refresh-wdta-results.ts` 中的 `!== 2` 断言，改为 `=== 0` 判断
4. 重跑 `npm run refresh:data` 将新 sections 写入缓存
5. 更新 GitHub Actions 配置（无需改动 yml，只需确保 `TARGET_SECTIONS` 正确）

**数据大小估算**：当前 2 个 section 的 JSON 约 100KB，4 个 section 约 200KB，在 Git 仓库和 Vercel 静态分发的可接受范围内。

### 未来方案：多 Competition 支持（Phase 2+）

修改 schema 为：
```ts
type MultiCachedResults = {
  generatedAt: string;
  competitions: {
    code: string;
    name: string;
    resultsLoadedAt?: string;
    laddersLoadedAt?: string;
    sections: SectionResults[];
  }[];
}
```

Landing page 的 Competition 下拉有多条，Section 下拉根据选中的 Competition 过滤。

---

## 五、关键文件变更概览

### lib/wdta/config.ts（新建）

```ts
export const COMPETITION_CODE = "AA";
export const TARGET_SECTIONS: SectionTarget[] = [
  { label: "Girls S/D Rubbers Section 1", fallbackCode: "AA016" },
  { label: "Girls S/D Rubbers Section 2", fallbackCode: "AA017" },
  // 新增其他 sections...
];
```

### lib/wdta/fetch.ts（修改）

从 `config.ts` 导入 `COMPETITION_CODE` 和 `TARGET_SECTIONS`，移除本文件中的常量定义。

### scripts/refresh-wdta-results.ts（修改）

```ts
// 从 !== 2 改为 === 0
if (results.sections.length === 0) {
  throw new Error(`No sections parsed`);
}
```

### app/page.tsx（重写为 Landing page）

```ts
// Server Component
// 读 cookie，有合法 section → redirect("/results?section=XX")
// 否则 → 渲染 LandingPage，传入 competitions 和 sections 选项
```

### app/results/page.tsx（新建）

```ts
// Server Component（移入原 page.tsx 的逻辑）
// 读 cookie + searchParams → initialSectionCode
// 渲染 ResultsApp
```

### components/LandingPage.tsx（新建）

客户端组件，选择 UI + localStorage 逻辑。

### components/ResultsApp.tsx（小改）

- 移除硬编码的 `<h1>Girls S/D Rubbers</h1>`，改为从 section name 派生
- 添加「返回选择」链接（`href="/"`），让用户可以切换 team

---

## 六、localStorage / Cookie 存储策略

保持与现有代码一致，使用 `rememberBrowserValue` 双写：

```ts
// 存储 key：复用现有 "wdta-mobile-section"（只存 sectionCode 即可，因为 section code 已包含 competition 信息）
rememberBrowserValue("wdta-mobile-section", sectionCode); // e.g. "AA016"
```

Server Component 读取同名 cookie 直接 redirect，无需额外 key。

---

---

## 八、新架构方案：后端数据库 + 云函数

> 用户确认需要支持所有 team，原 GitHub-as-cache 静态方案改为动态后端方案。

### 为什么旧方案不够

| 限制 | 旧方案 | 新方案 |
|------|--------|--------|
| Section 数量 | 硬编码 2 个 | 动态发现，无限制 |
| Competition 数量 | 硬编码 1 个（Saturday AM） | 动态支持任意 |
| 数据更新 | GitHub Actions → commit → 触发部署 | Vercel Cron → 写 DB，无需重新部署 |
| 冷门 section | 预先缓存（浪费） | 按需缓存 |
| 数据大小 | 受 Git 仓库大小限制 | 受 DB 存储限制（Neon 免费 0.5GB+） |

---

### 新系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        TROLS 网站                                │
│  https://www.trols.org.au/wdta/                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST/GET（Cheerio 解析，现有 lib/wdta 代码复用）
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Vercel API Routes（云函数）                     │
│                                                                 │
│  GET  /api/competitions                  竞赛列表                │
│  GET  /api/competitions/:code/sections   section 列表            │
│  GET  /api/sections/:code/results        比赛结果（按需缓存）     │
│  POST /api/sections/:code/refresh        手动强制刷新（1h 限流）  │
│  GET  /api/cron/refresh-all              Vercel Cron 每日调用    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ SQL（@vercel/postgres / Neon）
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Postgres（Neon）                        │
│                                                                 │
│  competition_index 表：code, name, discovered_at                 │
│  section_index 表：code, name, competition_code, discovered_at   │
│  section_cache 表：section_code, results_json, generated_at      │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │ Vercel Cron（每日 08:00 AEST = 22:00 UTC 前一天）
         │ → 刷新所有已知 section 的缓存
         
┌─────────────────────────────────────────────────────────────────┐
│                       Next.js 前端                               │
│                                                                 │
│  /  (Landing page)                                              │
│    → 调用 /api/competitions                                      │
│    → 调用 /api/competitions/:code/sections                       │
│    → 用户选择 + 点 Show                                          │
│    → 写 localStorage + cookie → 跳转 /results                    │
│                                                                 │
│  /results (结果页)                                               │
│    → 调用 /api/sections/:code/results                            │
│    → 展示 ResultsApp                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 数据库 Schema（SQL）

```sql
-- 竞赛索引（Saturday AM、Saturday PM 等）
CREATE TABLE IF NOT EXISTS competition_index (
  code         TEXT PRIMARY KEY,       -- e.g. "AA"
  name         TEXT NOT NULL,          -- e.g. "Saturday AM - Winter 2026"
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Section 索引（每个竞赛下的组别）
CREATE TABLE IF NOT EXISTS section_index (
  code             TEXT PRIMARY KEY,   -- e.g. "AA016"
  name             TEXT NOT NULL,      -- e.g. "Girls S/D Rubbers Section 1"
  competition_code TEXT NOT NULL REFERENCES competition_index(code),
  discovered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 比赛结果缓存（每个 section 一行，JSONB 存完整结果）
CREATE TABLE IF NOT EXISTS section_cache (
  section_code  TEXT PRIMARY KEY REFERENCES section_index(code),
  results_json  JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL,
  refreshed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### API Routes 详细设计

#### `GET /api/competitions`
```
1. SELECT * FROM competition_index ORDER BY code
2. 如果为空 → 从 TROLS 获取所有 daytime 选项，写入 competition_index
3. 返回 [{code, name}]
```

#### `GET /api/competitions/[code]/sections`
```
1. SELECT * FROM section_index WHERE competition_code = $code
2. 如果为空 → POST TROLS results.php?daytime=$code，parseSectionOptions，写 section_index
3. 返回 [{code, name}]
```

#### `GET /api/sections/[code]/results`
```
1. SELECT results_json, generated_at FROM section_cache WHERE section_code = $code
2. 如果缓存存在且 generated_at 在 24h 内 → 直接返回 results_json
3. 否则 → 调用 fetchSectionResults($code)（复用现有 lib/wdta/fetch.ts 逻辑）
          → 解析结果
          → UPSERT into section_cache
          → 返回新结果
```

#### `POST /api/sections/[code]/refresh`
```
1. 检查 section_cache.refreshed_at，< 1h 则返回 429
2. 强制调用 fetchSectionResults，UPSERT，返回新结果
```

#### `GET /api/cron/refresh-all`（Vercel Cron 每日调用）
```
1. SELECT code FROM section_index（所有已知 section）
2. 并发（或串行）刷新每个 section
3. 记录刷新结果（成功/失败计数）
4. 返回摘要
```

---

### Vercel Cron 配置（vercel.json）

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-all",
      "schedule": "0 20 * * *"
    }
  ]
}
```

`20:00 UTC` ≈ 早上 6:00 AEST（非夏令时），比赛数据已更新。

---

### 动态 Section 发现逻辑

现有代码 `parseSectionOptions(html)` 已经能解析 TROLS 页面的所有 section 选项。

新架构的流程：
1. 首次访问 `/api/competitions/AA/sections` 时，POST TROLS 获取 competition AA 的所有 section 列表
2. 写入 `section_index` 表（不再硬编码 AA016/AA017）
3. 以后每次 Cron 刷新时，也可以重新发现新 section（防止赛季更替后 section code 变化）

这样完全不需要任何硬编码的 section 列表。

---

### 现有代码复用分析

| 模块 | 复用方式 |
|------|---------|
| `lib/wdta/parse.ts` | **完全保留**，解析逻辑不变 |
| `lib/wdta/fetch.ts` | **大部分保留**，移除 `TARGET_SECTIONS` 常量，新增 `fetchSectionResults(code)` 单 section 函数 |
| `lib/wdta/types.ts` | **保留**，`CachedResults` / `SectionResults` 类型不变 |
| `components/ResultsApp.tsx` | **小改**：数据通过 props 传入（来自 API 而非静态 JSON），动态标题，加返回按钮 |
| `app/api/results/refresh/route.ts` | **替换**为 `/api/sections/[code]/refresh/route.ts` |
| `data/wdta-results.json` | **删除** |
| `scripts/refresh-wdta-results.ts` | **删除** |
| `.github/workflows/refresh-results.yml` | **删除** |

---

### 包依赖变更

```bash
# 新增
npm install @vercel/postgres

# 可选（如果用 Drizzle ORM 替代原生 SQL）
npm install drizzle-orm
npm install -D drizzle-kit
```

---

### 备选方案：Vercel KV（Redis）

如果不需要 SQL 查询，KV 方案更简单：

```ts
// 存储结构
kv.set("competitions", [{code, name}])
kv.set("sections:AA", [{code, name}])
kv.set("results:AA016", {generatedAt, ...})  // 带 TTL: 86400s
```

**KV 方案缺点**：
- 无法高效查询「24h 内未刷新的 sections」（需要存额外的 sorted set）
- 未来加用户功能（收藏、推送）时需要迁移到 DB
- 数据结构不如 SQL 清晰

**Postgres 方案优点**：
- 结构化，可读性强
- 易于调试（可直接 SQL 查询）
- 为未来功能（用户偏好、通知）预留空间

**推荐：Vercel Postgres（Neon）**

---

## 七、实现风险与注意事项

1. **TROLS section codes 是否稳定？**  
   `AA016`、`AA017` 这类 code 理论上每赛季可能变化。现有代码已通过 `parseSectionOptions` 动态解析，只用 fallback code 兜底，是合理的。

2. **多 section 缓存大小**  
   每新增一个 section，JSON 增加约 50-80KB（含 match details）。10 个 section 约 500KB，仍在合理范围。

3. **首次 Landing page 体验**  
   家长第一次访问看到选择页，需要解释清楚"competition"是什么概念（对非网球圈家长可能不直观）。UI 文案可改为"选择你的组别（Competition）"和"选择你的分组（Section）"。

4. **返回/前进按钮行为**  
   从 `/results` 点返回 → 回到 `/`，因为 cookie 存在，会立即 redirect 回 `/results`。需要在 Landing page 提供明确的"更改选择"入口，而不是依赖浏览器后退。

5. **刷新脚本断言**  
   移除 `!== 2` 前，务必确认新的 sections 都能成功解析（跑一次 `npm run refresh:data` 验证）。
