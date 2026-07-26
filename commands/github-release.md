---
description: "经测试与提交前敏感文件守卫确认后执行单仓库 GitHub Release：PATCH 版本、提交、tag、推送、Actions 与资产验证"
agent: amagi-leader
---


# GitHub Release

$ARGUMENTS

这是显式发布命令，只处理当前单个 Git 仓库。允许在全部门禁通过后提交、打 tag、推送并创建 Release；不授权 force push、覆盖 tag/资产、泄露 secret 或发布归属不明仓库。

## 参数

只接受 `version`、`message`、`tag`、`branch`、`plugin` 键；未知键或重复冲突值停止。`message` 仅为无空格 slug 候选，最终提交信息必须来自实际 diff。

- 未指定版本：从唯一发布目标读取当前 SemVer，目标为 PATCH +1。
- 指定 `version`：必须恰好等于当前 PATCH +1。
- `tag` 必须等于 `v{target_version}`；仅给 tag 时反解并执行同一校验。
- 多插件仓库存在多个候选时必须用 `plugin=<name>` 消除歧义。

## 发布前门禁

1. 确认仓库根、当前/目标分支、origin、上游、`git status` 与近期提交风格。用 `gh auth status` 和 `gh repo view --json nameWithOwner` 核对当前身份对 origin 的写权限；不得硬编码 owner。无权限、无 origin、detached HEAD 或首次远端分支发布时停止。
2. 检查 merge/rebase/cherry-pick/bisect 状态。读取变更路径后先做敏感路径/字段门禁（`.env*`、私钥/证书、credentials、token/secret），命中时只列路径并停止，不打印值；随后阅读完整 diff，确认全部变更属于本次发布。
3. `git fetch origin <branch> --tags`，仅允许远端与本地同点或本地单向领先。远端领先/分叉且有本地变更时停止；干净工作区也只允许用户另行选择 `pull --ff-only`，不自动 rebase/merge。
4. 检查本地和远端均不存在目标 tag，且 GitHub Release 不存在；冲突时停止并选择新 PATCH，不删除、覆盖或重写。
5. 禁止 `--force`/`--force-with-lease`、`git reset --hard`、`git checkout` 覆盖、`git clean`、自动丢弃用户变更。

## 测试与版本

在版本修改前发现并运行仓库定义的验证：优先读取贡献/发布文档与 package scripts，再执行适用的 lint、typecheck、test、build；Python 使用项目声明的 pytest/构建入口，Makefile 使用实际 target。依赖安装只在仓库流程明确需要时执行，不以 `npm install` 改锁文件作为默认探测。任一失败停止。

版本文件按目标实际存在性读取：

- `package.json`，以及存在时 `package-lock.json` 根版本和 `packages[""].version`；
- 根 `.claude-plugin/plugin.json` 或 `plugins/<plugin>/.claude-plugin/plugin.json`；
- `.claude-plugin/marketplace.json` 中目标插件条目；仅当仓库现行约定要求时更新 `metadata.version`。

同一发布目标的现有版本必须一致且符合 `MAJOR.MINOR.PATCH`。用 JSON 解析器精确更新到 PATCH +1，保持未知字段与合法格式；不得按字符串全局替换。更新后重新解析并逐字段核对。

版本修改后重新运行关键 lint/typecheck/test/build，并复查完整 diff、敏感路径和生成/锁文件一致性。失败即停止，保留变更供诊断。

## 提交前确认

发布提交不设审核门禁：功能变更的审核由编排审核链承载，见 `resources/core/collaboration/workflow-rules.md`；本命令不在提交时重复审核。

提交前确认敏感文件守卫已覆盖**最终待提交 diff**——`.env*`/私钥/凭据/secret 类文件、`node_modules/`、`.git/` 内部、超大文件（>10MB）不进入提交；命中即阻止发布。该确认与「发布前门禁」第 2 步的敏感路径扫描是同一条防线，不重复扫描、不打印值。

## 提交、tag 与推送

1. 精确暂存本次确认路径；再次核对 staged diff、测试证据与版本字段。没有变更则停止，不创建空提交。
2. 按仓库历史生成准确的 Conventional Commit（通常 `chore(release): 发布 vX.Y.Z`，若实际 diff 以功能/修复为主则准确选择 type/scope），提交正文列出真实变更和验证，不固定添加署名。
3. 创建 annotated tag `v{version}`，指向刚创建的 release commit。
4. 先普通推送分支，再普通推送 tag。网络失败只使用用户已有配置或单次命令级代理重试，不修改全局/仓库 Git 配置，不 force。

阶段失败时保留实际状态并停止：本地 tag 已创建时不删除；分支已推而 tag 失败时只允许后续受控补推；tag 已远端存在后任何修复走新 PATCH。

## Release 与 Actions

使用已认证 `gh`：若该 tag 的 Release 不存在，按仓库发布惯例创建（默认非 draft、非 prerelease）；已存在则视为前置冲突，不修改。Release target 必须等于 release commit。

从 `gh run list` 找出 `headSha == release commit` 且由该发布流程触发的 run，使用 `gh run watch <id> --exit-status` 等待结论。成功报告必须包含 workflow URL。没有匹配 run、结论失败或仓库声明使用其他 CI 却无与 commit/tag 绑定的成功证据时，发布不得标记完成。

## 资产验证

Actions 成功后用 `gh release view/download` 下载到临时目录，记录资产名并验证：

1. Release tag/target/draft/prerelease 与预期一致。
2. 资产命名遵循仓库惯例且无旧版本；zip 内 manifest/plugin/package/update metadata 的版本等于目标版本。
3. 存在 checksum 文件时执行 SHA256 校验；不存在时计算每项 SHA256 写入报告。
4. 发现 stale asset、错误版本或重复资产时停止，不删除/覆盖 Release 或资产；修复后发布新 PATCH。

验证后清理本地临时下载目录，不影响仓库。最后核对 `git status`、HEAD/tag、远端分支、Release URL 和资产清单；工作区不 clean 时报告实际剩余内容，不宣称完成。

## 报告

```text
【GitHub Release 报告】
- 仓库/分支：{owner/repo @ branch}
- 版本：{old -> new}
- Commit/Tag：{sha / tag}
- Release URL：{url}
- Workflow URL：{url；成功必填}
- 敏感文件守卫：{通过 或 命中路径}
- 验证：{commands/results}
- 资产：{name -> sha256；manifest/update 版本}
- 工作区：{clean/剩余变更}
- 总体：PASS/FAIL（失败阶段与可恢复动作）
```

恢复原则：测试/版本/提交前确认失败不推送；commit 失败保留暂存；本地 tag 不删除；任何已推 tag/Release 不重写，后续修复用新 PATCH。
