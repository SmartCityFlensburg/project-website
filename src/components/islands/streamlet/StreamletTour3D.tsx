import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  Shape,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  baysFor,
  blockTones,
  canopyCenterHeight,
  centerLine,
  cityBlocks,
  depotDepth,
  depotDoor,
  depotHeight,
  depotPosition,
  depotRoofHeight,
  depotWidth,
  doorSpec,
  dwellAnchors,
  groundPlate,
  kerb,
  lawnHeight,
  lawns,
  parapet,
  refillMarker,
  roadHeight,
  roadWidth,
  roofUnits,
  staticTourPosition,
  stopMarker,
  stopPlacements,
  stopTrees,
  tourColors,
  tourFrame,
  tourLegs,
  tourLength,
  tourProjectedSize,
  tourWorldOffset,
  trees,
  windowSpec,
  type CityBlock,
  type GroundPoint,
  type StopPlacement,
  type Tree,
} from '../../../data/streamletTour'

// A camera at [d, d, d] foreshortens by sqrt(2/3) against the 2:1 projection
// projectIso() uses, so the scene has to be scaled back up by that much to fill
// the frame the shared bounds describe.
const ISO_FORESHORTENING = Math.sqrt(2 / 3)

const [offsetX, offsetZ] = tourWorldOffset

function toWorld([x, z]: GroundPoint, y: number) {
  return new Vector3(x + offsetX, y, z + offsetZ)
}

function facing([x, z]: GroundPoint) {
  return Math.atan2(x, z)
}

// Open on purpose: the tour starts and ends on the same straight run in front
// of the depot, so the two ends of the road meet flush and the vehicle can
// stop dead there without the curve rounding the stop away.
const tourCurve = new CatmullRomCurve3(
  tourLegs
    .flatMap((leg, index) => (index === 0 ? leg.points : leg.points.slice(1)))
    .map((point) => toWorld(point, roadHeight)),
  false,
  'centripetal',
)

interface RibbonArrays {
  position: number[]
  normal: number[]
  index: number[]
}

function appendRibbon(
  arrays: RibbonArrays,
  curve: CatmullRomCurve3,
  width: number,
  lift: number,
  from: number,
  to: number,
  segments: number,
) {
  const half = width / 2
  const side = new Vector3()
  const base = arrays.position.length / 3

  for (let i = 0; i <= segments; i++) {
    const at = from + ((to - from) * i) / segments
    const point = curve.getPointAt(at)
    const tangent = curve.getTangentAt(at)
    side.set(-tangent.z, 0, tangent.x).normalize().multiplyScalar(half)

    arrays.position.push(point.x + side.x, point.y + lift, point.z + side.z)
    arrays.position.push(point.x - side.x, point.y + lift, point.z - side.z)
    arrays.normal.push(0, 1, 0, 0, 1, 0)
  }

  for (let i = 0; i < segments; i++) {
    const corner = base + i * 2
    arrays.index.push(corner, corner + 1, corner + 2, corner + 1, corner + 3, corner + 2)
  }
}

function ribbonGeometry(arrays: RibbonArrays) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(arrays.position, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(arrays.normal, 3))
  geometry.setIndex(arrays.index)
  return geometry
}

// A flat ribbon along the curve rather than a tube: the route is a road the
// vehicle drives on.
const road = (() => {
  const arrays: RibbonArrays = { position: [], normal: [], index: [] }
  appendRibbon(arrays, tourCurve, roadWidth, 0, 0, 1, 420)
  return ribbonGeometry(arrays)
})()

// The pavement is one wider ribbon a step below the carriageway; the road
// covers its middle, so only the two kerbs show.
const pavement = (() => {
  const arrays: RibbonArrays = { position: [], normal: [], index: [] }
  appendRibbon(arrays, tourCurve, roadWidth + kerb.width * 2, -kerb.drop, 0, 1, 420)
  return ribbonGeometry(arrays)
})()

const roadCenterLine = (() => {
  const arrays: RibbonArrays = { position: [], normal: [], index: [] }
  const length = tourCurve.getLength()
  const pattern = centerLine.dash + centerLine.gap
  const dashes = Math.floor(length / pattern)

  for (let i = 0; i < dashes; i++) {
    const from = (i * pattern) / length
    const to = Math.min(1, (i * pattern + centerLine.dash) / length)
    appendRibbon(arrays, tourCurve, centerLine.width, centerLine.lift, from, to, 6)
  }

  return ribbonGeometry(arrays)
})()

