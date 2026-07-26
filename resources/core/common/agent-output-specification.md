# Agent 输出规范

> 框架规则版本 10.3 | 2026-05-10 | 维护者：Thinker Agent
> Source Status: canonical
> Scope: artifact 落盘、Task Contract 输出、plan-registry 链路、对话返回格式

统一所有 Agent 的输出位置、报告字段、验证证据和计划注册方式。本文件是真相源；`agent-base-constraints.md` 为 SubAgent 公共基座（类型骨架 canonical 定义点 + 公共约束压缩引用）。

---

## 1. 路径概念

| 术语 | 含义 |
|------|------|
| AMAGI_WORKSPACE_ROOT | 工作区根目录（环境变量） |
| PROJECT_META_ROOT | `{AMAGI_WORKSPACE_ROOT}/projects/{activeProject}`，保存项目文档、知识库、Agent 输出 |
| PROJECT_CODE_PATH | 与工作区并列或 registry 指定的真实代码路径 |

关键区别：Agent 输出报告保存到 PROJECT_META_ROOT，代码修改发生在 PROJECT_CODE_PATH。

---

## 2. Artifact 输出规则（强制）

| 规则 | 要求 |
|------|------|
| 必产 artifact | 分析、设计、实现、测试、审核、调研、反思等会被下游消费的输出必须落盘 |
| 主文档必写 | 每次持久化输出必须写入主报告文件（如 `implementation-report.md`、`review-report.md`） |
| 元数据必写 | 每次持久化输出必须同时写入同目录 `metadata.json`，字段要求与 `skills/agent-document-output/SKILL.md` 对齐 |
| 必传路径 | 返回 Leader 时必须包含 artifact 完整路径 |
| 必引上游 | 输出 artifact 必须列出所有读取并作为依据的上游 artifact 路径 |
| 禁止仅转述 | Leader 分派下游时禁止只转述摘要，必须传递 required_artifacts |
| 缺失即停止 | 下游发现 required_artifacts 缺失时报告缺失清单，不得凭记忆补齐 |

路径模式：`{PROJECT_META_ROOT}/agent-outputs/{agent-type}/{timestamp}-{task-brief}/{main-report}.md`，同目录必须包含 `metadata.json`。

---

## 3. 统一报告字段

每份主报告应按任务类型裁剪，但必须覆盖以下字段。

| 字段 | 必填场景 | 说明 |
|------|----------|------|
| task_id / phase | Task Contract 存在时 | 保持链路可追踪 |
| changed_files | 有文件变更时 | 列出绝对或仓库相对路径与变更类型 |
| upstream_artifact_references | 所有 artifact | 引用完整路径，不能只写摘要 |
| decisions | 设计、实现、优化、审核 | 记录关键选择、理由和替代方案 |
| validation_results | 所有交付 | 命令/检查、结果、失败处理、未覆盖范围 |
| rollback_notes | 有文件变更时 | 说明回滚粒度和可恢复路径 |
| remaining_risks | 所有交付 | 标注延期项、风险和原因 |
| suggested_next_step | 所有交付 | 写给 Leader 判断的后续动作 |

---

## 4. SubAgent 对话返回格式

SubAgent 完成后，对话中只返回摘要，不粘贴完整报告。

```markdown
## 摘要
- [3-5 句话说明任务执行结果]

## Artifact 路径
- {artifact_full_path}

## 引用上游 artifact
- {upstream_artifact_full_path}

## 验证/自检结果
- [命令/检查：PASS/FAIL；必要时说明失败原因]

## 建议下一步
- [交给 Leader 判断的后续动作]
```

---

## 5. 计划注册表规范

计划注册表用于持久化索引需求分析和执行计划，防止上下文压缩后计划丢失。

| 项 | 规则 |
|----|------|
| 路径 | `{PROJECT_META_ROOT}/agent-outputs/plan-registry.json` |
| 适用类型 | `requirement-analysis`、`execution-plan` |
| 新增策略 | 新条目写入时，同类型旧 active 置为 superseded，新条目置为 active |
| 不存在处理 | 按需创建空数组，不阻塞流程 |
| 条目预算 | 单条记录小于 500 字；summary 不超过 200 字 |

### 记录字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | `{type}-{timestamp}` |
| type | enum | `requirement-analysis` 或 `execution-plan` |
| path | string | 文档目录或主文档绝对路径 |
| timestamp | ISO 8601 | 创建时间 |
| status | enum | `active`、`superseded`、`completed` |
| summary | string | 足以恢复计划感知的短摘要 |
| phases | array | execution-plan 专用，记录阶段名称、任务数、状态 |
| relatedPlanId | string | 关联需求分析或执行计划 |

---

## 6. requirement-analysis / execution-plan 对齐规则

| 产物 | 必须写入 | 下游消费方式 |
|------|----------|--------------|
| requirement-analysis | 问题定义、子需求、约束、边界、待调研项、输出预设 | execution-plan 和后续设计必须作为 required_artifact 读取 |
| execution-plan | Phase、任务列表、验收标准、风险、交付物、检查清单 | Leader 分派 Task Contract 时引用具体 phase 和 required_artifacts |
| plan-registry | 最新需求与计划索引 | 上下文压缩或接力时先读 registry 再读主文档 |

---

## 7. 验证证据格式

验证结果必须可复核，不接受“已验证”空话。

| 类型 | 记录方式 |
|------|----------|
| 命令 | 写明命令、工作目录、退出状态、关键输出摘要 |
| 结构检查 | 写明检查脚本、匹配规则、命中数量 |
| 浏览器验证 | 写明页面、操作步骤、观察结果、截图路径（如有） |
| 只读调研 | 写明读取路径、行号或 URL、未覆盖范围 |
| 禁止变更检查 | 写明禁止文件匹配结果，如 hooks/schema/plugin/frontmatter 是否被触碰 |

---

## 8. 行数预算与适配器边界

| 文件族 | 建议预算 | 输出要求 |
|-------|----------|----------|
| rules/*.md | 正文 5-10 行 | 自包含短规则 + canonical source path |
| CLAUDE.template.md（L0） | ≤120 行 | adapter 保留最小安全网，不复述完整真相源 |
| resources/core/**（L1） | 合计 ≤1100 行 | canonical 规则，命中索引按需加载 |
| agent-base-constraints.md | 80-100 行 | SubAgent 公共基座：类型骨架 canonical 定义点 + 公共约束压缩引用 |
| agents/*.md（L2） | ≤150 行（fast 型 baize/wenqu/taibai ≤180 行） | 三层合成（类型骨架 × 模型特点 × 角色 checklist），通用规则引用 base constraints |

预算不是硬性失败条件，但新增提示词资产必须报告行数变化和超预算理由；预算检查由 `scripts/prompt-consistency-check.ts` 执行。

---

## 9. 要点速览

- 输出位置决定归属，禁止混淆 PROJECT_META_ROOT 与 PROJECT_CODE_PATH。
- 下游消费的报告必须落盘并在返回中给完整路径。
- required_artifacts 是执行前置条件，不是可选背景。
- requirement-analysis 与 execution-plan 必须同步 plan-registry。
- validation_results 必须记录可复核证据、命令或结构检查。
- adapters 和 agent prompts 不做第二真相源，只保留最小安全网与角色差异。
