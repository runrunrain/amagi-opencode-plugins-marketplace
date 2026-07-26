# Change Catalog: Knowledge Base Evolution → Skill Iteration

**创建时间**：2026-03-23
**基于报告**：`D:/workpace-rage/explorer_rage-proven-ground-knowledge-analysis.md`
**分析范围**：10 个知识库演化模式 vs 当前 SKILL.md + 4 个 reference 文件
**核心结论**：知识库在标准 5 文件领域模板之上，演化出 7 个 Skill 完全未定义的新模式，以及 3 个大幅扩展的已有模式。

---

## 概述

知识库从 Skill 产出演化了什么：

知识库以 Skill 定义的基础结构为起点，在实际项目使用中自然增长出三类新能力：

1. **知识分片能力**：当单个文件超过合理阅读规模时，自动按 ID范围/语义/编号分片，配合索引层实现按需加载（file/field/module catalog + sharding）
2. **证据与术语管理**：独立 terminology/ 目录追踪术语规范化（别名字典 + 已验证链路 + 待证问题），将"知识是否可信"显式化
3. **领域深度子目录化**：当领域知识量超过 5 个标准文件能承载的范围时，自然演化为按关注点分组的子目录结构（architecture/、api/、internals/、runtime/ 等）

这三类能力共同构成了知识库对 Skill 当前定义的主要超越，需要在 Skill 迭代中显式定义。

---

## Target: SKILL.md

### 改进 1: Catalog 系统（新增节）

- **类别**: 新增节（阶段 7 之后或阶段 6 输出生成规则内）
- **知识库实例**:
  - `knowledge-base/domains/{domain-id}/field-catalog/field-catalog.json`（字段目录，6张配置表总览）
  - `knowledge-base/domains/{domain-id}/field-catalog/field-catalog-{range}.json`（按 DID 范围分片）
  - `knowledge-base/domains/{domain-id}/param-specs/param-specs.json`（参数规格索引层）
  - `knowledge-base/domains/{domain-id}/param-specs/param-specs-{category}.json`（按语义分片）
  - `knowledge-base/domains/config-tables-domain/` 中的 file-catalog（文件级目录）
  - `knowledge-base/domains/{domain-id}/common-queries.json`（模块级快查目录）
- **通用化规则**：
  当领域内存在大量同类实体（字段、参数、文件、模块）时，应建立 Catalog 系统：
  - **file-catalog**：记录领域内真实文件清单，含文件路径、DID范围、用途
  - **field-catalog**：记录配置表字段级元数据，每字段含名称、类型、数据流向、约束
  - **module-catalog / common-queries**：模块级路由，帮助 Agent 快速定位涉及的代码模块
  每种 catalog 都应有索引层（catalog.json）+ 按需分片层（catalog-{shard}.json）
- **触发条件**：
  - 领域内存在 50+ 个同类实体（配置字段、文件、参数、模块）
  - 单个详情文件超过 500 行
  - Agent 经常需要"找到某个具体字段/文件/参数"而不是"理解整体架构"
- **插入位置**: SKILL.md `### 阶段 7：领域知识构建（仅 domain 模式）` 节之后，新增 `### 阶段 8：Catalog 系统构建（大规模领域）`
- **参考内容框架**:
  ```
  ### 阶段 8：Catalog 系统构建（大规模领域）

  当领域满足触发条件时，在 5 个标准领域文件之外额外生成 Catalog 系统：

  | Catalog 类型 | 触发条件 | 索引文件 | 分片策略 |
  |-------------|---------|---------|---------|
  | file-catalog | 50+ 个源文件或配置文件 | catalog.json（文件清单） | 按目录或类型分片 |
  | field-catalog | 50+ 个配置字段 | field-catalog.json（表级总览） | 按 ID 范围分片 |
  | param-specs | 10+ 种参数类别 | param-specs.json（类别导航） | 按语义（配置类别）分片 |
  | module-catalog | 10+ 个功能模块 | common-queries.json | 通常不分片 |

  分片命名规范：
  - ID 范围分片：{catalog}-{range}.json（如 field-catalog-36xx.json）
  - 语义分片：{catalog}-{semanticKey}.json（如 param-specs-soldierconfig.json）
  - 编号分片：{catalog}-group-{range}.json（如 schemas-group-01-10.json）
  ```

---

### 改进 2: Terminology 目录（新增节）

- **类别**: 新增节（输出生成规则内，与 glossary.json 并列但独立）
- **知识库实例**:
  - `terminology/colloquial-normalization.json`（口语词→正式术语，含 confidence 等级）
  - `terminology/legion-alias-dictionary.json`（实体别名字典，34KB）
  - `terminology/verified-chain-routes.json`（已验证链路，含 steps + evidence）
  - `terminology/pending-evidence.json`（待补证问题清单）