function roundedSlab(width: number, depth: number, radius: number, height: number) {
  const shape = new Shape()
  const minX = -width / 2
  const minZ = -depth / 2
  const maxX = width / 2
  const maxZ = depth / 2

  shape.moveTo(minX + radius, minZ)
  shape.lineTo(maxX - radius, minZ)
  shape.quadraticCurveTo(maxX, minZ, maxX, minZ + radius)
  shape.lineTo(maxX, maxZ - radius)
  shape.quadraticCurveTo(maxX, maxZ, maxX - radius, maxZ)
  shape.lineTo(minX + radius, maxZ)
  shape.quadraticCurveTo(minX, maxZ, minX, maxZ - radius)
  shape.lineTo(minX, minZ + radius)
  shape.quadraticCurveTo(minX, minZ, minX + radius, minZ)

  // extruded along z, then laid flat so the slab rises from y = 0 to height
  const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

const ground = (() => {
  const { minX, minZ, width, depth, radius, thickness } = groundPlate
  const geometry = roundedSlab(width, depth, radius, thickness)
  geometry.translate(minX + width / 2 + offsetX, -thickness, minZ + depth / 2 + offsetZ)
  return geometry
})()

function placed(at: readonly [number, number, number], scale: readonly [number, number, number]) {
  return new Matrix4().makeTranslation(...at).multiply(new Matrix4().makeScale(...scale))
}

/** A copy of one part, put where it belongs and carrying its colour per vertex. */
function painted(geometry: BufferGeometry, matrix: Matrix4, color: string): BufferGeometry {
  const moved = geometry.clone().applyMatrix4(matrix)
  // mergeGeometries refuses a mixed set, and the canopy lobes come off a
  // polyhedron, which three builds without an index.
  const part = moved.index ? moved.toNonIndexed() : moved
  const tint = new Color(color)
  const colors = new Float32Array(part.attributes.position.count * 3)

  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = tint.r
    colors[i + 1] = tint.g
    colors[i + 2] = tint.b
  }

  part.setAttribute('color', new BufferAttribute(colors, 3))
  return part
}

function merged(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts)

  if (!geometry) {
    throw new Error('the geometry could not be merged')
  }

  return geometry
}

const unitBox = new BoxGeometry(1, 1, 1)
const unitCylinder = new CylinderGeometry(1, 1, 1, 16)
const unitDisc = new CircleGeometry(1, 24).rotateX(-Math.PI / 2)
const unitLobe = new IcosahedronGeometry(1, 1)

const ROOF_SLAB = 0.22
const ROOF_OVERHANG = 0.35

/**
 * Two slabs leaning against each other over the ridge, with the gable ends
 * left open for the wall colour underneath to show. `alongX` runs the ridge
 * along x; otherwise it runs along z.
 */
function gableRoof(
  at: readonly [number, number, number],
  span: number,
  length: number,
  rise: number,
  alongX: boolean,
  color: string,
): BufferGeometry[] {
  const half = span / 2
  const pitch = Math.atan2(rise, half)
  const slope = Math.hypot(half, rise) + ROOF_OVERHANG
  const turn = alongX ? new Matrix4().makeRotationY(Math.PI / 2) : new Matrix4()

  return [1, -1].map((side) =>
    painted(
      unitBox,
      new Matrix4()
        .makeTranslation(...at)
        .multiply(turn)
        .multiply(new Matrix4().makeTranslation(0, rise, 0))
        .multiply(new Matrix4().makeRotationZ(side * pitch))
        // lifted a hair off the gable prism underneath so the two never z-fight
        .multiply(new Matrix4().makeTranslation((side * -slope) / 2, ROOF_SLAB / 2 + 0.03, 0))
        .multiply(new Matrix4().makeScale(slope, ROOF_SLAB, length + ROOF_OVERHANG * 2)),
      color,
    ),
  )
}

