import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

test("Vercel installs locked root build dependencies before applying patches", () => {
  const config = JSON.parse(read("../vercel.json"))
  assert.equal(config.installCommand, "cd ../.. && npm ci --include=dev --include-workspace-root")
  const root = JSON.parse(read("../../../package.json"))
  const lock = JSON.parse(read("../../../package-lock.json"))
  assert.equal(root.scripts.postinstall, "patch-package --error-on-fail")
  assert.equal(root.devDependencies["patch-package"], lock.packages["node_modules/patch-package"].version)
  assert.match(read("../../../patches/query-string+7.1.3.patch"), /decodeComponentModule.default/)
  assert.doesNotMatch(read("../../../.vercelignore"), /^\/?patches(?:\/|$)/m)
})
