# Claude Code → OpenCode 转换契约

首次转换、转换器失配或出现新的 Claude 专属机制时完整读取本文件。

## 资产映射

| Claude Code 来源 | OpenCode 目标 | 转换要求 |
|---|---|---|
| `.claude-plugin/plugin.json` | `package.json`、`manifest/upstream.json` | 同步版本、描述和来源；导出 `./server` |
| `CLAUDE.template.md` | `prompts/<leader>.md` | 注入 OpenCode adapter，保留 canonical 规则 |
| `agents/*.md` | `prompts/*.md` + `manifest/agents.json` | 去除 Claude frontmatter；显式 mode、tier、permission |
| `commands/*.md` | `commands/*.md` | 使用 OpenCode frontmatter：description、agent |
| `skills/**` | `skills/**` | 保留目录；规范化 name；增加 OpenCode compatibility 与 adapter |
| `resources/**` | `resources/**` | 完整复制并转换资源指针、协作语义和工具名 |
| `rules/**` | `rules/**` | 完整复制；由 prompt/resource 或插件逻辑消费 |
| `.mcp.json` | `mcp/servers.json` | HTTP→remote；stdio→local command 数组；密钥→环境变量模板 |
| hooks/scripts | `index.js` hooks、permission/guard 或限制说明 | 按行为移植，禁止直接复制 Claude hook schema |
| `orchestration-profile.json` | `manifest/upstream-orchestration-profile.json` | 保留路由、档位和 guard 配置 |

新增或删除目录时同步更新转换器的 required paths、复制逻辑、包 `files` 清单和测试。

## OpenCode 入口契约

OpenCode 包至少满足：

- ESM 可加载，`package.json` 的 `main` 与 `exports["./server"]` 指向插件入口。
- 入口导出 OpenCode plugin factory。
- config hook 注入 Agent、MCP、Command 和 Skill 路径。
- 受管字段优先级：
  - mode、description、prompt 和关键安全 permission 由插件保持。
  - model、variant 等选择允许 profile、Amagi 用户配置和 OpenCode 用户配置按既定顺序覆盖。
- 创建用户配置时使用 create-if-absent，禁止覆盖后续人工编辑。
- 配置写入采用临时文件和替换；统计等非关键写入不得阻断任务。

## Agent 契约

- 一个 Leader：`mode: primary`，可调度 task。
- 其余专业角色：`mode: subagent`，`task: deny`。
- `default_agent` 默认指向 Leader。
- prompt 文件、manifest Agent 和运行时注册 Agent 必须一一对应。
- 不通过名称特征推断权限；以 manifest 为事实源。

## 语义转换

| Claude 语义 | OpenCode 语义 |
|---|---|
| Agent/Task 工具 | `task` |
| Agent Teams | Leader 维护逻辑协作组并调度多个 task |
| SubAgent Leader 中转通信/mailbox | 结果与 artifact 经 Leader 中转 |
| task `isolation: worktree` | Leader/管理 Agent 先显式创建 worktree，再传绝对路径 |
| `${CLAUDE_PLUGIN_ROOT}` | 插件入口解析的包根，或 `amagi_resource` 读取 |
| `resources/...` | 插件资源相对路径或资源读取工具 |
| Claude Browser | `agent-browser` 经 Bash/skill，或明确可用的浏览器能力 |
| `opencode --version` / `opencode run` | `opencode --version` / `opencode run` |

转换必须保留约束含义，不能只做字符串替换。遇到新概念时先查 OpenCode 当前 API，再决定 native port、guard、prompt adaptation 或 unsupported。

## Hook 分类

逐个列出原 hook 的触发点、输入、输出和阻断语义，然后分类：

1. **原生事件**：OpenCode 有等价 hook，例如 tool execute before/after、session compacting。
2. **权限表达**：用 Agent permission、tool permission 或 guard。
3. **静态资源**：转换为 prompt、rule、skill 或 resource。
4. **无等价能力**：写入限制说明并测试降级行为；不得注册不存在的 hook 名。

安全 guard 必须 fail closed；观测统计可 best effort。

## MCP 转换

- HTTP server 使用 remote 类型、URL、headers、disabled 默认值和明确 OAuth 行为。
- stdio server 使用 local 类型及 command 数组。
- `${NAME}` 转换为目标支持的环境变量模板；禁止求值并落盘真实值。
- 合并用户 override 时深合并 headers/environment。
- 默认启用状态必须显式并可由用户配置覆盖。

## 差异审阅

同步后至少检查：

1. 源 `git diff --name-status` 中每个文件在目标有对应变化或书面“不需要转换”理由。
2. 生成目录不存在陈旧文件；源删除必须反映到目标。
3. 转换器本身覆盖新的目录、词汇和工具语义。
4. `rg` 搜索 Claude 专属标识；区分解释性文字和错误指令。
5. 版本、来源、资产数量、测试断言一致。

## 发布前门槛

- 源与目标变更都可追溯；脏源必须显式披露。
- `npm run validate`、包 dry-run、diff check 通过。
- 可用时用 OpenCode 加载插件并读取 resolved config/Agent 列表。
- 正式安装使用 `opencode plugin <spec> --global --force`。
- 推送、tag、发布和设备升级分别取得用户授权。
