import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const specification = readJson("manifest/agents.json")
const mcpSpecification = readJson("mcp/servers.json")
const instructionNames = [
  "00-baseline.md",
  "10-orchestration.md",
  "20-task-contract.md",
  "30-quality-gates.md",
  "40-artifact-contract.md",
]

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
    tiers: {},
    agents: {},
    mcp: {},
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
  if (platform === "win32") {
    const appData = environment.APPDATA || environment.LOCALAPPDATA
    if (appData) return pathApi.resolve(appData, "opencode", "amagi-opencode.json")
  }
  const configHome = environment.XDG_CONFIG_HOME || pathApi.join(home, ".config")
  return pathApi.join(configHome, "opencode", "amagi-opencode.json")
}

function readUserConfig(options) {
  const file = resolveAmagiConfigPath(options)
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

function buildPrompt(name, mode) {
  const role = read(`prompts/${name}.md`)
  const selected = mode === "primary" ? instructionNames : ["00-baseline.md", "20-task-contract.md"]
  const rules = selected.map((file) => read(`instructions/${file}`)).join("\n\n")
  return `${role}\n\n${rules}`
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
          prompt: buildPrompt(name, agent.mode),
          permission: agent.permission,
          ...configured,
        },
      ]
    }),
  )
}

function resolveEnvironmentTemplates(value) {
  if (typeof value === "string") {
    return value.replace(/\{env:([A-Z0-9_]+)\}/g, (_match, name) => process.env[name] || "")
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

function buildMcp(userConfig) {
  return Object.fromEntries(
    Object.entries(mcpSpecification.servers).map(([name, server]) => [name, mergeMcp(server, userConfig.mcp?.[name])]),
  )
}

export const AmagiOpenCodePlugin = async (_context, options = {}) => {
  const { data: userConfig } = readUserConfig(options)
  validateOverrides(userConfig)
  const profile = resolveProfile(options, userConfig)
  const agents = buildAgents(profile, userConfig)
  const mcpServers = buildMcp(userConfig)

  return {
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
          permission: {
            ...managed.permission,
            ...(existing.permission || {}),
          },
        }
      }

      config.mcp ||= {}
      for (const [name, managed] of Object.entries(mcpServers)) {
        config.mcp[name] = mergeMcp(managed, config.mcp[name])
      }

      if (!config.default_agent) {
        if (userConfig.default_agent !== false) {
          config.default_agent = userConfig.default_agent || specification.leader
        }
      }
    },
  }
}
