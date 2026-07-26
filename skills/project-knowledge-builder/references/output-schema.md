# 输出结构参考

每个输出文件的精确 JSON 结构定义。这些结构与 Amagi 框架的 projects-memory 格式匹配。
标记 (必填) 的字段必须存在；标记 (可选) 的字段在数据不可用时可省略。

**v2 新增内容**：
- `knowledge-base/domains/index.json`：领域注册表（domain 模式输出）
- `knowledge-base/domains/{domain-id}/index.json`：单领域索引
- `knowledge-base/domains/{domain-id}/specs.json`：领域特定规范
- `knowledge-base/domains/{domain-id}/architecture.json`：领域架构设计
- `knowledge-base/domains/{domain-id}/api-reference.json`：领域 API 参考
- `knowledge-base/domains/{domain-id}/internals.json`：领域内部实现细节
- `task-archive.json`：已完成/已取消任务归档（task-index.json 分离）
- `task-index.json`：新增 `archiveStats` 字段，tasks 数组仅含活跃任务

## context.json

```json
{
  "version": "11.0",                          // (必填) 结构版本
  "projectId": "my-project",                  // (必填) 与注册表键匹配
  "projectName": "My Project - 简短描述",      // (必填)
  "description": "一段描述",                    // (必填)
  "projectPath": "/absolute/path/to/code",    // (必填) 此字段唯一允许绝对路径（用于运行时定位代码）
  "status": "active",                         // (必填) active|paused|archived
  "createdDate": "2026-03-16",               // (必填) ISO 日期
  "lastAccessDate": "2026-03-16",            // (必填) ISO 日期
  "techStack": {                              // (必填)
    "language": "C#",                          // 单语言项目使用字符串
    "languages": {                             // (可选) 多语言项目使用此字段替代 language
      "Python": "35%",
      "TypeScript": "30%",
      "Markdown": "25%"
    },
    "framework": ".NET 8.0",
    "ui": "WPF (AvalonDock)",                 // (可选)
    "additional_key": "描述"                   // 按需添加相关类别
  },
  "components": {                             // (必填) 项目核心组件，使用 object map 格式
    "ComponentName": {
      "type": "main-application|library|tool|launcher|test-tool|build-tool|wrapper",
      "description": "该组件的功能描述",
      "executable": "path/if/applicable"       // (可选)
    }
  },
  "coreDlls": {                               // (可选) 适用于编译型项目
    "Library.dll": "用途描述"
  },
  "dataFormats": {                            // (可选) 项目处理的数据格式
    "primary": ".ext (描述)",
    "source": ".ext (描述)"
  },
  "knowledgeSystem": {                        // (必填)
    "knowledgeBasePath": "knowledge-base/",
    "tacticalBookPath": "tactical-book/",
    "errorBookPath": "error-book/"
  },
  "relatedProjects": [],                      // (可选) 检测到的关联项目
  "tags": ["tag1", "tag2"]                    // (必填) 5-10 个描述性标签
}
```

## memory-map.json

section 键名必须使用编号前缀格式（如 `1_basicInfo`），每个 section 必须包含 `title` 和 `content` 嵌套结构。

**重要**：memory-map.json 的基础版本包含 7 个静态/半静态 sections（1-3, 6-9）。
对于复杂项目，允许增加 `4_firstRead` 和 `5_decisionTree` 作为导航增强层。
动态任务数据（里程碑、开发计划、变更日志）存储在 `task-index.json` 和 `tasks/` 目录中，不写入 memory-map.json。

```json
{
  "version": "11.1",                          // (必填)
  "projectId": "my-project",                  // (必填)
  "lastUpdated": "2026-03-16",               // (必填)
  "sections": {
    "1_basicInfo": {
      "title": "项目身份",
      "content": {
        "identity": "项目名称 - 一行身份描述",
        "purpose": "项目做什么",
        "scope": "覆盖范围",
        "audience": "目标用户",
        "organization": "团队或公司"            // (可选)
      }
    },
    "2_paths": {
      "title": "关键路径",
      "content": {
        "projectRoot": "/absolute/path",          // 允许绝对路径，与 context.json.projectPath 一致
        "mainExecutable": "relative/path 或 N/A", // 相对于 projectRoot 的相对路径
        "entryPoint": "src/main.ts 或 Program.cs 等", // 相对路径
        "config": "主配置文件路径",                // 相对路径，如 config/settings.json
        "buildOutput": "bin/ 或 dist/ 等"         // 相对路径
      }
    },
    "3_systemStatus": {
      "title": "系统状态",
      "content": {
        "version": "检测到的版本或 unknown",
        "platform": "Windows|Linux|macOS|Cross-platform",
        "runtime": ".NET 8.0 或 Node 20 等",
        "status": "production-ready|development|prototype",
        "lastVerified": "2026-03-16",
        "featureFlags": {}                      // (可选) 功能开关状态（半静态）
      }
    },
    "6_technicalPoints": {
      "title": "技术要点",
      "content": {
        "architecture": "简要架构描述",
        "dataFlow": "输入 -> 处理 -> 输出",
        "keyTechnologies": ["Tech1 - 用途", "Tech2 - 用途"],
        "designPatterns": ["Pattern1", "Pattern2"]
      }
    },
    "7_insights": {
      "title": "洞察与风险",
      "content": {
        "architecturalInsights": ["洞察 1", "洞察 2"],
        "detectedPatterns": ["模式 1", "模式 2"],
        "potentialRisks": ["风险 1"],
        "recommendations": ["建议 1"]
      }
    },
    "8_quickStart": {
      "title": "快速启动",
      "content": {
        "buildCommand": "dotnet build 或 npm run build 等",
        "runCommand": "dotnet run 或 npm start 等",
        "testCommand": "dotnet test 或 npm test 等",
        "prerequisites": ["前置条件 1", "前置条件 2"],
        "setupSteps": ["步骤 1", "步骤 2"],
        "debugTools": {}                        // (可选) 调试工具配置（半静态）
      }
    },
    "9_collaboration": {
      "title": "协作规范",
      "content": {
        "namingConventions": "PascalCase/camelCase/snake_case",
        "codeStyle": "简要风格描述",
        "branchingStrategy": "检测到的策略或 unknown",
        "testingApproach": "检测到的测试框架和模式"
      }
    }
  }
}
```

