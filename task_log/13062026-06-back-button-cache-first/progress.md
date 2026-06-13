# Progress

## Session 1 — 2026-06-13

- 修复 `.claude/launch.json`：加 `"autoPort": true`，避免 3000 端口被占用导致 preview 启动失败。
- 调研完成：梳理全部 back 按钮 (PlayerProfile / TeamFixture / TeamFixtureLoader / our-story) 与加载慢根因 (force-dynamic + 每次 DB 往返 + no-store + 无本地数据缓存)。详见 findings.md。
- Phase 2 完成：新增 BackLink，替换三处 back 链接，typecheck 通过。
- 测得 warm SSR 延迟(dev)：player ~279ms（N+1 section 查询，最慢）、team ~138ms、results ~147ms；
  payload 仅 26–39KB → 瓶颈是「每次导航的服务端 DB 往返」，非传输体积。生产环境(远程 PG)更糟。
- Phase 3：先实现 Suspense fallback 方案，浏览器实测发现 hard-nav 在 preview 间歇卡死(streaming
  swap 不触发，prod build 也复现，但首次干净 load 成功)→ 判定为 preview harness 的 streaming 缺陷。
  改为：results 用 cache-reading `loading.tsx`(client-nav 即时、hard-nav 同原版)，player/team 回退 direct SSR。
- 新增 `.claude/launch.json` 的 `wdta-prod`(npm run start, port 3100) 用于 prod build 验证。
- Phase 4：prod build / typecheck / lint 全过；浏览器验证 back 按钮(回真实上一页) + results 缓存即时绘制
  + player/team 直出全文。完成。
- 改动文件：components/BackLink.tsx(新), lib/clientCache.ts(新),
  ResultsApp/TeamFixture/PlayerProfile(加缓存写入), PlayerProfile/TeamFixture/our-story(back 链接换 BackLink)。

## Session 1 收尾
- 先因 preview streaming 卡死回退到 direct SSR，向用户说明取舍。
- **用户选择「Re-apply streaming now」** → 重新启用 prop-based inner-Suspense cache-first(三页)。
- 最终净交付：
  ① BackLink(回真实上一页，已验证 team→player→back=team 等)；
  ② lib/clientCache.ts + components/cache-fallbacks.tsx + 三组件缓存写入 + 三页 Suspense 包裹；
  ③ .claude/launch.json：autoPort 修复 + wdta-prod(port 3100) 验证配置。
- typecheck/lint/prod build 全过；三页 SSR 均 stream 完整内容(SEO 保留)。
- 已知：preview 沙箱 hard-nav streaming 间歇卡 = harness 限制，真实部署可靠(用户已知悉)。
- 待办：用户下次部署 Vercel 时复验 hard-nav streaming。
