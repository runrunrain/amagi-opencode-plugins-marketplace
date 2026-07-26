---
description: "敏感文件守卫与验证通过后将工作区内授权 Git 仓库的本地变更提交并推送；分叉、冲突或归属不明时停止"
agent: amagi-leader
---


# 批量提交并推送 Git 仓库

$ARGUMENTS

## 执行授权（直接执行，无需逐步确认）

主上显式调用本命令即授权直接处理所选仓库：**不要逐仓库或逐步骤向主上确认，也不要先复述计划等待回复**。前置门禁（secret 扫描、归属核对、验证）满足即一路执行到提交推送；命中下列「停止/跳过条件」时才停下，在最终报告列明。

提交侧唯一保留的拦截是 `commit-guard`（敏感文件守卫）：拦 `.env`/私钥/凭据/secret 类文件、`node_modules/`、`.git/` 内部、超大文件（>10MB），与本命令的疑似 secret 扫描停止条件天然对齐。功能变更的审核由编排审核链承载，见 `resources/core/collaboration/workflow-rules.md`；提交时不重复审核，**命令执行中不需要主上手动确认审核**。

停止/跳过条件（出现即报告并跳过该仓库，不询问"是否继续"）：进行中的 Git 操作、命中疑似 secret、lint/typecheck/test/build 失败、远端领先或分叉、归属不明/非授权 owner、无变更。原约束仍生效：不授权覆盖冲突、泄露凭据或推送归属不明的远程。

## 范围与归属

从当前目录向上定位 `projects-memory/projects/registry.json`，扫描其工作区直接子目录与 registry 中的 `projectPath`；找不到 registry 时使用当前工作区根。环境变量仅作兼容回退，不使用设备硬编码路径。按参数精确筛选并列出最终仓库集合。

每个仓库必须有 origin、当前分支和明确归属。优先用 `gh repo view --json nameWithOwner` 与当前认证身份/用户配置的 allowlist 核对；SSH/非 GitHub 远程使用本地受信配置。归属不明、无写权限或非授权 owner 时只报告，不提交、不推送。读取 origin URL 用于报告标注，但不硬编码任何具体账号作为通用归属规则。

## 每仓库门禁

串行执行：

1. 检查正在进行的 Git 操作、`git status --porcelain=v1`、未跟踪文件、上游和 origin；存在 merge/rebase/cherry-pick/bisect 时停止该仓库。
2. 只按路径和字段名扫描疑似 secret（`.env*`、私钥/证书、credentials、token/secret 文件）；命中即停止，禁止打印值。读取完整 diff，确认全部变更属于用户请求；不得把其他会话或其他人的改动混入提交。
3. 运行仓库可发现的 lint/typecheck/test/build。失败即停止，不提交。无标准入口时报告已执行的替代验证。
4. `git fetch origin <branch>`，仅允许远端与本地同点或本地单向领先。远端领先或分叉时停止，不自动 stash、rebase、merge、checkout 或丢弃变更。
5. 敏感文件守卫确认：提交前确认敏感文件守卫已覆盖最终待提交集合——`.env*`/私钥/凭据/secret 类文件、`node_modules/`、`.git/` 内部、超大文件（>10MB）不进入提交；命中即停止。与第 2 步疑似 secret 扫描是同一条防线，不重复扫描、不打印值。

## Marketplace 版本同步

仅对 `amagi-plugins-marketplace` 且变更命中 `plugins/<name>/` 时执行：

1. **识别受影响插件**：从实际 diff 提取变更路径，匹配 `plugins/<plugin-name>/` 前缀，得到受影响插件集合。`.claude-plugin/marketplace.json` 自身的改动只影响 `metadata.version`，不归属某个插件。
2. **核对两处版本**：每个受影响插件有两个版本位置——`plugins/<name>/.claude-plugin/plugin.json` 的 `version`，以及 `.claude-plugin/marketplace.json` 中 `plugins[]` 数组对应 `name` 条目的 `version`。
3. **判断是否已更新**：
   - 若该插件的 `plugin.json` 已在变更列表中 → 变更者已自行管理版本，保留，不再递增。
   - 若不在变更列表中 → 变更者未更新版本，提交前将该插件 PATCH +1（`MAJOR.MINOR.PATCH` → `MAJOR.MINOR.(PATCH+1)`），并同步 marketplace 条目使两处一致。
4. **停止条件**：任何非 SemVer、两处不一致、或多个插件版本目标存在歧义，都停止，不擅自选定真相源。
5. **metadata.version**：仅在仓库现行发布约定要求时才同步 `.claude-plugin/marketplace.json` 的 `metadata.version`；修改后重跑 JSON 解析和相关 prompt/eval/build，并复查最终 diff 仍全部属于用户请求。

## 提交信息规范

基于真实 diff 生成，遵循仓库现有历史风格（中文 conventional commits）：

格式模板：

```text
<type>(<scope>): <简短描述>

- <变更项1>: <说明>
- <变更项2>: <说明>

<补充说明（可选）>

Co-Authored-By: OpenCode <noreply@opencode.ai>
```

| type | 说明 |
|---|---|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档变更 |
| style | 代码格式（不影响功能） |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具/依赖 |

生成规则：

1. 分析变更文件内容，确定 type 和 scope。
2. 生成简短的中文描述（不超过 50 字符）。
3. 用 `-` 列表列出主要变更项。
4. 按仓库历史约定追加 `Co-Authored-By` 署名；用户明确要求不带时去掉。

## 提交与推送

前置门禁通过后，按归属清单精确 `git add -- <paths>`，复核 staged diff 与已确认变更范围一致。**无变更不创建空提交**。

执行 `git commit` 后再次验证 HEAD 与工作区；仅使用普通 `git push origin <branch>`。**禁止 force push**。网络重试只能用已有配置或单次命令级 `git -c http.proxy=... -c https.proxy=...` 代理已配置的本地端口，不修改 Git 全局配置。某仓库失败后停止该仓库并继续下一项，不撤销用户改动。

## 报告

```text
【Git 批量推送报告】
- 范围/归属：{repo -> owner}
- 成功：{repo: commit SHA, branch, remote}
- 版本更新：{plugin old -> new}
- 跳过：{无变更/非授权/敏感文件命中}
- 失败：{repo: 阶段、命令与错误}
- 验证：{repo -> commands/results}
- 敏感文件守卫：{通过 或 命中路径}
- 工作区：{clean 或保留的用户变更}
```