## task-index.json
项目任务索引文件。**规范上的新建目标**是只存储活跃任务（status: in-progress/blocked/planned）的轻量级摘要。
**本 Skill 首次构建时不创建此文件**；Agent 在会话中写入任务记录时由 save-session 命令负责创建和维护。

### 规范与兼容说明

- 新构建的 task-index.json 应偏向 **active-only**。
- 已完成（completed）和已取消（cancelled）的任务，规范上应迁移至 `task-archive.json`。
- 但在 **incremental** 模式下，如果项目里已经存在承载证据用途的 completed/cancelled 条目，**必须保留并兼容消费**，不要为了追求理想格式而自动清空、重写或伪造迁移。
- 若现有 task-index.json 已包含 `evidencePolicy`、`relatedDomains`、`relatedChains` 等人工维护字段，只允许补充或修正，不允许覆盖成空白模板。

```json
{
  "version": "1.0",
  "projectId": "my-project",
  "lastUpdated": "2026-03-16",
  "summary": {
    "totalActiveTasks": 0,                      // 活跃任务总数（in-progress + blocked + planned）
    "inProgress": 0,
    "blocked": 0,
    "planned": 0,
    "archiveStats": {                           // 归档任务快速统计（无需加载 task-archive.json）
      "totalCompleted": 0,
      "totalCancelled": 0,
      "dateRange": {
        "earliest": null,                       // 最早归档任务日期（ISO 日期或 null）
        "latest": null                          // 最新归档任务日期（ISO 日期或 null）
      }
    }
  },
  "currentPhase": {
    "name": "当前开发阶段",
    "description": "简要描述",
    "startDate": "2026-03-16"
  },
  "tasks": [                                    // 仅包含活跃任务（in-progress|blocked|planned）
    {
      "id": "task-20260316-001",
      "title": "任务标题",
      "date": "2026-03-16",
      "status": "in-progress",                  // in-progress|blocked|planned（不含 completed/cancelled）
      "type": "feature",                        // feature|bugfix|optimization|test|docs
      "priority": "P1",                         // P0|P1|P2
      "filePath": "tasks/task-20260316-001.json",
      "summary": "不超过100字的一句话摘要"
    }
  ],
  "recentChangelog": [                          // 上限 20 条，超出时裁剪最旧条目
    {
      "date": "2026-03-16",
      "summary": "初始化任务索引",
      "type": "feat"                            // feat|fix|refactor|docs|chore|test
    }
  ]
}
```

## tasks/{task-id}.json

单个任务详情文件，按需加载。文件命名格式：`task-{YYYYMMDD}-{seq}.json`。**本 Skill 首次构建时仅创建 `tasks/` 空目录，不写入任何任务文件**。

```json
{
  "id": "task-20260316-001",
  "title": "任务标题",
  "type": "feature",
  "status": "completed",
  "priority": "P1",
  "date": "2026-03-16",
  "completedDate": "2026-03-16",               // (可选) 仅 status=completed 时填写
  "description": "详细描述",
  "tags": ["backend", "api"],
  "changes": [
    {
      "file": "path/to/file.py",
      "description": "修改说明"
    }
  ],
  "testResults": {                              // (可选)
    "totalTests": 10,
    "passed": 10,
    "failed": 0
  },
  "insights": ["洞察1", "洞察2"],              // (可选)
  "issues": [                                   // (可选)
    {
      "issueId": "P1-001",
      "description": "问题描述",
      "priority": "P1",
      "status": "待修复"
    }
  ],
  "commits": ["abc1234"],                       // (可选) Git commit hash
  "relatedMilestone": "milestone-001",          // (可选)
  "verification": "PASS",                       // (可选) 验证结果
  "references": ["path/to/doc"]                 // (可选) 相关文档
}
```

## knowledge-base/glossary.json

术语中心，集中定义跨文件重复出现的核心概念，消除知识库内的信息冗余。其他文件通过 `"$ref": "glossary#termId"` 引用此处定义，避免重复描述。

**生成时机**：阶段 6 输出生成时，从 explorer 报告中提取在多个文件中重复出现的概念（如技术栈、核心框架、关键设计模式），集中定义到 glossary.json。

**判断标准**：一个概念在 2 个以上输出文件中需要描述时，应提取为术语。

```json
{
  "version": "1.1",
  "description": "项目术语中心 - 消除跨文件重复定义",
  "lastUpdated": "2026-03-16",
  "usage": "其他文件通过 $ref: glossary#termId 引用，避免重复描述",
  "navigation": {                              // (可选) 复杂项目推荐
    "purpose": "术语如何作为 first-hop 使用",
    "highTrafficTerms": ["term-id"],
    "hopRules": ["什么时候先读哪个术语"]
  },
  "terms": {
    "term-id": {                                 // (必填) kebab-case 唯一标识
      "id": "term-id",                           // (必填) 与键名一致
      "term": "术语名称",                         // (必填) 人类可读名称
      "definition": "术语的完整定义",              // (必填) 一段清晰的定义
      "aliases": ["别名1", "别名2"],              // (必填) 该术语的常见别名，支持搜索匹配
      "category": "architecture",                 // (必填) architecture|infrastructure|engine-core|build-system|data-architecture|design-pattern|domain
      "relatedFiles": ["file1.json", "file2.json"], // (必填) 引用此术语的文件列表
      "firstHop": "可选：该术语适合作为哪类问题的首跳入口",
      "relatedChains": ["chains/xxx.json"],      // (可选)
      "relatedDomains": ["domains/xxx/index.json"], // (可选)
      "hubLevel": "core|primary|secondary",      // (可选)
      "seeAlso": ["other-term-id"],             // (可选)
      "evidenceRefs": ["file.json#section"]     // (可选)
    }
  }
}
```

