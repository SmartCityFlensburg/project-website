// The opening scene: Flensburg seen from the water. The camera looks down the
// Förde toward the Hafenspitze, with the quay's street trees in the near ground
// because they, not the scenery, are what the project is about.
//
// World layout, all in metres, camera looking toward -z:
//   z ≈   -8  the near quay and its avenue of street trees
//   z ≈ -100  the museum harbour: sailing ship masts and the steamer
//   z ≈ -200  the far shore: gabled harbour houses and the church spires

import { TITLE_SECONDS } from './showcase'

export type Vec3 = readonly [number, number, number]

const TAU = Math.PI * 2
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (value: number) => value * value * (3 - 2 * value)
const lerp = (from: number, to: number, at: number) => from + (to - from) * at

export const scene = {
  seconds: TITLE_SECONDS,
  fov: 34,
  target: [0, 10, -170] as Vec3,
  fogDensity: 0.0022,
} as const

export const water = {
  width: 560,
  depth: 420,
  centerZ: -150,
  segmentsX: 56,
  segmentsZ: 30,
  amplitude: 0.7,
} as const

export const wind = {
  amplitude: 0.055,
  speed: 0.85,
} as const

// Reaches from behind the avenue past the camera, so the near ground is bank
// and the Förde only starts beyond the trees. `top` clears water.amplitude with
// room to spare, or a crest washes over the trunks.
export const quay = {
  width: 340,
  depth: 108,
  centerZ: 34,
  top: 2.4,
} as const

/**
 * How far a canopy leans at a given moment. Two sines rather than one so the
 * avenue never settles into a single visible beat.
 */
export function swayAngle(phase: number, seconds: number): number {
  const base = Math.sin(seconds * wind.speed + phase)
  const gust = Math.sin(seconds * wind.speed * 1.7 + phase * 1.3)
  return wind.amplitude * (0.75 * base + 0.25 * gust)
}

/** Surface displacement of the Förde. Crossed waves, so the facets never align. */
export function waveHeight(x: number, z: number, seconds: number): number {
  const along = Math.sin(x * 0.06 + seconds * 0.9)
  const across = Math.sin(z * 0.045 - seconds * 0.6)
  return (water.amplitude / 2) * (along + across)
}

export interface CameraFrame {
  position: Vec3
  target: Vec3
}

/**
 * One uninterrupted move across the scene: a slow drift to port and a slight
 * closing on the far shore. Eased at both ends so it has no visible start.
 */
export function cameraAt(seconds: number): CameraFrame {
  const at = smoothstep(clamp01(seconds / scene.seconds))

  return {
    position: [lerp(22, -14, at), lerp(15, 13.4, at), lerp(62, 48, at)],
    target: scene.target,
  }
}

export interface QuayTree {
  x: number
  z: number
  height: number
  canopyRadius: number
  phase: number
  dark: boolean
}

// Spread by the golden angle so the spacing, heights and sway phases vary
// without a hand-kept table and without any two neighbours matching.
const GOLDEN = 2.399963

// Close spacing and a modest crown: an avenue has to read as a row, and three
// oversized trees in frame hide the town they are supposed to stand in.
export const quayTrees: readonly QuayTree[] = Array.from({ length: 21 }, (_, i) => {
  const wobble = Math.sin(i * GOLDEN)

  return {
    x: -90 + i * 9 + wobble * 1.6,
    z: -8 + Math.sin(i * 1.7) * 2.4,
    height: 7.2 + wobble * 0.9,
    canopyRadius: 3.4 + Math.cos(i * 1.31) * 0.5,
    phase: (i * GOLDEN) % TAU,
    dark: i % 3 === 1,
  }
})

export interface GableHouse {
  x: number
  z: number
  width: number
  depth: number
  wallHeight: number
  roofHeight: number
}

// The harbour front: narrow gabled houses standing shoulder to shoulder, which
// is what gives the Hafenspitze its serrated edge against the sky.
export const quayHouses: readonly GableHouse[] = Array.from({ length: 24 }, (_, i) => {
  const wobble = Math.sin(i * GOLDEN)
  const gap = Math.cos(i * 0.9) * 1.2

  return {
    x: -118 + i * 10.2 + gap,
    z: -196 + Math.sin(i * 2.2) * 6,
    width: 8.2 + wobble * 1.4,
    depth: 9,
    wallHeight: 9.5 + wobble * 2.6,
    roofHeight: 5 + Math.cos(i * GOLDEN) * 1.4,
  }
})

