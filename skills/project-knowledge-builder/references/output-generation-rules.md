# 项目知识输出生成规则

> Extracted from `project-knowledge-builder/SKILL.md` for progressive disclosure.

基础输出始终生成以下 9 个文件：

| 文件 | 内容来源 |
|------|---------|
| **context.json** | 阶段 1 身份+技术栈，阶段 2 组件 |
| **memory-map.json** | 所有阶段 → 7 段式精简记忆地图 |
| **tasks/**（空目录） | 首次构建仅创建空目录 |
| **knowledge-base/glossary.json** | 跨文件重复概念 → 术语中心（见下方生成规则） |
| **knowledge-base/index.json** | 索引，引用下方所有知识文件，含 summary/keyQuestions |
| **knowledge-base/development-specs.json** | 阶段 1+2：构建系统、依赖、模块 |
| **knowledge-base/conventions.json** | 阶段 5：命名、文件组织、错误处理、测试等 |
| **knowledge-base/architecture.json** | 阶段 3+4：层次、依赖、模式、数据流 |
| **knowledge-base/api-reference.json** | 阶段 4：外部 API 面、内部接口 |

当项目具备复杂领域边界、重复跨文件概念或明确主链路时，额外生成以下导航增强文件：

| 文件 | 内容来源 |
|------|---------|
| **knowledge-base/relations.json** | 阶段 2-4：跨领域概念、枢纽节点、依赖边 |
| **knowledge-base/chains/index.json** | 阶段 2-4：主链路注册表 |
| **knowledge-base/chains/{chain-id}.json** | 阶段 2-4：具体链路、转换点、上下游引用、下一跳规则 |

当知识库建设完整（含 3+ 个领域）时，可额外生成快查表系统：

| 文件 | 位置 | 格式 | 用途 |
|------|------|------|------|
| KNOWLEDGE-BASE-QUICK-REFERENCE.md | 项目根级别 | Markdown | 综合导览，含场景化阅读路径 |
| {topic}_quick_reference.json | 领域子目录 | JSON | 高频问题即时答案，无需读详情 |

快查表内容要求：
- 每个场景提供完整的阅读顺序（从哪个文件开始 → 读哪个 → 执行什么）
- 核心概念以对照表形式呈现（不是散文）
- 包含知识库完整性状态检查清单

对于已存在 `task-index.json` 的项目，可增量补充知识维护类证据字段（如 `evidencePolicy`、`relatedDomains`、`relatedChains`）；
不要伪造不存在的任务历史。

**task-index 兼容约束**：
- 新建项目的规范目标仍是 active-only task-index + task-archive.json
- 但 incremental 刷新时，如果现有 task-index 已承载 completed/cancelled 的证据性条目，必须保留并兼容消费，禁止为了追求理想 schema 而自动清空、归档或重写

**glossary.json 生成规则**：
1. 从 explorer 报告中识别在 2 个以上输出文件中需要描述的概念
2. 为每个概念创建术语条目（id/term/definition/aliases/category/relatedFiles）
3. 在其他输出文件中，将重复描述替换为 `"$ref": "glossary#termId"` 引用
4. 若项目简单（<5 个潜在术语），可跳过 glossary.json 生成
5. 对高频术语（高流量入口概念）补充 `firstHop`、`relatedChains`、`relatedDomains`、`hubLevel`、`seeAlso`

**index.json 增强规则**：
- 每个 entry 必须包含 `summary`（1-2 句核心价值概括）和 `keyQuestions`（Top3 问题）
- 存在 glossary.json 时，增加 `glossary` 入口字段
- 对复杂项目，增加 `recommendedFirstHop`、`entryByQuestion`、`entryByLayer`、`entryByChain`、`hubNodes`、`nextHopRules`
- 可选增加 `moduleRelations`（知识文件间引用关系图）

**memory-map.json 增强规则**：

- 对复杂项目，增加 `4_firstRead` 和 `5_decisionTree` 两个 section
- `4_firstRead` 用于回答“我现在先读哪一个文件”
- `5_decisionTree` 用于回答“接下来该按概念、领域还是链路下钻”
- 可在 `6_technicalPoints` 中补充 `topChains` 与 `topHubs`

**relations.json 生成规则**：

1. 提取跨领域共享概念、枢纽对象、桥接机制、核心表/服务/模块
2. 使用轻量 JSON 图模型输出 `nodes`、`edges`、`views`、`centralHubs`
3. 对关键节点和边尽量增加 `evidenceRefs` 和 `confidence`
4. 不引入图数据库或过度复杂建模，保持可人工维护

**chains/{chain-id}.json 生成规则**：

1. 为项目中重要的数据流转链、配置桥接链、调用链生成独立链路文件
2. 每条链至少包含：`goal`、`entryQuestions`、`corePath`、`transitionPoints`、`relatedDomains`、`upstreamRefs`、`downstreamRefs`、`nextHop`
3. 若已有证据来源，增加 `validationChecks`、`evidenceRefs`、`verifiedFacts`
4. 链路数量应精简，只保留开发者会重复使用的主链路

chains 文件类型：

1. 线性链路（标准）：A → B → C，每步指向知识库文件或领域
2. 矩阵型链路（conversion-matrix）：多种输入类型 × 多种输出类型的转换规则表
   - 适用场景：存在配置-运行时桥接层时（如跨层映射机制）
   - 结构：nodes（输入/输出节点）+ edges（转换规则）+ matrix（完整映射矩阵）

chains/index.json 必须包含：
- `startQuestions`：2-3 个分流问题，帮助 Agent 在进入前确定方向
- `entryRules`：每类问题对应哪条链路
- `crossLinks`：链路间推荐跳转（from/to/reason）

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
| pending-evidence.json | 待验证声明清单（items-only） | 存在不确定知识时 |

confidence 等级定义：
- A：直接使用，与正式标识符完全匹配
- B：可作为入口使用，但需进一步确认
- C：禁止直接使用，需先完成别名归一化

**编程化验证**：构建完成后可通过 `resolve:chain` 验证知识库的路由能力：
```bash
# 验证别名字典
使用 Read/Grep 检查 `projects-memory` 中的 alias、behavior 与 chain JSON 索引（本转换包不包含上游已缺失的 rage_cli.js）
# 验证链路匹配
使用 Read/Grep 检查 `projects-memory` 中的 alias、behavior 与 chain JSON 索引（本转换包不包含上游已缺失的 rage_cli.js）
```

若 resolve:chain 无法命中预期结果，说明知识库仍有缺口需继续深化。

**evidence 追踪三层级**：

1. 内联证据：在 relations.json 边/节点和 chains 关键点上使用 evidenceRefs + confidence
2. 链路证据（terminology/verified-chain-routes.json）：当某条链路已完整验证时，
   在此文件记录 step-by-step 路径（含每步的表/文件/字段/描述），confidence 设为 A
3. 待证清单（terminology/pending-evidence.json）：知识库中置信度低的声明，
   显式列出待补充的证据，防止把推断误当事实传播；历史 rollout 说明、已闭环限制和 verified operational facts 不应继续写入此文件

confidence 等级统一规范（跨所有文件）：
- A：直接验证，有源码/数据/日志级别的直接证据
- B：间接验证，有相关证据支持但非直接
- C：推断，基于架构理解或文档描述，未经代码验证

verified-chain-routes.json 的 step 字段规范：
`{ "order": N, "table": "表名", "file": "文件名", "dir": "目录名", "keyField": "字段名", "description": "说明", "fileType": "xlsx/xml/ast/res_xml/mixed", "nodeRole": "config_entry/config_relay/res_mapping/res_carrier/res_terminal", "writeMode": "modify/add/verify/read_only", "plannerBoundary": false }`

**注意**：`task-index.json` 首次构建时**不创建**。任务历史是运行时数据。
