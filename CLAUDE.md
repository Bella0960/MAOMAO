# CLAUDE.md

「小手机 (phone-simulator)」—— 纯原生 Web 项目，模拟一部手机：桌面浏览器显示带边框的手机机身（390×844），窄屏（≤480px）经 `shared/css/mobile-fit.css` 剥掉壳变全屏 PWA。内置聊天、论坛、钱包、咖啡馆、游戏等 App，全部围绕用户自定义的 **AI 角色** 运转（人设/世界书/记忆注入 prompt，调用 OpenAI 兼容 API 生成内容）。全站简体中文，黑白灰杂志风。

## 技术栈与架构

- **纯原生 HTML/CSS/JS**：零框架（无 React/Vue/jQuery）、零运行时依赖、无 TypeScript。唯一 devDependency 是 vite。
- **MPA 多页架构**：一个页面 = 一个自包含 HTML（内嵌 `<style>` 与 `<script>`）。导航 = 整页跳转 `window.location.href`，**无路由库、无 hash 路由、无 iframe**；参数走 query string（如 `chat-detail.html?id=xxx`）。
- **共享 JS = IIFE + 全局命名空间**（如 `global.PhoneStorage = {}`），无 import/export；`package.json` 的 `"type": "module"` 仅作用于 vite.config.js。
- **Vite 可选**：`vite.config.js` 自动扫描全部 HTML 作为多页入口；项目全用相对路径 + `?v=YYYYMMDD` 缓存参数，**静态托管仓库根目录即可运行**（nav.js 已适配 GitHub Pages 子路径部署）。
- **PWA**：`manifest.json`（standalone/竖屏/快捷方式）+ `sw.js`（缓存优先+后台更新，缓存名 `phone-app-pwa-vN`）。⚠️ **SW 注册当前被禁用**：index.html 尾部注册代码已注释，且 head 内联脚本每次加载强制注销所有 SW（原因：PWA 缓存导致 HTML/JS 无法更新）。改 sw.js 时留意这个现状。

## 常用命令

```bash
npm run dev       # vite dev server（0.0.0.0:3000）
npm run build     # vite build
npm run preview   # 预览构建产物
# 项目无构建产物依赖：任何静态服务器指向仓库根即可
```

## 目录结构（按功能划分，共 48 个 HTML 页面）

```
index.html              # ★ 入口：手机主屏/启动器（状态栏 + 应用宫格 + Dock + ~1180 行拖拽引擎）
sw.js / manifest.json   # PWA（SW 注册已禁用，见上）
vite.config.js          # 自动扫描全部 HTML 为多页入口
shared/
  css/mobile-fit.css    # ≤480px 真机适配（剥手机壳、隐藏滚动条）
  js/                   # 通用层：font-loader / native-feel / nav / sound-system /
                        #   statusbar-control / mask（面具）/ memory（记忆）/ custom-css（美化注入）
  js/phone/             # ★ AI 基础设施层（6 模块，见下）
desktop/                # "手机桌面"本身：css/styles.css（机身/宫格/挂件样式）、
                        #   js/script.js（时钟、data-href 跳转代理）、widgets.html（挂件管理）
chat/                   # 聊天套件（13 页）：chat/（列表 + chat-detail 核心 + 搜索/设置/气泡主题）、
                        #   contacts/、moments/（空间 + 整机刷新入口）、call/（模拟通话）、
                        #   footprint/（足迹）、sticker/（贴纸库）
forum/                  # 论坛（9 页，含 forum-editorial 编辑控制）
worldbook/              # RP 设定中枢：characters/（角色库）、memory/（记忆空间）、
                        #   mask/（设定/面具）、settings/（正则过滤 + RP 协议）、worldbook/（世界书）
wallet/                 # wallet / finance（记账）/ shop（商店）/ shop-admin（店铺管理）
settings/               # settings（API 配置）/ appearance / font-settings / sound-settings
profile/                # profile（我的）/ edit-profile
cafe/ games/ diary/ travel/ beauty/ music/ library/ tools/   # 单页 App
apps/settings/          # ⚠️ 孤儿目录：无任何引用的旧样式副本，待清理
```

**注意：`chat/chat/` 双层目录是重构后的真实路径，不是笔误。**

## 入口与核心模块

