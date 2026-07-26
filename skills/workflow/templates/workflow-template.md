# workflow.md 模板

> 用法：复制到任务工作区（建议 `{PROJECT_META_ROOT}/agent-outputs/workflow/{task-brief}/workflow.md`），按任务实际改写。活文档：执行中随时修订，修订追加到文末"修订日志"。字段含义与积木说明见 `../SKILL.md`。

---

# 目标与验收

- 目标：{一句话目标}
- 总验收：{可验证的完成标准——怎么算"这次攻坚成了"}

# 阶段与步骤

## Phase 1: {阶段名称}

- 步骤 1.1: {做什么}
  执行: {agent}（{leader|work|expert|fast}，{模型档，可选}）
  载体: {SubAgent | Agent Teams | Leader 直做}
  输入: {required_artifacts 完整路径，或"无"}
  产出: {output_artifact 完整路径}
  验收: {可验证条件}
  验证: {层级 L1/L2/L3 + 重点风险；代码变更步必填，未注明默认 L1+L2；只读/纯文档步写"无"}
  Gate: {进入下一步前必须满足的条件——通常是"产出 artifact 已落盘且验收通过"}
  状态: pending

- 步骤 1.2: ...

## Phase 2: ...

# 风险标注

| 步骤 | 风险点 | 必须过 diting 审核位的理由 |
|---|---|---|
| {步骤号} | {触及的高风险路径：安全/权限/数据/接口/依赖/CI/Hook/schema/canonical} | {理由} |

（无高风险步骤时写"无——全部低风险，Leader 核对验证证据即可"）

# 自治级别

interactive（默认）| unattended

（unattended 激活自主决策权限：需确认环节转最安全解释 + 决策日志，规则见 `../SKILL.md`）

# 修订日志

- {日期} {修订内容与原因}

---
---

# 示例：中型攻坚 workflow（探索 → 设计 → 实现 → 审核提交）

# 目标与验收

- 目标：为 X 系统增加 Y 功能
- 总验收：Y 功能端到端可用；构建通过；新增逻辑有 L2 针对性测试；diting 审核通过

# 阶段与步骤

## Phase 1: 探索与设计

- 步骤 1.1: 探索现有代码结构与相关模块
  执行: baize（fast）
  载体: SubAgent
  输入: 无
  产出: {PROJECT_META_ROOT}/agent-outputs/baize/{task}/baize-code-exploration.md
  验收: 资料包含相关文件清单 + 行号出处 + 置信度 + 待核验项
  验证: 无（只读探索步）
  Gate: artifact 落盘
  状态: pending

- 步骤 1.2: 架构设计
  执行: fuxi（expert）
  载体: SubAgent
  输入: 步骤 1.1 产出
  产出: {PROJECT_META_ROOT}/agent-outputs/fuxi/{task}/fuxi-architecture-design.md
  验收: 含候选方案对比、权衡理由与接口定义
  验证: 无（设计步，方向由 Leader 确认）
  Gate: artifact 落盘，Leader 确认方向
  状态: pending

## Phase 2: 实现

- 步骤 2.1: 后端实现
  执行: luban（work）
  载体: SubAgent
  输入: 步骤 1.2 产出
  产出: changed files + {PROJECT_META_ROOT}/agent-outputs/luban/{task}/implementation-report.md
  验收: 设计条目全部落地；L1 冒烟 + L2 针对性测试证据
  验证: L1 冒烟 + L2 针对性测试（重点：新增持久化字段与公开 API 的行为与边界）
  Gate: artifact 落盘且验收通过
  状态: pending

- 步骤 2.2: 前端实现（与 2.1 无共享文件，可并行；有共享写入时用 worktree）
  执行: luoshen（work）
  载体: SubAgent
  输入: 步骤 1.2 产出
  产出: changed files + {PROJECT_META_ROOT}/agent-outputs/luoshen/{task}/implementation-report.md
  验收: 浏览器交互验证证据 + L1 冒烟
  验证: L1 冒烟 + 浏览器交互验证（重点：Y 功能关键状态与表单路径）
  Gate: artifact 落盘且验收通过
  状态: pending

## Phase 3: 审核与提交

- 步骤 3.1: 代码审核
  执行: diting（expert）
  载体: SubAgent
  输入: 步骤 2.1、2.2 产出
  产出: {PROJECT_META_ROOT}/agent-outputs/diting/{task}/diting-review-report.md（头部含 diff 基线）
  验收: 审核结论 PASS；不通过则按回流表打回修复（同一问题最多 3 轮）
  验证: 无（审核步；测试证据的映射成立性与冗余识别随审）
  Gate: 审核 PASS 的 artifact 落盘
  状态: pending

- 步骤 3.2: 沉淀评估
  执行: puti（expert）
  载体: SubAgent
  输入: 步骤 3.1 产出
  产出: {PROJECT_META_ROOT}/agent-outputs/puti/{task}/puti-retrospective.md
  验收: 沉淀结论明确（入战术手册 / 无需沉淀及理由）
  验证: 无（沉淀步）
  Gate: artifact 落盘
  状态: pending

- 步骤 3.3: 提交
  执行: taibai（fast）
  载体: SubAgent
  输入: 步骤 3.1、3.2 产出
  产出: {PROJECT_META_ROOT}/agent-outputs/taibai/{task}/git-commit-report.md
  验收: 提交完成，报告含 commit hash 与 changed files
  验证: 无（提交步，commit-guard 敏感文件守卫兜底）
  Gate: 提交报告落盘
  状态: pending

# 风险标注

| 步骤 | 风险点 | 必须过 diting 审核位的理由 |
|---|---|---|
| 2.1 | 数据、接口 | 新增持久化字段与公开 API，属高风险路径 |

# 自治级别

interactive
