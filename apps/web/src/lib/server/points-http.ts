import { dialogueRoute } from "./dialogue-http"
import { ensurePointsEnabled } from "./points-feature"
export function pointsRoute(action: () => Promise<Response>) { return dialogueRoute(async () => { ensurePointsEnabled(); return action() }) }