/** The triangular wall piece under a gable roof, standing on the eaves line. */
function gableEnds(
  at: readonly [number, number, number],
  span: number,
  length: number,
  rise: number,
  alongX: boolean,
  color: string,
): BufferGeometry {
  const shape = new Shape()
  shape.moveTo(-span / 2, 0)
  shape.lineTo(span / 2, 0)
  shape.lineTo(0, rise)
  shape.closePath()

  const prism = new ExtrudeGeometry(shape, { depth: length, bevelEnabled: false })
  prism.translate(0, 0, -length / 2)
  const turn = alongX ? new Matrix4().makeRotationY(Math.PI / 2) : new Matrix4()
  return painted(prism, new Matrix4().makeTranslation(...at).multiply(turn), color)
}

/**
 * Windows as boxes a little proud of the wall, one row per storey and as many
 * across as the face has room for. Only the two faces the camera sees get any.
 */
function facadeOpenings(block: CityBlock): BufferGeometry[] {
  const parts: BufferGeometry[] = []
  const storey = block.height / block.floors
  const { width, height, gap, relief } = windowSpec

  for (const face of ['+x', '+z'] as const) {
    const faceLength = face === '+x' ? block.depth : block.width
    const bays = baysFor(faceLength)
    const row = bays * width + (bays - 1) * gap
    const hasDoor = block.door === face
    const doorClearance = (doorSpec.width + width) / 2 + 0.2

    for (let floor = 0; floor < block.floors; floor++) {
      const y = floor * storey + windowSpec.sill + height / 2

      for (let bay = 0; bay < bays; bay++) {
        const along = -row / 2 + width / 2 + bay * (width + gap)
        if (hasDoor && floor === 0 && Math.abs(along) < doorClearance) continue

        parts.push(
          face === '+x'
            ? painted(
                unitBox,
                placed(
                  [block.x + block.width / 2 + relief / 2, y, block.z + along],
                  [relief, height, width],
                ),
                tourColors.window,
              )
            : painted(
                unitBox,
                placed(
                  [block.x + along, y, block.z + block.depth / 2 + relief / 2],
                  [width, height, relief],
                ),
                tourColors.window,
              ),
        )
      }
    }

    if (hasDoor) {
      const y = doorSpec.height / 2
      parts.push(
        face === '+x'
          ? painted(
              unitBox,
              placed(
                [block.x + block.width / 2 + relief / 2, y, block.z],
                [relief, doorSpec.height, doorSpec.width],
              ),
              tourColors.door,
            )
          : painted(
              unitBox,
              placed(
                [block.x, y, block.z + block.depth / 2 + relief / 2],
                [doorSpec.width, doorSpec.height, relief],
              ),
              tourColors.door,
            ),
      )
    }
  }

  return parts
}

function flatRoof(block: CityBlock): BufferGeometry[] {
  const top = block.height
  const inner = parapet.width
  return [
    painted(
      unitBox,
      placed([block.x, top + 0.04, block.z], [block.width - inner, 0.08, block.depth - inner]),
      tourColors.blockRoof,
    ),
    ...[1, -1].map((side) =>
      painted(
        unitBox,
        placed(
          [block.x + (side * (block.width - inner)) / 2, top + parapet.height / 2, block.z],
          [inner, parapet.height, block.depth],
        ),
        tourColors.blockShaded,
      ),
    ),
    ...[1, -1].map((side) =>
      painted(
        unitBox,
        placed(
          [block.x, top + parapet.height / 2, block.z + (side * (block.depth - inner)) / 2],
          [block.width, parapet.height, inner],
        ),
        tourColors.blockShaded,
      ),
    ),
  ]
}

function blockGeometry(block: CityBlock): BufferGeometry[] {
  const tone = blockTones[block.tone]
  const parts = [
    painted(
      unitBox,
      placed([block.x, block.height / 2, block.z], [block.width, block.height, block.depth]),
      tone,
    ),
    ...facadeOpenings(block),
  ]

  if (block.roof === 'flat') {
    parts.push(...flatRoof(block))
  } else {
    const alongX = block.width >= block.depth
    const span = alongX ? block.depth : block.width
    const length = alongX ? block.width : block.depth
    const eaves = [block.x, block.height, block.z] as const
    parts.push(
      gableEnds(eaves, span, length, block.roofHeight, alongX, tone),
      ...gableRoof(eaves, span, length, block.roofHeight, alongX, tourColors.blockGableRoof),
    )
  }

  return parts
}

