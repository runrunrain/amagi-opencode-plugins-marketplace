# 命名约定

## 任务简述(task-brief)命名

**格式**: kebab-case（小写字母，单词间用连字符）

### 推荐命名模式

| 任务类型 | 命名模式 | 示例 |
|---------|---------|------|
| 分析类 | analyze-{目标} | analyze-combat-system |
| 设计类 | design-{功能} | design-skill-api |
| 实现类 | implement-{功能} | implement-commander-skill |
| 修复类 | fix-{问题} | fix-memory-leak |
| 重构类 | refactor-{模块} | refactor-ai-module |
| 审核类 | review-{目标} | review-skill-code |
| 文档类 | doc-{主题} | doc-api-guide |
| 提交类 | commit-{功能} | commit-skill-system |
| 反思类 | reflect-{主题} | reflect-coding-pattern |

### 命名原则

1. **简洁明了**: 3-5个单词为佳
2. **动词开头**: 清晰表达任务类型
3. **具体明确**: 避免模糊词汇（如"update-something"）
4. **一致性**: 同类任务使用相同动词

### 反例

| 不推荐 | 原因 | 推荐 |
|-------|------|------|
| UpdateCode | 大写，不具体 | implement-skill-system |
| fix_bug | 下划线，不具体 | fix-skill-activation-bug |
| sometask | 无意义 | analyze-combat-logic |
| this-is-a-very-long-task-name-that-is-too-long | 过长 | refactor-ai-system |

## 标签(tags)命名

**格式**: kebab-case

### 常用标签

| 类别 | 标签示例 |
|------|---------|
| 任务类型 | code-exploration, architecture, implementation, review, documentation |
| 技术栈 | lua, python, godot, react |
| 模块 | combat-system, skill-system, ai-module |
| 优先级 | p0-critical, p1-high, p2-medium, p3-low |
| 状态 | wip, completed, blocked |

## 项目ID命名

**格式**: kebab-case

| 项目 | ID |
|------|-----|
| 战区AI | zhanzhai |
| Wuyana V2.0 | wuyana-v2 |
| Claude Code UI | claude-code-ui |

## 反思ID命名

**格式**: REF-{YYYYMMDD}-{HHmmss}

示例: `REF-20260107-103000`
