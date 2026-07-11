# Task Contract

Leader 每次分派至少明确：

- `objective`：唯一、可交付的结果。
- `scope`：允许读取和修改的边界。
- `inputs`：必要上下文、上游文件或证据路径。
- `acceptance`：可执行的验收标准。
- `output`：回复或落盘产物的格式与位置。
- `constraints`：禁止事项、权限与兼容性要求。

普通任务使用上述最小契约。跨阶段或高风险任务再增加 `task_id`、`phase`、`required_artifacts`、回滚要求和独立审核，不为简单任务制造状态文件。

SubAgent 不得再调用其他 Agent；发现范围外依赖时返回 Leader 决策。
