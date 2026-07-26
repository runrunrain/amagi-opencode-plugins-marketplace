#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = path.resolve(
  process.argv[2] || path.join(repositoryRoot, "..", "amagi-plugins-marketplace", "plugins", "amagi"),
)

const requiredPaths = [
  ".claude-plugin/plugin.json",
  ".mcp.json",
  "CLAUDE.template.md",
  "agents",
  "commands",
  "orchestration-profile.json",
  "resources",
  "rules",
  "skills",
]

for (const relativePath of requiredPaths) {
  if (!fs.existsSync(path.join(sourceRoot, relativePath))) {
    throw new Error(`Amagi source is missing ${relativePath}: ${sourceRoot}`)
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), "utf8")
}

function write(relativePath, content) {
  const target = path.join(repositoryRoot, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const normalized = content.replace(/\r\n/g, "\n")
  fs.writeFileSync(target, normalized.endsWith("\n") ? normalized : `${normalized}\n`)
}

function resetDirectory(relativePath) {
  const target = path.join(repositoryRoot, relativePath)
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(target, { recursive: true })
}

function copyTree(sourceRelativePath, targetRelativePath, transform) {
  const source = path.join(sourceRoot, sourceRelativePath)
  const target = path.join(repositoryRoot, targetRelativePath)
  fs.cpSync(source, target, {
    recursive: true,
    filter: (item) => ![".DS_Store", "__pycache__", "node_modules"].includes(path.basename(item)),
  })
  if (!transform) return
  for (const file of walkFiles(target)) {
    if (!/\.(md|json|py)$/.test(file)) continue
    const current = fs.readFileSync(file, "utf8")
    fs.writeFileSync(file, transform(current, file).replace(/\r\n/g, "\n"))
  }
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name)
    return entry.isDirectory() ? walkFiles(item) : [item]
  })
}

function splitFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  return match
    ? { frontmatter: match[1], body: markdown.slice(match[0].length) }
    : { frontmatter: "", body: markdown }
}

function frontmatterDescription(frontmatter) {
  const lines = frontmatter.split(/\r?\n/)
  const index = lines.findIndex((line) => line.startsWith("description:"))
  if (index < 0) return ""
  const inline = lines[index].slice("description:".length).trim()
  if (inline && inline !== "|" && inline !== ">") return inline
  const collected = []
  for (const line of lines.slice(index + 1)) {
    if (!/^\s+/.test(line)) break
    collected.push(line.trim())
  }
  return collected.join(" ").trim()
}

function quoteYaml(value) {
  return JSON.stringify(value)
}

function adaptPointers(text) {
  return text
    .replace(
      /node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/dist\/rage_cli\.js" [^\r\n`]+/g,
      "使用 Read/Grep 检查 `projects-memory` 中的 alias、behavior 与 chain JSON 索引（本转换包不包含上游已缺失的 rage_cli.js）",
    )
    .replaceAll("@resources/", "resources/")
    .replaceAll("Claude Code /workflow", "OpenCode workflow skill")
    .replaceAll("Claude Code=5 / OpenCode=无 / Codex=1", "OpenCode=由本插件禁止 SubAgent 的 task 权限 / Codex=1")
    .replaceAll("`claude --version`", "`opencode --version`")
    .replaceAll("`claude -p`", "`opencode run`")
    .replaceAll("远端 Claude CLI", "远端 OpenCode CLI")
    .replaceAll(
      "Co-Authored-By: Claude <noreply@anthropic.com>",
      "Co-Authored-By: OpenCode <noreply@opencode.ai>",
    )
    .replaceAll(
      "优先在 Windows 且 `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` 时使用 PowerShell 工具。PowerShell 工具不可用时，可由 Bash 调用可发现的 `powershell.exe -NoProfile -File <script>`；两者均不可用则停止，不能假装已执行。",
      "在 Windows 上由 Bash 调用可发现的 `powershell.exe -NoProfile -File <script>`；不可用时停止，不能假装已执行。",
    )
    .replaceAll(
      "每个任务必须指定是否需要 worktree 隔离（isolation: 'worktree'）",
      "每个任务必须指定是否需要 worktree 隔离；需要时由 Leader/taibai 预先创建，并把绝对路径写入 Task Contract（不得向 task 传 isolation 参数）",
    )
    .replaceAll(
      "deep 模式使用 Claude Code 原生 Agent Teams 机制。",
      "deep 模式使用 OpenCode Leader 协调的并行 SubAgent 机制。",
    )
    .replaceAll(
      "通过 Agent 工具以 `team_name` 参数 spawn 为 teammate",
      "由 Leader 通过 `task` 调用分派为 SubAgent",
    )
    .replaceAll("通过 Agent Team 通信", "通过 task 结果与 Leader 中转")
    .replaceAll("P2P（无需 Leader 中转）", "经 Leader 中转")
    .replaceAll("P2P，无需 Leader 中转", "经 Leader 中转")
    .replaceAll("与队友 P2P", "跨成员信息经 Leader 中转")
    .replaceAll("P2P 直接对话", "跨成员信息由 Leader 中转")
    .replaceAll("P2P", "Leader 中转通信")
    .replaceAll("Leader 中转通信 通信", "Leader 中转通信")
    .replaceAll("Agent 工具", "`task` 工具")
    .replaceAll("Teammate", "SubAgent")
    .replaceAll("teammate", "SubAgent")
    .replaceAll("创建 Team", "建立逻辑协作组")
    .replaceAll("清理 Team", "结束逻辑协作组")
    .replaceAll("✓ 已启用 Agent Teams 机制", "✓ 已启用 Leader 协调的多 SubAgent 模式")
}