function depotGeometry(): BufferGeometry[] {
  const [x, z] = depotPosition
  const eaves = [x, depotHeight, z] as const
  const relief = windowSpec.relief

  return [
    painted(
      unitBox,
      placed([x, depotHeight / 2, z], [depotWidth, depotHeight, depotDepth]),
      tourColors.depot,
    ),
    gableEnds(eaves, depotDepth, depotWidth, depotRoofHeight, true, tourColors.depot),
    ...gableRoof(eaves, depotDepth, depotWidth, depotRoofHeight, true, tourColors.depotRoof),
    // the gate faces the road, so the vehicle parks in front of it
    painted(
      unitBox,
      placed(
        [x + depotWidth / 2 + relief / 2, depotDoor.height / 2, z],
        [relief, depotDoor.height, depotDoor.width],
      ),
      tourColors.depotDoor,
    ),
    ...[0.25, 0.5, 0.75].map((share) =>
      painted(
        unitBox,
        placed(
          [x + depotWidth / 2 + relief, depotDoor.height * share, z],
          [relief, 0.08, depotDoor.width],
        ),
        tourColors.depot,
      ),
    ),
  ]
}

function roofUnitGeometry(): BufferGeometry[] {
  return roofUnits.map((unit) =>
    painted(
      unitBox,
      placed(
        [unit.at[0], unit.base + unit.height / 2, unit.at[1]],
        [unit.width, unit.height, unit.depth],
      ),
      tourColors.unitLit,
    ),
  )
}

function lawnGeometry(): BufferGeometry[] {
  return lawns.map((lawn) =>
    painted(
      roundedSlab(lawn.width, lawn.depth, 1.2, lawnHeight),
      new Matrix4().makeTranslation(lawn.x, 0, lawn.z),
      tourColors.lawn,
    ),
  )
}

// A kerbed pit of soil around every tree the tour waters: the pit is what the
// sensors sit in and the water goes into.
const treePit = { radius: 2.2, kerbWidth: 0.3, kerbHeight: 0.18, soilHeight: 0.1 } as const

function treePitGeometry(tree: Tree): BufferGeometry[] {
  const [x, z] = tree.at
  return [
    painted(
      unitCylinder,
      placed([x, treePit.kerbHeight / 2, z], [treePit.radius, treePit.kerbHeight, treePit.radius]),
      tourColors.treePitKerb,
    ),
    painted(
      unitCylinder,
      placed(
        [x, treePit.kerbHeight + treePit.soilHeight / 2, z],
        [
          treePit.radius - treePit.kerbWidth,
          treePit.soilHeight,
          treePit.radius - treePit.kerbWidth,
        ],
      ),
      tourColors.treePitSoil,
    ),
  ]
}

interface Lobe {
  at: readonly [number, number, number]
  radius: number
}

// A crown of four lobes around the body, mirrored on every other tree so a row
// of them does not read as copies.
const lobes: Lobe[] = [
  { at: [0, 0, 0], radius: 1 },
  { at: [0.55, -0.2, 0.35], radius: 0.7 },
  { at: [-0.5, -0.15, -0.4], radius: 0.65 },
  { at: [0.1, 0.55, -0.15], radius: 0.6 },
]

function treeGeometry(tree: Tree, index: number): BufferGeometry[] {
  const [x, z] = tree.at
  const crown = tree.canopyRadius
  const mirror = index % 2 === 0 ? 1 : -1
  const lit = tree.dark ? tourColors.treeCanopyDark : tourColors.treeCanopyLit
  const body = tree.dark ? tourColors.treeCanopyDeep : tourColors.treeCanopy

  return [
    painted(
      new CylinderGeometry(0.24, 0.34, 1, 8),
      placed([x, tree.trunkHeight / 2, z], [1, tree.trunkHeight, 1]),
      tourColors.treeTrunk,
    ),
    ...lobes.map((lobe, lobeIndex) =>
      painted(
        unitLobe,
        placed(
          [
            x + lobe.at[0] * crown * mirror,
            canopyCenterHeight(tree) + lobe.at[1] * crown,
            z + lobe.at[2] * crown,
          ],
          [lobe.radius * crown, lobe.radius * crown, lobe.radius * crown],
        ),
        lobeIndex === 0 ? body : lit,
      ),
    ),
  ]
}

