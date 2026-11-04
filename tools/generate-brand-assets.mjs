// Deterministic vector export, not a font-dependent text render.
import { readFile, writeFile } from "node:fs/promises"
import sharp from "sharp"

const root = new URL("../", import.meta.url)
const svg = await readFile(new URL("apps/web/public/brand-z.svg", root))
const outputs = [
  ["apps/web/src/app/icon.png", 512],
  ["apps/web/src/app/apple-icon.png", 180],
  ["apps/ios/assets/icon-v2.png", 1024],
]
for (const [file, size] of outputs) {
  const png = await sharp(svg).resize(size, size).removeAlpha().png().toBuffer()
  await writeFile(new URL(file, root), png)
  const metadata = await sharp(png).metadata()
  if (metadata.width !== size || metadata.height !== size || metadata.hasAlpha) throw new Error(`Invalid icon: ${file}`)
}
// ICO's PNG payload must be RGBA even when every pixel is opaque.
const png = await sharp(svg).resize(32, 32).ensureAlpha().png().toBuffer()
const header = Buffer.alloc(22)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)
header[6] = 32
header[7] = 32
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(png.length, 14)
header.writeUInt32LE(22, 18)
await writeFile(new URL("apps/web/src/app/favicon.ico", root), Buffer.concat([header, png]))
console.log("Exported Z icons: Web 512px, Apple touch 180px, favicon 32px, iOS opaque 1024px")
