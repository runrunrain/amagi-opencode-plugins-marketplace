---
description: "会话结束时保存项目状态、更新任务记录和记忆地图，准备下次会话"
agent: amagi-leader
---


# 保存会话状态

$ARGUMENTS

## 定位与安全检查

从当前目录逐级向上定位 `projects-memory/projects/registry.json`，读取 `activeProject`，派生：

- `PROJECT_META_ROOT={WORKSPACE_ROOT}/projects-memory/projects/{activeProject}`
- `TODOS_DIR={WORKSPACE_ROOT}/projects-memory/todos`

registry、activeProject 或目标 JSON 无效时停止，不猜测、不覆盖。写入前读取现有结构并保留未知字段；只记录本次会话中有证据的事实，不把推测写成项目记忆。环境变量只作兼容回退。

## 保存流程

1. 更新 `{TODOS_DIR}/待办事项概览.md`：仅修改本次确实完成、推进或阻塞的事项；新增断点时记录文件路径、必要行号、状态和下一步。
2. 更新 `{PROJECT_META_ROOT}/task-index.json`：同步活跃任务状态。完成或取消项从活跃列表移至 `task-archive.json`，去重追加，并按现有 schema 更新 `summary.archiveStats`；若 schema 不匹配则停止相关迁移并报告，不自行发明结构。
3. 新任务详情写入现有命名约定的 `tasks/task-{YYYYMMDD}-{seq}.json`；已有任务就原位更新，不重复创建。
4. 更新 `memory-map.json`：只写静态/半静态信息，如关键路径、feature flag、技术要点、已验证风险与快速启动；动态任务只留在 task 文件。路径使用项目变量或可迁移的项目相对路径。
5. 更新 `context.json`：写入 `lastAccessDate`，仅在有事实依据时更新 `progress`、`currentPhase`。

每个 JSON 写入后重新解析；发现并发修改或内容冲突时停止该文件写入并报告，禁止覆盖他人变更。此命令不提交 Git、不推送、不发布。

## 输出

```text
【会话保存报告】
- 项目：{项目}
- 已更新文件：{路径与字段摘要}
- 完成任务：{列表}
- 进行中/断点：{列表}
- 阻塞：{列表}
- JSON 验证：PASS/FAIL
- 未写入项：{原因}
- 建议下步：{下一动作}
```
