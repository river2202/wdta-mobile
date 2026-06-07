# 数据抓取与刷新

说明 WDTA 赛果如何从 TROLS 源站进入应用，以及如何在 **Vercel + Neon（免费档）** 上
部署每日刷新。

---

## 1. 总览

应用从不在浏览器里直接连数据库，也从不在页面渲染时抓取 TROLS。数据流经三层：

```
TROLS (trols.org.au/wdta)
  │  fetch + parse（lib/wdta/*）
  ▼
Neon Postgres  ──只读──►  Next.js 页面（/ , /results）
  ▲
  │  写入只发生在服务端代码里：
  ├─ 按需   ：GET /api/sections/[code]/results   （首次访问某 section）
  ├─ 后台   ：GET /api/sections/[code]/refresh   （缓存 > 2h 时客户端触发）
  └─ 定时   ：GET /api/cron/refresh-all          （Vercel Cron，每日，分批）
```

`/results` 是**只读** DB 查询，因此永远不会超时。所有 TROLS 抓取都发生在 API 路由
（有各自的时间预算）或 cron 里，绝不在页面渲染路径上。

---

## 2. 抓取逻辑（`lib/wdta`）

### 源端点


| 用途         | 请求                                                               |
| ---------- | ---------------------------------------------------------------- |
| 竞赛列表       | `GET results.php` → 解析 `#daytime` 选项                             |
| section 列表 | `POST results.php` `which=0&daytime=<comp>` → 解析 `#section` 选项   |
| section 赛果 | `POST results.php` `which=1&daytime=<comp>&section=<code>` → 赛果表 |
| 积分榜        | `GET ladders.php?which=1&daytime=<comp>&section=<code>`          |
| 比赛详情       | `GET match_popup.php?matchid=<id>`（每场已打的比赛一次）                    |


解析用 Cheerio，在 `lib/wdta/parse.ts`。数据结构定义在 `lib/wdta/types.ts`
（`CachedResults` → `SectionResults` → `RoundResult` → `MatchResult` + `LadderEntry`）。

### 关键函数（`lib/wdta/fetch.ts`）

- `fetchCompetitionOptions()` — 发现所有 competition。
- `fetchSectionOptions(competitionCode)` — 发现某 competition 下的所有 section。
- `fetchSingleSectionResults(competitionCode, sectionCode)` — 核心：抓取竞赛元信息、
section 赛果表、积分榜，再抓每一场已打比赛的详情弹窗，返回单 section 的 `CachedResults`。

### 健壮性（为什么不会超时 / 被限流）

以下保障都在 `lib/wdta/fetch.ts`：


| 保障      | 取值                        | 原因                                                     |
| ------- | ------------------------- | ------------------------------------------------------ |
| 单请求超时   | `FETCH_TIMEOUT_MS = 8000` | 单个慢响应不会拖垮整个任务（`fetchWithTimeout` 用 `AbortController`）。 |
| 详情并发上限  | `DETAIL_CONCURRENCY = 5`  | 一次抓 5 个弹窗——既快又不至于压垮源站（`mapWithConcurrency`）。           |
| 单场失败不致命 | —                         | 单个坏弹窗会被跳过；比分仍能从赛果表显示。                                  |


一个 section 通常有 20–45 个比赛弹窗；并发 5 + 8s 上限下，单 section 几秒内即可刷新完。

---

## 3. 三层新鲜度


| 层   | 触发                      | 端点                                 | 新鲜度规则                |
| --- | ----------------------- | ---------------------------------- | -------------------- |
| 按需  | 首次访问未缓存的 section        | `GET /api/sections/[code]/results` | 缓存 < 24h 直接用，否则抓取并写库 |
| 后台  | `ResultsApp` 打开时缓存 > 2h | `GET /api/sections/[code]/refresh` | 服务端 1h 限流            |
| 定时  | Vercel Cron 每日          | `GET /api/cron/refresh-all`        | 刷新陈旧 > 12h 的 section |


由于用户自己的访问会让他们看的 section 保持新鲜（按需 + 2h 后台刷新），cron 只需把
其余的 section 保温即可。WDTA 赛果每周才更新（周六打完后），每天刷新已绰绰有余。

---

## 4. Cron：并行 + 时间预算

`app/api/cron/refresh-all/route.ts`

```
maxDuration        = 60     # Hobby 安全的函数上限（秒）
STALE_AFTER_MS     = 18h    # 缓存比这更旧的 section 才会被刷新
PER_RUN_CAP        = 80     # 单次 run 最多尝试的 section 数（通常时间预算先触顶）
SECTION_CONCURRENCY = 3     # 并行刷新的 section 数；每个 section 内部详情并发 5
                            #   → 峰值 TROLS 请求 ≈ 3 × 5 = 15
TIME_BUDGET_MS     = 50s    # 超过此墙钟预算就不再开新 section，剩下的留到下次
```