- **通用化规则**：
  Terminology 目录是独立于 glossary.json 的外部知识系统，解决以下不同问题：
  - `glossary.json`：定义技术术语的规范含义（知识库内的概念统一）
  - `terminology/`：管理领域术语的命名歧义（人类语言中同一概念的不同叫法）
  - `terminology/verified-chain-routes.json`：记录已验证的完整执行链路（step-by-step 路径 + 证据）
  - `terminology/pending-evidence.json`：显式追踪知识库中尚未验证的声明

  Terminology 目录应位于项目根级别（与 knowledge-base/ 同级），不是 knowledge-base/ 的子目录。

  每个 colloquial-normalization 条目包含：
  - `colloquial`：非正式叫法
  - `formal`：正式名称（可为 null）
  - `confidence`：A（直接执行）/ B（可用但需谨慎）/ C（禁止直接执行，需先归一化）
  - `evidence`：支撑证据的具体来源
  - `rule`：Agent 遇到此术语时的处理规则
- **触发条件**：
  - 领域存在大量非正式别名，不同文档使用不同名称指代同一实体
  - 知识库中存在"待验证"的链路或声明（不确定是否正确）
  - 项目中有从用户口语到正式标识符的转换需求（如将"铁人"映射到 DID）
  - 知识库开始积累大量已验证的执行链路，值得显式记录保存
- **插入位置**: SKILL.md `## 输出质量检查清单` 之前，在阶段 6 输出生成规则内新增 `**terminology/ 目录生成规则（选项）**`
- **参考内容框架**:
  ```
  **terminology/ 目录生成规则（按需创建）**：

  当项目满足以下任一条件时，在项目根级别（与 knowledge-base/ 同级）创建 terminology/ 目录：

  - 存在大量别名或非正式叫法，可能导致 Agent 搜索失败
  - 知识库中存在置信度不足的声明，需要显式标记为"待验证"
  - 已积累足够多的验证执行链路，值得系统化记录

  | 文件 | 用途 | 生成时机 |
  |------|------|---------|
  | colloquial-normalization.json | 别名归一化规则（含 confidence 等级门控） | 存在命名歧义时 |
  | alias-dictionary.json | 全量别名字典（支持别名搜索） | 别名数量超过 20 个 |
  | verified-chain-routes.json | 已验证执行链路（step-by-step + evidence） | 已有验证链路时 |
  | pending-evidence.json | 待验证声明清单 | 存在不确定知识时 |

  confidence 等级定义：
  - A：直接使用，与正式标识符完全匹配
  - B：可作为入口使用，但需进一步确认
  - C：禁止直接使用，需先完成别名归一化
  ```

---

### 改进 3: 文件分片策略（新增节）

- **类别**: 新增节（知识组织目标或输出生成规则内）
- **知识库实例**:
  - `field-catalog-36xx.json`（DID 范围分片，3601-3624）
  - `27-ai-schemas-group-01-10.json`（编号范围分片，52个表分6片）
  - `param-specs-soldierconfig.json`（语义分片，13种配置类别）
  - `field-catalog.json`（索引层，提供分片导航）
- **通用化规则**：
  知识库文件应控制在合理规模（建议 300-500 行以内），超出时按以下策略分片：

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

  分片完成后，触发该索引的父目录也应包含当前目录的索引文件。
- **触发条件**：
  - 单个 JSON 文件超过 500 行
  - 单个 JSON 文件超过 50KB
  - 实体集合有天然的分组维度（ID前缀、语义类别、序号区间）
- **插入位置**: SKILL.md `## 知识组织目标` 节内，在"渐进式披露"小节后新增 `5. **文件分片**` 小节；同时在阶段 8 中引用此策略
- **参考内容框架**:
  ```
  5. **文件分片**：单文件超过 500 行时，按 ID范围/编号范围/语义 进行分片，
     并在同目录维护索引层文件提供路由。分片不改变三层披露结构，
     分片文件本身属于详情层。
  ```

---

### 改进 4: 快查表系统（新增节）

- **类别**: 新增节（输出生成规则内）
- **知识库实例**:
  - `KNOWLEDGE-BASE-QUICK-REFERENCE.md`（项目根级别，人类可读 Markdown，266行）
  - `knowledge-base/domains/legion-domain/ai-tables/27_ai_quick_reference.json`（领域快查）
  - `knowledge-base/domains/legion-domain/common-queries.json`（常见问题路由）
- **通用化规则**：
  快查表系统包含两种不同用途的文件：
  - **KNOWLEDGE-BASE-QUICK-REFERENCE.md**：项目根级别，面向人类和 Agent 的综合导航文档，
    提供按场景的阅读路径（如"需要修改X → 读A → 读B → 执行C"）和核心概念速查表
  - **domain-level quick-reference.json**：领域级别，面向高频查询的即时答案（不需要读详情文件）

  KNOWLEDGE-BASE-QUICK-REFERENCE.md 的结构：
  - 快速导航地图（5-10个典型场景的完整阅读路径）
  - 核心概念速查表（关键概念的对照表）
  - 文档完整性检查清单（知识库覆盖状态）
- **触发条件**：
  - 知识库已构建完整（包含 3+ 个领域）
  - 项目有明显的高频问题场景（Agent 反复查询同类问题）
  - 需要一份让新 Agent 能在 5 分钟内定向的导览文档
