# 领域知识与 Catalog 构建规则

> Extracted from `project-knowledge-builder/SKILL.md` for progressive disclosure.

### 阶段 7：领域知识构建（仅 domain 模式）

基于阶段 1-5 的领域定向分析，生成领域特定知识文件。**不重复生成**全局知识文件。

读取 `references/output-schema.md` 中 "domains/" 相关 schema，生成：

| 输出文件 | 关注重点 |
|---------|---------|
| `domains/{id}/index.json` | modules、entryPoints、quickStart、crossReferences、commonQueries |
| `domains/{id}/specs.json` | 领域特定规范、命名模式、特殊限制 |
| `domains/{id}/architecture.json` | 组件结构、数据流、外部依赖 |
| `domains/{id}/api-reference.json` | 公开 API + 内部核心方法 |
| `domains/{id}/internals.json` | 关键文件、核心算法、状态管理 |
| `domains/{id}/runtime/{topic}.json` | 运行时决策逻辑、命令处理流程、已验证行为链路 |

当领域满足以下条件时生成 runtime/ 子目录：
- 存在复杂的运行时决策逻辑（决策树、状态机、规则引擎）
- 存在外部命令/事件驱动的行为入口
- 运行时行为需要区别于静态配置架构单独记录

runtime/ 文件格式：
- 决策树：{entity}-decision-tree.json（含决策节点、条件、输出行为）
- 命令 API：{entity}-command-api.json（含命令名、参数、处理器、预期结果）
- 运行时配置：{topic}-runtime-config.json（含已验证链路和配置来源）

**领域深度子目录化**：当领域知识体积超过标准 5 文件的承载能力时，将标准文件按关注点迁移到子目录：

| 标准文件 | 子目录化条件 | 子目录内文件模式 |
|---------|------------|----------------|
| architecture.json | 超过 400 行，或有 3+ 个独立架构维度 | architecture/architecture.json（总览）+ architecture/architecture-{dimension}.json |
| api-reference.json | 超过 300 行，或内外 API 明显分离 | api/api-{scope}.json |
| internals.json | 超过 400 行，或项目有明确分层 | internals/internals.json（索引）+ internals/internals-{layer}.json |
| （新增）runtime/ | 存在需与静态架构区分的运行时知识 | runtime/{topic}.json |
| specs.json | 超过 200 行或需要专题分离 | specs/specs.json + specs/{topic}.json |

**architecture 多维拆分**：当 architecture.json 超过 400 行时，按维度拆分到 architecture/ 子目录：

| 维度类型 | 文件名模式 | 内容 |
|---------|---------|------|
| 分层架构 | architecture-layers.json | 系统各层职责、层间接口、依赖方向 |
| 语言/技术集成 | architecture-{lang}.json | 特定语言的集成方式 |
| 部署环境 | architecture-servers.json | 不同部署目标的差异和配置 |
| 设计决策 | architecture-decisions.json | ADR（架构决策记录），含问题/选项/决策/理由 |
| 详细实现 | architecture-detail.json | 超出概要架构的实现细节 |

拆分后，主 architecture.json 变为索引层，保留概述并通过 `detailFiles` 字段指向各维度文件。

architecture-decisions.json 中每条记录包含：
`{ "id": "ADR-001", "context": "问题背景", "decision": "采用方案", "alternatives": ["未选方案"], "rationale": "选择理由" }`

**internals 按层拆分**：当 internals.json 超过 400 行且项目有明确分层时，迁移到 internals/ 子目录：

- `internals/internals.json`（索引）：列出各层文件路径和职责概要
- `internals/internals-{layer}.json`（详情）：每个架构层的具体实现细节

分层粒度：以项目自身的架构层为准，通常与 architecture.json 中的 layers 对应。每个 internals-{layer}.json 包含：keyFiles、coreLogic、stateManagement、externalDependencies。

子目录化后，必须更新 domain/index.json 的 `quickStart.directoryLayout` 字段提供子目录导航；若项目已有历史顶层 `directoryLayout`，只做兼容读取，不再作为新生成位置。

完成后更新 `knowledge-base/domains/index.json`（含 summary、quickAnswers、crossDomainRelations）。
委派模板见 `references/deepening-protocol.md` §「领域输出生成委派」。

对于复杂领域，领域索引还应增强以下导航字段：

- `startHere`
- `questionMap`
- `chainRefs`
- `upstreamInputs`
- `downstreamConsumers`
- `evidenceRefs`
- `quickStart.directoryLayout`（子目录化时必填，描述各子目录及其用途）

领域注册表 `knowledge-base/domains/index.json` 对复杂项目可增加：

- `navigationAssets`
- `entryScenes`
- `domainModel.primaryDomains`
- `domainModel.supplementaryTopicDossiers`
- 每个领域的 `role`（`primary-domain` 或 `supplementary-topic-dossier`）
- 每个领域的 `layerPosition`、`relatedChains`、`relatedHubs`、`commonTransitions`

其中：
- `primaryDomains` 承担稳定主导航，是默认首跳候选
- `supplementaryTopicDossiers` 只承载专题、桥接或补充知识，不应在没有 `entryScenes` / `questionMap` 明确指向时抢占首跳

### 阶段 8：Catalog 系统构建（大规模领域）

当领域满足以下任一触发条件时，在 5 个标准领域文件之外额外生成 Catalog 系统：

- 领域内存在 50+ 个同类实体（配置字段、文件、参数、模块）
- 单个详情文件超过 500 行
- Agent 经常需要"找到某个具体字段/文件/参数"而不是"理解整体架构"

| Catalog 类型 | 触发条件 | 索引文件 | 分片策略 |
|-------------|---------|---------|---------|
| file-catalog | 50+ 个源文件或配置文件 | catalog.json（文件清单） | 按目录或类型分片 |
| field-catalog | 50+ 个配置字段 | field-catalog.json（表级总览） | 按 ID 范围分片 |
| param-specs | 10+ 种参数类别 | param-specs.json（类别导航） | 按语义（配置类别）分片 |
| module-catalog | 10+ 个功能模块 | common-queries.json | 通常不分片 |

分片命名规范：
- ID 范围分片：{catalog}-{range}.json（如 field-catalog-36xx.json）
- 语义分片：{catalog}-{semanticKey}.json（如 param-specs-{category}.json）
- 编号分片：{catalog}-group-{range}.json（如 schemas-group-01-10.json）

分片策略汇总：

| 分片类型 | 命名模式 | 适用场景 | 分片粒度建议 |
|---------|---------|---------|------------|
| ID范围分片 | `{name}-{prefix}xx.json` | 实体有数字ID，按范围聚合 | 每片 30-100 个实体 |
| 编号范围分片 | `{name}-group-{start}-{end}.json` | 实体有序号，按区间划分 | 每片 10-20 个实体 |
| 语义分片 | `{name}-{semanticKey}.json` | 实体有明确语义分类 | 每个分类一个文件 |
| 时间分片 | `{name}-{YYYY}.json` | 时序数据 | 每年一个文件 |

每种分片策略必须配套一个**索引层文件**（与分片文件同目录），提供：
- 各分片的元数据（覆盖范围、实体数量、路径）
- 快速路由规则（给定查询条件如何定位目标分片）
- `summaryFields` 和 `detailFields` 声明（支持三层披露导航）

---
