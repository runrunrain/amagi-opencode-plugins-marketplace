import assert from "node:assert/strict"
import test from "node:test"

import { AmagiOpenCodePlugin } from "../index.js"

test("registers one leader and twelve tiered subagents at runtime", async () => {
  const hooks = await AmagiOpenCodePlugin({}, {})
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
  const hooks = await AmagiOpenCodePlugin({}, { profile: "inherit" })
  const config = { default_agent: "custom", agent: {} }

  await hooks.config(config)

  assert.equal(config.default_agent, "custom")
  assert.equal(Object.hasOwn(config.agent.baize, "model"), false)
  assert.equal(Object.hasOwn(config.agent.luban, "model"), false)
})
