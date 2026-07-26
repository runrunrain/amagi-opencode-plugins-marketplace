---
name: update-tactical-book
description: |
  战术手册更新技能，用于把已验证经验沉淀到 tactical-book。用户要求“更新战术手册”“经验沉淀”“复盘这次教训”“记录到 handbook”“【待反思】”“postmortem to tactical book”时应触发；按 Delta 规则追加/合并条目，维护触发条件、证据和生命周期。不要用于普通任务报告、未验证猜想、代码修改，或需要整体重写/删除手册历史的操作。
version: "1.0"
author: Thinker Agent
tags:
  - P1
  - core
  - thinker
  - reflection
context: fork
agent: thinker
hooks:
  PreToolUse:
    - type: prompt
      prompt: "准备进入反思模式，收集相关上下文和执行轨迹"
  PostToolUse:
    - type: prompt
      prompt: "验证战术手册更新的Delta格式正确性"
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# update-tactical-book 技能

## 概述

战术手册更新技能，通过调用 菩提祖师（puti） Agent 执行经验沉淀和系统进化。

## 触发条件

- 任何Agent标记【待反思】
- 发现可复用的问题解决模式
- 遇到意外问题或踩坑经历
- 需要更新最佳实践

## 执行流程

```
1. 收集反思上下文
2. 执行蝴蝶循环分析（5轮迭代）
   - 第1轮：现象分析
   - 第2轮：根本原因
   - 第3轮：解决方案
   - 第4轮：抽象规则
   - 第5轮：验证精炼
3. 提取可复用洞见
4. Delta增量更新战术手册
5. 记录到反思日志
```

## 输入要求

| 参数 | 必需 | 说明 |
|------|------|------|
| trigger_source | 是 | 触发来源（哪个Agent，什么场景） |
| context | 是 | 相关上下文信息 |
| expected_vs_actual | 是 | 预期结果vs实际结果 |

## Delta更新规则（强制）

| 操作 | 允许 | 禁止 |
|------|------|------|
| 添加新条目 | ✓ | |
| 更新使用计数 | ✓ | |
| 标记废弃 | ✓ | |
| 删除条目 | | ✗ |
| 整体重写 | | ✗（导致上下文崩溃） |

## Delta格式

```json
{
  "timestamp": "2025-12-08T10:00:00Z",
  "source": "Thinker",
  "trigger": "【待反思】xxx",
  "operations": [
    {
      "action": "add",
      "section": "coding-patterns",
      "content": {
        "id": "CP-xxx",
        "title": "新的编码模式",
        "insight": "具体洞见",
        "example": "代码示例",
        "usageCount": 0,
        "addedDate": "2025-12-08"
      }
    }
  ]
}
```

## 输出规范

反思报告输出到 `{AMAGI_WORKSPACE_ROOT}/projects-memory/projects/{activeProject}/agent-outputs/puti/`：

```
reflection_report_YYYYMMDD_HHMMSS.md
├── 触发来源
├── 事件描述
├── 蝴蝶循环分析（5轮）
├── 提取洞见
├── Delta更新
└── 验证计划
```

## 关联Agent

- **thinker**: 执行反思和更新（唯一可修改Amagi/核心文件的Agent）
