export type GroundPoint = readonly [number, number]

export interface TourLeg {
  points: readonly GroundPoint[]
  fill: number
}

// One tour through the field, split at every stop. `fill` is how full the tank
// is while the vehicle drives that leg. The level moves while the vehicle
// dwells: it drops at each stop and rises back to 1 at the refill station and
// at the depot. The gauge beside the model reads from it.
// Every mark sits on a straight run, so a curve through all points stays on the
// legs and the vehicle never cuts a corner. That goes for the depot too: the
// tour starts and ends just past the last bend, so the loop closes without a
// kink and the vehicle leaves the depot the way it arrived.
export const tourLegs: TourLeg[] = [
  {
    points: [
      [10, 56],
      [10, 26],
      [18, 26],
    ],
    fill: 1,
  },
  {
    points: [
      [18, 26],
      [26, 26],
      [26, 12],
      [40, 12],
    ],
    fill: 0.72,
  },
  {
    points: [
      [40, 12],
      [48, 12],
      [48, 30],
      [56, 30],
    ],
    fill: 0.4,
  },
  {
    points: [
      [56, 30],
      [68, 30],
      [68, 14],
      [78, 14],
    ],
    fill: 1,
  },
  {
    points: [
      [78, 14],
      [86, 14],
      [86, 44],
    ],
    fill: 0.74,
  },
  {
    points: [
      [86, 44],
      [86, 58],
      [52, 58],
    ],
    fill: 0.44,
  },
  {
    points: [
      [52, 58],
      [26, 58],
      [26, 62],
      [10, 62],
      [10, 56],
    ],
    fill: 0.18,
  },
]

export interface TourMark {
  at: GroundPoint
  kind: 'depot' | 'stop' | 'refill'
  label: string
}

export const tourMarks: TourMark[] = [
  { at: [10, 56], kind: 'depot', label: 'Depot' },
  { at: [18, 26], kind: 'stop', label: '1' },
  { at: [40, 12], kind: 'stop', label: '2' },
  { at: [56, 30], kind: 'refill', label: 'Nachfüllstation' },
  { at: [78, 14], kind: 'stop', label: '3' },
  { at: [86, 44], kind: 'stop', label: '4' },
  { at: [52, 58], kind: 'stop', label: '5' },
]

/** The two faces the camera sees; a door can only be on one of those. */
export type VisibleFace = '+x' | '+z'

export interface CityBlock {
  x: number
  z: number
  width: number
  depth: number
  /** Height of the walls up to the eaves or the parapet. */
  height: number
  floors: number
  roof: 'flat' | 'gable'
  /** Rise of a gable roof above the walls; ignored for a flat roof. */
  roofHeight: number
  /** Index into blockTones. */
  tone: number
  door: VisibleFace
}

// Placed by hand around the route, never closer than half a unit to the kerb,
// and never into one another.
export const cityBlocks: CityBlock[] = [
  {
    x: 34,
    z: 43,
    width: 13,
    depth: 11,
    height: 4.4,
    floors: 2,
    roof: 'flat',
    roofHeight: 0,
    tone: 0,
    door: '+z',
  },
  {
    x: 18.5,
    z: 44,
    width: 9,
    depth: 13,
    height: 4.4,
    floors: 2,
    roof: 'gable',
    roofHeight: 2.2,
    tone: 1,
    door: '+z',
  },
  {
    x: 33.5,
    z: 21,
    width: 7,
    depth: 8,
    height: 6.6,
    floors: 3,
    roof: 'flat',
    roofHeight: 0,
    tone: 2,
    door: '+z',
  },
  {
    x: 58,
    z: 21,
    width: 10,
    depth: 8,
    height: 4.4,
    floors: 2,
    roof: 'gable',
    roofHeight: 2,
    tone: 3,
    door: '+x',
  },
  {
    x: 63,
    z: 46,
    width: 12,
    depth: 10,
    height: 4.4,
    floors: 2,
    roof: 'flat',
    roofHeight: 0,
    tone: 1,
    door: '+z',
  },
  {
    x: 0,
    z: 30,
    width: 10,
    depth: 12,
    height: 4.4,
    floors: 2,
    roof: 'gable',
    roofHeight: 2.4,
    tone: 2,
    door: '+x',
  },
  {
    x: 14,
    z: 14,
    width: 9,
    depth: 8,
    height: 2.4,
    floors: 1,
    roof: 'flat',
    roofHeight: 0,
    tone: 0,
    door: '+z',
  },
  {
    x: 24,
    z: 3.5,
    width: 10,
    depth: 8,
    height: 4.4,
    floors: 2,
    roof: 'gable',
    roofHeight: 2,
    tone: 3,
    door: '+z',
  },
  {
    x: 53,
    z: 3.5,
    width: 11,
    depth: 8,
    height: 2.4,
    floors: 1,
    roof: 'flat',
    roofHeight: 0,
    tone: 1,
    door: '+z',
  },
  {
    x: 65,
    z: 3.5,
    width: 10,
    depth: 8,
    height: 4.4,
    floors: 2,
    roof: 'gable',
    roofHeight: 2.2,
    tone: 0,
    door: '+x',
  },
]