**注意**：每个术语除必填字段外，可根据术语性质添加额外描述字段（如 `constraints`、`api`、`layers` 等），但 `id/term/definition/aliases/category/relatedFiles` 六个字段必须存在。

## knowledge-base/index.json

```json
{
  "version": "11.1",
  "description": "项目知识库索引",
  "lastUpdated": "2026-03-16",
  "glossary": {                                  // (可选) 存在 glossary.json 时填写
    "path": "glossary.json",
    "description": "核心术语中心（N 个术语），消除跨文件重复定义",
    "priority": "high",
    "autoLoad": true,
    "summary": "术语与概念首跳入口",
    "keyQuestions": ["问题1？", "问题2？"]
  },
  "entries": [
    {
      "id": "development-specs",
      "title": "开发规格",
      "path": "development-specs.json",
      "priority": "high",
      "autoLoad": true,
      "description": "构建系统、依赖、模块结构、平台",
      "summary": "1-2句概括核心价值，Agent读此即可判断是否需要深入",  // (必填)
      "keyQuestions": [                          // (必填) 该文件能回答的 Top3 问题
        "问题1？（对应节名）",
        "问题2？（对应节名）",
        "问题3？（对应节名）"
      ]
    },
    {
      "id": "conventions",
      "title": "编码规范",
      "path": "conventions.json",
      "priority": "high",
      "autoLoad": true,
      "description": "命名规范、文件组织、错误处理、测试",
      "summary": "编码前必读的规范文档",
      "keyQuestions": ["问题1？", "问题2？", "问题3？"]
    },
    {
      "id": "architecture",
      "title": "架构",
      "path": "architecture.json",
      "priority": "high",
      "autoLoad": true,
      "description": "系统层次、模块依赖、设计模式、数据流",
      "summary": "理解系统全景的入口文档",
      "keyQuestions": ["问题1？", "问题2？", "问题3？"]
    },
    {
      "id": "api-reference",
      "title": "API 参考",
      "path": "api-reference.json",
      "priority": "medium",
      "autoLoad": false,
      "description": "外部 API、CLI 命令、内部模块接口",
      "summary": "接口查询手册，按需查阅",
      "keyQuestions": ["问题1？", "问题2？", "问题3？"]
    }
  ],
  "recommendedFirstHop": [                      // (可选) 复杂项目推荐
    {"scenario": "问题场景", "path": "glossary.json 或 domains/index.json"}
  ],
  "entryByQuestion": [                          // (可选) 复杂项目推荐
    {
      "question": "问题类型描述",
      "firstHop": "domains/index.json#domain-id 或 glossary.json#term-id",
      "then": ["chains/xxx.json", "architecture.json"]
    }
  ],
  "entryByLayer": [                             // (可选)
    {"layer": "L1 导航层", "paths": ["index.json", "domains/index.json"]}
  ],
  "entryByChain": [                             // (可选)
    {"id": "main-chain", "path": "chains/main-chain.json", "primaryHub": "glossary#term-id"}
  ],
  "hubNodes": ["glossary#term-id", "relations.json#centralHubs"], // (可选)
  "nextHopRules": ["首跳之后如何继续导航的规则"], // (可选)
  "moduleRelations": {                           // (可选) 知识库模块间引用关系
    "description": "知识库模块间引用关系图",
    "relations": [
      {"from": "文件A", "to": "文件B", "type": "引用关系描述"}
    ]
  },
  "summaryFields": ["summary", "keyQuestions", "description"],  // (可选) 声明摘要层字段
  "detailFields": ["path"]                       // (可选) 声明指向详情层的字段
}
```

## knowledge-base/relations.json

复杂项目推荐生成，用于表达跨领域共享概念、桥接机制、枢纽节点和依赖边。

```json
{
  "version": "1.0",
  "lastUpdated": "2026-03-19",
  "description": "知识关系图谱骨架",
  "evidencePolicy": {                           // (可选)
    "purpose": "关键节点和边如何挂接证据",
    "preferredEvidence": ["domains/*/internals.json", "chains/*.json"]
  },
  "nodes": [
    {
      "id": "node-id",
      "type": "concept|domain|table-group|runtime-object|mechanism|task-evidence",
      "name": "节点名称",
      "path": "glossary.json#term-id 或 domains/domain-id/index.json",
      "summary": "节点作用",
      "evidenceRefs": ["file.json#section"]
    }
  ],
  "edges": [
    {
      "from": "node-a",
      "to": "node-b",
      "type": "defines|mapsTo|drives|contains|dependsOn|consumes|expandsTo|verifiedBy",
      "summary": "关系说明",
      "confidence": "high|medium|low",
      "evidenceRefs": ["file.json#section"]
    }
  ],
  "views": [
    {
      "id": "view-id",
      "description": "某个阅读视角",
      "focusNodes": ["node-a", "node-b"]
    }
  ],
  "centralHubs": ["node-a", "node-b"]
}
```

## knowledge-base/chains/index.json

复杂项目推荐生成，用于集中登记主链路。

```json
{
  "version": "1.0",
  "lastUpdated": "2026-03-19",
  "description": "主链路注册表",
  "chains": [
    {
      "id": "chain-id",
      "title": "链路名称",
      "path": "chain-id.json",
      "goal": "这条链路解决什么问题",
      "primaryHub": "glossary#term-id 或某领域路径",
      "relatedDomains": ["../domains/domain-id/index.json"]
    }
  ],
  "startQuestions": ["问题1？", "问题2？"],
  "entryRules": ["遇到什么问题先走哪条链"],
  "crossLinks": [
    {"from": "chain-a", "to": "chain-b", "reason": "跳转原因"}
  ]
}
```

