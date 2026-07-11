# Amagi OpenCode Plugins Marketplace

面向 OpenCode 多服务商、多模型环境的原生强编排插件。高能力模型担任 `amagi-leader`，普通模型负责实现，轻量模型负责探索检索，专家模型负责架构、审核与高难度兜底。

仓库本身是一个可被 OpenCode 直接加载的 Git package；不复制配置文件，不依赖 Claude Code 或 Codex 的插件格式。

## 一键安装

全局安装：

```bash
opencode plugin github:runrunrain/amagi-opencode-plugins-marketplace#main --global
```

OpenCode 会使用 Bun 从 GitHub 获取并缓存插件，同时把 package spec 写入全局 `opencode.json.plugin`。重新启动 OpenCode 后生效。

项目级安装时去掉 `--global`。

## 用户模型配置

插件启动时会自动创建并读取用户配置文件。这是稳定的用户覆盖层，不在插件缓存中，更新插件不会覆盖已有文件。

- macOS / Linux：`~/.config/opencode/amagi-opencode.json`（尊重 `XDG_CONFIG_HOME`）
- Windows：`%USERPROFILE%\\.config\\opencode\\amagi-opencode.json`，与 OpenCode 的全局配置路径一致
- `OPENCODE_CONFIG_DIR` 或 `OPENCODE_CONFIG` 已配置时：与该自定义目录或配置文件相邻
- `AMAGI_OPENCODE_CONFIG`：指定精确文件路径

`1.3.0` 曾错误在 Windows 使用 `%APPDATA%\\opencode`。升级到 `1.3.1` 后，若新目标不存在，插件会自动迁移该旧文件到正确位置；已有正确位置文件绝不覆盖。

自动创建的文件包含如下可直接编辑的示例。`tiers` 用于批量覆盖同层 Agent；`agents` 用于只覆盖某一个具名 Agent。示例中的 `hongjun` 已实际生效，若不需要该例外配置可直接删除这一整个条目。

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

要改一个 Agent，只需在 `agents` 中使用 Agent 名作为键。例如将 `hongjun` 改用其他已配置 Provider/模型：

```json
{
  "agents": {
    "hongjun": {
      "model": "your-provider/your-model",
      "variant": "high"
    }
  }
}
```

保留其他顶层字段；该片段是对完整配置文件中 `agents` 字段的替换，不是第二个配置文件。Agent 名可取 `amagi-leader`、`fuxi`、`diting`、`puti`、`hongjun`、`luban`、`luoshen`、`laojun`、`wukong`、`cangjie`、`taibai`、`baize`、`wenqu`。

优先级从低到高：插件内置 profile、`tiers`、`agents`、`opencode.json.agent.<name>`。将字段设为 `null` 可移除 profile 继承值。若要使用 `inherit` profile 让 Agent 继承 OpenCode 模型，同时将 `tiers` 和 `agents` 设为 `{}`，避免这些显式覆盖继续生效。配置文件只会在首次缺失时创建，之后更新插件或重启 OpenCode 都不会覆盖你的修改。

可用 `AMAGI_OPENCODE_CONFIG=/absolute/file.json` 指定其他配置文件。

## MCP

插件会注册 `memory`、`web-search-prime`、`zread`、`web-reader`、`tavily-mcp` 和 `firecrawl-mcp`。运行时内置默认值全部禁用；首次自动创建的用户配置会按上方模板启用 `web-search-prime`、`zread` 和 `web-reader`，其余保持禁用。按自己的 Provider、网络和凭据情况调整。

在 `~/.config/opencode/amagi-opencode.json` 中按需启用；密钥使用环境变量，不要写入 Git 仓库或配置文件：

```json
{
  "mcp": {
    "memory": {"enabled": true},
    "web-search-prime": {"enabled": true},
    "tavily-mcp": {"enabled": true},
    "firecrawl-mcp": {"enabled": true}
  }
}
```

```bash
export ZHIPU_MCP_API_KEY='...'
export TAVILY_API_KEY='...'
export FIRECRAWL_API_KEY='...'
```

优先级从低到高：插件内置 MCP 定义、`amagi-opencode.json.mcp`、`opencode.json.mcp`。后两层可以覆盖 `enabled`、`headers`、`environment` 或 `timeout`。

## 运行时结构

| 层级 | 默认模型 | Agent |
|---|---|---|
| leader | `openai/gpt-5.6-terra` | amagi-leader |
| expert | `openai/gpt-5.6-sol` | fuxi、diting、puti、hongjun |
| worker | `zhipuai/glm-5.2` | luban、luoshen、laojun、wukong、cangjie、taibai |
| fast | `zhipuai/glm-5-turbo` | baize、wenqu |

插件通过 OpenCode `config` hook 在内存中注册 1 个 primary Leader 与 12 个 subagent，不把 Agent 或 prompt 写入用户配置目录。

- 用户在 `opencode.json.agent.<name>` 中设置的 `model`、`variant` 和模型参数优先。
- 用户已有的非 Amagi Agent、Provider、MCP、权限和 instructions 不受影响。
- 用户已有非 Amagi `default_agent` 时保留；未设置时使用 `amagi-leader`。
- 设置环境变量 `AMAGI_OPENCODE_PROFILE=inherit` 可让所有 Amagi Agent 继承 OpenCode 的模型选择。

## 更新

```bash
opencode plugin github:runrunrain/amagi-opencode-plugins-marketplace#main --global --force
```

## 验证

```bash
npm test
npm run validate
opencode agent list
```

`opencode agent list` 应显示 `amagi-leader (primary)` 以及 12 个 Amagi subagent。
