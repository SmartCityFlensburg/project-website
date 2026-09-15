import { describe, expect, it } from 'vitest'
import { showcaseScenes, STEP_ORDER } from '../../data/showcase'
import {
  buildTimeline,
  leavingOf,
  loopProgress,
  msIntoScene,
  previousOf,
  sceneAt,
  stepStops,
  totalDurationMs,
} from './timeline'

const timeline = buildTimeline(showcaseScenes)

describe('totalDurationMs', () => {
  it('summiert die Schleife auf exakt 180 Sekunden', () => {
    expect(totalDurationMs(showcaseScenes)).toBe(180_000)
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
    expect(timeline[timeline.length - 1].endMs).toBe(180_000)
  })
})

describe('sceneAt', () => {
  it('liefert am Anfang die erste Szene', () => {
    expect(sceneAt(timeline, 0).scene.id).toBe('title')
  })

  it('wechselt genau an der Szenengrenze', () => {
    expect(sceneAt(timeline, 11_999).scene.id).toBe('title')
    expect(sceneAt(timeline, 12_000).scene.id).toBe('quote')
  })

  it('beginnt nach einem vollen Durchlauf von vorn', () => {
    expect(sceneAt(timeline, 180_000).scene.id).toBe('title')
    expect(sceneAt(timeline, 180_000 + 12_001).scene.id).toBe('quote')
  })

  it('bleibt auch nach vielen Durchläufen synchron', () => {
    expect(sceneAt(timeline, 300 * 180_000 + 12_500).scene.id).toBe('quote')
  })
})

describe('loopProgress', () => {
  it('läuft von null bis knapp unter eins', () => {
    expect(loopProgress(showcaseScenes, 0)).toBe(0)
    expect(loopProgress(showcaseScenes, 90_000)).toBeCloseTo(0.5, 5)
    expect(loopProgress(showcaseScenes, 180_000)).toBe(0)
  })
})

describe('stepStops', () => {
  it('setzt jede Station auf die Mitte der Szene, die den Schritt eröffnet', () => {
    const stops = stepStops(showcaseScenes)

    // sensor (messen) läuft 39_000–53_000, map (verstehen) 65_000–79_000,
    // planning (handeln) 93_000–105_000 — jeweils bezogen auf 180_000ms
    // Gesamtlauf.
    expect(stops.messen).toBeCloseTo(46_000 / 180_000, 5)
    expect(stops.verstehen).toBeCloseTo(72_000 / 180_000, 5)
    expect(stops.handeln).toBeCloseTo(99_000 / 180_000, 5)
  })

  it('liefert für jeden Schritt einen Wert zwischen null und eins', () => {
    const stops = stepStops(showcaseScenes)

    for (const step of STEP_ORDER) {
      expect(stops[step]).toBeGreaterThan(0)
      expect(stops[step]).toBeLessThan(1)
    }
  })

  it('folgt einer geänderten Sekundenangabe, ohne von Hand nachgepflegt zu werden', () => {
    const stretched = showcaseScenes.map((scene) =>
      scene.id === 'sensor' ? { ...scene, seconds: scene.seconds + 20 } : scene,
    )

    const stops = stepStops(stretched)

    expect(stops.messen).toBeCloseTo((39_000 + ((14 + 20) / 2) * 1000) / (180_000 + 20_000), 5)
  })
})

describe('previousOf', () => {
  it('liefert die Szene davor', () => {
    expect(previousOf(timeline, timeline[3]).scene.id).toBe('water')
  })

  it('liefert am Anfang die letzte Szene, damit die Schleife überblendet', () => {
    expect(previousOf(timeline, timeline[0]).scene.id).toBe('demo')
  })
})

describe('msIntoScene', () => {
  it('zählt ab dem Beginn der laufenden Szene', () => {
    expect(msIntoScene(timeline, timeline[1], 12_400)).toBe(400)
  })

  it('zählt auch nach vielen Durchläufen ab dem Szenenbeginn', () => {
    expect(msIntoScene(timeline, timeline[1], 300 * 180_000 + 12_400)).toBe(400)
  })
})

describe('leavingOf', () => {
  it('hat beim Kaltstart nichts Ausgehendes', () => {
    const current = sceneAt(timeline, 0)
    expect(leavingOf(timeline, current, 0, 600)).toBeNull()
  })

  it('hat kurz nach dem Wechsel in die zweite Szene die Titelszene ausgehend', () => {
    const current = sceneAt(timeline, 12_100)
    expect(leavingOf(timeline, current, 12_100, 600)?.scene.id).toBe('title')
  })

  it('hat am Schleifenübergang die Demo-Szene ausgehend, anders als beim Kaltstart', () => {
    const current = sceneAt(timeline, 180_100)
    expect(leavingOf(timeline, current, 180_100, 600)?.scene.id).toBe('demo')
  })

  it('hat mitten in einer Szene, wenn since größer als fadeMs ist, nichts Ausgehendes', () => {
    const current = sceneAt(timeline, 15_000)
    expect(leavingOf(timeline, current, 15_000, 600)).toBeNull()
  })
})
