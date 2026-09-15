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

export interface CanopyLobe {
  /** Offset from the top of the trunk, in canopy radii. */
  at: Vec3
  /** Radius, also in canopy radii. */
  radius: number
  /** Index into the three canopy greens, lit to shaded. */
  tone: number
}

export interface TreeLimb {
  /** Where the limb leaves the trunk, as a fraction of the trunk's height. */
  at: number
  /** Which way it heads, about y. */
  turn: number
  /** Lean off vertical. */
  lean: number
  length: number
  radius: number
}

export interface QuayTree {
  x: number
  z: number
  height: number
  trunkRadius: number
  canopyRadius: number
  phase: number
  /** A standing lean, added to the sway. No street tree grows plumb. */
  tilt: number
  limbs: readonly TreeLimb[]
  canopy: readonly CanopyLobe[]
}

// Spread by the golden angle so the spacing, heights and sway phases vary
// without a hand-kept table and without any two neighbours matching.
const GOLDEN = 2.399963

/**
 * Three limbs leaving the trunk on different bearings. Their lower stretch
 * shows below the foliage, which is what stops a crown from reading as a ball
 * balanced on a pole.
 */
function limbsOf(index: number, height: number, trunkRadius: number): readonly TreeLimb[] {
  return Array.from({ length: 3 }, (_, k) => ({
    at: 0.54 + k * 0.13,
    turn: index * GOLDEN + (k * TAU) / 3 + Math.sin(index + k) * 0.4,
    lean: 0.72 - k * 0.15,
    length: height * (0.34 - k * 0.05),
    radius: trunkRadius * (0.46 - k * 0.07),
  }))
}

const CROWN_LOBES = 6

/**
 * A core lobe with five smaller ones set around and above it. Turned off the
 * golden angle per tree, so no two crowns along the avenue share a silhouette.
 */
function crownOf(index: number, shaded: boolean): readonly CanopyLobe[] {
  const deepen = shaded ? 1 : 0
  const lobes: CanopyLobe[] = [{ at: [0, 0.3, 0], radius: 0.9, tone: 1 + deepen }]

  for (let k = 0; k < CROWN_LOBES - 1; k++) {
    const turn = index * GOLDEN + (k * TAU) / (CROWN_LOBES - 1)
    const reach = 0.62 + Math.sin(index * 1.3 + k * 1.9) * 0.13
    const lift = 0.5 + Math.cos(index * 0.7 + k * 1.3) * 0.38
    const toward = [Math.cos(turn) * reach, lift, Math.sin(turn) * reach * 0.72] as const
    // Shading the crown by hand beats waiting for a second light: lambert alone
    // flattens foliage this small into one green mass. The morning sun comes up
    // the Förde from +x, so a lobe reaching that way and sitting high in the
    // crown catches it. The camera's side, +z, counts too — a lobe in front of
    // the crown that takes a back lobe's tone reads as a hole punched in it.
    const lit = toward[0] * 0.5 + toward[2] * 0.4 + (lift - 0.5) * 0.9

    lobes.push({
      at: toward,
      radius: 0.44 + Math.cos(index * 1.7 + k * 2.3) * 0.1,
      tone: Math.min(2, (lit > 0.28 ? 0 : lit > -0.1 ? 1 : 2) + deepen),
    })
  }

  return lobes
}

// Close spacing and a modest crown: an avenue has to read as a row, and three
// oversized trees in frame hide the town they are supposed to stand in.
export const quayTrees: readonly QuayTree[] = Array.from({ length: 21 }, (_, i) => {
  const wobble = Math.sin(i * GOLDEN)
  const height = 7.2 + wobble * 0.9
  const trunkRadius = 0.42 + wobble * 0.06

  return {
    x: -90 + i * 9 + wobble * 1.6,
    z: -8 + Math.sin(i * 1.7) * 2.4,
    height,
    trunkRadius,
    canopyRadius: 3.4 + Math.cos(i * 1.31) * 0.5,
    phase: (i * GOLDEN) % TAU,
    tilt: Math.sin(i * 2.9) * 0.04,
    limbs: limbsOf(i, height, trunkRadius),
    canopy: crownOf(i, i % 3 === 1),
  }
})

// The pit each tree stands in: open soil inside a stone rim, the size a street
// tree gets in a paved promenade. It is also the thing the project measures.
// The soil stands a little proud of the rim, or the rim's own top face closes
// over it and the pit reads as a manhole cover.
export const treePit = {
  radius: 2.1,
  kerbWidth: 0.3,
  kerbHeight: 0.19,
  soilHeight: 0.24,
  /** How far the whole thing is set into the promenade. */
  sink: 0.12,
} as const

/** How tall a house's stone base stands before the first row of windows. */
export const HOUSE_PLINTH = 0.85

// Lime plaster in the tones the harbour front is actually painted in, with one
// brick red among them. Neighbours never share a colour, which is what keeps
// the row from reading as one long wall.
export const houseTones = ['#E4E2D6', '#DCD2C0', '#E9E6DC', '#CFBCA8', '#D7DBD3'] as const

export const roofTones = ['#9A5F4A', '#8A503E', '#A66C54', '#7C4738'] as const

export interface Chimney {
  /** Offset along the ridge from the house's centre. */
  at: number
  height: number
}

export interface GableHouse {
  x: number
  z: number
  width: number
  depth: number
  wallHeight: number
  roofHeight: number
  /** The Flensburg merchant front: a stepped gable standing proud of the roof. */
  stepped: boolean
  /** Indices into houseTones and roofTones. */
  wallTone: number
  roofTone: number
  /** Window rows above the plinth, and window columns across the facade. */
  floors: number
  bays: number
  chimneys: readonly Chimney[]
}

