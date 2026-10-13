# 2026-10-13 使用流程验证

结论：当前项目已能完成本地导入、书架管理、阅读与保存进度的正常使用流程。Windows 桌面端和 Web 均做了实际验证。真实 Z-Library 账号下载仍需登录后单独验收。

## 环境补齐

- 初始化上游锁定的 8 个直接子模块及 OpenCC 嵌套子模块；没有修改渲染引擎源码。
- `pnpm install --frozen-lockfile` 通过，新增 Radix slider / toggle-group / popover 依赖并更新锁文件。
- 准备 PDF worker、WASM、字体、CMap 与图层 CSS；安装 Playwright Chromium。
- Windows 工具链：Node 22.14.0、pnpm 11.1.1、Rust 1.94.0。

## 构建和检查

| 检查 | 结果 |
| --- | --- |
| Web 生产构建 | 通过 |
| Tauri 静态前端构建 | 通过 |
| TypeScript 与 Biome Lint（`pnpm lint`） | 通过 |
| Windows `cargo check -p Readest --locked` | 通过 |
| Windows `cargo build -p Readest --locked` | 通过，实际生成可执行文件 |
| Git 差异检查与子模块版本检查 | 通过 |

## 浏览器端实际使用

最终使用生产 Web 服务、标准 Chromium、单工作进程执行整个 Playwright 套件：**29 通过，0 失败，0 跳过，0 flaky**，耗时约 91 秒。

覆盖 TXT/EPUB 导入、书架搜索、阅读与翻页、目录跳转、页码跳转、全文搜索、字号与快捷键、书签、高亮、笔记、标注工具条等。新增 EPUB/PDF 持久化测试实际关闭 Chromium 并以同一独立配置目录重启，检查书架记录及阅读位置恢复。

报告：`../.validation/e2e-final.json`。可复现命令：

```powershell
pnpm --filter @readest/readest-app build-web
# 在一个终端启动生产服务
pnpm --filter @readest/readest-app start-web
# 另一个终端复用生产服务运行测试
pnpm --filter @readest/readest-app test:e2e:web --workers=1
```

## Windows 桌面实际使用

验证程序使用独立应用标识 `com.zreader.validation` 和 `.validation/desktop` 便携书架，未操作真实 Readest 书架。

- 通过原生“打开文件”入口导入 Alice EPUB、Alice PDF，实际从书架打开阅读窗口。
- 确认 EPUB 正文与 PDF 画布、可选中文本已渲染；保留阅读截图。
- 将 sample-paper PDF 作为已完成下载样本放入独立原生缓存，通过常驻下载桥接完成解析、入库、书架持久化及队列确认；完成后待入库队列为空。
- 正常关闭测试窗口并重启，三本测试书籍仍在本地书架，已保存的进度仍保留。
- Z-Library 窗口创建及公开首页加载通过：用户入口 `https://zh.zlibrary.by` 实际跳转至 `https://z-lib.by/`，首页、搜索入口和登录入口可见。

截图：`../.validation/desktop/epub-reader.png`、`pdf-reader.png`、`download-imported.png`、`zlibrary-website.png`。

## 单元测试

全量运行 **13453 项**：13432 通过、5 失败、16 跳过。5 个失败全部来自同一个导入菜单测试文件：新增 Z-Library 导航后，原测试缺少 Next 路由上下文。

修复路由模拟，并新增导航与菜单关闭验证后，导入菜单、Z-Library 入库、Blob 回归、小说导入的专项复测 **56/56 通过**。未将首次全量报告改写为全绿，也没有在该修复后重复整套上万项测试。

报告：`../.validation/unit-tests.json`、`../.validation/retests.json`。

## 本次修正与边界

- 修复测试环境中 Node Response Blob 与 jsdom File 不兼容导致的 ZIP/EPUB 测试字节损坏，并加入回归测试；失败图片测试改为模拟网络失败。
- 移除两个 UI 原语中的未使用导入。
- 修正测试对实际翻页完成与正常返回书架保存流程的等待；标注改色后先关闭旧工具条再重新选择标注。
- 修复 Windows Z-Library 新窗口的 WebView2 环境参数不一致问题（0x8007139F），采用上游主窗口相同的 FluentOverlay 滚动条设置。
- 便携验证环境记录到缩略图缓存原子重命名警告（os error 17）。书架原图封面、导入和阅读正常；本次没有扩展修改上游缩略图缓存实现。
- 网站公开页面及原生待下载入库链路已验证；**登录后的真实 Z-Library 搜索/下载、下载额度、站点验证与真实下载回调尚未完整验收**。测试缓存样本不能代替真实账号下载。
- 未验证 macOS、Linux、Android、iOS，也未验证账号云同步、付费服务和 TTS 外部服务。

正常开发启动：Web 使用 `pnpm dev-web`；桌面使用 `pnpm tauri dev`。
