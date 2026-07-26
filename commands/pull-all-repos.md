---
description: "安全拉取工作区内一个或多个 Git 仓库；仅允许干净工作区快进更新，冲突或分叉时停止报告"
agent: amagi-leader
---


# 批量拉取 Git 仓库

$ARGUMENTS

## 执行授权（直接执行，无需逐步确认）

主上显式调用本命令即授权直接执行。按下方范围一次性串行处理全部选中仓库：**不要逐仓库或逐步骤向主上确认，也不要先复述计划等待回复**。仅在命中下列「停止条件」时停下并在最终报告列明；未命中即一路执行到底。停止条件是硬边界，不是"逐项询问是否继续"。

停止条件（仅限于此）：

- 仓库处于 merge/rebase/cherry-pick/bisect 等进行中操作；
- 工作区有 tracked/untracked 变更或未完成操作（不 stash、不清理、不覆盖，跳过并报告）；
- behind>0 且 ahead>0 的分叉（不 rebase/merge/checkout）；
- fetch 网络/认证失败，按已有代理配置重试一次后仍失败。

无 origin、detached HEAD、无远程跟踪属「跳过」（非停止），报告标注后继续下一仓库。本命令只读同步，绝不提交或推送。

## 范围发现

从当前目录向上查找 `projects-memory/projects/registry.json`，以其工作区根目录为默认扫描根；找不到时使用当前工作区根。`AMAGI_WORKSPACE_ROOT` 仅作兼容回退。不得硬编码设备路径。

扫描根目录的直接子目录及 registry 明确注册的 `projectPath`，以 `git -C <path> rev-parse --show-toplevel` 去重识别仓库。排除 `projects-memory`、`.claude`、`node_modules`、`dist`、`tmp/temp` 等非项目目录。参数非空时只保留名称或规范化路径精确匹配的仓库；无匹配即停止。

## 每仓库流程

串行处理，每个仓库独立记录结果：

1. 读取 `git status --porcelain=v1`、当前分支、origin URL 和上游。无 origin、detached HEAD 或无远程跟踪时跳过并报告。
2. 若存在 tracked/untracked 变更、正在进行 merge/rebase/cherry-pick/bisect，**不 stash、不清理、不覆盖**，跳过该仓库并报告状态。
3. `git fetch --prune origin <branch>`；网络错误可用用户已有代理配置，或以单次命令级 `git -c http.proxy=... -c https.proxy=...` 重试已配置的本地端口，不修改全局/仓库配置。
4. 计算 `behind/ahead`：

| 状态 | 动作 |
|---|---|
| 0/0 | 已最新 |
| behind>0, ahead=0 | `git merge --ff-only origin/<branch>` |
| behind=0, ahead>0 | 不修改，仅报告本地领先 |
| behind>0, ahead>0 | 分叉；停止并报告，不 rebase/merge/checkout |

5. 更新后复查 `git status --porcelain=v1`、`git rev-parse HEAD` 和最近提交。失败即停止该仓库，不尝试自动冲突解决，然后继续下一个仓库。

## 归属标注

步骤 1 读取到的 origin URL 也用于归属标注：与当前认证身份（`gh api user`）或用户配置的 allowlist 核对，识别仓库 owner。拉取不影响远程，因此非自有仓库仍可只读同步，但须在报告中标注其 owner，不硬编码任何具体账号作为通用归属规则。本命令绝不提交或推送。

## 报告

```text
【Git 批量拉取报告】
- 扫描根与选中范围：{roots/repos}
- 已快进：{repo: old..new, commits}
- 已最新：{repos}
- 本地领先：{repo: ahead}
- 跳过：{repo: dirty/无上游/操作进行中}
- 分叉：{repo: ahead/behind，需用户选择策略}
- 失败：{repo: command/error}
- 用户变更：均未 stash、覆盖或清理
```
