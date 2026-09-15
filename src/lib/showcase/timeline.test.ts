import { describe, expect, it } from 'vitest'
import { showcaseScenes } from '../../data/showcase'
import { buildTimeline, loopProgress, reachedSteps, sceneAt, totalDurationMs } from './timeline'

const timeline = buildTimeline(showcaseScenes)

describe('totalDurationMs', () => {
  it('summiert die Schleife auf exakt 99 Sekunden', () => {
    expect(totalDurationMs(showcaseScenes)).toBe(99_000)
  })
})

describe('buildTimeline', () => {
  it('legt die Szenen lückenlos hintereinander', () => {
    for (let index = 1; index < timeline.length; index += 1) {
      expect(timeline[index].startMs).toBe(timeline[index - 1].endMs)
    }
  })

  it('beginnt bei null und endet bei der Gesamtdauer', () => {
    expect(timeline[0].startMs).toBe(0)
    expect(timeline[timeline.length - 1].endMs).toBe(99_000)
  })
})

describe('sceneAt', () => {
  it('liefert am Anfang die erste Szene', () => {
    expect(sceneAt(timeline, 0).scene.id).toBe('title')
  })

  it('wechselt genau an der Szenengrenze', () => {
    expect(sceneAt(timeline, 7_999).scene.id).toBe('title')
    expect(sceneAt(timeline, 8_000).scene.id).toBe('quote')
  })

  it('beginnt nach einem vollen Durchlauf von vorn', () => {
    expect(sceneAt(timeline, 99_000).scene.id).toBe('title')
    expect(sceneAt(timeline, 99_000 + 8_001).scene.id).toBe('quote')
  })

  it('bleibt auch nach vielen Durchläufen synchron', () => {
    expect(sceneAt(timeline, 300 * 99_000 + 8_500).scene.id).toBe('quote')
  })
})

describe('loopProgress', () => {
  it('läuft von null bis knapp unter eins', () => {
    expect(loopProgress(showcaseScenes, 0)).toBe(0)
    expect(loopProgress(showcaseScenes, 49_500)).toBeCloseTo(0.5, 5)
    expect(loopProgress(showcaseScenes, 99_000)).toBe(0)
  })
})

describe('reachedSteps', () => {
  it('hebt im Vorlauf noch keine Station hervor', () => {
    expect(reachedSteps(showcaseScenes, 0)).toEqual([])
  })

  it('hebt ab der Sensorszene Messen hervor', () => {
    expect(reachedSteps(showcaseScenes, 27_500)).toEqual(['messen'])
  })

  it('hebt in der Kartenszene Messen und Verstehen hervor', () => {
    expect(reachedSteps(showcaseScenes, 47_000)).toEqual(['messen', 'verstehen'])
  })

  it('hat am Ende alle drei Stationen erreicht', () => {
    expect(reachedSteps(showcaseScenes, 95_000)).toEqual(['messen', 'verstehen', 'handeln'])
  })
})
