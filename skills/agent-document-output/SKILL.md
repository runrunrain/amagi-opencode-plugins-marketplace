---
name: agent-document-output
description: |
  Agent文档输出与 artifact 持久化规范。任何 Agent 完成任务、阶段交接、失败中止、报告产出、implementation report、review report、handoff note、save output、document artifact、persist output、metadata.json 写入时都应使用本技能。用于把主文档、metadata、路径命名和索引更新统一落盘。不要用于普通聊天回复、未形成可复用 artifact 的临时说明，或替代具体业务技能的执行流程。
version: "3.0"
author: amagi
allowed-tools: Write, Read, Bash
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# Agent文档输出技能

> **适用Agent**: 所有Agent（白泽/伏羲/鲁班/洛神/谛听/太上老君/仓颉/太白金星/菩提祖师/孙悟空/文曲星/鸿钧老祖）
> **维护者**: 菩提祖师（puti）Agent
> **版本**: 3.0.0

---

## 什么时候使用此技能？

**使用此技能当：**
- 任何Agent完成任务并需要保存输出文档时
- Agent准备交接给下一个Agent时
- 任务失败或中止，需要记录进度和问题时
- 主上要求输出中间报告时
- 任务到达关键里程碑时

**各Agent的触发场景：**
| Agent | 触发时机 | 输出文档 |
|-------|----------|----------|
| **白泽（explorer）** | 代码探索、信息收集完成 | `research-report.md` |
| **伏羲（architect）** | 架构设计、技术方案完成 | `design-doc.md` |
| **鲁班（coder）** | 代码实现、自测完成 | `self-test-report.md` |
| **洛神（designer）** | UI设计、前端实现完成 | `design-impl-report.md` |
| **仓颉（writer）** | 文档撰写完成 | `document.md` |
| **谛听（reviewer）** | 代码审核完成 | `review-report.md` |
| **太上老君（optimizer）** | 代码优化、重构完成 | `optimization-report.md` |
| **太白金星（manager）** | Git操作完成 | `commit-summary.md` |
| **菩提祖师（thinker）** | 反思、系统进化记录 | `reflection-report.md` |
| **孙悟空（tester）** | 测试编写、执行完成 | `test-report.md` |
| **文曲星（researcher）** | 技术调研完成 | `research-findings.md` |
| **鸿钧老祖（master）** | 高难度任务完成 | 按实际任务类型选择 |

---

## 执行步骤（按顺序）

### STEP 1: 读取项目配置并推导路径

1. 以当前工作路径为起点，向上查找 `projects-memory/projects/registry.json`，所在目录即为 WORKSPACE_ROOT
2. 派生路径：
   - PROJECTS_MEMORY_ROOT = {WORKSPACE_ROOT}/projects-memory
   - PROJECTS_DIR = {PROJECTS_MEMORY_ROOT}/projects
   - PROJECT_META_ROOT = {PROJECTS_DIR}/{activeProject}
3. 读取 {PROJECTS_DIR}/registry.json 获取 activeProject 和 projectPath

### STEP 2: 生成任务标识

生成时间戳：YYYYMMDD-HHmmss（例如：20260115-143000）
创建任务简述：使用kebab-case（例如：analyze-combat-system）
拼接任务ID：{timestamp}-{task-brief}

### STEP 3: 创建输出目录

路径格式：{PROJECT_META_ROOT}/agent-outputs/{agent-name}/{task-id}/
其中 PROJECT_META_ROOT = {WORKSPACE_ROOT}/projects-memory/projects/{activeProject}，从当前路径推导，禁止硬编码绝对路径
使用Bash工具：mkdir -p "完整绝对路径"

### STEP 4: 写入主文档和元数据（按 task_tier 分档）

| tier | 主文档 | metadata.json | plan-registry.json |
|------|--------|---------------|---------------------|
| simple | 不强制（除非 Leader 显式要求 `output_form=落盘`） | 不强制 | 跳过 |
| medium | 必须落盘 | 必须落盘（完整字段，见下方 "metadata.json 格式"） | 跳过 |
| complex | 必须落盘 | 必须落盘（完整字段） | STEP 5 执行 |

