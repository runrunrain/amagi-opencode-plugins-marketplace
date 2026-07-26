---
name: workflow
description: |
  workflow 模式编排技能——OpenCode workflow skill 的 amagi 特化版。大需求开发、复杂问题攻坚、疑难 Bug 修复等复杂任务的全局编排：Leader 根据任务实际情况自行编写并随时修订本次攻坚的 workflow（活文档），amagi 提供编写规范、积木目录与执行纪律；不是固定流水线。
  触发词：用 workflow、编排一下、团队开发、自主跑、自主运行、大需求、复杂问题攻坚、疑难 Bug、"不用问我""跑完再说""我去睡了"（unattended 自治级别）。
  不要用于：单步小任务、日常问答、一个 SubAgent 能完成的独立任务（按 workflow-rules.md 路由直接分派即可）；本技能没有预设步骤，workflow 由 Leader 按任务编排。
version: "1.0"
author: amagi
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# workflow 模式技能

> 定位：OpenCode workflow skill 的 amagi 特化版——Leader 根据任务实际情况**自行编写并随时修订**本次攻坚的 workflow（活文档）；amagi 提供编写规范、积木目录与执行纪律。本技能不是固定流水线：没有预设步骤，步骤由任务决定。
> 替代已退役的 autonomous-agent-team（固定 8 步流水线）；无人值守降级为 workflow 的一个自治属性（unattended），不再是独立技能。

## 何时使用

- 大需求开发、复杂问题攻坚、疑难 Bug 修复：多阶段、多角色、需要 Gate 推进的全局编排。
- 主上说"用 workflow / 编排一下 / 团队开发 / 自主跑"时。
- 不需要：单步小任务、一个 SubAgent 能完成的独立任务——按 `workflow-rules.md` 路由直接分派，不为编排而编排。

## 唯一真相源（指针）

本技能只做 workflow 适配，核心规则以 canonical 为准，不复制：

| 用途 | Canonical source |
|---|---|
| Artifact Contract AC-1~6、审核一次原则、强制后续链、证据要求、验证三层级 | `resources/core/collaboration/workflow-rules.md` |
| SubAgent 委派五要素、prompt 模板、路径说明规范 | `resources/core/collaboration/subagent-mode.md` |
| Agent Teams 工作循环、Phase Gate artifact 映射、Leader 中转通信 | `resources/core/collaboration/agent-teams-mode.md` |
| 步骤载体选择（SubAgent vs Agent Teams vs worktree） | `resources/core/collaboration/mode-selection.md` |
| Agent 职责、类型标注、自动触发条件 | `resources/core/agent-responsibility-matrix.md` |
| 四类型模型档默认映射 | `orchestration-profile.json::agent_types` |
| 落盘规范、plan-registry schema | `resources/core/common/agent-output-specification.md` |

## workflow.md 编写规范

Leader 在任务工作区写 `workflow.md`（建议路径 `{PROJECT_META_ROOT}/agent-outputs/workflow/{task-brief}/workflow.md`）。它是活文档：执行中发现偏差随时修订，修订内容追加到文末"修订日志"。

结构（完整模板与示例见 `templates/workflow-template.md`）：

1. **目标与验收**：一句话目标 + 可验证的总验收标准（怎么算"这次攻坚成了"）。
2. **阶段与步骤**：每步七行——
   - 执行：{agent}（{类型}，{模型档，可选}）
   - 载体：{SubAgent | Agent Teams | Leader 直做}
   - 输入：{required_artifacts 完整路径，或"无"}
   - 产出：{output_artifact 完整路径}
   - 验收：{可验证条件}
   - 验证：{层级 L1/L2/L3 + 重点风险；未注明默认 L1+L2}
   - Gate：{进入下一步前必须满足的条件，通常是"产出 artifact 已落盘且验收通过"}
3. **风险标注**：哪些步骤产出必须过 diting 审核位及理由（高风险路径判定以 workflow-rules.md 为准）。
4. **自治级别**：`interactive`（默认，关键确认点问主上）或 `unattended`（激活自主决策权限，见下节）。

编写要点：

- 步骤只写"需要 Gate 推进的"；信息完备的零碎小步不必入册，Leader 相机直做即可。
- 模型档可按步标注（如"预过滤用 fast 档 / 审核用 expert 档"），多模型搭配从习惯变成可编排的一等公民；不标时按 profile `agent_types` 默认映射。
- workflow.md 写完即可开工，无需审批仪式；interactive 级别下主上想先过目可以给主上看，这是选项不是前置。

## Leader 操作循环

1. 判定任务值得 workflow（多阶段、多角色、需 Gate 推进）；否则按 workflow-rules.md 路由直接分派。
2. 编写 workflow.md：目标验收 → 阶段步骤（选积木、标模型档与载体）→ 风险标注 → 自治级别。
3. 按 Gate 推进：每步分派带 Task Contract（输入/必读/产出/验收）；Gate 检查 artifact 落盘，缺失即 blocked。
4. 审核位兑现：风险标注的步骤产出过 diting 审核位；同一 diff 不重复送审，增量只审增量。
5. 活文档维护：计划变化随时修订 workflow.md 并记修订日志；步骤状态同步更新（plan-registry 或步骤状态列）。
6. 收尾两件套：终审对照 + puti 沉淀评估，输出最终报告。

## 积木目录

Leader 编排时可用的步骤类型。每块给"何时用 / 产出 / 模型档建议"。