function stopPinGeometry(stop: StopPlacement): BufferGeometry[] {
  const [x, z] = stop.at
  const m = stopMarker
  return [
    painted(
      unitCylinder,
      placed([x, m.plateHeight / 2, z], [m.plateRadius, m.plateHeight, m.plateRadius]),
      tourColors.stop,
    ),
    painted(
      unitCylinder,
      placed([x, m.postHeight / 2, z], [m.postRadius, m.postHeight, m.postRadius]),
      tourColors.stop,
    ),
    painted(
      unitCylinder,
      placed([x, m.postHeight + m.capHeight / 2, z], [m.capRadius, m.capHeight, m.capRadius]),
      tourColors.stop,
    ),
  ]
}

// A standpipe with a cabinet at its foot and a swing arm over the kerb, the
// arm high enough to clear the tank on the vehicle passing underneath.
function refillStationGeometry(stop: StopPlacement): BufferGeometry[] {
  const [x, z] = stop.at
  const m = refillMarker
  const turn = new Matrix4().makeRotationY(facing(stop.towardsRoad))
  const base = new Matrix4().makeTranslation(x, 0, z).multiply(turn)

  return [
    painted(
      unitCylinder,
      placed([x, m.plateHeight / 2, z], [m.plateRadius, m.plateHeight, m.plateRadius]),
      tourColors.refill,
    ),
    painted(
      unitBox,
      base.clone().multiply(placed([0.9, 0.9, -0.6], [1.1, 1.8, 1.1])),
      tourColors.refillCabinet,
    ),
    painted(
      unitCylinder,
      placed([x, m.postHeight / 2, z], [m.postRadius, m.postHeight, m.postRadius]),
      tourColors.refill,
    ),
    painted(
      unitCylinder,
      base
        .clone()
        .multiply(new Matrix4().makeTranslation(0, m.armHeight, m.armLength / 2))
        .multiply(new Matrix4().makeRotationX(Math.PI / 2))
        .multiply(new Matrix4().makeScale(m.armRadius, m.armLength, m.armRadius)),
      tourColors.refill,
    ),
    painted(
      unitCylinder,
      base
        .clone()
        .multiply(
          placed(
            [0, m.armHeight - m.nozzleLength / 2, m.armLength],
            [m.armRadius * 0.8, m.nozzleLength, m.armRadius * 0.8],
          ),
        ),
      tourColors.refill,
    ),
  ]
}

// Nothing in the town ever moves, so the whole of it, blocks, greenery and
// street furniture, goes into one merged geometry with its tones in the vertex
// colours: a single draw call however much detail it carries, which is what
// keeps the loop cheap enough to run all day.
const townGeometry = merged([
  ...cityBlocks.flatMap(blockGeometry),
  ...roofUnitGeometry(),
  ...depotGeometry(),
  ...lawnGeometry(),
  ...stopTrees.flatMap(treePitGeometry),
  ...trees.flatMap(treeGeometry),
  ...stopPlacements.flatMap((stop) =>
    stop.kind === 'refill' ? refillStationGeometry(stop) : stopPinGeometry(stop),
  ),
]).translate(offsetX, 0, offsetZ)

// Soft discs under the crowns; without them the trees stand on their trunks
// like pins rather than on the ground.
const treeShadows = merged(
  trees.map((tree) => {
    const radius = tree.canopyRadius * 0.95
    return unitDisc
      .clone()
      .applyMatrix4(
        placed(
          [tree.at[0] + offsetX + radius * 0.25, 0.015, tree.at[1] + offsetZ + radius * 0.2],
          [radius, 1, radius],
        ),
      )
  }),
)

function headingAt(at: number) {
  const tangent = tourCurve.getTangentAt(at)
  return Math.atan2(tangent.x, tangent.z)
}

interface TourProps {
  isStatic: boolean
  levelRef: RefObject<HTMLDivElement | null>
}

const WHEEL_RADIUS = 0.55

const wheelPositions: readonly (readonly [number, number])[] = [
  [1.55, 3.4],
  [-1.55, 3.4],
  [1.55, -1],
  [-1.55, -1],
  [1.55, -3],
  [-1.55, -3],
]