**判定规则**：
- `task_tier` 由 Task Contract 或分派上下文携带（见 `CLAUDE.template.md` §4 任务分类）。
- 缺失 `task_tier` 标签 → 默认 **medium**（保守，强制落盘）。
- Leader 显式要求落盘（任何 tier）→ 必须落盘（Leader 意图优先）。
- simple 档对话摘要格式：见本 skill 后文 "SubAgent 摘要返回格式"；因无落盘文件，"Artifact 路径" 字段可省。

**Leader 显式要求落盘的 simple 档**：写最小 metadata 即可，字段 = `taskId` / `timestamp` / `agent` / `projectId` / `taskBrief` / `status`。

### STEP 5: 更新计划注册表（仅 complex 档 + requirement-analysis / execution-plan 类型）

**触发条件**：当前 Agent 的输出类型为 requirement-analysis 或 execution-plan **且** `task_tier=complex` 时执行；medium 档跳过；simple 档禁用。

**执行步骤**：

1. 读取 `{PROJECT_META_ROOT}/agent-outputs/plan-registry.json`
   - 文件不存在时：创建空数组 `[]` 作为初始内容，不报错
2. 将现有同类型（同一 `type` 字段）的所有 `status: "active"` 条目改为 `status: "superseded"`
3. 追加新条目到数组末尾：
   ```json
   {
     "id": "{type}-{timestamp}",
     "type": "requirement-analysis | execution-plan",
     "path": "{PROJECT_META_ROOT}/agent-outputs/{agent-name}/{task-id}/",
     "timestamp": "ISO 8601格式时间戳",
     "status": "active",
     "summary": "关键摘要（不超过200字，见摘要要求）",
     "phases": [],
     "relatedPlanId": ""
   }
   ```
   - requirement-analysis 的 `phases` 字段设为 `[]`
   - execution-plan 的 `phases` 字段格式：`[{"phase": "Phase 1: xxx", "taskCount": N, "status": "pending"}]`
   - `relatedPlanId` 填写关联的另一类型的活跃条目 id（如有）
4. 写回 `plan-registry.json`

**摘要字段要求**：

| 类型 | summary 必须包含 |
|------|----------------|
| requirement-analysis | 问题定义一句话、子需求数量、P0需求列表、关键技术约束 |
| execution-plan | 总Phase数、总任务数、关键里程碑、预估工时 |

**禁止**：plan-registry.json 不存在时报错或跳过；summary 超过200字；每条记录超过500字

---

## 路径结构规范

### 标准输出目录

> **所有路径基于 WORKSPACE_ROOT（从当前工作路径向上推导），不是项目代码路径！禁止硬编码绝对路径。**

> **注意**：目录名使用 Agent YAML `name` 字段值（即功能角色名），不使用中文名。

{PROJECT_META_ROOT}/agent-outputs/
  ├── explorer/{timestamp}-{task-brief}/       -- 白泽
  │   ├── research-report.md
  │   └── metadata.json
  ├── architect/{timestamp}-{task-brief}/      -- 伏羲
  │   ├── design-doc.md
  │   └── metadata.json
  ├── coder/{timestamp}-{task-brief}/          -- 鲁班
  │   ├── self-test-report.md
  │   └── metadata.json
  ├── designer/{timestamp}-{task-brief}/       -- 洛神
  │   ├── design-impl-report.md
  │   └── metadata.json
  ├── writer/{timestamp}-{task-brief}/         -- 仓颉
  │   ├── document.md
  │   └── metadata.json
  ├── reviewer/{timestamp}-{task-brief}/       -- 谛听
  │   ├── review-report.md
  │   └── metadata.json
  ├── optimizer/{timestamp}-{task-brief}/      -- 太上老君
  │   ├── optimization-report.md
  │   └── metadata.json
  ├── manager/{timestamp}-{task-brief}/        -- 太白金星
  │   ├── commit-summary.md
  │   └── metadata.json
  ├── thinker/{timestamp}-{reflection-id}/     -- 菩提祖师
  │   ├── reflection-report.md
  │   └── metadata.json
  ├── tester/{timestamp}-{task-brief}/         -- 孙悟空
  │   ├── test-report.md
  │   └── metadata.json
  ├── researcher/{timestamp}-{task-brief}/     -- 文曲星
  │   ├── research-findings.md
  │   └── metadata.json
  └── master/{timestamp}-{task-brief}/         -- 鸿钧老祖
      ├── {按任务类型选择}.md
      └── metadata.json