const plugin = JSON.parse(read(".claude-plugin/plugin.json"))
const profile = JSON.parse(read("orchestration-profile.json"))

resetDirectory("prompts")
const leaderAdapter = [
  "# OpenCode 适配说明",
  "",
  `本提示词由 Amagi Claude Code 插件 ${plugin.version} 转换而来。`,
  "资源路径不会由 OpenCode 自动展开；需要细则时调用 `amagi_resource`，传资源 ID（推荐）或插件内相对路径。",
  "OpenCode 的 `agent_team` 表示由 Leader 调度多个可并行 SubAgent；没有原生 P2P 通信，也不要向 task 传递 `isolation`/worktree 参数。",
  "SubAgent 的 `task` 权限已由插件设为 deny，不得递归分派。",
  "",
].join("\n")
write("prompts/amagi-leader.md", `${leaderAdapter}\n${adaptPointers(read("CLAUDE.template.md"))}`)

for (const entry of fs.readdirSync(path.join(sourceRoot, "agents"), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".md")) continue
  const source = read(path.join("agents", entry.name))
  const { body } = splitFrontmatter(source)
  const adapter = [
    "# OpenCode 适配说明",
    "",
    `本角色定义同步自 Amagi ${plugin.version}。需要引用 canonical 细则时调用 \`amagi_resource\`；不要把 \`resources/...\` 当作当前项目路径。`,
    "工具名按 OpenCode 解释：Browser 能力由当前可用浏览器工具/MCP 承担；SubAgent 不得调用 task。",
    "",
  ].join("\n")
  write(path.join("prompts", entry.name), `${adapter}\n${adaptPointers(body)}`)
}

resetDirectory("commands")
for (const entry of fs.readdirSync(path.join(sourceRoot, "commands"), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".md")) continue
  const source = read(path.join("commands", entry.name))
  const { frontmatter, body } = splitFrontmatter(source)
  const description = frontmatterDescription(frontmatter) || entry.name.replace(/\.md$/, "")
  const converted = [
    "---",
    `description: ${quoteYaml(description)}`,
    "agent: amagi-leader",
    "---",
    "",
    adaptPointers(body).replace(
      "不会永久切换 Claude/Codex 的执行宿主",
      "不会永久切换 OpenCode/Codex 的执行宿主",
    ),
  ].join("\n")
  write(path.join("commands", entry.name), converted)
}

resetDirectory("skills")
copyTree("skills", "skills", (content, file) => {
  let converted = adaptPointers(content)
  if (path.basename(file) !== "SKILL.md") return converted
  const directoryName = path.basename(path.dirname(file))
  converted = converted.replace(/^name:\s*.+$/m, `name: ${directoryName}`)
  const marker = converted.indexOf("\n---", 4)
  if (marker >= 0) {
    const frontmatter = converted.slice(0, marker)
    if (!/^compatibility:/m.test(frontmatter)) {
      converted = `${frontmatter}\ncompatibility: opencode${converted.slice(marker)}`
    }
  }
  const split = splitFrontmatter(converted)
  const note = [
    "> OpenCode 适配：需要 canonical 资源时调用 `amagi_resource`。角色调用使用本插件 Agent 名（如 `baize`、`cangjie`）；",
    "> 原生 Agent Teams/P2P 不可用，团队步骤由 Leader 通过多个 `task` 调用协调。未打包的 `rage_cli.js` 不可调用，改用项目 JSON 索引与 Read/Grep 直接核验。",
    "",
  ].join("\n")
  return `---\n${split.frontmatter}\n---\n\n${note}${split.body}`
})

