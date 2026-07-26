# 视频分析工具选择策略

> Extracted from `amagi-video-analysis/SKILL.md` for progressive disclosure.

### 2.4 工具选择策略

```
视频分析任务
    │
    ├─ B站/YouTube视频
    │   └─ 使用 video_subtitle_extractor.py
    │       ├─ 有字幕 → 直接提取
    │       └─ 无字幕 → --whisper 转写
    │
    ├─ 论文检索
    │   └─ 使用 WebFetch
    │       ├─ arXiv HTML: https://arxiv.org/html/{id}v1
    │       └─ arXiv 搜索: https://arxiv.org/search/?query=
    │
    └─ 其他网页
        ├─ 首选: WebFetch
        ├─ 备选: mcp__web-reader__webReader
        └─ 最后: mcp__web-search-prime__webSearchPrime
```
