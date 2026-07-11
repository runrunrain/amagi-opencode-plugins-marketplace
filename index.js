import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const specification = readJson("manifest/agents.json")
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

function resolveProfile(options) {
  const name = options.profile || process.env.AMAGI_OPENCODE_PROFILE || "tiered"
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`invalid Amagi profile: ${name}`)
  const profile = readJson(`profiles/${name}.json`)
  if (!profile?.tiers) throw new Error(`Amagi profile has no tiers: ${name}`)
  return profile
}

function buildPrompt(name, mode) {
  const role = read(`prompts/${name}.md`)
  const selected = mode === "primary" ? instructionNames : ["00-baseline.md", "20-task-contract.md"]
  const rules = selected.map((file) => read(`instructions/${file}`)).join("\n\n")
  return `${role}\n\n${rules}`
}

function buildAgents(profile) {
  return Object.fromEntries(
    Object.entries(specification.agents).map(([name, agent]) => {
      const tier = profile.tiers[agent.tier]
      if (!tier) throw new Error(`profile ${profile.name} is missing tier ${agent.tier}`)
      return [
        name,
        {
          description: agent.description,
          mode: agent.mode,
          prompt: buildPrompt(name, agent.mode),
          permission: agent.permission,
          ...tier,
        },
      ]
    }),
  )
}

export const AmagiOpenCodePlugin = async (_context, options = {}) => {
  const profile = resolveProfile(options)
  const agents = buildAgents(profile)

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

      if (!config.default_agent || config.default_agent === specification.leader) {
        config.default_agent = specification.leader
      }
    },
  }
}