- **index.html** = 手机主屏：`.status-bar`（实时时钟）→ 最多 4 页 `.home-page` 宫格（15 个 App 图标 + `.ds-widget` 挂件混排）→ Dock（聊天、商店）。内嵌拖拽引擎（实时让位 + 跨页流转 + Dock 自由布局），布局存 `ds_layout_v12`；编辑模式 `body.home-editing` 抑制跳转。
- **chat/chat/chat-detail.html**（4800+ 行，项目心脏）：AI 对话核心——流式响应、群聊、心形编辑器（`.bubble-heart`）、通话/图片消息、正则过滤、自动总结记忆。
- **shared/js/phone/**（AI 基础设施层，见下节）是模拟世界的"后端"。
- 复合 App：forum/（9 页）、wallet/（4 页）、settings/（4 页）；其余为单页 App。

## ★ 数据存储规则（localStorage）

**唯一持久化介质是 localStorage**（无 IndexedDB、无 cookie；sessionStorage 仅存通话结果 `call_result_<id>` 等会话级数据）。规则：

1. **新代码必须经 `PhoneStorage`（shared/js/phone/phone_storage.js）读写**：JSON 安全 + try/catch 兜底。大量旧页面裸调 `localStorage.getItem`，属历史遗留，不要模仿。
2. **新结构**：根 key `phone_data_v2` → `phoneData[contactId][appId] = {...}`。**按角色的数据一律以 contactId 一级隔离**；当前角色 id 存 `phone_current_contact`。
3. **旧 key 渐进迁移（双读双写）**：读时先查新结构再查旧散装 key，写时两边都写，旧 key 不删除。涉及 `ai_custom_characters` / `chat_history_<id>` / `finance_records` / `moments` 等。重构期间新旧两套必须同时可用。
4. **key 命名惯例**：`chat_*_<id>`（每会话独立）、`maomao_*_v1`（带版本号，升级时迁移）、`ds_*`（桌面/挂件）、全局偏好用固定 key。
5. **二进制（头像、挂件图片、车票图）以 dataURL 字符串存储**。

### 高频 key 速查

| key | 内容 / 结构 |
|---|---|
| `ai_custom_characters` | 角色列表 `[{id, name, persona, avatar(dataURL), …}]`（全局共享） |
| `phone_current_contact` | 当前选中角色 id |
| `phone_data_v2` | 新版统一存储根 `phoneData[contactId][appId]` |
| `chat_history_<id>` | 消息 `[{role:'user'\|'assistant', text, time}]`，扩展 `type:'call'\|'image'` |
| `chat_memories_<id>` / `chat_last_summary_<id>` / `chat_summary_auto_<id>` / `chat_summary_interval_<id>` | 长期记忆 / 总结时间戳 / 自动总结开关与间隔 |
| `phone_groups` | 群聊列表（群 id 以 `g` 开头）；`chat_group_alias_` / `chat_group_notice_` 群设置 |
| `phone_worldbooks` | 世界书（lorebook）条目 |
| `user_masks` / `active_mask_id` | 玩家身份面具（mask.js MaskSystem） |
| `myProfile` | 玩家资料 |
| `api_settings` / `api_call_logs` | AI 接口配置（激活方案的镜像，全站读取方零改动）/ 调用日志（tools/api-logs.html 查看） |
| `api_profiles_v1` / `api_active_profile` | API 多方案库 + 激活指针（settings.js 管理；首次加载自动从旧 api_settings 迁移） |
| `moments` / `moments_notifications` | 朋友圈动态 `{items:[{content,image,timestamp}]}` / 通知 |
| `forum_posts` / `forum_config` / `forum_follows` / `forum_notifications` | 论坛数据 |
| `finance_records` / `shop_products|shop_cart|shop_orders` / `workData` | 钱包记账 / 商店 / 打工 |
| `maomao_cafe_state_v1` / `maomao_cafe_partner` | 咖啡馆经营存档 / AI 搭档 |
| `maomao_game_stats_v1` / `maomao_game_role` | 游戏战绩 / 对局角色 |
| `maomao_diary_entries_v1` | 日记 |
| `beauty_presets` / `beauty_active` | 深度自定义 CSS 预设（beauty/ Tab2 + custom-css.js 注入；`bubble_presets` 已随 bubble-theme.html 下线，数据残留无消费者） |
| `beauty_chat_global_v1` / `beauty_chat_<id>` | 聊天美化结构化参数（全局/单聊稀疏覆盖，shared/js/chat-beauty.js 统一管理；字段：avatarSize / avatarRadius / bubbleGap / bubbleGapX / bubbleMaxWidth / bubblePadding / myBubbleBg / myBubbleColor / partnerBubbleBg / partnerBubbleColor / chatBg / chatBgDim；旧 `theme_bubble_*` 加载时自动迁移） |
| `regex_rules` | AI 输出正则过滤规则 |
| `ds_layout_v12` | 主屏布局 `{v, pages[[id…]], dock[id…], removed[id…]}` |
| `font_size_global` / `custom_font_url` / `sound_settings` / `settings_dark_mode` / `settings_statusbar_*` | 全局偏好（font-loader.js 等消费） |
| `home_custom_wallpaper` / `home_custom_icon_bg` / `home_icon_style` | 桌面壁纸（Base64 dataURL）/ 图标底色 / 图标风格（appearance.html 写、desktop/js/script.js 读应用） |

## ★ AI 基础设施层（shared/js/phone/）

6 个 IIFE 模块，页面按需用 `<script src>` 引入，通过全局名访问：

| 文件 | 全局名 | 职责 |
|---|---|---|
| phone_storage.js | `PhoneStorage` | 统一 localStorage 抽象（规则见上节） |
| phone_api.js | `PhoneAPI` | OpenAI 兼容 `POST <baseUrl>/chat/completions`（支持流式）、超时、调用写日志 |
| phone_context.js | `PhoneContext` | 组装 system prompt：人设 + 世界书 + 长期记忆 + 近期聊天 + 其他 App 数据 |
| phone_apps.js | `PHONE_APPS` | App 注册表：`{id, name, icon, page, prompt, jsonSchema, getCount, getData}`；每个 App 的 prompt/jsonSchema 定义 AI 生成规则 |
| phone_engine.js | `PhoneEngine` | 角色切换、**整机刷新**（为选定角色一次性重新生成全部 App 数据；入口在 chat/moments/moments.html） |
| phone_ui.js | `PhoneUI` | 通用 toast / loading / confirm / 返回 |

AI 接口配置存 `api_settings`（默认 `https://api.openai.com/v1`，内置 DeepSeek / Moonshot / 智谱 / 硅基流动预设，见 settings/js/settings.js）。新增 App 接入 AI 时：在 `PHONE_APPS` 注册（写 prompt + jsonSchema），数据落 `phoneData[contactId][appId]`。

### 聊天主链路健壮性（chat-detail.html sendMsg）

- **三段式超时**：连接 15s（等响应头）→ 流式「无数据看门狗」30s（每收到 chunk 重置）→ 120s 硬性总上限；中断时已生成内容保留落库，不丢弃。
- **上下文字符预算 `CTX_CAP`**：人设 5000 / 长期记忆 3000 / 用户记忆 2000 / 世界书 8000 / RP 协议原文 6000（变量替换后整段 16000），超限经 `capText` 静默截断降级，防 400 超长。
- **流式渲染 rAF 节流**：delta 只累计文本，正则清洗 + DOM 写入合并到每帧一次；流结束后补处理残留 SSE buffer，防丢尾字。
- **发送防重入**：`aiSending` 锁（sendMsg / regenerateReply 双入口检查，`finally` 统一解锁）；HTTP 错误经 `friendlyHttpError` 映射为中文提示（原始细节进 api-logs）。

### 长期记忆系统（chat-detail 总结 IIFE + 权重记忆）

- **触发**：开聊天页 1.5s 后检查一次（聊天中不触发）；条件 = 自动开关开 且 历史条数 ≥ 角色级间隔（`chat_summary_interval_<id>`，默认 20）且距上次总结 ≥8h；弹面板**人工确认**后才调 API（20s 超时，独立于主聊天链路，失败不阻塞聊天，提示走非阻塞 toast）。
- **注入防膨胀**：权重 = importance × 类别基准 × 2^(−天数/半衰期)（key/纪念日 365 天、plot 21 天、detail/preference 60 天），≤0.12 不注入、pending 不注入、fixed 钉住；再过 `CTX_CAP.memory` 3000 字符。`[记住:xxx]` 用户记忆存 200 条 / 注入 30 条 / 2000 字符。
- **M1 已修**：`chat_memories_<id>` 存储上限 **300 条**（`trimMemoriesByWeight` 按权重淘汰尾部，fixed 永不淘汰）；`saveWeightMemories` 是唯一写入口（doSummarize 已改走它，顺带补上 phone_data_v2 双写）。
- **M3 已修**：总结 transcript 上限 **4000 字符**（超长从头部截断保留最近，不切代理对）。
- **M2 暂缓（已知风险）**：`chat_history_<id>` 无上限（含 base64 贴纸/图片消息），是 localStorage 5MB 配额的长期最大威胁；注入端只取 10-50 条不受影响，存储侧靠设置页 DATA 分组的全量备份兜底。

## 项目字典

### 业务术语

| 术语 | 含义 |
|---|---|
| 角色 / 人设 | 用户创建的 AI 人物及其 `persona` 设定文本；一切 App 数据按角色隔离 |
| 角色库 | worldbook/characters/，角色增删改（characters-manager.js） |
| 世界书 | lorebook：世界设定条目，注入 AI 上下文 |
| 记忆 / 记忆空间 | 角色长期记忆 + 聊天自动总结（memory.js、worldbook/memory/） |
| 设定 / 面具 | 玩家在扮演中的身份切换（mask.js MaskSystem） |
| 空间 / 朋友圈 | chat/moments/ 的动态 feed；也是"整机刷新"入口 |
| 整机刷新 | PhoneEngine 一键重新生成某角色的全部 App 数据 |
| 挂件 / 元素仓库 | 主屏 `.ds-widget` 小组件；被移除的项目进隐藏仓库，经 desktop/widgets.html 恢复 |
| 聊天美化中心 | beauty.html 双 Tab：「可视化调节」（ChatBeauty 结构化参数 + Sticky 实时预览）+「深度自定义」（手写 CSS 预设，导入导出 + 校验）；已吸收下线的 bubble-theme 气泡主题 |
| 咖啡馆经营 / 游戏大厅 / 触梦旅行 | cafe、games（6 款 AI 伴玩小游戏）、travel 三个单页模拟 App |
| 正则过滤 / RP 协议 | AI 输出正则替换规则 / 角色扮演协议（worldbook/settings/） |
| 群组 / 贴纸库 | 多角色群聊（群 id 以 `g` 开头）/ chat/sticker/ 表情包管理 |
| 编辑控制 | forum-editorial 等页面的内容精选控制 |

### UI 约定

- 手机壳三层：`.simulator-stage` > `.phone` > `.phone-screen`；真机下由 mobile-fit.css 重置为全屏。
- 主屏部件：`.status-bar`（`#status-time` 实时时钟）、`.home-page` 宫格、`.app-card .app-tile`（`data-href` 跳转 + `data-drag` 拖拽 id）、`.ds-widget` 挂件、`.dock-wrapper`/`#dockBar`、`.gesture-bar`。
- **底部导航由 shared/js/nav.js 自动注入**（`.floating-nav`，聊天/联系人/空间/我的四 tab）：从 `document.currentScript.src` 推导站点根（兼容子路径），`SKIP_PAGES` 数组按 pathname 子串匹配决定跳过页；高亮 = `currentPage.indexOf(tab.key)`。页面只需引脚本，无需写 HTML。
- 页内视图切换用 `data-route`（library）、游戏分发用 `data-game`（games）；聊天页扩展面板在 chat/chat/js/chat-extras.js。
- 暗色模式 `html.dark`（settings/css/settings.css）；每页内嵌自己的 `:root` 变量（`--bg/--ink/--muted/--line`…），**无全局 token 文件**。
- 通用弹层/提示用 `PhoneUI`。

## 注意事项 / 已知坑

- 共享脚本加载顺序惯例：`font-loader.js` → `native-feel.js` →（数据页）`phone/phone_storage.js` + `phone/phone_api.js` → 页面脚本。
- JS 里的相对路径按**页面 URL**（而非脚本位置）解析；跨目录跳转统一用相对路径（如 characters-manager.js 的 `../../index.html`），nav.js 用动态 appBase 兼容子路径部署。PHONE_APPS 注册表的 `page` 字段是根绝对路径，但目前无任何消费方（纯元数据）。
- 改完 HTML/CSS/JS 若走静态托管缓存，记得 bump 页面引用的 `?v=` 参数。
- 全量备份/恢复在设置页 DATA 分组（settings/js/backup.js）：JSON 带 `__backup.schema` 版本校验（当前 1，拒收更高版本），排除 `api_call_logs`；导入前自动下载当前数据作安全备份，写入失败自动回滚。
- 无 README、无测试、lint 为空操作；`.trae/` 是 IDE 配置（git-ignored）。`docs/audit-report.html` 是历史审计报告，其中的旧路径已因目录重构失效，仅作参考。