- **插入位置**: SKILL.md `### 阶段 6：输出生成` 节中，可选输出文件列表内增加快查表选项
- **参考内容框架**:
  ```
  当知识库建设完整（含 3+ 个领域）时，可额外生成快查表系统：

  | 文件 | 位置 | 格式 | 用途 |
  |------|------|------|------|
  | KNOWLEDGE-BASE-QUICK-REFERENCE.md | 项目根级别 | Markdown | 综合导览，含场景化阅读路径 |
  | {topic}_quick_reference.json | 领域子目录 | JSON | 高频问题即时答案，无需读详情 |

  快查表内容要求：
  - 每个场景提供完整的阅读顺序（从哪个文件开始 → 读哪个 → 执行什么）
  - 核心概念以对照表形式呈现（不是散文）
  - 包含知识库完整性状态检查清单
  ```

---

### 改进 5: 领域深度子目录化（扩展现有节）

- **类别**: 扩展节（阶段 7 领域知识构建）
- **知识库实例**:
  - `knowledge-base/domains/legion-domain/` 从标准 5 文件演化为 11 个子目录 + 80+ 文件：
    - `architecture/`：architecture.json + architecture-detail.json + architecture-decisions.json
    - `api/`：api-public.json + api-internal.json + api-reference.json
    - `internals/`：internals.json（索引）+ 9 个按架构层分片文件（ai-layer/algorithms/config-layer等）
    - `runtime/`：bot-ai-decision-tree.json + player-command-api.json
    - `field-catalog/`：见改进 1
    - `param-specs/`：见改进 1
    - `ai-tables/`：见改进（专题目录）
    - `config-tables/`：army-config-usage/army-core-config/config-table-relations
    - `specs/`：specs.json（迁移出域根级别）
- **通用化规则**：
  领域知识体积增长时，标准 5 文件（index/specs/architecture/api-reference/internals）应按**关注点**拆分为子目录：

  | 子目录 | 触发条件 | 包含文件模式 |
  |--------|---------|------------|
  | `architecture/` | architecture.json 超过 400 行，或存在多个独立架构维度 | architecture.json + architecture-{dimension}.json |
  | `api/` | api-reference.json 超过 300 行，或有明显的内外 API 分离 | api-public.json + api-internal.json + api-reference.json |
  | `internals/` | internals.json 超过 400 行，或项目有明确分层架构 | internals.json（索引）+ internals-{layer}.json |
  | `runtime/` | 存在需区别于静态架构的运行时专项知识 | {topic}-runtime.json |
  | `specs/` | 领域编码规范需脱离文档混杂 | specs.json + 按主题分片 |

  子目录根部应有自己的索引或 manifest 文件，提供目录内文件的导航。

  **重要**：`domain/index.json` 的 `quickStart.directoryLayout` 字段应列出所有子目录及其用途，作为新 Agent 进入领域的快速定向。
- **触发条件**：
  - 领域标准 5 文件中任何一个超过 400 行
  - 领域内存在多个独立关注点（如架构按层次/决策/服务器分维度）
  - 领域 API 有明显的内外部区分
  - 领域内部实现可按架构层清晰划分
- **插入位置**: SKILL.md `### 阶段 7：领域知识构建（仅 domain 模式）` 节内，扩展输出文件表格说明，明确子目录化条件
- **参考内容框架**:
  ```
  当领域知识体积超过标准 5 文件的承载能力时，将标准文件按关注点迁移到子目录：

  | 标准文件 | 子目录化条件 | 子目录内文件模式 |
  |---------|------------|----------------|
  | architecture.json | 超过 400 行，或有 3+ 个独立架构维度 | architecture/{dimension}.json |
  | api-reference.json | 超过 300 行，或内外 API 明显分离 | api/api-{scope}.json |
  | internals.json | 超过 400 行，或项目有明确分层 | internals/internals-{layer}.json |
  | （新增）runtime/ | 存在需与静态架构区分的运行时知识 | runtime/{topic}.json |
  | specs.json | 超过 200 行或需要专题分离 | specs/specs.json + specs/{topic}.json |

  子目录化后，必须更新 domain/index.json 的 quickStart.directoryLayout 字段提供子目录导航。
  ```

---

### 改进 6: Runtime 知识类别（新增节）

- **类别**: 新增节（领域知识构建章节）
- **知识库实例**:
  - `knowledge-base/domains/legion-domain/runtime/bot-ai-decision-tree.json`（Bot AI 决策树，完整行为分类）
  - `knowledge-base/domains/legion-domain/runtime/player-command-api.json`（玩家命令 API，阵形/技能入口）
  - `knowledge-base/domains/legion-domain/ai-tables/ai-runtime-config.json`（AI 运行时配置链路）
- **通用化规则**：
  Runtime 知识是领域内**运行时行为**的专项记录，区别于静态架构文档：
  - 静态架构（architecture.json）：系统如何被设计和构建
  - Runtime 知识（runtime/）：系统在运行时如何实际行为（决策树、命令处理、状态机）

  Runtime 目录应包含：
  - 决策树文件：系统在运行时如何根据输入做出决策（if A → B, if C → D）
  - 命令/API 文件：外部输入如何触发内部行为（命令名称 → 处理器 → 结果）
  - 运行时配置文件：哪些运行时参数已验证生效、哪些链路已验证有效

  Runtime 文件中应显式标记**已验证**和**待验证**状态（参见改进 2 的 confidence 体系）
