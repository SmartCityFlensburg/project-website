import { describe, expect, it } from 'vitest'
import { showcaseScenes } from '../../data/showcase'
import {
  buildTimeline,
  leavingOf,
  loopProgress,
  msIntoScene,
  previousOf,
  reachedSteps,
  sceneAt,
  totalDurationMs,
} from './timeline'

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

describe('previousOf', () => {
  it('liefert die Szene davor', () => {
    expect(previousOf(timeline, timeline[3]).scene.id).toBe('water')
  })

  it('liefert am Anfang die letzte Szene, damit die Schleife überblendet', () => {
    expect(previousOf(timeline, timeline[0]).scene.id).toBe('open-source')
  })
})

describe('msIntoScene', () => {
  it('zählt ab dem Beginn der laufenden Szene', () => {
    expect(msIntoScene(timeline, timeline[1], 8_400)).toBe(400)
  })

  it('zählt auch nach vielen Durchläufen ab dem Szenenbeginn', () => {
    expect(msIntoScene(timeline, timeline[1], 300 * 99_000 + 8_400)).toBe(400)
  })
})

describe('leavingOf', () => {
  it('hat beim Kaltstart nichts Ausgehendes', () => {
    const current = sceneAt(timeline, 0)
    expect(leavingOf(timeline, current, 0, 600)).toBeNull()
  })

  it('hat kurz nach dem Wechsel in die zweite Szene die Titelszene ausgehend', () => {
    const current = sceneAt(timeline, 8_100)
    expect(leavingOf(timeline, current, 8_100, 600)?.scene.id).toBe('title')
  })

  it('hat am Schleifenübergang die Open-Source-Szene ausgehend, anders als beim Kaltstart', () => {
    const current = sceneAt(timeline, 99_100)
    expect(leavingOf(timeline, current, 99_100, 600)?.scene.id).toBe('open-source')
  })

  it('hat mitten in einer Szene, wenn since größer als fadeMs ist, nichts Ausgehendes', () => {
    const current = sceneAt(timeline, 10_000)
    expect(leavingOf(timeline, current, 10_000, 600)).toBeNull()
  })
})
