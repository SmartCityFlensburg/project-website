import { STEP_ORDER, type Scene, type Step } from '../../data/showcase'

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
  return (((elapsedMs % totalMs) + totalMs) % totalMs) - entry.startMs
}

export function reachedSteps(scenes: Scene[], elapsedMs: number): Step[] {
  const timeline = buildTimeline(scenes)
  const position = intoLoop(totalDurationMs(scenes), elapsedMs)
  const seen = new Set<Step>()

  for (const entry of timeline) {
    if (entry.scene.step && position >= entry.startMs) {
      seen.add(entry.scene.step)
    }
  }

  return STEP_ORDER.filter((step) => seen.has(step))
}
