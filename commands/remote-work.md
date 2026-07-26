---
description: "建立 SSH 远程工作入口，验证远端环境，并为后续操作提供逐条 SSH 执行约定"
agent: amagi-leader
---


# SSH 远程工作入口

$ARGUMENTS

本命令建立当前对话中的远程执行约定，不会永久切换 OpenCode/Codex 的执行宿主，也不会改变 SubAgent 运行契约或递归创建 Agent。

## 参数与配置

- 第一个参数为 SSH 别名，未提供时兼容使用 `winpc`。
- 第二个参数为远程工作目录；未提供时读取 SSH 登录后的主目录。

优先在当前工作区查找 `Database/环境装配/ssh环境构建/SSH远程工作环境_使用手册.md` 获取已配置别名、系统与目录；不存在时只读 `~/.ssh/config` 中对应 Host。不得从文档或配置输出私钥、密码、token。

## 建立入口

1. 验证别名存在，执行带超时的只读探测：`ssh -o BatchMode=yes -o ConnectTimeout=10 <alias> "echo CONNECTION_OK"`。失败即停止并报告 SSH 错误。
2. 检测远端系统、shell、主目录和目标目录是否存在：Linux/macOS 使用 `uname`/`pwd`；Windows 使用简短 PowerShell 命令。复杂 PowerShell（`$_`、`@{}`、静态方法、多行块或多层引号）应先生成临时 `.ps1`，经 `scp` 上传到用户可写临时目录后再执行，并在结束时清理临时文件。
3. 可选探测 `opencode --version`。仅在用户后续明确要求且远端 CLI 存在时，才可用 `opencode run` 作为一次性远端命令；它不是当前 runtime 的 SubAgent，也不得绕过天城的 Task Contract、审核或验证。
4. 后续远端动作必须逐条使用 `ssh <alias> "..."` 或脚本上传模式；每条命令仍需按其副作用单独判断权限。当前本地文件操作不会自动变成远端操作。

Windows 不得混用 Unix 命令；无法可靠转义时停止，不拼接高风险内联命令。SSH Session 通常不能操作 GUI。长任务应使用远端已有的可审计会话工具；不得仅因 SSH 超时宣称成功。

## 输出

```text
【SSH 远程入口报告】
- SSH 别名：{alias}
- 连接：PASS/FAIL
- 远端系统/Shell：{检测结果}
- 工作目录：{目录及存在性}
- 远端 OpenCode CLI：{版本/不可用/未检查}
- 后续执行方式：逐条 SSH / 脚本上传
- 限制与风险：{GUI、权限、超时或无}
```
