---
description: "敏感文件扫描与验证通过后将工作区内授权 SVN 工作副本的本地变更提交到远程；冲突或归属不明时停止"
agent: amagi-leader
---


# 批量提交 SVN 工作副本

$ARGUMENTS

## 执行授权（直接执行，无需逐步确认）

主上显式调用本命令即授权直接处理所选工作副本：**不要逐副本或逐步骤向主上确认，也不要先复述计划等待回复**。前置门禁（secret 扫描、归属核对、验证）满足即一路执行到提交；命中下列「停止/跳过条件」时才停下，在最终报告列明。

提交侧不设审核门禁：敏感文件防线由本命令的疑似 secret/敏感路径扫描承担，口径与 `commit-guard`（敏感文件守卫）一致——`.env*`/私钥/凭据/secret 类文件、`node_modules/` 等依赖产物、超大文件（>10MB）不进入提交。功能变更的审核由编排审核链承载，见 `resources/core/collaboration/workflow-rules.md`；提交时不重复审核。**命令执行中不需要主上手动确认审核**，也无需逐项询问是否提交。

停止/跳过条件（出现即报告并跳过该副本，不询问"是否继续"）：存在 `C`/`~`/树冲突/工作副本锁异常、命中疑似 secret、验证失败、update 后 out-of-date（`E160024`）或冲突、归属不明。原约束仍生效：不授权提交归属不明、敏感或冲突文件。

SVN 是集中式版本控制，`commit` 直接写远程并生成新 revision（无本地 commit 概念），无 branch/rebase/stash。

## 范围、归属与认证

从当前目录向上定位 `projects-memory/projects/registry.json`，扫描工作区直接子目录及 registry `projectPath`；找不到时使用当前工作区根。以 `.svn` + `svn info` 识别并去重，按参数精确筛选。

提交前读取 `svn info --show-item url`，根据当前项目/用户维护的 allowlist 或明确配置核对 URL 前缀和负责路径。不得内置某 IP、成员名或“主上”账号作为通用归属规则。归属不明确即只报告。

默认使用 SVN 缓存凭证；可传 `--username <name>`。密码仅可由交互、受限配置/缓存或安全环境注入，禁止出现在 `$ARGUMENTS`、命令行、临时提交信息或报告中。

## SVN 状态码参考

`svn status` 第一列状态码，用于判断是否进入提交流程：

| 状态码 | 含义 | 本命令处理 |
|---|---|---|
| `A` | 已标记新增（schedule add） | 在本次确认范围内可直接 commit |
| `M` | 已修改 | 在本次确认范围内可直接 commit |
| `D` | 已标记删除（schedule delete） | 在本次确认范围内可直接 commit |
| `?` | 未纳入版本控制 | 不自动批量 add；仅当被本次请求明确纳入、通过 ignore/敏感检查并复核后精确 `svn add` |
| `!` | 文件缺失（误删/丢失） | 不自动批量 delete；仅当被本次请求明确纳入并复核后精确 `svn delete` |
| `C` | 冲突 | 停止，不 commit，不自动 resolve |
| `X` | 外部引用（svn:externals） | 跳过 |
| `~` | 类型切换异常 | 记录并交用户 |

`svn:ignore` 是未跟踪文件的第一道防线：依赖/构建产物（`node_modules/`、`dist/`、`*.log` 等）应通过 `svn propset svn:ignore` 提前配置；被忽略项不显示为 `?`，因此不会误纳入提交。提交前仍应人工核对 `svn status` 输出。

## 每工作副本门禁

串行处理：

