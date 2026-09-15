import type { Scene, Step } from '../../data/showcase'

export interface TimelineEntry {
  scene: Scene
  startMs: number
  endMs: number
}

export function totalDurationMs(scenes: Scene[]): number {
  return scenes.reduce((sum, scene) => sum + scene.seconds * 1000, 0)
}

export function buildTimeline(scenes: Scene[]): TimelineEntry[] {
  let cursor = 0

  return scenes.map((scene) => {
    const startMs = cursor
    cursor += scene.seconds * 1000
    return { scene, startMs, endMs: cursor }
  })
}

// Against the clock rather than against a chain of timeouts: over 300 runs a
// chain drifts far enough that the tour path no longer matches the scene.
function intoLoop(totalMs: number, elapsedMs: number): number {
  return ((elapsedMs % totalMs) + totalMs) % totalMs
}

export function sceneAt(timeline: TimelineEntry[], elapsedMs: number): TimelineEntry {
  const totalMs = timeline[timeline.length - 1].endMs
  const position = intoLoop(totalMs, elapsedMs)

  return (
    timeline.find((entry) => position >= entry.startMs && position < entry.endMs) ?? timeline[0]
  )
}

// The stretch of the loop the tour path is about: from the first scene that
// carries a step to the last. The scenes around it — the harbour, the
// photographs, the closing slide — belong to no step, and a point that keeps
// travelling through them arrives nowhere.
export function stepWindow(scenes: Scene[]): { startMs: number; endMs: number } {
  const stepped = buildTimeline(scenes).filter((entry) => entry.scene.step)

  return { startMs: stepped[0].startMs, endMs: stepped[stepped.length - 1].endMs }
}

export function stepProgress(scenes: Scene[], elapsedMs: number): number {
  const { startMs, endMs } = stepWindow(scenes)
  const position = intoLoop(totalDurationMs(scenes), elapsedMs)

  return Math.min(1, Math.max(0, (position - startMs) / (endMs - startMs)))
}

export function previousOf(timeline: TimelineEntry[], entry: TimelineEntry): TimelineEntry {
  const index = timeline.indexOf(entry)
  return timeline[(index - 1 + timeline.length) % timeline.length]
}

export function msIntoScene(
  timeline: TimelineEntry[],
  entry: TimelineEntry,
  elapsedMs: number,
): number {
  const totalMs = timeline[timeline.length - 1].endMs
  return intoLoop(totalMs, elapsedMs) - entry.startMs
}

export function inLastMs(
  timeline: TimelineEntry[],
  entry: TimelineEntry,
  elapsedMs: number,
  ms: number,
): boolean {
  const remaining = entry.endMs - entry.startMs - msIntoScene(timeline, entry, elapsedMs)
  return remaining <= ms
}

export function leavingOf(
  timeline: TimelineEntry[],
  current: TimelineEntry,
  elapsedMs: number,
  fadeMs: number,
): TimelineEntry | null {
  const since = msIntoScene(timeline, current, elapsedMs)
  // elapsedMs - since is when the running scene began, counted from mount. At
  // zero the loop itself has only just started, so nothing has left yet: the
  // cyclic predecessor would be the last scene, which never ran.
  if (elapsedMs - since <= 0) {
    return null
  }
  return since < fadeMs ? previousOf(timeline, current) : null
}

// A stop sits where its step begins, not at an even third and not in the middle
// of it: the point reaches the station in the same frame the scene puts the
// step's name on screen. Anywhere else the path and the eyebrow disagree about
// which step is running.
export function stepStops(scenes: Scene[]): Record<Step, number> {
  const { startMs, endMs } = stepWindow(scenes)
  const stops = {} as Record<Step, number>

  for (const entry of buildTimeline(scenes)) {
    const step = entry.scene.step
    if (step && !(step in stops)) {
      stops[step] = (entry.startMs - startMs) / (endMs - startMs)
    }
  }

  return stops
}
