import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { tool } from "@opencode-ai/plugin"

import { createResourceReader, loadCommands } from "./lib/assets.js"
import { assertCommitSafe, assertJsonFile, assertSafeCommand } from "./lib/guards.js"

const root = path.dirname(fileURLToPath(import.meta.url))
const specification = readJson("manifest/agents.json")
const mcpSpecification = readJson("mcp/servers.json")
const upstreamProfile = readJson("manifest/upstream-orchestration-profile.json")
const upstream = readJson("manifest/upstream.json")
const commandSpecification = loadCommands(root)
const resourceReader = createResourceReader(root)

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").trim()
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath))
}

function defaultUserConfig() {
  return {
    profile: "tiered",
    default_agent: specification.leader,
    tiers: {
      leader: { model: "openai/gpt-5.6-terra", variant: "medium" },
      expert: { model: "openai/gpt-5.6-sol", variant: "high" },
      worker: { model: "zhipuai/glm-5.2", variant: "max" },
      fast: { model: "zhipuai/glm-5-turbo", variant: "high" },
    },
    // A concrete per-agent override makes the generated file self-documenting.
    // It has a higher priority than the agent's tier; users can edit, remove, or
    // duplicate this entry for any agent listed in README.md.
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
  }
}

export function resolveAmagiConfigPath(options = {}, runtime = {}) {
  const environment = runtime.environment || process.env
  const platform = runtime.platform || process.platform
  const home = runtime.home || os.homedir()
  const pathApi = platform === "win32" ? path.win32 : path
  if (options.config) return pathApi.resolve(String(options.config))
  if (environment.AMAGI_OPENCODE_CONFIG) return pathApi.resolve(environment.AMAGI_OPENCODE_CONFIG)
  if (environment.OPENCODE_CONFIG_DIR) return pathApi.resolve(environment.OPENCODE_CONFIG_DIR, "amagi-opencode.json")
  if (environment.OPENCODE_CONFIG) return pathApi.resolve(pathApi.dirname(environment.OPENCODE_CONFIG), "amagi-opencode.json")
  const configHome = platform === "win32"
    ? pathApi.join(home, ".config")
    : environment.XDG_CONFIG_HOME || pathApi.join(home, ".config")
  return pathApi.join(configHome, "opencode", "amagi-opencode.json")
}

function legacyWindowsConfigPath(options = {}) {
  if (process.platform !== "win32") return
  if (options.config || process.env.AMAGI_OPENCODE_CONFIG || process.env.OPENCODE_CONFIG_DIR || process.env.OPENCODE_CONFIG) return
  const appData = process.env.APPDATA || process.env.LOCALAPPDATA
  if (!appData) return
  return path.join(appData, "opencode", "amagi-opencode.json")
}

function migrateLegacyWindowsConfig(target, options) {
  const legacy = legacyWindowsConfigPath(options)
  if (!legacy || fs.existsSync(target) || !fs.existsSync(legacy)) return
  fs.mkdirSync(path.dirname(target), { recursive: true })
  try {
    fs.renameSync(legacy, target)
  } catch (error) {
    if (error?.code !== "EXDEV") throw error
    fs.copyFileSync(legacy, target, fs.constants.COPYFILE_EXCL)
    fs.unlinkSync(legacy)
  }
}

