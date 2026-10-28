import assert from "node:assert/strict"
import { createRequire } from "node:module"
import path from "node:path"
import { test } from "node:test"

const require = createRequire(import.meta.url)
const cliRoot = path.dirname(require.resolve("@expo/cli/package.json"))
const cliRequire = createRequire(path.join(cliRoot, "package.json"))
const { PluginSchema, DevToolsPluginOutputSchema } = cliRequire("./build/src/start/server/DevToolsPlugin.schema.js")
const { createMCPDevToolsExtensionSchema } = cliRequire("./build/src/start/server/createMCPDevToolsExtensionSchema.js")

// Expo 57 still requests Zod 3. The scoped security override must preserve
// actual CLI consumers, including MCP serialization, not just pass npm audit.
const plugin = {
  packageName: "compat-fixture", packageRoot: "/fixture",
  cliExtensions: {
    description: "Compatibility fixture", entryPoint: "index.js",
    commands: [{ name: "inspect", title: "Inspect", environments: ["cli", "mcp"],
      parameters: [{ name: "count", type: "number" }, { name: "enabled", type: "confirm" }, { name: "label", type: "text" }] }],
  },
}

test("Expo plugin validation accepts valid descriptors and rejects invalid inputs", () => {
  assert.equal(PluginSchema.safeParse(plugin).success, true)
  assert.equal(PluginSchema.safeParse({ ...plugin, packageName: "" }).success, false)
  assert.equal(PluginSchema.safeParse({ ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [] } }).success, false)
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: "text", text: "ok", level: "info" }]).success, true)
  const invalid = DevToolsPluginOutputSchema.safeParse([{ type: "image", url: "not-a-url" }])
  assert.equal(invalid.success, false)
  assert.ok(invalid.error.issues.length > 0)
})

test("Expo MCP schemas retain typed parameters, strict keys and SDK serialization", () => {
  const schema = createMCPDevToolsExtensionSchema(plugin)
  assert.equal(schema.safeParse({ command: "inspect", count: 2, enabled: true, label: "test" }).success, true)
  for (const input of [{ command: "unknown" }, { command: "inspect", count: "2" }, { command: "inspect", unexpected: true }]) {
    assert.equal(schema.safeParse(input).success, false)
  }
  const { toJsonSchemaCompat } = cliRequire("@modelcontextprotocol/sdk/server/zod-json-schema-compat.js")
  const json = toJsonSchemaCompat(schema)
  assert.equal(json.type, "object")
  assert.equal(json.additionalProperties, false)
  assert.equal(json.properties.count.type, "number")
  assert.equal(json.properties.enabled.type, "boolean")
  assert.ok(json.required.includes("command"))
})