- **触发条件**：
  - 领域有复杂的运行时决策逻辑（AI 决策、状态机、规则引擎）
  - 领域接受外部命令/事件驱动（玩家输入、配置热加载、消息队列）
  - 运行时行为与配置加载时的静态结构有本质区别，需要分离记录
- **插入位置**: SKILL.md `### 阶段 7：领域知识构建（仅 domain 模式）` 节内，在输出文件表格中增加 runtime/ 行
- **参考内容框架**:
  ```
  | 输出文件 | 关注重点 |
  |---------|---------|
  | domains/{id}/runtime/{topic}.json | 运行时决策逻辑、命令处理流程、已验证行为链路 |

  当领域满足以下条件时生成 runtime/ 子目录：
  - 存在复杂的运行时决策逻辑（决策树、状态机、规则引擎）
  - 存在外部命令/事件驱动的行为入口
  - 运行时行为需要区别于静态配置架构单独记录

  runtime/ 文件格式：
  - 决策树：{entity}-decision-tree.json（含决策节点、条件、输出行为）
  - 命令 API：{entity}-command-api.json（含命令名、参数、处理器、预期结果）
  - 运行时配置：{topic}-runtime-config.json（含已验证链路和配置来源）
  ```

---

### 改进 7: 证据追踪系统扩展（扩展现有节）

- **类别**: 扩展节（relations.json 和 chains/ 生成规则）
- **知识库实例**:
  - `terminology/verified-chain-routes.json`：独立的已验证链路证据文件（含 steps + confidence + evidence 字段）
  - `terminology/pending-evidence.json`：待验证声明，含优先级和当前已知线索
  - `chains/index.json` 中的 `crossLinks`：链路间交叉引用（`from` + `to` + `reason`）
  - `colloquial-normalization.json` 中的 `confidence` 等级（A/B/C + rule）
  - `relations.json` 中 `edges` 的 `confidence` 字段（high/medium/low）
- **通用化规则**：
  证据追踪分三个层次：
  1. **内联证据**（已有，在 SKILL.md 中有基础定义）：在 relations.json 的边和节点上挂 `evidenceRefs` + `confidence`
  2. **链路证据**（需扩展）：在独立文件中记录完整的 step-by-step 已验证链路，每步包含表/文件/字段/描述
  3. **待证清单**（新增）：在 pending-evidence.json 中显式追踪未解决的知识缺口，区分"已验证"和"推断"

  已验证链路文件（verified-chain-routes.json）的结构：
  - `id`：链路唯一标识
  - `name`：人类可读链路名
  - `triggerWords`：触发该链路查询的关键词（用于检索路由）
  - `steps`：完整步骤列表（每步含：顺序/表名/文件/目录/关键字段/描述）
  - `confidence`：整体置信度（A/B/C）
  - `evidence`：支撑证据的具体引用

  待证清单（pending-evidence.json）的结构：
  - `id`：待证问题标识
  - `question`：具体未解问题
  - `knownClues`：已有线索
  - `priority`：紧急程度
  - `lastAttempt`：上次尝试日期
- **触发条件**：
  - 知识库中存在"我们认为是这样，但尚未完整验证"的链路声明
  - Agent 需要区分"已在真实代码/数据中验证过"和"根据架构推断"的知识
  - 知识库积累了足够多的验证链路值得系统化保存
- **插入位置**: SKILL.md `**chains/{chain-id}.json 生成规则**` 之后，新增 `**evidence 层级说明**`
- **参考内容框架**:
  ```
  **evidence 追踪三层级**：

  1. 内联证据：在 relations.json 边/节点和 chains 关键点上使用 evidenceRefs + confidence
  2. 链路证据（terminology/verified-chain-routes.json）：当某条链路已完整验证时，
     在此文件记录 step-by-step 路径（含每步的表/文件/字段/描述），confidence 设为 A
  3. 待证清单（terminology/pending-evidence.json）：知识库中置信度低的声明，
     显式列出待补充的证据，防止把推断误当事实传播

  confidence 等级统一规范（跨所有文件）：
  - A：直接验证，有源码/数据/日志级别的直接证据
  - B：间接验证，有相关证据支持但非直接
  - C：推断，基于架构理解或文档描述，未经代码验证

  verified-chain-routes.json 的 step 字段规范：
  { "order": N, "table": "表名", "file": "文件名", "dir": "目录名", "keyField": "字段名", "description": "说明" }
  ```

---

### 改进 8: Architecture 多维拆分（扩展现有节）

- **类别**: 扩展节（领域知识构建和 output-schema 关联）
- **知识库实例**:
  - 全局级：`knowledge-base/architecture.json`（主文件）+ `architecture-layers.json`（分层详情）+ `architecture-lua.json`（Lua集成）+ `architecture-servers.json`（部署环境）
  - 领域级：`architecture/architecture.json`（总体）+ `architecture-detail.json`（详细实现）+ `architecture-decisions.json`（设计决策记录）
