# 不可妥协底线

> Source Status: canonical
> Scope: 所有 profile、task tier 和 runtime 均不可放松的约束；分档只放松流程开销，不放松本清单语义。
> 改动本清单需经 diting 审核 + puti 评估。

## Hook 最小安全网

仅保留三个拦截型 hook，此外不设拦截型 hook：

| hook | 拦截对象 |
|---|---|
| blocking-command-guard | 危险命令（明确不该执行） |
| json-syntax-guard | 非法 JSON 写入（保护状态文件可解析） |
| commit-guard | 敏感文件提交（.env / 密钥 / 凭据 / node_modules / 超大文件） |

门禁类 hook 与状态文件机制已退役：受控由编排审核链实现（见 `resources/core/collaboration/workflow-rules.md`），hook 不管行为好坏、只管红线。

hook 最小化条款——评审任何 hook 提案问两句：

1. 它拦的是不是明确不该发生的事？
2. agent 需要为它额外做什么吗？

任一答案不对即打回。保留的 hook 必须观察式工作，agent 为 hook 执行的额外动作 = 0。

## 语义底线（全 tier 生效）

- 禁假数据：不交付假数据、mock 数据、占位实现、Demo/MVP 骨架、TODO/FIXME/HACK 伪完成项（测试专用内容除外）。
- 自行验证：不要求主上手动验证；自行运行与改动/风险相称的验证，先验证再交付、验证失败不交付——L1 冒烟（构建通过/启动正常/关键路径验证）任何 tier 不可省，层级与限度见 workflow-rules.md"分场景证据要求"。
- 错误诊断基于代码与证据；怀疑环境因素必须先用进程、端口、配置或日志证明，禁止无证据归咎于"缓存/未重启/浏览器状态"。
- Web 测试不降级：需要交互或前端验证时必须用 agent-browser 做真实浏览器交互，API 测试只能补充不能替代；视觉模型须读截图确认，只存不看视为未验证。
- SubAgent 隔离（prompt 语义）：SubAgent 不调用 Agent / Task / runSubagent；禁止直接、双向、同类型循环调用。该约束由 harness 内置能力与 prompt 语义共同实现，无内置隔离的 harness 依赖 prompt 语义兜底，不得裁剪。

## Artifact 与提交底线

- AC-6 全 tier 生效：关键依据缺失不得猜测补齐（Artifact Contract 全文见 workflow-rules.md）。
- 提交侧不审核：git 提交不需要任何审核状态文件；commit-guard 敏感文件守卫是唯一提交拦截。

## 改动协议

- 本清单由 puti 维护，每次模型基线校准时评审。
- 改动需经 diting 审核（语义不放松）+ puti 评估（沉淀经验）。
- 实现真相源：`hooks/scripts/blocking-command-guard.ts`、`json-syntax-guard.ts`、`commit-guard.ts`；编排流程见 `resources/core/collaboration/workflow-rules.md`。
