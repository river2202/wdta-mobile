# Findings

## 1. Back button 现状

| 位置 | 当前 back 目的地 | 问题 |
|------|------------------|------|
| `components/PlayerProfile.tsx:44` | `backHref` = `/results?section=<玩家第一个队的 section>` 或 `/` (服务端在 `app/player/[name]/page.tsx:43` 计算) | 写死目的地。玩家页可从 **MatchDetail 的球员链接** 进入(`components/MatchDetail.tsx:114`)，那个 MatchDetail 可能出现在 results 页或 **team fixture 页**。无论从哪来，Back 都跳到 /results，丢失真实来路。 |
| `components/TeamFixture.tsx:45` | `/results?section=<sectionCode>` | 写死 results。Team 链接来自 `ResultsApp.tsx:308`，碰巧一致；但若未来从别处进入则错。 |
| `components/TeamFixtureLoader.tsx:90` | "Back to results" (同上) | 同 TeamFixture。 |
| `app/our-story/page.tsx:20` | `/` 写死 | 从 landing 进入，基本 OK，但仍非「上一页」。 |

**根因**: back 是写死 `href` 的 `<Link>`，指向「按数据推断的目的地」，而非浏览器真实历史的上一页。

**修复方向**: 客户端 `router.back()`；当 `window.history.length <= 1`(直接落地/SEO)时回退到现有的合理 fallback href。

## 2. 页面加载慢的根因

1. **`export const dynamic = "force-dynamic"`** 出现在 `app/results/page.tsx`、`app/player/[name]/page.tsx`、`app/team/[section]/[team]/page.tsx`。
   → 关闭了 Next 全路由缓存，**每次导航都在服务端重渲染**。
2. **每次渲染都 await DB 往返** (Vercel Postgres，跨网络):
   - results: 1 次 `getSectionCache`
   - player: `getPlayerAppearances` + 每个 section 的 `getSectionCache` (N 次, 见 `page.tsx:57`)
   - team: 3 次并行 (`getSection` + `getSectionCache` + `getTeamFixtureCache`)
   → HTML 在这些查询返回前不会发出 → 首字节慢。
3. **客户端 fetch 全 `cache: "no-store"`** (SectionLoader、TeamFixtureLoader、ResultsApp 后台刷新)。
4. **无客户端数据缓存**: localStorage 只存 `wdta-mobile-section`(选中项) 与 `wdta-mobile-seen-results`(已读标记)，**数据本身每次都重新从服务端取**。重复访问同一 section 体验不到任何本地缓存加速。

## 3. Streaming Suspense 在 preview sandbox 的可靠性问题（实测）

- 把页面 DB 读取放进 `<Suspense>` 的子组件、fallback 读 localStorage 即时绘制 —— **client-side 导航(点链接)完全可靠且即时**(实测 afterMs:0，cache 正确写入)。
- 但 **hard navigation / 刷新** 在本 preview 沙箱里**间歇性卡在 fallback**（real content 在 `<template>` 里没被 `$RC` swap 进来）。dev(turbopack) 和 prod build 都复现；首次干净 prod load 成功(templatesLeft:0)，重启后又卡 → 判断是 **preview 代理 + 内嵌浏览器的 streaming flush 问题**，非代码缺陷（React streaming 在真实 Vercel/浏览器久经验证）。
- 关键参照：**原 `results` 页本就用 `loading.tsx` + 顶层 `await`（= streaming fallback）**，player/team 原本是直接 SSR（无 streaming）。

## 4. 复盘：streaming 路线放弃，回退可靠 direct SSR

反复实测(dev turbopack + prod build，多次重启)：streaming Suspense 在本 preview 沙箱里**频繁卡死**
(hard-nav 必现、client-nav 有时也卡)。卡死时 real 组件不挂载 → `useWriteCache` 不跑 → **连缓存都写不进去**，
整条 cache-first 链断掉，页面停在「Loading…」。卡的「Loading」比「稍慢」更糟，尤其对重 SEO 的站点。
→ **决定回退全部 streaming/Suspense/loading.tsx 机制，恢复原始 direct SSR（可靠、组件必挂载、缓存照写）。**
保留：BackLink（已验证）+ 三个组件的 localStorage 缓存写入（direct SSR 下正常执行，作为后续基础）。
cache-first 即时绘制需 streaming/PPR 或 client-fetch，二者分别有「沙箱不可验证」与「正文 SEO 退化」的代价，
留给用户在真实部署(Vercel)上验证或后续决策。

**（历史，已放弃）原拟方案**：
- 用 **cache-reading `loading.tsx`** 给 `results` 做 client-nav 即时缓存绘制（hard-nav 行为与原版一致，零新增风险）。
- **player/team 回退为原始 direct SSR**，不给它们引入新的 hard-nav streaming 风险；它们靠 cache 写入 + cache-first loader 兜底。
- 三个展示组件都写 localStorage 缓存；loader 从缓存 seed。

**Cache-first 策略**:
- 在客户端把 `results_json` / 玩家数据 / fixture JSON 按 key(code) 存进 localStorage。
- 进入页面时**先用 localStorage 即时渲染**(0 等待)，同时后台请求最新数据，到达后再静默更新 (stale-while-revalidate)。
- 这与现有 `ResultsApp` 的「先展示缓存、后台刷新」模式一致，只是把「服务端 DB 缓存」前移一层到「浏览器本地缓存」。
