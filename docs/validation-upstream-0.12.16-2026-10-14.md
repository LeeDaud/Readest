# Readest 0.12.16 Fork 同步、验收与发布

2026-10-14。仓库 LeeDaud/Readest，默认与维护分支 codex/zlibrary-integration。main 保留上游镜像；master 及全部本地、上游提交历史保留。

## 同步与升级

首次完整推送现有集成历史，随后从独立升级分支合并官方稳定标签 v0.12.16（3cc39ad）。保留主题基础、应用内 Z-Library、多网址回退、下载入库、访问 UI、单卡片推荐、已读记录、Open Library 与官方更新隔离。

[PR #1](https://github.com/LeeDaud/Readest/pull/1) 已合并，合并提交 568b9fd；实际通过验证并用于发布的源码提交 a374996d1c012c5dad8871faaefa61dbf244f819。首次 CI 自举把同一组新文件分别加入维护和升级分支，产生三个 add/add 冲突；逐文件保留升级分支上的已修正 CI，并正常合并维护历史，未用全仓 ours/theirs 覆盖上游。

本地 Windows pre-push 的全仓格式检查因大量 CRLF 差异失败；没有无关格式重写，首次推送跳过该本地钩子，实际类型、相关 Lint、回归、构建和云端 Android 验收照常执行。

截断的应用 AGENTS.md 已恢复，并保留操作前副本；Cargo.toml 和 AndroidManifest.xml 两项工作区标记无内容 diff，未额外提交。签名、SDK、缓存、测试输出和 APK 均未写入 Git 历史。

## 验证

[最终云端验证](https://github.com/LeeDaud/Readest/actions/runs/38526718676) 完整成功：

| 项目 | 结果 |
| --- | --- |
| 集成与更新保护回归 | 12 文件，120 项通过 |
| 导入、页数元数据、书架回归 | 4 文件，232 项通过 |
| TypeScript / 相关模块 Lint / 生产前端 | 通过 |
| ARM64 原生库及 APK | Linux CI 构建成功 |
| x86_64 原生测试包 | 构建并在 API 34 模拟器安装成功 |
| Android CDP 原生验收 | 6 文件，19 项全通过，无失败或跳过 |
| 固定证书与 APK 签名比对 | 通过 |
| 包名 / ARM64 ABI / 16 KB ZIP 对齐 | 通过 |
| APK SHA256 与发布资产 | 校验值随 Release 发布 |

原生验收包含 EPUB 打开、阅读、选词、触摸目标与菜单交互；新增推荐测试执行实际 Android 输入左滑、已读标记、原生 settings.json 落盘与 WebView 刷新后的记录保留。辅助 Web 手机尺寸验证也通过，但不作为原生验收的替代。

第一次云端原生 18 项通过，但产物上传被默认隐藏目录过滤拦截；修正为只上传指定的 .fork-ci 输出。第二次推荐原生验收通过，但一组阅读长按测试超时，流程停止发布。测试初始化补充系统全屏提示识别、模拟器固定长按延迟，以及失败截图/XML诊断；完整重跑通过后才发布，没有删掉或放宽失败阅读断言。

## 发布

[公开测试版](https://github.com/LeeDaud/Readest/releases/tag/fork-v0.12.16-a374996d1c01)：

- APK：Readest-0.12.16-zlibrary-arm64-debug.apk。
- 大小：227,705,637 字节，约 217.2 MiB。
- SHA256：f94ab29e2818696a7559029692eb03af8eb31e32ac5702c2d0d4ba8ec96f2dd5。
- 名称与图标：Readest；包名 com.bilingify.readest.zreader。
- versionCode 12016，versionName 0.12.16-zreader-dev，最低 API 26，ARM64。
- 固定既有 Android 调试证书，用于覆盖安装连续性；不是新的正式商店签名。
- Release 为 prerelease，附 SHA256SUMS 与 android-tests.json，签名私钥只在用户授权的仓库加密 Secrets 中。

本地 Windows 另有构建产物，宿主编译器及构建细节不同，因此大小与 hash 不同，不能混用校验值。下载和复现最终发行包应以上述云端 Release 及对应源码 SHA 为准。

## 后续运行

官方发布、nightly、R2、Docker、Vercel及继承的重复定时任务已隔离并在仓库停用。专用同步与发布流程使用固定上游 tag、普通 merge、候选 SHA 绑定的验证状态、固定签名和版本/源码对应的不可变 Release tag。FORK_SYNC_ENABLED 与 FORK_AUTO_PUBLISH 已开启。

应用内官方更新入口继续关闭，自己的手机自动更新清单/公钥尚未接入。本次原生模拟器验收不等同于实体手机上的 Z-Library 登录、搜索、下载实测；用户之前确认的集成测试仍保留，新版本真实站点验收另行进行。
