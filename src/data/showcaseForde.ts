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

export type TreeForm = 'spreading' | 'oval' | 'columnar' | 'layered'

export interface CanopyLobe {
  /** Offset from the top of the trunk, in canopy radii. */
  at: Vec3
  /** Half-extents per axis, also in canopy radii. Never equal: foliage is not a ball. */
  scale: Vec3
  /** Turn about y and roll about z, so no two lobes show the same facets. */
  spin: number
  roll: number
  /** Index into the tree's three canopy greens, lit to shaded. */
  tone: number
  /** The crown's body is finer than the clumps on its outside. */
  smooth: boolean
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
  form: TreeForm
  height: number
  trunkRadius: number
  canopyRadius: number
  phase: number
  /** A standing lean, added to the sway. No street tree grows plumb. */
  tilt: number
  /** Which of the canopy palettes the crown is painted from. */
  shade: number
  limbs: readonly TreeLimb[]
  canopy: readonly CanopyLobe[]
}

/** Where a limb ends, relative to the foot of the trunk. */
export function limbTip(limb: TreeLimb, height: number): Vec3 {
  const out = Math.sin(limb.lean) * limb.length
  return [
    Math.cos(limb.turn) * out,
    height * limb.at + Math.cos(limb.lean) * limb.length,
    -Math.sin(limb.turn) * out,
  ]
}

// Spread by the golden angle so the spacing, heights and sway phases vary
// without a hand-kept table and without any two neighbours matching.
const GOLDEN = 2.399963

/** A stable pseudo-random in [0, 1) for one part of one tree. */
function hash(index: number, salt: number): number {
  const raw = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return raw - Math.floor(raw)
}

interface CrownForm {
  /** Mean height of the whole tree, and the canopy radius that goes with it. */
  height: number
  canopy: number
  /**
   * The crown as an ellipsoid: its centre above the top of the trunk and its
   * half-extents across and up, all in canopy radii.
   */
  centre: number
  spread: number
  rise: number
  /**
   * Where each limb leaves the trunk, as a fraction of its height, and how
   * high on the crown's shell it aims, as an elevation in radians.
   */
  limbs: readonly { at: number; climb: number }[]
  /** How many lobes fill the shell between the limb tips. */
  fill: number
  /** The body of the crown as a fraction of its ellipsoid. Small for tiers to show. */
  core: number
  /** How a lobe is squashed: flat and wide for a plane tree, tall for a poplar. */
  lobe: Vec3
}

// Four silhouettes an avenue actually mixes: a broad oak-like head, the egg of
// a lime, the column of a poplar and the flat tiers of a plane tree.
const CROWN_FORMS: Record<TreeForm, CrownForm> = {
  spreading: {
    height: 6.8,
    canopy: 3,
    centre: 0.1,
    spread: 1.15,
    rise: 1,
    limbs: [
      { at: 0.6, climb: -0.2 },
      { at: 0.66, climb: 0.05 },
      { at: 0.72, climb: 0.3 },
      { at: 0.78, climb: 0.55 },
    ],
    fill: 6,
    core: 0.8,
    lobe: [1, 0.78, 0.92],
  },
  oval: {
    height: 7,
    canopy: 2.6,
    centre: 0.5,
    spread: 1,
    rise: 1.5,
    limbs: [
      { at: 0.62, climb: 0 },
      { at: 0.7, climb: 0.3 },
      { at: 0.78, climb: 0.6 },
    ],
    fill: 6,
    core: 0.8,
    lobe: [0.9, 1.15, 0.9],
  },
  columnar: {
    height: 6.8,
    canopy: 1.8,
    centre: 0.4,
    spread: 0.95,
    rise: 2.4,
    limbs: [
      { at: 0.55, climb: 0.4 },
      { at: 0.65, climb: 0.7 },
      { at: 0.75, climb: 1 },
    ],
    fill: 8,
    core: 0.8,
    lobe: [0.8, 1.4, 0.8],
  },
  layered: {
    height: 6.6,
    canopy: 3,
    centre: 0.05,
    spread: 1.15,
    rise: 1,
    limbs: [
      { at: 0.58, climb: -0.3 },
      { at: 0.64, climb: 0 },
      { at: 0.7, climb: 0.3 },
      { at: 0.76, climb: 0.6 },
      { at: 0.82, climb: 0.9 },
    ],
    fill: 4,
    core: 0.55,
    lobe: [1.15, 0.5, 1],
  },
}

