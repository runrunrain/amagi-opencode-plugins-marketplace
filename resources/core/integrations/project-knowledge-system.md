# 项目知识体系规范

> 版本 11.0 | 2026-03-17 | 维护者：Thinker Agent

项目知识体系结构化规范，包括 memory-map、knowledge-base（含 domains 领域知识）、tactical-book、error-book、task-index、task-archive、tasks 七个模块及其加载策略。

---

## 目录结构

根目录：`{PROJECTS_DIR}/{project-id}/`，其中 `{PROJECTS_DIR}` 由 `{WORKSPACE_ROOT}/projects-memory/projects` 派生。

| 模块 | 路径 | 说明 | 加载策略 |
|------|------|------|---------|
| memory-map | `memory-map.json` | 项目静态/半静态信息（7 sections） | 启动自动加载 |
| knowledge-base | `knowledge-base/` | 开发规范和项目约定 | 高优先级自动加载 |
| domains | `knowledge-base/domains/` | 项目特定领域的深度知识 | 启动加载注册表，按需加载具体领域 |
| tactical-book | `tactical-book/` | 精妙技巧和方法 | 中优先级渐进加载 |
| error-book | `error-book/` | 问题记录和解决方案 | 低优先级按需加载 |
| task-index | `task-index.json` | 活跃任务的轻量级索引（仅 in-progress/blocked/planned） | 按需加载 |
| task-archive | `task-archive.json` | 已完成/已取消任务的归档 | 仅显式请求时加载 |
| tasks | `tasks/` | 各任务详情文件 | 按索引选择性加载 |

### 各模块包含文件

