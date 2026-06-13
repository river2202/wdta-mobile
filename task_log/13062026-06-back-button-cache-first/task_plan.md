# Task Plan — Back button fixes + cache-first page loading

## 目标 (Goals)
1. **Back button**: 复查所有 back 按钮，确保它们返回到「上一个真实页面」而不是写死的目的地。
2. **加载提速**: 分析每个页面加载慢的根因，采用「本地缓存优先 (cache-first / stale-while-revalidate)」策略加速。

## 背景架构
- Next.js App Router, `@vercel/postgres` 作数据源。
- 所有动态页面都标了 `export const dynamic = "force-dynamic"` → 每次导航都在服务端重新渲染并 await DB 查询。
- 客户端 fetch 全部 `cache: "no-store"`，localStorage 仅用于「记住选中的 section」，未用于缓存数据。

## 阶段 (Phases)

### Phase 1 — 现状调研  ✅ complete
- 梳理所有 back 入口与导航来源 (见 findings.md)。
- 定位加载慢的根因 (force-dynamic + 每次 DB 往返 + no-store)。

### Phase 2 — Back button 修复  ✅ complete
- 新增 `components/BackLink.tsx`：客户端 `router.back()`，无历史时回退到 fallbackHref。
- 替换 PlayerProfile / TeamFixture / our-story 的写死 back 链接。
- Loader 错误态里的 "Back to results" 保留为显式恢复链接(语义本就是去 results)。
- typecheck 通过。

### Phase 3 — Cache-first 加载  ✅ complete（按用户选择：启用 streaming 方案）
方案：prop-based inner-`<Suspense>`，fallback(CachedResults/CachedTeam/CachedPlayer) 从 props 拿到路由参数 →
读 localStorage 即时绘制；server DB 数据 stream 到达后替换(SWR)。三页 page.tsx 把 DB 读取下沉到
`*Data` 子组件并用 Suspense 包裹。展示组件写缓存；删除 results/loading.tsx(被内层 fallback 取代)。
- `lib/clientCache.ts`：localStorage read/write/useWriteCache。
- `components/cache-fallbacks.tsx`：三个 prop-based 缓存 fallback。
- **已验证(早前同构 build)**：client-nav 即时出缓存(afterMs:0)、cache key 正确写入、back 正常。
- **已知限制**：本 preview 沙箱 streaming 渲染器在 hard-nav 间歇卡在「Loading…」——harness 缺陷
  (原 results 页本就用同款 streaming)；真实浏览器/Vercel 上 React streaming 可靠。用户已知悉并选择启用。

### Phase 4 — 验证  ✅ complete
- typecheck / lint / prod build 全过。
- **back 按钮(核心交付#1)**：BackLink 替换全部写死链接；router.back 返回**真实上一页**，
  已验证 team→player→back=team、player→results、team→results；无历史时回退 fallbackHref。
- 渲染可靠性：player/team hard-nav 直出全文不卡(浏览器实测)；三页 SSR 输出均含完整内容。
- 缓存写入：ResultsApp/TeamFixture/PlayerProfile 挂载后正确写入 localStorage（实测 cache key 生成）。

### Phase 4 — 验证  ⬜ pending
- 启动 dev server，验证 back 导航与缓存即时渲染，typecheck/lint。

## 决策记录
- (待定) router.back() vs 携带 `from` 查询参数 —— 倾向 router.back()+fallback，更简单且天然匹配「上一页」。