const FORM_ORDER: readonly TreeForm[] = ['spreading', 'oval', 'layered', 'columnar']

// Lobes sit inside the shell, not on it, so their outer faces make the
// silhouette rather than their centres.
const SHELL = 0.75

/** A point on the crown's shell, in canopy radii from the top of the trunk. */
function onShell(form: CrownForm, turn: number, climb: number, depth = SHELL): Vec3 {
  const across = Math.cos(climb) * form.spread * depth
  return [
    Math.cos(turn) * across,
    form.centre + Math.sin(climb) * form.rise * depth,
    -Math.sin(turn) * across,
  ]
}

/**
 * Limbs leave the trunk on spread bearings and are aimed at the crown's shell,
 * so every one of them ends inside the foliage, and the stretch below shows
 * where the trunk becomes a tree rather than a post with a ball on it.
 */
function limbsOf(
  index: number,
  form: CrownForm,
  height: number,
  canopyRadius: number,
  trunkRadius: number,
): readonly TreeLimb[] {
  return form.limbs.map((limb, k) => {
    const turn = index * GOLDEN + (k * TAU) / form.limbs.length + (hash(index, k) - 0.5) * 0.6
    const target = onShell(form, turn, limb.climb)
    const dx = target[0] * canopyRadius
    const dy = height * (1 - limb.at) + target[1] * canopyRadius
    const dz = target[2] * canopyRadius
    const out = Math.hypot(dx, dz)

    return {
      at: limb.at,
      turn: Math.atan2(-dz, dx),
      lean: Math.atan2(out, dy),
      length: Math.hypot(out, dy),
      radius: trunkRadius * (0.5 - k * 0.04),
    }
  })
}

/**
 * One body the shape of the crown, a lobe at every limb tip, more scattered
 * over the shell between them and one on top. The outer lobes are squashed to
 * the form and turned on their own, so a crown reads as clumps of leaves on
 * branches rather than as a stack of spheres, and the body behind them keeps
 * the sky from showing through.
 */
function crownOf(
  index: number,
  form: CrownForm,
  limbs: readonly TreeLimb[],
  height: number,
  canopyRadius: number,
): readonly CanopyLobe[] {
  const lobes: CanopyLobe[] = []

  const add = (at: Vec3, scale: Vec3, smooth = false) => {
    // Shading the crown by hand beats waiting for a second light: lambert alone
    // flattens foliage this small into one green mass. The morning sun comes up
    // the Förde from +x, so a lobe reaching that way and sitting high in the
    // crown catches it. The camera's side, +z, counts too — a lobe in front of
    // the crown that takes a back lobe's tone reads as a hole punched in it.
    const lit = at[0] * 0.5 + at[2] * 0.4 + (at[1] - form.centre) * 0.7

    lobes.push({
      at,
      scale,
      spin: hash(index, lobes.length + 11) * TAU,
      roll: (hash(index, lobes.length + 23) - 0.5) * (smooth ? 0.2 : 0.5),
      tone: lit > 0.28 ? 0 : lit > -0.1 ? 1 : 2,
      smooth,
    })
  }

  const clump = (at: Vec3, radius: number) =>
    add(at, [form.lobe[0] * radius, form.lobe[1] * radius, form.lobe[2] * radius])

  add(
    [0, form.centre, 0],
    [form.spread * form.core, form.rise * form.core, form.spread * form.core * 0.85],
    true,
  )

  for (const limb of limbs) {
    const tip = limbTip(limb, height)
    clump(
      [tip[0] / canopyRadius, (tip[1] - height) / canopyRadius, tip[2] / canopyRadius],
      0.55 + hash(index, lobes.length) * 0.14,
    )
  }

  for (let k = 0; k < form.fill; k++) {
    const turn = index * GOLDEN * 1.7 + (k * TAU) / form.fill + hash(index, k + 40) * 0.8
    const climb = lerp(-0.45, 1, (k + 0.5) / form.fill) + (hash(index, k + 50) - 0.5) * 0.3
    clump(
      onShell(form, turn, climb, SHELL - 0.08 + hash(index, k + 60) * 0.16),
      0.5 + hash(index, k + 70) * 0.14,
    )
  }

  clump([0, form.centre + form.rise * 0.55, 0], 0.58)

  return lobes
}