每次 run：

1. 校验请求来源（见 §6）。
2. `getStaleSections(STALE_AFTER_MS, PER_RUN_CAP)` 返回**最陈旧**的 section
   （从未缓存的优先，其次是缓存时间最久的）。
3. 用 `SECTION_CONCURRENCY` 个 worker 并行刷新；每个 worker 在开新 section 前检查时间预算。
4. 达到 `TIME_BUDGET_MS` 即停止开新 section，剩下的下次 run 再处理。

**覆盖速度**：单 section ≈ 2s。并发 3、50s 预算下，单次 run 约能刷 **70–80 个**。
当前共 113 个 section，所以约 **2 天**（每天一次）就能轮转覆盖完，按 `refreshed_at`
最旧优先排序，不会漏。用户实际打开的 section 始终由按需层即时处理，与 cron 进度无关。

响应里返回 `elapsedMs / attempted / staleBefore / remaining`，方便观测与调参：想更快
就调大 `SECTION_CONCURRENCY`（更吃 TROLS），想更温和就调小。

---

## 5. 在 Vercel + Neon（免费档）上部署

### 5.1 创建数据库（Neon）

1. Vercel 后台 → 你的项目 → **Storage** → **Create Database** → **Neon
  (Serverless Postgres)**。
2. 用默认设置（免费档）。Vercel 会把数据库关联到项目，并**自动注入** `POSTGRES_`*
  环境变量（`POSTGRES_URL`、`POSTGRES_URL_NON_POOLING` 等）到所有环境
   （Production / Preview / Development）。

### 5.2 拉取环境变量并建表

```bash
# 方式 A：从 Neon 存储页复制 .env.local 片段到本地 .env.local
# 方式 B：vercel env pull .env.local

npm run db:migrate     # 创建 competition_index、section_index、section_cache
```

迁移脚本（`scripts/db-migrate.ts` → `runMigrations()`）是幂等的
（`CREATE TABLE IF NOT EXISTS`）。生产用的是**同一个** Neon 库，所以本地跑一次即可。

> `db:migrate` 通过 `tsx --env-file=.env.local` 加载 `.env.local`。

### 5.3 配置其余环境变量（Vercel → Settings → Environment Variables）


| 变量                             | 必需  | 说明                      |
| ------------------------------ | --- | ----------------------- |
| `POSTGRES_`*                   | 是   | Neon 集成自动添加。            |
| `CRON_SECRET`                  | 是   | 任意随机串，保护 cron 端点（见 §6）。 |
| `NEXT_PUBLIC_BUYMEACOFFEE_URL` | 否   | 页脚 / 头部的捐赠链接。           |


添加 `CRON_SECRET` 后需要重新部署才能生效。

### 5.4 Cron 配置

`vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{ "path": "/api/cron/refresh-all", "schedule": "0 20 * * *" }]
}
```

- 调度时间是 **UTC**。`0 20 * * `* = 20:00 UTC ≈ 墨尔本清晨。
- Vercel 部署时会自动识别 `vercel.json` 并注册 cron，无需额外操作。部署后在
**项目 → Cron Jobs** 查看。

### 5.5 免费档需要知道的限制

**Vercel Hobby**

- cron 粒度为**每天 1 次**，最多 **2 个** cron job。上面的每日调度符合要求。
- serverless 函数上限 **60s**——所以有 `maxDuration = 60` 和 cron 的时间预算 / 分批。
- 想更快清空刷新积压需要 **Pro**，它允许高频 cron（如每小时 `0 * * * `*）；此时
`BATCH_SIZE` × 每天 run 数即可覆盖全部。

**Neon 免费**

- 约 0.5 GB 存储（本应用只存小 JSON 块，足够）。
- 计算在闲置时**自动挂起**；闲置后的第一次查询会有小幅冷启动延迟。`@vercel/postgres`
使用带连接池的 `POSTGRES_URL`。

---

## 6. Cron 鉴权

设置了 `CRON_SECRET` 后，Vercel Cron 会在每次定时请求里自动带上
`Authorization: Bearer <CRON_SECRET>`。路由会拒绝其他请求：

```ts
const authHeader = req.headers.get("Authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

手动触发测试（不要把真实密钥写进文档或提交到仓库）：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<你的应用>.vercel.app/api/cron/refresh-all
```



---

## 7. 源站礼仪

TROLS `robots.txt` 禁止 `/wdta/`。请保持低流量：激进缓存（按需 24h、cron 12h）、
错开请求、限制详情并发。若要更广泛发布，请向 WDTA/TROLS 申请许可或数据源。