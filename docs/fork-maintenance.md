# Readest Fork 维护方式

应用名称和图标沿用 Readest，Z-Library 作为新增书源入口维护，优先复用现有移动端浏览器、下载入库与阅读能力。历史主题改动保留，但本次不扩展 UI 重构。

当前工作分支为 `codex/zlibrary-integration`，包含原有本地提交、Readest 0.12.12 上游合并及 Z-Library 集成提交。`master` 保留分支整理前的状态。没有重写历史或重新初始化项目。

`upstream` 为 `https://github.com/readest/readest.git`，只作为上游更新来源。`origin` 已配置为用户创建的公开 Fork `https://github.com/LeeDaud/Readest.git`。首次同步与升级安排见 [同步规划](fork-sync-plan-2026-10-14.md)；不要将本地功能推送到 `upstream`。

在工作区干净时更新上游：

```powershell
git switch codex/zlibrary-integration
git fetch upstream
# 优先合并已核实的稳定发布标签；仅跟踪开发版时使用 upstream/main
git merge <稳定发布标签>
git submodule update --init --recursive
pnpm install
```

解决冲突时优先保留上游阅读引擎和平台能力，再验证新增书源。合并后执行类型/Lint、相关测试和 Android 构建与流程验收。Web 通过不能替代 Android 验收。

Android 配置名称为 Readest，调试包名仍为 `com.bilingify.readest.zreader` 以与原版共存。`scripts/prepare-android-branding.mjs` 会复制已提交的上游图标到 Android 生成资源，并写入 Readest 名称；Tauri Android 构建会自动运行。直接 Gradle 打包前需手动运行该脚本。
