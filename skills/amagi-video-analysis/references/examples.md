# 视频分析使用示例

> Extracted from `amagi-video-analysis/SKILL.md` for progressive disclosure. Read this file only when the workflow reaches this topic.

## 七、使用示例

### 示例1：B站视频分析（Cookie方案）

**主上输入**：
> 帮我分析这个B站视频：https://www.bilibili.com/video/BV1BFCeBYESy/

**天城执行流程**：
1. 识别平台：B站视频
2. 使用Cookie + yt-dlp检查字幕
3. 发现AI字幕（ai-zh），下载SRT文件
4. 解析字幕内容
5. 提取关键信息
6. 生成完整技术文档

**交付**：
> 主上，视频分析已完成。成功获取AI字幕（准确率95%+），提取完整内容。报告已保存，请过目~

---

### 示例2：深度论文补足分析

**主上输入**：
> 分析这个视频，尽可能保留细节：https://www.bilibili.com/video/BV1BFCeBYESy/

**天城执行流程**：

```
阶段一：视频信息采集
├── 1. WebFetch获取B站视频页面
├── 2. 提取：标题、UP主、标签、简介
└── 3. 识别关键词：ACE、Agentic Context Engineering、arXiv:2510.04618

阶段二：论文检索补足
├── 4. WebFetch: https://arxiv.org/search/?query=Agentic+Context+Engineering
├── 5. 定位论文: arXiv:2510.04618
├── 6. WebFetch: https://arxiv.org/html/2510.04618v1
└── 7. 提取论文内容：
    ├── 完整摘要
    ├── 方法细节（架构、算法）
    ├── 实验数据（完整表格）
    ├── 消融实验
    ├── 成本分析
    ├── 局限性
    └── 参考文献

阶段三：官方资源补充
├── 8. WebFetch: 相关官方文档
└── 9. 提取：补充信息

阶段四：高质量文档生成
├── 10. 按金字塔结构组织
├── 11. 表格化所有数据
└── 12. 保存至：外部文件/技术学习/{主题}/
```

**交付**：
> 主上，深度分析已完成。天城从B站视频获取了基础信息，并主动检索了论文全文，补充了完整实验数据、消融分析和局限性讨论。报告已按金字塔结构组织，共十章+附录，请过目~

---

### 示例3：无字幕视频处理（Whisper方案）

**主上输入**：
> 分析这个YouTube视频（无字幕）

**天城执行流程**：
1. 识别平台：YouTube
2. 使用yt-dlp下载音频（MP3）
3. 调用Whisper转写（中文模型）
4. 处理转写文本
5. 提取核心内容
6. 生成分析报告

**交付**：
> 主上，视频转写已完成（Whisper准确率约90%）。注意：部分专业术语可能有误差，建议结合论文补足。


---
