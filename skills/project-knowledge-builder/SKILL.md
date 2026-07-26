---
name: project-knowledge-builder
description: |
  Builds persistent projects-memory knowledge datasets by analyzing source code. Trigger when the user asks to build/refresh/index/register project knowledge, scan a repo into project memory, deep dive a module/domain, create progressive disclosure knowledge, relation graphs, chains, or evidence-backed routing. Chinese triggers: 构建知识库、索引代码库、扫描项目、项目记忆、刷新知识库、深化模块知识、领域知识、知识路由。Do NOT trigger for one-time code exploration, code review, session saving, or ordinary implementation tasks.
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# 项目知识构建器

通过自主迭代探索项目源代码，构建结构化知识数据集，使 Agent 无需每次都重新探索代码库。

Agent 在每次对话中都会浪费大量上下文窗口和时间来重新探索代码库。一次深度分析即可
产出持久化的结构化知识，任何 Agent 都能即时加载。单轮扫描往往只捕获表层结构，
本技能采用**迭代深化策略**：每轮探索后评估"下一步建议"，对有价值的方向发起
下一轮定向探索，直到知识收敛。

## 知识组织目标

除基础的代码理解外，本技能还应在复杂项目中主动构建以下能力：

1. **渐进式披露**：让 Agent 先看入口层，再看导航层，再按需进入详情层。
2. **链路关联**：把配置 -> 映射 -> 运行时消费等主链路表达成可导航对象，而不是散落在多个文件里。
3. **图状结构**：对跨领域共享的概念、枢纽和依赖关系使用轻量关系图表达。
4. **证据挂载**：关键结论尽量指向具体知识文件、领域文件或任务记录，减少”只有结论没有来源”。
5. **文件分片**：单文件超过 500 行时，按 ID范围/编号范围/语义 进行分片，
   并在同目录维护索引层文件提供路由。分片不改变三层披露结构，
   分片文件本身属于详情层。

推荐的知识层次：

- L0 入口层：`context.json`、`memory-map.json`
- L1 导航层：`knowledge-base/index.json`、`knowledge-base/domains/index.json`
- L2 关系层：`knowledge-base/glossary.json`、`knowledge-base/relations.json`、`knowledge-base/chains/`
- L3 详情层：`development-specs.json`、`conventions.json`、`architecture.json`、`api-reference.json`、`domains/*`
- L4 证据层：`task-index.json`、`tasks/`、`_intermediate/`、`agent-outputs/`（若存在）

当项目满足以下任一条件时，应生成 L2 关系层：

- 存在 2 个以上领域或子系统
- 存在重复跨文件概念，适合抽取为 first-hop 术语
- 存在明显的数据流转链、配置桥接链或跨层依赖链
- 存在高中心度节点或“枢纽文件/枢纽表/枢纽服务”

## 本机代码仓库补证策略

当现有知识库无法对某个术语、别名、行为名或配置链给出稳定结论时，不要停留在“待补证”表述本身；应先检查当前设备是否存在相关项目代码仓库，再做定向补证：

1. 优先从环境变量 `RAGE_PROJECT_CODE_ROOTS` 获取候选代码仓库根目录
2. 调用 `使用 Read/Grep 检查 `projects-memory` 中的 alias、behavior 与 chain JSON 索引（本转换包不包含上游已缺失的 rage_cli.js）`
2.5. 补证前可先通过 `resolve:chain --alias "<词项>"` 确认当前知识库状态，避免重复补证已有数据
3. 若命中唯一且上下文一致的源码证据，可将知识升级为 B 级并写回 `resources/knowledge-overlay/` 的对应镜像文件
4. 若只得到弱匹配，记录到 `resources/knowledge-overlay/terminology/pending-evidence.json`，并在 evidence 字段中挂上命中的文件线索

该策略用于知识库刷新、领域深化、测试回归后的 KB 修复，不用于替代配置表真值校验。

## 输入参数

| 参数 | 必填 | 来源 | 说明 |
|------|------|------|------|
| 代码路径 | 是 | 用户提供或 `registry.json` → `projectPath` | 项目源代码的绝对路径 |
| 输出路径 | 是 | 用户提供或 `{PROJECTS_DIR}/{project-id}/` | projects-memory 文件写入位置 |
| 项目 ID | 是 | 用户提供或 `registry.json` → `activeProject` | 项目标识符 |
| 范围 | 否 | 用户指定 | `full`（默认）/ `incremental` / `domain`（领域深化） |
| 深度 | 否 | 用户指定或自动判断 | `quick` / `standard` / `deep`（默认） |
| 领域 | 仅 domain 模式 | 用户描述或结构化指定 | 如 `"auth 模块"` 或 `{ id, name, modules }` |

