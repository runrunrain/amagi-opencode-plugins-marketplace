---
description: "敏感文件守卫与验证通过后，将工作区内授权 Git 仓库的本地变更提交并推送；插件类仓库会同步版本号，独立 OpenCode 插件会发布不可变 SemVer tag"
agent: amagi-leader
---


# 批量提交并推送 Git 仓库

$ARGUMENTS

## 执行授权（直接执行，无需逐步确认）

主上显式调用本命令即授权直接处理所选仓库：**不要逐仓库或逐步骤向主上确认，也不要先复述计划等待回复**。前置门禁（secret 扫描、归属核对、验证）满足即一路执行到提交推送；命中下列「停止/跳过条件」时才停下，在最终报告列明。

提交侧唯一保留的拦截是 `commit-guard`（敏感文件守卫）：拦 `.env`/私钥/凭据/secret 类文件、`node_modules/`、`.git/` 内部、超大文件（>10MB），与本命令的疑似 secret 扫描停止条件天然对齐。功能变更的审核由编排审核链承载，见 `resources/core/collaboration/workflow-rules.md`；提交时不重复审核，**命令执行中不需要主上手动确认审核**。

停止/跳过条件（出现即报告并跳过该仓库，不询问"是否继续"）：进行中的 Git 操作、命中疑似 secret、lint/typecheck/test/build 失败、远端领先或分叉、归属不明/非授权 owner、无变更。原约束仍生效：不授权覆盖冲突、泄露凭据或推送归属不明的远程。

## 范围与归属

从当前目录向上定位 `projects-memory/projects/registry.json`，扫描其工作区直接子目录与 registry 中的 `projectPath`；找不到 registry 时使用当前工作区根。环境变量仅作兼容回退，不使用设备硬编码路径。按参数精确筛选并列出最终仓库集合。

每个仓库必须有 origin、当前分支和明确归属。优先用 `gh repo view --json nameWithOwner` 与当前认证身份/用户配置的 allowlist 核对；SSH/非 GitHub 远程使用本地受信配置。归属不明、无写权限或非授权 owner 时只报告，不提交、不推送。读取 origin URL 用于报告标注，但不硬编码任何具体账号作为通用归属规则。

## 每仓库门禁

串行执行：

1. 检查正在进行的 Git 操作、`git status --porcelain=v1`、未跟踪文件、上游和 origin；存在 merge/rebase/cherry-pick/bisect 时停止该仓库。
2. 只按路径和字段名扫描疑似 secret（`.env*`、私钥/证书、credentials、token/secret 文件）；命中即停止，禁止打印值。读取完整 diff，确认全部变更属于用户请求；不得把其他会话或其他人的改动混入提交。
3. 运行仓库可发现的 lint/typecheck/test/build。失败即停止，不提交。无标准入口时报告已执行的替代验证。
4. `git fetch origin <branch>`，仅允许远端与本地同点或本地单向领先。远端领先或分叉时停止，不自动 stash、rebase、merge、checkout 或丢弃变更。
5. 敏感文件守卫确认：提交前确认敏感文件守卫已覆盖最终待提交集合——`.env*`/私钥/凭据/secret 类文件、`node_modules/`、`.git/` 内部、超大文件（>10MB）不进入提交；命中即停止。与第 2 步疑似 secret 扫描是同一条防线，不重复扫描、不打印值。

## 插件仓库版本同步

在 fetch 和远端关系门禁通过后、提交前执行。不要按仓库名硬编码；出现以下任一信号才识别为插件类仓库：

- 根目录或 `plugins/<name>/` 下存在 `.claude-plugin/plugin.json`、`.codex-plugin/plugin.json`；
- 存在 `.claude-plugin/marketplace.json` 或 `.agents/plugins/marketplace.json`；
- 根 `package.json` 的名称、exports/files、OpenCode 依赖或仓库说明明确表明它是独立 OpenCode/npm 插件。

普通 npm 应用、库或仅含无关 `package.json` 的仓库不执行本节。

### 1. 建立远端基线和变更全集

以 fetch 后的 `origin/<当前分支>` 为 `BASE_REF`。变更路径必须覆盖：

- `git diff --name-status "$BASE_REF" --`：包含本地已提交但未推送、已暂存和未暂存变更；
- `git ls-files --others --exclude-standard`：补齐未跟踪文件。

从全集识别发布单元：

- marketplace：变更命中 `plugins/<name>/` 时，该 `<name>` 是一个发布单元；
- 独立插件仓库：根插件入口、prompt/agent/command/skill/resource/rule/hook/MCP、转换器、测试或发布文件发生变化时，根包是一个发布单元；`npm pack --dry-run`/发布清单会包含的 README 等文件也属于发布物；
- 只改仓库级 CI、通用文档或与插件包无关的工具时，不自动提升插件版本；归属不清时停止。

