# Android 构建与验收

手机 App 为主，Web 验证不能代替 Android 实机验收。Z-Library 在 Android 当前 Activity 内的浏览器中打开，复用已有 native-bridge 下载事件和书籍导入流程。

## 构建

项目版本为 Readest 0.12.12。使用 JDK 17、Android SDK（compile/target 36）、NDK r28c（28.2.13676358）与 Rust `aarch64-linux-android` 目标。

在 `apps/readest-app` 下运行：

```powershell
pnpm tauri android build --apk --debug --target aarch64 --ci
```

`src-tauri/tauri.android.conf.json` 沿用 Readest 名称，并使用 `.zreader` 调试包名后缀。调试版最低 Android 8.0（API 26），用于 ARM64 手机。构建前通过 `scripts/prepare-android-branding.mjs` 同步上游图标和 Readest 名称，前端构建不会运行上游的 sourcemap 上传命令。

`packages/turso-ext` 保留 upstream 0.6.1 的源代码和许可证，只修正构建脚本按目标平台决定是否链接 `advapi32`，以支持 Windows 主机编译 Android。

## 当前 Windows 环境的兼容处理

工具链和日志保存在忽略的 `.validation/` 中。首次构建在 Rust 原生库成功后遇到 Windows 创建符号链接权限限制。兼容流程将已编译的 `target/aarch64-linux-android/debug/libreadestlib.so` 复制到 `src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/`，仅对打包副本执行 NDK `llvm-strip --strip-debug`，再执行：

```powershell
# 在 apps/readest-app 下先同步名称和上游图标
node scripts/prepare-android-branding.mjs
# 然后在 src-tauri/gen/android 下组装
./gradlew.bat assembleArm64Debug -x rustBuildArm64Debug
```

只有完成原生库编译且复制了当前版本产物后才能跳过 Rust Gradle 任务，避免打包旧库。无需修改 Windows 开发者模式。

此环境的 Java HTTPS 访问 Gradle 仓库握手失败，首次组装使用临时 loopback 缓存转发，从官方仓库以 curl 验证 HTTPS 后提供依赖；没有关闭 HTTPS 证书校验。临时脚本为 `.validation/maven-relay.py` 和 `.validation/gradle-relay.init.gradle`，不属于应用运行依赖。

## 手机验收

安装 APK 后依次检查本地 EPUB/PDF 导入、封面和标题、打开阅读、翻页、退出重启后书架与阅读进度。随后从书架进入 Z-Library，在应用内登录、搜索并下载一本有权获取的书，确认下载结果、自动入库和打开阅读。检查取消下载、重复导入、下载失败和返回书架。

已有移动端入口及共享下载流程专项测试 22 项通过，静态前端构建、类型与 Lint 通过。Android 模拟器验证见 [2026-10-14 Android 验证记录](validation-android-2026-10-14.md)，真实手机和 Z-Library 账号下载仍需验证。

此前 APK 为 `artifacts/android/Z-Reader-0.12.12-arm64-debug.apk`，207,793,549 字节，SHA256 为 `87B49542DAF32EF10C44D86CB7AD75536317AA095C83C40C90CD8672FC525DE9`。包名 `com.bilingify.readest.zreader`，版本 `0.12.12-zreader-dev`（12012），APK v2 签名与 16 KB ZIP 对齐检查通过。此历史产物仍使用旧名称；新的 Readest 名称产物另存，避免混淆。正式发布需要自己的签名与 release 构建。

恢复品牌后的产物：`artifacts/android/Readest-0.12.12-zlibrary-arm64-debug.apk`，209,107,671 字节，SHA256 为 `686443C1608E720134CCB7C9BA8E32F31549FA0FA96FEFA49AE201F13D27A080`。aapt 核验名称为 Readest，包名、版本与 ABI 不变；APK v2 签名和 16 KB ZIP 对齐检查通过。Android 图标从上游已提交资源复制；此次离线 Gradle 组装通过（20 秒）。再次安装时设备列表为空，未完成新资源包的模拟器安装显示验证。前次完整流程验证记录仍保留，不等同于本次新包实测。

上一版多网址配置产物：`artifacts/android/Readest-0.12.12-zlibrary-sites-arm64-debug.apk`，208,107,613 字节，SHA256 为 `2B3192D97E60EAA630FF92FD20B792FE377074F48A594EE5092DE7D39319E28D`。名称、包名、版本和上游图标延续；签名与对齐检查通过。设置中保存网站列表，书架菜单直接进入并按顺序尝试备用站点。见 [多网址验证记录](validation-zlibrary-sites-2026-10-14.md)；本次无连接设备，尚未实测新包的自动换站流程。

上一版访问 UI 产物：artifacts/android/Readest-0.12.12-zlibrary-ui-arm64-debug.apk，208,205,917 字节，SHA256 为 E99B65AE7733C14FFEEB9C30F4019B8C66231A298DF9BE0BCF798F2121A37DBA。签名与对齐检查通过。新增网站列表、名称、换站反馈、底部下载状态和分别重试功能。参见 [访问 UI 验证记录](validation-zlibrary-ui-2026-10-14.md)；原生 UI 尚需手机验收。

发现书籍产物：`artifacts/android/Readest-0.12.12-discover-arm64-debug.apk`，208,222,301 字节，SHA256 为 `472A8E274187059AEB7A2EAE2A7A2CB87604AE4C29AE04A71211567287E85016`。加入外部书单单卡片推荐、左滑不感兴趣、已读记录、Open Library 评分与 Z-Library 带词搜索。签名与对齐检查通过；参见 [发现书籍验证记录](validation-discovery-2026-10-14.md)，新包实机流程待验收。

最新更新保护产物：`artifacts/android/Readest-0.12.12-fork-updates-arm64-debug.apk`，208,222,301 字节，SHA256 为 `14F805E0AD8E7B320290BB3892FA31961DFC13A06BD7E479696221BE20B8354A`。关闭上游版本检查、更新提示及安装入口，防止官方二进制替代 Fork。签名与上一版一致、对齐检查通过；详见 [Fork 更新策略与验证](fork-update-policy.md)，尚需实机覆盖安装验证。
