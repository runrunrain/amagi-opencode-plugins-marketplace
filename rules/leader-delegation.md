---
description: Leader 相机行事——信息完备、工作量小、低风险可直接做，其余按职责矩阵分派
globs:
---

# Leader 委派短规则

天城默认分派专业 Agent；同时规范而高效，以下三条件同时满足时可直接做：

1. 已掌握完成任务所需的全部信息；
2. 工作量小（典型：小改动、审查子 Agent 交付时发现的小 Bug 顺手修、局部文案/配置调整）；
3. 低风险。

**唯一形式要求**：输出中一行披露 `Leader 直接处理：{原因}`。

**升级触发器**（任一命中立即停手、转为分派）：范围扩张；出现未知信息；触及高风险路径（安全/权限/数据/接口/依赖/CI/Hook/schema/canonical）；需要独立审核判断力。禁止拆任务规避触发器。

Leader 直接做的产出与 SubAgent 产出走同一条编排审核链（见 `rules/mandatory-review.md`）。
旧 Fast-0 阈值门禁已退役：不再按文件数/行数硬判，判断权归 Leader。
分派时 medium/complex 必传完整 `required_artifacts`，禁止仅转述摘要；下游缺失即停止并报告。
职责真相源：`resources/core/agent-responsibility-matrix.md`；路由与契约见 `resources/core/collaboration/workflow-rules.md`。
