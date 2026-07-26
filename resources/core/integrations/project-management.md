# 项目管理集成

> **版本**: v11.0
> **维护者**: Thinker Agent
> **变更**: v11.0 新增领域知识隔离（domains）和 Task 分离（task-archive）

---

## 一、工作路径要求

> **重要**：路径体系以当前工作路径推导，不依赖多环境变量。
> Agent 启动时从当前工作目录向上查找，直到发现 `projects-memory/projects/registry.json`，该目录即 `WORKSPACE_ROOT`。

| 名称 | 必需 | 说明 |
|------|------|------|
| WORKSPACE_ROOT | 是 | 由当前工作路径向上定位得到的工作区根目录 |

---

## 二、路径体系

> **详细规范**：本文件即路径体系完整规范

### 术语对照表

| 术语 | 含义 | 如何获取 |
|------|------|----------|
| **WORKSPACE_ROOT** | 工作区根目录 | 从当前工作路径向上查找 `projects-memory/projects/registry.json` |
| **PROJECTS_MEMORY_ROOT** | 项目记忆系统根目录 | `{WORKSPACE_ROOT}/projects-memory` |
| **PROJECTS_DIR** | 项目元数据目录 | `{PROJECTS_MEMORY_ROOT}/projects` |
| **PROJECT_META_ROOT** | 单项目元数据 | `{PROJECTS_DIR}/{activeProject}` |
| **PROJECT_CODE_PATH** | 项目真实代码 | 从registry.json读取projectPath |
| **TODOS_DIR** | 待办事项目录 | `{PROJECTS_MEMORY_ROOT}/todos` |
| **LEGACY_PROJECTS_DIR** | 旧版项目元数据目录（已弃用） | `{WORKSPACE_ROOT}/projects` |

### 目录结构

```
{WORKSPACE_ROOT}/
├── projects-memory/              # 项目记忆系统根目录
│   ├── projects/                 # 项目元数据目录
│   │   ├── registry.json        # 全局注册表
│   │   └── {project-id}/
│   │       ├── context.json
│   │       ├── memory-map.json   # 精简版（7 sections，<200行）
│   │       ├── task-index.json   # 活跃任务索引（按需加载）
│   │       ├── task-archive.json # 已完成任务归档（仅显式请求时加载）
│   │       ├── tasks/            # 任务详情目录（按需选择性加载）
│   │       └── ...
│   └── todos/                    # 待办事项目录
│       └── 待办事项概览.md
└── {project-code}/               # 项目代码目录（与元数据同级）
```

### 操作分类指南

| 操作类型 | 使用路径 | 模板 |
|---------|---------|------|
| 保存 Agent 报告 | PROJECT_META_ROOT | `{PROJECTS_DIR}/{activeProject}/agent-outputs/` |
| 运行测试 | PROJECT_CODE_PATH | `cd {PROJECT_CODE_PATH} && pytest` |
| 修改代码 | PROJECT_CODE_PATH | 编辑 `{PROJECT_CODE_PATH}/app/main.py` |
| 读取项目配置 | PROJECT_META_ROOT | 读取 `{PROJECTS_DIR}/{activeProject}/context.json` |
| 查看任务列表 | PROJECT_META_ROOT | 读取 `{PROJECTS_DIR}/{activeProject}/task-index.json`（按需） |
| 查看任务详情 | PROJECT_META_ROOT | 读取 `{PROJECTS_DIR}/{activeProject}/tasks/task-{id}.json`（按需） |
| 加载领域知识 | PROJECT_META_ROOT | 读取 `knowledge-base/domains/index.json` 后按需读取具体领域 |
| 查看历史任务 | PROJECT_META_ROOT | 读取 `{PROJECTS_DIR}/{activeProject}/task-archive.json` |

---

## 三、项目热插拔

> **使用方式**：使用框架内置命令

| 命令 | 说明 |
|------|------|
| `[@hotswap:switch:project-id]` | 切换项目 |
| `[@hotswap:list]` | 列出所有项目 |
| `[@hotswap:active]` | 显示当前活跃项目信息 |
| `[@hotswap:sync:project-id]` | 同步项目记忆地图 |
| `[@hotswap:validate:project-id]` | 验证项目路径有效性 |

