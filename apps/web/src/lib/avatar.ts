/** Deterministic avatar color from a name string — like GitHub identicon */

const PALETTE = [
  { bg: "#DFF8EC", text: "#07563A" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EDE9FE", text: "#5B21B6" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#FFEDD5", text: "#9A3412" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#E0E7FF", text: "#3730A3" },
]

export function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function avatarInitial(name: string) {
  return name.charAt(0)
}