同一个发布单元在一次执行中只更新一次。源文件被删除也算受影响，禁止只看当前仍存在的文件。

### 2. 发现版本表面

对每个发布单元读取实际存在且属于同一发布物的版本字段：

- `.claude-plugin/plugin.json` 的 `version`；
- `.codex-plugin/plugin.json` 的 `version`；
- `.claude-plugin/marketplace.json` 中对应 `plugins[]` 条目的 `version`；
- 独立 npm/OpenCode 插件的根 `package.json`，以及 `package-lock.json` 根 `version` 和 `packages[""].version`；
- 仓库发布文档明确声明的其他 release manifest/lock 字段。

`.agents/plugins/marketplace.json` 当前没有版本字段时不得创造字段。`manifest/upstream.json` 等上游来源版本是 provenance，不等同于目标包版本，除非目标仓库明确规定二者锁步。

用 JSON 解析器读取与精确写回，保留未知字段；禁止正则或全局字符串替换版本号。任何凭据字段不得输出。

### 3. 以远端版本判断目标版本

对已有发布单元，从 `BASE_REF` 中读取上述版本作为 `base_version`，而不是仅查看当前文件是否出现在 diff：

1. 基线版本表面必须一致且符合严格 `MAJOR.MINOR.PATCH`；不一致或不可解析即停止。
2. 自动目标固定为 `PATCH + 1`。
3. 当前所有版本表面仍等于 `base_version`：自动写为目标 PATCH。
4. 当前所有版本表面已等于目标 PATCH：视为变更者已正确升级，保留，不二次递增。
5. 当前版本高于基线但不等于目标 PATCH：只有用户参数或仓库发布规范明确授权该 MAJOR/MINOR/跳号时才保留，否则停止报告歧义。
6. 当前版本低于/等于远端基线但表面互不一致：停止；不得擅自选择某一文件为真相源。

新插件在 `BASE_REF` 不存在时，保留其显式声明且彼此一致的初始 SemVer，不在首次推送前再自动 PATCH；缺少版本或相关 registry 条目时停止。

“版本文件已修改”不代表“版本已提升”：必须比较 JSON 字段的基线值与当前值。

### 4. Marketplace 自身版本

当 `.claude-plugin/marketplace.json` 含 `metadata.version`，且本次新增/删除插件、修改插件条目或更新任一插件版本时，把 marketplace 视为独立发布单元：

- 以 `BASE_REF` 的 `metadata.version` 为基线，按同一 PATCH 规则更新一次；
- 多个插件同时变化也只递增一次；
- 仅手工把 metadata 提升到正确目标时保留，不二次递增。

仓库明确声明 metadata 不随插件更新时遵循其发布规范，并在报告说明证据。

### 5. 更新后门禁

版本更新后：

1. 重新 JSON 解析并逐字段核对同一发布单元的所有版本表面一致。
2. 确认 package-lock 只更新根包版本，不误改依赖版本。
3. 重跑仓库关键 lint/typecheck/test/build 或插件校验；失败即停止。
4. 复查完整 diff、敏感文件和 staged 范围，确保新增的版本文件被纳入同一提交。
5. 报告每个发布单元的 `base -> target`、自动更新/已预先更新/新插件保留，以及 marketplace metadata 的独立变化。

### 6. 独立 OpenCode 插件的不可变发布 Tag

仅当根 `package.json` 明确为独立 OpenCode/npm 插件，且本次根包被识别为发布单元时执行本节。Marketplace 中仅位于 `plugins/<name>/` 的 Claude/Codex 插件发布单元不因此自动创建仓库级 tag。

1. 以完成版本同步后的根 `package.json.version` 作为 `release_version`。它必须与根 `package-lock.json` 的两个根版本字段及仓库声明的同包版本表面一致。
2. 从仓库已有 SemVer tag 推断唯一稳定命名规范；无历史 tag 时使用 `v${release_version}`。若历史同时存在多个冲突规范，停止并报告，不猜测。
3. 在提交前同时检查本地与远端精确 tag：
   - 本地：`git show-ref --verify --quiet "refs/tags/$RELEASE_TAG"`；
   - 远端：`git ls-remote --exit-code --tags origin "refs/tags/$RELEASE_TAG"`。
   - tag 已存在时不得删除、移动、覆盖或复用；除非它已经指向本次要推送的同一提交且远端内容一致，否则停止该仓库。
   - `git ls-remote` 的“无匹配”与网络/认证失败必须区分；只有确认无匹配才能继续。
