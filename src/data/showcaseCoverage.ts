import generated from './showcaseCoverage.generated.json'

/**
 * The LoRaWAN coverage map behind the showcase's `lorawan` scene.
 *
 * `showcaseCoverage.generated.json` is written by
 * `scripts/fetch-lorawan-gateways.mjs` and committed: it holds the state
 * network's gateways already projected into viewBox units, not their
 * coordinates. See that script for where the two sources come from.
 */
export interface CoverageMap {
  source: string
  retrieved: string
  /** Gateways found, which is one or two more than the map draws: masts coincide. */
  gatewayCount: number
  viewBox: [number, number, number, number]
  /** One closed path per landmass, mainland first. */
  outline: string[]
  anchor: [number, number]
  points: [number, number][]
}

export const coverage = generated as CoverageMap

export const COVERAGE_TIMING = {
  /** How long the coastline takes to draw itself before anything lights up. */
  coastMs: 1500,
  ignitionFromMs: 700,
  ignitionSpanMs: 3400,
  /** When Flensburg sets itself apart, after the field has closed. */
  anchorAtMs: 5000,
  cellMs: 1100,
  gatewayMs: 400,
  /**
   * Radius of one gateway's cell, in viewBox units. A unit is about two hundred
   * metres here, so this is the ten to eleven kilometres a gateway reaches
   * across open country — the range the state's own announcement describes as
   * "several kilometres", not a best case over water.
   */
  cellRadius: 55,
} as const

export const coverageBounds = {
  top: Math.min(...coverage.points.map(([, y]) => y)),
  bottom: Math.max(...coverage.points.map(([, y]) => y)),
} as const

/** Spread of the jitter, as a share of the whole ignition window. */
const SCATTER = 0.42

/**
 * Deterministic 0..1 noise for a point. The map is fixed and committed, so a
 * hash over the coordinates gives every gateway the same moment on every one
 * of the three hundred runs a day without storing anything per point.
 */
function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

/**
 * Where a gateway falls in the ignition window, 0 first and 1 last.
 *
 * North to south, the way the eye comes down the page. The noise is wide
 * enough that no front is ever visible crossing the map: a clean sweep line
 * reads as a scan of the country, and what the slide is about is a network
 * coming up.
 */
export function ignitionProgress(x: number, y: number, top: number, bottom: number): number {
  const northToSouth = (y - top) / (bottom - top)
  const scattered = northToSouth + SCATTER * (noise(x, y) - 0.5)
  return Math.min(1, Math.max(0, scattered))
}

export function ignitionDelayMs(x: number, y: number): number {
  const { top, bottom } = coverageBounds
  const progress = ignitionProgress(x, y, top, bottom)
  return Math.round(COVERAGE_TIMING.ignitionFromMs + progress * COVERAGE_TIMING.ignitionSpanMs)
}
