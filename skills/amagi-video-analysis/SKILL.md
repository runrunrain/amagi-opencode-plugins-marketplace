---
name: amagi-video-analysis
description: |
  增强版视频分析技能。用户要求分析视频、总结 B站/YouTube/网页视频、提取字幕/音频内容、处理无字幕视频、生成视频学习笔记、视频内容提取、video analysis、transcribe video、summarize a talk/lecture 时应使用；支持 yt-dlp、字幕、Whisper 转写、论文/官方资料补足和高质量中文技术文档。不要用于纯文本文章总结、普通 PDF/电子书转换，或未提供视频/音频/可访问链接的任务。
version: 3.0
author: 天城
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# 视频内容分析技能（增强版 v3.0）

从视频中提取知识，支持多平台字幕提取、音频转写、主动检索论文/官方资料补足，并输出可复用的高质量中文文档。

## 版本与能力

| 版本 | 核心特性 |
|-----|---------|
| v1.0 | 基础视频分析、WebFetch 提取 |
| v2.0 | 论文检索补足、金字塔文档结构、高质量输出模板 |
| v3.0 | B站专项支持（yt-dlp + Cookie）、字幕文件处理、Whisper 音频转写 |

| 能力 | 说明 |
|-----|------|
| 多平台适配 | B站、YouTube、网页视频等平台差异化处理 |
| 字幕提取 | AI 字幕、CC 字幕、弹幕可用时优先使用 |
| 音频转写 | 无字幕时使用 Whisper 兜底 |
| 论文补足 | 涉及论文/技术框架/方法论时必须主动检索补全 |
| 高质量输出 | 金字塔结构、完整数据、表格/图表、可操作建议 |

## 工具与依赖

| 工具 | 用途 | 使用原则 |
|-----|------|---------|
| WebFetch | 获取普通网页内容 | 适合可直接访问的文章/页面 |
| mcp__web-reader__webReader | 增强网页读取 | WebFetch 失败或内容不完整时使用 |
| mcp__web-search-prime__webSearchPrime | 搜索补足 | 直接访问失败、论文/资料补足时使用 |
| `tool/video_subtitle_extractor.py` | 视频字幕/音频提取 | 视频链接优先路径；参数详见下方 |
| yt-dlp | 视频/字幕下载 | `pip install yt-dlp` |
| whisper | 音频转写 | `pip install openai-whisper`，仅无字幕时启用 |

`video_subtitle_extractor.py` 基本用法：

```bash
python tool/video_subtitle_extractor.py "<视频URL>" --cookie "<私有Cookie文件路径>"
python tool/video_subtitle_extractor.py "<视频URL>" --whisper -o "output.txt"
```

完整平台路由、yt-dlp 命令、重试策略和失败判定见 `references/tool-routing.md`。

### B站 Cookie 安全要求

B站 Cookie 文件必须由用户保存在插件仓库和插件安装目录之外，例如个人配置目录或临时工作目录。插件包不提供、复制或提交真实浏览器 Cookie；需要登录态时，通过 `--cookie` 显式传入本机私有 Netscape cookie 文件路径。

## 核心工作流

### 1. 初始评估

1. 接收视频/音频链接与输出要求。
2. 识别平台、可访问性、字幕/转写可能性与风险。
3. 选择提取路径：平台字幕/yt-dlp -> Whisper -> WebFetch/web-reader -> 搜索补足。
4. 建立分析进度清单，记录每个工具的成功/失败原因。

### 2. 内容提取

| 平台 | 首选策略 | 兜底策略 |
|-----|---------|---------|
| B站 | yt-dlp + Cookie 下载 AI/CC 字幕 | 音频提取 + Whisper |
| YouTube | yt-dlp 下载字幕 | Whisper 转写 |
| 其他网页视频 | WebFetch / web-reader | 搜索相关资料并标注局限 |

每个工具最多重试 2 次，切换工具前记录失败原因。最终报告必须说明提取过程、字幕/转写来源和可信度。

### 3. 内容分析

- 识别核心主题、主要话题、关键概念和技术细节。
- 提取结构化信息（框架、三大支柱、流程、实验数据、实践原则）。
- 保留事实出处：视频时间线、字幕片段、外部资料链接。
- 对缺失或不确定内容显式标注，不得编造。

### 4. 论文检索与资料补足

视频涉及学术研究、技术框架、方法论、模型/系统设计时必须执行补足。

| 来源优先级 | 适用场景 |
|-----------|---------|
| arXiv HTML / 官方论文页 | 有明确论文编号或标题 |
| arXiv 搜索 | 只有关键词或方法名 |
| 官方文档/博客 | 公司技术发布、框架说明 |
| GitHub / 配套代码 | 需要实现细节或复现实验 |

补足内容至少包括：官方摘要、方法细节、实验数据、消融实验（如有）、成本/延迟、局限性、相关工作与参考资源。

### 5. 报告结构化

轻量摘要可使用必备章节；深度技术文档必须读取 `templates/analysis-report-template.md`。

| 章节 | 要求 |
|-----|------|
| 核心结论 | 先给一句话结论，再给 3-5 个关键价值点 |
| 背景与动机 | 说明问题、重要性和上下文 |
| 核心方法/架构 | 技术细节、流程、数据结构、图表 |
| 实验/数据 | 完整表格，禁止只摘录有利数据 |
| 局限与挑战 | 作者承认的限制和实践风险 |
| 实践建议 | 可操作行动指南 |
| 参考资源 | 视频、论文、代码、官方文档链接 |

完整文档质量标准、文件命名、可选整理、错误处理和模范参考见 `references/output-quality-rules.md`。

## 输出保存

报告必须保存到任务要求的输出 artifact 路径。若当前环境已安装并配置 `amagi-file-organizer`，可在报告生成后作为可选整理步骤；未配置时不得假定该依赖存在或声称已自动整理。

文件名根据内容核心主题命名，去除 “B站-”“YouTube-” 等来源前缀，使用中文冒号分隔主副标题。

## 常见错误处理

| 错误 | 处理 |
|-----|------|
| yt-dlp 失败 | 检查 Cookie/字幕列表；失败则 Whisper |
| 字幕为空 | 切换音频转写 |
| WebFetch 403 | 切换 web-reader 或浏览器/搜索补足 |
| Whisper 失败 | 尝试更大模型或报告音频质量限制 |

## 使用示例与参考

| 资源 | 用途 |
|-----|------|
| `references/tool-routing.md` | 平台路由、yt-dlp/Whisper 命令、失败切换 |
| `templates/analysis-report-template.md` | 深度分析报告模板 |
| `references/examples.md` | B站 Cookie、论文补足、无字幕处理示例 |
| `references/output-quality-rules.md` | 文档质量、保存整理、错误回退和参考标准 |