## knowledge-base/chains/{chain-id}.json

```json
{
  "id": "chain-id",
  "title": "链路名称",
  "goal": "这条链路用于定位什么问题",
  "entryQuestions": ["问题1？", "问题2？"],
  "corePath": ["glossary.json#term-id", "domains/domain-id/index.json"],
  "transitionPoints": [
    {
      "from": "上游概念或文件",
      "to": "下游概念或文件",
      "mechanism": "转换或桥接机制"
    }
  ],
  "relatedDomains": ["../domains/domain-id/index.json"],
  "upstreamRefs": ["glossary.json#term-id"],
  "downstreamRefs": ["other-chain.json"],
  "validationChecks": ["如何验证这条链路"],
  "evidenceRefs": ["file.json#section"],
  "verifiedFacts": ["已验证事实"],
  "nextHop": ["下一步阅读建议"]
}
```

## knowledge-base/development-specs.json

```json
{
  "version": "11.0",
  "description": "项目开发规格",
  "lastUpdated": "2026-03-16",
  "projectInfo": {
    "name": "ProjectName",
    "version": "检测到的版本",
    "framework": "框架名称",
    "primaryLanguage": "语言",
    "languages": {                             // (可选) 多语言项目
      "Python": "35%",
      "TypeScript": "30%"
    },
    "architecture": "架构风格"
  },
  "specs": {
    "buildSystem": {
      "framework": "构建框架",
      "buildTool": "构建命令",
      "outputType": "Executable|Library|Web App 等",
      "supportedPlatforms": ["Platform1"]
    },
    "dependencies": {
      "category1": {
        "package-name": "用途描述"
      }
    },
    "modules": {
      "ModuleName": {
        "path": "relative/path",                 // 必须为相对路径（相对于 projectRoot），如 src/auth/ 或 _res_tables/
        "purpose": "该模块的功能",
        "fileCount": 42,
        "primaryExtension": ".cs"
      }
    },
    "monorepo": {                              // (可选) 仅 monorepo 项目
      "tool": "lerna|pnpm-workspace|nx|turborepo",
      "packages": {
        "package-name": {
          "path": "packages/package-name",
          "dependsOn": ["other-package"]
        }
      }
    }
  }
}
```

## knowledge-base/conventions.json

conventions 对象应尽可能覆盖多个类别。核心类别（naming、fileOrganization、errorHandling、testing、documentation、logging）之外，还应检测：configuration、languageFeatures、dataPatterns、domAndUiPatterns、asyncPatterns、commentStyle、idGeneration 等。目标是 10+ 个非空类别。对不适用于当前项目类型的类别，省略并在 `omittedCategories` 中简要说明原因。

```json
{
  "version": "11.0",
  "description": "项目编码规范",
  "lastUpdated": "2026-03-16",
  "conventions": {
    "naming": {
      "classes": "PascalCase",
      "methods": "PascalCase|camelCase",
      "variables": "camelCase|snake_case",
      "files": "PascalCase|kebab-case",
      "directories": "PascalCase|lowercase"
    },
    "fileOrganization": {
      "pattern": "文件组织方式描述",
      "examples": ["src/controllers/ 存放 API 处理器", "lib/ 存放共享代码"]
    },
    "errorHandling": {
      "strategy": "try-catch|Result type|error returns",
      "patterns": ["观察到的模式描述"]
    },
    "testing": {
      "framework": "检测到的测试框架",
      "location": "tests/ 或 __tests__/ 或 *.test.ts 等",
      "namingPattern": "测试命名规范",
      "coverage": "估计覆盖率水平: high|medium|low|unknown"
    },
    "documentation": {
      "docComments": "XML docs|JSDoc|docstrings|none",
      "readmePresent": true,
      "inlineCommentDensity": "high|medium|low"
    },
    "logging": {
      "framework": "Serilog|log4j|winston|print 等",
      "levels": ["Debug", "Info", "Warning", "Error"]
    },
    "configuration": {
      "format": "JSON|YAML|TOML|env 等",
      "patterns": ["配置管理模式描述"]
    },
    "languageFeatures": {
      "patterns": ["语言特性使用模式"]
    },
    "dataPatterns": {
      "patterns": ["数据处理模式"]
    },
    "asyncPatterns": {
      "patterns": ["异步编程模式"]
    },
    "commentStyle": {
      "patterns": ["注释风格描述"]
    }
  },
  "omittedCategories": {                       // (可选) 说明省略原因
    "domAndUiPatterns": "纯后端项目，无前端 UI"
  }
}
```

## knowledge-base/architecture.json

```json
{
  "version": "11.0",
  "description": "项目架构文档",
  "lastUpdated": "2026-03-16",
  "architecture": {
    "style": "Monolith|Microservices|Modular Monolith|Plugin-based|Monorepo 等",
    "overview": "2-3 句架构概述",
    "layers": [
      {
        "name": "层名称",
        "responsibility": "该层职责",
        "modules": ["Module1", "Module2"],
        "dependsOn": ["Other Layer"]
      }
    ],
    "moduleDependencies": {
      "ModuleA": {
        "dependsOn": ["ModuleB", "ModuleC"],
        "dependedBy": ["ModuleD"]
      }
    },
    "designPatterns": [
      {
        "pattern": "模式名称",
        "usage": "在哪里以及如何使用",
        "evidence": "观察到该模式的文件或类"
      }
    ],
    "dataFlow": {
      "description": "数据在系统中的流动方式",
      "stages": [
        {"stage": "输入", "description": "数据如何进入系统"},
        {"stage": "处理", "description": "数据如何被转换"},
        {"stage": "输出", "description": "数据如何输出"}
      ]
    },
    "externalIntegrations": [
      {
        "name": "集成名称",
        "type": "database|api|file-system|message-queue",
        "purpose": "该集成的用途"
      }
    ]
  }
}
```

