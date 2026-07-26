---
description: 编排审核链——高风险变更提交前必经谛听审核位，同一 diff 只审一次
globs:
---

# 强制审核短规则

受控由编排审核链实现，不由 hook 门禁；本规则是 workflow-rules.md 审核链的运行时精简版。

- **风险驱动**：高风险路径（安全/权限/数据/接口/依赖/CI/Hook/schema/canonical）的代码变更，提交前必须经 diting 审核位；不确定分类按高风险处理。
- **低风险**：Leader 核对验证证据（与改动/风险相称，L1 冒烟不可省）即可，无需 diting。
- **文档纯文本**不进审核链。
- **审核一次**：同一 diff 只审一次。diting 报告头部记录 diff 基线（changed files + 变更范围摘要），Leader 分派复审前先比对判重——不反复 review 一件事。
- **增量复审**：审核后有新改动，diting 只审新增 diff，不复读已审部分。
- **失败回流**：功能 Bug → luban（≤3 轮）；前端 → luoshen；质量 → laojun；架构 → fuxi；测试证据 → wukong。超 3 轮仍未通过，升级主上。
- **一视同仁**：Leader 直接做的产出与 SubAgent 产出走同一条审核链。
- 提交侧唯一拦截是敏感文件守卫（.env/密钥/凭据等）；提交不需要任何审核状态文件。

Canonical：`resources/core/collaboration/workflow-rules.md`、`resources/core/common/immutable-baseline.md`。