1. 读取 `svn status`、URL 和 revision。存在 `C`、`~`、树冲突或工作副本锁异常时停止；不得自动 resolve/revert。
2. 对 `M/A/D/?/!` 读取实际变更并确认属于用户请求。扫描 `.env*`、私钥/证书、credentials、token/secret 文件；只报告路径，不读取或打印 secret 值。命中即停止。
3. `?` 与 `!` 不自动批量处理：仅在路径已被当前请求明确纳入、通过 ignore/敏感检查并复核内容后，才分别执行精确 `svn add --parents -- <path>` 或 `svn delete -- <path>`。其他项保留并报告。
4. 运行项目可发现的 lint/typecheck/test/build；失败即停止。读取最终 `svn diff` 和 status，生成符合仓库历史的提交信息。
5. 提交前最终确认敏感文件守卫覆盖：待提交路径（含第 3 步新 `svn add` 的项）不含 `.env*`/私钥/凭据/secret 类文件、`node_modules/` 等依赖产物、超大文件（>10MB）；命中即停止。
6. 提交前先 `svn update <path>`。若出现 out-of-date（错误码 `E160024`，远程已有更新）或任何冲突，停止并报告，不选择 mine/theirs，不自动 update 后重试。无冲突后重跑 status、diff、关键验证与敏感文件扫描。

## 提交信息与编码

**提交信息规范（中文 conventional commits）**，基于真实 diff 生成，遵循仓库现有历史风格：

格式模板：

```text
<type>(<scope>): <简短描述>

- <变更项1>: <说明>
- <变更项2>: <说明>

<补充说明（可选）>

Co-Authored-By: OpenCode <noreply@opencode.ai>
```

type 类型：feat（新功能）/ fix（修复 bug）/ docs（文档变更）/ style（代码格式）/ refactor（重构）/ perf（性能优化）/ test（测试相关）/ chore（构建/工具/依赖）。

生成规则：

1. 分析 `svn status` 与变更内容，确定 type 和 scope。
2. 生成简短的中文描述（不超过 50 字符）。
3. 用 `-` 列表列出主要变更项。
4. 按仓库历史约定追加 `Co-Authored-By` 署名；用户明确要求不带时去掉。

**中文编码（中文 Windows 防 log 乱码，关键）**：SVN 客户端按系统 locale（中文 Windows = GBK）解读 commit message 再转 UTF-8 入库。直接用 `-m` 命令行参数或 UTF-8 编码的 `-F` 文件，会被当作 GBK 误读，导致入库后 `svn log` 中文乱码（**存储损坏，非显示问题**）。正确做法是用 GBK + LF 的临时文件经 `-F` 传入，并用 `--xml` 验证存储：

```bash
# 1. 写 GBK + LF 临时文件（msg 为提交信息字符串，须 LF 行尾）
python -c "open('$msgfile','wb').write(msg.replace('\r\n','\n').encode('gbk'))"
# 2. 经 -F 提交（svn 按 GBK 读，正确转 UTF-8 入库）
svn commit <paths...> -F "$msgfile"
# 3. 验证存储无损，清理临时文件
svn log -r <rev> --xml
rm -f "$msgfile"
```

临时文件须用受限权限、放在工作副本待提交范围之外，成功/失败后都清理。

## 提交与验证

仅提交本次确认范围内路径：`svn commit <paths...> -F <message-file>`。提交后验证 `svn status`、新 revision 与 `svn log --xml`。

**事后修正已损坏的中文 log**：若 `svn log -r <rev> --xml` 确认中文存储已损坏，可在取得授权后用 `svn propset --revprop -r <rev> svn:log -F <GBK+LF 文件> <url>` 重写（需服务器开启 pre-revprop-change 钩子；文件仍须 GBK + LF，否则报 `E135000`）。此为事后补救，不属于常规提交流程。

大体积二进制资源（如 PNG）首次提交网络传输较慢；增量 commit 不会重传已入库文件。

未在本次范围的用户变更可以继续存在，但必须在报告列出；不得宣称整个工作副本 clean。某副本失败后继续下一项，不撤销用户变更。

## 报告

```text
【SVN 批量提交报告】
- 范围/归属：{wc -> URL/allowlist 结论}
- 成功：{wc: rOLD -> rNEW, summary}
- 跳过：{无变更/非授权/敏感文件命中}
- 冲突/失败：{wc: 阶段与路径}
- 验证：{commands/results}
- 敏感文件守卫：{通过 或 命中路径}
- 保留的范围外变更：{paths}
```
