import assert from "node:assert/strict"
import { createRequire } from "node:module"
import path from "node:path"
import { test } from "node:test"
import { execFileSync } from "node:child_process"

const require = createRequire(import.meta.url)

test("Router query parsing uses the patched decoder without changing CommonJS consumers", () => {
  const routerRequire = createRequire(require.resolve("expo-router/package.json"))
  const query = routerRequire("query-string")
  assert.deepEqual({ ...query.parse("name=%E5%9C%A8%E5%9C%BA&tag=a&tag=b&empty=&flag") },
    { name: "在场", tag: ["a", "b"], empty: "", flag: null })
  assert.equal(query.stringify({ name: "在场", next: "/me" }), "name=%E5%9C%A8%E5%9C%BA&next=%2Fme")
  assert.equal(query.parse("value=%zz").value, "%zz")
  // Run the advisory's malformed-input shape in a separate process so a
  // reintroduced event-loop denial of service cannot hang the test runner.
  execFileSync(process.execPath, ["-e", `
    const query = require(${JSON.stringify(routerRequire.resolve("query-string"))});
    let payload = "";
    for (let i = 0; i < 32000; i++) {
      payload += "%" + Math.floor(i / 256).toString(16).padStart(2, "0")
        + "%" + (i % 256).toString(16).padStart(2, "0") + "x";
    }
    query.parse("value=" + payload + "%zz");
  `], { timeout: 5000, stdio: "pipe" })
})
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
