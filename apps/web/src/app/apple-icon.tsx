import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#19C37D",
        color: "white",
        display: "flex",
        fontFamily: "sans-serif",
        fontSize: 92,
        fontWeight: 800,
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      S
    </div>,
    size,
  )
}