4. 所有验证、敏感文件守卫和 staged diff 复核通过并创建提交后，执行：

   ```bash
   git tag -a "$RELEASE_TAG" "$NEW_COMMIT" -m "Release $RELEASE_TAG"
   ```

   tag 必须指向本次新提交；禁止 lightweight tag、强制更新 tag 或把 tag 打在提交前的旧 HEAD 上。
5. 推送前复核 `package.json.version` 与 tag 中的 SemVer 完全一致，并确认 tag 指向 `NEW_COMMIT`。
6. 独立 OpenCode 插件必须使用一次非强制原子推送，同时发布分支和精确 tag：

   ```bash
   git push --atomic origin "HEAD:$BRANCH" "refs/tags/$RELEASE_TAG"
   ```

   远端不支持原子推送或任一 ref 被拒绝时整体视为失败，不退化为可能产生“分支已推送、tag 未发布”的分步推送。普通仓库仍按后文方式只推当前分支。
7. tag 是不可变发布标识。后续发现问题必须提升到新版本并创建新 tag，禁止删除远端 tag 后同名重发。

### 7. OpenCode 安装引用与升级提示

发布新 tag **不会**自动修改用户机器中已固定的旧 tag，也不会让仍使用 `#main` 的缓存自动刷新。OpenCode 只有在配置引用切换为新 tag 后，才会在安装/启动流程中解析该新版本。

独立 OpenCode 插件 tag 推送成功后：

1. 从已核验的 GitHub origin 推导 `<owner>/<repo>`，在报告中给出精确升级命令：

   ```bash
   opencode plugin 'github:<owner>/<repo>#<RELEASE_TAG>' --global --force
   ```

2. 不把 `#main` 描述为正式升级方式，不声称“仅重启即可自动更新”。
3. 本命令的推送授权不默认包含修改本机全局 OpenCode 配置；除非主上同时明确要求安装/升级当前设备，否则只报告命令，不执行。
4. 若主上明确授权当前设备升级，则在 tag 成功推送后执行上述正式命令，核对全局 `opencode.json` 已引用新 tag，并验证已安装包版本等于 `release_version`；失败必须报告，不能回退到手工复制缓存。

## 提交信息规范

基于真实 diff 生成，遵循仓库现有历史风格（中文 conventional commits）：

格式模板：

```text
<type>(<scope>): <简短描述>

- <变更项1>: <说明>
- <变更项2>: <说明>

<补充说明（可选）>

Co-Authored-By: OpenCode <noreply@opencode.ai>
```

| type | 说明 |
|---|---|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档变更 |
| style | 代码格式（不影响功能） |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具/依赖 |

生成规则：

1. 分析变更文件内容，确定 type 和 scope。
2. 生成简短的中文描述（不超过 50 字符）。
3. 用 `-` 列表列出主要变更项。
4. 按仓库历史约定追加 `Co-Authored-By` 署名；用户明确要求不带时去掉。

## 提交与推送

前置门禁通过后，按归属清单精确 `git add -- <paths>`，复核 staged diff 与已确认变更范围一致。**无变更不创建空提交**。

执行 `git commit` 后再次验证 HEAD 与工作区。普通仓库仅使用 `git push origin <branch>`；命中「独立 OpenCode 插件的不可变发布 Tag」时使用该节规定的 `git push --atomic` 同时推送分支和 tag。**禁止 force push、禁止强制更新 tag**。网络重试只能用已有配置或单次命令级 `git -c http.proxy=... -c https.proxy=...` 代理已配置的本地端口，不修改 Git 全局配置。某仓库失败后停止该仓库并继续下一项，不撤销用户改动；若 tag 已在本地创建但原子推送失败，保留 tag 并在报告中明确其仅存在于本地。

## 报告

```text
【Git 批量推送报告】
- 范围/归属：{repo -> owner}
- 成功：{repo: commit SHA, branch, remote}
- 版本更新：{repo/release-unit: base -> target；自动更新/已预先更新/新插件保留；marketplace metadata}
- 发布 Tag：{repo: tag -> commit；远端已发布/仅本地/不适用}
- OpenCode 升级：{固定 tag 的正式升级命令；已执行并验证/未获设备升级授权而未执行/不适用}
- 跳过：{无变更/非授权/敏感文件命中}
- 失败：{repo: 阶段、命令与错误}
- 验证：{repo -> commands/results}
- 敏感文件守卫：{通过 或 命中路径}
- 工作区：{clean 或保留的用户变更}
```