**knowledge-base/**
- `index.json`
- `glossary.json`（项目术语中心）
- `development-specs.json`
- `conventions.json`
- `architecture.json`
- `api-reference.json`

**knowledge-base/domains/**
- `index.json`（领域注册表）
- `{domain-id}/index.json`（领域索引）
- `{domain-id}/specs.json`（领域开发规范）
- `{domain-id}/architecture.json`（领域架构）
- `{domain-id}/api-reference.json`（领域 API）
- `{domain-id}/internals.json`（领域内部实现）

**tactical-book/**
- `index.json`
- `techniques.json`
- `usage-stats.json`

**error-book/**
- `index.json`
- `problems.json`
- `solutions.json`

**tasks/**
- `task-{YYYYMMDD}-{seq}.json`（各任务详情文件，平铺不分层）

---

## 加载策略

### 启动自动加载

| 阶段 | 加载内容 | 加载时机 |
|------|---------|---------|
| 启动加载 | memory-map.json（精简版，7 sections，<200行） | 每次新会话 |
| 启动加载 | knowledge-base（priority:high + autoLoad:true，含 glossary.json） | 每次新会话 |
| 启动加载 | domains/index.json（领域注册表，<120行） | 每次新会话 |
| 启动加载 | tactical-book（percentile >= 70） | 每次新会话（渐进式） |

### 按需加载

| 优先级 | 来源模块 | 加载条件 | 加载动作 |
|--------|---------|---------|---------|
| 高 | knowledge-base | `priority: high` AND `autoLoad: true` | 全部加载 |
| 中 | tactical-book | `percentile >= 70` | 渐进式加载 |
| 低 | error-book | `status: open/investigating`, `severity: critical/high` | 遇到问题时检索 |
| 按需 | domains 具体领域 | 任务匹配时（文件路径或关键词匹配） | 加载对应领域的全部知识文件 |
| 按需 | task-index | 需要查看项目活跃任务时 | 完整读取 task-index.json |
| 按需 | task-archive | 显式请求查看历史任务时 | 读取 task-archive.json |
| 按需 | tasks | 需要特定任务详情时 | 按索引读取对应 task-{id}.json |

---

## 渐进式披露三层模型

知识体系采用三层渐进式披露，Agent 从索引层开始，按需逐层深入，避免一次性加载全部数据。

| 层级 | 目的 | 典型文件 | 大小限制 |
|------|------|---------|---------|
| 索引层 | Agent 快速判断是否需要深入 | index.json、domains/index.json | <120行 |
| 摘要层 | Agent 获取关键信息无需读详情 | index.json 中的 summary/description 字段 | 每条<3行 |
| 详情层 | Agent 需要完整数据时按需加载 | specs.json、internals.json、task-{id}.json | 无限制 |

### summaryFields 与 detailFields

每个 index.json 模板包含 `summaryFields` 和 `detailFields` 两个元数据字段，指导 Agent 按需加载：

- **summaryFields**：列出属于摘要层的字段名，Agent 读取索引即可获取这些信息，无需加载详情文件
- **detailFields**：列出指向详情层的字段名（通常是文件路径），Agent 需要深入时通过这些字段定位完整数据

Agent 决策流程：读索引 → 检查 summaryFields 中的信息是否满足需求 → 不够则通过 detailFields 加载详情

### 层级间导航

- 索引层 → 摘要层：通过 summaryFields 中声明的字段获取摘要
- 摘要层 → 详情层：通过 detailFields 中声明的路径字段定位完整文件
- Agent 决策流程：读索引 → 判断相关性 → 需要则读详情

### 各模块的三层实现

| 模块 | 索引层 | 摘要层 | 详情层 |
|------|--------|--------|--------|
| knowledge-base | index.json（categories 列表） | 每个 category 的 description | 各 .json 详情文件 |
| domains | domains/index.json（领域列表） | 每个领域的 description + tags | {domain-id}/*.json |
| tactical-book | index.json（techniques 列表） | 每个 technique 的 summary | techniques.json 完整内容 |
| error-book | index.json（problems 列表） | 每个 problem 的 summary + severity | problems.json + solutions.json |
| tasks | task-index.json（活跃任务列表） | 每个任务的 summary 字段 | tasks/task-{id}.json |

---

## 字段定义参考

以下字段在模板中使用，此处统一定义其语义：

### 通用索引字段（所有 index.json 共用）

| 字段 | 类型 | 说明 |
|------|------|------|
| `summaryFields` | `string[]` | 声明哪些字段属于摘要层，Agent 读取索引即可获取这些信息 |
| `detailFields` | `string[]` | 声明哪些字段指向详情层（通常是文件路径），Agent 需要深入时使用 |

### knowledge-base/index.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `glossary` | `object` | 顶层术语中心引用，含 `path` 和 `description`，其他文件通过 `$ref: glossary#termId` 引用 |
| `priority` | `"high" \| "medium" \| "low"` | 加载优先级，high 表示启动时自动加载 |
| `autoLoad` | `boolean` | 是否在启动时自动加载此分类的详情文件 |
| `isDomainRegistry` | `boolean` | 标记此条目为领域注册表入口（仅 domains 条目使用），Agent 识别此标记后仅加载注册表而非完整详情 |
| `itemCount` | `number` | 当前分类下的知识条目数量 |
| `summary` | `string` | 摘要层：一句话说明该分类能回答什么问题，Agent 无需读详情即可判断相关性 |
| `keyQuestions` | `string[]` | 摘要层：该分类能回答的典型问题列表，帮助 Agent 快速定位 |
| `moduleRelations` | `object` | 知识库模块间引用关系图，帮助 Agent 理解知识间的依赖 |

### glossary.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `usage` | `string` | 引用方式说明（`$ref: glossary#termId`） |
| `terms` | `object` | 以 term-id 为键的术语字典，支持 O(1) 查找 |
| `terms.{id}.term` | `string` | 术语名称 |
| `terms.{id}.definition` | `string` | 术语详细定义 |
| `terms.{id}.relatedFiles` | `string[]` | 引用该术语的知识文件列表 |

### domains/index.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `path` | `string` | 领域目录相对路径（相对于 knowledge-base/） |
| `modules` | `string[]` | 项目源码中属于此领域的模块路径，用于文件路径匹配 |
| `tags` | `string[]` | 领域关键词，用于任务描述关键词匹配 |
| `itemCount` | `number` | 领域内知识条目总数 |
| `summary` | `string` | 摘要层：一句话总结该领域的核心价值和覆盖范围 |
| `quickAnswers` | `object` | 摘要层：该领域最常见问题的直接答案（键为问题，值为答案） |
| `crossDomainRelations` | `object` | 领域间依赖关系图，含 `relations` 数组和 `readingOrder` 建议阅读顺序 |

### domain/{domain-id}/index.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `quickAnswers` | `array` | 该领域最常见问题的直接答案，Agent 无需读详情即可回答 |
| `crossReferences` | `array` | 与其他领域的关联关系声明 |
| `commonQueries` | `array` | 常见查询路径指引，帮助 Agent 快速定位所需信息 |
| `dependencies` | `string[]` | 依赖的其他领域 ID |

### context.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `autoLoadSections` | `array` | 启动时自动加载的知识模块配置 |
| `loadStrategy` | `"full" \| "progressive" \| "on-demand" \| "registry-only"` | 加载策略类型 |

### 模板版本号规范

所有模板文件统一使用语义版本 `major.minor`（如 `"1.0"`），表示模板 schema 版本。模板版本独立于框架版本（如 CLAUDE.md 的 v10.x），项目实例化后可按需升级。

---

## 领域知识隔离

### 设计理念

知识体系分为两层：

- **全局层**（knowledge-base 顶层文件）：适用于整个项目的开发规范、约定、架构和 API 参考
- **领域层**（knowledge-base/domains/）：项目特定模块/子系统的深度知识，按领域隔离存储

全局层确保所有 Agent 共享统一的项目规范；领域层允许 Agent 在处理特定模块时获取精准的领域上下文，避免加载无关知识。

### 领域注册表

`knowledge-base/domains/index.json` 是所有领域的注册入口，结构示例：

```json
{
  "version": "1.0",
  "domains": [
    {
      "id": "domain-id",
      "name": "领域名称",
      "description": "领域简述",
      "path": "domains/domain-id/",
      "modules": ["src/module-a/", "src/module-b/"],
      "tags": ["keyword-1", "keyword-2"],
      "priority": "high",
      "lastUpdated": "2026-03-17"
    }
  ]
}
```

### 领域检测机制

Agent 在任务执行中通过以下方式匹配领域：

| 检测方式 | 说明 |
|---------|------|
| 文件路径匹配 | 当前任务涉及的文件路径匹配领域 `modules` 字段 |
| 关键词匹配 | 任务描述或上下文匹配领域 `tags` 字段 |
| 显式指定 | 用户或 Leader 明确指定 "加载 {domain-id} 领域知识" |

匹配成功后，加载对应领域目录下的全部知识文件。

### 领域生命周期

- **创建**：由 project-knowledge-builder skill 的 domain 模式创建，自动注册到 domains/index.json
- **更新**：随项目迭代由 Thinker Agent 或 skill 维护
- **归档**：领域废弃时从注册表移除，目录可保留供历史查阅

---

## Task 分离策略

### 活跃任务与归档任务

| 文件 | 包含内容 | 加载时机 |
|------|---------|---------|
| `task-index.json` | 活跃任务（in-progress、blocked、planned） | 按需加载 |
| `task-archive.json` | 已完成（completed）和已取消（cancelled）任务 | 仅显式请求时加载 |

### archiveStats 快速统计（单一数据源）

`task-index.json` 的 `summary.archiveStats` 是归档统计的**单一数据源（Single Source of Truth）**，Agent 无需加载 task-archive.json 即可获取归档概况。

```json
"archiveStats": {
  "totalCompleted": 0,
  "totalCancelled": 0,
  "dateRange": { "earliest": null, "latest": null }
}
```

`task-archive.json` 不再重复维护统计数据，仅存储归档任务列表。

### task-archive.json 结构

```json
{
  "version": "1.0",
  "lastUpdated": "2026-03-17T00:00:00Z",
  "tasks": []
}
```

### 迁移规则

当任务 status 变为 `completed` 或 `cancelled` 时：

1. 从 `task-index.json` 的 tasks 数组中移除该任务
2. 将该任务追加到 `task-archive.json` 的 tasks 数组
3. 更新 `task-index.json` 的 `archiveStats`（唯一需要更新统计的位置）

---

## 模板路径

知识体系模板位于：`templates/project-knowledge-system/`

---

## 相关模块

- resources/core/integrations/project-management.md
