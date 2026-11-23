import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs"
import path from "node:path"
import ts from "typescript"

function moduleLiterals(sourceFile) {
  const literals = []
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      literals.push(node.moduleSpecifier)
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0]) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      literals.push(node.arguments[0])
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return literals
}

// OpenNext can emit machine-absolute OG font/WASM imports. Normalize only
// parsed module specifiers to files already inside the generated bundle,
// before Wrangler validation and before creating the integrity manifest.
export function normalizeBundleImports(directory) {
  const root = path.resolve(directory)
  if (path.basename(root) !== ".open-next" || !lstatSync(root).isDirectory()) throw new Error("Expected the generated .open-next directory")
  const actualRoot = realpathSync(root), writes = []
  let imports = 0
  function walk(folder) {
    for (const name of readdirSync(folder).sort()) {
      const file = path.join(folder, name), stat = lstatSync(file)
      if (stat.isSymbolicLink()) continue
      if (stat.isDirectory()) { walk(file); continue }
      if (!stat.isFile() || !/\.(?:mjs|cjs|js)$/.test(name)) continue
      const source = readFileSync(file, "utf8")
      const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
      if (parsed.parseDiagnostics.length) throw new Error("Cannot validate generated JavaScript: " + path.relative(root, file))
      const edits = []
      for (const literal of moduleLiterals(parsed)) {
        const specifier = literal.text
        if (!path.isAbsolute(specifier)) continue
        const [, target, suffix = ""] = /^([^?#]+)([?#].*)?$/.exec(specifier)
        const relative = path.relative(root, target)
        if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) throw new Error("Absolute module import escapes the generated bundle")
        const resolved = realpathSync(target)
        if (!resolved.startsWith(actualRoot + path.sep) || !lstatSync(resolved).isFile()) throw new Error("Module import target is not a bundled file")
        let portable = path.relative(path.dirname(file), target).split(path.sep).join("/")
        if (!portable.startsWith(".")) portable = "./" + portable
        const value = JSON.stringify(portable + suffix), start = literal.getStart(parsed), end = literal.getEnd()
        if (value.length > end - start) throw new Error("Cannot preserve generated source-map offsets for this import")
        // Keep subsequent generated columns unchanged for existing source maps.
        edits.push({ start, end, value: value.padEnd(end - start, " ") })
      }
      if (edits.length) {
        let output = source
        for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.value + output.slice(edit.end)
        writes.push({ file, output })
        imports += edits.length
      }
    }
  }
  // Validate all targets before changing any file; an outside import must not
  // cause a partially normalized artifact to look like a successful build.
  walk(root)
  for (const write of writes) writeFileSync(write.file, write.output)
  return { files: writes.length, imports }
}
