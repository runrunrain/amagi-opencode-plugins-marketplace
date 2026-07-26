# 迭代深化协议

Explorer 的 prompt 模板和收敛评估规范。Leader 在使用 `standard` 或 `deep`
策略时读取本文件。

**模式说明**：
- **standard 模式**：使用下方模板创建 explorer SubAgent（subagent_type=amagi:baize）
- **deep 模式**：使用相同模板内容作为 Agent Team SubAgent 的 spawn prompt，
  但须额外注入通信协议（见 SKILL.md §「Explorer SubAgent Spawn」节）。
  在 deep 模式下，白泽（baize） 由 Leader 通过 `task` 调用分派为 SubAgent，
  而非通过 Task 工具创建 SubAgent。

## 目录

- [Round 0 Explorer Prompt 模板](#round-0-explorer-prompt-模板)
- [Round N 定向深化 Prompt 模板](#round-n-定向深化-prompt-模板)
- [收敛评估指南](#收敛评估指南)
- [知识累积规则](#知识累积规则)
- [输出生成委派](#输出生成委派)
- [Domain Explorer Prompt 模板](#domain-explorer-prompt-模板)
- [领域深化收敛评估](#领域深化收敛评估)
- [领域输出生成委派](#领域输出生成委派)

---

## Round 0 Explorer Prompt 模板

创建 explorer SubAgent（`subagent_type=amagi:baize`），使用以下 prompt。
将 `{...}` 占位符替换为实际值。

```
## 角色
你是项目知识构建的 白泽（baize） Agent，负责全面扫描并分析代码库。

## 任务
对 {PROJECT_CODE_PATH} 执行全面的代码库分析，涵盖以下 5 个维度。
你的分析成果将被用于构建持久化的项目知识库，供所有 Agent 在后续会话中复用。
分析越深入、越准确，后续 Agent 就越少浪费时间重新探索。

### 维度 1：技术栈检测
识别项目的语言、框架、构建系统和关键依赖。
从特征文件入手（package.json、*.csproj、pyproject.toml、go.mod 等），
读取构建配置提取：框架版本、按类别分组的前 15-20 个依赖、构建目标、支持平台。
多语言项目列出所有占比超过 20% 的语言。

### 维度 2：结构扫描
绘制目录树（前两层），识别模块和组件。
排除噪声目录（node_modules、.git、bin、obj、dist、__pycache__ 等）。
统计文件分布，估算代码行数。
重点：找到*全部*重要组件，包括 src/ 外的脚本、工具、插件。
检查是否为 Monorepo（packages/、apps/、lerna.json 等）。
同时识别：适合作为 first-hop 的领域入口、共享概念和潜在枢纽节点。

### 维度 3：架构分析
Grep 搜索架构指标（abstract class、interface、Controller/Service/Repository 等），
读取 3-5 个关键文件（入口点、核心模型、配置、典型功能实现），
理解系统层次、模块依赖、设计模式和数据流。
额外关注：是否存在清晰的数据流转链、配置桥接链、共享中间层或高中心度节点。

### 维度 4：API 与接口
搜索 API 框架标记（[HttpGet]、@app.route、app.get 等），
编目外部 API（HTTP/CLI/SDK）和内部模块接口。
记录共享类型、事件系统、跨模块通信方式。
若项目具有明显的跨模块调用链，标记为候选 `chain`。

### 维度 5：编码规范
采样代码检测命名风格、文件组织、错误处理、日志、测试、配置管理等规范。
目标：10+ 个不同规范类别，每个附带代码库中的具体示例。
不适用的类别（如纯后端项目的 UI 模式）省略并说明原因。

### 维度 6：导航与证据候选
识别以下候选对象：
- 高频概念（适合进入 glossary 并作为 first-hop）
- 领域入口（适合进入 domains/index 的 entryScenes）
- 主链路（适合进入 chains/index 和 chains/{chain-id}.json）
- 枢纽节点（适合进入 relations.json 的 centralHubs）
- 证据源（适合作为 evidenceRefs 的文件或章节）

## 输出格式（严格遵循）

### 一、发现摘要

按维度组织，每个维度列出关键发现。技术栈和结构数据要具体（版本号、文件数、
路径），不要泛泛描述。

对于复杂项目，发现摘要中必须额外包含：
- 候选 first-hop 概念
- 候选领域入口
- 候选主链路
- 候选枢纽节点
- 候选证据源

### 二、下一步建议（关键 -- 影响后续深化轮次）

列出你在分析中发现但未能深入的方向。这些建议将决定是否需要下一轮定向探索。

格式：
- **方向名称**：[具体描述，越具体越好]
  - 为什么有价值：[能为知识库贡献什么，解决什么信息缺口]
  - 建议探索入手点：[从哪些文件/目录/模式入手]
  - 预估增量价值：高 / 中 / 低

只列出真正有价值的方向。如果本轮已充分覆盖所有重要方面，
"下一步建议"部分写"本轮已充分覆盖主要方面，无需进一步深化"。
不要为了凑数而列低价值建议。

## 约束
- 报告控制在 400 行以内（精简但不遗漏关键信息）
- 只读操作，不修改任何文件
- 使用 Glob/Grep/Read 工具进行代码分析
```

---

## Round N 定向深化 Prompt 模板

当 Round 0 或上一轮的"下一步建议"中存在高价值方向时，Leader 为每个方向
创建独立的 explorer SubAgent。独立方向可并行执行。

```
## 角色
你是项目知识构建的 白泽（baize） Agent，负责对特定方向进行深度探索。

## 背景
这是项目 {PROJECT_CODE_PATH} 知识构建的第 {ROUND_NUMBER} 轮定向深化。
以下是前序轮次的关键发现摘要：

{PREVIOUS_FINDINGS_SUMMARY}

## 你的探索方向
**{DIRECTION_NAME}**：{DIRECTION_DESCRIPTION}

前序轮次认为这个方向有价值的原因：{WHY_VALUABLE}

建议入手点：{SUGGESTED_ENTRY_POINTS}

## 任务
深入探索上述方向，目标是补全前序轮次未能覆盖的知识缺口。

重点关注：
- 该方向涉及的核心代码文件和逻辑
- 模块间的接口和数据流
- 该方向特有的设计模式和约定
- 对整体架构理解的补充和修正
- 该方向是否应沉淀为 glossary 术语、relations 节点/边、或 chains 主链路

## 输出格式

### 一、深度发现
[本次探索的详细发现，具体、有数据支撑]

### 二、对前序发现的修正（如有）
[如果本次探索发现前序轮次的某些结论需要修正，在此列出]

### 三、下一步建议
[如有进一步值得探索的方向，使用与 Round 0 相同的格式]
[如已充分覆盖，明确写"本方向已充分覆盖，无进一步建议"]

## 约束
- 报告控制在 250 行以内
- 聚焦于指定方向，不扩散到无关领域
- 只读操作，不修改任何文件
```

---

## 收敛评估指南

每轮 explorer 返回后，Leader 使用以下框架评估是否继续深化。

### 评估步骤

1. **收集建议**：从本轮所有 explorer 报告中提取"下一步建议"
2. **去重**：合并指向同一方向的建议
3. **过滤**：按以下标准筛选

### 值得深化的建议

| 特征 | 权重 |
|------|------|
| 涉及尚未覆盖的模块或子系统 | 高 |
| 涉及复杂的内部接口或数据流 | 高 |
| 涉及项目特有的设计模式或约定 | 中 |
| explorer 明确标记为"高增量价值" | 高 |
| explorer 标记为"中增量价值" | 中 |

### 不值得深化的建议

| 特征 | 原因 |
|------|------|
| 纯配置/环境差异 | 对开发者日常工作帮助有限 |
| 已被之前轮次覆盖的重复方向 | 无增量信息 |
| 第三方库的内部实现 | 不属于项目知识 |
| explorer 标记为"低增量价值" | 投入产出比低 |
| 仅涉及测试数据或 fixture | 通常不需要深入 |

### 收敛判定（任一满足）

| 条件 | 判断方法 |
|------|---------|
| 无新建议 | 本轮所有 explorer 报告的"下一步建议"均为空或标记"已充分覆盖" |
| 全部已覆盖 | 过滤后无剩余高价值建议 |
| 到达上限 | 当前为 Round 3（共 4 轮含 Round 0） |
| 边际递减 | 本轮新发现内容量 < 前一轮的 20% |

### Leader 收敛决策模板

```
## 第 N 轮收敛评估

本轮 explorer 报告数：{COUNT}
本轮新发现要点：{KEY_FINDINGS_BRIEF}

下一步建议汇总：
- {SUGGESTION_1}：已覆盖 / 高价值 / 中价值 / 低价值
- {SUGGESTION_2}：...

高价值建议数：{HIGH_COUNT}
中价值建议数：{MED_COUNT}

判定：继续深化（N 个方向）/ 收敛
理由：{RATIONALE}
```

---

## 知识累积规则

### 在对话上下文中累积

多轮探索的发现在 Leader 的工作上下文中自然累积。Leader 不需要将每轮报告
完整记忆 -- SubAgent 返回的报告已经是压缩后的精华。

### 何时持久化到中间文件

当以下任一条件出现时，将已确认的知识写入中间文件：

| 条件 | 操作 |
|------|------|
| 已完成 2+ 轮，累积内容明显增大 | 写入 `{OUTPUT_PATH}/_intermediate/round-0-summary.md` 等 |
| 即将执行输出生成但上下文紧张 | 将所有轮次发现整合为一份中间文件 |
| 委派 SubAgent 生成输出时 | 将中间文件路径传入 SubAgent prompt |

中间文件格式：Markdown，按维度组织，包含所有轮次的累积发现。
输出生成完成后，`_intermediate/` 目录可保留（作为审计追溯）或删除。

### 知识合并策略

当后续轮次的发现与前序轮次有重叠或冲突时：

| 场景 | 处理 |
|------|------|
| 补充细节 | 合并到对应维度，标注来源轮次 |
| 修正前序结论 | 采用最新轮次的结论，标注修正 |
| 发现矛盾 | 保留两者，在输出中标注需要人工确认 |

---

## 输出生成委派

**standard 模式**：当 Leader 上下文紧张或累积知识量大时，可将阶段 6（输出生成）
委派给 general-purpose SubAgent。

**deep 模式**：阶段 6 **必须**由 writer SubAgent 执行（见 SKILL.md §「Phase 3：
输出生成」），使用下方相同的 prompt 内容但通过 task 结果与 Leader 中转。

以下模板适用于 standard 模式的 SubAgent 委派：

```
## 角色
你是项目知识构建的输出生成 Agent。

## 任务
基于以下探索报告，生成项目知识文件。

## 探索报告
{选择以下方式之一}
方式 A：直接粘贴所有轮次的 explorer 报告
方式 B：中间文件路径 -- 读取 {OUTPUT_PATH}/_intermediate/ 下的所有文件

## 项目信息
- 项目 ID：{PROJECT_ID}
- 代码路径：{PROJECT_CODE_PATH}
- 输出路径：{OUTPUT_PATH}

## 输出要求
读取 {SKILL_PATH}/references/output-schema.md 获取精确的 JSON 结构定义。
按该 schema 生成以下 9 个文件：

1. {OUTPUT_PATH}/context.json
2. {OUTPUT_PATH}/memory-map.json
3. {OUTPUT_PATH}/tasks/（空目录）
4. {OUTPUT_PATH}/knowledge-base/glossary.json（术语中心，见下方生成规则）
5. {OUTPUT_PATH}/knowledge-base/index.json（含 summary/keyQuestions/moduleRelations）
6. {OUTPUT_PATH}/knowledge-base/development-specs.json
7. {OUTPUT_PATH}/knowledge-base/conventions.json
8. {OUTPUT_PATH}/knowledge-base/architecture.json
9. {OUTPUT_PATH}/knowledge-base/api-reference.json

若探索报告显示项目存在复杂领域边界、明显主链路或共享枢纽，再额外生成：

10. {OUTPUT_PATH}/knowledge-base/relations.json
11. {OUTPUT_PATH}/knowledge-base/chains/index.json
12+. {OUTPUT_PATH}/knowledge-base/chains/{{chain-id}}.json

### glossary.json 生成规则
1. 从 explorer 报告中识别在 2+ 个输出文件中重复出现的概念
2. 为每个概念创建术语条目（id/term/definition/aliases/category/relatedFiles）
3. 在其他输出文件中，将重复描述替换为 "$ref": "glossary#termId" 引用
4. 若项目简单（<5 个潜在术语），可跳过 glossary.json

### index.json 增强规则
- 每个 entry 必须包含 summary（核心价值概括）和 keyQuestions（Top3 问题）
- 存在 glossary.json 时增加 glossary 入口字段
- 对复杂项目增加 recommendedFirstHop、entryByQuestion、entryByLayer、entryByChain、hubNodes、nextHopRules
- 可选增加 moduleRelations（文件间引用关系图）

### 复杂项目导航增强规则
- memory-map.json 可增加 4_firstRead 和 5_decisionTree
- glossary 高流量术语增加 firstHop、relatedChains、relatedDomains、hubLevel
- domains/index.json 可增加 navigationAssets、entryScenes、domainModel.primaryDomains、domainModel.supplementaryTopicDossiers，以及每个领域的 role/layerPosition/relatedChains
- domain/index.json 可增加 startHere、questionMap、chainRefs、upstreamInputs、downstreamConsumers、evidenceRefs，以及 `quickStart.directoryLayout`
- relations.json 的关键节点和边尽量附加 evidenceRefs 与 confidence

## 质量要求
- 所有 JSON 必须可解析
- 无占位文本（TODO/TBD），不确定的用 "unknown" 或省略
- 文件路径使用相对路径（相对于 projectRoot 或知识库根目录），禁止绝对路径
  - 唯一例外：context.json 的 projectPath 字段允许绝对路径
  - 路径格式验证：Grep `[A-Z]:\\` 和 `/home/\|/Users/` 应均返回 0 结果
- 依赖列表来自报告中的真实数据
- conventions.json 至少 10 个非空规范类别
- memory-map.json 仅包含 7 个静态/半静态 sections（1-3, 6-9）
- task-index.json 默认不创建；若文件已存在，可补充知识维护类 evidence 字段，但不要伪造任务历史
- incremental 模式下，若现有 task-index 已包含 completed/cancelled 的证据性条目，必须保留并兼容消费，不要为了追求 active-only 理想格式而自动清空或迁移
- pending-evidence.json 的 `items` 是唯一主入口；新的 verified operational facts、历史 rollout 说明和已闭环限制不得继续写入其中
- 跨文件冗余率 < 10%（同一概念完整描述仅出现一次）
- 每个文件有效信息行数/总行数 > 70%

## 约束
- 严格按 output-schema.md 的结构生成
- 不访问项目代码（所有信息来自 explorer 报告）
- 生成完毕后输出文件清单和各文件大小
```

---

## 完整执行示例

以下是 `deep` 策略的典型执行流程：

```
Leader 读取 registry.json → 获取项目路径和输出路径
  │
  ├─ Round 0：spawn explorer SubAgent（Round 0 模板）
  │   └─ explorer 返回 380 行报告：
  │       - 发现：C#/.NET 8.0 项目，12 个模块，MVC 架构
  │       - 下一步建议：
  │         1. [高] 数据访问层使用了自定义 ORM 封装，需深入分析
  │         2. [中] 插件系统有独立的加载机制，值得文档化
  │         3. [低] 日志配置细节
  │
  ├─ 收敛评估：2 个高/中价值建议 → 继续深化
  │
  ├─ Round 1：并行 spawn 2 个 explorer SubAgent
  │   ├─ explorer-1（数据访问层）→ 返回 200 行报告
  │   │   - 深度发现：自定义 Unit of Work + Repository 模式
  │   │   - 下一步建议：无（已充分覆盖）
  │   └─ explorer-2（插件系统）→ 返回 180 行报告
  │       - 深度发现：MEF 插件加载 + 自定义生命周期管理
  │       - 下一步建议：无（已充分覆盖）
  │
  ├─ 收敛评估：所有方向已覆盖 → 收敛
  │
  └─ 阶段 6：基于 Round 0 + Round 1 的累积发现生成 8 个输出文件
```

---

## Domain Explorer Prompt 模板

当 scope=domain 时，Leader 使用此模板替代 Round 0 Explorer Prompt。
将 `{...}` 占位符替换为实际值。

```
## 角色
你是项目知识构建的 白泽（baize） Agent，负责对特定领域进行深度分析。

## 背景
这是项目 {PROJECT_CODE_PATH} 的领域知识构建任务。
目标领域：{DOMAIN_NAME}（{DOMAIN_DESCRIPTION}）
领域代码范围：{DOMAIN_MODULES}

{如已有全局知识库，在此提供架构概览}
全局架构概览（来自 knowledge-base/architecture.json）：
{GLOBAL_ARCHITECTURE_SUMMARY}

## 任务
聚焦分析上述领域范围内的代码，构建该领域的深度知识。

### 维度 1：领域内部架构
- 领域内组件划分和职责
- 组件间依赖关系
- 领域内数据流（输入 → 处理 → 输出）
- 领域与外部系统的交互点

### 维度 1.5：领域知识体量评估

评估以下各类知识的规模，判断是否需要子目录化或 Catalog 系统：

- 配置字段数量：超过 50 个时建议建立 field-catalog 分片
- 参数规格类别：超过 10 类时建议 param-specs 按语义分片
- 源文件数量：超过 50 个时建议建立 file-catalog
- 架构维度：超过 3 个独立维度时建议 architecture/ 子目录
- 运行时行为：如有决策树/命令 API 等运行时知识，标记为 runtime/ 候选
- 内部实现层数：超过 3 层时建议 internals/ 按层分片

在报告的"四、下一步建议"中，明确说明哪些知识点应建立 Catalog 或子目录化。

### 维度 2：领域 API 面
- 对外暴露的公共 API（供其他模块调用）
- 内部核心方法（领域内高频使用）
- 每个 API 的参数、返回值、用途
- API 调用链和典型使用流程

### 维度 3：领域特定规范
- 领域内命名约定（如特定前缀、后缀、枚举值命名）
- 领域内数据模型和类型定义
- 领域内错误处理模式
- 领域内测试策略

### 维度 4：核心实现细节
- 关键算法和核心业务逻辑
- 状态管理方式
- 缓存策略（如有）
- 并发/异步处理模式

### 维度 5：领域与全局的关系
- 该领域在整体架构中的位置
- 与其他领域/模块的依赖关系
- 共享的类型/接口/事件
- 配置和环境依赖

## 输出格式（严格遵循）

### 一、领域概况
[领域身份、代码规模（文件数、行数估算）、核心职责]

### 二、分维度发现
[按 5 个维度组织，每个维度列出关键发现，数据要具体]

### 三、关键文件清单
[列出领域内最重要的 10-20 个文件，注明每个文件的角色]

### 四、下一步建议
[未能深入的子方向，使用标准格式；若已充分覆盖，写"本领域已充分覆盖，无进一步建议"]

## 约束
- 报告控制在 350 行以内
- 只分析 {DOMAIN_MODULES} 范围内的代码（及其直接依赖）
- 只读操作，不修改任何文件
```

---

## 领域深化收敛评估

domain 模式的收敛评估，评估维度聚焦在领域知识完整性而非广度。

### 领域知识完整性检查

| 评估维度 | 完整标准 |
|---------|---------|
| 领域内组件覆盖 | 所有重要组件已识别，无遗漏子系统 |
| API 面完整性 | 主要公共 API 已记录，使用方已识别 |
| 数据流清晰度 | 从输入到输出的主要数据流已描述 |
| 外部交互识别 | 与外部服务/数据库/其他领域的交互已标记 |
| 规范捕获 | 领域特有约定已区别于全局规范记录 |

### 领域收敛判定（任一满足）

| 条件 | 判断方法 |
|------|---------|
| 无新建议 | 本轮 domain explorer 报告未提出新的深化方向 |
| 覆盖完整 | 上方 5 个评估维度均达到完整标准 |
| 到达上限 | 已完成 Round 0 + 2 轮深化（domain 模式最多 3 轮） |
| 边际递减 | 本轮新发现内容量 < 前一轮的 20% |

### 不值得深化的方向（domain 模式）

| 特征 | 原因 |
|------|------|
| 第三方库的内部实现 | 不属于领域知识 |
| 全局通用规范（非领域特有） | 已在全局 conventions.json 中覆盖 |
| 纯配置文件细节 | 对开发者日常帮助有限 |
| 其他领域的代码 | 超出 DOMAIN_MODULES 范围 |

---

## 领域输出生成委派

**standard 模式**：当 Leader 上下文紧张或领域报告量大时，可将阶段 7（领域输出
生成）委派给 general-purpose SubAgent。

**deep 模式**：阶段 7 由 writer SubAgent 执行，使用下方相同的 prompt 内容。

以下模板适用于 standard 模式的 SubAgent 委派：

```
## 角色
你是项目知识构建的输出生成 Agent，负责生成领域特定知识文件。

## 任务
基于以下领域探索报告，生成领域知识文件。

## 探索报告
{选择以下方式之一}
方式 A：直接粘贴所有轮次的 domain explorer 报告
方式 B：中间文件路径 -- 读取 {OUTPUT_PATH}/_intermediate/ 下的领域相关文件

## 领域信息
- 领域 ID：{DOMAIN_ID}
- 领域名称：{DOMAIN_NAME}
- 领域代码范围：{DOMAIN_MODULES}
- 输出路径：{OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/

## 输出要求
读取 {SKILL_PATH}/references/output-schema.md 中 "domains/" 相关 schema。
生成以下文件：

1. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/index.json（含 quickStart/crossReferences/commonQueries）
2. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/specs.json
3. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/architecture.json
4. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/api-reference.json
5. {OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/internals.json
6. 更新 {OUTPUT_PATH}/knowledge-base/domains/index.json（追加新领域条目含 summary/quickAnswers；若文件不存在则新建含 crossDomainRelations）

### domain/index.json 增强规则
- quickStart：Agent 进入领域的最短路径步骤（3-4 步）
- crossReferences：与其他领域和全局术语的关联
- commonQueries：3-5 个常见问题及答案所在文件

### domains/index.json 增强规则
- 每个 domain 条目必须包含 summary（2-3 句概括）和 quickAnswers（3-5 个即时答案）
- 多领域时增加 crossDomainRelations（依赖关系图和建议阅读顺序）

### 可选扩展输出（当领域满足触发条件时）

若 domain explorer 报告的体量评估显示以下情况，须额外生成对应文件：

6. `{OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/field-catalog/field-catalog.json`
   及 `field-catalog-{range}.json` 分片（配置字段数 > 50 时）
7. `{OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/param-specs/param-specs.json`
   及 `param-specs-{category}.json` 分片（参数类别 > 10 时）
8. `{OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/runtime/` 子目录
   （存在运行时决策树/命令 API 等运行时知识时）
9. 子目录化后的 `architecture/`、`api/`、`internals/` 目录
   （对应文件超过 400 行，或有 3+ 个独立关注点时）
10. `{OUTPUT_PATH}/terminology/` 目录
    （存在别名歧义或待验证知识声明时）

## 质量要求
- 所有 JSON 必须可解析
- 无占位文本（TODO/TBD），不确定的用 "unknown" 或省略
- specs.json 至少包含 5 条领域特定规范
- architecture.json 包含完整的 components 和 dataFlow 描述
- internals.json 包含 keyFiles 清单（10-20 个文件）和 coreLogic 说明
- 领域文件路径使用相对路径（领域内部引用相对于 domain 目录，代码路径相对于 projectRoot），禁止绝对路径
  - 路径格式验证：Grep `[A-Z]:\\` 和 `/home/\|/Users/` 应均返回 0 结果
- 每个文件有效信息行数/总行数 > 70%

## 约束
- 严格按 output-schema.md 中 domains/ 相关 schema 的结构生成
- 不访问项目代码（所有信息来自 domain explorer 报告）
- 生成完毕后输出文件清单和各文件行数
```

---

## 领域深化完整执行示例

以下是 `domain` 模式的典型执行流程：

```
用户触发："深化 auth 模块的知识"
  │
  ├─ Skill 解析：scope=domain, domain={ id:"auth-system", modules:["src/auth/"] }
  │   （modules 从 "auth 模块" 推断：搜索 src/ 下含 auth 的目录）
  │
  ├─ 检查 {OUTPUT_PATH}/knowledge-base/domains/index.json
  │   → 文件存在但无 auth-system → 全新构建
  │
  ├─ Round 0：spawn domain explorer SubAgent（Domain Explorer Prompt 模板）
  │   └─ 聚焦扫描 src/auth/ 目录
  │       └─ 返回 300 行领域报告：
  │           - 领域概况：JWT + Session 双模式认证，5 个核心组件，约 2000 行
  │           - 维度 1：JwtService + SessionManager + AuthMiddleware 三层架构
  │           - 维度 2：8 个公共 API，核心 authenticate() + refreshToken()
  │           - 维度 4：Token 轮换算法需深入分析
  │           - 下一步建议：[高] OAuth2 集成流程（src/auth/oauth/）未覆盖
  │
  ├─ 收敛评估：1 个高价值建议 → 继续深化
  │
  ├─ Round 1：spawn explorer 深化 OAuth2 集成流程
  │   └─ 聚焦 src/auth/oauth/
  │       └─ 返回 180 行报告，OAuth2 流程已充分覆盖
  │           - 下一步建议：本方向已充分覆盖
  │
  ├─ 收敛评估：无新高价值建议 → 收敛
  │
  ├─ 阶段 7：生成 5 个领域知识文件
  │   ├─ domains/auth-system/index.json（领域索引）
  │   ├─ domains/auth-system/specs.json（7 条领域特定规范）
  │   ├─ domains/auth-system/architecture.json（3 层架构 + OAuth2 数据流）
  │   ├─ domains/auth-system/api-reference.json（8 个公共 API）
  │   └─ domains/auth-system/internals.json（15 个关键文件 + Token 轮换算法）
  │
  └─ 更新 domains/index.json → 注册 auth-system 领域
```