// The truck is modelled facing its own +z. The wheels are grouped so the
// animation can spin each about its axle.
function Vehicle({ wheels }: { wheels: RefObject<Group[]> }) {
  return (
    <>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[3.2, 0.7, 10.4]} />
        <meshLambertMaterial color={tourColors.vehicleTrim} />
      </mesh>

      <mesh position={[0, 1.35, -0.9]}>
        <boxGeometry args={[3.4, 0.4, 7.2]} />
        <meshLambertMaterial color={tourColors.vehicleBody} />
      </mesh>

      {wheelPositions.map(([x, z], index) => (
        <group
          key={`${x}-${z}`}
          position={[x, WHEEL_RADIUS, z]}
          ref={(node) => {
            if (node) wheels.current[index] = node
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.5, 16]} />
            <meshLambertMaterial color={tourColors.vehicleWheel} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.52, 12]} />
            <meshLambertMaterial color={tourColors.vehicleHub} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 2.75, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.55, 1.55, 6.4, 24]} />
        <meshLambertMaterial color={tourColors.vehicleTank} />
      </mesh>

      {[-3.5, -1.2, 1.1].map((z) => (
        <mesh key={z} position={[0, 2.75, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.62, 1.62, 0.28, 24]} />
          <meshLambertMaterial color={tourColors.vehicleBody} />
        </mesh>
      ))}

      <mesh position={[0, 2.75, -4.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.35, 1.55, 0.3, 24]} />
        <meshLambertMaterial color={tourColors.vehicleTankBand} />
      </mesh>

      <mesh position={[0, 4.4, -1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.35, 12]} />
        <meshLambertMaterial color={tourColors.vehicleBody} />
      </mesh>

      <mesh position={[1.35, 1.75, -1.2]}>
        <boxGeometry args={[0.35, 0.5, 5.6]} />
        <meshLambertMaterial color={tourColors.vehicleTrim} />
      </mesh>

      <mesh position={[0, 2.5, 3.6]}>
        <boxGeometry args={[3.2, 2.5, 2.8]} />
        <meshLambertMaterial color={tourColors.vehicleBody} />
      </mesh>

      <mesh position={[0, 3.85, 3.5]}>
        <boxGeometry args={[3.3, 0.25, 3]} />
        <meshLambertMaterial color={tourColors.vehicleTrim} />
      </mesh>

      <mesh position={[0, 2.95, 5.02]}>
        <boxGeometry args={[2.7, 1.2, 0.12]} />
        <meshLambertMaterial color={tourColors.vehicleGlass} />
      </mesh>

      {[1.62, -1.62].map((x) => (
        <mesh key={x} position={[x, 2.95, 3.9]}>
          <boxGeometry args={[0.12, 1.1, 1.6]} />
          <meshLambertMaterial color={tourColors.vehicleGlass} />
        </mesh>
      ))}

      {[1.85, -1.85].map((x) => (
        <mesh key={x} position={[x, 3.1, 4.7]}>
          <boxGeometry args={[0.18, 0.55, 0.3]} />
          <meshLambertMaterial color={tourColors.vehicleTrim} />
        </mesh>
      ))}

      <mesh position={[0, 1.15, 5.15]}>
        <boxGeometry args={[3.4, 0.45, 0.3]} />
        <meshLambertMaterial color={tourColors.vehicleTrim} />
      </mesh>

      {[1.15, -1.15].map((x) => (
        <mesh key={x} position={[x, 1.65, 5.08]}>
          <boxGeometry args={[0.6, 0.35, 0.12]} />
          <meshBasicMaterial color={tourColors.vehicleLamp} />
        </mesh>
      ))}

      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[2, 5.6, 1]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color={tourColors.shadow}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

const rippleWaves = 2

