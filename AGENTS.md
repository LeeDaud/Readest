# Readest · Z-Library 集成 Fork

Fork Readest，保留渲染引擎和跨平台能力，并集成 Z-Library 书源。应用名称和图标沿用 Readest；已有微信读书主题代码保留，后续优先减少与上游无关的改动。

## 分支维护

- `upstream` 指向 `https://github.com/readest/readest.git`，用于获取和合并更新。
- `codex/zlibrary-integration` 为本 Fork 的集成维护分支，保留现有本地与上游提交历史。
- `master` 保留整理前的状态，不重置或改写历史。
- 目前尚未配置自己的远程 `origin`，不要向 `upstream` 推送本 Fork 的功能。
- Android 调试包保留 `.zreader` 包名后缀以便共存，显示名称仍为 Readest。

## 目标

以手机端 App（Android / iOS）为主要方向，优先 Android 集成与安装包验收。桌面和 Web 作为辅助；Web 测试通过不能代替手机 App 验收。Z-Library 优先复用已有移动端应用内浏览器及下载入库能力。

一个开源的多格式电子书阅读器，支持 EPUB/MOBI/AZW3/FB2/CBZ/PDF，UI 风格参考微信读书（内容优先、中文排版、暖色背景），内部可直接搜索下载 Z-Library 书籍。

## 技术栈

- Next.js 16 + React 19 + TailwindCSS 4 + daisyUI 5（过渡期保留，逐步替换为 Radix 原语）
- Tauri v2（Rust 后端）
- foliate-js（渲染引擎，不动）
- Zustand（状态管理）
- pnpm workspaces（monorepo）

## 目录结构

```
apps/readest-app/          # 主应用
  src/
    app/reader/            # 阅读器页面和组件
    app/library/           # 书架页面
    app/zlibrary/          # Z-Library 集成页面（新建）
    components/ui/         # WR 设计系统 UI 原语（新建中）
    components/settings/   # 设置面板
    lib/wechat-theme/      # 微信读书设计 Token（新建）
    store/                 # Zustand stores
    styles/                # CSS（tokens.css, animations.css 已建立）
packages/foliate-js/       # 渲染引擎（git submodule，不动）
packages/tauri/            # Tauri 扩展（git submodule，不动）
src-tauri/                 # Rust 后端（不动）
```

## 设计系统

微信读书设计语言核心参数详见 `apps/readest-app/src/styles/tokens.css`：

- 4 种阅读背景：白(#FFFEF5) / 护眼绿(#C7EDCC) / 纸黄(#F1ECD8) / 夜间黑(#1A1A1A)
- 品牌强调色：微信绿 #07C160
- 默认字号 18px，行高 1.8，字间距 0.07em
- 7 级字号缩放（14-28px）
- 中文字体栈优先（PingFang SC / Noto Sans CJK / LXGW WenKai）

## 验证命令

- Web 开发启动：`pnpm dev-web`
- 桌面开发启动：`pnpm tauri dev`
- 桌面前端构建：`pnpm --filter @readest/readest-app build`
- Web 构建：`pnpm --filter @readest/readest-app build-web`
- 测试：`pnpm test`
- Lint：`pnpm lint`

## 当前进度

### 已完成
- Phase 1 基础设施（进行中）：
  - [x] `src/lib/wechat-theme/types.ts` — 类型定义
  - [x] `src/lib/wechat-theme/backgrounds.ts` — 背景色映射
  - [x] `src/lib/wechat-theme/fonts.ts` — 字体缩放和字体栈
  - [x] `src/lib/wechat-theme/platformFonts.ts` — 按平台区分字体
  - [x] `src/store/wechatThemeStore.ts` — WR 主题 Zustand store
  - [x] `src/styles/tokens.css` — CSS 设计 Token
  - [x] `src/styles/animations.css` — 翻页动画 keyframes
  - [x] Tailwind 4 CSS 配置 — WR token 扩展迁移至 `globals.css`，WR 色板迁移至 `src/styles/wechat-themes.ts`
  - [x] `src/styles/globals.css` — 移除 Inter 字体和 daisyUI CSS 引用，改为 WR token
  - [x] `src/components/ui/Button.tsx` — WR 风格按钮
  - [x] `src/components/ui/Sheet.tsx` — 底部滑出面板（微信读书风格设置面板用）
  - [x] `src/components/ui/SegmentedControl.tsx` — 字号选择器
  - [x] `src/components/ui/Slider.tsx` — 滑块（行高/字间距用）

### 待完成（下次继续）
- [x] 安装 Radix 新依赖（toggle-group / slider / popover；class-variance-authority 已存在）
- [x] 初始化当前上游的 8 个子模块，检出锁定版本（上游已移除 tauri-plugins 子模块）
- [x] `pnpm install`、Web 构建、桌面静态前端构建、TypeScript 与 Lint 检查通过
- [ ] Phase 2: 重写 Reader Chrome（HeaderBar, FooterBar, FontLayoutPanel, TOCView, useReadingChrome）
- [ ] Phase 3: 排版与字体系统
- [ ] Phase 4: 书架/设置/标注换皮
- [ ] Phase 5: E-Ink 兼容 + 收尾
- [ ] Phase 6: Z-Library 集成

### 子模块清单（需要 clone）

| 路径 | 源仓库 |
|------|--------|
| packages/foliate-js | github.com/readest/foliate-js.git |
| packages/tauri | github.com/readest/tauri.git |
| packages/simplecc-wasm | github.com/readest/simplecc-wasm.git |
| packages/qcms | github.com/mozilla/pdf.js.qcms.git |
| packages/js-mdict | github.com/readest/js-mdict.git |
| apps/readest-app/src-tauri/plugins/tauri-plugin-turso | github.com/readest/tauri-plugin-turso.git |
| apps/readest-app/src-tauri/plugins/tauri-plugin-webview-upgrade | github.com/readest/tauri-plugin-webview-upgrade.git |
| apps/readest-app/.claude/skills/gstack | github.com/garrytan/gstack.git |

## 实施计划

完整计划见：`C:\Users\10159\.claude\plans\modular-orbiting-tulip.md`

核心策略：移除 daisyUI → 建立 WR Design Token → 逐个替换组件 → Z-Library 集成。Phase 1 是所有后续工作的基础，Phase 6（Z-Library）可在 Phase 1 完成后与 Phase 2-5 并行开发。
