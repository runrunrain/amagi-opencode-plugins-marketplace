# 项目知识路径规范化规则

> Extracted from `project-knowledge-builder/SKILL.md` for progressive disclosure.

## 路径规范化规则（强制）

所有知识库输出文件中的文件路径必须遵循以下规则。违反此规则会导致知识库在不同机器上无法加载。

### 禁止

- 绝对路径（如 `D:\workspace\project\src\`、`C:\Users\user\`、`/home/user/project/`、`/Users/user/project/`）
- 包含盘符的 Windows 路径（如 `E:\workpace\...`）
- 包含用户名或机器名的路径（环境相关信息）

### 必须使用相对路径

**项目源码引用**：使用相对于项目代码根目录（`PROJECT_CODE_PATH`）的路径

```
正确：_res_tables/01_Creature/
正确：src/modules/auth/
错误：D:\workspace\project\_res_tables\01_Creature\
错误：/home/user/project/src/modules/auth/
```

**知识库内部引用**：使用相对于知识库根目录的路径

```
正确：knowledge-base/domains/config-tables/
正确：domains/auth-system/index.json
错误：/home/user/.amagi/projects/my-project/knowledge-base/domains/config-tables/
错误：D:\workpace\amagi\projects\my-project\knowledge-base\domains\
```

**Eval 测试路径**：使用占位符变量，不写入实际机器路径

```
正确：{EVAL_CODE_PATH}/src/
正确：{EVAL_OUTPUT_PATH}/knowledge-base/
错误：D:\workpace-test\project\src\
```

### 路径分隔符

统一使用正斜杠 `/`，不使用反斜杠 `\`。

### 构建完成后的验证命令

```
Grep: "[A-Z]:\\" in knowledge-base/  → 应返回 0 结果
Grep: "/home/|/Users/" in knowledge-base/  → 应返回 0 结果
```

### 受影响的字段

以下 JSON 字段的值必须遵守相对路径规则：
- `context.json` → `projectPath`（允许绝对路径，此字段特例）
- `memory-map.json` → `sections.2_paths` 中除 `projectRoot` 外的所有路径字段
- `domains/index.json` → `domains[].path`、`domains[].modules[]`
- `domain/index.json` → `keyFiles`、`entryPoints`、`evidenceRefs` 中的路径
- `internals.json` → `keyFiles[].path`
- `chains/*.json` → `corePath`、`evidenceRefs` 中的路径引用
- `relations.json` → `nodes[].evidenceRefs`、`edges[].evidenceRefs`

**例外**：`context.json` 的 `projectPath` 字段允许且必须使用绝对路径（用于运行时定位代码仓库）。
- 必要时分批处理
- 建议 `deep` 策略 + 迭代深化
