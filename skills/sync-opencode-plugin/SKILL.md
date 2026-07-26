---
name: sync-opencode-plugin
description: 将 Claude Code 插件首次转换为 OpenCode 插件，或把 Claude Code 插件的新增、修改、删除同步到已有 OpenCode 版本。适用于 convert/port/migrate Claude plugin to OpenCode、同步 Amagi 更新、维护 sync-upstream 转换器、核对 Agent/Command/Skill/Hook/MCP 兼容性、更新版本与转换清单、验证 OpenCode 插件包等任务。
compatibility: opencode
---

> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；
> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。

# 同步 OpenCode 插件

把 Claude Code 插件视为内容源，把 OpenCode 仓库中的转换器视为生成规则。同步内容、适配语义并验证；提交、推送、发布和设备安装是独立动作。

## 选择路径

- 目标仓库的 scripts 目录已有 `sync-upstream.mjs` 转换器：执行“增量同步”。
- 目标仓库不存在，或缺少可复用转换器：先完整读取 [conversion-contract.md](references/conversion-contract.md)，再执行“首次转换”。
- 上游出现新的 Claude 专属机制、目录类型或工具名：读取转换契约，修改转换器后重新生成；不要只修生成结果。

## 确定路径

1. 将包含 `.claude-plugin/plugin.json` 的目录作为 `SOURCE_ROOT`。
2. 将包含 OpenCode `package.json` 和 `index.js` 的目录作为 `TARGET_ROOT`。
3. 优先使用用户给出的绝对路径。未给出时，从当前仓库和同级目录发现；仍不唯一时再询问。
4. 不把示例路径硬编码进转换器或生成文件。

## 增量同步

1. 分别检查两个仓库：

   ```bash
   git -C "$SOURCE_ROOT" status -sb
   git -C "$TARGET_ROOT" status -sb
   ```

2. 读取源插件版本、目标包版本、`manifest/upstream.json` 和目标转换器。
3. 目标仓库有未确认改动时停止自动同步，先区分用户改动与上次生成结果。不得覆盖或清理。
4. 可使用本 Skill 的安全包装器：

   ```bash
   node "<SKILL_ROOT>/scripts/sync.mjs" \
     --source "$SOURCE_ROOT" \
     --target "$TARGET_ROOT"
   ```

   只检查路径和状态时加 `--check-only`。仅在已审阅目标改动后才允许 `--allow-dirty`。

5. 同步后审阅 `git diff --stat` 和完整 diff。建立“上游变更文件 → OpenCode 生成/适配文件”映射，确认新增、修改、删除都被处理。
6. 若变更是系统性适配，修改 `TARGET_ROOT/scripts/sync-upstream.mjs` 并重新生成。仅版本断言、目标 README、测试或目标专属入口可直接修改。

## 首次转换

1. 完整读取 [conversion-contract.md](references/conversion-contract.md)。
2. 先创建最小可运行的 OpenCode npm 包、server 入口、Agent manifest 和转换器。
3. 由转换器生成 prompts、commands、skills、resources、rules、MCP 清单与上游 manifest。
4. 把 Claude hooks 按行为逐项分类为：
   - OpenCode 原生事件可实现：移植到插件入口。
   - 权限可表达：用 Agent/tool permission 或执行前后 guard。
   - 无等价能力：记录限制，不伪造支持。
5. 连续运行转换器两次，确认第二次没有产生额外差异。

## 必查语义

- 恰好一个可见 Leader 为 `primary`；专业 Agent 为 `subagent`。
- `default_agent` 指向 Leader，除非用户明确禁用。
- SubAgent 的 `task` 权限为 deny，禁止递归分派。
- Claude Agent Teams/Leader 中转通信 改为 Leader 协调多个 OpenCode task；不向 task 传 Claude 的 `isolation` 参数。
- `${CLAUDE_PLUGIN_ROOT}`、`resources/...` 和 Claude 专属工具名不得作为不可解析指令残留。
- `agent-browser` 在 OpenCode 中通过 Bash 按其 skill 的快照-引用流程使用。
- 用户配置可覆盖模型等选择，但不得覆盖受管的 mode、prompt 和安全权限。
- MCP 环境变量只保留引用模板，不把密钥写入仓库或命令输出。

## 版本与来源

- 不擅自发明版本。源版本变化时，同步目标 `package.json`、描述、README、版本断言和 `manifest/upstream.json`。
- 源仓库有未提交变更但版本未变化时可以按用户要求同步，但必须报告“来源不可复现”；发布前要求上游先提交或明确接受。
- `manifest/upstream.json` 中的 commit 只能代表已提交快照；不得把脏工作树内容伪称为该 commit 的完整内容。

## 验证门槛

在目标仓库执行：

```bash
npm run validate
npm pack --dry-run --json
git diff --check
```

并额外验证：

- 入口和转换器通过语法检查。
- Agent 数量、prompt 文件和 manifest 一一对应。
- Leader/ SubAgent mode、默认 Agent、权限不回归。
- 包清单包含入口、manifest、prompts、resources、rules 和 skills。
- 搜索 Claude 专属残留并逐项判断是已适配说明还是遗漏。

验证失败时修复转换器并重新同步；不得删除失败测试或把失败归咎于缓存而不举证。

## 授权边界

- “转换/同步”只授权修改目标工作树和必要的转换器/测试。
- 未经明确要求，不提交、不推送、不打 tag、不发布 npm、不修改设备全局 OpenCode 配置。
- 用户要求安装或升级时，先完成仓库验证，再使用 OpenCode 正式插件命令；不要以手工复制缓存替代。

## 交付

报告源/目标路径、源版本与 commit/dirty 状态、变更映射、目标版本、验证结果、未支持能力和当前 Git 状态。明确说明是否已提交、推送或安装。
