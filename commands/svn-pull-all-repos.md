---
description: "安全更新工作区内一个或多个 SVN 工作副本；保留本地修改，冲突时停止并报告"
agent: amagi-leader
---


# 批量更新 SVN 工作副本

$ARGUMENTS

## 执行授权（直接执行，无需逐步确认）

主上显式调用本命令即授权直接执行。按下方范围一次性串行处理全部选中工作副本：**不要逐副本或逐步骤向主上确认，也不要先复述计划等待回复**。仅在命中下列「停止条件」时停下并在最终报告列明；未命中即一路执行到底。

停止条件（仅限于此）：

- update 前已存在 `C`、树冲突或工作副本锁异常；
- update 后产生文本/属性/树冲突（不自动 resolve，列出冲突路径）；
- 网络/认证失败（只报告并继续下一副本）。

本地未提交修改允许保留并参与 SVN 三路合并，未跟踪文件（`?`）不受影响——这两类**不是停止条件**，记录受影响路径后继续。本命令不执行 add/delete/commit。

SVN 为集中式版本控制，**拉取动作即 `svn update`**。SVN 没有 Git 的 stash/rebase：本地未提交变更无法暂存，`update` 会直接将远程变更与本地变更做三路合并，必要时产生冲突（`C` 状态）等待人工处理。本命令不会自动选择 mine/theirs，也不会清理冲突。

## 范围与认证

从当前目录向上定位 `projects-memory/projects/registry.json`，扫描其工作区直接子目录和 registry 的 `projectPath`；找不到时使用当前工作区根。以根目录存在 `.svn` 且 `svn info` 成功识别工作副本，规范化路径后去重。参数非空时只处理名称/路径精确匹配项。

默认使用 SVN 缓存凭证；可传 `--username <name>`。密码只能由交互认证、受限权限的 SVN 配置/认证缓存或运行环境安全注入，禁止写入 `$ARGUMENTS`、命令文档、报告或进程参数；无法安全认证时停止。

## 三路合并行为

本地未提交变更与 `update` 拉取的远程变更直接交互：

- 文本文件本地 `M` + 远程对该文件也有改动：`update` 自动三路合并，可能产生冲突 `C`。
- 二进制文件本地 `M` + 远程也有改动：二进制无法合并，`update` 直接标记冲突。
- 本地未跟踪文件（`?`）：不受 `update` 影响。

因此本命令允许本地修改保留并参与合并，但先记录受影响路径；冲突一律停止，不自动 resolve。

## `svn update` 输出标识

`update` 输出每行前缀表示该条目的处理结果：

| 标识 | 含义 |
|---|---|
| `U` | Updated — 远程改动干净更新到本地 |
| `A` | Added — 远程新增的文件/目录 |
| `D` | Deleted — 远程已删除的文件/目录 |
| `G` | merGed — 自动三路合并成功 |
| `C` | Conflict — 冲突，需手动解决 |

末行形如 `Updated to revision 566.` 给出新 revision。

## 每工作副本流程

串行处理：

1. 读取 `svn info --show-item url/revision` 与 `svn status`，记录 `M/A/D/?/!/C/~`。已有 `C`、树冲突或工作副本锁异常时不 update，直接报告。
2. 本地修改允许保留并参与 SVN 三路合并，但先向报告记录受影响路径；`?` 不受 update 影响。不得 revert、resolve、删除或覆盖本地修改。
3. 执行 `svn update <path>`，保留完整退出码与状态摘要。失败即停止该副本，不做自动恢复覆盖。
4. 再次运行 `svn status` 与 `svn info --show-item revision`。出现文本、属性或树冲突（含树冲突 `svn info` 中的 `Tree conflict` 描述）时立即将该副本标记失败，列出冲突路径与 `.mine/.rOLD/.rNEW` 等辅助文件；不执行 `svn resolve --accept ...`。
5. 无冲突时报告 old/new revision 及 `U/A/D/G` 摘要。此命令不执行 `svn add/delete/commit`。

网络或认证失败只报告并继续下一副本；不得在报告中回显凭据。首次 checkout 不在本命令范围。

## 查看 SVN 中文 log

`svn log` 默认输出在中文 Windows GBK 终端会显示乱码，这是**终端渲染问题，存储无损**（与提交入库时的存储损坏不同）。正确查看中文 log：

- 用 `svn log --xml` 直接读取 UTF-8 存储内容；或
- 先执行 `chcp 65001` 将终端切换为 UTF-8 再查看。

## 报告

```text
【SVN 批量更新报告】
- 扫描根/选中范围：{roots/wcs}
- 已更新：{wc: rOLD -> rNEW, U/A/D/G 摘要}
- 已最新：{wcs}
- 保留的本地修改：{wc: paths}
- 冲突待决策：{wc: text/property/tree + paths}
- 跳过/失败：{wc: 阶段与错误}
- 安全确认：未 revert、未自动 resolve、未提交
```

## 与 Git 版本差异速查

| 维度 | `pull-all-repos`（Git） | `svn-pull-all-repos`（SVN） |
|---|---|---|
| 核心动作 | `git fetch` + 快进 merge | `svn update` |
| 本地变更处理 | 干净工作区才快进，dirty 即跳过 | 不 stash，本地修改直接参与三路合并 |
| 冲突单元 | 行级 / hunk | 文件级 / 属性级 / 树冲突 |
| 远程差异感知 | `git fetch` + behind/ahead 比较 | 无本地差异概念，update 直接到位 |
| 离线操作 | 支持 fetch/merge 分离 | 不支持，update 必须连远程 |
| 网络代理 fallback | 命令级 `git -c http.proxy` | 通过 `~/.subversion/servers` 配置 |