// The harbour front: narrow gabled houses standing shoulder to shoulder, which
// is what gives the Hafenspitze its serrated edge against the sky.
export const quayHouses: readonly GableHouse[] = Array.from({ length: 24 }, (_, i) => {
  const wobble = Math.sin(i * GOLDEN)
  const gap = Math.cos(i * 0.9) * 1.2
  const width = 8.2 + wobble * 1.4
  const wallHeight = 9.5 + wobble * 2.6

  return {
    x: -118 + i * 10.2 + gap,
    z: -196 + Math.sin(i * 2.2) * 6,
    width,
    depth: 9,
    wallHeight,
    roofHeight: 5 + Math.cos(i * GOLDEN) * 1.4,
    stepped: i % 4 === 1,
    wallTone: (i * 3) % houseTones.length,
    roofTone: (i * 2 + 1) % roofTones.length,
    floors: Math.max(2, Math.round((wallHeight - HOUSE_PLINTH) / 3.1)),
    bays: width > 8.4 ? 3 : 2,
    chimneys: Array.from({ length: i % 3 === 0 ? 2 : 1 }, (_, k) => ({
      at: (k === 0 ? -1 : 1) * (2.1 + Math.abs(wobble) * 0.8),
      height: 1.7 + Math.abs(Math.cos(i * 1.3 + k)) * 0.9,
    })),
  }
})

// The bank the harbour front stands on. It reaches past the outermost house so
// the row never ends in open water, and its top clears the wave crests.
export const farShore = {
  width: 560,
  depth: 140,
  centerZ: -252,
  top: 2.3,
  /** Carried well below the waterline, so no swell undercuts the bank. */
  height: 9,
} as const

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
  /**
   * Length of the gaff, the spar that carries the head of a four-cornered
   * mainsail above the boom. Only a mast with a boom sets one.
   */
  gaff?: number
}

export interface Ship {
  x: number
  z: number
  /** Rotation about y, so the fleet does not lie in one rank. */
  heading: number
  hullLength: number
  hullHeight: number
  /** Width across the hull amidships, before the ends are drawn in. */
  beam: number
  /** How far the bowsprit reaches past the stem, zero for a ship without one. */
  bowsprit: number
  /** A trunk cabin on deck, as an offset aft of centre and its size. */
  deckhouse?: { at: number; length: number; height: number }
  masts: readonly Mast[]
  funnel?: { height: number; radius: number }
}

// The museum harbour is the one silhouette no other town on a fjord has: a
// stand of masts on the water, with the steamer's funnel among them. Three
// ships, well apart: any closer together and the rigs read as one thicket, and
// the town behind them stops being a town. The fleet stays in the right half
// of the frame for the whole drift, clear of the headline's ground on the left.
// Masts stay below the church spires so the skyline still belongs to Flensburg
// and the harbour sits under it.
export const museumShips: readonly Ship[] = [
  {
    x: 10,
    z: -104,
    heading: 0.22,
    hullLength: 24,
    hullHeight: 5.2,
    beam: 6.4,
    bowsprit: 6,
    deckhouse: { at: 4.6, length: 5.4, height: 1.5 },
    masts: [
      { at: -5, height: 17, boom: 9, gaff: 7.5 },
      { at: 6, height: 13.5, boom: 0 },
    ],
  },
  {
    x: 40,
    z: -92,
    heading: -0.14,
    hullLength: 19,
    hullHeight: 4.6,
    beam: 5.4,
    bowsprit: 5,
    deckhouse: { at: 3.4, length: 4.2, height: 1.3 },
    masts: [{ at: -1, height: 15, boom: 8, gaff: 6.8 }],
  },
  {
    x: 64,
    z: -94,
    heading: -0.28,
    hullLength: 26,
    hullHeight: 5.6,
    beam: 7.2,
    bowsprit: 0,
    deckhouse: { at: 1.5, length: 9, height: 2.2 },
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
  housePlinth: '#B3ADA0',
  // The fascia under the eaves. A dark line there is what parts roof from wall
  // at this distance, where the shadow itself is far too soft to do it.
  houseEaves: '#8C8578',
  houseRidge: '#6E4335',
  windowGlass: '#4F6169',
  shopfront: '#3E4E55',
  chimney: '#8C6552',
  // A shade cooler and darker than the near promenade, or the two grounds read
  // as one plane and the Förde between them loses its depth.
  shore: '#9EA694',
  shoreEdge: '#6E7665',
  hull: '#2E4438',
  // The sheer strake. One light band under the deck edge is what separates a
  // hull from the water behind it at this distance, where the whole ship is
  // barely thirty pixels tall.
  hullStrake: '#9AA795',
  hullBoot: '#1F2E27',
  deckhouse: '#CFC9B7',
  deckhouseRoof: '#4A5A50',
  // Weathered spruce, not near-black: the masts were the darkest thing on
  // screen and took the skyline away from the town.
  mast: '#6A5942',
  funnel: '#8B4A3C',
  sail: '#F0EADA',
  sailShaded: '#DED6C2',
  treeTrunk: '#7A5F46',
  // The limbs sit against the crown rather than against the sky, so they carry
  // a touch more shade than the trunk or they wash out inside the foliage.
  treeLimb: '#6B5340',
  treeCanopyLit: '#86C25C',
  treeCanopy: '#63A94A',
  treeCanopyDark: '#3E8038',
  treePitSoil: '#8A7358',
  treePitKerb: '#A8A695',
  fog: '#D5E3E4',
} as const