export const windowSpec = {
  width: 1.1,
  height: 1.3,
  /** Wall left between two windows and at either end of a row. */
  gap: 0.9,
  /** Wall below a window in its storey. */
  sill: 0.6,
  /** How far the frame stands proud of the wall. */
  relief: 0.08,
} as const

/** How many windows fit across a face of the given length. */
export function baysFor(faceLength: number) {
  return Math.max(
    0,
    Math.floor((faceLength - windowSpec.gap) / (windowSpec.width + windowSpec.gap)),
  )
}

export const parapet = { height: 0.3, width: 0.35 } as const
export const doorSpec = { width: 1.4, height: 2.1 } as const

export interface Lawn {
  x: number
  z: number
  width: number
  depth: number
}

// Green patches on the ground between the blocks, low enough to walk over.
export const lawns: Lawn[] = [
  { x: 40, z: 52, width: 12, depth: 5 },
  { x: 3.5, z: 46, width: 6, depth: 8 },
  { x: 66, z: 65, width: 12, depth: 5 },
  { x: 36, z: 66, width: 10, depth: 5 },
  { x: 52, z: 40, width: 5, depth: 8 },
]

export const lawnHeight = 0.08

export const roadHeight = 0.2
export const roadWidth = 5
export const centerLine = { width: 0.5, dash: 2.6, gap: 3.2, lift: 0.05 } as const
/** A pale pavement either side of the carriageway, a step below its surface. */
export const kerb = { width: 0.9, drop: 0.08 } as const
export const depotWidth = 10
export const depotDepth = 9
export const depotHeight = 4.6
export const depotRoofHeight = 1.8
export const depotDoor = { width: 4.2, height: 3.6 } as const

// The hall stands west of the first leg with its gate to the road, so the
// vehicle parks in the forecourt in front of it. It has to stay behind the
// parked vehicle as the camera sees it, or it hides the vehicle instead.
export const depotPosition: GroundPoint = [0.5, 56]
// Markers stand at the kerb, never on the carriageway, so the vehicle drives
// past them instead of through them.
export const markerOffset = 3.4

export const stopMarker = {
  plateRadius: 1.3,
  plateHeight: 0.3,
  postRadius: 0.32,
  postHeight: 3.2,
  capRadius: 1,
  capHeight: 0.4,
} as const

export const refillMarker = {
  plateRadius: 1.7,
  plateHeight: 0.3,
  postRadius: 0.48,
  postHeight: 6.2,
  // the arm has to clear the tank on the vehicle passing underneath it
  armHeight: 5.8,
  armLength: 3.6,
  armRadius: 0.28,
  nozzleLength: 0.9,
} as const

export const tourColors = {
  road: '#4C7741',
  roadLine: '#DCE3C9',
  kerb: '#E4E7DA',
  depot: '#3D5F35',
  depotRoof: '#34522D',
  depotDoor: '#5C7F52',
  stop: '#658A58',
  refill: '#ACB63B',
  refillCabinet: '#8E962F',
  block: '#EAEDE2',
  blockTop: '#F6F7F1',
  blockShaded: '#DFE3D6',
  blockRoof: '#D9DDCE',
  blockGableRoof: '#C9CFBD',
  window: '#AFC4B8',
  windowFrame: '#F7F8F2',
  door: '#7A8F6E',
  unitTop: '#E7EBDC',
  unitLit: '#DCE1CF',
  unitShaded: '#CFD5C1',
  ground: '#F3F5EC',
  groundSide: '#E2E6D6',
  lawn: '#C9DBB0',
  treePitSoil: '#A8906E',
  treePitKerb: '#D8DBCB',
  treeTrunk: '#8A6E52',
  treeCanopy: '#82AD66',
  treeCanopyLit: '#95BC75',
  treeCanopyDark: '#66914F',
  treeCanopyDeep: '#557E42',
  shadow: '#2C4726',
  vehicleBody: '#2C4726',
  vehicleTrim: '#3B5C33',
  vehicleTank: '#F1F3EA',
  vehicleTankBand: '#DDE2D2',
  vehicleGlass: '#C7D6CB',
  vehicleWheel: '#243722',
  vehicleHub: '#B9C1B0',
  vehicleLamp: '#F6F1D6',
  water: '#B7CFC2',
} as const