### 路径变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| {WORKSPACE_ROOT} | 从当前工作路径向上查找 projects-memory/projects/registry.json 所在目录 | /Users/user/workspace |
| {PROJECT_META_ROOT} | {WORKSPACE_ROOT}/projects-memory/projects/{project-id} | /Users/user/workspace/projects-memory/projects/zhanzhai |
| {project-id} | 从registry.json的activeProject读取 | zhanzhai |
| {timestamp} | 格式YYYYMMDD-HHmmss | 20260115-143000 |
| {task-brief} | 任务简述，kebab-case | analyze-combat-system |
| {reflection-id} | 反思ID，格式REF-{timestamp} | REF-20260115-143000 |

---

## metadata.json 格式（必须）

每个任务必须包含完整的metadata.json：

{
  "taskId": "{timestamp}-{task-brief}",
  "timestamp": "2026-01-15T14:30:00Z",
  "agent": "explorer|architect|coder|designer|writer|reviewer|optimizer|manager|thinker|tester|researcher|master",
  "projectId": "zhanzhai",
  "taskBrief": "任务简述",
  "status": "completed|in-progress|failed",
  "upstreamArtifactReferences": [
    "上游 artifact 路径（引用的 requirement-analysis、architecture-design 等文档完整路径）"
  ],
  "validationEvidence": {
    "buildStatus": "passed|failed|not_applicable",
    "testStatus": "passed|failed|not_applicable",
    "browserVerification": "verified|not_applicable",
    "commands": [
      {"command": "执行的验证命令", "exitCode": 0, "summary": "结果摘要"}
    ]
  },
  "tags": ["标签1", "标签2"],
  "relatedFiles": ["相关文件路径"],
  "nextSteps": {
    "suggestedAgent": "下一个Agent",
    "suggestedAction": "建议的下一步行动"
  }
}

必填字段：taskId, timestamp, agent, projectId, taskBrief, status, upstreamArtifactReferences

---

## 各Agent输出模板

| Agent | 主文档名 | 用途 | 模板文件 |
|-------|----------|------|----------|
| 白泽（explorer） | research-report.md | 代码探索、信息收集 | templates/explorer-report.md |
| 伏羲（architect） | design-doc.md | 架构设计、技术方案 | templates/（按任务类型选择，可复用现有模板或新建） |
| 鲁班（coder） | self-test-report.md | 代码实现、自测结果 | templates/coder-self-test.md |
| 洛神（designer） | design-impl-report.md | UI设计、前端实现 | templates/（按任务类型选择，可复用现有模板或新建） |
| 仓颉（writer） | document.md | 文档撰写输出 | templates/（按任务类型选择，可复用现有模板或新建） |
| 谛听（reviewer） | review-report.md | 代码审核报告 | templates/（按任务类型选择，可复用现有模板或新建） |
| 太上老君（optimizer） | optimization-report.md | 代码优化报告 | templates/（按任务类型选择，可复用现有模板或新建） |
| 太白金星（manager） | commit-summary.md | Git操作记录 | templates/（按任务类型选择，可复用现有模板或新建） |
| 菩提祖师（thinker） | reflection-report.md | 反思报告、系统进化 | templates/（按任务类型选择，可复用现有模板或新建） |
| 孙悟空（tester） | test-report.md | 测试策略和执行报告 | templates/（按任务类型选择，可复用现有模板或新建） |
| 文曲星（researcher） | research-findings.md | 技术调研报告 | templates/（按任务类型选择，可复用现有模板或新建） |
| 鸿钧老祖（master） | 按任务类型选择 | 高难度任务输出 | 复用对应类型模板 |

---

## 验证证据格式

验证结果必须可复核，不接受"已验证"空话。

### 证据类型

| 类型 | 记录方式 | 适用 Agent |
|------|---------|-----------|
| 命令验证 | 写明命令、工作目录、退出状态、关键输出摘要 | 所有执行命令的 Agent |
| 结构检查 | 写明检查脚本、匹配规则、命中数量 | 鲁班、洛神 |
| 浏览器验证 | 写明页面、操作步骤、观察结果、截图路径 | 洛神、谛听 |
| 只读调研 | 写明读取路径、行号或 URL、未覆盖范围 | 白泽、文曲星 |
| 禁止变更检查 | 写明禁止文件匹配结果 | 太上老君、菩提祖师 |

