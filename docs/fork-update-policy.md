# Fork 更新策略

本项目显示名称与图标沿用 Readest，但二进制包含 Z-Library 和发现书籍功能。上游发布的安装包不包含本 Fork 修改，不能作为本项目的应用更新。

## 当前：手动安装本项目版本

目前未配置自己的 origin、发布服务和更新签名。因此 `src/services/forkUpdatePolicy.ts` 固定关闭更新，不提供用户开关：

- NativeAppService 不声明可用应用更新能力，设置中的更新渠道选项不显示。
- `checkForAppUpdates` 对自动、手动、stable 和 nightly 均直接返回，不访问官方服务、不显示新版本提示。
- 不把上游变更日志作为 Fork 新版本公告展示。
- 更新弹窗即使由旧链接或其他组件直接打开，也不检查或下载安装包，改为显示手动更新说明。
- `tauri.conf.json` 的 updater endpoints 清空，保留上游公钥字段但当前不用；未来启用 Fork 签名时必须替换，不能继续信任上游二进制作为 Fork 更新。
- “关于”页面说明应安装本项目发布的安装包，应用名称仍为 Readest。

已安装的旧 APK 不会自动获得这次保护。需要先安装本次修复包；之后应用不再提示安装官方 Readest 更新。保留相同包名与调试签名，安装覆盖同一 Fork 即可，不需先卸载。官方 Readest 包名与本 Fork 的 `.zreader` 调试包名不同；不应把安装官方包当作 Fork 更新。

## 后续：独立发布渠道

1. 配置自己的 Fork 仓库和发布地址。
2. 获取 upstream 更新，在独立升级分支合并、解决冲突，验证书架、阅读、Z-Library、推荐与 Android 实机流程。
3. 给 Fork 定义独立递增的发布版本与 Android versionCode，保留稳定应用 ID。正式分发需持续保存自己的 Android 签名密钥；不要用新签名覆盖现有安装而期待系统接受。
4. 发布本项目安装包、变更说明与更新清单，记录正确的平台/架构、校验信息与下载地址。
5. 更新 stable/nightly 清单、变更日志地址和 Tauri/自定义安装路径的验证公钥。验证 manifest 及安装包来源，不能只把 `FORK_UPDATES_DISABLED` 改为 false 而仍使用上游常量。
6. 最后恢复检查入口，显示本项目的版本信息；可另设“查看 Readest 上游更新”链接用于阅读公告，不连接安装按钮。

代码同步和用户安装是两个独立流程：维护者合并上游源码保留修改，再发布经验证的 Fork 包；用户只安装 Fork 包。

## 本次验证（2026-10-14）

更新相关 4 个测试文件、59 项通过；保留上游更新算法测试时显式模拟可用渠道，另外单独验证 Fork 实际关闭策略、Android/macOS 旧弹窗拦截及关于页面的说明。TypeScript、修改模块 Biome Lint、静态前端构建通过。

Android ARM64 原生库编译通过；按现有 Windows 符号链接兼容流程组装，Gradle 22 秒成功。新包 `artifacts/android/Readest-0.12.12-fork-updates-arm64-debug.apk` 大小 208,222,301 字节，SHA256 `14F805E0AD8E7B320290BB3892FA31961DFC13A06BD7E479696221BE20B8354A`。Readest 名称、`.zreader` 包名及版本不变，签名证书与上一版发现书籍包一致，APK v2 签名和 16 KB ZIP 对齐检查通过。当前无连接设备，本次尚未完成实机覆盖安装、旧设置迁移和启动验证。