## knowledge-base/api-reference.json

```json
{
  "version": "11.0",
  "description": "项目 API 参考",
  "lastUpdated": "2026-03-16",
  "externalApi": {
    "type": "REST|CLI|SDK|GUI|none",
    "endpoints": [
      {
        "method": "GET|POST|PUT|DELETE 或 N/A",
        "path": "/api/resource 或 command-name",
        "parameters": ["param1: type - 描述"],
        "returns": "返回类型或描述",
        "purpose": "该端点的功能"
      }
    ]
  },
  "internalInterfaces": {
    "sharedTypes": [
      {
        "name": "TypeName",
        "location": "relative/path",
        "purpose": "该类型代表什么",
        "usedBy": ["Module1", "Module2"]
      }
    ],
    "moduleInterfaces": [
      {
        "module": "ModuleName",
        "publicApi": ["Method1(params): return", "Method2(params): return"],
        "consumers": ["OtherModule1"]
      }
    ]
  }
}
```

---

## knowledge-base/domains/index.json

领域注册表，domain 模式下启动时自动加载（通常 <80 行）。记录所有已构建的领域知识，并提供跨领域导航。

```json
{
  "version": "1.1",
  "lastUpdated": "2026-03-17",
  "description": "项目领域知识注册表",
  "domainModel": {                             // (可选) 复杂项目推荐
    "primaryDomains": ["domain-a", "domain-b"],
    "supplementaryTopicDossiers": ["topic-x"],
    "notes": "primaryDomains 承担稳定主导航；supplementaryTopicDossiers 只承载专题、桥接或补充知识，不默认成为首跳入口"
  },
  "navigationAssets": {                        // (可选) 复杂项目推荐
    "relations": "../relations.json",
    "chains": "../chains/index.json",
    "glossary": "../glossary.json"
  },
  "entryScenes": [                             // (可选) 复杂项目推荐
    {
      "scene": "问题场景",
      "firstHop": "domain-id",
      "then": ["../chains/chain-id.json"]
    }
  ],
  "domains": [
    {
      "id": "domain-id",                        // (必填) kebab-case 唯一标识
      "name": "领域名称",                        // (必填) 人类可读名称
      "description": "领域简述",                 // (必填) 一句话描述该领域职责
      "summary": "2-3句概括领域核心内容和价值",    // (必填) Agent 读此即可判断是否需要深入
      "path": "domains/domain-id/",             // (必填) 相对于 knowledge-base/ 的路径，禁止绝对路径
      "role": "primary-domain",               // (可选) primary-domain|supplementary-topic-dossier
      "modules": ["src/auth/", "src/middleware/auth.ts"],  // (必填) 相对于 projectRoot 的代码路径，禁止绝对路径
      "tags": ["auth", "jwt", "session"],       // (必填) 用于上下文匹配的关键词
      "priority": "high",                       // (必填) high|medium|low
      "itemCount": 4,                           // (必填) 领域文件数量
      "lastUpdated": "2026-03-17",              // (必填) ISO 日期
      "layerPosition": "runtime-domain",        // (可选)
      "relatedChains": ["../chains/chain-id.json"], // (可选)
      "relatedHubs": ["glossary#term-id"],      // (可选)
      "commonTransitions": ["下一跳建议"],       // (可选)
      "quickAnswers": {                         // (必填) 最常见问题的直接答案，Agent 无需读详情
        "常见问题1？": "直接答案",
        "常见问题2？": "直接答案"
      }
    }
  ],
  "crossDomainRelations": {                     // (可选) 领域间依赖关系
    "description": "领域间依赖关系图",
    "graphPath": "../relations.json",
    "chainRegistryPath": "../chains/index.json",
    "relations": [
      {"from": "domain-a", "to": "domain-b", "type": "依赖关系描述"}
    ],
    "readingOrder": "建议阅读顺序说明"           // (可选) 推荐的领域学习路径
  },
  "summaryFields": ["summary", "quickAnswers", "description"],  // (可选) 声明摘要层字段
  "detailFields": ["path"]                       // (可选) 声明指向详情层的字段
}
```

## knowledge-base/domains/{domain-id}/index.json

单个领域的索引文件，描述该领域包含的知识文件，并提供快速定位能力。