### fast 预过滤步（baize / wenqu）· fast 档

大范围代码探索或外部检索的第一步：便宜模型先过滤，产出**带出处的客观资料包**（看过什么、在哪看到、置信度、待核验项），供下游昂贵模型直接消费。fast 型禁止输出结论与建议——资料包是事实，判断归下游。

### work 实现步（luban / luoshen / laojun / wukong / cangjie）· work 档

具体产出的主力：实现、前端、重构、测试、文档。分派时指令完整、验收条目可细、文件边界明确。
验证默认到 L2（与变更直接相关的针对性测试，每个测试映射一个验收条件或真实失败风险）；L1 冒烟任何 tier 不可省。需要 L3 全面回归步时，必须在 workflow.md 该步显式标注理由（高风险路径 / 发布前 / 主上明确要求）——测试与风险相称，不为覆盖率凑数（原则 8，细则见 workflow-rules.md 证据要求节）。

### expert 攻坚步（fuxi / diting / puti / hongjun）· expert 档

- fuxi 设计步：多候选方案取舍、架构设计；锁定范围，决策权留 Leader。
- diting 审核步：高风险步骤产出的必经审核位；报告头部记录 diff 基线，同 diff 不重审、增量只审增量。
- puti 沉淀步：任务收尾或典型踩坑后的经验沉淀评估。
- hongjun 兜底步：仅主上显式调用或多轮失败后的高难攻坚。

### Leader 直做步 · leader 档

信息完备 + 工作量小 + 低风险的步骤，Leader 直接做，workflow.md 中一行披露（`Leader 直接处理：{原因}`）。命中升级触发器（范围扩张 / 未知信息 / 高风险路径）立即停手转分派，禁止拆任务规避。

### Agent Teams 步 · 混合档

需要持续讨论/辩论的长步骤（竞争假设调试、多维度审查、跨层协调）的执行载体。Teams 是 workflow 一个步骤内部的局部协作，内部 Phase Gate 是 workflow Gate 的下一级细化；工作循环、spawn 模板与通信规则见 `agent-teams-mode.md`。

### 人工确认点 · —

主上必须在场的决策（方向性选择、不可恢复操作、上线/发布）。interactive 级别下显式列为步骤；unattended 级别下按下节规则转为自主决策。

## 执行纪律

从旧技能提炼，全部在规范层生效，与 hook 无关：

1. **artifact 流转为主线**：AC-1~6 全文以 workflow-rules.md 为准。Gate 要求的 artifact 未落盘即 blocked，禁止用 Leader 转述或摘要绕过；分派必传完整路径，下游缺失即停止报告。
2. **审核一次原则**：diting 报告头部记录 diff 基线；Leader 分派复审前先比对判重——同一 diff 只审一次，增量变更只审增量。
3. **高风险必经审核位**：workflow.md 风险标注节列出的步骤产出，提交前必须过 diting 审核位；低风险步骤 Leader 核对验证证据即可。
4. **阻塞不停工**：步骤阻塞时标记阻塞原因与已尝试方案，继续推进无依赖步骤，最终报告统一高亮；不做虚假实现绕过阻塞。
5. **Leader 上下文保护**：不在主会话展开源码、长报告、大型工具输出；细节检索委派 fast 型，只读摘要与索引；要求子任务报告 ≤200 行，完整内容一律落盘为 artifact。
6. **上下文恢复**：plan-registry 或 workflow.md 本身的步骤状态列记录 phases 状态；上下文压缩后先读 registry 摘要与 workflow.md 恢复现场，再继续协调当前 Phase，不重读全量 artifact。
7. **时间盲视对策**：Agent 无法感知时间流逝——分派时即写明"尝试 N 次无进展则报告放弃"，失败方案文档化，避免后续 Agent 重复踩坑。
8. **收尾两件套**：全部步骤完成或标记阻塞后——(a) 终审：逐条对照初始需求判定 met / partial / missed，Critical 遗漏可补救的派回修复（最多复核 1 轮），不可补救的写入最终报告供主上决策；(b) puti 沉淀评估：典型经验沉淀入战术手册。

## unattended 自治级别

workflow.md 标注 `自治级别: unattended`（或主上说"不用问我 / 跑完再说 / 我去睡了"）后激活：

| 规则 | 说明 |
|---|---|
| 主上视为不在线 | 需要确认的环节转为自主判断，禁止暂停等待 |
| 最安全解释 + 决策日志 | 需求歧义选最安全/最合理解释；技术方案按 安全性 > 正确性 > 可维护性 > 性能 排序；范围边界不确定按最小可行范围实现并标注可扩展点——全部记入决策日志 |
| 质量标准不变 | 审核位、证据要求、Gate 不因无人值守降级 |
| 异常不阻塞 | 非关键错误记录后走安全备选继续；关键阻塞标记后继续无依赖步骤 |
| 自主决策记录 | 超出常规权限的重大判断，全部写入最终报告的"自主决策记录"节 |

## 最终报告

workflow 跑完后输出：执行摘要、各 Phase 结果与 artifact 路径、终审对照表（met / partial / missed）、阻塞项、自主决策记录（unattended 时）、沉淀结论、changed files 与验证结果。

## 参考资料

| 文件 | 说明 |
|---|---|
| `templates/workflow-template.md` | workflow.md 完整模板（含一个中型攻坚示例） |
