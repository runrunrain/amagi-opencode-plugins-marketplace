# Agent Team 协议（deep 模式专用）

deep 模式使用 OpenCode Leader 协调的并行 SubAgent 机制。SKILL.md 中选择 deep 策略后，
读取本文件获取 Agent Team 创建、SubAgent spawn、通信协议和 Phase Gate 的完整规范。

## 目录

- [为什么 deep 模式需要 Agent Team](#为什么-deep-模式需要-agent-team)
- [完整流程](#完整流程)
- [建立逻辑协作组](#建立逻辑协作组)
- [Explorer SubAgent Spawn](#explorer-SubAgent-spawn)
- [Writer SubAgent Spawn](#writer-SubAgent-spawn)
- [Leader 行为准则](#leader-行为准则)
- [Phase Gate 检查](#phase-gate-检查)

---

## 为什么 deep 模式需要 Agent Team

SubAgent 模式下，Leader 是所有通信的中枢 -- 每轮 explorer 返回后 Leader 必须
阅读报告、评估建议、决策下一步、再次创建 SubAgent。多轮迭代中 Leader 上下文
逐渐膨胀，决策质量下降。

Agent Team 模式下，explorer SubAgent 完成一轮后由 Leader 把结果传给另一个 explorer SubAgent
接力深化，writer SubAgent 可在探索进行中就开始组织已收敛的知识。Leader 只做
Phase Gate 判断和方向修正，上下文消耗极小。

对于复杂项目，Agent Team 还应承担额外协作目标：

- 识别和收敛高频概念，决定哪些应进入 glossary 并承担 first-hop 作用
- 识别主链路，决定哪些应沉淀为 chains/index 和 chains/{chain-id}.json
- 识别跨领域共享的枢纽和依赖边，决定哪些应进入 relations.json
- 为关键结论附加 evidenceRefs 和 confidence，而不是只保留抽象描述

---

## 完整流程

```
[1] 创建 Agent Team（Leader 建立逻辑协作组（无独立工具调用））
    │
[2] Phase 1：全面扫描
    ├─ spawn explorer SubAgent 执行阶段 1-6
    └─ Gate：explorer 返回报告 → Leader 评估收敛
         │
         ├─ 有高价值建议 → Phase 2
         └─ 无高价值建议 → 跳到 Phase 3
    │
[3] Phase 2：定向深化（可多轮，最多 3 轮）
    ├─ 为每个高价值方向 spawn 或复用 explorer SubAgent（独立方向可并行）
    │   └─ explorer 的跨领域发现由 Leader 中转
    └─ Gate：所有 explorer 返回 → Leader 评估收敛
         │
         ├─ 有新高价值建议 → 继续深化（Round N+1）
         └─ 收敛 → Phase 3
    │
[4] Phase 3：输出生成
    ├─ spawn writer SubAgent（或复用已有 SubAgent）
    │   └─ writer 读取所有 explorer 中间文件 → 生成基础知识文件；复杂项目额外生成 relations/chains
    └─ Gate：writer 返回 → Leader 验证输出质量
    │
[5] 清理团队（Leader 结束逻辑协作组（无独立工具调用））→ 完成
```

---

## 建立逻辑协作组

OpenCode 不需要创建原生 Team。Leader 维护 Phase、成员职责、依赖与 artifact 清单，
并通过多个 `task` 调用分派 SubAgent；独立方向可并行，有依赖的方向必须跨 Phase 串行。

---

## Explorer SubAgent Spawn

Phase 1 和 Phase 2 中 spawn explorer SubAgent。prompt 模板参见
`references/deepening-protocol.md`（Round 0 / Round N 模板），但须额外注入
以下 Agent Team 通信协议：

```
## 通信协议（必须遵守）

你是 knowledge-build-{PROJECT_ID} 团队的 explorer，不是孤立工作。

### 向 Leader 报告（task 返回 → Leader）
- 每完成一个维度后：将进度（如"3/5维度完成"）写入中间 artifact
- 发现风险或异常结构时：立即写入中间 artifact，并在 task 返回中置顶报告
- 识别到高频概念、主链路、枢纽节点或证据源时：写入中间 artifact，供 Leader 决定是否需要 relations/chains
- 任务完成时：交付物摘要 + 下一步建议

### 跨 SubAgent 信息（由 Leader 中转）
- 你的协作伙伴：{列出同 Phase 其他 explorer 和/或 writer}
- 发现跨领域关联时：在结果与 artifact 中标注目标方向，由 Leader 传给负责该方向的 explorer
- 发现共享枢纽或可复用链路时：在结果与 artifact 中注明，由 Leader 传给其他 explorer 与 writer，避免重复建模
- 发现某个结论证据不足时：向 Leader 报告补证需求，由 Leader 启动后续 task
- 完成探索后：如 仓颉（cangjie） 已 spawn，在 task 结果中注明"我的报告已就绪" + 文件位置，由 Leader 转交

### 消息格式
- 类型：[进度/风险/交付/发现]
- 内容：简明扼要（20行以内）
- 需要对方做什么：明确 action item

### 复杂项目额外职责
- 每个 explorer 在报告中显式输出：候选 first-hop 概念、候选领域入口、候选主链路、候选枢纽节点、候选证据源
- 若你负责的方向与已有链路重复，优先报告“修正现有链路”而不是建议新建一条链
- 对未闭环的推断必须标注 low/medium confidence，不得伪装成 verified fact
```

---

## Writer SubAgent Spawn

Phase 3 中 spawn writer SubAgent。

```
## 角色与身份
你是 knowledge-build-{PROJECT_ID} 团队的 writer（general-purpose Agent）。

## 任务
基于所有 白泽（baize） 产出的中间文件，生成项目知识文件。

## 中间文件位置
读取 {OUTPUT_PATH}/_intermediate/ 下的所有文件（explorer 报告汇总）

## 输出要求
读取 {SKILL_PATH}/references/output-schema.md 获取精确的 JSON 结构定义。
按该 schema 生成基础 9 个文件：
1. {OUTPUT_PATH}/context.json
2. {OUTPUT_PATH}/memory-map.json
3. {OUTPUT_PATH}/tasks/（空目录）
4. {OUTPUT_PATH}/knowledge-base/glossary.json（术语中心：从报告中提取跨文件重复概念）
5. {OUTPUT_PATH}/knowledge-base/index.json（含 summary/keyQuestions/moduleRelations/glossary 入口）
6. {OUTPUT_PATH}/knowledge-base/development-specs.json（重复概念用 $ref 引用 glossary）
7. {OUTPUT_PATH}/knowledge-base/conventions.json（重复概念用 $ref 引用 glossary）
8. {OUTPUT_PATH}/knowledge-base/architecture.json（重复概念用 $ref 引用 glossary）
9. {OUTPUT_PATH}/knowledge-base/api-reference.json

若 explorer 报告表明项目具有复杂领域边界、明显主链路、共享枢纽或跨文件高频概念，再额外生成：

10. {OUTPUT_PATH}/knowledge-base/relations.json
11. {OUTPUT_PATH}/knowledge-base/chains/index.json
12+. {OUTPUT_PATH}/knowledge-base/chains/{chain-id}.json

复杂项目还应增强现有输出：

- memory-map.json：可增加 4_firstRead、5_decisionTree、topChains、topHubs
- glossary.json：高流量术语增加 firstHop、relatedChains、relatedDomains、hubLevel、seeAlso、evidenceRefs
- knowledge-base/index.json：增加 recommendedFirstHop、entryByQuestion、entryByLayer、entryByChain、hubNodes、nextHopRules
- domains/index.json：增加 navigationAssets、entryScenes、domainModel.primaryDomains、domainModel.supplementaryTopicDossiers，以及各领域的 role/layerPosition/relatedChains/relatedHubs/commonTransitions
- domain/index.json：增加 startHere、questionMap、chainRefs、upstreamInputs、downstreamConsumers、evidenceRefs，以及 `quickStart.directoryLayout`

### 复杂项目可选扩展输出（由 explorer 报告的体量评估触发）

若 explorer 报告标记了以下情况，writer 须额外生成对应文件：

- 字段/参数/文件实体数 > 50 → Catalog 系统（catalog.json + catalog-{shard}.json）
  - 路径：`{OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/field-catalog/` 或 `param-specs/`
- 存在运行时决策/命令知识 → runtime/ 子目录文件
  - 路径：`{OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/runtime/{topic}.json`
- 架构/内部实现文件体量大且分层清晰 → architecture/ 和 internals/ 子目录化
  - 路径：`{OUTPUT_PATH}/knowledge-base/domains/{DOMAIN_ID}/architecture/` 和 `internals/`
- 别名歧义明显或存在未验证声明 → terminology/ 目录（colloquial-normalization.json、verified-chain-routes.json 等）
  - 路径：`{OUTPUT_PATH}/terminology/`（与 knowledge-base/ 同级）
- 知识库已完整（含 3+ 个领域）→ KNOWLEDGE-BASE-QUICK-REFERENCE.md
  - 路径：`{OUTPUT_PATH}/KNOWLEDGE-BASE-QUICK-REFERENCE.md`

扩展输出的 schema 定义详见 `references/output-schema.md` 中各对应节。

## 通信协议（必须遵守）

你是 knowledge-build-{PROJECT_ID} 团队的 writer，不是孤立工作。

### 向 Leader 报告（task 返回 → Leader）
- 每生成 2 个文件后：发送进度更新
- 遇到 explorer 报告信息不足时：立即报告 + 说明缺什么
- 识别到链路冲突、关系图冲突或证据不足时：立即报告 + 建议处理方式
- 任务完成时：文件清单 + 各文件大小 + 质量自检结果

### 与 Explorer 协作（由 Leader 中转）
- 如果发现某维度信息不足：向 Leader 报告缺口，由 Leader 启动补充 task
- 如果多个 explorer 对同一主链路给出不同结论：向 Leader 报告冲突，由 Leader 启动对齐或补证 task
- 消息格式同标准格式

### 复杂项目额外职责
- 先决定哪些项目需要 relations.json 和 chains/，再决定具体写多少条主链路，避免过度碎片化
- 对 relations.json 的关键节点/边和 chains 文件的关键转换点，优先补 evidenceRefs 与 confidence
- 对已验证事实与待补证问题分开写，避免把推断混入 verifiedFacts
- 待补证问题只写入 pending-evidence.items；新的 verified operational facts、历史 rollout 说明和已闭环限制应写到权威详情或 archive/report 文件
```

---

## Leader 行为准则

| 规则 | 原因 |
|------|------|
| **禁止直接读取项目代码文件** | 保护 Leader 上下文 |
| **禁止亲自执行分析阶段** | 由 explorer SubAgent 完成 |
| **禁止亲自生成输出文件** | 由 writer SubAgent 完成 |
| 只读小型配置文件（<50 行） | registry.json、context.json 允许 |
| 评估建议价值而非亲自探索 | Leader 的增值点是调度和门控 |
| 收到 SubAgent 消息必须响应 | 风险/阻塞/请求不可忽略 |
| Phase Gate 严格执行 | Phase N 未通过 → 禁止启动 Phase N+1 |
| 累积知识过大时写中间文件 | 保存到 `{OUTPUT_PATH}/_intermediate/round-N.md` |
| 复杂项目优先关心“是否需要关系层/链路层” | 避免只生成树状目录式知识库 |
| 对未闭环结论要求标注置信度 | 防止推测污染知识库 |

---

## Phase Gate 检查

每个 Phase 完成时，Leader 执行门控检查：

**Phase 1 Gate**（全面扫描完成）：
- explorer 报告已收到且非空
- 报告覆盖全部 6 个分析维度（含导航与证据候选）
- "下一步建议"部分有明确结论（有建议或"已充分覆盖"）
- 中间文件已持久化到 `_intermediate/`
- 对复杂项目，已识别候选 first-hop、候选主链路、候选枢纽节点、候选证据源

**Phase 2 Gate**（定向深化完成）：
- 所有高价值方向的 explorer 报告已收到
- 收敛评估已完成（见 SKILL.md §「收敛判定」）
- 累积知识已合并到中间文件
- 对复杂项目，已决定哪些链路进入 chains/，哪些共享节点进入 relations.json

**Phase 3 Gate**（输出生成完成）：
- 基础输出文件全部生成（含 glossary.json，若项目简单可为 8 个）
- 若项目满足复杂项目条件，relations.json 与 chains/ 已生成且路径闭环
- 所有 JSON 可解析
- 通过输出质量检查清单（见 SKILL.md §「输出质量检查清单」），包括渐进式披露验证和知识密度检查
- 若存在 evidenceRefs / confidence 字段，其引用路径和置信度语义一致
- **路径格式验证**（强制）：在 knowledge-base/ 目录执行以下 Grep，结果均须为 0 个匹配：
  - `[A-Z]:\\`（Windows 盘符绝对路径）
  - `/home/`（Linux 用户目录绝对路径）
  - `/Users/`（macOS 用户目录绝对路径）
  - 例外：context.json 的 projectPath 和 memory-map.json 的 projectRoot 允许绝对路径