function readUserConfig(options) {
  const file = resolveAmagiConfigPath(options)
  migrateLegacyWindowsConfig(file, options)
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    try {
      fs.writeFileSync(file, `${JSON.stringify(defaultUserConfig(), null, 2)}\n`, { encoding: "utf8", flag: "wx" })
    } catch (error) {
      if (error?.code !== "EEXIST") throw error
    }
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Amagi config root must be an object: ${file}`)
  }
  return { file, data }
}

function resolveProfile(options, userConfig) {
  const name = options.profile || userConfig.profile || process.env.AMAGI_OPENCODE_PROFILE || "tiered"
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`invalid Amagi profile: ${name}`)
  const profile = readJson(`profiles/${name}.json`)
  if (!profile?.tiers) throw new Error(`Amagi profile has no tiers: ${name}`)
  return profile
}

function validateOverrides(userConfig) {
  const allowedKeys = new Set(["$schema", "profile", "default_agent", "tiers", "agents", "mcp"])
  const tierNames = new Set(["leader", "expert", "worker", "fast"])
  const agentNames = new Set(Object.keys(specification.agents))
  for (const key of Object.keys(userConfig)) {
    if (!allowedKeys.has(key)) throw new Error(`unknown Amagi config key: ${key}`)
  }
  if (userConfig.profile !== undefined && typeof userConfig.profile !== "string") {
    throw new Error("Amagi profile must be a string")
  }
  if (userConfig.default_agent !== undefined && userConfig.default_agent !== false && typeof userConfig.default_agent !== "string") {
    throw new Error("Amagi default_agent must be a string or false")
  }
  for (const key of ["tiers", "agents", "mcp"]) {
    const value = userConfig[key]
    if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) {
      throw new Error(`Amagi ${key} must be an object`)
    }
  }
  for (const [name, value] of Object.entries(userConfig.tiers || {})) {
    if (!tierNames.has(name)) throw new Error(`unknown Amagi tier: ${name}`)
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`tier ${name} must be an object`)
  }
  for (const [name, value] of Object.entries(userConfig.agents || {})) {
    if (!agentNames.has(name)) throw new Error(`unknown Amagi agent: ${name}`)
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`agent ${name} must be an object`)
  }
  for (const [name, value] of Object.entries(userConfig.mcp || {})) {
    if (!Object.hasOwn(mcpSpecification.servers, name)) throw new Error(`unknown Amagi MCP server: ${name}`)
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`MCP server ${name} must be an object`)
  }
}

function applyOverrides(target, ...overrides) {
  const result = { ...target }
  for (const override of overrides) {
    if (!override) continue
    for (const [key, value] of Object.entries(override)) {
      if (["description", "mode", "prompt", "permission"].includes(key)) continue
      if (value === null) delete result[key]
      else result[key] = value
    }
  }
  return result
}

function buildPrompt(name) {
  return read(`prompts/${name}.md`)
}

function buildAgents(profile, userConfig) {
  return Object.fromEntries(
    Object.entries(specification.agents).map(([name, agent]) => {
      const tier = profile.tiers[agent.tier]
      if (!tier) throw new Error(`profile ${profile.name} is missing tier ${agent.tier}`)
      const configured = applyOverrides(tier, userConfig.tiers?.[agent.tier], userConfig.agents?.[name])
      return [
        name,
        {
          description: agent.description,
          mode: agent.mode,
          prompt: buildPrompt(name),
          permission: agent.permission,
          ...configured,
        },
      ]
    }),
  )
}

function resolveEnvironmentTemplates(value) {
  if (typeof value === "string") {
    return value.replace(/\{env:([A-Z0-9_]+)\}/g, (_match, name) => {
      if (name === "ZHIPU_API_KEY") return process.env.ZHIPU_API_KEY || process.env.ZHIPU_MCP_API_KEY || ""
      return process.env[name] || ""
    })
  }
  if (Array.isArray(value)) return value.map(resolveEnvironmentTemplates)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveEnvironmentTemplates(item)]))
  }
  return value
}

function mergeMcp(base, override) {
  const merged = {
    ...base,
    ...(override || {}),
    headers: { ...(base.headers || {}), ...(override?.headers || {}) },
    environment: { ...(base.environment || {}), ...(override?.environment || {}) },
  }
  if (!Object.keys(merged.headers).length) delete merged.headers
  if (!Object.keys(merged.environment).length) delete merged.environment
  return resolveEnvironmentTemplates(merged)
}

function mergePermissions(managed, existing) {
  const merged = {
    ...managed,
    ...(typeof existing === "string" ? { "*": existing } : existing || {}),
  }
  if (managed.task !== undefined) merged.task = managed.task
  return merged
}

function buildMcp(userConfig) {
  return Object.fromEntries(
    Object.entries(mcpSpecification.servers).map(([name, server]) => [name, mergeMcp(server, userConfig.mcp?.[name])]),
  )
}

export const AmagiOpenCodePlugin = async (_context, options = {}) => {
  const { file: userConfigFile, data: userConfig } = readUserConfig(options)
  validateOverrides(userConfig)
  const profile = resolveProfile(options, userConfig)
  const agents = buildAgents(profile, userConfig)
  const mcpServers = buildMcp(userConfig)
  const projectDirectory = _context?.directory || process.cwd()
  const skillsPath = path.join(root, "skills")

  const amagiResource = tool({
    description: `读取 Amagi ${upstream.version} 的 canonical 规则、协作资源或技能附件。推荐资源 ID：${resourceReader.ids.join(", ")}`,
    args: {
      resource: tool.schema.string().describe(
        "资源 ID，或 resources/、rules/、skills/ 下的插件内相对路径",
      ),
    },
    async execute({ resource }) {
      return resourceReader.read(resource)
    },
  })

  return {
    tool: {
      amagi_resource: amagiResource,
    },
    config: async (config) => {
      config.agent ||= {}
      for (const [name, managed] of Object.entries(agents)) {
        const existing = config.agent[name] || {}
        config.agent[name] = {
          ...managed,
          ...existing,
          description: managed.description,
          mode: managed.mode,
          prompt: managed.prompt,
          permission: mergePermissions(managed.permission, existing.permission),
        }
      }

      config.mcp ||= {}
      for (const [name, managed] of Object.entries(mcpServers)) {
        config.mcp[name] = mergeMcp(managed, config.mcp[name])
      }

      config.command ||= {}
      for (const [name, managed] of Object.entries(commandSpecification)) {
        config.command[name] = {
          ...managed,
          ...(config.command[name] || {}),
        }
      }

      config.skills ||= {}
      config.skills.paths = [...new Set([...(config.skills.paths || []), skillsPath])]

      if (!config.default_agent) {
        if (userConfig.default_agent !== false) {
          config.default_agent = userConfig.default_agent || specification.leader
        }
      }
    },
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        const command = String(output.args?.command || "")
        assertSafeCommand(command)
        assertCommitSafe(command, projectDirectory, upstreamProfile.commit_guard)
      }
      if (input.tool === "task") {
        recordAgentInvocation(userConfigFile, output.args)
      }
    },
    "tool.execute.after": async (input) => {
      const files = modifiedJsonFiles(input.tool, input.args, projectDirectory)
      for (const file of files) assertJsonFile(file)
    },
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(
        [
          `Amagi ${upstream.version} continuation contract: preserve the user's objective, task tier, current execution/review mode,`,
          "Task Contracts, required artifact absolute paths, changed files, validation evidence, unresolved risks,",
          "active SubAgent task IDs, and the exact next gate. Do not mark unverified work complete after compaction.",
        ].join(" "),
      )
    },
  }
}