- **通用化规则**：
  当 architecture.json 超过 400 行或有多个相对独立的维度时，按维度拆分：

  | 维度类型 | 文件名模式 | 内容 |
  |---------|---------|------|
  | 分层架构 | architecture-layers.json | 系统各层职责、层间接口、依赖方向 |
  | 语言/技术集成 | architecture-{lang}.json | 特定语言的集成方式（Lua/Python/Wasm等） |
  | 部署环境 | architecture-servers.json | 不同部署目标的差异和配置 |
  | 设计决策 | architecture-decisions.json | ADR（架构决策记录），含问题/选项/决策/理由 |
  | 详细实现 | architecture-detail.json | 超出概要架构的实现细节 |

  拆分后，主 architecture.json 变为索引层：
  - 保留架构概述和各维度的 summary
  - 通过 `detailFiles` 字段指向各维度文件

  **设计决策记录（architecture-decisions.json）**是关键新增：记录"为什么这样设计，不选另一种方案"，防止知识遗忘和重复踩坑。
- **触发条件**：
  - architecture.json 超过 400 行
  - 架构有 3+ 个相对独立的维度（层次/语言/部署/决策）
  - 存在重要的设计决策需要显式记录（防止被反复质疑）
- **插入位置**: SKILL.md 阶段 7 输出文件表格中，扩展 `architecture.json` 行的说明
- **参考内容框架**:
  ```
  | 输出文件 | 关注重点 |
  |---------|---------|
  | domains/{id}/architecture/architecture.json | 架构总览 + 各维度文件导航 |
  | domains/{id}/architecture/architecture-{dimension}.json | 单一维度详情（按需生成） |
  | domains/{id}/architecture/architecture-decisions.json | 架构决策记录（ADR格式） |

  当 architecture.json 超过 400 行时，按维度拆分到 architecture/ 子目录。
  architecture-decisions.json 中每条记录包含：
  { "id": "ADR-001", "context": "问题背景", "decision": "采用方案", "alternatives": ["未选方案"], "rationale": "选择理由" }
  ```

---

### 改进 9: Internals 按层拆分（扩展现有节）

- **类别**: 扩展节（领域知识构建）
- **知识库实例**:
  - `internals/internals.json`（索引，列出所有层）
  - `internals/internals-ai-layer.json`（AI层内部实现）
  - `internals/internals-algorithms.json`（核心算法）
  - `internals/internals-config-layer.json`（配置层）
  - `internals/internals-conventions.json`（约定）
  - `internals/internals-management-layer.json`（管理层）
  - `internals/internals-persistence-layer.json`（持久层）
  - `internals/internals-state-mgmt.json`（状态管理）
  - `internals/internals-test-layer.json`（测试层）
  - `internals/internals-ui-layer.json`（UI层）
- **通用化规则**：
  当项目有明确分层架构时，internals.json 应按架构层拆分：
  - `internals.json`（索引）：列出各层文件路径和职责概要
  - `internals-{layer-name}.json`（详情）：每个架构层的具体实现细节

  拆分维度应来自领域自身的架构分层，不强制使用固定层名。
  常见的拆分维度：
  - 按系统功能层：ui / management / persistence / config / test
  - 按技术栈层：lua / cpp / database / api
  - 按业务关注点：ai / behavior / state / lifecycle

  每个 internals-{layer}.json 包含：
  - `keyFiles`：该层最重要的文件清单（路径+角色）
  - `coreLogic`：该层的核心算法或关键逻辑描述
  - `stateManagement`：该层如何管理状态（如有）
  - `externalDependencies`：该层依赖的外部组件
- **触发条件**：
  - internals.json 超过 400 行
  - 项目有明确的分层架构（3+ 层）
  - 不同层的关注点独立，可分别阅读
- **插入位置**: SKILL.md 阶段 7 输出文件表格中，扩展 `internals.json` 行的说明
- **参考内容框架**:
  ```
  | 输出文件 | 关注重点 |
  |---------|---------|
  | domains/{id}/internals/internals.json | 各层索引 + 路由规则 |
  | domains/{id}/internals/internals-{layer}.json | 单层详细实现（按需生成） |

  当 internals.json 超过 400 行且项目有明确分层时，迁移到 internals/ 子目录。
  分层粒度：以项目自身的架构层为准，通常与 architecture.json 中的 layers 对应。
  ```

---

### 改进 10: Chains 增强（扩展现有节）

- **类别**: 扩展节（chains/ 生成规则）
- **知识库实例**:
  - `chains/index.json` 的 `startQuestions`、`entryRules`、`crossLinks`（已在output-schema中有基础）
  - `chains/conversion-matrix.json`（跨实体转换规则矩阵，不同于线性链路的矩阵型链路）
  - `terminology/verified-chain-routes.json` 中的 chains（step-by-step 完整执行链路，含真实表名/字段）
