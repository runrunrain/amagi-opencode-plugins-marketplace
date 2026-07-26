# 检测模式参考

代码库分析过程中使用的查找表和 Grep 模式。
每个章节由 SKILL.md 中的特定阶段引用。

## 目录

- [技术栈特征](#技术栈特征) -- 阶段 1
- [架构指标](#架构指标) -- 阶段 3
- [API 检测模式](#api-检测模式) -- 阶段 4
- [规范检测](#规范检测) -- 阶段 5

---

## 技术栈特征

使用 Glob 检查以下特征文件。按特异性排序 --
先检查最具区分度的模式以避免误报。

| 文件模式 | 表示 |
|---------|------|
| `*.csproj`, `*.sln` | C# / .NET |
| `CMakeLists.txt`, `*.cmake` | C/C++（CMake 构建） |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `package.json` | Node.js / TypeScript / JavaScript |
| `tsconfig.json` | TypeScript（确认 JS 项目使用 TS） |
| `pyproject.toml`, `setup.py`, `requirements.txt` | Python |
| `pom.xml`, `build.gradle`, `build.gradle.kts` | Java / Kotlin |
| `Makefile` | 通用构建 -- 需读取内容确定语言 |
| `*.xcodeproj`, `*.xcworkspace` | Swift / Objective-C |
| `pubspec.yaml` | Dart / Flutter |
| `mix.exs` | Elixir |
| `Gemfile` | Ruby |
| `composer.json` | PHP |
| `.claude-plugin/plugin.json`, `plugin.json` | Claude Code 插件 |
| `manifest.json` | 浏览器扩展或 PWA |

### Monorepo 指标

| 文件 | 工具 |
|------|------|
| `lerna.json` | Lerna |
| `pnpm-workspace.yaml` | pnpm workspaces |
| `nx.json` | Nx |
| `turbo.json` | Turborepo |
| 顶层 `packages/`、`apps/`、`modules/`、`services/` | 通用 monorepo 布局 |

---

## 架构指标

用于识别架构特征的 Grep 模式。
对代码库执行这些模式以收集结构性证据。

### 抽象层

```
Grep: "interface I" or "abstract class" or "trait "
```

查找定义系统分层契约的抽象类型。

### 分层架构模式

```
Grep: "class.*Controller" or "class.*Service" or "class.*Repository"
Grep: "class.*Handler" or "class.*Manager" or "class.*Provider"
```

这些命名模式是 N 层架构或清洁架构的强信号。

### 依赖图（入口点分析）

```
Grep: "import|using|require|from"（在入口文件中）
```

读取入口文件并追踪其导入，绘制顶层依赖图。
向下追踪一层以理解模块关系。

### 并发模型

```
Grep: "async|await|Task<|Promise<|Future<"
Grep: "goroutine|channel|select {"（Go）
Grep: "threading|multiprocessing|concurrent"（Python）
```

### 外部集成

```
Grep: "HttpClient|fetch|axios|requests\."
Grep: "database|connection|pool|cursor|query"
Grep: "redis|kafka|rabbitmq|queue"
```

### 架构理解的关键文件

读取 3-5 个关键文件可获得强架构信号：

1. **入口点** -- Main、App、index、Program.cs、main.py
2. **核心领域模型** -- 被导入/引用最多的文件
3. **配置加载器** -- 应用如何配置自身
4. **一个典型功能** -- 展示从输入到输出的完整功能实现，
   体现典型代码路径

---

## API 检测模式

用于识别不同 API 框架和端点风格的 Grep 模式。

| 模式 | API 类型 |
|------|---------|
| `[HttpGet]`, `[HttpPost]`, `[Route]`, `app.MapGet` | ASP.NET REST |
| `@app.route`, `@router.get`, `@router.post` | Python Flask/FastAPI |
| `app.get(`, `app.post(`, `router.get(`, `router.post(` | Express.js |
| `func (h *Handler)` 靠近 `http.` | Go HTTP 处理器 |
| `#[get("/")]`, `#[post("/")]` | Rust Actix/Rocket |
| `static void Main`, `[Command]`, `argparse` | CLI 应用 |
| `public class.*:.*Interface`, `public.*API` | SDK / 库 API |
| `@Controller`, `@RestController`, `@RequestMapping` | Spring (Java) |
| `defmodule.*Controller`, `plug :match` | Elixir Phoenix |
| `class.*ViewSet`, `class.*APIView` | Django REST Framework |

对每个检测到的端点或公开接口，记录：
- 方法/路由/命令名称
- 参数和返回类型
- 简要用途（来自注释、命名或函数体）

### 内部接口信号

以下模式识别模块间的内部通信方式：

| 查找内容 | 表示 |
|---------|------|
| 共享类型定义、DTO | 模块间的数据契约 |
| 事件发射器/订阅者/消息总线 | 事件驱动通信 |
| 跨模块直接导入 | 模块间紧耦合 |
| DI 容器注册 | 依赖注入架构 |
| 共享 proto/thrift/GraphQL schema | RPC / schema 驱动接口 |

---

## 规范检测

需调查的领域及其检测方法。目标是 **10+ 个不同的规范类别**，
附带来自代码库的具体示例，而非泛泛描述。

### 核心领域（始终检测）

| 领域 | 检测方法 |
|------|---------|
| **命名风格** | 采样 20+ 个类/函数/变量名。检查 PascalCase、camelCase、snake_case。注意私有成员规范（下划线前缀、# 前缀）。区分常量、变量、类型、文件和目录的命名规则。 |
| **文件组织** | 分析目录到命名空间/模块的映射。注意一文件一类 vs 多类文件模式、节分隔符（注释横幅、region 标记）。 |
| **错误处理** | Grep 查找 try/catch 模式、Result 类型、错误返回规范。注意哪些错误会暴露给用户 vs 被静默记录日志。 |
| **日志** | Grep 查找日志框架使用模式、日志级别、结构化 vs 非结构化日志。 |
| **测试** | 查找测试目录，检测测试框架，分析测试命名规范，估计覆盖率水平。 |
| **配置** | 查找配置文件，检测配置访问模式，环境变量使用方式。 |
| **文档** | 检查文档注释（JSDoc、XML docs、docstrings），README 质量，内联注释密度和语言。 |

### 补充领域（存在时检测）

这些经常被遗漏但对代码一致性很重要：

| 领域 | 检测方法 |
|------|---------|
| **语言特性** | 使用/避免了哪些特性？（ES6+ const/let/箭头函数、C# LINQ、Python 推导式、Go 错误返回）。采样 5-10 个文件查找一致的特性使用模式。 |
| **数据模式** | Grep 查找不可变性（spread、Object.freeze、readonly），观察者/事件模式（subscribe、emit），工厂函数，建造者模式。 |
| **DOM/UI 模式** | （前端项目）渲染方式（innerHTML vs createElement），事件委托，状态管理，CSS 方法论（BEM、utility-first、CSS-in-JS）。 |
| **注释风格** | 注释使用什么语言？（英文、中文、混合？）节标题规范？哪些内容用 JSDoc/docstring vs 内联注释？ |
| **异步模式** | Grep 查找 async/await、Promise、callback、Task<>、goroutine。记录主要并发模型和异步代码中的错误传播方式。 |
| **ID 生成** | 如何创建唯一 ID？（UUID、自增、雪花 ID、nanoid、自定义方案） |
| **导入排序** | 是否有一致的导入排序规范？（标准库优先，然后第三方，然后本地？） |
| **状态管理** | （前端）Redux、Context、Zustand、signals 还是自定义？全局 vs 局部状态边界？ |

---

## 领域知识体量检测

在 domain explorer 阶段使用，评估是否需要建立 Catalog 系统或进行子目录化。

### 配置字段计数

用于判断是否需要 field-catalog 分片（阈值：50+ 字段）。

```
Glob: "*.json" count in domains/{domain-id}/
Grep: "field_name|column_name|fieldId|\"id\"" in domain config files
```

### 配置文件计数

用于判断是否需要 file-catalog（阈值：50+ 配置文件）。

```
Glob: "*.xlsx", "*.csv", "*.json" count in config table directories
```

### 参数类别检测

用于判断 param-specs 分片粒度（阈值：10+ 种参数类别）。

```
Grep: "Config$|Spec$|Params$|Settings$" in class/struct definitions
识别项目中的配置类名，确定语义分片键
```

### 架构层检测

用于判断 internals 是否需要按层分片（阈值：3+ 层）。

```
Grep: "layer|Layer|tier|Tier|level|Level" in architecture comments/docs
结合 architecture.json 中的 layers 字段
```

### 运行时知识检测

用于标记 runtime/ 目录候选（存在以下模式时触发）。

```
Grep: "decision.*tree|DecisionTree|command.*handler|CommandHandler"
Grep: "state.*machine|StateMachine|behavior.*rule|BehaviorRule"
Grep: "OnCommand|HandleCommand|ProcessCommand"
```

识别运行时决策逻辑、命令处理器、状态机等，标记为 runtime/ 子目录候选。

### 别名密度检测

用于判断是否需要 terminology/ 目录（存在以下模式时触发）。

```
Grep: "alias|nickname|informal|colloquial|aka|also.known"
Grep: "别名|非正式|口语|俗称"
```

识别别名系统，若存在多处别名引用，标记 terminology/ 目录需求。

---

## 硬编码路径检测

在输出生成完成后，对所有生成的知识库文件执行以下检查，确保无硬编码绝对路径。

### Windows 盘符路径检测

```
Grep: "[A-Z]:\\" in knowledge-base/
```

期望结果：**0 个匹配**。若有匹配，说明存在形如 `D:\workspace\...` 的硬编码路径，必须替换为相对路径。

### Linux/macOS 用户目录路径检测

```
Grep: "/home/" in knowledge-base/
Grep: "/Users/" in knowledge-base/
```

期望结果：**0 个匹配**。若有匹配，说明存在形如 `/home/username/...` 或 `/Users/username/...` 的硬编码路径，必须替换为相对路径。

### 常见违规模式

| 违规示例 | 修正方式 |
|---------|---------|
| `"path": "D:\\workpace\\project\\src\\auth\\"` | `"path": "src/auth/"` |
| `"modules": ["/home/user/project/src/auth/"]` | `"modules": ["src/auth/"]` |
| `"entryPoints": ["C:\\Users\\user\\project\\main.cs"]` | `"entryPoints": ["main.cs"]` |
| `"keyFiles": [{"path": "/Users/user/app/services/Auth.ts"}]` | `"keyFiles": [{"path": "app/services/Auth.ts"}]` |

### 允许的绝对路径

以下字段在 schema 中明确允许绝对路径，检测时可忽略：

- `context.json` → `projectPath`
- `memory-map.json` → `sections.2_paths.projectRoot`
