---
name: execution-plan
description: |
  执行计划制定技能。仅 complex/P0 任务强制使用；medium 任务由 Leader 判断是否需要（多数可直接分派）；simple 任务禁用。分档触发与 `CLAUDE.template.md` §4 任务分类表一致。
  触发场景：完成需求分析后、需要多阶段实施计划、SubAgent/Agent Team 分工、验收矩阵、风险和回滚安排；触发词包括"制定执行计划""拆 Phase""任务清单""implementation plan""execution plan"。
  不要用于：尚未完成需求澄清的模糊请求、单步小修、直接写代码或执行计划中的任务。与 design-mentor 区分：本 skill 编排已明确的需求，而非引导创意设计。
version: "2.0"
author: amagi
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# 执行计划技能

> 框架规则版本 10.5 适配 | 维护者：天城框架
> 配套技能：requirement-analysis（上游）、agent-document-output（持久化）
> 上游 Artifact：requirement-analysis 文档（required_artifact）

## 计划原则

**主 Agent 的输出**：不是代码，不是文件操作，而是**可执行的待办事项清单**

| 原则 | 要求 |
|------|------|
| 任务粒度 | 每个任务可在 30 分钟内完成 |
| 任务可验证 | 每个任务有明确的完成标志 |
| 依赖清晰 | 标注任务间的前置依赖 |
| Agent 匹配 | 明确指定执行 Agent 类型 |

### Task Contract 集成原则

每个任务的输出必须包含足够的上下文，使 Leader 可以直接生成 Task Contract：
- 任务描述中必须明确 required_artifacts 的来源（上游任务的输出路径模式）
- 验收标准必须可被 Agent 自行验证（不依赖主上手动确认）
- 每个任务必须指定是否需要 worktree 隔离；需要时由 Leader/taibai 预先创建，并把绝对路径写入 Task Contract（不得向 task 传 isolation 参数）

### 协作模式选择原则

在 Phase 规划时，必须为每个 Phase 选择协作模式：
| 条件 | 推荐模式 |
|------|---------|
| Phase 内任务独立，只需结果汇总 | SubAgent 模式（并行） |
| Phase 内任务有依赖关系 | SubAgent 模式（串行） |
| 需要队友间讨论/辩论/持续协作 | Agent Teams 模式 |
| Phase 涉及写操作且并行 | SubAgent + worktree 隔离 |

## 输出格式

必须按以下结构输出《执行计划文档》：

```markdown
## 执行计划文档

### 执行概览
| 维度 | 内容 |
|------|------|
| 总任务数 | X 项 |
| 预估总工时 | X 小时 |
| 关键里程碑 | 列出 |
| 主要风险点 | 列出 |

---

### Phase 1: [阶段名称]（优先级：高/中/低）

**阶段目标**：本阶段完成后的状态
**协作模式**：SubAgent 串行 / SubAgent 并行 / Agent Teams
**隔离策略**：worktree（推荐用于写操作并行）/ 无需隔离

| 序号 | 任务 | 执行Agent | 前置依赖 | 预估耗时 | 验收标准 | worktree |
|------|------|-----------|----------|----------|----------|----------|
| 1.1 | 任务描述 | 白泽（baize） | 无 | Xmin | 标准 | 否/是 |
| 1.2 | 任务描述 | 伏羲（fuxi） | 1.1 | Xmin | 标准 | 否/是 |
| 1.3 | 任务描述 | 鲁班（luban） | 1.2 | Xmin | 标准 | 是 |

**阶段交付物**：
- [ ] 交付物1（路径：{PROJECT_META_ROOT}/agent-outputs/{agent}/{task-id}/）
- [ ] 交付物2

**Phase Gate 验证标准**：
- [ ] 所有任务验收标准通过
- [ ] 所有 artifact 已持久化
- [ ] 无遗留阻塞项

---

### Phase 2: [阶段名称]（优先级：高/中/低）

同上格式...

---

### 执行流程图

```
[Phase 1] --依赖--> [Phase 2] --依赖--> [Phase 3]
    |                   |
    v                   v
 [并行任务]          [并行任务]
