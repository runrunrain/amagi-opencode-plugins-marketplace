import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { AmagiOpenCodePlugin } from "../index.js"

test("registers one leader and twelve tiered subagents at runtime", async () => {
  const hooks = await AmagiOpenCodePlugin({}, { config: path.join(os.tmpdir(), "amagi-opencode-no-user-config.json") })
  const config = {
    agent: {
      custom: { mode: "primary", model: "provider/custom" },
      luban: { model: "provider/worker-override" },
    },
  }

  await hooks.config(config)

  const amagiAgents = Object.keys(config.agent).filter((name) => name !== "custom")
  assert.equal(amagiAgents.length, 13)
  assert.equal(config.default_agent, "amagi-leader")
  assert.equal(config.agent["amagi-leader"].mode, "primary")
  assert.equal(config.agent["amagi-leader"].model, "openai/gpt-5.5")
  assert.equal(config.agent.luban.model, "provider/worker-override")
  assert.equal(config.agent.baize.model, "zhipuai/glm-5-turbo")
  assert.equal(config.agent.diting.permission.edit, "deny")
  assert.match(config.agent["amagi-leader"].prompt, /强编排与模型分层/)
  assert.match(config.agent.luban.prompt, /Task Contract/)
  assert.equal(config.agent.custom.model, "provider/custom")
})

test("inherit profile leaves models to OpenCode", async () => {
  const hooks = await AmagiOpenCodePlugin({}, {
    profile: "inherit",
    config: path.join(os.tmpdir(), "amagi-opencode-no-user-config.json"),
  })
  const config = { default_agent: "custom", agent: {} }

  await hooks.config(config)

  assert.equal(config.default_agent, "custom")
  assert.equal(Object.hasOwn(config.agent.baize, "model"), false)
  assert.equal(Object.hasOwn(config.agent.luban, "model"), false)
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