```json
{
  "domainId": "auth-system",                   // (必填) 与注册表中的 id 匹配
  "name": "认证系统",                           // (必填)
  "description": "用户认证、JWT、会话管理",      // (必填)
  "version": "1.0",
  "lastUpdated": "2026-03-17",
  "quickStart": {                              // (必填) Agent 进入该领域的最短路径
    "description": "快速上手指引",
    "directoryLayout": {                       // (可选) 领域知识超出标准5文件时填写；规范位置在 quickStart 下
      "field-catalog/": "字段级目录，按表或 ID 范围分片",
      "internals/": "内部实现目录，按层或主题拆分",
      "architecture/": "架构多维拆分目录",
      "api/": "API 参考目录，按公开/内部或主题分离",
      "runtime/": "运行时行为：决策树、命令处理、已验证行为链路"
    },
    "steps": [
      "1. 读取本 index.json 了解概况和 commonQueries",
      "2. 查规范 -> specs.json",
      "3. 根据任务选择 architecture.json 或 api-reference.json"
    ]
  },
  "startHere": {                               // (可选) 复杂领域推荐
    "default": "先判断问题类型后选择首跳文件",
    "recommended": ["问题类型 -> 文件路径"]
  },
  "modules": ["src/auth/", "src/middleware/auth.ts"],  // (必填) 相对于 projectRoot 的代码路径，禁止绝对路径
  "entryPoints": ["src/auth/index.ts"],         // (必填) 相对于 projectRoot 的入口文件路径，禁止绝对路径
  "files": [
    {
      "id": "specs",                            // (必填)
      "path": "specs.json",                     // (必填) 相对于本 index.json 所在目录
      "description": "认证系统开发规范（N 条规范）", // (必填) 含数量信息
      "priority": "high"                        // (必填) high|medium|low
    },
    {
      "id": "architecture",
      "path": "architecture.json",
      "description": "认证系统架构设计（N 层/组件）",
      "priority": "high"
    },
    {
      "id": "api-reference",
      "path": "api-reference.json",
      "description": "认证 API 接口（N 个公共 API）",
      "priority": "medium"
    },
    {
      "id": "internals",
      "path": "internals.json",
      "description": "内部实现：关键文件、核心算法、状态管理",
      "priority": "low"
    }
  ],
  "crossReferences": {                         // (必填) 与其他领域/全局知识的关联
    "domain-b": "该领域与 domain-b 的关系说明",
    "glossary#term-id": "引用的全局术语"
  },
  "questionMap": [                              // (可选) 复杂领域推荐
    {
      "question": "常见问题类型",
      "firstHop": "specs.json 或 architecture.json",
      "chain": "../../chains/chain-id.json"
    }
  ],
  "chainRefs": ["../../chains/chain-id.json"], // (可选)
  "upstreamInputs": ["../other-domain/index.json"], // (可选)
  "downstreamConsumers": ["internals.json"],   // (可选)
  "evidenceRefs": ["../../task-index.json"],   // (可选)
  "commonQueries": [                           // (必填) 常见查询及答案位置
    {
      "query": "常见问题？",
      "answer": "简短直接答案",
      "file": "specs.json#spec-id 或 architecture.json"
    }
  ],
  "dependencies": ["database-system"],          // (可选) 依赖的其他领域 id
  "tags": ["auth", "jwt", "session", "login", "oauth"]  // (必填) 上下文匹配关键词
}
```

**兼容说明**：`directoryLayout` 的规范位置是 `quickStart.directoryLayout`。若历史数据集中存在顶层同名字段，consumer 应兼容读取；但 producer（包括 project-knowledge-builder）不应再把它写到顶层。

## knowledge-base/domains/{domain-id}/{subdir}/

当领域知识体积超过标准 5 文件承载能力时，将标准文件按关注点迁移到子目录。

**触发条件**：标准文件（architecture.json / api-reference.json / internals.json）超过 400 行，或领域内有 3+ 个独立关注点。

**子目录化规则**：

| 子目录 | 触发条件 | 包含文件模式 |
|--------|---------|------------|
| `architecture/` | architecture.json 超过 400 行，或有 3+ 个独立架构维度 | architecture.json + architecture-{dimension}.json |
| `api/` | api-reference.json 超过 300 行，或有明显内外 API 分离 | api-public.json + api-internal.json + api-reference.json |
| `internals/` | internals.json 超过 400 行，或项目有明确分层架构 | internals.json（索引）+ internals-{layer-name}.json |
| `runtime/` | 存在需区别于静态架构的运行时专项知识 | {entity}-decision-tree.json / {entity}-command-api.json |
| `specs/` | specs.json 超过 200 行或需要专题分离 | specs.json + specs/{topic}.json |

**子目录 manifest 文件 schema**（如 internals/internals.json）：

```json
{
  "version": "1.0",
  "lastUpdated": "ISO日期",
  "description": "该子目录的职责概述",
  "files": [
    {
      "path": "internals-{layer-name}.json",
      "description": "该文件覆盖的架构层",
      "keyTopics": ["核心算法", "状态管理"]
    }
  ],
  "summaryFields": ["description", "keyTopics"],
  "detailFields": ["path"]
}
```

子目录化后，**必须**更新 domain/index.json 的 `quickStart.directoryLayout` 字段提供子目录导航，并更新 `files` 数组中对应条目的 `path` 指向子目录内的 manifest 文件。

## knowledge-base/domains/{domain-id}/specs.json

领域特定开发规范，补充全局 conventions.json 中未覆盖的领域约定。

```json
{
  "version": "1.0",
  "domainId": "domain-id",                     // (必填)
  "description": "领域特定开发规范",             // (必填)
  "lastUpdated": "2026-03-17",
  "specs": [
    {
      "id": "spec-001",                         // (必填) 唯一 ID
      "title": "规范标题",                       // (必填)
      "category": "分类",                        // (必填) naming|pattern|error-handling|testing|security 等
      "description": "规范说明",                 // (必填)
      "why": "为什么需要这个规范",               // (必填)
      "how": "如何遵守",                         // (必填)
      "example": "代码示例或说明",               // (可选)
      "antiPattern": "反模式示例",              // (可选)
      "severity": "error"                       // (必填) error|warning|info
    }
  ]
}
```

## knowledge-base/domains/{domain-id}/architecture.json

领域内部架构设计，聚焦于该领域的组件结构和数据流。

```json
{
  "version": "1.0",
  "domainId": "domain-id",                     // (必填)
  "description": "领域架构设计",                // (必填)
  "lastUpdated": "2026-03-17",
  "architecture": {
    "overview": "领域架构概述（2-3 句）",        // (必填)
    "components": [                             // (必填)
      {
        "name": "组件名",                        // (必填)
        "responsibility": "职责说明",            // (必填)
        "interfaces": ["对外提供的接口1"],        // (可选)
        "dependsOn": ["依赖的组件名"]            // (可选)
      }
    ],
    "dataFlow": {                               // (必填)
      "description": "领域内数据流描述",
      "stages": [
        { "stage": "阶段名", "description": "该阶段说明" }
      ]
    },
    "externalDependencies": [                   // (可选)
      {
        "name": "外部依赖名",
        "type": "database|api|service|cache",
        "purpose": "用途说明"
      }
    ],
    "designDecisions": [                        // (可选)
      {
        "decision": "设计决策描述",
        "rationale": "原因",
        "alternatives": ["备选方案1"]
      }
    ]
  }
}
```

