import { describe, expect, it } from 'vitest'
import { showcaseScenes, STEP_ORDER } from '../../data/showcase'
import {
  buildTimeline,
  inLastMs,
  leavingOf,
  msIntoScene,
  previousOf,
  sceneAt,
  stepProgress,
  stepStops,
  stepWindow,
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

describe('stepWindow', () => {
  it('spannt von der ersten bis zur letzten Szene mit Schritt', () => {
    // sensor eröffnet messen bei 46_000, tour beschließt handeln bei 128_000.
    expect(stepWindow(showcaseScenes)).toEqual({ startMs: 46_000, endMs: 128_000 })
  })
})

describe('stepProgress', () => {
  it('steht vor dem ersten und nach dem letzten Schritt still', () => {
    expect(stepProgress(showcaseScenes, 0)).toBe(0)
    expect(stepProgress(showcaseScenes, 46_000)).toBe(0)
    expect(stepProgress(showcaseScenes, 128_000)).toBe(1)
    expect(stepProgress(showcaseScenes, 181_000)).toBe(1)
  })

  it('läuft über das Schritt-Fenster von null nach eins', () => {
    expect(stepProgress(showcaseScenes, 87_000)).toBeCloseTo(0.5, 5)
  })
})

describe('stepStops', () => {
  it('setzt jede Station auf den Beginn ihres Schritts', () => {
    const stops = stepStops(showcaseScenes)

    // messen beginnt bei 46_000, verstehen bei 72_000, handeln bei 100_000 —
    // jeweils bezogen auf das Fenster 46_000–128_000.
    expect(stops.messen).toBe(0)
    expect(stops.verstehen).toBeCloseTo(26_000 / 82_000, 5)
    expect(stops.handeln).toBeCloseTo(54_000 / 82_000, 5)
  })

  it('erreicht jede Station genau dann, wenn ihr Schritt anläuft', () => {
    const stops = stepStops(showcaseScenes)

    for (const [step, startMs] of [
      ['verstehen', 72_000],
      ['handeln', 100_000],
    ] as const) {
      expect(stepProgress(showcaseScenes, startMs)).toBeCloseTo(stops[step], 5)
      expect(stepProgress(showcaseScenes, startMs - 1)).toBeLessThan(stops[step])
    }
  })

  it('liefert für jeden Schritt einen Wert zwischen null und eins', () => {
    const stops = stepStops(showcaseScenes)

    for (const step of STEP_ORDER) {
      expect(stops[step]).toBeGreaterThanOrEqual(0)
      expect(stops[step]).toBeLessThan(1)
    }
  })

  it('folgt einer geänderten Sekundenangabe, ohne von Hand nachgepflegt zu werden', () => {
    const stretched = showcaseScenes.map((scene) =>
      scene.id === 'sensor' ? { ...scene, seconds: scene.seconds + 20 } : scene,
    )

    const stops = stepStops(stretched)

    // verstehen beginnt jetzt bei 92_000, das Fenster läuft 46_000–148_000.
    expect(stops.verstehen).toBeCloseTo(46_000 / 102_000, 5)
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
