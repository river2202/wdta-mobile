WDTA Mobile

- 起因：WDTA的网站是女儿的网球赛区的很老的php网站，很久没有更新，手机上看很费劲，因此用ai来把它的数据抓下来，重新整理成mobile friendly的，供我自己和其他家长使用
- 动念：Darren给我看他老婆用chatgpt，帮他把所有的网球的时间都加入到他的Calendar，这样他就能得到提醒，每周在哪里比赛，需要提前多长时间出门。
    - AI可以给我们带来很多便利，但是并不是所有人都可以很方便的享受这个便利，因此做着个网站也是为了把这个便利带给所有的家长

- 计划：
    - 先做一个网站，使用Vercel和Neon postgres数据库，实现一个小型的前后端mobile friendly的网站
    - 这个网站除了可以显示已有的信息，也可以帮助家长快速浏览所有的比赛数据
    - mobile app, 可以实现更多的功能，例如提醒，查路线天气，生成日期日程等


- OurStory ✅ 已上线（/our-story）
    - 入口：landing page 标题右边的 "Our Story" pill + 所有页面底部页脚链接
    - 页面内容（简洁版）：起因、功能列表、非赢利家长自愿贡献声明、免责声明、联系邮箱 admin@wdta.app（欢迎家长提建议，有类似需求也可联系讨论方案）
    - donate（Buy me a coffee）只放在 Our Story 页：标题右边小图标 + 非赢利段落下方大按钮；其他所有页面已移除

- mobile app - 下一步
    - 增加提醒功能
    - 增加定位
    - 自动生成日历项



## 现在已经实现的功能

- 所有的section/team家长都可以使用
    - 方便的选择和过滤功能
- 链接到原始的站点信息
- 自动记忆选择，下次直接进入section，可以修改
- 点击球员进入球员的比赛历史信息
    - 进入球员信息页面，再点击对手，显示跟这个对手的比赛历史记录 - todo
- 后台每天自动刷新，或者家长访问触发刷新
- Section / team 页面
    - 设置为home team 功能 - todo
        - 设置当前team为自己的home team，本地保存，缓存，以后每次进来默认到这个页面
- 导航的层级关系捋一下 - todo
    - landing - 选择时间和section
    - result 
        - ladder 
            - team fixture
                - team round result
        - round result
            - player

## more feature
- 在results页面顶部 有current ladder，显示每个team，点击日程会进入到这个team的fixture/日程里，现在要开发一个team fixture的页面，来替代原来的这个页面。这个页面最顶部显示 team，club名，所在competition和section，以及从所有的比赛的日程，按日程顺序往下排，已经打过的比赛显示结果，并且默认折叠，未打的显示TBD，最近一个显示upcoming，并显示Home还是Away，如果是Away，显示away team的地址，联系电话，和导航按钮（点击后自动导航到club地址）。同时，显示WDTA网站的原始链接备用。
打开页面自动定位到下一个比赛的信息 - done

- 定制你的页面，当用户输入他的小孩或者俱乐部信息，我们的页面就可以为了这个俱乐部定制，高亮他们的比赛结果等
- 加入天气预报，提前两天/一天发送，给出washout的chance和目标目标俱乐部联系电话
- club contact number
- 俱乐部页面
    - 显示该俱乐部的所有section，球队
    - 等等
- 加google ads，不过针对网球过滤，放在不显眼的地方