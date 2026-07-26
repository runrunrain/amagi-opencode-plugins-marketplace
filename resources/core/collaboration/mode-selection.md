> **OpenCode adapter（优先于下文的跨 harness 描述）**：
> - `agent_team` 在本插件中表示 Leader 调度多个 OpenCode SubAgent，可用 background task 并行独立方向；所有通信与交接都经 Leader。
> - OpenCode 没有 Claude Agent Teams 的 P2P mailbox，也不接受 `isolation: worktree` task 参数；需要 worktree 时先由 Leader/taibai 显式创建并把绝对路径写进 Task Contract。
> - 所有 Amagi SubAgent 的 `task` 权限均为 deny，递归分派由运行时权限和 prompt 双重阻止。
# 协作模式选择决策

> 框架规则版本 10.3 | 2026-05-10 | 维护者：Thinker Agent
> Source Status: canonical
> Scope: SubAgent 与 Agent Teams 模式选择决策

SubAgent 和 Agent Teams 模式的选择决策规则，包括决策流程、模式对比、触发场景和决策清单。

---

## 模式对比

| 特性 | SubAgent 模式 | Agent Teams 模式 |
|------|--------------|-----------------|
| 主 Agent 角色 | 规划者+执行者 | 纯 Leader：协调与验收，不执行具体任务（Leader 相机行事直做的边界见 workflow-rules.md） |
| 通信方式 | 仅向 Leader 报告结果 | 触发式主动报告（进度/风险/阻塞即报），跨成员信息由 Leader 中转 |
| 并行策略 | 独立任务并行，结果汇总 | 专业化分工，瓶颈分散，持续协作 |
| 依赖管理 | 主 Agent 手动管理 | Phase Gate 门控：Phase N 未完成→禁止启动 Phase N+1 |
| Worktree 隔离 | 由 Leader/taibai 显式创建 worktree，再把绝对路径写入 Task Contract；不得向 task 传 isolation 参数 | 各 SubAgent 仍共享当前工作区语义；写操作必须按文件边界串行或显式 worktree 隔离 |
| 最适合场景 | 专注任务，只需结果 | 需要讨论、协作、辩论的复杂任务 |

---

## Agent Teams 触发场景

| 场景 | 触发条件 | 推荐配置 |
|------|---------|---------|
| 并行代码审查 | 需要从多个维度审查（安全/性能/测试） | 审查者A（安全）/ 审查者B（性能）/ 审查者C（测试） |
| 竞争假设调试 | 有多个可能的根因假设 | 调查者A/B/C/D（每人一个理论） |
| 跨层协调 | 涉及前端/后端/测试多层 | 前端/后端/测试各一人 |
| 多角度研究 | 需要从多个角度调查 | UX / 架构 / Devil's Advocate |

---

## SubAgent 触发场景

| 场景 | 触发条件 | 执行方式 |
|------|---------|---------|
| 有依赖关系的任务 | 后续任务需要前置任务的输出 | 串行执行 |
| 同一文件多次修改（无 worktree） | 需要多次修改同一文件 | 串行执行（避免冲突） |
| 同一文件多次修改（有 worktree） | 需要多次修改同一文件 | 可并行执行（各 SubAgent 在独立 worktree 副本上工作，最后由 Leader/taibai 合并） |
| 独立任务并行 | 任务间无依赖关系 | 并行执行后汇总结果 |
| 独立模块并行开发 | 多个 SubAgent 分别负责不同模块，模块间文件无交叉 | 可并行；如需隔离，先显式创建 worktree 并传绝对路径 |

---

## Worktree 决策树

### 使用 worktree 的条件

- SubAgent 需要执行写操作（Edit/Write）
- 多个 SubAgent 可能修改相同或相关文件
- 独立模块开发，改动范围明确
- 希望保护主工作区状态，失败可直接丢弃

### 跳过 worktree 的条件

- 只读探索（白泽/explorer 角色）
- 单 SubAgent，无并发冲突风险
- 需要实时看到其他 SubAgent 修改（worktree 间互不可见）
- Agent Teams SubAgent（已是独立实例，天然隔离）

### 合并流程

worktree SubAgent 完成 → 报告 worktree 路径和分支名 → Leader/taibai 执行合并

---

## 要点速览

- 需要队友间讨论/辩论 → Agent Teams
- 有明确的依赖关系 → SubAgent（串行）
- 独立任务只需结果汇总 → SubAgent（并行）
- 同一文件需多次修改 → 无 worktree 则串行，有 worktree isolation 则可并行
- 协作价值必须大于令牌成本才使用 Agent Teams
- SubAgent 写操作 + 并行风险 → 先显式创建 worktree 并传绝对路径，或改为串行
- OpenCode SubAgent 不视为天然文件隔离；写操作必须明确文件边界
- 大需求/复杂攻坚的全局编排走 workflow 模式（Leader 按任务实际自行编写并修订 workflow 活文档）；本文件只解决单个步骤内 SubAgent 与 Agent Teams 的载体选择