若用户未显式提供，按以下方式自动解析：
1. 读取 `{AMAGI_WORKSPACE_ROOT}/projects-memory/projects/registry.json`
2. 使用 `activeProject` 作为项目 ID
3. 使用 `projects[activeProject].projectPath` 作为代码路径
4. 使用 `{PROJECTS_DIR}/{activeProject}/` 作为输出路径

---

## 执行模型

### 深度策略选择

| 策略 | 适用场景 | 行为 |
|------|---------|------|
| `quick` | 小型项目（<50 文件）或用户指定 | Leader 直接执行阶段 1-6，不委派 |
| `standard` | 中型项目（50-500 文件） | 委派 explorer SubAgent 单轮扫描 → 输出 |
| `deep`（默认） | 大型项目（500+ 文件）或用户指定 | **创建 Agent Team** → Phase Gate 迭代深化 |

**委派强制规则**：`standard` 和 `deep` 模式下 Round 0 **必须**委派给 explorer。
即使项目看起来很小也不可跳过 -- explorer 返回前无法准确评估项目真实规模。
只有 `quick` 模式允许 Leader 直接执行。

Leader 的上下文是战略资源。将代码分析委派给 explorer，Leader 仅接收精简报告
（通常几百字），上下文开销极小。

### standard 模式流程

委派 explorer SubAgent 执行阶段 1-5，返回发现摘要 + 下一步建议列表。
若无有价值建议则收敛，进入阶段 6 生成输出文件。

读取 `references/deepening-protocol.md` 获取 explorer prompt 模板。

### deep 模式流程

**必须**使用 Agent Teams。读取 `references/agent-team-protocol.md` 获取完整的
Agent Team 创建、SubAgent spawn 模板、通信协议和 Phase Gate 规范。

核心流程：建立逻辑协作组 → Phase 1 全面扫描 → Phase 2 定向深化（最多 3 轮）→
Phase 3 writer 生成输出 → 结束逻辑协作组。

### 领域深化流程（scope: domain）

聚焦目标领域，**不重新构建全局知识**。遵循与全面模式相同的执行模型选择。

1. **参数解析**：从用户输入解析目标领域（结构化输入直接使用；自然语言提取 id/name/modules）
2. **检查现有领域知识**：读取 `{OUTPUT_PATH}/knowledge-base/domains/index.json`
   - 不存在 → 全新构建（创建 domains/index.json 和领域目录）
   - 领域已存在 → 增量更新
   - 领域不存在 → 全新构建（追加到注册表）
3. **执行探索和输出生成**：使用 domain explorer prompt（见 `references/deepening-protocol.md`
   §「Domain Explorer Prompt 模板」），生成 5 个领域知识文件 + 更新 domains/index.json

| 用户输入 | 解析结果 |
|---------|---------|
| "深化 auth 模块知识" | id: auth-system, modules: 推断（搜索 auth 相关目录） |
| "deep dive into src/payment/" | id: payment, modules: ["src/payment/"] |
| 结构化 `{ id: 'order-service', modules: ['src/orders/'] }` | 直接使用 |

### 收敛判定

满足**任一**条件即收敛：

| 条件 | 说明 |
|------|------|
| 无新建议 | 最新轮次的 explorer 未提出新方向 |
| 全部已覆盖 | 建议方向均被之前轮次覆盖 |
| 到达上限 | 已完成 3 轮深化（Round 0 + 3 = 共 4 轮） |
| 边际递减 | 新发现相比已有知识增量不足 20% |

宁可少探索一轮也不要过度消耗 token。

### 建议价值评估

**值得深化**：涉及未覆盖的模块/子系统、复杂内部接口/数据流、项目特有设计模式、
被 explorer 标记为"高"或"中"增量价值。

**不值得深化**：纯配置/环境差异、已覆盖的重复方向、第三方库内部实现、
被 explorer 标记为"低"增量价值。

### Leader 行为准则（所有模式通用）

| 规则 | 原因 |
|------|------|
| standard/deep 下必须委派 Round 0 | 只有 quick 允许直接执行 |
| 不直接读取项目代码文件 | 保护上下文，由 explorer 代读 |
| 只读小型配置文件（<50 行） | registry.json、context.json 允许 |
| 评估建议价值而非亲自探索 | Leader 增值点是调度而非执行 |
| 累积知识过大时写中间文件 | 保存到 `{OUTPUT_PATH}/_intermediate/round-N.md` |
| deep 模式下只做编排 | 想动手 → 发消息给 SubAgent |

---

## 分析阶段

以下阶段定义代码分析的具体内容。

- **`quick`**：Leader 直接执行阶段 1-6
- **`standard`**：Leader 将阶段 1-5 编入 explorer SubAgent 的 prompt
- **`deep`**：编入 explorer SubAgent 的 spawn prompt，Leader 不亲自分析

