# Android 验证记录 · 2026-10-14

本文以下流程记录对应旧名称安装包。后续整理已恢复 Readest 名称并同步上游原图标，新包构建、签名和对齐检查通过；重新安装时无已连接设备，未重复执行 Android 运行流程。新产物信息见 [Android 构建说明](android-build.md)。

## 安装包

- 产物：`artifacts/android/Z-Reader-0.12.12-arm64-debug.apk`，207,793,549 字节（约 198 MiB）。
- 包名：`com.bilingify.readest.zreader`，显示名 Z-Reader，与原版 Readest 调试安装隔离。
- 版本：0.12.12-zreader-dev，versionCode 12012。
- 最低 Android 8.0（API 26），target/compile API 36，ABI `arm64-v8a`。
- SHA256：`87B49542DAF32EF10C44D86CB7AD75536317AA095C83C40C90CD8672FC525DE9`。
- `apksigner verify --verbose`：通过，APK Signature Scheme v2。
- `zipalign -c -P 16 4`：通过。
- Gradle `assembleArm64Debug`：BUILD SUCCESSFUL，348 个任务，日志 `.validation/android-gradle-build-retry.log`。

## 实际 Android 操作

设备为已有 Android 15 模拟器 `emulator-5558`，ABI `x86_64,arm64-v8a`，ARM64 库由模拟器转译执行。不能将此结果等同于真实 ARM64 手机验收。

| 流程 | 结果 |
| --- | --- |
| adb 安装 APK 与启动 | Success，App 启动，无观察到的启动崩溃 |
| 本地 EPUB 导入 | 经 App 导入菜单和 Android 系统文件选择器完成，书架显示 Alice 与 Lewis Carroll |
| EPUB 阅读与翻页 | foliate-view 实际加载；封面与正文渲染，翻页切换 Title / About，书架保存 1% 进度 |
| 本地 PDF 导入与阅读 | 系统选择器导入成功；PDF canvas 与文本层均存在，显示 69 页 |
| PDF 翻页 | 从第 1 页到第 2 页 |
| 重启与恢复 | force-stop 后重新启动，两本样书保留；重新打开 PDF 恢复第 2 页 |
| 手机 Z-Library 入口 | 通过书架菜单进入，再打开原生浏览页；浏览 WebView 与主 WebView 同属 Z-Reader MainActivity |
| 浏览器样书下载 | 在该原生浏览页通过本地临时 HTTP 服务器下载 PDF，触发真实 WebView 下载回调 |
| 自动入库与重复下载 | 第三本 Author Guidelines for 8 自动加入书架，多次下载后仍只有一个书架条目 |
| 下载后打开阅读 | 原生浏览器提示 Added to library，点击 Open 后返回 `/reader?ids=008e936204282cfdef42acdd3e527740`，PDF canvas 和文本层渲染，显示 2 页 |
| 下载入库后重启 | 第三本书与此前 EPUB/PDF 均保留，书架共 3 项 |

下载验证使用 `.validation/android-download-server.py`，通过 adb reverse 映射仅监听本机的样书服务器。未修改应用默认 Z-Library URL，也未修改模拟器网络配置。样书下载与真实网站下载使用同一原生浏览器下载监听、native-bridge 事件和共享导入钩子；此验证没有覆盖真实网站认证、重定向与下载额度。

## 边界

模拟器访问 `https://zh.zlibrary.by/` 得到 `ERR_NAME_NOT_RESOLVED`，因此没有完成真实网站浏览、登录和账号下载。Windows 桌面此前可达站点的结果不能替代 Android 网站验收。当前没有真实 Android 手机验收结果；仍需在手机安装本包，检查实际网络下的站点访问、账号下载以及设备适配。

手机相关单元测试 22 项通过，静态前端构建、类型检查与 Lint 通过。此前 Web 29 项 E2E 通过仅作为辅助验证。

## 证据

- `.validation/android-epub-reader.png`：Android EPUB 封面渲染。
- `.validation/android-pdf-reader.png`：Android PDF 渲染。
- `.validation/android-zlibrary.png`：同一 App 原生浏览器与 DNS 错误。
- `.validation/android-download-added.png`：Added to library 与 Open 提示。
- `.validation/android-downloaded-reader.png`：下载后实际阅读。
- `.validation/android-library-restarted.png`：最终重启后的 3 本书与进度。