```

---

### Agent 分工矩阵

| 任务类型 | 主执行 Agent | 前置 Agent | 强制后续 |
|---------|-------------|-----------|-----------|
| 代码探索 | 白泽（baize） | - | 报告 -> 伏羲/鲁班 |
| 技术调研 | 文曲星（wenqu） | - | 调研 -> 伏羲/鲁班 |
| 架构设计 | 伏羲（fuxi） | 白泽/文曲星 | artifact -> 仓颉润色 |
| 后端实现 | 鲁班（luban） | 伏羲 | -> 谛听审核 |
| 前端实现 | 洛神（luoshen） | 伏羲 | -> 谛听审核 |
| 代码优化 | 太上老君（laojun） | 谛听 | -> 谛听审核 |
| 测试策略/执行 | 孙悟空（wukong） | 鲁班/洛神 | -> 谛听审核证据 |
| 代码审核 | 谛听（diting） | 鲁班/洛神 | 通过 -> 菩提/太白金星 |
| 文档组织 | 仓颉（cangjie） | 伏羲/菩提 | 基于上游 artifact |
| 反思沉淀 | 菩提祖师（puti） | 谛听 | 反思 artifact -> 知识库 |
| Git 提交 | 太白金星（taibai） | 谛听通过后 | 提交报告 |
| 高难度兜底 | 鸿钧老祖（hongjun） | 多轮失败后 | 仅显式调用时 |

---

### 风险与备选方案

| 风险点 | 可能影响 | 备选方案 |
|--------|----------|----------|
| 风险描述 | 影响范围 | Plan B |

---

### 执行检查清单

- [ ] Phase 1 完成
- [ ] Phase 2 完成
- [ ] 所有验收标准通过
- [ ] 无遗留问题
```

## 计划制定检查表

| 检查项 | 标准 | 说明 |
|--------|------|------|
| 任务粒度 | ≤30分钟/任务 | 避免过大任务导致失控 |
| Agent 明确 | 每个任务指定 Agent | 避免分派模糊 |
| 依赖清晰 | 明确前置任务 | 避免执行顺序混乱 |
| 验收可测 | 可验证的完成标准 | 避免"完成"定义模糊 |
| 风险预判 | 列出主要风险点 | 提前准备应对方案 |

## 严格约束

| 约束 | 说明 |
|------|------|
| 禁止 | 编写任何代码、配置文件、脚本 |
| 禁止 | 假设或编造本地文件的具体内容 |
| 禁止 | 执行计划中的任何步骤 |
| 必须 | 只输出任务清单和执行指南 |
| 必须 | 每个任务都要有明确的验收标准 |
| 必须 | 标注哪些步骤需要先读取本地文件 |
| 必须 | 将执行计划文档保存到标准路径并更新 plan-registry.json |
| 必须 | 每个 Phase 明确协作模式（SubAgent 串行/并行 或 Agent Teams） |
| 必须 | 写操作任务评估 worktree 隔离需求 |
| 必须 | 与 requirement-analysis 的子需求编号保持追溯关系 |

## 工作流程

1. 接收需求分析文档
2. 确定任务总数和预估工时
3. 按 Phase 划分阶段
4. 设计 Agent 分工
5. 梳理任务依赖关系
6. 识别风险和备选方案
7. 按格式输出执行计划文档

## 串行 vs 并行判断

| 关系类型 | 判断标准 | 执行方式 |
|---------|---------|----------|
| 数据依赖 | B需要A的输出作为输入 | **串行**：A → B |
| 流程依赖 | B必须在A完成后才能开始 | **串行**：A → B |
| 文件依赖 | B修改的文件依赖A创建的文件 | **串行**：A → B |
| 独立任务 | A和B互不影响，无共享资源 | **并行**：A ‖ B |

## 与框架流程的衔接

### 上游：requirement-analysis
本 skill 必须以 requirement-analysis 的输出文档作为 required_artifact。执行前必须读取：
- 子需求编号（R1, R2...）与优先级 -> 映射为 Phase 和任务
- 技术约束 -> 作为 Phase 设计的边界条件
- 功能边界 -> 作为 scope guard
- 待调研清单 -> 映射为 Phase 1 探索任务

### 下游：Leader 分派
本 skill 的输出直接驱动 Leader 的分派动作：
- 每个 Phase 对应一次分派批次
- 每个任务对应一个 Task Contract
- Phase Gate 验证标准对应 Leader 的验收检查

