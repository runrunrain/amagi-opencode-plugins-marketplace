# Amagi OpenCode Plugin

Amagi Claude Code 插件的 OpenCode 原生转换版。当前完整同步上游 **Amagi 1.5.161**（commit `4403f33b0705cd9758de844d5e07ee6f49c110ae`）。

这个版本把 Amagi 的攻坚型协作框架映射为 OpenCode 运行时能力，不需要把文件复制到 `~/.config/opencode`：

- 1 个 primary Leader 与 12 个专业 SubAgent
- L0 Leader 入口、57 个 canonical 资源/模板、7 条规则
- 8 个按需加载的 Agent Skill
- 11 个 `/command`
- 6 个 MCP 定义
- 危险命令、非法 JSON、敏感提交三个原生守卫
- SubAgent 调用统计与压缩续接上下文

转换来源和资产数量记录在 `manifest/upstream.json`。

## 安装

全局安装：

```bash
opencode plugin github:runrunrain/amagi-opencode-plugins-marketplace#main --global
```

更新：

```bash
opencode plugin github:runrunrain/amagi-opencode-plugins-marketplace#main --global --force
```

需要 OpenCode >= 1.18.5 和 Node.js >= 20。

## Agent 与模型分层

| 类型 | 默认模型 | Agent |
|---|---|---|
| leader | `openai/gpt-5.6-terra` | amagi-leader |
| expert | `openai/gpt-5.6-sol` | fuxi、diting、puti、hongjun |
| worker | `zhipuai/glm-5.2` | luban、luoshen、laojun、wukong、cangjie |
| fast | `zhipuai/glm-5-turbo` | baize、wenqu、taibai |

插件通过 `config` hook 注册 Agent。SubAgent 的 `task` 权限固定为 `deny`，防止递归分派；Leader 可以按任务档、执行模式和风险选择单 Agent 或多个并行 SubAgent。

上游 Claude Agent Teams 的转换规则：

- `agent_team` 表示由 Leader 调度多个 OpenCode SubAgent，可用 background task 并行独立方向。
- 所有通信、依赖和 artifact 交接都经过 Leader；OpenCode 没有 Claude Agent Teams 的 P2P mailbox。
- OpenCode task 不接受 `isolation: worktree`。需要隔离时，Leader/taibai 先显式创建 worktree，再把绝对路径写入 Task Contract。

## 用户配置

插件首次启动会创建：

- macOS / Linux：`~/.config/opencode/amagi-opencode.json`
- Windows：`%USERPROFILE%\.config\opencode\amagi-opencode.json`
- 设置 `OPENCODE_CONFIG_DIR` / `OPENCODE_CONFIG` 时：与 OpenCode 自定义配置相邻
- 设置 `AMAGI_OPENCODE_CONFIG` 时：使用指定文件

默认配置：

```json
{
  "profile": "tiered",
  "default_agent": "amagi-leader",
  "tiers": {
    "leader": {"model": "openai/gpt-5.6-terra", "variant": "medium"},
    "expert": {"model": "openai/gpt-5.6-sol", "variant": "high"},
    "worker": {"model": "zhipuai/glm-5.2", "variant": "max"},
    "fast": {"model": "zhipuai/glm-5-turbo", "variant": "high"}
  },
  "agents": {
    "hongjun": {"model": "openai/gpt-5.6-sol", "variant": "max"}
  }
}
```

优先级从低到高：内置 profile → `tiers` → `agents` → `opencode.json.agent.<name>`。字段设为 `null` 可移除继承值。

使用 `profile: "inherit"` 并清空 `tiers` / `agents`，可让 Amagi Agent 继承 OpenCode 当前模型。

## Skills、命令与 canonical 资源

插件把 `skills/` 作为 OpenCode skill path 注册，OpenCode 会通过原生 `skill` 工具按需加载：

- agent-document-output
- amagi-video-analysis
- execution-plan
- project-knowledge-builder
- requirement-analysis
- switch-project
- update-tactical-book
- workflow

11 个上游命令也会注册到 `config.command`，例如：

```text
/load-session
/save-session
/pull-all-repos
/push-all-repos
/github-release
```

命令以 `commands/` 中实际文件为准；`workflow` 是按需加载的 Skill，不是斜杠命令。

Agent prompt 中的 canonical 指针不会假装是当前项目文件。需要细则时调用自定义工具 `amagi_resource`：

```text
amagi_resource({ resource: "workflow" })
amagi_resource({ resource: "resources/core/common/quality-standards.md" })
amagi_resource({ resource: "skills/workflow/templates/workflow-template.md" })
```

工具只允许读取包内的 `resources/`、`rules/` 和 `skills/`，不能越界访问插件其他文件。

## 原生守卫

Claude hooks 已转换为 OpenCode plugin hooks：

| 上游能力 | OpenCode 转换 |
|---|---|
| blocking-command-guard | `tool.execute.before` 阻止无限循环、stdin 等待、超长 sleep 和危险进程/删除命令 |
| commit-guard | `tool.execute.before` 在 `git commit` 前检查 staged 文件；`-a/--all` 时同时检查 tracked unstaged 文件 |
| json-syntax-guard | `tool.execute.after` 校验 write/edit/apply_patch 产生的 `.json` |
| agent-invocation-counter | task 调用时写入用户配置目录旁的 `amagi-agent-stats.json` |
| SessionStart 安装 CLAUDE/resources/rules | 改为运行时 prompt、skill path、command 与 `amagi_resource` 注册，无全局文件覆盖 |
| 会话续接 | compaction hook 保留目标、Task Contract、artifact、验证证据、风险与下一 Gate |

上游依赖 Claude transcript 格式的旧式 `SubagentStop` 文档同步和 Stop 自动续跑没有直接照搬；OpenCode 版用显式 artifact 契约、task 结果和 compaction 上下文实现可审计续接，避免解析错误的运行时格式。

## MCP

默认内置：

- memory
- web-search-prime
- zread
- web-reader
- tavily-mcp
- firecrawl-mcp

首次生成的用户配置默认启用三个智谱远程 MCP，其余关闭。密钥只从环境变量读取：

```bash
export ZHIPU_API_KEY='...'
export TAVILY_API_KEY='...'
export FIRECRAWL_API_KEY='...'
```

旧的 `ZHIPU_MCP_API_KEY` 仍作为兼容别名支持；新配置应使用上游一致的 `ZHIPU_API_KEY`。

## 从上游重新转换

转换脚本可重复执行：

```bash
npm run sync:upstream
```

也可以指定其他 Amagi 源目录：

```bash
node scripts/sync-upstream.mjs /absolute/path/to/plugins/amagi
```

脚本会重建 prompts、commands、skills、resources、rules、MCP 和上游 provenance；OpenCode 运行时代码、权限映射、用户配置与测试保持独立。

## 验证

```bash
npm test
npm run validate
npm pack --dry-run
opencode agent list
```

`opencode agent list` 应显示 `amagi-leader (primary)` 与 12 个 Amagi SubAgent。
