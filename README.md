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

插件启动时读取 `~/.config/opencode/amagi-opencode.json`。这是稳定的用户覆盖层，不在插件缓存中，更新插件不会覆盖。

```json
{
  "$schema": "https://raw.githubusercontent.com/runrunrain/amagi-opencode-plugins-marketplace/main/schemas/amagi-opencode.schema.json",
  "profile": "tiered",
  "tiers": {
    "leader": {"model": "openai/gpt-5.5", "variant": "high"},
    "expert": {"model": "openai/gpt-5.5", "variant": "high"},
    "worker": {"model": "zhipuai/glm-5.2", "variant": "max"},
    "fast": {"model": "zhipuai/glm-5-turbo", "variant": "high"}
  },
  "agents": {
    "hongjun": {"model": "openai/gpt-5.5-pro"}
  }
}
```

优先级从低到高：插件内置 profile、`tiers`、`agents`、`opencode.json.agent.<name>`。将字段设为 `null` 可移除 profile 继承值；选择 `inherit` profile 可默认让全部 Agent 继承 OpenCode 模型。

可用 `AMAGI_OPENCODE_CONFIG=/absolute/file.json` 指定其他配置文件。

## 运行时结构

| 层级 | 默认模型 | Agent |
|---|---|---|
| leader | `openai/gpt-5.5` | amagi-leader |
| expert | `openai/gpt-5.5` | fuxi、diting、puti、hongjun |
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
