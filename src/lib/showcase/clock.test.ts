import { describe, expect, it } from 'vitest'
import { showcaseScenes } from '../../data/showcase'
import { buildTimeline, totalDurationMs } from './timeline'
import { seekScene } from './clock'

const timeline = buildTimeline(showcaseScenes)
const totalMs = totalDurationMs(showcaseScenes)
const last = timeline[timeline.length - 1]

// Mitten in der zweiten Szene: weit genug von beiden Grenzen entfernt, dass ein
// Sprung sich nicht zufaellig richtig anfuehlt.
const midSecond = timeline[1].startMs + 2_000

describe('seekScene', () => {
  it('setzt die laufende Szene auf ihren Anfang zurueck', () => {
    expect(seekScene(timeline, midSecond, 0)).toBe(timeline[1].startMs)
  })

  it('springt auf den Anfang der naechsten Szene', () => {
    expect(seekScene(timeline, midSecond, 1)).toBe(timeline[2].startMs)
  })

  it('springt auf den Anfang der vorherigen Szene', () => {
    expect(seekScene(timeline, midSecond, -1)).toBe(timeline[0].startMs)
  })

  it('geht aus der ersten Szene rueckwaerts zur letzten', () => {
    expect(seekScene(timeline, 500, -1)).toBe(last.startMs)
  })

  it('geht aus der letzten Szene vorwaerts zur ersten', () => {
    expect(seekScene(timeline, last.startMs + 500, 1)).toBe(0)
  })

  it('rechnet eine Zeit jenseits eines Durchlaufs in die Schleife zurueck', () => {
    expect(seekScene(timeline, totalMs + midSecond, 1)).toBe(timeline[2].startMs)
  })
})
