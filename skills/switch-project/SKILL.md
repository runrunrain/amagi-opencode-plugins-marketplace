---
name: switch-project
description: |
  项目切换技能，用于多项目环境的上下文切换。用户要求切换项目、进入/注册/激活另一个项目、加载某项目记忆、更新 activeProject、[@hotswap:switch]、switch project、change workspace 时应使用；负责读取 registry、加载项目上下文并提示后续环境状态。不要用于同一项目内的分支/任务切换、git checkout、普通目录 cd，或未涉及项目记忆/上下文的操作。
version: "1.0"
author: Thinker Agent
tags:
  - P1
  - core
  - utility
context: fork
hooks:
  PreToolUse:
    - type: prompt
      prompt: "保存当前项目状态，准备切换上下文"
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# switch-project 技能

## 概述

项目切换技能，管理多项目环境的上下文切换，确保正确加载目标项目的配置和知识库。

## 触发条件

- 用户使用 `[@hotswap:switch:project-id]` 命令
- 用户明确请求切换到其他项目
- 任务属于非当前活动项目

## 执行流程

```
1. 保存当前项目状态
2. 读取 projects/registry.json
3. 验证目标项目存在
4. 更新 activeProject
5. 加载目标项目配置
6. 加载项目专属知识库和战术手册
7. 输出切换确认信息
```

## 输入要求

| 参数 | 必需 | 说明 |
|------|------|------|
| project_id | 是 | 目标项目ID |

## 命令格式

```
[@hotswap:switch:project-id]  # 切换到指定项目
[@hotswap:list]               # 列出所有项目
```

## 切换后加载资源

| 资源 | 路径 |
|------|------|
| 项目配置 | projects/{id}/project.json |
| 项目知识库 | projects/{id}/knowledge-base/ |
| 项目战术手册 | projects/{id}/tactical-book/ |
| 项目输出目录 | projects/{id}/agent-outputs/ |

## 输出规范

切换成功后输出：

```
【项目切换成功】
- 从: {old_project_name}
- 到: {new_project_name}
- 项目路径: {project_path}
- 已加载知识库: {knowledge_base_count}项
```

## 注意事项

- 切换前自动保存当前项目状态
- 如果目标项目不存在，提示注册新项目
- 保持会话连续性，不丢失对话上下文
