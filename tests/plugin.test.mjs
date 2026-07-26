import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { execFileSync } from "node:child_process"

import { AmagiOpenCodePlugin, resolveAmagiConfigPath } from "../index.js"

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const packageVersionPattern = new RegExp(`Amagi ${packageJson.version.replaceAll(".", "\\.")}`)

test("registers one leader and twelve tiered subagents at runtime", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-defaults-"))
  try {
    const hooks = await AmagiOpenCodePlugin({}, { config: path.join(directory, "amagi-opencode.json") })
    const config = {
      agent: {
        custom: { mode: "primary", model: "provider/custom" },
        luban: { model: "provider/worker-override", permission: "ask" },
        baize: { permission: { task: "allow" } },
      },
    }

    await hooks.config(config)

    const amagiAgents = Object.keys(config.agent).filter((name) => name !== "custom")
    assert.equal(amagiAgents.length, 13)
    assert.equal(config.default_agent, "amagi-leader")
    assert.equal(config.agent["amagi-leader"].mode, "primary")
    assert.equal(config.agent["amagi-leader"].model, "openai/gpt-5.6-terra")
    assert.equal(config.agent.luban.model, "provider/worker-override")
    assert.equal(config.agent.luban.permission["*"], "ask")
    assert.equal(config.agent.luban.permission.task, "deny")
    assert.equal(config.agent.baize.model, "zhipuai/glm-5-turbo")
    assert.equal(config.agent.baize.permission.task, "deny")
    assert.equal(config.agent.diting.permission.edit["*"], "deny")
    assert.equal(config.agent.diting.permission.task, "deny")
    assert.equal(config.agent.taibai.model, "zhipuai/glm-5-turbo")
    assert.match(config.agent["amagi-leader"].prompt, /攻坚型 harness/)
    assert.match(config.agent.luban.prompt, packageVersionPattern)
    assert.match(config.agent.luoshen.prompt, /agent-browser/)
    assert.match(config.agent.luoshen.prompt, /截图并亲自读图/)
    assert.equal(config.agent.custom.model, "provider/custom")
    assert.equal(config.mcp.memory.type, "local")
    assert.deepEqual(config.mcp.memory.command, ["npx", "-y", "@modelcontextprotocol/server-memory"])
    assert.equal(config.mcp.memory.enabled, false)
    assert.equal(config.mcp["web-search-prime"].type, "remote")
    assert.equal(Object.keys(config.command).length, 11)
    assert.match(config.command["pull-all-repos"].template, /\$ARGUMENTS/)
    assert.ok(config.skills.paths.some((item) => item.endsWith("/skills")))
    assert.ok(hooks.tool.amagi_resource)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("exposes converted canonical resources, commands, and skills", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-assets-"))
  try {
    const hooks = await AmagiOpenCodePlugin({}, { config: path.join(directory, "amagi-opencode.json") })
    const workflow = await hooks.tool.amagi_resource.execute({ resource: "workflow" }, {})
    const skill = await hooks.tool.amagi_resource.execute(
      { resource: "skills/workflow/SKILL.md" },
      {},
    )
    assert.match(workflow, /验证层级（L1\/L2\/L3）/)
    assert.match(skill, /OpenCode 适配/)
    await assert.rejects(
      () => hooks.tool.amagi_resource.execute({ resource: "../package.json" }, {}),
      /Unknown Amagi resource/,
    )
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("ports blocking, commit, and JSON guards to native OpenCode hooks", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-guards-"))
  try {
    execFileSync("git", ["init", "-q"], { cwd: directory })
    const hooks = await AmagiOpenCodePlugin(
      { directory },
      { config: path.join(directory, "config", "amagi-opencode.json") },
    )

    await assert.rejects(
      () => hooks["tool.execute.before"](
        { tool: "bash", sessionID: "s", callID: "c" },
        { args: { command: "while true; do echo loop; done" } },
      ),
      /AMAGI BLOCKING GUARD/,
    )

    fs.writeFileSync(path.join(directory, ".env"), "SECRET=test\n")
    execFileSync("git", ["add", ".env"], { cwd: directory })
    await assert.rejects(
      () => hooks["tool.execute.before"](
        { tool: "bash", sessionID: "s", callID: "c" },
        { args: { command: "git commit -m test" } },
      ),
      /AMAGI COMMIT GUARD/,
    )

    const invalid = path.join(directory, "broken.json")
    fs.writeFileSync(invalid, "{")
    await assert.rejects(
      () => hooks["tool.execute.after"](
        { tool: "write", sessionID: "s", callID: "c", args: { filePath: invalid } },
        { title: "", output: "", metadata: {} },
      ),
      /AMAGI JSON GUARD/,
    )
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("preserves Amagi continuation state across compaction", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-compact-"))
  try {
    const hooks = await AmagiOpenCodePlugin({}, { config: path.join(directory, "amagi-opencode.json") })
    const output = { context: [] }
    await hooks["experimental.session.compacting"]({ sessionID: "session" }, output)
    assert.match(output.context.join("\n"), /required artifact absolute paths/)
    assert.match(output.context.join("\n"), /validation evidence/)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("creates a documented user config once without replacing later edits", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-create-"))
  const file = path.join(directory, "nested", "amagi-opencode.json")
  try {
    const hooks = await AmagiOpenCodePlugin({}, { config: file })
    assert.ok(fs.existsSync(file))
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), {
      profile: "tiered",
      default_agent: "amagi-leader",
      tiers: {
        leader: { model: "openai/gpt-5.6-terra", variant: "medium" },
        expert: { model: "openai/gpt-5.6-sol", variant: "high" },
        worker: { model: "zhipuai/glm-5.2", variant: "max" },
        fast: { model: "zhipuai/glm-5-turbo", variant: "high" },
      },
      agents: {
        hongjun: {
          model: "openai/gpt-5.6-sol",
          variant: "max",
        },
      },
      mcp: {
        memory: { enabled: false },
        "web-search-prime": { enabled: true },
        zread: { enabled: true },
        "web-reader": { enabled: true },
        "tavily-mcp": { enabled: false },
        "firecrawl-mcp": { enabled: false },
      },
    })

    fs.writeFileSync(file, JSON.stringify({ profile: "inherit", tiers: {}, agents: {}, mcp: {} }))
    const subsequent = await AmagiOpenCodePlugin({}, { config: file })
    await subsequent.config({ agent: {} })
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).profile, "inherit")
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("resolves the user config path on Windows and custom OpenCode paths", () => {
  assert.equal(
    resolveAmagiConfigPath({}, { platform: "win32", home: "C:\\Users\\me", environment: { APPDATA: "C:\\Users\\me\\AppData\\Roaming" } }),
    path.win32.join("C:\\Users\\me", ".config", "opencode", "amagi-opencode.json"),
  )
  assert.equal(
    resolveAmagiConfigPath({}, { platform: "linux", home: "/home/me", environment: { OPENCODE_CONFIG_DIR: "/tmp/opencode" } }),
    path.resolve("/tmp/opencode", "amagi-opencode.json"),
  )
  assert.equal(
    resolveAmagiConfigPath({}, { platform: "linux", home: "/home/me", environment: { OPENCODE_CONFIG: "/tmp/custom.json" } }),
    path.resolve("/tmp", "amagi-opencode.json"),
  )
})

test("inherit profile leaves models to OpenCode", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-inherit-"))
  try {
    const file = path.join(directory, "amagi-opencode.json")
    fs.writeFileSync(file, JSON.stringify({ profile: "inherit", tiers: {}, agents: {}, mcp: {} }))
    const hooks = await AmagiOpenCodePlugin({}, {
      profile: "inherit",
      config: file,
    })
    const config = { default_agent: "custom", agent: {} }

    await hooks.config(config)

    assert.equal(config.default_agent, "custom")
    assert.equal(Object.hasOwn(config.agent.baize, "model"), false)
    assert.equal(Object.hasOwn(config.agent.luban, "model"), false)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("local config applies tier and agent overrides before opencode.json overrides", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-config-"))
  const file = path.join(directory, "amagi-opencode.json")
  fs.writeFileSync(file, JSON.stringify({
    profile: "tiered",
    tiers: {
      expert: { model: "provider/expert", variant: "deep" },
      worker: { model: "provider/worker" }
    },
    agents: {
      hongjun: { model: "provider/fallback" },
      baize: { model: "provider/fast", variant: null }
    }
  }))

  const previous = process.env.AMAGI_OPENCODE_CONFIG
  process.env.AMAGI_OPENCODE_CONFIG = file
  try {
    const hooks = await AmagiOpenCodePlugin({}, {})
    const config = { agent: { luban: { model: "provider/opencode-json" } } }
    await hooks.config(config)

    assert.equal(config.agent.fuxi.model, "provider/expert")
    assert.equal(config.agent.hongjun.model, "provider/fallback")
    assert.equal(config.agent.baize.model, "provider/fast")
    assert.equal(Object.hasOwn(config.agent.baize, "variant"), false)
    assert.equal(config.agent.luban.model, "provider/opencode-json")
  } finally {
    if (previous === undefined) delete process.env.AMAGI_OPENCODE_CONFIG
    else process.env.AMAGI_OPENCODE_CONFIG = previous
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("rejects unknown agents in local config", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-invalid-"))
  const file = path.join(directory, "amagi-opencode.json")
  fs.writeFileSync(file, JSON.stringify({ agents: { unknown: { model: "provider/model" } } }))
  try {
    await assert.rejects(() => AmagiOpenCodePlugin({}, { config: file }), /unknown Amagi agent: unknown/)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("merges local and opencode MCP overrides without persisting secrets", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "amagi-opencode-mcp-"))
  const file = path.join(directory, "amagi-opencode.json")
  fs.writeFileSync(file, JSON.stringify({
    mcp: {
      "web-search-prime": { enabled: true, timeout: 15000 },
      "tavily-mcp": { enabled: true, environment: { DEFAULT_PARAMETERS: "search_depth=basic" } }
    }
  }))
  const previousConfig = process.env.AMAGI_OPENCODE_CONFIG
  const previousKey = process.env.ZHIPU_MCP_API_KEY
  process.env.AMAGI_OPENCODE_CONFIG = file
  process.env.ZHIPU_MCP_API_KEY = "test-key"
  try {
    const hooks = await AmagiOpenCodePlugin({}, {})
    const config = { mcp: { "web-search-prime": { enabled: false, headers: { "X-User": "keep" } } } }
    await hooks.config(config)

    assert.equal(config.mcp["web-search-prime"].enabled, false)
    assert.equal(config.mcp["web-search-prime"].timeout, 15000)
    assert.equal(config.mcp["web-search-prime"].headers.Authorization, "Bearer test-key")
    assert.equal(config.mcp["web-search-prime"].headers["X-User"], "keep")
    assert.equal(config.mcp["tavily-mcp"].enabled, true)
    assert.equal(config.mcp["tavily-mcp"].environment.TAVILY_API_KEY, "")
    assert.equal(config.mcp["tavily-mcp"].environment.DEFAULT_PARAMETERS, "search_depth=basic")
  } finally {
    if (previousConfig === undefined) delete process.env.AMAGI_OPENCODE_CONFIG
    else process.env.AMAGI_OPENCODE_CONFIG = previousConfig
    if (previousKey === undefined) delete process.env.ZHIPU_MCP_API_KEY
    else process.env.ZHIPU_MCP_API_KEY = previousKey
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