resetDirectory("resources")
copyTree("resources", "resources", (content) => adaptPointers(content))
resetDirectory("rules")
copyTree("rules", "rules", (content) => adaptPointers(content))

const modeAdapter = [
  "> **OpenCode adapter（优先于下文的跨 harness 描述）**：",
  "> - `agent_team` 在本插件中表示 Leader 调度多个 OpenCode SubAgent，可用 background task 并行独立方向；所有通信与交接都经 Leader。",
  "> - OpenCode 没有 Claude Agent Teams 的 P2P mailbox，也不接受 `isolation: worktree` task 参数；需要 worktree 时先由 Leader/taibai 显式创建并把绝对路径写进 Task Contract。",
  "> - 所有 Amagi SubAgent 的 `task` 权限均为 deny，递归分派由运行时权限和 prompt 双重阻止。",
  "",
].join("\n")
for (const relativePath of [
  "resources/core/collaboration/agent-teams-mode.md",
  "resources/core/collaboration/mode-selection.md",
  "resources/core/collaboration/subagent-mode.md",
  "resources/core/collaboration/workflow-rules.md",
]) {
  const current = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8")
  fs.writeFileSync(path.join(repositoryRoot, relativePath), `${modeAdapter}${current}`)
}

const teamsModePath = path.join(repositoryRoot, "resources/core/collaboration/agent-teams-mode.md")
const teamsMode = fs.readFileSync(teamsModePath, "utf8")
fs.writeFileSync(
  teamsModePath,
  teamsMode
    .replace("## Leader 中转通信 通信规则", "## Leader 中转通信规则")
    .replace(
      "通信: 向 Leader 报告 + 跨成员信息经 Leader 中转，触发条件与消息格式见下节",
      "通信: task 完成时向 Leader 返回；跨成员信息由 Leader 根据 artifact 与结果中转",
    )
    .replace(
      "通信是工作的一部分，不是完成后的附属品；spawn prompt 必须包含通信协议与协作伙伴清单。",
      "通信是工作的一部分；spawn prompt 必须包含结果报告协议与协作伙伴清单。OpenCode SubAgent 在 task 完成时返回，需提前报告的事项写入中间 artifact，并由 Leader 在后续 Phase 中转。",
    )
    .replace(
      "成员所有消息都发 Leader 中转，不与其他成员直接交流。",
      "成员假设可以直接联系其他成员，因而没有把跨成员信息写入结果或 artifact。",
    )
    .replace(
      "点对点 message 默认；broadcast 成本随人数线性增长，仅 Leader 在 Phase 切换或全局约束变更时使用。",
      "OpenCode 没有点对点 message/broadcast；Leader 仅在 Phase 切换或全局约束变更时，把必要信息写入后续 task prompt。",
    )
    .replace(
      "Leader → 成员：进度催促、方向修正、上下文补充、Phase 推进（附前序 artifact 完整路径，可用 broadcast）、质量反馈。",
      "Leader → 成员：通过后续 task prompt 传递方向修正、上下文补充、Phase 推进（附前序 artifact 完整路径）与质量反馈。",
    )
    .replace(
      "发现风险 | 风险 + 影响评估 + 建议方案；发现即报，不等任务完成",
      "发现风险 | 写入中间 artifact，并在 task 结果中返回风险 + 影响评估 + 建议方案",
    )
    .replace(
      "成员只在任务 100% 完成时才发第一条消息。",
      "成员只返回一句完成，不提供进度证据、中间 artifact、风险或阻塞。",
    ),
)