### 阶段 1：技术栈检测

识别语言、框架、构建系统和关键依赖。读取 `references/detection-patterns.md`
§「技术栈特征」获取文件模式映射表。

从特征文件入手，读取构建配置提取：框架版本、按类别分组的前 15-20 个依赖、
构建目标、支持平台。

**多语言项目**：若没有单一语言占 60% 以上，列出所有占比超 20% 的语言及百分比。

### 阶段 2：结构扫描

绘制目录树，理解模块布局，评估代码库规模。

**步骤 2a -- 排除规则**：读取 `.gitignore` 并与默认噪声目录合并
（`node_modules`、`.git`、`bin`、`obj`、`dist`、`build`、`__pycache__`、
`.vs`、`.idea`、`target`、`vendor`、`.next`、`out`）。

**步骤 2b -- 目录树**：Glob `*/` 和 `*/*/` 获取前两层。Glob 返回空时回退到
`ls -d */`。检测 Monorepo（packages/、apps/、lerna.json 等）。

**步骤 2c -- 文件分布**：按前 10 种文件类型 Glob 统计。采样 5-10 个文件估算行数。

**步骤 2d -- 模块与组件识别**：需要全面 -- 知识库质量取决于是否找到*全部*重要组件。

从目录结构识别模块，同时查找单一目录内的逻辑独立组件。

**发现检查清单**：
1. Glob 所有源文件（不仅是目录）
2. 检查每个文件是否构成独立功能单元
3. 查找 `src/` 外的项目文件
4. 读取 README 或入口点获取项目自身的组件列表
5. 目标：找到开发者描述项目时会提及的每个组件

### 阶段 3：架构分析

读取 `references/detection-patterns.md` §「架构指标」获取 Grep 模式。
搜索代码库后读取 3-5 个关键文件：入口点、核心领域模型、配置加载器、典型功能实现。

### 阶段 4：API 与接口清单

读取 `references/detection-patterns.md` §「API 检测模式」获取 Grep 模式。

编目外部 API（HTTP/CLI/SDK）和内部模块接口。对每个端点记录：
方法/路由/命令名称、参数和返回类型、简要用途。

**内部模块接口**：共享类型/DTO、事件系统、跨模块调用、依赖注入。

### 阶段 5：编码规范检测

读取 `references/detection-patterns.md` §「规范检测」获取完整领域列表。
目标：**10+ 个不同的规范类别**，附带来自实际代码库的具体示例。

不适用的类别省略并说明原因。

**验证检查清单**：
1. 规范输出包含 10+ 个不同类别？
2. 每个类别有来自实际代码库的具体示例？
3. 命名规范按实体类型细分？
4. 已捕获语言特有惯用法？

### 阶段 6：输出生成

将所有发现写入 projects-memory 格式。读取 `references/output-schema.md`
获取每个输出文件的精确 JSON 结构定义。

- **`quick`**：Leader 直接生成
- **`standard`**：可委派 SubAgent（模板见 `references/deepening-protocol.md` §「输出生成委派」）
- **`deep`**：**必须**由 writer SubAgent 执行（见 `references/agent-team-protocol.md`）

基础输出、导航增强、快查表、task-index 兼容、glossary/index/memory-map/relations/chains/terminology 和 evidence 规则已移至 `references/output-generation-rules.md`。执行阶段 6 输出生成时必须读取。

### 阶段 7-8：领域知识与 Catalog 构建

领域模式输出文件、runtime 子目录、领域深度子目录化、复杂领域导航字段和 Catalog 分片策略已移至 `references/domain-and-catalog-rules.md`。scope=domain 或大规模领域时必须读取。

## 输出质量检查清单

完成前逐一验证：

### 基础质量

- [ ] 所有 JSON 文件有效（可解析）
- [ ] context.json 所有必填字段已填充
- [ ] memory-map.json 包含全部必需 section；复杂项目可额外包含 `4_firstRead` 和 `5_decisionTree`
- [ ] knowledge-base/index.json 引用了所有生成的知识文件
- [ ] 无占位文本（TODO/TBD），使用 `"unknown"` 或省略
- [ ] 文件路径使用实际项目路径（必须为相对路径，不含盘符或 /home/ 前缀）
- [ ] 路径格式检查：无硬编码绝对路径（Grep `[A-Z]:\\` 和 `/home/\|/Users/` 应均返回 0 结果）
- [ ] 依赖列表来自真实构建配置数据
- [ ] 架构描述与实际代码结构一致
- [ ] 多语言项目对每种主要语言有规范覆盖
- [ ] conventions.json 包含 10+ 个非空规范类别
- [ ] 若项目使用 ks:schema 格式的 Schema 系统（如 Rage 引擎），knowledge-base 中应记录 Schema 仓库路径和默认值省略语义规则

