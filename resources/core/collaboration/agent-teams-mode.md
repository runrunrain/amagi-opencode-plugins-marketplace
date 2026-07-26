> **OpenCode adapter（优先于下文的跨 harness 描述）**：
> - `agent_team` 在本插件中表示 Leader 调度多个 OpenCode SubAgent，可用 background task 并行独立方向；所有通信与交接都经 Leader。
> - OpenCode 没有 Claude Agent Teams 的 P2P mailbox，也不接受 `isolation: worktree` task 参数；需要 worktree 时先由 Leader/taibai 显式创建并把绝对路径写进 Task Contract。
> - 所有 Amagi SubAgent 的 `task` 权限均为 deny，递归分派由运行时权限和 prompt 双重阻止。
# Agent Teams 模式

> Source Status: canonical
> Scope: 多成员持续协作（Agent Teams）：Leader 工作循环、Phase Gate artifact 映射、Spawn prompt、Leader 中转通信、成员生命周期。
> 指针：Task Contract / Artifact Contract / 审核链 / 返回格式以 `workflow-rules.md` 为准；委派五要素与路径说明规范见 `subagent-mode.md`；职责与类型标注见 `resources/core/agent-responsibility-matrix.md`；模式选择与 worktree 决策见 `mode-selection.md`。本文件不复制其中表格。

## 启用条件

仅在任务同时满足以下多数条件时启用：需要多专业角色持续沟通或辩论；存在可明确的依赖 DAG；协作收益大于协调成本；成员可分配独立的文件边界与验收标准。单点实现、只读探索、串行依赖或同一文件小改动用 SubAgent。

## 与 workflow 模式的关系

- Agent Teams 是 workflow 中"需要持续讨论/辩论的长步骤"的执行载体：workflow 是全局编排（阶段、Gate、审核位），Teams 是局部协作（一个步骤内部的多成员讨论与并行）。
- 步骤内不需要持续讨论时用单个 SubAgent 更省——Teams 的协调开销只付给真正的长步骤。
- 两者共用同一条 Artifact Contract 与审核链；Teams 内部 Phase Gate 是 workflow Gate 的下一级细化，由 Leader 按 artifact 落盘情况在规范层核对。

## Leader 工作循环

1. 构建依赖 DAG，划分 Phase（创建前确认：文件可独立分配、瓶颈可分散、每个任务有验证标准）。
2. 只分配当前 Phase：不提前 spawn 未来 Phase 的成员与任务。
3. 等待 = 核心工作：分析成员报告、准备下一阶段、响应消息、催促进度——"等待是工作"，不是空转。
4. Phase Gate 检查：按下方映射表核对必产 artifact 落盘；全部就绪 → 开下一 Phase；缺失 → 打回修复。
5. 释放 / 复用成员（见"成员生命周期"）。
6. 循环直至所有 Phase 完成。

全程自主运作：能用成员完成的事不中断请求主上手动执行；确实超出全部工具能力时标记阻塞原因、继续无依赖步骤、最后统一汇报。

## 行动前自检

相机行事三条件与升级触发器以 `workflow-rules.md` 执行路由一节为准；Teams 场景每次行动前只问一个问题：**这是规划/协调/决策行为，还是执行行为？**

- 规划（Read/Glob/Grep 了解情况、分析 artifact、制定计划）→ 直接做。
- 协调（发消息、催促、仲裁、补充上下文）→ 直接做。
- 决策（方案取舍、Gate 判定、验收）→ 直接做。
- 执行（写代码/改文件/跑测试/提交）→ 默认分派成员；仅当信息完备 + 工作量小 + 低风险时可直做，并一行披露 `Leader 直接处理：{原因}`；出现范围扩张、未知信息或高风险路径时立即停手转分派，禁止拆任务规避。

失败模式：Leader"顺手"执行，上下文被实现细节占满，后续规划与验收质量下降——Leader 的上下文是团队的战略资源。

## Phase Gate artifact 映射

Phase Gate 是 artifact 流转检查：上一 Gate 的必产 artifact 是下一 Gate 的必读输入。

| Gate | 主责 | 必产 artifact | 下一 Gate 必读输入 |
|---|---|---|---|
| G1 探索 | baize | `baize-code-exploration.md` | G2、G3 |
| G2 调研/设计 | wenqu、fuxi | `wenqu-research.md`、`fuxi-architecture-design.md` | G3、G5、G6 |
| G3 实现 | luban、luoshen | `implementation-report.md` | G4、G5 |
| G4 测试 | wukong | `wukong-test-report.md` | G5 |
| G5 审核 | diting | `diting-review-report.md` | G6、G7 |
| G6 文档/沉淀 | cangjie、puti | `cangjie-release-doc.md`、`puti-retrospective.md` | G7 |
| G7 提交 | taibai | `git-commit-report.md` | 任务收尾 |

- 缺失即 blocked：required artifact 未落盘时该 Gate 不得推进，**禁止用 Leader 转述或摘要绕过**（AC-2/AC-3）。
- Phase 推进消息必须附前序 artifact 完整路径，禁止只转述摘要。
- G1-G7 是标准骨架：Leader 可按任务裁剪或合并 Phase，但"artifact 存在才推进"不可裁剪；审核深度按 tier 走 `workflow-rules.md` 强制后续链。

## Spawn prompt 模板

SubAgent 启动提示词骨架（Task Contract 字段分档见 `workflow-rules.md`，路径解析见 `subagent-mode.md` 路径说明规范）：

