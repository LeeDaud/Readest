# LeeDaud/Readest 首次同步与自动发布规划

核验日期：2026-10-14。仓库：https://github.com/LeeDaud/Readest，公开仓库，parent 为 readest/readest，默认分支 main。已在本地配置 origin 并 fetch；尚未推送任何分支、修改远程默认分支、创建 PR 或发布 Release。

## 现状

- 本地维护分支：`codex/zlibrary-integration`，核验时 HEAD 为 `bfc0dbd`，基于 Readest 0.12.12。
- 远程 `origin/main`：`3cc39ad`，package.json 版本 0.12.16。
- 两条分支相对共同历史：远程独有 33 个提交，本地独有 9 个提交。先同步现有功能，再升级，避免把两类工作混在一起。
- 共同历史以来，本地约 102 个文件有变化，包括历史主题、原生集成和验证资料；不能仅复制 zlibrary 目录，也不能用上游覆盖整个工作区。

## 第一步：保存目前所有有效修改

首次推送只创建远程 `codex/zlibrary-integration`，完整保留以下提交及此前的上游历史，不重写远程 main：

| 提交 | 内容 |
| --- | --- |
| 3aeb1a9 | 初始 Readest 基线 |
| 8fcfec7 | 微信读书主题基础设施 |
| 861b478 | 合并 Readest 0.12.12、Tailwind 4 迁移 |
| 385ff54 | 应用内 Z-Library 浏览、下载和入库 |
| e1964ee | Readest 名称与图标、Fork 维护整理 |
| bbc0cac | 多网址配置及顺序回退 |
| 2e4b405 | 网站访问与下载 UI 优化 |
| 89887db | 单卡片推荐、左滑、已读记录、评分和带词搜索 |
| bfc0dbd | 禁止官方安装包替换 Fork 的更新保护 |

本次维护文档也纳入同步。已有测试、Android/iOS 原生浏览器修改及被必要地 vendoring 的构建修正一起保留；不改动阅读引擎子模块的锁定版本。

未提交项目单独处理：

- `apps/readest-app/AGENTS.md` 被改成单行 `AGENTS.md`。这是指引文件截断，不是应用功能；本次规划不覆盖这项既有修改，也不把它混入首次功能推送，后续单独修复。
- `src-tauri/Cargo.toml` 与 AndroidManifest.xml 显示工作区修改，但 Git 内容 diff 为空，属于换行/工作区状态，不另造功能提交。
- `.validation/`、依赖、缓存、SDK、构建目录和 APK 不入 Git。环境变量文件按已跟踪的公共模板与本地私密配置区分，不上传私密配置。
- `master` 继续作为本地历史备份，不强推、不重置；如需远程历史备份另建明确命名的分支，首次同步不必推送。

计划执行命令：`git push -u origin codex/zlibrary-integration`。当前没有执行该命令。

## 第二步：分支与仓库设置

推荐将远程默认分支设为 `codex/zlibrary-integration`，让仓库首页和新克隆获取我们的应用；`main` 保留上游镜像用于比较。后续按同一规则处理，不把远程 main 当成产品发布分支。

维护分支保护禁止强推和删除；升级分支完成检查后通过 PR 合并。自动合并应遵守保护规则，不能以管理员权限绕过检查。GitHub “Sync fork” 只适用于上游镜像 main，不能用“Discard commits”处理集成分支。

开始 Fork 自动发布前，禁用或加 Fork 限制到继承的官方 `release.yml`、`nightly.yml`、`upload-to-r2.yml` 等发布流程。它们存在 readest/readest 下载地址、官方 R2/Sentry 配置，不能仅复制官方 secrets 名称便当作 Fork 发布。源码检查类 CI 可以保留，另核验其分支条件、权限和 secret 依赖。

## 第三步：升级到 0.12.16

从已保存的维护分支创建 `codex/upstream-v0.12.16`，核对官方稳定 Release/tag 对应提交后执行普通 merge。不从远程 main 重建功能、不 cherry-pick 整个历史、不自动选择 ours/theirs。

重点检查：系统设置新增字段保存、手机应用内浏览器及 download bridge、搜索回退、导入去重、读后进度、书架入口、推荐手势及更新保护。上游也修改相同文件时，冲突按实现处理，不能声称每次都可无人工适配。

完成依赖/子模块初始化、类型与 Lint、专项及必要回归测试、静态前端构建、Android 原生编译与 APK 签名检查。Android 模拟器验证正常启动、导入与阅读；真实手机补测网站搜索、下载入库和推荐交互。Web 通过不能替代手机验收。成功后再合并维护分支、发布新版。

## 第四步：首次发布与固定签名

当前可用产物为 `Readest-0.12.12-fork-updates-arm64-debug.apk`，已完成包校验但仍待实机覆盖安装。APK 约 199 MiB，应上传 GitHub Release，不放进 Git 提交。

发行版命名明确标示 Fork 基线和修订，例如 tag `fork-v0.12.16-r1`，显示名称与图标继续 Readest。Android applicationId 必须与官方包区分，versionCode 独立递增，签名密钥固定备份。若要继续覆盖当前 `.zreader` 调试包，需要保持相同 applicationId 和证书；更换正式签名需明确迁移/共存方案，不能保证覆盖原调试安装。

先创建草稿 Release，附 APK、SHA256、上游基线、Fork 功能及验证范围，再正式发布。暂不恢复 App 自动更新；自己的更新清单、平台下载地址和验证公钥就绪后再启用，禁止回落官方更新源。

## 第五步：上游发布后的自动化

目标链路：检测上游稳定 Release → 创建升级分支并 merge → 检查集成功能仍在 → 测试 → Android 构建和模拟器验证 → PR → 合并 → 发布自己的 Release。

- 建议每 6 小时查询一次官方稳定 Release，并提供手动触发；上游 Release 事件不会直接触发另一个 Fork 的工作流。
- tag/commit 固定后构建，不在长任务中反复获取漂移的 main；版本重复则跳过。
- 合并冲突、测试失败、构建失败、签名缺失或分支变化时停止，保留日志与升级分支；不自动丢弃我们的代码。
- 第一阶段自动生成升级 PR 和草稿安装包，待首次 0.12.16 升级及模拟器链路通过后，再启用无冲突版本自动合并/发布；不能把 CI 通过称为所有真实网站流程都已验收。
- 发布使用本仓库 Releases、最小权限 token、固定 Android 密钥；不使用官方 CDN、R2 或官方签名。
- 源码同步与应用自动更新分别配置。自动发布完成，并不代表当前 APK 已能自动更新。

GitHub schedule 只从默认分支运行，可能延迟；`GITHUB_TOKEN` 产生的事件通常不会再次启动其他工作流，因此同步与发布必须明确编排，不能依赖“机器人 push 自然触发下一个 workflow”。官方依据：[事件与 schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)、[GITHUB_TOKEN](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)。

## 执行顺序与当前边界

1. 先同步现有维护分支与文档，保留 main。
2. 配置默认分支和 Fork CI 保护。
3. 独立完成 0.12.16 合并和 Android 验证。
4. 准备固定签名与首个 Fork Release。
5. 接入稳定版检测、升级 PR、构建与发布自动化。

目前已核验远程、配置 origin、获取 main 并形成此方案；没有执行推送、升级合并、修改 GitHub 设置或发布。自动化工作流尚未实现/启用，不应将本规划当作已经运行的流水线。