### 项目切换流程

```
[@hotswap:switch:project-id]
    ├─ ① 从当前工作路径推导 WORKSPACE_ROOT
    ├─ ② 验证 project-id 有效
    ├─ ③ 更新 registry.json 的 activeProject
    ├─ ④ 加载新项目配置和记忆地图
    └─ ⑤ 通知用户切换完成
```

---

## 四、项目目录结构

```
{PROJECTS_DIR}/
├── registry.json              # 全局注册表
└── {project-id}/              # 项目独立目录
    ├── context.json           # 项目上下文入口
    ├── memory-map.json        # 记忆地图（精简版，7 sections，<200行）
    ├── task-index.json        # 活跃任务索引（按需加载）
    ├── task-archive.json      # 已完成任务归档（仅显式请求时加载）
    ├── tasks/                 # 任务详情目录（按 task-{YYYYMMDD}-{seq}.json 命名）
    ├── development-checklist.json  # 开发清单
    ├── knowledge-base/        # 项目知识库
    │   ├── index.json
    │   ├── glossary.json      # 项目术语中心（高优先级自动加载）
    │   ├── development-specs.json
    │   ├── conventions.json
    │   ├── architecture.json
    │   ├── api-reference.json
    │   └── domains/           # 领域知识
    │       ├── index.json     # 领域注册表
    │       └── {domain-id}/   # 各领域独立目录
    ├── tactical-book/         # 项目战术手册
    └── agent-outputs/         # Agent工作报告
```

### memory-map.json 结构（7个sections，精简版）

> 动态任务数据已迁移至 task-index.json 和 tasks/ 目录，memory-map.json 仅保留静态/半静态项目信息。

| Section | 名称 | 内容 | 性质 |
|---------|------|------|------|
| 1 | basicInfo | 项目定位 | 静态 |
| 2 | paths | 核心路径 | 静态 |
| 3 | systemStatus | 系统状态（含 featureFlags） | 半静态 |
| 6 | technicalPoints | 技术要点 | 半静态 |
| 7 | insights | 洞察和风险 | 半静态 |
| 8 | quickStart | 快速启动（含 debugTools） | 静态 |
| 9 | collaboration | 协作规范 | 静态 |

### task-index.json 与 tasks/ 目录

| 文件/目录 | 说明 | 加载时机 |
|----------|------|---------|
| `task-index.json` | 活跃任务的轻量级索引（仅 in-progress/blocked/planned） | 按需加载（需要查看活跃任务时） |
| `task-archive.json` | 已完成/已取消任务的归档索引 | 仅显式请求时加载 |
| `tasks/task-{YYYYMMDD}-{seq}.json` | 单个任务的完整详情 | 按索引选择性加载（需要特定任务详情时） |

---

## 五、知识体系引用

> **详细规范**：参见 resources/core/integrations/project-knowledge-system.md

| 知识类型 | 说明 |
|---------|------|
| knowledge-base | 开发规范和项目约定 |
| domains | 项目特定领域的深度知识（按模块/子系统隔离） |
| tactical-book | 精妙技巧和方法 |
| error-book | 问题记录和解决方案 |

---

## 六、文件权限体系

| 目录/文件 | 读取权限 | 写入权限 |
|----------|---------|---------|
| core/ | 所有Agent | 仅Thinker |
| projects/ | 所有Agent | 所有Agent |
| registry/config | 所有Agent | Thinker |
| 项目代码 | 所有Agent | Coder/Designer/Writer/Manager |

---

## 七、错误处理

| 场景 | 错误类型 | 消息 |
|------|---------|------|
| 无法定位工作区 | EnvironmentError | 从当前工作路径向上未找到 projects-memory/projects/registry.json |
| 路径不存在 | EnvironmentError | 工作区路径不存在 |
| registry不存在 | FileNotFoundError | 项目注册表不存在 |
| 项目不存在 | KeyError | 项目不存在 |

### 回退机制

1. 发出警告
2. 尝试加载备份
3. 降级模式
4. 继续执行

---

**维护责任**: Thinker Agent
