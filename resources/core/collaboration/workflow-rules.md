> **OpenCode adapter（优先于下文的跨 harness 描述）**：
> - `agent_team` 在本插件中表示 Leader 调度多个 OpenCode SubAgent，可用 background task 并行独立方向；所有通信与交接都经 Leader。
> - OpenCode 没有 Claude Agent Teams 的 P2P mailbox，也不接受 `isolation: worktree` task 参数；需要 worktree 时先由 Leader/taibai 显式创建并把绝对路径写进 Task Contract。
> - 所有 Amagi SubAgent 的 `task` 权限均为 deny，递归分派由运行时权限和 prompt 双重阻止。
# 协作流程规则

> Source Status: canonical
> Scope: 任务档位、执行路由、轮次自检、强制后续链、审核规则、Artifact Contract、证据要求与返回格式。

## 三个独立判断

| 字段 | 作用 |
|---|---|
| `task_tier` | `simple/medium/complex`；决定契约字段集、轮次自检项与审核深度 |
| `execution_mode` | `leader_direct/single_agent/agent_team`；决定谁执行 |
| `review_mode` | `leader/diting`；决定谁审核当前 diff |

默认 `task_tier=medium`。边界不清、范围扩张或存在风险时升级；不得因为文件数少就降级。
`task_tier` 仅为 Task Contract 契约字段，全部在提示词与规范层生效，无 hook 信号机制；不确定时按 medium（保守方向）。

## 执行路由

| 路径 | 条件 | 动作 |
|---|---|---|
| Leader 直做 | 相机行事三条件同时满足：信息完备、工作量小、低风险 | Leader 直接完成 |
| 单 Agent | 需要专业能力，但范围小、边界清晰 | 分派一个对应 Agent |
| Standard | 多文件、跨模块、边界不清或有风险 | 分派执行 Agent；必要时计划 |
| Complex | 多模块、强依赖、需要持续协作/辩论 | requirement-analysis → execution-plan → 必要时 Agent Teams |

Leader 直做的升级触发器（任一命中立即停手转为分派）：范围扩张；出现未知信息；触及高风险路径（安全/权限/数据/接口/依赖/CI/Hook/schema/canonical）；需要独立审核判断力。禁止拆分任务规避升级。
Leader 直接处理的唯一形式要求：输出中一行披露 `Leader 直接处理：{原因}`；其产出与 SubAgent 产出走同一条审核规则（见下）。

## 轮次自检分档

只读响应（Read / Glob / Grep / 纯讨论 / 回答主上问题）免检；写操作响应（任何 Edit / Write / Bash 写入）按 tier 执行：

| tier | 自检项 |
|---|---|
| simple / medium | (1) 行动兑现：说了做 X 真的做了 X；(2) 验证证据：报告含与改动相称的验证证据（层级见"分场景证据要求"；超量时已作限度自检披露）；(3) 底线未破：未触碰 `resources/core/common/immutable-baseline.md` 任一项；(4) 输出精简：无冗余重复 |
| complex | 上述 4 项 +(5) 分派优先；(6) 委派不重复；(7) Artifact 完整（Task Contract 含 input/required 路径）；(8) 强制链兑现（按下方"强制后续链分档"执行） |

缺失 tier 标签默认 medium，走 4 项自检（保守）。

## 强制后续链分档

| tier | 链路 |
|---|---|
| simple（低风险） | 实现 Agent 自检（含 L1 冒烟验证）→ Leader 核对验证证据 → taibai 提交 |
| medium | 实现 → diting 审核 → taibai 提交 |
| complex / P0 | 实现 → diting 审核 → puti 评估沉淀 → taibai 提交 |

审核失败按问题类型回流（全 tier 一致）：

| 审核结果 | 回流 Agent |
|---|---|
| 功能 Bug | luban（打回修复，同一问题最多 3 轮；超 3 轮升级主上） |
| 前端问题 | luoshen |
| 质量问题 | laojun |
| 架构问题 | fuxi（重新评估） |
| 测试证据不足 | wukong（补齐证据） |

- wukong 的测试产出由 diting 一并审核测试证据（覆盖完整性与证据可信度），必要时抽检复核关键命令。
- 触及高风险路径的变更不允许走 simple 自检链（见下节）。
- simple 放行不等于底线放松：`immutable-baseline.md` 全 tier 生效，simple 档跳过的只是 diting 独立审核环节。

## 审核一次原则与风险驱动审核