// Pale walls in four near tones: enough for neighbouring blocks to read as
// separate houses without any of them competing with the vehicle.
export const blockTones = ['#EAEDE2', '#E3E4D6', '#EDEBE0', '#DEE3D9'] as const

function polylineLength(points: readonly GroundPoint[]) {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }
  return length
}

const legLengths = tourLegs.map((leg) => polylineLength(leg.points))
/** Ground units driven in one full round; the wheels spin against it. */
export const tourLength = legLengths.reduce((sum, length) => sum + length, 0)

const legEnd = (() => {
  let running = 0

  return legLengths.map((length) => {
    running += length / tourLength
    return running
  })
})()

export const staticTourPosition = 0.75

export const staticTankLevel = (() => {
  const index = legEnd.findIndex((end) => staticTourPosition <= end)
  return tourLegs[index === -1 ? tourLegs.length - 1 : index].fill
})()

// Where the sketch parks the vehicle: the same share of the way round the tour
// that the 3D model uses when it stands still. Every leg runs along an axis,
// so the heading is always axis-aligned.
export const staticVehiclePose = (() => {
  const points = tourLegs.flatMap((leg, index) => (index === 0 ? leg.points : leg.points.slice(1)))
  let remaining = tourLength * staticTourPosition

  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dz = points[i][1] - points[i - 1][1]
    const segment = Math.hypot(dx, dz)

    if (remaining <= segment) {
      const at: GroundPoint = [
        points[i - 1][0] + (dx / segment) * remaining,
        points[i - 1][1] + (dz / segment) * remaining,
      ]
      return { at, heading: [dx / segment, dz / segment] as GroundPoint }
    }

    remaining -= segment
  }

  return { at: points[0], heading: [0, -1] as GroundPoint }
})()

function legHeading(index: number): GroundPoint {
  const [from, to] = tourLegs[index].points
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)

  return [dx / length, dz / length]
}

export interface StopPlacement {
  kind: 'stop' | 'refill'
  label: string
  onRoad: GroundPoint
  at: GroundPoint
  towardsRoad: GroundPoint
}

export const stopPlacements: StopPlacement[] = tourMarks.flatMap((mark, index) => {
  if (mark.kind === 'depot') return []

  const heading = legHeading(index)
  const left: GroundPoint = [-heading[1], heading[0]]

  return [
    {
      kind: mark.kind,
      label: mark.label,
      onRoad: mark.at,
      at: [mark.at[0] + left[0] * markerOffset, mark.at[1] + left[1] * markerOffset],
      towardsRoad: [-left[0], -left[1]],
    },
  ]
})

export interface Tree {
  at: GroundPoint
  trunkHeight: number
  canopyRadius: number
  dark: boolean
}

// One tree behind every stop pin: the stops are the trees the tour waters.
export const stopTrees: Tree[] = stopPlacements
  .filter((stop) => stop.kind === 'stop')
  .map((stop, index) => ({
    at: [stop.at[0] - stop.towardsRoad[0] * 2.6, stop.at[1] - stop.towardsRoad[1] * 2.6],
    trunkHeight: 2.1 + (index % 3) * 0.35,
    canopyRadius: 1.7 + (index % 2) * 0.35,
    dark: index % 2 === 1,
  }))

// Loose greenery between the blocks, kept clear of the road and the blocks.
export const looseTrees: Tree[] = [
  { at: [16, 34], trunkHeight: 2.4, canopyRadius: 2, dark: false },
  { at: [44, 40], trunkHeight: 2.7, canopyRadius: 2.2, dark: true },
  { at: [74, 22], trunkHeight: 2.2, canopyRadius: 1.8, dark: false },
  { at: [3, 44], trunkHeight: 2.5, canopyRadius: 2, dark: true },
  { at: [36, 66], trunkHeight: 2.3, canopyRadius: 1.9, dark: false },
  { at: [68, 64], trunkHeight: 2.6, canopyRadius: 2.1, dark: true },
]

export const trees: Tree[] = [...stopTrees, ...looseTrees]

