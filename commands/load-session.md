---
description: "会话启动时加载项目状态、知识体系和待办事项，快速进入工作状态"
agent: amagi-leader
---


# 加载会话状态

$ARGUMENTS

## 定位与前置检查

从当前目录逐级向上查找 `projects-memory/projects/registry.json`。找到后，其所在工作区为 `WORKSPACE_ROOT`；读取 `activeProject` 和对应 `projectPath`，派生：

- `PROJECT_META_ROOT={WORKSPACE_ROOT}/projects-memory/projects/{activeProject}`
- `PROJECT_CODE_PATH=registry.projects[activeProject].projectPath`
- `TODOS_DIR={WORKSPACE_ROOT}/projects-memory/todos`

registry 不存在、JSON 无效、activeProject 未注册或项目路径不存在时停止，并准确报告缺失项；不得猜测路径。环境变量只可作为明确标注的兼容回退。

## 最小启动加载

按存在性依次读取：

1. `{PROJECT_META_ROOT}/context.json`：项目类型、技术栈、加载策略。
2. `{PROJECT_META_ROOT}/memory-map.json`：静态/半静态项目状态、关键路径、技术要点、风险、快速启动和协作约定。
3. `{PROJECT_META_ROOT}/knowledge-base/index.json`：只加载索引声明为 `priority: high` 且 `autoLoad: true` 的知识文件；通常包括 glossary、development-specs、conventions。
4. `{PROJECT_META_ROOT}/knowledge-base/domains/index.json`：只读领域注册表，不默认展开领域内容。
5. `{PROJECT_META_ROOT}/tactical-book/index.json`：只加载索引指定的高优先级条目；不得自行假定 percentile schema。
6. `{TODOS_DIR}/待办事项概览.md` 与可选 `{PROJECT_META_ROOT}/project-context.md`。

仅当参数或当前任务需要活跃任务时，再读 `task-index.json` 并选择性读取 `tasks/task-*.json`；除非用户显式要求历史，不读 `task-archive.json`。

领域知识仅在下列任一条件成立时展开：任务文件命中领域 `modules`、任务关键词命中 `tags`、或 `$ARGUMENTS` 显式指定领域。只读取命中领域的必要文件。

## 输出

报告实际发现的内容，不复述固定宣传文案：

```text
【会话加载报告】
- 当前项目：{id/name}
- 代码路径：{PROJECT_CODE_PATH}
- 已加载：{文件与知识分类}
- 未加载/缺失：{可选文件或原因}
- 活跃待办：{按优先级列出；无则写无}
- 阻塞：{阻塞项}
- 建议下步：{与当前任务最相关的一项}
```

不得声称已启用某种协作模式、Agent Team 或具体 Agent，除非当前 runtime 真实提供且本任务已选择该模式。