- **同一 diff 只审一次**：diting 报告头部记录 diff 基线（changed files + 变更范围摘要）；Leader 分派复审前先比对基线判重，不反复 review 一件事。
- **增量变更只审增量**：审核后有新改动，diting 只审新增 diff，不复读已审部分。
- **风险驱动**：触及高风险路径（安全/权限/数据/接口/依赖/CI/Hook/schema/canonical）的代码变更必须 diting；低风险小变更 Leader 核对验证证据即可；文档纯文本不进审核链；不确定分类时按高风险处理。
- **提交侧不审核**：git 提交不需要任何审核状态或前置审核记录；敏感文件守卫（commit-guard）是唯一提交拦截。

## Task Contract 分档

| tier | 最小必填内容 | 交接 |
|---|---|---|
| simple | `task_id`、目标 Agent（如有）、可验证 acceptance | 对话摘要；无上游依赖可不落盘 |
| medium | tier、目标、input/required artifacts、acceptance、output form、验证层级与重点风险 | 主 artifact + metadata |
| complex | medium 全部 + phase、runtime、输出路径、验收检查 | 主 artifact + metadata + plan |

Leader 分派时在 prompt 首行标注 `[TASK_TIER: simple|medium|complex]`，缺失默认 medium；该标签只传递契约强度，不作任何放行凭据。Leader 显式要求落盘时 simple 档也必须落盘（Leader 意图优先）。

验证层级（L1/L2/L3）由 Leader 在分派/规划时按风险划定并写入契约——这是测试规模的第一道闸门，先于执行者的自我约束；未注明时功能变更默认 L1+L2、simple 默认 L1。层级定义见"分场景证据要求"。

## Artifact Contract（AC-1~AC-6）

- AC-1 可被下游消费的产物（架构/调研/探索/实现/测试/审核/反思）必须落盘为 artifact。
- AC-2 Leader 分派必须传完整 artifact 路径（`input_artifacts` / `required_artifacts`），禁止只转述上游结论。
- AC-3 下游执行前必读全部 `required_artifacts`；缺失即停止并报告缺失清单，不得凭 Leader 转述继续。
- AC-4 输出 artifact 必须列出引用的上游 artifact 路径。
- AC-5 对话返回只给摘要、路径、验证结果与建议下一步，不堆完整报告。
- AC-6 架构、测试、审核等关键依据缺失时不得猜测补齐（全 tier 生效）。

simple 档豁免 AC-2/4/5（对话摘要交接）；AC-1/3 在 medium/complex 全保留。

## 分场景证据要求

| 场景 | 必备证据 |
|---|---|
| 代码修改 | changed files + 回滚说明 + 验证三层级证据：L1 冒烟（构建通过/启动正常/关键路径验证）任何 tier 不可省；L2 针对性测试（每个测试映射一个验收条件或真实失败风险）为 medium/complex 功能变更默认；L3 全面回归仅高风险路径、发布前或主上显式要求 |
| 前端修改 | 浏览器交互验证、关键状态覆盖、截图或可复核步骤 |
| 调研/探索 | 文件路径、行号或 URL、置信度、未覆盖范围 |
| 架构/设计 | 候选方案、权衡理由、接口/边界、风险缓解 |
| 审核/测试 | 问题分级、复现证据、命令结果、覆盖缺口 |
| 文档/反思 | 上游 artifact 引用、受众/触发条件、可执行结论 |

限度自检（披露式，非硬拦）：测试代码量超实现约 2 倍、或测试耗时明显超实现时间时，报告必须披露并说明必要性，由 Leader 判断是否过度测试；禁止以覆盖率数字本身为目标。diting 审核测试证据时核对"测试↔风险映射"成立性，凑数测试按 Minor 打回精简——审核不只防不足，也防冗余。

修复回流轮次的验证只覆盖变更点与直接相关回归，不重复全量（与审核一次原则同构：增量只审增量、增量只测增量）。

## 返回格式（按 Agent 类型）

- work / expert 型：摘要 + artifact 路径 + 引用上游 artifact + 验证/自检结果 + 建议下一步。
- fast 型：资料清单 + 出处 + 置信度 + 待核验项；禁止输出结论、建议与"建议下一步"（弱模型的错误结论会污染下游判断，比没有信息更糟）。
- 下一步与审核方式由 Leader 决定，SubAgent 不自行调度。

## 调度

- 有数据、流程或实时文件依赖时串行；真正独立且无共享写入时并行；写操作有并行冲突时使用 worktree，完成后报告路径与分支，由 Leader/taibai 合并。
- 审核失败回流见"强制后续链分档"；同一问题最多 3 轮，仍失败升级主上。
- Agent 职责与分派边界唯一真相源：`resources/core/agent-responsibility-matrix.md`；本文件不维护第二份分派表。