// The canopy sinks a little way onto the trunk instead of balancing on its tip.
export function canopyCenterHeight(tree: Tree) {
  return tree.trunkHeight + tree.canopyRadius * 0.65
}

export interface RoofUnit {
  at: GroundPoint
  width: number
  depth: number
  height: number
  base: number
}

// `base` is the height of the flat roof the unit stands on.
export const roofUnits: RoofUnit[] = [
  { at: [31.5, 41], width: 2.4, depth: 2, height: 1, base: 4.4 },
  { at: [61, 44.5], width: 2.2, depth: 2, height: 0.9, base: 4.4 },
  { at: [66, 48.5], width: 1.6, depth: 1.6, height: 0.7, base: 4.4 },
  { at: [34.5, 19.5], width: 2, depth: 1.8, height: 0.8, base: 6.6 },
]

// A rounded diorama plate under the whole scene, sized so everything above
// keeps the same margin to its edge.
export const groundPlate = (() => {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  const include = (x: number, z: number) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  for (const block of cityBlocks) {
    include(block.x - block.width / 2, block.z - block.depth / 2)
    include(block.x + block.width / 2, block.z + block.depth / 2)
  }

  include(depotPosition[0] - depotWidth / 2, depotPosition[1] - depotDepth / 2)
  include(depotPosition[0] + depotWidth / 2, depotPosition[1] + depotDepth / 2)

  for (const lawn of lawns) {
    include(lawn.x - lawn.width / 2, lawn.z - lawn.depth / 2)
    include(lawn.x + lawn.width / 2, lawn.z + lawn.depth / 2)
  }

  for (const leg of tourLegs) {
    for (const [x, z] of leg.points) {
      include(x - roadWidth / 2 - kerb.width, z - roadWidth / 2 - kerb.width)
      include(x + roadWidth / 2 + kerb.width, z + roadWidth / 2 + kerb.width)
    }
  }

  for (const tree of trees) {
    include(tree.at[0] - tree.canopyRadius, tree.at[1] - tree.canopyRadius)
    include(tree.at[0] + tree.canopyRadius, tree.at[1] + tree.canopyRadius)
  }

  for (const stop of stopPlacements) {
    include(stop.at[0] - 2, stop.at[1] - 2)
    include(stop.at[0] + 2, stop.at[1] + 2)
  }

  const pad = 4

  return {
    minX: minX - pad,
    minZ: minZ - pad,
    width: maxX - minX + pad * 2,
    depth: maxZ - minZ + pad * 2,
    radius: 7,
    thickness: 1.1,
  }
})()

// The vehicle dwells at every mark: watering at a stop, filling up at the
// refill station and overnight at the depot.
const stopDwell = 1.1
const refillDwell = 2
const depotDwell = 1.6
const driveSeconds = 17

function markAfterLeg(legIndex: number) {
  return tourMarks[(legIndex + 1) % tourMarks.length]
}

interface TimelineSegment {
  start: number
  duration: number
  leg: number
  dwell: boolean
}

const timeline: TimelineSegment[] = (() => {
  const segments: TimelineSegment[] = []
  let start = 0

  tourLegs.forEach((_, index) => {
    const drive = (legLengths[index] / tourLength) * driveSeconds
    segments.push({ start, duration: drive, leg: index, dwell: false })
    start += drive

    const mark = markAfterLeg(index)
    const dwell =
      mark.kind === 'refill' ? refillDwell : mark.kind === 'depot' ? depotDwell : stopDwell
    segments.push({ start, duration: dwell, leg: index, dwell: true })
    start += dwell
  })

  return segments
})()

export const tourSeconds =
  timeline[timeline.length - 1].start + timeline[timeline.length - 1].duration

function smoothstep(value: number) {
  const clamped = Math.min(Math.max(value, 0), 1)
  return clamped * clamped * (3 - 2 * clamped)
}

export interface TourFrame {
  at: number
  level: number
  dwellMark: TourMark | null
  dwellProgress: number
}