```markdown
[TASK_TIER: medium|complex]
task_id: {task_id}；phase: P{n}-{phase_name}
角色: {team_name} 团队的 {role_name}（{agent_type}）；Leader: {leader_name}
任务: {task_description}
验收: {可验证完成条件}
验证: {层级 L1/L2/L3 + 重点风险；未注明默认 L1+L2}
必读输入: {required_artifacts 完整路径；无则写"无"}
输出: {output_artifact 完整路径；报告必须落盘到此路径，完成消息注明路径}
文件边界: 负责 {files}；禁止修改 {其他成员负责的文件}
协作伙伴: {SubAgent 名称（职责）：协作主题}
通信: task 完成时向 Leader 返回；跨成员信息由 Leader 根据 artifact 与结果中转
安全: 禁止阻塞式命令/等待用户输入/假数据；尝试 {N} 次无进展则报告放弃
```

必填项：task_id/phase/角色/任务/验收/输出路径；有上游依赖时必读输入必填；多 SubAgent 时文件边界与协作伙伴必填——缺文件边界是成员互相覆盖文件的首要原因。

### 四类型变体要点

| 类型 | spawn prompt 附加要点 |
|---|---|
| leader | 仅主上显式指定的独立 Leader 实例；只给目标与约束边界，判断空间最大 |
| work | 指令完整、验收条目可细、文件边界明确；返回含验证/自检结果 + 建议下一步 |
| expert | 精确问题陈述 + 完整上下文 + 锁定范围：不重新规划、不扩大战场；产出证据充分的结论，决策权留 Leader |
| fast | 约束最细最具体：只交付带出处的客观资料包（看过什么、在哪看到、原文出处）；**禁止输出结论、建议与下一步推荐**；不确定标【待核验】，绝不猜测 |

## Leader 中转通信规则

通信是工作的一部分；spawn prompt 必须包含结果报告协议与协作伙伴清单。OpenCode SubAgent 在 task 完成时返回，需提前报告的事项写入中间 artifact，并由 Leader 在后续 Phase 中转。

### 触发条件

成员 → Leader：

| 触发 | 内容要点 |
|---|---|
| 发现风险 | 写入中间 artifact，并在 task 结果中返回风险 + 影响评估 + 建议方案 |
| 遇到阻塞 | 阻塞原因 + 已尝试方案 + 请求协助；不默默卡住 |
| 阶段进展 | "N/M 完成" + 当前状态，给 Leader 可观测性 |
| 需要决策 | 选项 + 各选项优劣 + 建议；技术歧义不自行猜测 |
| 任务完成 | 交付摘要 + 验证结果 + 残留问题 + artifact 完整路径 |

成员 ↔ 成员（经 Leader 中转）：

| 触发 | 目标 | 内容要点 |
|---|---|---|
| 接口变更 | 依赖该接口的成员 | 变更内容 + 影响范围 + 适配建议 |
| 上游产出就绪 | 下游成员 | "输出已就绪" + 摘要 + 文件位置 |
| 发现共享问题 | 相关成员 | 问题 + 自己的处理方式 + 对方需关注的点 |
| 需要对方信息 | 拥有该信息的成员 | 需要什么 + 为什么 + 期望格式 |
| 质疑/建议 | 对应成员 | 发现的问题 + 替代方案（鼓励技术辩论） |

Leader → 成员：通过后续 task prompt 传递方向修正、上下文补充、Phase 推进（附前序 artifact 完整路径）与质量反馈。

### 消息三要素

| 字段 | 要求 |
|---|---|
| 类型 | 进度 / 风险 / 阻塞 / 请求 / 交付 / 质疑 |
| 内容 | 简明扼要，20 行以内 |
| action item | 需要对方做什么（如有） |

OpenCode 没有点对点 message/broadcast；Leader 仅在 Phase 切换或全局约束变更时，把必要信息写入后续 task prompt。

### 反模式（禁止）

- 成员遇到问题默默卡住，不向任何人通信。
- 成员假设可以直接联系其他成员，因而没有把跨成员信息写入结果或 artifact。
- 成员只返回一句完成，不提供进度证据、中间 artifact、风险或阻塞。
- Leader 忽略成员发来的风险/阻塞/决策请求。

## 成员生命周期

`创建 → 分配任务 → 执行 → 报告完成 → Leader 评估 →（通过：释放/复用；不通过：打回）`

| 规则 | 说明 |
|---|---|
| 收到报告必须响应 | 下一轮行动内评估并决定：释放 / 复用 / 打回，不挂起 |
| 空闲成员复用 | 有新任务优先复用空闲成员，而非新建（省 spawn 与上下文成本） |
| 完成即释放 | 无后续任务时明确告知任务已完成，不空耗 |
| 进度主动询问 | 成员长时间未报告时发消息询问，而非自己动手接管 |

文件分配：每人独立负责、禁止重叠；共享配置/接口只读；边界写进 spawn prompt。并行只在文件、状态、依赖真正独立时有效——多人卡在同一瓶颈等于浪费 N-1 份成本，此时改为分割输入空间或串行集中攻克。

### 时间盲视对策

Agent 无法感知时间流逝，会在无进展的尝试上空耗——分派时即配对策：

| 策略 | 说明 |
|---|---|
| 限定尝试次数 | spawn prompt 指定"尝试 N 次无进展则报告放弃"，不死磕 |
| 快速验证优先 | 先跑快速子集（如 10% 随机样本），通过后再全量 |
| 失败文档化 | 要求成员记录已失败的方案与原因，避免后续成员重复踩坑 |
