> **OpenCode adapter（优先于下文的跨 harness 描述）**：
> - `agent_team` 在本插件中表示 Leader 调度多个 OpenCode SubAgent，可用 background task 并行独立方向；所有通信与交接都经 Leader。
> - OpenCode 没有 Claude Agent Teams 的 P2P mailbox，也不接受 `isolation: worktree` task 参数；需要 worktree 时先由 Leader/taibai 显式创建并把绝对路径写进 Task Contract。
> - 所有 Amagi SubAgent 的 `task` 权限均为 deny，递归分派由运行时权限和 prompt 双重阻止。
# SubAgent 模式

> Source Status: canonical
> Scope: 单 Agent 委派：五要素、prompt 模板、返回格式、路径说明、深度与循环限制。路由、契约分档与审核规则以 `workflow-rules.md` 为准。

## 何时使用

适用于一个专业角色可独立完成、只需将结果交回 Leader 的任务。多角色需要持续讨论、共同决策或跨阶段协商时改用 Agent Teams（选择标准见 `mode-selection.md`）；只读探索无需 worktree。

## 委派五要素

创建 SubAgent 时必须提供：

| # | 要素 | 说明 |
|---|---|---|
| 1 | 具体目标 | 明确要完成什么 |
| 2 | 期望格式 | 输出的具体格式（落盘 artifact 或对话摘要） |
| 3 | 背景上下文 | 为什么需要这个任务 |
| 4 | 建议起手式 | 从哪里开始 |
| 5 | 工具边界 | 可以使用和不能使用的工具 |

## SubAgent Prompt 模板

通用骨架（压缩 Task Contract 头 + 五要素正文）：

```markdown
[TASK_TIER: simple|medium|complex]
task_id: {task_id}
目标: {具体目标}
范围: {允许修改的文件或模块}
输入: {input_artifacts 完整路径；无则写无}
必读: {required_artifacts 完整路径；无则写无}
输出: {output_artifact 完整路径，或"对话摘要"（simple 档）}
验收: {可验证完成条件}
验证: {层级 L1/L2/L3 + 重点风险；未注明时功能变更默认 L1+L2、simple 默认 L1}
背景: {为什么需要}
起手式: {建议第一步}
约束: 只做本任务；禁止调用其他 Agent / Task / runSubagent；范围扩张、无法验证或发现高风险时停止并报告；建议下一步交 Leader。
```

### 四类型变体

| 类型 | 对应 Agent | prompt 附加要求 |
|---|---|---|
| leader | amagi（Leader 自身，一般不作 SubAgent 分派） | 约束最少、判断空间最大；仅主上显式指定的独立 Leader 实例场景使用 |
| work | luban / luoshen / laojun / wukong / cangjie | 指令完整、验收条目可细、文件边界明确；返回须含"验证/自检结果 + 建议下一步" |
| expert | diting / fuxi / puti / hongjun | 精确问题陈述 + 完整上下文 + 锁定范围：不重新规划、不扩大战场；产出证据充分的结论，决策权留 Leader |
| fast | baize / wenqu / taibai | 约束最细最具体：只交付客观资料包（看过什么、在哪看到、原文出处），**禁止输出结论、建议与下一步推荐**；不确定项标【待核验】，绝不猜测 |

## 返回与交接

### 摘要式返回格式（强制）

```markdown
## 摘要
- [3-5 句：完成内容、核心判断、是否达成验收]

## Artifact 路径
- {output_artifact_full_path}

## 引用上游 artifact
- {upstream_path}（无则写"无"）

## 验证/自检结果
- {命令、检查与结论；限度自检披露（如有）}

## 建议下一步
- [交给 Leader 判断的后续动作；fast 型无此节，替换为"## 待核验项"]
```

完整内容必须落盘为 artifact，对话中禁止堆砌完整报告。下一步与审核方式由 Leader 决定，SubAgent 不自行调度。

### 下游必读规则（强制）

- 执行前必须读取 Task Contract 中全部 `required_artifacts`。
- 缺失即停止：关键 artifact 缺失或无法读取时，立即停止并返回缺失清单。
- 禁止凭 Leader 转述继续：转述不能替代上游 artifact 原文。
- 禁止猜测补齐：架构、测试、审核等关键依据缺失时，不得基于转述重写核心内容。

## 路径说明规范（强制）

涉及代码操作（测试、分析、修改）的分派，prompt 必须包含【路径说明】：

```text
【路径说明】
- 项目代码路径（PROJECT_CODE_PATH）：
  ① 读取 {PROJECTS_DIR}/registry.json
  ② 提取 projects["{activeProject}"].projectPath
  ③ 得到真实代码路径
- 输出报告路径：{PROJECT_META_ROOT}/agent-outputs/{agent}/
【执行环境】
- 工作目录（cd）：{PROJECT_CODE_PATH}；运行测试/构建命令前必须先 cd 到该路径
```

路径术语详见 `resources/core/integrations/project-management.md`。

- 错误示例：`请运行完整测试套件……输出保存到 projects/xxx/agent-outputs/luban/`——无代码路径、无 cd 要求，SubAgent 易在错误目录执行或把报告写进代码仓库。
- 正确示例：附上方【路径说明】（①②③ 定位 PROJECT_CODE_PATH，cd 后执行命令），输出写 `{PROJECT_META_ROOT}/agent-outputs/{agent}/` 完整路径。

## 调用深度与循环检测

- 深度 0：Leader 自身执行（相机行事直做）；深度 1：Leader → SubAgent（常规委派，SubAgent 为硬顶）；深度 2：仅 Agent Teams 内 SubAgent 间协作。
- SubAgent 不调用其他 Agent、Task 或 runSubagent；后续动作一律以"建议下一步"交回 Leader 调度。
- 禁止循环调用：直接循环（A→A）、双向循环（A→B→A）、同类型循环（luban→luban）。
- 以上约束由 harness 内置能力与 prompt 语义共同实现；无内置隔离的 harness 依赖本节语义兜底，不得裁剪。

## 反重复规则

- 已委派给 SubAgent 的探索/检索/分析，Leader 不重复执行；以 SubAgent 返回的 artifact 为准，有疑问时派 fast 型复核或令原 Agent 补充。
- 已审核的 diff 部分不复读重审（审核一次原则，见 `workflow-rules.md`）。

## 待反思标记

- SubAgent 遇到踩坑、新模式或重复问题时，在返回中打【待反思】标记（含触发 Agent、场景描述、必要上下文）。
- 触发场景表与沉淀链定义见 `agents/puti.md`。

## 运行限制

- 写操作有并行冲突时使用 worktree；完成后报告路径和分支，由 Leader/taibai 合并。
- 使用 Amagi custom agent 名称；runtime 不可用时才 fallback，并显式保留目标模型/推理配置。
- 一个任务只修改明确分配的文件；范围外发现记入风险或建议下一步，不擅自扩大。
