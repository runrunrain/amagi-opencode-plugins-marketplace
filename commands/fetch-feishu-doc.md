---
description: "获取指定飞书文档并保存为离线 Markdown，下载资源、展开同步块、导出表格 CSV 并验证完整性"
agent: amagi-leader
---


# 获取飞书文档离线副本

$ARGUMENTS

## 参数与前置检查

必须提供文档 URL/token 与本地保存根目录；路径含空格时按参数边界解析，不用不安全的 shell 单词拆分。输出目录按文档标题创建；同名目录存在时进入增量补全模式，先建立资源清单，不覆盖用户编辑或 CSV 原件。

本命令只读飞书源文档。执行前必须读取与已安装 CLI 同版本的技能说明：

```bash
lark-cli skills read lark-doc
lark-cli skills read lark-doc references/lark-doc-fetch.md
```

遇到 wiki、sheet/base、whiteboard 或认证问题时，分别读取 `lark-wiki`、`lark-sheets`、`lark-base`、`lark-whiteboard`、`lark-shared` 的版本匹配技能。确认 `lark-cli --version` 和认证状态；未认证/权限不足时按 skill 流程停止或引导认证，不猜测 API。

## 读取正文与结构

使用当前 v2 shortcut 探测 outline，再获取 Markdown 正文；`--api-version v2` 可保留作兼容显式参数：

```bash
lark-cli docs +fetch --api-version v2 --doc "$doc_ref" --scope outline --max-depth 3 --format pretty
lark-cli docs +fetch --api-version v2 --doc "$doc_ref" --scope full --doc-format markdown --detail simple --format json
```

保存 JSON 响应中的正文，不把协议包装写入 Markdown。需要 block id 时改用 XML `with-ids/full`，因为 Markdown 只适合 `detail=simple`。大文档按 outline 使用 `section/range` 分段，并核对首尾与章节数。

提取并建立待处理清单：图片、附件、`synced_reference`、sheet/bitable、whiteboard，以及无权限节点；保留 token 与正文位置映射但不在最终报告暴露敏感认证信息。

## 同步块与资源

- `synced_reference`：按 `src-token/src-block-id` 读取源范围，递归下钻但做 visited-token/block 去重和深度保护；把真实内容内联到原位置，不能留下空标签。
- 图片：有有效临时 URL 时下载；仅 token 时使用 `docs +media-download`，跨源权限问题按当前 lark-doc/lark-shared 指引尝试 `+media-preview`。按阅读顺序命名到 `images/`，每次验证 HTTP/文件类型和非零大小。
- 附件：用 `docs +media-download --token ... --output ...` 保存到 `attachments/`，保留安全化后的原始文件名与扩展名，防止 `../` 路径穿越。
- whiteboard：读取 `lark-whiteboard` 后用 `whiteboard +query --output_as image --output ...` 导出预览，或在无权限时写含源链接和错误码的明确说明，不留空目录。

临时 URL 不写入最终 Markdown；本地引用一律使用相对路径。下载失败不能用空文件占位。

## 电子表格与 CSV 真相源

wiki sheet 先通过 `lark-wiki` 解析 `obj_token`；正文 `<sheet>` 切到 `lark-sheets`：

```bash
lark-cli sheets +workbook-info --spreadsheet-token "$sheet_token" --format json
lark-cli sheets +workbook-export --spreadsheet-token "$sheet_token" --file-extension csv \
  --sheet-id "$sheet_id" --output-path "$csv_path"
```

每个子表原样保存到 `<文档名>.csv-data/<安全子表名>.csv`，视为不可改的原始数据真相源；正文标注相对 CSV 路径。导出数必须与可访问子表数一致。读取 CSV 使用 RFC 4180 与 `utf-8-sig`，不得用逐行字符串切割；不要无证据地全局替换双引号，只有解析后确认某字段存在导出转义异常时才在派生 Markdown 中修复，CSV 原件不动。

## 表格布局重构

按空行和合并语义切 block，再分类，避免把版面表转成空壳宽表：

| 类型 | 判据 | Markdown |
|---|---|---|
| 元数据 | 作者、更新时间等键值 | 小表或 details |
| 层级布局 | 各行首个非空列索引变化 | 按列索引生成嵌套列表 |
| 数据表 | ≥3 行、从第 0 列起、短表头≥3；数据行平均非空≥2.5 且有效区域填充率≥40% | 裁全空列后的表格 |
| 段落 | 单列长文本 | 普通段落 |
| 稀疏宽表 | 填充率<40%或列多值少 | 键值/分组列表 |

分类不确定时优先可读列表并保留 CSV 溯源。重构必须由本次执行者用独立统计复核，不能以任何 Agent 自报完成代替证据。

## 生成与验证

输出目录至少包含正文 `README.md`（或同名 `.md`）、存在资源时的 `images/`、`attachments/`，以及同级 `.csv-data/`。正文顶部记录标题、源引用和获取日期；同步块内联，图片/附件/CSV 全为相对路径。

验证并报告：

1. 所有本地 Markdown 引用都存在且位于输出根内；不存在 0 字节文件。
2. 图片引用数/文件数和内容类型一致，无残留临时认证 URL。
3. 同步块总数、成功展开数、循环/权限失败数一致，无空标签。
4. 可访问 sheet 数等于 CSV 数；CSV 可由 RFC 4180 解析，原件未被重写。
5. Markdown 不含连续空单元格表格行；抽查层级、稀疏表和长文本语义。

```text
【飞书文档离线报告】
- 来源/本地路径：{source -> path}
- 正文章节：{count}
- 图片/附件：{success/failure}
- 同步块：{expanded/failed}
- 表格：{sheets/csv/reconstructed}
- 画板/无权限节点：{results}
- 完整性验证：{checks + PASS/FAIL}
- 未覆盖风险：{明确列表}
```
