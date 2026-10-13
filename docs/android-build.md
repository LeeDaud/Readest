# Android 构建与验收

手机 App 为主，Web 验证不能代替 Android 实机验收。Z-Library 在 Android 当前 Activity 内的浏览器中打开，复用已有 native-bridge 下载事件和书籍导入流程。

## 构建

项目版本为 Readest 0.12.12。使用 JDK 17、Android SDK（compile/target 36）、NDK r28c（28.2.13676358）与 Rust `aarch64-linux-android` 目标。

在 `apps/readest-app` 下运行：

```powershell
pnpm tauri android build --apk --debug --target aarch64 --ci
```

`src-tauri/tauri.android.conf.json` 将名称设为 Z-Reader，并使用 `.zreader` 调试包名后缀。调试版最低 Android 8.0（API 26），用于 ARM64 手机。前端构建不会运行上游的 sourcemap 上传命令。

`packages/turso-ext` 保留 upstream 0.6.1 的源代码和许可证，只修正构建脚本按目标平台决定是否链接 `advapi32`，以支持 Windows 主机编译 Android。

## 当前 Windows 环境的兼容处理

工具链和日志保存在忽略的 `.validation/` 中。首次构建在 Rust 原生库成功后遇到 Windows 创建符号链接权限限制。兼容流程将已编译的 `target/aarch64-linux-android/debug/libreadestlib.so` 复制到 `src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/`，仅对打包副本执行 NDK `llvm-strip --strip-debug`，再执行：

```powershell
./gradlew.bat assembleArm64Debug -x rustBuildArm64Debug
```

只有完成原生库编译且复制了当前版本产物后才能跳过 Rust Gradle 任务，避免打包旧库。无需修改 Windows 开发者模式。

此环境的 Java HTTPS 访问 Gradle 仓库握手失败，首次组装使用临时 loopback 缓存转发，从官方仓库以 curl 验证 HTTPS 后提供依赖；没有关闭 HTTPS 证书校验。临时脚本为 `.validation/maven-relay.py` 和 `.validation/gradle-relay.init.gradle`，不属于应用运行依赖。

## 手机验收

安装 APK 后依次检查本地 EPUB/PDF 导入、封面和标题、打开阅读、翻页、退出重启后书架与阅读进度。随后从书架进入 Z-Library，在应用内登录、搜索并下载一本有权获取的书，确认下载结果、自动入库和打开阅读。检查取消下载、重复导入、下载失败和返回书架。

已有移动端入口及共享下载流程专项测试 22 项通过，静态前端构建、类型与 Lint 通过。Android 模拟器验证见 [2026-10-14 Android 验证记录](validation-android-2026-10-14.md)，真实手机和 Z-Library 账号下载仍需验证。

本次 APK 为 `artifacts/android/Z-Reader-0.12.12-arm64-debug.apk`，207,793,549 字节，SHA256 为 `87B49542DAF32EF10C44D86CB7AD75536317AA095C83C40C90CD8672FC525DE9`。包名 `com.bilingify.readest.zreader`，版本 `0.12.12-zreader-dev`（12012），APK v2 签名与 16 KB ZIP 对齐检查通过。此产物是调试验收包；正式发布需要自己的签名与 release 构建。
