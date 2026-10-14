# Fork 同步、验证与发布

仓库：LeeDaud/Readest。维护及默认分支 `codex/zlibrary-integration`，main 保留上游镜像，master 保留本地历史。官方发布、R2、Docker、Vercel、nightly、原上游 Android 定时任务及 Nix 自动修改任务均限官方仓库运行。

## 自动升级

`.github/workflows/fork-upstream-sync.yml` 每 6 小时查询一次 readest/readest 的稳定 Release，另支持手动触发。仅 `FORK_SYNC_ENABLED=true` 时运行，忽略非正式 tag；固定上游 tag 的提交，按普通 merge 保留我们的修改。已合并版本跳过；已有升级分支也会合入维护分支的新提交，不强推、不自动丢弃冲突。

候选分支为 `codex/upstream-vX.Y.Z`，PR 指向维护分支。工作流用显式可复用调用执行后续验证，不依赖 GITHUB_TOKEN 的 push 再触发 PR CI。

## Android 验证与签名

`.github/workflows/fork-android-release.yml` 可以从同步流程调用，或手动指定分支/提交。

1. 固定源码 SHA，验证 Z-Library、推荐、Readest 名称、官方更新禁用与发布隔离。
2. 初始化锁定子模块、安装依赖，执行类型、修改模块 Lint 和专项回归测试。
3. 在 Linux 构建 ARM64 调试包，使用固定的 Fork 签名；核验包名 `.zreader`、APK 签名和 16 KB ZIP 对齐，输出 SHA256。
4. 构建 x86_64 原生测试包，API 34 模拟器安装并执行现有 Android CDP 导入、阅读和交互测试。拒绝零测试或跳过测试的报告，不把 Web 结果冒充手机验证。
5. 把 `fork/android-validation` 状态写到实际候选 SHA，避免可复用流程的默认分支 SHA 与候选提交混淆。
6. 只有成功后才能上传验证产物和创建草稿 Release。编译、签名、模拟器或测试失败时，不合并、不发布。

Secrets：`FORK_ANDROID_KEYSTORE_BASE64`、`FORK_ANDROID_KEY_PASSWORD`、`FORK_ANDROID_KEY_ALIAS`。用户已授权使用既有调试签名；不会提交密钥到 Git，也不展示密钥内容。工作流结束后删除临时签名文件。调试签名用于当前安装连续性，不声称已迁移正式发行密钥。

## 发布策略

默认 `FORK_AUTO_PUBLISH=false`：自动创建 PR、验证并生成草稿，不自动合并或公开发行。待首次流程通过并启用后，`FORK_AUTO_PUBLISH=true` 会让后续版本在同样验证门槛后合并 PR、发布测试版。

手动流程的 `publish=true` 同样必须先完成全套检查。PR 合并使用已验证 head SHA，遵守维护分支保护；发布前再次确认此 SHA 已进入维护分支。没有 PR 的手动发布也必须是维护分支已有的提交。

Release tag 由基线版本与源码 SHA 前 12 位组成，例如 `fork-v0.12.16-abcdef012345`。一个修订一个 tag，不覆盖已经公开发布的版本。包为 Android ARM64 debug，Release 标记 prerelease；包含 APK、SHA256 和模拟器测试结果。发布说明明确上游基线、源码、Fork 功能和真实网站验收范围。

应用内的自动更新仍关闭：源码自动合并、GitHub 自动发布和手机自动安装是三件不同的事。自己的更新清单及公钥完成前，不能恢复官方更新入口。

## 失败与恢复

- merge 冲突：自动任务失败，保持维护分支不动，在升级分支人工处理，不用 ours/theirs 覆盖整个文件。
- 测试/构建失败：修复候选分支后重新运行验证。模拟器不能启动或全部跳过也算失败。
- 维护分支或 PR head 在构建期间变化：禁止以旧 SHA 合并；同步任务下一轮把维护分支新提交合入候选并重新验证。
- 已发布同一源码修订：保留现有资产，幂等跳过。草稿可重跑补齐失败上传。
- 网站登录、验证码、下载额度和真实网络不由 CI 绕过。模拟器验证基本导入阅读；真实 Z-Library 搜索下载及实体手机交互仍需验收。

启用后可在仓库 Actions 页查看同步与验证日志，在 Pull requests 页处理升级，在 Releases 页查看自己的安装包。不要在集成分支使用 GitHub 的 Discard commits。