- **通用化规则**：
  chains 文件分两种不同目的：
  1. **导航链路**（chains/*.json）：帮助 Agent 沿数据流导航知识库文件，每步指向一个 domain 或知识文件
  2. **执行链路**（terminology/verified-chain-routes.json）：记录已验证的完整数据流，每步包含真实的表/文件/字段名

  conversion-matrix.json（转换机制链路）是特殊类型：
  - 不是线性链路（A→B→C），而是矩阵型（多种输入类型 × 多种输出类型）
  - 记录"X 通过什么机制转换为 Y"的映射关系
  - 适合表达配置系统中的跨层转换（配置字段 → 运行时语义）

  chains/index.json 应增强以下字段：
  - `startQuestions`：进入链路系统前的分流问题（帮助 Agent 选择正确的链路）
  - `entryRules`：遇到什么类型问题应走哪条链路
  - `crossLinks`：链路间的推荐跳转（from/to/reason）
- **触发条件**：
  - 项目存在跨层的数据转换机制（配置→运行时，外部表→内部结构）
  - 已有验证证据支持完整的 step-by-step 链路记录
  - 现有链路之间存在自然的衔接关系值得显式建模
- **插入位置**: SKILL.md `**chains/{chain-id}.json 生成规则**` 节，在现有规则基础上追加 conversion-matrix 类型说明
- **参考内容框架**:
  ```
  chains 文件类型：

  1. 线性链路（标准）：A → B → C，每步指向知识库文件或领域
  2. 矩阵型链路（conversion-matrix）：多种输入类型 × 多种输出类型的转换规则表
     - 适用场景：存在配置-运行时桥接层时（如 QueryTableMapping 类机制）
     - 结构：nodes（输入/输出节点）+ edges（转换规则）+ matrix（完整映射矩阵）

  chains/index.json 必须包含：
  - startQuestions（2-3 个分流问题，帮助 Agent 在进入前确定方向）
  - entryRules（每类问题对应哪条链路）
  - crossLinks（链路间推荐跳转，含 reason）
  ```

---

## Target: references/output-schema.md

### 改进 11: 领域子目录化 Schema 定义（新增节）

- **类别**: 新增节
- **知识库实例**:
  - `legion-domain/` 结构（11个子目录，包含 architecture/、api/、internals/、runtime/ 等）
  - `legion-domain/index.json` 的 `quickStart.directoryLayout` 字段
- **通用化规则**：
  为领域深度子目录化新增专属 schema 节，定义：
  - `quickStart.directoryLayout` 字段的 schema（域根 index.json 必须包含，描述子目录及其用途）
  - 各子目录的 manifest/index 文件 schema
  - 子目录化后的 `domain/index.json` 必须更新的字段（quickStart.steps、quickStart.directoryLayout）
- **触发条件**: 领域知识超出 5 文件标准模板时
- **插入位置**: `## knowledge-base/domains/{domain-id}/index.json` 节之后，新增 `## knowledge-base/domains/{domain-id}/{subdir}/` 节
- **参考内容框架**:
  ```json
  // domain/index.json 新增字段
  {
    "quickStart": {
      "directoryLayout": {            // 子目录化时必填
        "{subdir-name}/": "该子目录职责的一句话描述",
        "field-catalog/": "字段级目录，按 ID 范围分片",
        "internals/": "内部实现，按架构层分片"
      }
    }
  }

  // 子目录 manifest 文件（如 internals/internals.json）
  {
    "version": "1.0",
    "lastUpdated": "ISO日期",
    "description": "该子目录的职责概述",
    "files": [
      {
        "path": "internals-{layer}.json",
        "description": "该文件覆盖的架构层",
        "keyTopics": ["核心算法", "状态管理"]
      }
    ],
    "summaryFields": ["description", "keyTopics"],
    "detailFields": ["path"]
  }
  ```

---

### 改进 12: Catalog 文件 Schema（新增节）

- **类别**: 新增节
- **知识库实例**:
  - `field-catalog/field-catalog.json`（字段目录索引层）
  - `field-catalog/field-catalog-36xx.json`（字段目录分片详情层）
  - `param-specs/param-specs.json`（参数规格索引层）
- **通用化规则**：
  为 Catalog 系统定义精确的 JSON schema
- **插入位置**: `## knowledge-base/domains/{domain-id}/internals.json` 节之后
- **参考内容框架**:
  ```json
  // catalog 索引层 schema（field-catalog.json / param-specs.json 等）
  {
    "version": "1.0",
    "lastUpdated": "ISO日期",
    "description": "字段/参数/文件目录的索引层",
    "totalCount": 200,              // 实体总数
    "shards": [                     // 分片列表
      {
        "id": "shard-id",
        "path": "catalog-{range}.json",
        "range": "ID或语义范围描述",
        "count": 30,
        "preview": ["重要实体名1", "重要实体名2"]
      }
    ],
    "quickLookup": {                // 高频查询的即时答案（无需读分片）
      "常见查询1": "直接答案",
      "常见查询2": "直接答案"
    },
    "summaryFields": ["range", "count", "preview"],
    "detailFields": ["path"]
  }

  // catalog 分片详情层 schema（field-catalog-36xx.json / param-specs-soldierconfig.json）
  {
    "version": "1.0",
    "shardId": "36xx",
    "parentIndex": "field-catalog.json",
    "entities": [
      {
        "id": "实体ID",
        "name": "实体名称",
        "type": "实体类型",
        // 实体特定字段...
        "metadata": {},
        "constraints": [],
        "examples": []
      }
    ]
  }
  ```

---

### 改进 13: Terminology 目录 Schema（新增节）

- **类别**: 新增节
- **知识库实例**:
  - `terminology/colloquial-normalization.json`
  - `terminology/verified-chain-routes.json`
  - `terminology/pending-evidence.json`
- **插入位置**: `## knowledge-base/chains/{chain-id}.json` 节之后
- **参考内容框架**:
  ```json
  // colloquial-normalization.json
  {
    "version": "1.0",
    "description": "口语词到正式术语的归一化规则，含置信度等级门控",
    "entries": [
      {
        "colloquial": "口语叫法",
        "formal": "正式名称（null 表示无法确定）",
        "confidence": "A|B|C",
        "rule": "Agent 遇到此术语的处理规则",
        "evidence": "支撑证据的具体来源"
      }
    ]
  }

  // verified-chain-routes.json
  {
    "version": "1.0",
    "description": "已验证执行链路的step-by-step路径表",
    "chains": [
      {
        "id": "chain-id",
        "name": "链路名称",
        "triggerWords": ["触发词1", "触发词2"],
        "steps": [
          {
            "order": 1,
            "table": "表名",
            "file": "文件名",
            "dir": "目录名",
            "keyField": "关键字段名",
            "description": "此步骤说明"
          }
        ],
        "confidence": "A|B|C",
        "evidence": "整体支撑证据"
      }
    ]
  }

  // pending-evidence.json
  {
    "version": "1.0",
    "description": "待补充验证的知识声明",
    "items": [
      {
        "id": "pending-001",
        "question": "具体未解问题",
        "knownClues": ["已知线索1", "已知线索2"],
        "priority": "high|medium|low",
        "lastAttempt": "ISO日期（可为null）"
      }
    ]
  }
  ```

---

### 改进 14: chains/index.json Schema 增强（扩展现有节）

- **类别**: 扩展节
- **知识库实例**: `knowledge-base/chains/index.json`（已有 startQuestions / entryRules / crossLinks）
- **通用化规则**: 当前 output-schema.md 中的 chains/index.json 缺少 `startQuestions`、`entryRules`、`crossLinks` 字段的 schema 定义
- **插入位置**: `## knowledge-base/chains/index.json` 节，在现有 json 结构中追加这三个字段
- **参考内容框架**:
  ```json
  {
    "startQuestions": [            // 新增：进入链路前的分流问题
      "问题1（帮助 Agent 判断应走哪条链路）"
    ],
    "entryRules": [               // 新增：触发条件→链路的映射规则
      "遇到什么问题先走哪条链"
    ],
    "crossLinks": [               // 新增：链路间推荐跳转
      {
        "from": "chain-a",
        "to": "chain-b",
        "reason": "为什么 A 做完后应该看 B"
      }
    ]
  }
  ```

---

## Target: references/deepening-protocol.md

### 改进 15: Domain Explorer Prompt 扩展 - 子目录化侦查（扩展现有节）

- **类别**: 扩展节（Domain Explorer Prompt 模板）
- **知识库实例**: `legion-domain/` 的 11 个子目录展示了探索时需识别的子目录化机会
- **通用化规则**：
  在 Domain Explorer Prompt 的维度 1（领域内部架构）中，明确要求 explorer 识别：
  - 领域内已有或应有的子目录化需求
  - 哪些文件/知识点属于 runtime 类型（运行时行为而非静态架构）
  - 哪些实体集合适合建立 catalog 系统（超过 50 个同类实体）
- **插入位置**: `## Domain Explorer Prompt 模板` 的 `### 维度 1：领域内部架构` 之后
- **参考内容框架**:
  ```
  ### 维度 1.5：领域知识体量评估
  评估以下各类知识的规模，判断是否需要子目录化或 catalog 系统：

  - 配置字段数量：超过 50 个时建议 field-catalog 分片
  - 参数规格类别：超过 10 类时建议 param-specs 按语义分片
  - 源文件数量：超过 50 个时建议 file-catalog
  - 架构维度：超过 3 个独立维度时建议 architecture/ 子目录
  - 运行时行为：如有决策树/命令API等运行时知识，标记为 runtime/ 候选
  - 内部实现层数：超过 3 层时建议 internals/ 按层分片

  在报告的"四、下一步建议"中，明确说明哪些知识点应建立 catalog 或子目录化。
  ```

---

### 改进 16: 领域输出生成委派 - Catalog 构建指导（扩展现有节）

- **类别**: 扩展节（领域输出生成委派）
- **通用化规则**：
  在领域输出生成委派的输出要求中，增加 Catalog 系统和子目录化的生成指导
- **插入位置**: `## 领域输出生成委派` 节的 `## 输出要求` 之后
- **参考内容框架**:
  ```
  ### 可选扩展输出（当领域满足触发条件时）

  6. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/field-catalog/field-catalog.json
     及 field-catalog-{range}.json 分片（字段数 > 50 时）
  7. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/param-specs/param-specs.json
     及 param-specs-{category}.json 分片（参数类别 > 10 时）
  8. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/runtime/ 子目录
     （存在运行时决策/命令知识时）
  9. 子目录化后的 architecture/、api/、internals/ 目录
     （对应文件超过 400 行时）
  10. {OUTPUT_PATH}/terminology/ 目录（存在别名歧义或待验证知识时）
  ```

---

## Target: references/detection-patterns.md

### 改进 17: 领域知识体量检测模式（新增节）

- **类别**: 新增节
- **知识库实例**: explorer 报告中统计的实体数量（200+字段、52个xlsx、13种配置类别等）
- **通用化规则**：
  在 detection-patterns.md 中新增"领域知识体量检测"节，提供 Grep/Glob 模式用于估算实体数量，从而判断是否需要 Catalog 或子目录化
- **插入位置**: `## 规范检测` 节之后
- **参考内容框架**:
  ```
  ## 领域知识体量检测

  用于在 domain explorer 阶段评估是否需要 Catalog 或子目录化。

  ### 配置字段计数
  Grep: "field_name|column_name|fieldId" in domain config files
  Glob: "*.json" count in domains/{id}/

  ### 配置文件计数
  Glob: "*.xlsx|*.csv|*.json" count in config table directories

  ### 参数类别检测
  Grep: "Config$|Spec$|Params$" in class/struct definitions
  识别项目中的配置类名，用于判断 param-specs 分片粒度

  ### 架构层检测
  Grep: "layer|Layer|tier|Tier|level|Level" in architecture comments
  识别架构层数，用于判断 internals 是否需要按层分片

  ### 运行时知识检测（新增）
  Grep: "decision.*tree|command.*handler|state.*machine|behavior.*rule"
  识别运行时决策逻辑，标记为 runtime/ 目录候选

  ### 别名密度检测（新增）
  Grep: "alias|nickname|informal|colloquial"
  识别别名系统，标记 terminology/ 目录需求
  ```

---

## Target: references/agent-team-protocol.md

### 改进 18: Writer SubAgent 扩展任务（扩展现有节）

- **类别**: 扩展节（Writer SubAgent Spawn）
- **通用化规则**：
  writer SubAgent 的输出要求中增加：
  - Catalog 系统生成职责（当 explorer 报告标记了高体量实体集合时）
  - Terminology 目录生成职责（当 explorer 报告标记了别名歧义或待验证知识时）
  - 快查表文件生成职责（知识库完整时）
- **插入位置**: `## Writer SubAgent Spawn` 节的可选扩展输出说明中
- **参考内容框架**:
  ```
  ### 复杂项目可选扩展输出（由 explorer 报告的体量评估触发）

  若 explorer 报告标记了以下情况，writer 须额外生成对应文件：

  - 字段/参数/文件实体数 > 50 → Catalog 系统（catalog.json + catalog-{shard}.json）
  - 运行时决策/命令知识存在 → runtime/ 子目录文件
  - 架构文件体量大且分层清晰 → architecture/ 和 internals/ 子目录化
  - 别名歧义明显或存在未验证声明 → terminology/ 目录（4个文件）
  - 知识库已完整（3+ 领域）→ KNOWLEDGE-BASE-QUICK-REFERENCE.md
  ```

---

## 交叉一致性检查清单

- [x] SKILL.md 中引用的所有文件（chains/index.json、chain-id.json、relations.json）在 output-schema.md 中有对应 schema 定义
- [x] output-schema.md 新增的 Catalog、Terminology、子目录化 schema 与 SKILL.md 的阶段 7/8 触发条件一致
- [x] detection-patterns.md 的新增体量检测模式，触发 SKILL.md 阶段 8 的 Catalog 构建
- [x] deepening-protocol.md 的 Domain Explorer Prompt 扩展，帮助 explorer 识别需要子目录化/Catalog 的场景
- [x] agent-team-protocol.md 的 writer 职责扩展，覆盖所有新增输出文件类型
- [ ] 待确认：terminology/ 目录的位置（项目根级别）是否需要在 output-schema.md 中有独立 schema 节，还是在 SKILL.md 生成规则内描述即可（建议：在 output-schema.md 中新增 `## terminology/（可选）` 节，保持 schema 的单一来源）
- [ ] 待确认：KNOWLEDGE-BASE-QUICK-REFERENCE.md 是 Markdown 格式，不需要 JSON schema，但建议在 output-schema.md 中说明其内容模板（章节结构：导航地图/核心概念速查/完整性检查清单）

---

**总改进数量**：18 项
**覆盖演化模式**：10/10（全覆盖）
**目标文件分布**：SKILL.md（10项）+ output-schema.md（4项）+ deepening-protocol.md（2项）+ detection-patterns.md（1项）+ agent-team-protocol.md（1项）
