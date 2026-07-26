#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const inferredSource = path.resolve(scriptDirectory, "../../..")

function usage() {
  console.log(`Usage:
  node sync.mjs --source <claude-plugin-root> --target <opencode-plugin-root> [options]

Options:
  --check-only      Validate paths and report repository state without writing
  --allow-dirty     Permit an already-dirty target after manual review
  --skip-validate   Skip target npm validation
  -h, --help        Show this help`)
}

function parseArgs(argv) {
  const result = {
    source: inferredSource,
    target: process.env.AMAGI_OPENCODE_PLUGIN_ROOT || "",
    checkOnly: false,
    allowDirty: false,
    skipValidate: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--source" || value === "--target") {
      const next = argv[index + 1]
      if (!next || next.startsWith("-")) throw new Error(`${value} requires a path`)
      result[value.slice(2)] = path.resolve(next)
      index += 1
      continue
    }
    if (value === "--check-only") result.checkOnly = true
    else if (value === "--allow-dirty") result.allowDirty = true
    else if (value === "--skip-validate") result.skipValidate = true
    else if (value === "-h" || value === "--help") result.help = true
    else throw new Error(`unknown argument: ${value}`)
  }
  if (!result.target) {
    result.target = path.resolve(result.source, "../../..", "opencode-plugin")
  }
  return result
}

function requirePath(root, relativePath, kind) {
  const target = path.join(root, relativePath)
  if (!fs.existsSync(target)) throw new Error(`${kind} is missing ${relativePath}: ${root}`)
}

function git(root, args) {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trimEnd()
  } catch (error) {
    throw new Error(`git ${args.join(" ")} failed in ${root}: ${error.message}`)
  }
}

function json(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"))
}

function repositoryState(root) {
  return {
    branch: git(root, ["status", "-sb"]).split("\n")[0],
    commit: git(root, ["rev-parse", "HEAD"]),
    changes: git(root, ["status", "--porcelain=v1", "--untracked-files=all", "--", "."])
      .split("\n")
      .filter(Boolean),
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    usage()
    return
  }

  const source = path.resolve(options.source)
  const target = path.resolve(options.target)
  for (const required of [
    ".claude-plugin/plugin.json",
    "CLAUDE.template.md",
    "agents",
    "commands",
    "skills",
    "resources",
    "rules",
  ]) {
    requirePath(source, required, "Claude plugin")
  }
  for (const required of ["package.json", "index.js", "scripts/sync-upstream.mjs"]) {
    requirePath(target, required, "OpenCode plugin")
  }

  const sourceState = repositoryState(source)
  const targetState = repositoryState(target)
  const sourcePackage = json(source, ".claude-plugin/plugin.json")
  const targetPackage = json(target, "package.json")
  const report = {
    source,
    target,
    sourceVersion: sourcePackage.version,
    targetVersion: targetPackage.version,
    sourceBranch: sourceState.branch,
    targetBranch: targetState.branch,
    sourceCommit: sourceState.commit,
    sourceDirty: sourceState.changes.length > 0,
    targetDirty: targetState.changes.length > 0,
    targetChangesBefore: targetState.changes,
  }

  if (options.checkOnly) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  if (targetState.changes.length > 0 && !options.allowDirty) {
    throw new Error(
      `target repository has ${targetState.changes.length} change(s); review them first or rerun with --allow-dirty`,
    )
  }

  execFileSync(process.execPath, [path.join(target, "scripts", "sync-upstream.mjs"), source], {
    cwd: target,
    stdio: "inherit",
  })
  if (!options.skipValidate) {
    execFileSync("npm", ["run", "validate"], { cwd: target, stdio: "inherit" })
  }

  const after = repositoryState(target)
  console.log(JSON.stringify({
    ...report,
    targetBranchAfter: after.branch,
    targetChangesAfter: after.changes,
    sourceReproducible: sourceState.changes.length === 0,
    note: "This script does not commit, push, publish, or install the plugin.",
  }, null, 2))
}

try {
  main()
} catch (error) {
  console.error(`sync-opencode-plugin: ${error.message}`)
  process.exitCode = 1
}