const modeSelectionPath = path.join(repositoryRoot, "resources/core/collaboration/mode-selection.md")
const modeSelection = fs.readFileSync(modeSelectionPath, "utf8")
fs.writeFileSync(
  modeSelectionPath,
  modeSelection
    .replace(
      "| 通信方式 | 仅向主 Agent 报告结果 | 触发式主动通信（进度/风险/阻塞即报）+ 跨成员信息由 Leader 中转 |",
      "| 通信方式 | 仅向 Leader 报告结果 | 触发式主动报告（进度/风险/阻塞即报），跨成员信息由 Leader 中转 |",
    )
    .replace(
      "| Worktree 隔离 | Task 工具支持 `isolation:'worktree'` 参数，SubAgent 在独立 worktree 中工作，适合写操作并行 | 每个 SubAgent 是独立实例，天然隔离无需 worktree |",
      "| Worktree 隔离 | 由 Leader/taibai 显式创建 worktree，再把绝对路径写入 Task Contract；不得向 task 传 isolation 参数 | 各 SubAgent 仍共享当前工作区语义；写操作必须按文件边界串行或显式 worktree 隔离 |",
    )
    .replace(
      "| 独立模块并行开发 | 多个 SubAgent 分别负责不同模块，模块间文件无交叉 | 推荐 `isolation:'worktree'` 并行执行，消除冲突风险，提升效率 |",
      "| 独立模块并行开发 | 多个 SubAgent 分别负责不同模块，模块间文件无交叉 | 可并行；如需隔离，先显式创建 worktree 并传绝对路径 |",
    )
    .replace(
      "- SubAgent 写操作 + 并行风险 → 推荐 `isolation:'worktree'`",
      "- SubAgent 写操作 + 并行风险 → 先显式创建 worktree 并传绝对路径，或改为串行",
    )
    .replace(
      "- Agent Teams SubAgent 天然隔离，无需 worktree",
      "- OpenCode SubAgent 不视为天然文件隔离；写操作必须明确文件边界",
    )
    .replace(
      "- Agent Teams SubAgent（已是独立实例，天然隔离无需 worktree）",
      "- OpenCode SubAgent 仍须明确文件边界；需要文件隔离时显式创建 worktree",
    ),
)

const knowledgeTeamPath = path.join(
  repositoryRoot,
  "skills/project-knowledge-builder/references/agent-team-protocol.md",
)
const knowledgeTeam = fs.readFileSync(knowledgeTeamPath, "utf8")
fs.writeFileSync(
  knowledgeTeamPath,
  knowledgeTeam
    .replace("- [创建 Agent Team](#创建-agent-team)", "- [建立逻辑协作组](#建立逻辑协作组)")
    .replace(
      "[1] 创建 Agent Team（Leader 建立逻辑协作组（无独立工具调用））",
      "[1] Leader 建立逻辑协作组（无独立工具调用）",
    )
    .replace(
      "[5] 清理团队（Leader 结束逻辑协作组（无独立工具调用））→ 完成",
      "[5] Leader 结束逻辑协作组（无独立工具调用）→ 完成",
    )
    .replaceAll("explorer 之间可 Leader 中转通信 共享跨领域发现", "explorer 的跨领域发现由 Leader 中转")
    .replaceAll("TeamCreate", "Leader 建立逻辑协作组（无独立工具调用）")
    .replaceAll("TeamDelete", "Leader 结束逻辑协作组（无独立工具调用）")
    .replaceAll("SendMessage → leader", "task 返回 → Leader")
    .replace(
      /## 创建 Agent Team[\s\S]*?---\r?\n\r?\n## Explorer SubAgent Spawn/,
      [
        "## 建立逻辑协作组",
        "",
        "OpenCode 不需要创建原生 Team。Leader 维护 Phase、成员职责、依赖与 artifact 清单，",
        "并通过多个 `task` 调用分派 SubAgent；独立方向可并行，有依赖的方向必须跨 Phase 串行。",
        "",
        "---",
        "",
        "## Explorer SubAgent Spawn",
      ].join("\n"),
    )
    .replaceAll("spawn explorer teammate", "调用 explorer SubAgent")
    .replaceAll("spawn writer teammate", "调用 writer SubAgent")
    .replaceAll("spawn 或复用 explorer teammate", "调用或复用 explorer SubAgent")
    .replaceAll("explorer teammate", "explorer SubAgent")
    .replaceAll("writer teammate", "writer SubAgent")
    .replaceAll("Teammate", "SubAgent")
    .replaceAll("teammate", "SubAgent")
    .replaceAll(
      "直接通知负责相关方向的 explorer",
      "在结果与 artifact 中标注目标方向，由 Leader 传给负责该方向的 explorer",
    )
    .replaceAll(
      "直接通知其他 explorer 与 writer",
      "在结果与 artifact 中注明，由 Leader 传给其他 explorer 与 writer",
    )
    .replaceAll(
      "直接向掌握该方向的 explorer 请求补证",
      "向 Leader 报告补证需求，由 Leader 启动后续 task",
    )
    .replaceAll(
      "直接向对应 explorer 请求补充",
      "向 Leader 报告缺口，由 Leader 启动补充 task",
    )
    .replaceAll(
      "主动发起对齐，要求提供更强 evidenceRefs",
      "向 Leader 报告冲突，由 Leader 启动对齐或补证 task",
    )
    .replaceAll(
      "完成一轮后可直接通知另一个 explorer SubAgent",
      "完成一轮后由 Leader 把结果传给另一个 explorer SubAgent",
    )
    .replaceAll(
      "每完成一个维度后：发送进度更新（如\"3/5维度完成\"）",
      "每完成一个维度后：将进度（如\"3/5维度完成\"）写入中间 artifact",
    )
    .replaceAll(
      "发现风险或异常结构时：立即报告，不等全部完成",
      "发现风险或异常结构时：立即写入中间 artifact，并在 task 返回中置顶报告",
    )
    .replaceAll(
      "识别到高频概念、主链路、枢纽节点或证据源时：尽早报告，便于 Leader 提前决定是否需要 relations/chains",
      "识别到高频概念、主链路、枢纽节点或证据源时：写入中间 artifact，供 Leader 决定是否需要 relations/chains",
    )
    .replaceAll(
      "主动通知\"我的报告已就绪\" + 文件位置",
      "在 task 结果中注明\"我的报告已就绪\" + 文件位置，由 Leader 转交",
    )
    .replaceAll(
      "### 与其他 SubAgent 直接通信（Leader 中转通信）",
      "### 跨 SubAgent 信息（由 Leader 中转）",
    )
    .replaceAll(
      "### 与 Explorer 通信（Leader 中转通信）",
      "### 与 Explorer 协作（由 Leader 中转）",
    ),
)