### 协作模式决策
Phase 规划时必须为每个 Phase 选择协作模式：
- **SubAgent 串行**：任务间有依赖（A 的输出是 B 的输入）
- **SubAgent 并行**：任务独立，无共享资源（推荐 worktree 隔离）
- **Agent Teams**：需要 Leader 中转通信 讨论/辩论/持续协作（详见 agent-teams-mode.md）

### Task Contract 生成
本 skill 完成后，Leader 应为每个任务生成 Task Contract，包含：
- input_artifacts：上游任务的输出 artifact 路径
- required_artifacts：本任务必须读取的 artifact
- output_artifact：本任务的输出路径
- acceptance_checks：对应验收标准中的检查项

## 常见串行场景（禁止并行）

| 场景 | 正确执行顺序 |
|------|------------|
| 架构 → 编码 | 伏羲（fuxi） 完成设计 → 鲁班（luban） 实现 |
| 编码 → 审核 | 鲁班（luban） 完成实现 → 谛听（diting） 审核 |
| 审核 → 提交 | 谛听（diting） 通过 → 太白金星（taibai） 提交 |
| 探索 → 设计 | 白泽（baize） 调研 -> 伏羲（fuxi） 设计 |
| 设计 -> UI实现 | 洛神（luoshen） 设计 -> 鲁班（luban） 实现前端 |

## 输出持久化

执行计划文档完成后，**必须**执行以下持久化步骤：

### 0. 前置检查（持久化前必须确认）

- [ ] 每个 Phase 已选择协作模式
- [ ] 每个任务已指定执行 Agent 和验收标准
- [ ] Agent 分工矩阵已与 amagi 框架职责矩阵对齐
- [ ] 串行/并行判断已标注理由
- [ ] 所有写操作任务已评估 worktree 隔离需求

### 1. 保存文档到标准路径

```
{PROJECT_META_ROOT}/agent-outputs/execution-plan/{timestamp}-{task-brief}/
  ├── execution-plan.md    （主文档，完整执行计划内容）
  └── metadata.json        （任务元数据）
```

- `{timestamp}` 格式：YYYYMMDD-HHmmss（例如：20260228-143000）
- `{task-brief}` 格式：kebab-case 任务简述（例如：plan-registry-mechanism）
- 使用 skill: agent-document-output 的 STEP 1-4 完成文档保存

### 2. 更新 plan-registry.json

保存文档后，**立即**调用 skill: agent-document-output 的 STEP 5 更新计划注册表。

执行计划条目的特殊字段要求：

**phases 字段**（必须填写）：
```json
[
  {"phase": "Phase 1: 阶段名称", "taskCount": N, "status": "pending"},
  {"phase": "Phase 2: 阶段名称", "taskCount": M, "status": "pending"}
]
```

**summary 字段**（必须包含）：
- 总Phase数：N个Phase
- 总任务数：共M个任务
- 关键里程碑：[里程碑1, 里程碑2]
- 预估工时：约X小时

**示例 summary**（控制在200字以内）：
```
总Phase数：3个Phase。总任务数：12个任务。
关键里程碑：[Phase 1完成schema定义, Phase 2完成skill修改, Phase 3完成集成测试]。
预估工时：约4小时。
Phase划分：[Phase 1: 规范定义(3任务), Phase 2: skill修改(6任务), Phase 3: 验证(3任务)]。
```

## 后续步骤

执行计划完成后，主 Agent 应该：
1. 展示执行计划给主上确认
2. 使用 agent-document-output skill 持久化文档并更新 plan-registry
3. 按 Phase 顺序依次分派任务：
   - 为每个任务生成 Task Contract（使用 CLAUDE.template.md 中的 Leader Task Contract 分派模板）
   - Phase 1 的探索/调研任务优先分派给 白泽（baize）/ 文曲星（wenqu）
   - 根据 Phase Gate 验证标准验收每个 Phase
4. 每个 Phase 完成后更新 plan-registry 中的 phases 状态
5. 全部 Phase 完成后触发 谛听（diting）审核 -> 菩提祖师（puti）评估 -> 太白金星（taibai）提交