## knowledge-base/domains/{domain-id}/api-reference.json

领域对外暴露的公共 API 和内部核心方法。

```json
{
  "version": "1.0",
  "domainId": "domain-id",                     // (必填)
  "description": "领域 API 参考",              // (必填)
  "lastUpdated": "2026-03-17",
  "publicApi": [                               // (必填) 对外暴露的方法/端点/事件
    {
      "name": "方法/端点名",                    // (必填)
      "type": "function|endpoint|event",        // (必填)
      "signature": "签名或路由",                // (必填)
      "description": "用途说明",               // (必填)
      "parameters": [                           // (可选)
        { "name": "参数名", "type": "类型", "description": "说明" }
      ],
      "returns": "返回值描述",                  // (可选)
      "usedBy": ["调用者模块1"]                 // (可选)
    }
  ],
  "internalApi": [                             // (可选) 领域内高频使用的内部方法
    {
      "name": "内部方法名",                     // (必填)
      "visibility": "private|protected|internal",  // (必填)
      "description": "用途说明"                // (必填)
    }
  ]
}
```

## knowledge-base/domains/{domain-id}/internals.json

领域内部实现细节，包含关键文件、核心逻辑、状态管理和领域约定。

```json
{
  "version": "1.0",
  "domainId": "domain-id",                     // (必填)
  "description": "领域内部实现细节",            // (必填)
  "lastUpdated": "2026-03-17",
  "coreLogic": {                               // (必填)
    "description": "核心业务逻辑概述",          // (必填)
    "keyFiles": [                              // (必填) 领域内最重要的文件
      { "path": "相对于项目根目录的路径", "role": "该文件在领域中的角色" }
    ],
    "algorithms": [                            // (可选)
      { "name": "算法/逻辑名", "location": "文件路径", "description": "说明" }
    ]
  },
  "stateManagement": {                         // (可选)
    "description": "状态管理方式描述",
    "stores": ["状态存储1（用途）"]
  },
  "errorHandling": {                           // (可选)
    "strategy": "领域内错误处理策略",
    "customErrors": ["自定义错误类型1"]
  },
  "domainConventions": [                       // (可选) 领域特有约定（非全局规范）
    { "convention": "领域特定约定描述", "example": "代码示例或说明" }
  ]
}
```

## knowledge-base/domains/{domain-id}/field-catalog/ 和 param-specs/（Catalog 系统）

当领域内存在 50+ 个同类实体（字段、参数、文件、模块）时，建立 Catalog 系统以支持分片按需加载。

**触发条件**：
- 领域内存在 50+ 个同类实体（配置字段、源文件、参数类别）
- 单个详情文件超过 500 行
- Agent 经常需要"找到某个具体字段/文件/参数"而不是"理解整体架构"

**Catalog 索引层 schema**（如 field-catalog.json / param-specs.json）：

```json
{
  "version": "1.0",
  "lastUpdated": "ISO日期",
  "description": "字段/参数/文件目录的索引层",
  "totalCount": 200,
  "shards": [
    {
      "id": "shard-id",
      "path": "catalog-{range}.json",
      "range": "ID或语义范围描述（如 3601-3624 或 soldier-config）",
      "count": 30,
      "preview": ["重要实体名1", "重要实体名2"]
    }
  ],
  "quickLookup": {
    "常见查询1": "直接答案（无需读分片）",
    "常见查询2": "直接答案"
  },
  "summaryFields": ["range", "count", "preview"],
  "detailFields": ["path"]
}
```

**Catalog 分片详情层 schema**（如 field-catalog-{range}.json / param-specs-{category}.json）：

```json
{
  "version": "1.0",
  "shardId": "{range}",
  "parentIndex": "field-catalog.json",
  "entities": [
    {
      "id": "实体ID",
      "name": "实体名称",
      "type": "实体类型",
      "metadata": {},
      "constraints": [],
      "examples": []
    }
  ]
}
```

**分片命名规范**：

| 分片类型 | 命名模式 | 适用场景 | 分片粒度建议 |
|---------|---------|---------|------------|
| ID 范围分片 | `{name}-{prefix}xx.json` | 实体有数字 ID | 每片 30-100 个实体 |
| 编号范围分片 | `{name}-group-{start}-{end}.json` | 实体有序号 | 每片 10-20 个实体 |
| 语义分片 | `{name}-{semanticKey}.json` | 实体有明确语义分类 | 每个分类一个文件 |

每种 Catalog 都应有索引层（catalog.json）配合分片层（catalog-{shard}.json）使用。

## terminology/（术语管理目录）

当项目存在大量别名歧义、待验证知识声明或需要系统化记录验证链路时，在项目根级别（与 knowledge-base/ 同级）创建 terminology/ 目录。

**触发条件**：
- 领域存在大量非正式别名，不同文档使用不同名称指代同一实体
- 知识库中存在置信度不足的声明（不确定是否正确）
- 知识库已积累足够多的验证链路值得系统化保存

**colloquial-normalization.json**（别名归一化，含置信度门控）：

```json
{
  "version": "1.0",
  "description": "口语词到正式术语的归一化规则，含置信度等级门控",
  "entries": [
    {
      "colloquial": "口语叫法",
      "formal": "正式名称（null 表示无法确定）",
      "confidence": "A|B|C",
      "rule": "Agent 遇到此术语时的处理规则",
      "evidence": "支撑证据的具体来源"
    }
  ]
}
```