for (const relativePath of [
  "skills/project-knowledge-builder/SKILL.md",
  "skills/project-knowledge-builder/references/output-generation-rules.md",
]) {
  const target = path.join(repositoryRoot, relativePath)
  const current = fs.readFileSync(target, "utf8")
  fs.writeFileSync(
    target,
    current.replace(
      /(?:2\. 调用 )?`node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/dist\/rage_cli\.js" ([^`]+)`/g,
      "使用 Read/Grep 检查 `projects-memory` 中的 alias、behavior 与 chain JSON 索引（本转换包不包含上游已缺失的 rage_cli.js）",
    ),
  )
}

write("manifest/upstream-orchestration-profile.json", JSON.stringify(profile, null, 2))

const upstreamMcp = JSON.parse(read(".mcp.json")).mcpServers
const existingMcp = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "mcp", "servers.json"), "utf8"))
const convertedServers = {
  memory: existingMcp.servers.memory,
  ...Object.fromEntries(
    Object.entries(upstreamMcp).map(([name, server]) => {
      if (server.type === "http") {
        return [
          name,
          {
            type: "remote",
            url: server.url,
            headers: Object.fromEntries(
              Object.entries(server.headers || {}).map(([key, value]) => [
                key,
                String(value).replace(/\$\{([A-Z0-9_]+)\}/g, "{env:$1}"),
              ]),
            ),
            enabled: false,
            oauth: false,
          },
        ]
      }
      return [
        name,
        {
          type: "local",
          command: [server.command, ...(server.args || [])],
          environment: Object.fromEntries(
            Object.entries(server.env || {}).map(([key, value]) => [
              key,
              String(value).replace(/\$\{([A-Z0-9_]+)\}/g, "{env:$1}"),
            ]),
          ),
          enabled: false,
        },
      ]
    }),
  ),
}
write("mcp/servers.json", JSON.stringify({ servers: convertedServers }, null, 2))

let commit = "unknown"
try {
  const marketplaceRoot = path.resolve(sourceRoot, "..", "..")
  commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: marketplaceRoot, encoding: "utf8" }).trim()
} catch {
  // A source archive may not include Git metadata.
}

write(
  "manifest/upstream.json",
  JSON.stringify(
    {
      name: plugin.name,
      version: plugin.version,
      commit,
      sourcePath: "plugins/amagi",
      convertedAssets: {
        leader: "CLAUDE.template.md",
        agents: 12,
        commands: fs.readdirSync(path.join(repositoryRoot, "commands")).filter((name) => name.endsWith(".md")).length,
        skills: fs.readdirSync(path.join(repositoryRoot, "skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).length,
        resources: walkFiles(path.join(repositoryRoot, "resources")).length,
        rules: walkFiles(path.join(repositoryRoot, "rules")).length,
      },
    },
    null,
    2,
  ),
)

console.log(`Synced Amagi ${plugin.version} (${commit.slice(0, 12)}) from ${sourceRoot}`)