// Close spacing and a modest crown: an avenue has to read as a row, and three
// oversized trees in frame hide the town they are supposed to stand in.
export const quayTrees: readonly QuayTree[] = Array.from({ length: 21 }, (_, i) => {
  const wobble = Math.sin(i * GOLDEN)
  // Stepped by the golden angle rather than hashed: a hash happily deals the
  // same form to three neighbours, and a run of three is what the eye catches.
  const form = FORM_ORDER[Math.floor(((((i + 1) * GOLDEN) % TAU) / TAU) * FORM_ORDER.length)]
  const shape = CROWN_FORMS[form]
  const height = shape.height * (0.9 + hash(i, 5) * 0.2)
  const trunkRadius = height * 0.055 + wobble * 0.04
  const canopyRadius = shape.canopy * (0.92 + hash(i, 7) * 0.16)
  const limbs = limbsOf(i, shape, height, canopyRadius, trunkRadius)

  return {
    x: -90 + i * 9 + wobble * 1.6,
    z: -8 + Math.sin(i * 1.7) * 2.4,
    form,
    height,
    trunkRadius,
    canopyRadius,
    phase: (i * GOLDEN) % TAU,
    tilt: Math.sin(i * 2.9) * 0.04,
    shade: Math.floor(hash(i, 9) * 3),
    limbs,
    canopy: crownOf(i, shape, limbs, height, canopyRadius),
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

// Lime plaster in the tones the harbour front is actually painted in: the pale
// ones first, then the ochre, the oxblood red and the Baltic blue-grey that turn
// up once or twice in every Flensburg street. The last is the dark brick of the
// warehouses, which is why it stands outside the plaster sequence.
export const houseTones = [
  '#E4E2D6',
  '#DCD2C0',
  '#E9E6DC',
  '#CFBCA8',
  '#D7DBD3',
  '#D9BB7C',
  '#B5695A',
  '#BFCBD0',
  '#8E5B49',
] as const

/** Index of the warehouse brick in houseTones. */
export const WAREHOUSE_BRICK = 8

/** Index of the warehouse slate in roofTones. */
export const WAREHOUSE_SLATE = 4

// Pantiles in four reds, then slate and a dark tar-paper brown for the roofs
// that were never tiled.
export const roofTones = ['#9A5F4A', '#8A503E', '#A66C54', '#7C4738', '#5E6468', '#6B4A3E'] as const

export interface Chimney {
  /** Offset along the ridge from the house's centre. */
  at: number
  height: number
}

/**
 * gable: the ridge runs away from the water and the gable faces it, the
 *   merchant house that gives the front its serrated edge.
 * eaves: the ridge runs along the street and the long roof slope faces the
 *   water, with dormers in it.
 * warehouse: a wide brick store with hatches instead of windows and a hoist
 *   beam under the gable.
 */
export type HouseKind = 'gable' | 'eaves' | 'warehouse'

export interface HarbourHouse {
  kind: HouseKind
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
  /** A front door in the ground floor, rather than a shop window across it. */
  door: boolean
  /** A light string course between the ground floor and the first. */
  banded: boolean
  /** Dormers in the front slope; only an eaves house has room for them. */
  dormers: number
  chimneys: readonly Chimney[]
}

export interface Spire {
  x: number
  z: number
  width: number
  towerHeight: number
  spireHeight: number
  /** Bare brick rather than lime plaster, the way Flensburg's churches are built. */
  brick: boolean
  /** Four small pinnacles at the corners where the spire leaves the tower. */
  pinnacles: boolean
  /** A lantern set between the tower and the spire: the baroque cap, not the gothic needle. */
  lantern: boolean
  clock: boolean
}

/** How tall a storey of tower windows is, from sill to sill. */
export const TOWER_STOREY = 4.6

/** The height of the belfry, the open top storey that carries the bells. */
export const BELFRY_HEIGHT = 5

// Four towers, none alike: the tall needle over the old town, the baroque
// lantern beside it, a small parish spire behind and a brick tower out on the
// right, where the row would otherwise run on unbroken to the edge of the frame.
export const spires: readonly Spire[] = [
  {
    x: -30,
    z: -216,
    width: 7,
    towerHeight: 26,
    spireHeight: 17,
    brick: false,
    pinnacles: true,
    lantern: false,
    clock: true,
  },
  {
    x: 36,
    z: -224,
    width: 6,
    towerHeight: 21,
    spireHeight: 13,
    brick: false,
    pinnacles: false,
    lantern: true,
    clock: true,
  },
  {
    x: 9,
    z: -232,
    width: 5.4,
    towerHeight: 17,
    spireHeight: 10.5,
    brick: false,
    pinnacles: false,
    lantern: false,
    clock: false,
  },
  {
    x: 112,
    z: -226,
    width: 6.4,
    towerHeight: 20,
    spireHeight: 12.5,
    brick: true,
    pinnacles: true,
    lantern: false,
    clock: true,
  },
]

interface HouseRow {
  /** The stretch of bank the row fills along x. */
  from: number
  to: number
  z: number
  /** How far a house may stand off the row's line. */
  stagger: number
  wallHeight: number
  /** Offsets the sequence, so the back row repeats nothing the front one does. */
  seed: number
}

// A warehouse every ninth house and an eaves house every third: enough of each
// to break the gables' rhythm, not so many that the front stops being gabled.
function kindOf(n: number): HouseKind {
  if (n % 9 === 4) {
    return 'warehouse'
  }
  return n % 3 === 2 ? 'eaves' : 'gable'
}

const PLASTER_TONES = 8
const PANTILE_TONES = 4

function houseOf(n: number, row: HouseRow, x: number, width: number): HarbourHouse {
  const kind = kindOf(n)
  const wobble = Math.sin(n * GOLDEN)
  const rise = kind === 'warehouse' ? 1.25 : kind === 'eaves' ? 0.88 : 1
  const wallHeight = row.wallHeight * rise + wobble * 2.6
  const storey = kind === 'warehouse' ? 3.6 : 3.1
  const chimneySpread = kind === 'eaves' ? width * 0.3 : 2.1 + Math.abs(wobble) * 0.8

  return {
    kind,
    x,
    z: row.z + Math.sin(n * 2.2) * row.stagger,
    width,
    depth: kind === 'eaves' ? 8 : 9,
    wallHeight,
    roofHeight: (kind === 'eaves' ? 4.2 : 5) + Math.cos(n * GOLDEN) * 1.4,
    stepped: kind === 'gable' && n % 4 === 1,
    wallTone: kind === 'warehouse' ? WAREHOUSE_BRICK : (n * 3) % PLASTER_TONES,
    roofTone:
      kind === 'warehouse' ? WAREHOUSE_SLATE : (n * 2 + 1) % (n % 7 === 6 ? 6 : PANTILE_TONES),
    floors: Math.max(2, Math.round((wallHeight - HOUSE_PLINTH) / storey)),
    bays: kind === 'warehouse' ? 4 : width > 8.4 ? 3 : 2,
    door: kind !== 'warehouse' && n % 5 !== 0,
    banded: kind !== 'warehouse' && n % 3 === 0,
    dormers: kind === 'eaves' ? (width > 10.5 ? 2 : 1) : 0,
    chimneys: Array.from({ length: n % 3 === 0 ? 2 : 1 }, (_, k) => ({
      at: (k === 0 ? -1 : 1) * chimneySpread,
      height: 1.7 + Math.abs(Math.cos(n * 1.3 + k)) * 0.9,
    })),
  }
}

// Houses are set down one after another, each as wide as its kind wants, so
// the row has the uneven beat of a street built one plot at a time instead of
// the tick of a fixed pitch.
function houseRow(row: HouseRow): readonly HarbourHouse[] {
  const houses: HarbourHouse[] = []
  let cursor = row.from

  for (let i = 0; cursor < row.to; i++) {
    const n = i + row.seed
    const kind = kindOf(n)
    const wobble = Math.sin(n * GOLDEN)
    const width =
      kind === 'warehouse'
        ? 12.5 + wobble
        : kind === 'eaves'
          ? 10.4 + wobble * 1.4
          : 7.6 + wobble * 1.4
    const gap = 0.4 + Math.abs(Math.cos(n * 0.9)) * 1.4

    houses.push(houseOf(n, row, cursor + width / 2, width))
    cursor += width + gap
  }

  return houses
}

function crowdsASpire(house: HarbourHouse): boolean {
  return spires.some((spire) => Math.abs(house.x - spire.x) < (spire.width + house.width) / 2 + 0.5)
}

// The harbour front: narrow gabled houses standing shoulder to shoulder, which
// is what gives the Hafenspitze its serrated edge against the sky. The row runs
// well past a widescreen frame at either end of the camera's drift: a bank that
// turns bare at the edge reads as the end of town, not as the end of the frame.
const harbourFront = houseRow({
  from: -206,
  to: 206,
  z: -196,
  stagger: 6,
  wallHeight: 9.5,
  seed: 0,
})

// A second row, started half a house along, so its roofs show in the gaps of
// the front one. It stands a little taller: the front row already sits close to
// the horizon, and a back house of the same height would hide behind it
// entirely. It leaves the church towers standing free rather than growing out
// of a roof.
const backStreet = houseRow({
  from: -201,
  to: 206,
  z: -214,
  stagger: 3.5,
  wallHeight: 10.6,
  seed: 17,
}).filter((house) => !crowdsASpire(house))

export const quayHouses: readonly HarbourHouse[] = [...harbourFront, ...backStreet]

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
  // Lighter than the roofs on purpose: a brick tower under a brick-red roof
  // tone would merge with the row it stands in.
  towerBrick: '#A97962',
  // The louvres of the belfry, darker than glass: they are open to the bells.
  belfry: '#33414A',
  clockFace: '#F3EFE3',
  finial: '#D9C27A',
  housePlinth: '#B3ADA0',
  // The fascia under the eaves. A dark line there is what parts roof from wall
  // at this distance, where the shadow itself is far too soft to do it.
  houseEaves: '#8C8578',
  houseRidge: '#6E4335',
  windowGlass: '#4F6169',
  // The frame around the glass. A light edge is what turns a dark rectangle
  // into a sash window at this distance, and it is the one detail every
  // painted harbour front shares.
  windowFrame: '#F4F1E8',
  shopfront: '#3E4E55',
  door: '#3D5046',
  hatch: '#4A423B',
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
  // Five greens for three palettes: a fresh yellowish one, the plain one and
  // a deep one, so the avenue is not twenty-one copies of the same tree.
  treeCanopyWarm: '#A8CA5E',
  treeCanopyLit: '#86C25C',
  treeCanopy: '#63A94A',
  treeCanopyDark: '#3E8038',
  treeCanopyDeep: '#2E6B33',
  treePitSoil: '#8A7358',
  treePitKerb: '#A8A695',
  fog: '#D5E3E4',
} as const
