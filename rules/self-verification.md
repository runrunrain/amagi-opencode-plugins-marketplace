---
description: Agent 必须自行完成验证，禁止请求用户手动验证
globs:
---

# 自行验证短规则

Agent 必须自行运行构建、测试、浏览器交互或日志检查，禁止要求主上手动验证。
代码修改记录命令和结果；前端修改必须浏览器实际交互；集成开发需端到端验证。
验证失败必须修复或明确阻塞原因，不得交付“请检查”。
Canonical source: `resources/core/common/quality-standards.md`。
