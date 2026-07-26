# Metadata Schema规范

## 通用Schema

所有Agent的metadata.json都包含以下基础字段：

```json
{
  "taskId": "string (必须)",
  "timestamp": "ISO 8601格式 (必须)",
  "agent": "agent名称 (必须)",
  "projectId": "项目ID (必须)",
  "taskBrief": "任务简述 (必须)",
  "status": "completed|in-progress|failed (必须)",
  "tags": ["标签数组 (可选)"],
  "relatedFiles": ["相关文件数组 (可选)"],
  "nextSteps": {
    "suggestedAgent": "下一个Agent (可选)",
    "suggestedAction": "建议行动 (可选)"
  }
}
```

## Agent特定字段

### 白泽（explorer）
```json
{
  "discoveredFiles": ["发现的关键文件"],
  "dependencyGraph": "依赖关系描述"
}
```

### 伏羲（architect）
```json
{
  "designVersion": "v1.0",
  "recommendedSolution": "推荐方案",
  "alternatives": ["备选方案"]
}
```

### 鲁班（coder）
```json
{
  "changedFiles": ["变更文件列表"],
  "testResults": {
    "compilation": "passed|failed",
    "functionality": "passed|failed",
    "boundary": "passed|failed",
    "performance": "passed|failed"
  }
}
```

### 谛听（reviewer）
```json
{
  "reviewResult": "approved|rejected|conditional",
  "reviewRound": 1,
  "totalIssues": 5,
  "criticalIssues": 1,
  "relatedCoderTask": "20260107-160000-skill-system"
}
```

### 太白金星（manager）
```json
{
  "gitOperation": "commit|push|merge|revert",
  "commitHash": "abc123def456",
  "branch": "feature/skill-system",
  "changedFiles": 5
}
```

### 菩提祖师（thinker）
```json
{
  "reflectionId": "REF-20260107-103000",
  "triggerSource": "触发Agent",
  "triggerScenario": "触发场景",
  "priority": "P0|P1|P2",
  "butterflyRounds": 5,
  "extractedInsights": [
    {
      "id": "INS-001",
      "category": "分类",
      "value": "高/中/低"
    }
  ],
  "deltaUpdates": [
    {
      "action": "add|update|deprecate",
      "target": "目标文件",
      "section": "章节"
    }
  ]
}
```

### 孙悟空（tester）
```json
{
  "testStrategy": "测试策略描述",
  "coverageTarget": "80%",
  "testSuites": ["单元测试", "集成测试", "E2E测试"],
  "testResults": {
    "total": 50,
    "passed": 48,
    "failed": 2,
    "skipped": 0
  }
}
```

### 文曲星（researcher）
```json
{
  "researchTopic": "调研主题",
  "sourcesConsulted": ["来源列表"],
  "alternatives": ["备选方案列表"],
  "recommendation": "推荐方案"
}
```