### 各 Agent 必备验证

| Agent | 必备验证 |
|-------|---------|
| 鲁班（coder） | 编译/构建通过、功能测试通过、边界测试通过 |
| 洛神（designer） | 浏览器交互验证（agent-browser）、关键状态覆盖（加载态/空态/错误态/成功态） |
| 孙悟空（tester） | 测试套件执行结果、覆盖率报告 |
| 谛听（reviewer） | 审核清单完成度、问题分级、关键命令抽检结果 |
| 太上老君（optimizer） | 优化前后对比、性能基准、功能等价性验证 |
| 伏羲（architect） | 设计决策完整性、接口定义一致性 |
| 白泽（explorer） | 文件覆盖范围、信息完整性声明 |

---

## SubAgent 摘要返回格式

SubAgent 完成任务后，对话返回使用摘要式交付，不在对话中堆砌完整报告。

```markdown
## 摘要
- [3-5 句话说明完成内容、核心判断、是否达成验收]

## Artifact 路径
- {output_artifact_full_path}

## 引用上游 artifact
- {upstream_artifact_path_1}

## 验证/自检结果
- 构建：PASS/FAIL/不适用，{命令与关键输出}
- 测试：PASS/FAIL/不适用，{命令与关键输出}
- 自检：PASS/FAIL，{失败项说明}

## 建议下一步
- [交给 Leader 判断的后续动作]
```

**禁止行为**：
- 禁止在对话中粘贴完整报告（报告必须保存在 artifact 文件中）
- 禁止省略 artifact 路径
- 禁止省略上游 artifact 引用

---

## 常见错误处理

| 错误 | 处理方法 |
|------|----------|
| 项目ID读取失败 | 检查registry.json是否存在和格式正确 |
| 目录创建失败 | 使用mkdir -p确保父目录存在 |
| 时间戳格式错误 | 严格使用YYYYMMDD-HHmmss格式 |
| metadata.json格式错误 | 使用JSON验证工具检查 |
| registry.json 不存在 | 从当前路径向上查找 projects-memory/projects/registry.json，确认是否在工作区根目录 |
| WORKSPACE_ROOT 推导失败 | 检查当前目录是否在项目工作区内 |
| 上游 artifact 缺失 | 记录缺失清单到 metadata.json，不阻塞当前 Agent 的输出保存 |

---

## 核心原则

| 原则 | 说明 |
|------|------|
| 强制输出 | 每个Agent任务完成必须输出文档 |
| 标准路径 | 按项目和Agent分类存储 |
| 元数据齐全 | 每个任务包含完整metadata.json |
| 时间戳标识 | 使用时间戳作为任务唯一标识 |
| 双重保存 | 主要输出+agent-outputs备份 |
| Artifact Contract | 跨 Agent 交接必须使用 artifact 路径，禁止仅转述摘要 |
| 验证证据化 | 验证结果必须可复核，不接受"已验证"空话 |
| 路径从推导 | WORKSPACE_ROOT 从当前工作路径推导，不依赖环境变量 |
| 上游可追溯 | metadata.json 必须包含 upstreamArtifactReferences |

---

## 禁止行为

- 禁止跳过文档输出
- 禁止使用非标准路径
- 禁止省略metadata.json
- 禁止使用非标准时间戳格式
- 禁止遗漏必填字段

---

## 参考资源

- 元数据Schema: reference/metadata-schema.md
- 命名约定: reference/naming-conventions.md
- 完整输出流程和跨 Agent 任务链示例：优先参考本技能正文的 STEP 1-5；后续可在 `examples/` 增量补充，但当前不声明不存在的必读资源。
- SubAgent Prompt 模板: 参考 CLAUDE.template.md 中的"Leader Task Contract 分派模板"
- Artifact Contract 规则: 参考 resources/core/collaboration/workflow-rules.md
- 验证证据规范: 参考 resources/core/common/quality-standards.md

---

维护责任: 菩提祖师（puti）Agent
最后更新: 2026-05-27
