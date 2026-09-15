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

export function loopProgress(scenes: Scene[], elapsedMs: number): number {
  const totalMs = totalDurationMs(scenes)
  return intoLoop(totalMs, elapsedMs) / totalMs
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

// The tour path marks each step where its content actually runs, not at even
// thirds: the point has to arrive at a stop while that step is on screen.
export function stepStops(scenes: Scene[]): Record<Step, number> {
  const timeline = buildTimeline(scenes)
  const totalMs = totalDurationMs(scenes)
  const stops = {} as Record<Step, number>

  for (const entry of timeline) {
    if (entry.scene.step && !(entry.scene.step in stops)) {
      stops[entry.scene.step] = (entry.startMs + entry.endMs) / 2 / totalMs
    }
  }

  return stops
}
