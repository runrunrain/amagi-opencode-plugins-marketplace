import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

const dangerousCommands = [
  [/\bwhile\s+true\b/i, "无限循环：while true"],
  [/\bwhile\s*\(\s*true\s*\)/i, "无限循环：while(true)"],
  [/\bwhile\s+:\s*[;\n]/im, "无限循环：while :"],
  [/\bfor\s*\(\s*;\s*;\s*\)/i, "无限循环：for(;;)"],
  [/\bwhile\s*\[\s*1\s*\]/i, "无限循环：while [ 1 ]"],
  [/(?<![.\w])(?:raw_)?input\s*\(/i, "非交互任务等待标准输入"],
  [/\bRead-Host\b/i, "PowerShell 等待标准输入"],
  [/\bread\s+-[pe]/i, "Shell 等待标准输入"],
  [/\$host\.UI\.ReadLine/i, "PowerShell 等待标准输入"],
  [/\bsleep\s+\d{4,}\b/i, "超长 sleep"],
  [/\bStart-Sleep\s+(?:-Seconds\s+)?\d{4,}\b/i, "超长 Start-Sleep"],
  [/\bpkill\s+.*bash\b/i, "终止 bash 进程"],
  [/\bkillall\s+bash\b/i, "终止所有 bash 进程"],
  [/\bkill\s+-9\s+-1\b/i, "终止当前用户全部进程"],
  [/\brm\s+-rf\s+\/(?:\s|$)/i, "递归删除根目录"],
]

export function assertSafeCommand(command) {
  for (const [pattern, reason] of dangerousCommands) {
    if (pattern.test(command)) {
      throw new Error(`[AMAGI BLOCKING GUARD] 已阻止危险命令（${reason}）。请改写为有边界、非交互且可终止的命令。`)
    }
  }
}

function gitLines(directory, args) {
  try {
    return execFileSync("git", args, { cwd: directory, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function globPattern(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*")
  return new RegExp(`^${escaped}$`, "i")
}

function sensitiveRule(file, patterns) {
  const basename = path.basename(file).toLowerCase()
  for (const pattern of patterns) {
    if (pattern === ".env" && (basename === ".env" || basename.startsWith(".env."))) return pattern
    if (globPattern(pattern).test(basename)) return pattern
  }
}

export function assertCommitSafe(command, directory, guard) {
  if (!/\bgit\s+commit\b/.test(command)) return
  const includeUnstaged = /(?:^|\s)(?:-[A-Za-z]*a[A-Za-z]*|--all)(?:\s|$)/.test(command)
  const files = new Set(gitLines(directory, ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]))
  if (includeUnstaged) {
    for (const file of gitLines(directory, ["diff", "--name-only", "--diff-filter=ACMR"])) files.add(file)
  }
  const hits = []
  for (const file of files) {
    const normalized = file.replaceAll("\\", "/")
    const rule = sensitiveRule(normalized, guard.block_sensitive_files)
    if (rule) {
      hits.push(`${file}（敏感文件 ${rule}）`)
      continue
    }
    if (guard.block_paths.some((blocked) => normalized.startsWith(blocked) || normalized.includes(`/${blocked}`))) {
      hits.push(`${file}（禁入路径）`)
      continue
    }
    try {
      if (fs.statSync(path.join(directory, file)).size > guard.max_file_mb * 1024 * 1024) {
        hits.push(`${file}（超过 ${guard.max_file_mb}MB）`)
      }
    } catch {
      // Deleted and inaccessible files do not need a size check.
    }
  }
  if (hits.length) {
    throw new Error(`[AMAGI COMMIT GUARD] 提交包含明确不该提交的内容：\n- ${hits.join("\n- ")}`)
  }
}

export function assertJsonFile(filePath) {
  if (!filePath || !filePath.toLowerCase().endsWith(".json") || !fs.existsSync(filePath)) return
  try {
    JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (error) {
    throw new Error(`[AMAGI JSON GUARD] ${filePath} 不是合法 JSON：${error.message}`)
  }
}