### 渐进式披露验证（三层模型）

验证生成的知识库是否满足"索引层 -> 摘要层 -> 详情层"三层模型：

- [ ] **索引层**（<100 行即可获取全貌）：index.json 每个 entry 含 summary 和 keyQuestions
- [ ] **摘要层**（200-300 行内获取决策信息）：glossary.json 存在（若有 2+ 个跨文件重复概念）
- [ ] **详情层**（按需深入）：各详情文件通过 `$ref` 引用 glossary，无大段重复内容
- [ ] **跨文件冗余率** < 10%：同一概念的完整描述只出现在一个文件中（glossary 或首次定义处），其他文件引用之
- [ ] **导航层完整**：复杂项目的 index.json 至少包含 `recommendedFirstHop`、`entryByQuestion` 中的一项
- [ ] **关系层完整**：复杂项目存在 `relations.json` 或 `chains/index.json`
- [ ] **术语可导航**：高频术语具备 `firstHop` 或 `relatedDomains` / `relatedChains`

### 知识密度检查

- [ ] 每个 JSON 文件的有效信息行数/总行数 > 70%（排除纯结构行如 `{}`、`[]`、空行）
- [ ] memory-map.json 总行数 < 200 行（精简启动入口）
- [ ] index.json 文件总行数 < 100 行（快速扫描）
- [ ] glossary.json 中每个术语至少被 2 个文件引用（否则不值得提取为术语）
- [ ] 复杂项目的主链路文件数控制在 3-8 条之间，避免过度碎片化
- [ ] relations.json 中 `centralHubs` 不为空（若项目存在明显枢纽）

### domain 模式额外检查

- [ ] domains/index.json 中新领域已注册（id、name、summary、modules、tags、quickAnswers 完整）
- [ ] domains/index.json 含 crossDomainRelations（多领域时）
- [ ] domain/index.json 含 quickStart、crossReferences、commonQueries
- [ ] 复杂领域的 domain/index.json 含 `startHere`、`questionMap`、`chainRefs`
- [ ] specs.json 至少包含 5 条领域特定规范
- [ ] architecture.json 包含 components 和 dataFlow
- [ ] internals.json 包含 keyFiles 清单和 coreLogic 说明

---

## 增量模式

当指定 `scope: incremental` 时：
1. 读取现有 memory-map.json 和 knowledge-base 文件
2. 检测变更（git diff 或文件修改时间）
3. 仅重新分析受影响的模块/文件
4. 合并新发现到现有知识中，保留手动添加的内容
5. 更新 `lastUpdated` 时间戳
6. 若 `task-index.json` 已存在，可补充知识维护相关的证据字段，但不要创建虚假的活跃任务
7. 不覆盖已有人工维护的 `questionMap`、`entryScenes`、`evidenceRefs`，除非有更强证据修正

## 大型代码库处理

10,000+ 文件的项目：
- 采样目录而非全量扫描，优先 `src/`、`lib/`、`app/`
- 按模块采样代表性文件
- 使用具体 Glob 模式，避免 `**/*`

---

## 路径规范化规则（强制）

跨平台路径禁止项、相对路径规则、分隔符和验证字段已移至 `references/path-normalization.md`。所有知识库输出生成后必须按该文件自检。

---

## 捆绑参考资源

| 文件 | 内容 | 何时读取 |
|------|------|---------|
| `references/output-schema.md` | 所有输出文件的精确 JSON 结构定义（含 glossary.json、domains/ 和 task-archive.json） | 阶段 6-7（输出生成） |
| `references/detection-patterns.md` | 技术栈特征、API 检测模式、架构 Grep 指标、规范检测方法 | 阶段 1-5（按各阶段需要） |
| `references/deepening-protocol.md` | 迭代深化 prompt 模板（Round 0/N）、收敛评估、输出委派模板、Domain Explorer Prompt | standard/deep 策略时；domain 模式时 |
| `references/agent-team-protocol.md` | Agent Team 创建、SubAgent spawn 模板（含通信协议）、Leader 行为准则、Phase Gate 检查 | **仅 deep 模式时** |

---

## 相关 Skill

| Skill | 关联说明 |
|-------|---------|
| [workflow](../workflow/SKILL.md) | deep 模式的 Agent Teams 长步骤可纳入 workflow 全局编排 |
| knowledge-navigator | 若当前插件安装了该技能，构建的知识库可通过 knowledge-navigator 和 resolve:chain 被运行时消费；不存在时仅保留为概念边界 |
| cli-guide | 若当前插件安装了该技能，resolve:chain / probe 等 CLI 命令在补证和验证阶段使用；不存在时以实际 CLI 文档为准 |
