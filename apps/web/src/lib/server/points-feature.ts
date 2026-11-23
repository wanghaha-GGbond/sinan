import { pointsEnabled } from "@/lib/points"
import { dialogueServerEnabled } from "./dialogue-feature"
import { DialogueError } from "@/lib/dialogue"
export function pointsServerEnabled() { return pointsEnabled() && dialogueServerEnabled() && process.env.POINTS_ENABLED === "true" }
export function ensurePointsEnabled() { if (!pointsServerEnabled()) throw new DialogueError(404, "Not found") }