function modifiedJsonFiles(toolName, args, directory) {
  if (["write", "edit"].includes(toolName) && args?.filePath) {
    const file = path.isAbsolute(args.filePath) ? args.filePath : path.join(directory, args.filePath)
    return file.toLowerCase().endsWith(".json") ? [file] : []
  }
  if (toolName !== "apply_patch" || typeof args?.patchText !== "string") return []
  return [...args.patchText.matchAll(/^\*\*\* (?:Add|Update) File: (.+\.json)\s*$/gim)]
    .map((match) => match[1].trim())
    .map((file) => path.isAbsolute(file) ? file : path.join(directory, file))
}

function recordAgentInvocation(configFile, args) {
  const agent = args?.subagent_type
  if (typeof agent !== "string" || !Object.hasOwn(specification.agents, agent)) return
  const tier = String(args?.prompt || "").match(/\[TASK_TIER:\s*(simple|medium|complex)\]/i)?.[1]?.toLowerCase() || "medium"
  const statsFile = path.join(path.dirname(configFile), "amagi-agent-stats.json")
  let data = { version: 1, total_invocations: 0, agents: {} }
  try {
    data = JSON.parse(fs.readFileSync(statsFile, "utf8"))
  } catch {
    // The observation hook is best-effort and starts from an empty document.
  }
  const now = new Date().toISOString()
  const current = data.agents?.[agent]?.[tier] || { count: 0, first_seen: now }
  current.count += 1
  current.last_seen = now
  data.total_invocations = (data.total_invocations || 0) + 1
  data.last_updated = now
  data.agents ||= {}
  data.agents[agent] ||= {}
  data.agents[agent][tier] = current
  const temporary = `${statsFile}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`)
    fs.renameSync(temporary, statsFile)
  } catch {
    try {
      fs.unlinkSync(temporary)
    } catch {
      // Statistics must never block task execution.
    }
  }
}
