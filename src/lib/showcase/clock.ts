import { sceneAt, type TimelineEntry } from './timeline'

// Where the clock has to land for a scene to play from its first frame. Always
// the exact boundary, never a little past it: a jump that skips the crossfade
// shows a scene the loop never actually shows.
export function seekScene(
  timeline: TimelineEntry[],
  elapsedMs: number,
  offset: -1 | 0 | 1,
): number {
  const index = timeline.indexOf(sceneAt(timeline, elapsedMs))
  return timeline[(index + offset + timeline.length) % timeline.length].startMs
}