function TourAnimation({ isStatic, levelRef }: TourProps) {
  const vehicle = useRef<Group>(null)
  const wheels = useRef<Group[]>([])
  const ripple = useRef<Mesh>(null)
  const stream = useRef<Mesh>(null)
  const start = isStatic ? staticTourPosition : 0

  useFrame(({ clock }) => {
    if (isStatic) return

    const frame = tourFrame(clock.getElapsedTime())

    if (vehicle.current) {
      const point = tourCurve.getPointAt(frame.at)
      vehicle.current.position.copy(point)
      vehicle.current.rotation.y = headingAt(frame.at)
    }

    const spin = (frame.at * tourLength) / WHEEL_RADIUS
    for (const wheel of wheels.current) {
      wheel.rotation.x = spin
    }

    if (levelRef.current) {
      levelRef.current.style.transform = `scaleY(${frame.level})`
    }

    const anchor = frame.dwellMark ? dwellAnchors.get(frame.dwellMark) : undefined
    const fade = Math.min(1, frame.dwellProgress * 4, (1 - frame.dwellProgress) * 4)

    if (ripple.current) {
      const watering = frame.dwellMark?.kind === 'stop' && anchor !== undefined
      ripple.current.visible = watering

      if (watering && anchor) {
        const wave = (frame.dwellProgress * rippleWaves) % 1
        const spread = 0.7 + wave * 1.1
        ripple.current.position.set(
          anchor[0] + offsetX,
          treePit.kerbHeight + treePit.soilHeight + 0.04,
          anchor[1] + offsetZ,
        )
        ripple.current.scale.set(spread, spread, 1)
        ;(ripple.current.material as MeshBasicMaterial).opacity = 0.55 * (1 - wave) * fade
      }
    }

    if (stream.current) {
      const filling = frame.dwellMark?.kind === 'refill' && anchor !== undefined
      stream.current.visible = filling

      if (filling && anchor) {
        stream.current.position.set(
          anchor[0] + offsetX,
          refillMarker.armHeight - refillMarker.nozzleLength - 0.3,
          anchor[1] + offsetZ,
        )
        ;(stream.current.material as MeshBasicMaterial).opacity = 0.8 * fade
      }
    }
  })

  return (
    <>
      <group
        ref={vehicle}
        position={tourCurve.getPointAt(start)}
        rotation={[0, headingAt(start), 0]}
      >
        <Vehicle wheels={wheels} />
      </group>

      {!isStatic && (
        <>
          <mesh ref={ripple} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.85, 1.12, 32]} />
            <meshBasicMaterial
              color={tourColors.water}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={stream} visible={false}>
            <cylinderGeometry args={[0.16, 0.11, 0.6, 10]} />
            <meshBasicMaterial
              color={tourColors.water}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </>
  )
}

function TourModel({ isStatic, levelRef }: TourProps) {
  const size = useThree((state) => state.size)
  const fit =
    Math.min(size.width / tourProjectedSize.width, size.height / tourProjectedSize.height) /
    ISO_FORESHORTENING

  // Lambert divides the light by pi, so ambient and key together come to a
  // little over pi on the lit faces: the pale walls stay pale without clipping
  // to white. The key comes in over the +z side so the two visible faces of
  // every box read as two faces.
  return (
    <>
      <ambientLight intensity={2.2} />
      <directionalLight position={[-30, 60, 80]} intensity={1.35} />

      <group scale={fit}>
        <mesh geometry={ground}>
          <meshLambertMaterial color={tourColors.ground} />
        </mesh>

        <mesh geometry={treeShadows}>
          <meshBasicMaterial
            color={tourColors.shadow}
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>

        <mesh geometry={pavement}>
          <meshLambertMaterial color={tourColors.kerb} side={DoubleSide} />
        </mesh>

        <mesh geometry={road}>
          <meshLambertMaterial color={tourColors.road} side={DoubleSide} />
        </mesh>

        <mesh geometry={roadCenterLine}>
          <meshLambertMaterial color={tourColors.roadLine} side={DoubleSide} />
        </mesh>

        <mesh geometry={townGeometry}>
          <meshLambertMaterial vertexColors flatShading />
        </mesh>

        <TourAnimation isStatic={isStatic} levelRef={levelRef} />
      </group>
    </>
  )
}

// The ClientRouter swaps the document rather than unmounting react, so fiber's
// own teardown does not run reliably. Without this a visitor accumulates one
// webgl context per visit to this page until the browser reclaims them.
function ReleaseContextOnNavigate() {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const release = () => {
      gl.forceContextLoss()
      gl.dispose()
    }

    document.addEventListener('astro:before-swap', release)
    return () => document.removeEventListener('astro:before-swap', release)
  }, [gl])

  return null
}

function StreamletTour3D({ isStatic, levelRef }: TourProps) {
  return (
    <Canvas
      flat
      orthographic
      dpr={[1, 2]}
      frameloop={isStatic ? 'demand' : 'always'}
      camera={{ position: [1200, 1200, 1200], near: 1, far: 6000, zoom: 1 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      gl={{ antialias: true, alpha: true }}
      className="h-full w-full"
    >
      <ReleaseContextOnNavigate />
      <TourModel isStatic={isStatic} levelRef={levelRef} />
    </Canvas>
  )
}

export default StreamletTour3D
