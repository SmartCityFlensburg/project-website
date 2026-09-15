import { describe, expect, test } from 'vitest'
import {
  COVERAGE_TIMING,
  coverage,
  coverageBounds,
  ignitionDelayMs,
  ignitionProgress,
} from './showcaseCoverage'
import { TRANSITION, showcaseScenes } from './showcase'

const { top, bottom } = coverageBounds

describe('die erzeugte Karte', () => {
  test('hält jeden Gateway-Punkt innerhalb der viewBox', () => {
    const [, , width, height] = coverage.viewBox

    for (const [x, y] of coverage.points) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(width)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(height)
    }
  })

  test('setzt den Anker auf Flensburg, also in die nördliche Hälfte', () => {
    const [, , , height] = coverage.viewBox
    expect(coverage.anchor[1]).toBeLessThan(height / 2)
  })

  test('zeichnet Festland und Inseln als geschlossene Pfade', () => {
    expect(coverage.outline.length).toBeGreaterThan(1)

    for (const path of coverage.outline) {
      expect(path.startsWith('M')).toBe(true)
      expect(path.endsWith('Z')).toBe(true)
    }
  })

  test('zeigt das Landesnetz und nicht jedes Gateway im Land', () => {
    expect(coverage.gatewayCount).toBeGreaterThan(300)
    expect(coverage.gatewayCount).toBeLessThan(500)
  })
})

describe('ignitionProgress', () => {
  test('bleibt für jeden Punkt der Karte im Fenster', () => {
    for (const [x, y] of coverage.points) {
      const progress = ignitionProgress(x, y, top, bottom)
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(1)
    }
  })

  test('liefert für denselben Punkt immer denselben Wert', () => {
    expect(ignitionProgress(120, 340, top, bottom)).toBe(ignitionProgress(120, 340, top, bottom))
  })

  test('zündet den Norden im Mittel vor dem Süden', () => {
    const middle = (top + bottom) / 2
    const north = coverage.points.filter(([, y]) => y <= middle)
    const south = coverage.points.filter(([, y]) => y > middle)

    const mean = (points: readonly (readonly [number, number])[]) =>
      points.reduce((sum, [x, y]) => sum + ignitionProgress(x, y, top, bottom), 0) / points.length

    expect(mean(north)).toBeLessThan(mean(south))
  })

  // A hard front crossing the state reads as a scan line, not as a network
  // coming up, so neighbours on the same latitude must not share a moment.
  test('streut Punkte auf gleicher Höhe auseinander', () => {
    const spread = [100, 300, 500, 700, 900].map((x) => ignitionProgress(x, 400, top, bottom))
    expect(new Set(spread).size).toBe(spread.length)
    expect(Math.max(...spread) - Math.min(...spread)).toBeGreaterThan(0.05)
  })
})

describe('ignitionDelayMs', () => {
  test('lässt jedes Gateway vor dem Anker aufleuchten', () => {
    for (const [x, y] of coverage.points) {
      expect(ignitionDelayMs(x, y)).toBeLessThanOrEqual(COVERAGE_TIMING.anchorAtMs)
    }
  })

  test('beginnt frühestens, wenn die Küste gezeichnet ist', () => {
    const earliest = Math.min(...coverage.points.map(([x, y]) => ignitionDelayMs(x, y)))
    expect(earliest).toBeGreaterThanOrEqual(COVERAGE_TIMING.ignitionFromMs)
  })

  // The layer holds the build back until the previous picture has dissolved and
  // lifts it off again before this one hands over, so the map has less than the
  // scene's twelve seconds to finish in.
  test('ist fertig, bevor die Szene übergibt', () => {
    const scene = showcaseScenes.find(({ id }) => id === 'lorawan')

    if (!scene) {
      throw new Error('die lorawan-Szene fehlt in der Laufordnung')
    }

    const lastCell =
      Math.max(...coverage.points.map(([x, y]) => ignitionDelayMs(x, y))) + COVERAGE_TIMING.cellMs
    const anchorDone = COVERAGE_TIMING.anchorAtMs + COVERAGE_TIMING.gatewayMs
    const built = TRANSITION.enterHoldMs + Math.max(lastCell, anchorDone)

    expect(built).toBeLessThan(scene.seconds * 1000 - TRANSITION.outroMs)
  })
})