export interface Spire {
  x: number
  z: number
  width: number
  towerHeight: number
  spireHeight: number
}

export const spires: readonly Spire[] = [
  { x: -30, z: -216, width: 7, towerHeight: 26, spireHeight: 17 },
  { x: 36, z: -224, width: 6, towerHeight: 21, spireHeight: 13 },
  { x: 9, z: -232, width: 5.4, towerHeight: 17, spireHeight: 10.5 },
]

export interface Mast {
  /** Offset along the hull from its centre. */
  at: number
  height: number
  /**
   * Length of the boom, zero for a mast that carries none. It sits just above
   * the deck, never up the mast: a crossbar high on a bare pole draws a cross,
   * which is why the rig is carried by the stays instead.
   */
  boom: number
}

export interface Ship {
  x: number
  z: number
  /** Rotation about y, so the fleet does not lie in one rank. */
  heading: number
  hullLength: number
  hullHeight: number
  masts: readonly Mast[]
  funnel?: { height: number; radius: number }
}

// The museum harbour is the one silhouette no other town on a fjord has: a
// stand of bare masts on the water, with the steamer's funnel among them. The
// fleet lies right of centre, clear of the headline's ground. Masts stay below
// the church spires so the town keeps the skyline and the harbour sits under it.
export const museumShips: readonly Ship[] = [
  {
    x: -14,
    z: -104,
    heading: 0.22,
    hullLength: 24,
    hullHeight: 5.2,
    masts: [
      { at: -5, height: 17, boom: 9 },
      { at: 6, height: 13.5, boom: 0 },
    ],
  },
  {
    x: 14,
    z: -92,
    heading: -0.14,
    hullLength: 19,
    hullHeight: 4.6,
    masts: [{ at: -1, height: 15, boom: 8 }],
  },
  {
    x: 42,
    z: -110,
    heading: 0.35,
    hullLength: 21,
    hullHeight: 4.9,
    masts: [
      { at: -4, height: 16, boom: 8.5 },
      { at: 5.5, height: 11, boom: 0 },
    ],
  },
  {
    x: 72,
    z: -94,
    heading: -0.28,
    hullLength: 26,
    hullHeight: 5.6,
    masts: [
      { at: -7, height: 10, boom: 0 },
      { at: 8, height: 9, boom: 0 },
    ],
    funnel: { height: 7.5, radius: 1.5 },
  },
]

export interface Cloud {
  x: number
  y: number
  z: number
  scale: number
  /** Metres per second across the sky, slower than the camera drift. */
  drift: number
}

/** Half the width the clouds wrap around in, so the band never runs out. */
export const cloudSpan = 300

/** Where a cloud has drifted to, wrapped back to the far side of the band. */
export function cloudX(cloud: Cloud, seconds: number): number {
  const width = cloudSpan * 2
  const travelled = cloud.x + cloudSpan + cloud.drift * seconds
  return (((travelled % width) + width) % width) - cloudSpan
}

export const clouds: readonly Cloud[] = Array.from({ length: 7 }, (_, i) => {
  const wobble = Math.sin(i * GOLDEN)

  return {
    x: -190 + i * 58 + wobble * 22,
    y: 54 + Math.cos(i * 1.4) * 15,
    z: -175 + Math.sin(i * 2.1) * 55,
    scale: 9.5 + wobble * 2.8,
    drift: 1.1 + Math.abs(wobble) * 0.7,
  }
})

export const fordeColors = {
  skyHigh: '#6FA0C6',
  skyMid: '#AECDDE',
  skyLow: '#EDF1EA',
  waterDeep: '#2B5F73',
  waterCrest: '#A8CBD4',
  cloud: '#F8FBFA',
  cloudShade: '#C6D9E4',
  quay: '#BDBBAB',
  quayEdge: '#A2A091',
  house: '#E4E2D6',
  // Brick, not taupe. It is what the harbour front is built from, and it is the
  // one warm note that keeps the town off the blue.
  roof: '#9A5F4A',
  spire: '#5F8A6E',
  hull: '#2E4438',
  // Weathered spruce, not near-black: the masts were the darkest thing on
  // screen and took the skyline away from the town.
  mast: '#6A5942',
  funnel: '#8B4A3C',
  sail: '#F0EADA',
  sailShaded: '#DED6C2',
  treeTrunk: '#7A5F46',
  treeCanopy: '#63A94A',
  treeCanopyDark: '#3E8038',
  fog: '#D5E3E4',
} as const
