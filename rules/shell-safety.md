---
description: Shell 路径与变量使用必须跨平台安全
globs:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.py"
---

# Shell 安全短规则

禁止依赖 Shell `$VAR_NAME` 展开；使用绝对路径或 Python 读取环境变量。
路径包含空格时必须用双引号包裹，路径分隔符统一使用 `/`。
避免用 shell 做文件读写编辑；优先使用专用工具。
Canonical source: `resources/core/common/tool-usage-rules.md`。
