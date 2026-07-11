# Artifact Contract

- 只有下游确实需要、任务跨阶段或产物需要审计时才要求落盘 artifact。
- 下游必须读取 `required_artifacts`，缺失时停止并报告，不得凭摘要猜测补齐。
- artifact 记录结论、证据路径、changed files、验证、风险和建议下一步。
- 对话只传递足够的摘要与完整路径，避免复制大段上游内容。
- Leader 负责判断产物是否满足下游消费和最终验收，不以文件存在替代质量判断。
