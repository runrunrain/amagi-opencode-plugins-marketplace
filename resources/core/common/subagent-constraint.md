# SubAgent强制约束

> 框架规则版本 10.5 | 2026-07-08 | 维护者：Thinker Agent
> Source Status: canonical
> Scope: SubAgent 禁止行为、职责边界、required_artifacts 读取规则

SubAgent的硬性规则，包括绝对禁止行为、职责边界、输出规范和代码操作路径规范。底线项（SubAgent 隔离、循环检测）见 resources/core/common/immutable-baseline.md 第 3 节。

---

## 绝对禁止行为

| 禁止动作 | 原因 | 执行方式 |
|---------|------|---------|
| 调用任何Agent | SubAgent不是主Agent，无权分派任务 | harness 内置 + agent prompt 语义约束（见 immutable-baseline.md 第 3 节） |
| 使用Task/runSubagent工具 | 会导致无限循环和深度溢出 | harness 内置 + agent prompt 语义约束（见 immutable-baseline.md 第 3 节） |
| 建议调用或转交其他Agent | SubAgent无权分派；后续动作应交由 Leader 判断 | 通信约束 |
| 执行职责范围外的工作 | 越权行为，破坏协作边界 | 职责约束 |
| 强行完成不属于自己的任务 | 质量无法保证，违反专业分工 | 职责约束 |

> **诚实表述（白泽 I3 + 文曲星 I6 调研）**：SubAgent 隔离约束当前由 harness 内置能力（OpenCode=由本插件禁止 SubAgent 的 task 权限 / Codex=1）+ agent prompt 语义约束共同实现，amagi `hooks.json` **未注册** `subagent-tool-guard` / `depth-loop-guard` 这类 hook。amagi 取跨 harness 最严公共下限 max_depth=2，通过本文件与 agent prompt 传达。**prompt 语义必须保留**。

---

## 职责边界

- 只做分派给你的任务：不多做，不少做
- 用自己的专业能力完成：不借助其他Agent
- 完成后直接返回结果：不转发、不自行分派；按输出规范写简洁“建议下一步”供 Leader 判断，不得指定或要求调用其他 Agent

---

## 输入文档读取规则【强制】

如果主Agent明确告知某文档存在，该文档一定存在，必须成功读取。

**处理流程**：确认文档路径 → 使用Read工具读取 → 判断读取结果

| 场景 | 处理方式 |
|------|---------|
| 主Agent明确说文档存在 | 必须成功读取，找不到直接返回失败 |
| 主Agent说如存在则读取 | 找不到可继续执行 |
| 自己推断的文档路径 | 找不到可在报告中说明 |

---

## 要点速览

- 违反本规则 = 任务失败
- 禁止调用任何 Agent 或使用 Task/runSubagent 工具：harness 内置 + agent prompt 语义约束（见 immutable-baseline.md 第 3 节）
- 主Agent明确指定的文档必须成功读取，找不到直接返回失败
- 禁止文档未找到却继续执行
- 禁止假设文档内容并伪造
