import { describe, expect, it } from 'vitest'
import { showcaseScenes, STEP_ORDER } from '../../data/showcase'
import {
  buildTimeline,
  inLastMs,
  leavingOf,
  loopProgress,
  msIntoScene,
  previousOf,
  sceneAt,
  stepStops,
  totalDurationMs,
} from './timeline'

const timeline = buildTimeline(showcaseScenes)

// Where the title hands over to the second scene. Read from the timeline rather
// than written out, because these cases are about what happens at a boundary,
// not about where the boundary happens to fall.
const handover = timeline[1].startMs

describe('totalDurationMs', () => {
  it('summiert die Schleife auf exakt 182 Sekunden', () => {
    expect(totalDurationMs(showcaseScenes)).toBe(182_000)
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
    expect(timeline[timeline.length - 1].endMs).toBe(182_000)
  })
})

describe('sceneAt', () => {
  it('liefert am Anfang die erste Szene', () => {
    expect(sceneAt(timeline, 0).scene.id).toBe('title')
  })

  it('wechselt genau an der Szenengrenze', () => {
    expect(sceneAt(timeline, handover - 1).scene.id).toBe('title')
    expect(sceneAt(timeline, handover).scene.id).toBe('quote')
  })

  it('beginnt nach einem vollen Durchlauf von vorn', () => {
    expect(sceneAt(timeline, 182_000).scene.id).toBe('title')
    expect(sceneAt(timeline, 182_000 + handover + 1).scene.id).toBe('quote')
  })

  it('bleibt auch nach vielen Durchläufen synchron', () => {
    expect(sceneAt(timeline, 300 * 182_000 + handover + 500).scene.id).toBe('quote')
  })
})

describe('loopProgress', () => {
  it('läuft von null bis knapp unter eins', () => {
    expect(loopProgress(showcaseScenes, 0)).toBe(0)
    expect(loopProgress(showcaseScenes, 91_000)).toBeCloseTo(0.5, 5)
    expect(loopProgress(showcaseScenes, 182_000)).toBe(0)
  })
})

describe('stepStops', () => {
  it('setzt jede Station auf die Mitte der Szene, die den Schritt eröffnet', () => {
    const stops = stepStops(showcaseScenes)

    // sensor (messen) läuft 46_000–60_000, map (verstehen) 72_000–86_000,
    // planning (handeln) 100_000–112_000 — jeweils bezogen auf 182_000ms
    // Gesamtlauf.
    expect(stops.messen).toBeCloseTo(53_000 / 182_000, 5)
    expect(stops.verstehen).toBeCloseTo(79_000 / 182_000, 5)
    expect(stops.handeln).toBeCloseTo(106_000 / 182_000, 5)
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

    expect(stops.messen).toBeCloseTo((46_000 + ((14 + 20) / 2) * 1000) / (182_000 + 20_000), 5)
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
    expect(msIntoScene(timeline, timeline[1], handover + 400)).toBe(400)
  })

  it('zählt auch nach vielen Durchläufen ab dem Szenenbeginn', () => {
    expect(msIntoScene(timeline, timeline[1], 300 * 182_000 + handover + 400)).toBe(400)
  })
})

describe('inLastMs', () => {
  it('ist mitten in der Titelszene nicht in den letzten 800 ms', () => {
    const current = sceneAt(timeline, handover - 801)
    expect(inLastMs(timeline, current, handover - 801, 800)).toBe(false)
  })

  it('ist ab 800 ms vor der Übergabe in den letzten 800 ms', () => {
    const current = sceneAt(timeline, handover - 800)
    expect(inLastMs(timeline, current, handover - 800, 800)).toBe(true)
  })

  it('rechnet am Schleifenende gegen das Ende der Demo-Szene', () => {
    const current = sceneAt(timeline, 181_900)
    expect(inLastMs(timeline, current, 181_900, 800)).toBe(true)
    expect(inLastMs(timeline, current, 181_000, 800)).toBe(false)
  })
})

describe('leavingOf', () => {
  it('hat beim Kaltstart nichts Ausgehendes', () => {
    const current = sceneAt(timeline, 0)
    expect(leavingOf(timeline, current, 0, 600)).toBeNull()
  })

  it('hat kurz nach dem Wechsel in die zweite Szene die Titelszene ausgehend', () => {
    const current = sceneAt(timeline, handover + 100)
    expect(leavingOf(timeline, current, handover + 100, 600)?.scene.id).toBe('title')
  })

  it('hat am Schleifenübergang die Demo-Szene ausgehend, anders als beim Kaltstart', () => {
    const current = sceneAt(timeline, 182_100)
    expect(leavingOf(timeline, current, 182_100, 600)?.scene.id).toBe('demo')
  })

  it('hat mitten in einer Szene, wenn since größer als fadeMs ist, nichts Ausgehendes', () => {
    const current = sceneAt(timeline, 15_000)
    expect(leavingOf(timeline, current, 15_000, 600)).toBeNull()
  })
})
