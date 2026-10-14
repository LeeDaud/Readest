# Z-Library 集成

当前优先方向：Android 手机 App。在 App 内访问 Z-Library、登录、浏览书籍，下载后自动添加到本地书架；桌面和 Web 为辅助。

## 手机端

Android/iOS 复用 Readest 原有应用内浏览器：Android 在当前 Activity 中呈现 WebView 浏览页面，iOS 使用应用内 WKWebView 控制器。网站留在 App 内，支持返回、刷新和登录会话；下载成功通过 native-bridge 事件交给 `useWebBrowserDownloads`，复用书籍解析、入库和保存流程。

书架的 Z-Library 菜单直接打开应用内浏览器，下载由书架已挂载的共享监听处理，不再显示网站确认页面。浏览页底部显示下载/入库结果，点击「打开」后返回书籍 hash 并导航到阅读器。旧 `/zlibrary` 路由保留自动打开行为和共享下载监听，兼容旧入口。

网站配置位于「设置 → 集成 → 内容来源 → Z-Library」。使用网站列表添加、编辑和删除 HTTPS 入口，通过上下箭头调整顺序，第一个标为「优先入口」。每个网站可填写名称，手机浏览器顶部显示该名称。最多 10 个，保存时去除空地址和重复项；网址与名称通过现有 SystemSettings 保存，重启后保留。旧版单网址和多网址列表均兼容，默认入口仍为用户提供的 `https://zh.zlibrary.by`。

手机访问 UI 的刷新/停止移入「更多」，Z-Library 顶部保留关闭、返回、网站名称与更多。Android 在首次连接和换站时显示当前尝试序号；全部失败可重试完整入口列表或直接进入网站设置。下载提示位于底部，区分下载失败与入库失败，分别重试下载或缓存文件入库。成功后的「立即阅读」在 Z-Library 浏览器中保留，直到用户关闭提示或新状态替换；有 Content-Length 时 Android 显示下载百分比，没有时仅显示下载中。此原生 UI 尚需新版本手机视觉和重试验收。

Android 原生 WebView 在首次主文档加载发生网络/TLS 错误、20 秒未提交页面、404 或 5xx 时顺序尝试下一入口。iOS WKWebView 也实现初始导航错误、超时和 HTTP 状态处理，但尚未在 macOS 构建验证。正常文档提交后停止自动换站；401/403/429 登录与验证页面保留，子资源加载失败不触发换站。主动停止或关闭浏览器会取消自动尝试。全部入口失败时保留错误提示，不循环重试。桌面使用原生 HTTP 按顺序探测（每项 10 秒），选定入口后打开现有下载窗口；此探测不能代替实际 WebView 中的网站兼容性。

移动端入口、下载后打开阅读、桌面兼容、失败处理和共享下载流程专项测试共 22 项通过；静态前端构建和类型/Lint 通过。Android ARM64 APK 已生成，Android 15 模拟器完成本地 EPUB/PDF 导入阅读、翻页、重启保存与浏览器样书下载自动入库并打开阅读验证。见 [Android 验证记录](validation-android-2026-10-14.md)；真实手机、Z-Library 账号下载和 iOS 构建尚未验证。

## 使用

1. 在设置的集成面板配置 Z-Library 网站列表并保存，也可直接使用默认入口。
2. 书架右上角「+」菜单 → Z-Library，直接按配置顺序访问，不需要再次确认。
3. 手机在 App 内浏览页面登录、搜索和下载。桌面仍使用独立浏览窗口。
4. 下载完成后自动调用现有书籍导入流程，生成元数据与封面，并保存书架。
5. 手机浏览器底部显示入库结果，点击「Open / 打开」即可阅读，也可关闭浏览器返回书架。桌面待入库队列仍由常驻桥接处理，应用重启时恢复未完成入库。

不需要登录 Readest 云账号即可本地入库。登录了 Readest 且开启自动上传时，沿用现有上传行为。

## 桌面实现

- `src-tauri/src/zlibrary.rs`：HTTPS 原生浏览窗口、浏览器下载回调、待入库文件查询和确认命令。
- `src/components/ZLibraryDownloadBridge.tsx`：主窗口常驻监听，切换路由后继续入库；串行导入避免并发覆盖。
- `src/services/zlibrary/importDownloads.ts`：只有书架持久化成功后才确认下载；单文件失败不阻断后续文件。
- `src/store/zlibraryStore.ts`：当前会话的下载状态。
- `src/components/settings/integrations/ZLibraryForm.tsx`：多网址配置和持久化。
- `src/hooks/useOpenZLibrary.ts`：书架直接打开与阅读导航。
- `src/services/zlibrary/sites.ts`：网址验证、顺序与旧配置兼容。
- `src/app/zlibrary/page.tsx`：旧链接自动打开兼容入口。

网站登录交给浏览器会话，不收集账号密码，不调用非公开 Z-Library API，不解析网站 DOM 提取书籍。外部浏览窗口没有加入应用的本地文件或 IPC capabilities；管理命令仅接受主窗口调用。

原生浏览与下载事件采用 [Tauri WebviewWindowBuilder 官方接口](https://docs.rs/tauri/2.10.3/tauri/webview/struct.WebviewWindowBuilder.html#method.on_download)。

下载存放在应用缓存目录的 `zlibrary-downloads/<唯一 ID>/<文件名>`。成功下载后创建 `.ready` 标记；入库和保存完成后删除标记。应用重启后检查剩余标记，恢复未完成入库。原始文件保留用于恢复，目前没有自动清理功能。EPUB、MOBI、AZW/AZW3、FB2、CBZ、PDF、TXT 扩展名允许下载，实际格式仍由原有渲染加载器验证。

## 验证与边界

用户已确认此前 Z-Library 集成测试通过。访问 UI 优化后的 43 项专项测试、类型/Lint、静态前端、Rust 和 Android Kotlin/APK 构建通过；网站列表在 390 像素视口实际完成添加、命名、排序和保存，无横向溢出。此 Web 辅助检查不替代 Android 原生 UI 验收。见 [访问 UI 验证记录](validation-zlibrary-ui-2026-10-14.md)。

多网址配置与直接打开专项测试 41 项通过，类型/Lint、静态前端、Rust、Android Kotlin 与 APK 构建通过。最新 APK 签名与对齐检查通过。本次没有连接设备，自动换站运行场景仍需手机验收；详情见 [多网址验证记录](validation-zlibrary-sites-2026-10-14.md)。

环境已补齐，Web 与 Windows 桌面已实际验证。完整结果见 [2026-10-13 验证报告](validation-2026-10-13.md)。真实账号下载仍需登录后验收。

入库单元测试覆盖保存后确认、保存失败保留待入库、无效文件不阻断队列、顺序处理和确认失败。全量构建需要先补齐子模块和 pnpm 依赖。

手机端已接入上游的应用内浏览和下载入库能力，网页版尚未接入。各平台真实账号下载仍需各自实机验证，尤其是站点跳转、登录验证、下载文件名与浏览器下载回调。网站当前可达性和账号下载额度由网站决定。

桌面验收：下载一本有效 EPUB 和一本 PDF，检查标题、封面、阅读与重启后书架持久化；重复下载检查去重；下载过程中切回书架；制造入库失败并重试；下载完成后入库前退出应用，再启动检查恢复。关闭浏览窗口可能中断尚未完成的下载。

开发启动：`pnpm --filter @readest/readest-app tauri dev`。
构建：`pnpm --filter @readest/readest-app build`，桌面构建使用 Tauri CLI。
测试：`pnpm --filter @readest/readest-app test --run src/__tests__/services/zlibraryDownloads.test.ts`。
