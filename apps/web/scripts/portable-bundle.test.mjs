import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { normalizeBundleImports } from "./portable-bundle.mjs"

function fixture(t) {
  const parent = mkdtempSync(path.join(tmpdir(), "zaichang-portability-"))
  t.after(() => rmSync(parent, { recursive: true, force: true }))
  const root = path.join(parent, ".open-next"), handlers = path.join(root, "server-functions/default/apps/web"), assets = path.join(root, "server-functions/default/node_modules/next/dist/compiled/og")
  mkdirSync(handlers, { recursive: true }); mkdirSync(assets, { recursive: true })
  const wasm = path.join(assets, "yoga.wasm"), font = path.join(assets, "font.ttf.bin"), handler = path.join(handlers, "handler.mjs")
  writeFileSync(wasm, "bundled-wasm"); writeFileSync(font, "bundled-font")
  return { parent, root, wasm, font, handler }
}

test("static, dynamic and side-effect imports become relative without changing source-map columns", t => {
  const f = fixture(t)
  const source = `import yoga from ${JSON.stringify(f.wasm + "?module")};import(${JSON.stringify(f.font)});import ${JSON.stringify(f.font)};export {default} from ${JSON.stringify(f.font)};require(${JSON.stringify(f.font)});const tail = 42;`
  writeFileSync(f.handler, source)
  assert.deepEqual(normalizeBundleImports(f.root), { files: 1, imports: 5 })
  const output = readFileSync(f.handler, "utf8")
  assert.equal(output.includes(f.root), false)
  assert.match(output, /\.\.\/\.\.\/node_modules\/next\/dist\/compiled\/og\/yoga\.wasm\?module/)
  assert.equal(output.length, source.length)
  assert.equal(output.indexOf("const tail"), source.indexOf("const tail"))
  assert.deepEqual(normalizeBundleImports(f.root), { files: 0, imports: 0 })
})

test("ordinary strings, comments, package imports and relative imports are preserved", t => {
  const f = fixture(t)
  const source = `// import fake from ${JSON.stringify(f.font)}\nconst text = ${JSON.stringify('import fake from "' + f.font + '"')};import real from "./real.js";export {readFile} from "node:fs";`
  writeFileSync(f.handler, source)
  assert.deepEqual(normalizeBundleImports(f.root), { files: 0, imports: 0 })
  assert.equal(readFileSync(f.handler, "utf8"), source)
})

test("outside and symlink-escaped resources fail closed without changing generated files", t => {
  const f = fixture(t), outside = path.join(f.parent, "not-in-bundle.bin")
  writeFileSync(outside, "not-for-upload")
  for (const target of [outside, path.join(path.dirname(f.font), "escape.bin")]) {
    if (target !== outside) symlinkSync(outside, target)
    const source = `import good from ${JSON.stringify(f.wasm)};import bad from ${JSON.stringify(target)};`
    writeFileSync(f.handler, source)
    assert.throws(() => normalizeBundleImports(f.root), /escapes|bundled file/)
    assert.equal(readFileSync(f.handler, "utf8"), source)
  }
  assert.throws(() => normalizeBundleImports(f.parent), /generated/)
})

test("normalized resource imports keep resolving after the whole bundle moves", t => {
  const f = fixture(t)
  writeFileSync(f.handler, `import yoga from ${JSON.stringify(f.wasm + "?module")};import(${JSON.stringify(f.font)});`)
  normalizeBundleImports(f.root)
  const moved = path.join(f.parent, "relocated", ".open-next")
  mkdirSync(path.dirname(moved)); renameSync(f.root, moved)
  const handler = path.join(moved, path.relative(f.root, f.handler)), source = readFileSync(handler, "utf8")
  const specifiers = [...source.matchAll(/"([^"\n]+)"/g)].map(match => match[1])
  assert.equal(specifiers.length, 2)
  for (const specifier of specifiers) assert.match(readFileSync(path.resolve(path.dirname(handler), specifier.replace(/\?.*$/, "")), "utf8"), /^bundled-/)
})
