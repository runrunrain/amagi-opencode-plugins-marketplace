# 项目知识体系模板

本目录包含 Amagi 框架项目知识体系的 JSON 模板文件。

## 目录结构

```
project-knowledge-system/
├── README.md                              # 本文件
├── context.json                           # 项目上下文汇总
├── memory-map.json                        # 项目静态/半静态信息
├── task-index.json                        # 活跃任务索引（仅 in-progress/blocked/planned）
├── task-archive.json                      # 已完成任务归档
├── tasks/                                 # 任务详情目录
│   └── task-template.json
├── knowledge-base/                        # 知识库模板
│   ├── index.json                         # 知识库索引
│   ├── development-specs.json             # 开发规范
│   ├── conventions.json                   # 项目约定
│   ├── architecture.json                  # 架构设计
│   ├── api-reference.json                 # API 参考
│   ├── deployment.json                    # 部署指南
│   ├── glossary.json                      # 项目术语中心
│   └── domains/                           # 领域知识
│       ├── index.json                     # 领域注册表
│       └── domain-template/               # 领域模板
│           ├── index.json
│           ├── specs.json
│           ├── architecture.json
│           ├── api-reference.json
│           └── internals.json
├── tactical-book/                         # 战术手册模板
│   ├── index.json                         # 战术手册索引
│   ├── techniques.json                    # 技巧集
│   ├── patterns.json                      # 设计模式
│   ├── snippets.json                      # 代码片段
│   ├── checklists.json                    # 检查清单
│   └── usage-stats.json                   # 使用统计
└── error-book/                            # 错误手册模板
    ├── index.json                         # 错误手册索引
    ├── problems.json                      # 问题记录
    ├── solutions.json                     # 解决方案
    └── preventions.json                   # 预防措施
```

## 使用方法

### 1. 初始化项目知识体系

对于新项目，将模板文件复制到项目目录：

```bash
# 创建项目知识体系目录
mkdir -p projects/{project-id}/knowledge-base
mkdir -p projects/{project-id}/knowledge-base/domains
mkdir -p projects/{project-id}/tactical-book
mkdir -p projects/{project-id}/error-book

# 复制模板文件
cp templates/project-knowledge-system/context.json projects/{project-id}/
cp templates/project-knowledge-system/knowledge-base/*.json projects/{project-id}/knowledge-base/
cp templates/project-knowledge-system/tactical-book/*.json projects/{project-id}/tactical-book/
cp templates/project-knowledge-system/error-book/*.json projects/{project-id}/error-book/
```

### 2. 更新项目配置

在 `context.json` 中替换占位符：
- `{project-id}` → 项目 ID
- `{YYYY-MM-DD}` → 当前日期
- 其他项目特定信息

### 3. 迁移现有 MD 文档

参考迁移指南。

## 数据结构说明

### knowledge-base（知识库）

- **index.json**: 知识库索引，定义知识分类和加载优先级
- **development-specs.json**: 开发规范和注意事项
- **conventions.json**: 项目约定（命名、架构等）
- **architecture.json**: 系统架构设计
- **api-reference.json**: API 接口文档
- **deployment.json**: 部署和运维文档
- **glossary.json**: 项目术语中心，统一定义跨文件共享的概念
- **domains/**: 领域知识目录，按模块/子系统隔离存储深度领域知识
  - **domains/index.json**: 领域注册表，列出所有已构建的领域知识模块（启动时加载）
  - **domains/domain-template/**: 新领域的模板文件，包含 index.json、specs.json、architecture.json、api-reference.json、internals.json

### task-index.json（活跃任务索引）

仅包含活跃任务（status: in-progress / blocked / planned），已完成任务归档至 task-archive.json。

### task-archive.json（已完成任务归档）

存储所有 completed 和 cancelled 状态的任务，包含 completedDate 字段。

### tactical-book（战术手册）

- **index.json**: 战术手册索引
- **techniques.json**: 精妙技巧和方法
- **patterns.json**: 设计模式应用
- **snippets.json**: 代码片段库
- **checklists.json**: 各类检查清单
- **usage-stats.json**: 使用频率统计

### error-book（错误手册）

- **index.json**: 错误手册索引
- **problems.json**: 问题记录
- **solutions.json**: 解决方案
- **preventions.json**: 预防措施

### context.json（项目上下文）

主 Agent 加载入口，定义自动加载策略：
- **高优先级**（knowledge-base）→ 全部加载
- **中优先级**（tactical-book）→ 渐进式加载
- **低优先级**（error-book）→ 按需加载
- **领域知识**（domains）→ 启动时仅加载注册表，具体领域按任务匹配按需加载

## 自动加载机制

主 Agent 在会话启动时自动执行：

1. 读取项目注册表：`@projects/registry.json`
2. 读取项目上下文：`@projects/{activeProject}/context.json`
3. 根据配置自动加载：
   - 高优先级内容 → 全部加载
   - 战术手册 → 加载高频内容（使用统计前 30%）
   - 错误手册 → 按需加载
   - task-index.json → 仅加载活跃任务（in-progress/blocked/planned）
   - 领域知识注册表 → 启动时加载 domains/index.json，具体领域文件按需加载

## 维护规范

- 仅 Thinker Agent 可修改模板文件
- 每个项目可以有自己的扩展字段
- 保持 JSON 格式有效性
- 更新时同步更新 `lastUpdated` 字段

## 相关文档

- [Amagi 框架文档](../../docs/)
- [迁移指南](../../core/reports/项目知识体系重构指南.md)
- [AGENTS.md](../../AGENTS.md)