export function tourFrame(elapsedSeconds: number): TourFrame {
  const t = ((elapsedSeconds % tourSeconds) + tourSeconds) % tourSeconds
  let segment = timeline[timeline.length - 1]

  for (const candidate of timeline) {
    if (t < candidate.start + candidate.duration) {
      segment = candidate
      break
    }
  }

  const within = (t - segment.start) / segment.duration
  const legStart = segment.leg === 0 ? 0 : legEnd[segment.leg - 1]

  if (!segment.dwell) {
    return {
      // eased so the vehicle brakes into every mark and pulls away again
      at: legStart + (legEnd[segment.leg] - legStart) * smoothstep(within),
      level: tourLegs[segment.leg].fill,
      dwellMark: null,
      dwellProgress: 0,
    }
  }

  const from = tourLegs[segment.leg].fill
  const to = tourLegs[(segment.leg + 1) % tourLegs.length].fill

  return {
    at: legEnd[segment.leg],
    // the level rests briefly before and after moving, while the water shows
    level: from + (to - from) * smoothstep((within - 0.15) / 0.7),
    dwellMark: markAfterLeg(segment.leg),
    dwellProgress: within,
  }
}

// Where the water shows while the vehicle dwells: at the tree for a stop,
// under the nozzle for the refill station, nowhere for the depot.
export const dwellAnchors: ReadonlyMap<TourMark, GroundPoint> = (() => {
  const anchors = new Map<TourMark, GroundPoint>()
  const stopsOnly = stopPlacements.filter((stop) => stop.kind === 'stop')

  for (const mark of tourMarks) {
    if (mark.kind === 'depot') continue
    const placement = stopPlacements.find((stop) => stop.label === mark.label)
    if (!placement) continue

    if (mark.kind === 'refill') {
      anchors.set(mark, [
        placement.at[0] + placement.towardsRoad[0] * refillMarker.armLength,
        placement.at[1] + placement.towardsRoad[1] * refillMarker.armLength,
      ])
    } else {
      anchors.set(mark, stopTrees[stopsOnly.indexOf(placement)].at)
    }
  }

  return anchors
})()

const COS_30 = Math.cos(Math.PI / 6)

// The one isometric direction both renderers use: +x goes right and down,
// +z goes left and down, height goes up. A ground circle becomes an
// axis-aligned ellipse, hence the two factors below.
export function projectIso(x: number, z: number, y = 0): [number, number] {
  return [(x - z) * COS_30, (x + z) * 0.5 - y]
}

export const isoEllipseX = COS_30 * Math.SQRT2
export const isoEllipseY = 0.5 * Math.SQRT2

function projectedBounds() {
  const points: [number, number][] = []

  for (const block of cityBlocks) {
    const top = block.height + (block.roof === 'gable' ? block.roofHeight : parapet.height)
    for (const x of [block.x - block.width / 2, block.x + block.width / 2]) {
      for (const z of [block.z - block.depth / 2, block.z + block.depth / 2]) {
        points.push(projectIso(x, z, 0), projectIso(x, z, top))
      }
    }
  }

  for (const x of [depotPosition[0] - depotWidth / 2, depotPosition[0] + depotWidth / 2]) {
    for (const z of [depotPosition[1] - depotDepth / 2, depotPosition[1] + depotDepth / 2]) {
      points.push(projectIso(x, z, 0), projectIso(x, z, depotHeight + depotRoofHeight))
    }
  }

  for (const stop of stopPlacements) {
    const top = stop.kind === 'refill' ? refillMarker.postHeight : stopMarker.postHeight
    points.push(projectIso(stop.at[0], stop.at[1], 0), projectIso(stop.at[0], stop.at[1], top))
  }

  for (const leg of tourLegs) {
    for (const [x, z] of leg.points) points.push(projectIso(x, z, 0))
  }

  for (const tree of trees) {
    const top = canopyCenterHeight(tree) + tree.canopyRadius
    points.push(projectIso(tree.at[0], tree.at[1], 0), projectIso(tree.at[0], tree.at[1], top))
  }

  for (const x of [groundPlate.minX, groundPlate.minX + groundPlate.width]) {
    for (const z of [groundPlate.minZ, groundPlate.minZ + groundPlate.depth]) {
      points.push(projectIso(x, z, 0), projectIso(x, z, -groundPlate.thickness))
    }
  }

  // a whisker of air around the plate
  const pad = 0.75
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + pad

  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

const bounds = projectedBounds()

export const tourViewBox = [bounds.minX, bounds.minY, bounds.width, bounds.height].join(' ')

export const tourProjectedSize = { width: bounds.width, height: bounds.height }

// Ground shift that moves the projected drawing onto the projection origin, so
// the 3D camera can simply look at [0, 0, 0].
export const tourWorldOffset: GroundPoint = (() => {
  const targetX = -(bounds.minX + bounds.width / 2)
  const targetY = -(bounds.minY + bounds.height / 2)
  const along = targetX / COS_30

  return [(along + 2 * targetY) / 2, (2 * targetY - along) / 2]
})()
