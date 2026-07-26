import fs from "node:fs"
import path from "node:path"

export function splitFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  return match
    ? { frontmatter: match[1], body: markdown.slice(match[0].length).trim() }
    : { frontmatter: "", body: markdown.trim() }
}

export function frontmatterDescription(frontmatter) {
  const lines = frontmatter.split(/\r?\n/)
  const index = lines.findIndex((line) => line.startsWith("description:"))
  if (index < 0) return ""
  const inline = lines[index].slice("description:".length).trim()
  if (inline && inline !== "|" && inline !== ">") {
    try {
      return JSON.parse(inline)
    } catch {
      return inline
    }
  }
  const collected = []
  for (const line of lines.slice(index + 1)) {
    if (!/^\s+/.test(line)) break
    collected.push(line.trim())
  }
  return collected.join(" ").trim()
}

export function loadCommands(root) {
  const directory = path.join(root, "commands")
  if (!fs.existsSync(directory)) return {}
  return Object.fromEntries(
    fs.readdirSync(directory)
      .filter((name) => name.endsWith(".md"))
      .sort()
      .map((name) => {
        const markdown = fs.readFileSync(path.join(directory, name), "utf8")
        const { frontmatter, body } = splitFrontmatter(markdown)
        return [
          name.slice(0, -3),
          {
            template: body,
            description: frontmatterDescription(frontmatter),
            agent: "amagi-leader",
          },
        ]
      }),
  )
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

export function createResourceReader(root) {
  const resourcesRoot = fs.realpathSync(path.join(root, "resources"))
  const rulesRoot = fs.realpathSync(path.join(root, "rules"))
  const skillsRoot = fs.realpathSync(path.join(root, "skills"))
  const index = JSON.parse(fs.readFileSync(path.join(resourcesRoot, "core", "index.json"), "utf8"))
  const byId = Object.fromEntries(
    index.modules.map((module) => [module.id, path.join(resourcesRoot, "core", module.path)]),
  )

  return {
    ids: Object.keys(byId),
    read(resource) {
      const named = byId[resource]
      const candidate = named || path.resolve(root, resource)
      if (!fs.existsSync(candidate)) {
        throw new Error(`Unknown Amagi resource: ${resource}`)
      }
      const realCandidate = fs.realpathSync(candidate)
      const allowed = [resourcesRoot, rulesRoot, skillsRoot].some(
        (parent) => isWithin(parent, realCandidate),
      )
      if (!allowed || !fs.statSync(realCandidate).isFile()) {
        throw new Error(`Unknown Amagi resource: ${resource}`)
      }
      return fs.readFileSync(realCandidate, "utf8").trim()
    },
  }
}