**confidence 等级定义**：
- A：直接使用，与正式标识符完全匹配，有源码/数据级别直接证据
- B：间接验证，可作为入口但需进一步确认
- C：推断，禁止直接使用，需先完成别名归一化

**verified-chain-routes.json**（已验证执行链路，step-by-step）：

```json
{
  "version": "1.0",
  "description": "已验证执行链路的step-by-step路径表",
  "chains": [
    {
      "id": "chain-id",
      "name": "链路名称",
      "triggerWords": ["触发词1", "触发词2"],
      "steps": [
        {
          "order": 1,
          "table": "表名",
          "file": "文件名",
          "dir": "目录名",
          "keyField": "关键字段名",
          "description": "此步骤说明"
        }
      ],
      "confidence": "A|B|C",
      "evidence": "整体支撑证据"
    }
  ]
}
```

**pending-evidence.json**（待验证声明清单，items-only）：

```json
{
  "version": "1.0",
  "description": "待补充验证的知识声明；items 是唯一主入口",
  "items": [
    {
      "id": "pending-001",
      "priority": "P0|P1|P2",
      "category": "别名|动作词|历史版本差异|资源链样本",
      "description": "具体未解问题或待补证主题",
      "pendingItems": ["待补证项1", "待补证项2"],
      "resolvedItems": [
        {
          "term": "已解决词项",
          "resolved": "已确认的规范结论",
          "level": "A|B|C",
          "date": "2026-03-26"
        }
      ],
      "suggestedSources": ["建议补证来源1"],
      "status": "open|partial|resolved",
      "resolution": "仅 resolved 时填写",
      "resolvedDate": "ISO日期（可为null）"
    }
  ]
}
```

**写入约束**：

- `items` 才是 pending-evidence.json 的规范主入口，用于记录未决缺口、弱命中和待补证线索。
- 新的已验证链路、可执行结论和运行时知识，应优先写入 `verified-chain-routes.json`、领域 `runtime/` 子目录、权威领域详情文件或 archive/report 文件，而不是把 pending-evidence 当成事实仓库。

**注意**：terminology/ 目录与 knowledge-base/glossary.json 互补但不重叠：glossary.json 定义技术术语的规范含义（知识库内的概念统一）；terminology/ 管理领域术语的命名歧义（人类语言中同一概念的不同叫法）和已验证链路的证据记录。

---

## task-archive.json

已完成和已取消任务的归档文件。**默认不加载**，仅当用户显式请求查看历史任务时读取。
当任务 status 变为 `completed` 或 `cancelled` 时，从 task-index.json 移除并追加到此文件。

```json
{
  "version": "1.0",
  "projectId": "my-project",                  // (必填)
  "lastUpdated": "2026-03-17",               // (必填)
  "summary": {                               // (必填)
    "totalCompleted": 143,
    "totalCancelled": 4,
    "dateRange": {
      "earliest": "2026-01-15",             // 最早归档任务日期（ISO 日期）
      "latest": "2026-03-17"               // 最新归档任务日期（ISO 日期）
    }
  },
  "tasks": [                                // 已完成/已取消任务列表（轻量级摘要）
    {
      "id": "task-20260316-001",            // (必填)
      "title": "任务标题",                   // (必填)
      "date": "2026-03-16",                 // (必填) 任务创建日期
      "completedDate": "2026-03-16",        // (必填) 完成或取消日期
      "status": "completed",               // (必填) completed|cancelled
      "type": "feature",                    // (必填) feature|bugfix|optimization|test|docs
      "priority": "P1",                     // (必填) P0|P1|P2
      "filePath": "tasks/task-20260316-001.json",  // (必填) 详情文件路径（仍保留在 tasks/）
      "summary": "不超过100字摘要"           // (必填)
    }
  ]
}
```

---

## 路径字段格式约束（强制）

所有 schema 中的路径字段均须遵守以下规则。违反会导致知识库在不同机器/用户间无法加载。

### 唯一例外：允许绝对路径的字段

| 文件 | 字段 | 说明 |
|------|------|------|
| `context.json` | `projectPath` | 运行时用于定位代码仓库，必须为绝对路径 |
| `memory-map.json` → `2_paths` | `projectRoot` | 与 projectPath 对应，允许绝对路径 |

### 必须使用相对路径的字段

| 字段 | 相对于 | 示例（正确） | 示例（错误） |
|------|--------|------------|------------|
| `domains/index.json` → `domains[].path` | knowledge-base/ | `domains/auth-system/` | `D:\workpace\kb\domains\auth-system\` |
| `domains/index.json` → `domains[].modules[]` | projectRoot | `src/auth/` | `/home/user/project/src/auth/` |
| `domain/index.json` → `modules[]` | projectRoot | `_res_tables/01_Creature/` | `D:\project\_res_tables\01_Creature\` |
| `domain/index.json` → `entryPoints[]` | projectRoot | `src/auth/index.ts` | `C:\Users\user\project\src\auth\index.ts` |
| `domain/index.json` → `files[].path` | domain 目录 | `specs.json` | `knowledge-base/domains/auth/specs.json` |
| `internals.json` → `coreLogic.keyFiles[].path` | projectRoot | `src/auth/JwtService.cs` | `/home/user/project/src/auth/JwtService.cs` |
| `development-specs.json` → `specs.modules[].path` | projectRoot | `src/modules/auth/` | `D:\project\src\modules\auth\` |

### 路径分隔符

统一使用正斜杠 `/`，不使用反斜杠 `\`。

### 验证命令

生成知识库后，在 knowledge-base/ 目录下执行：

```
Grep: "[A-Z]:\\"    → 应返回 0 结果（Windows 盘符绝对路径）
Grep: "/home/"      → 应返回 0 结果（Linux 用户目录）
Grep: "/Users/"     → 应返回 0 结果（macOS 用户目录）
```
