import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  Vector4,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshLambertMaterial,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  BELFRY_HEIGHT,
  cameraAt,
  cloudX,
  clouds,
  farShore,
  fordeColors,
  glint,
  houseTones,
  HOUSE_PLINTH,
  museumShips,
  quay,
  quayHouses,
  quayTrees,
  roofTones,
  scene as fordeScene,
  sensor,
  shallowness,
  signalProgress,
  spires,
  swayAngle,
  TOWER_STOREY,
  treePit,
  water,
  waveHeight,
  waves,
  type HarbourHouse,
  type QuayTree,
  type Ship,
  type Spire,
  type Vec3,
} from '../../../data/showcaseForde'

// Painted once: the still colour is deep out in the Förde and greener over the
// shallows along either wall, and the geometry is placed in world z so the
// shader can take a vertex's position as it is.
const waterGeometry = (() => {
  const geometry = new PlaneGeometry(water.width, water.depth, water.segmentsX, water.segmentsZ)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, 0, water.centerZ)

  const position = geometry.attributes.position
  const still = new Float32Array(position.count * 3)
  const deep = new Color(fordeColors.waterDeep)
  const shallow = new Color(fordeColors.waterShallow)
  const tint = new Color()

  for (let i = 0; i < position.count; i++) {
    tint.copy(deep).lerp(shallow, shallowness(position.getZ(i)))
    still[i * 3] = tint.r
    still[i * 3 + 1] = tint.g
    still[i * 3 + 2] = tint.b
  }

  geometry.setAttribute('color', new BufferAttribute(still, 3))
  return geometry
})()

// The waves run on the gpu. Twenty thousand vertices through five sines a
// frame took the whole frame budget on the cpu and left the camera drift
// stuttering; in the vertex shader they cost nothing anyone can measure.
// The terms come from the same `waves` table the tests and the wash bands
// use, so there is one description of the Förde, not two.
const waterUniforms = {
  uTime: { value: 0 },
  uAmplitude: { value: water.amplitude },
  uWaves: {
    value: waves.map(
      (wave) =>
        new Vector4(
          wave.weight * water.amplitude,
          (Math.PI * 2) / wave.length,
          wave.speed,
          wave.direction,
        ),
    ),
  },
  uCrest: { value: new Color(fordeColors.waterCrest) },
  uGlint: { value: new Color(fordeColors.waterGlint) },
  uGlintToward: { value: new Vector2(glint.towardX, glint.towardZ) },
  uGlintRange: { value: new Vector2(glint.from, glint.to) },
}

const waterVertexHeader = /* glsl */ `
uniform float uTime;
uniform float uAmplitude;
uniform vec4 uWaves[${waves.length}];
uniform vec3 uCrest;
uniform vec3 uGlint;
uniform vec2 uGlintToward;
uniform vec2 uGlintRange;

float waveHeight;
vec2 waveTilt;

// Mirrors waveSurface: each term is (weight in metres, frequency, speed, direction).
void surfaceAt(vec2 at) {
  waveHeight = 0.0;
  waveTilt = vec2(0.0);

  for (int i = 0; i < ${waves.length}; i++) {
    vec4 wave = uWaves[i];
    vec2 along = vec2(cos(wave.w), sin(wave.w));
    float phase = dot(at, along) * wave.y + uTime * wave.z;
    waveHeight += wave.x * sin(phase);
    waveTilt += wave.x * cos(phase) * wave.y * along;
  }
}
`

// Only the tips catch the light. Tinting across the whole wave, troughs
// included, averages the surface to the midpoint and the water reads as a
// pale field instead of as water. The glint is the facets leaning toward
// the sun and the camera at once, see `glint` in the data.
const waterVertexColor = /* glsl */ `
#include <color_vertex>
surfaceAt(position.xz);
float crest = max(0.0, waveHeight / uAmplitude);
float lean = -dot(waveTilt, uGlintToward);
float glint = smoothstep(uGlintRange.x, uGlintRange.y, lean);
vColor.rgb = mix(vColor.rgb, uCrest, crest * crest * 0.45);
vColor.rgb = mix(vColor.rgb, uGlint, glint * 0.75);
`

const waterVertexDisplace = /* glsl */ `
#include <begin_vertex>
transformed.y += waveHeight;
`

const rideTheWaves: MeshLambertMaterial['onBeforeCompile'] = (shader) => {
  Object.assign(shader.uniforms, waterUniforms)
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', `${waterVertexHeader}\nvoid main() {`)
    .replace('#include <color_vertex>', waterVertexColor)
    .replace('#include <begin_vertex>', waterVertexDisplace)
}

function Water() {
  useFrame(({ clock }) => {
    waterUniforms.uTime.value = clock.getElapsedTime()
  })

  // Flat shading takes its normals from screen derivatives in the fragment
  // shader, so the displaced surface lights its facets without any normals
  // being recomputed.
  return (
    <mesh geometry={waterGeometry}>
      <meshLambertMaterial vertexColors flatShading onBeforeCompile={rideTheWaves} />
    </mesh>
  )
}

const WASH_SEGMENTS = 140
const WASH_LIFT = 0.06

// Kept outside react like the water's own geometry: the bands are written to
// every frame, which the compiler will not allow on a memoised value.
const washGeometries = new Map<string, PlaneGeometry>()

function washGeometry(width: number, reach: number): PlaneGeometry {
  const key = `${width}:${reach}`
  let plane = washGeometries.get(key)

  if (!plane) {
    plane = new PlaneGeometry(width, reach, WASH_SEGMENTS, 1)
    plane.rotateX(-Math.PI / 2)
    washGeometries.set(key, plane)
  }

  return plane
}

/**
 * A pale band riding the surface out from the far shore's wall, wide at a
 * crest and narrow in a trough. Two of them stacked, a bright narrow one
 * inside a faint wide one, stand in for a soft edge on a material that has no
 * per-vertex opacity. The near quay gets none: from the camera its own wall
 * hides the first fifteen metres of water behind it.
 */
function WashBand({ wall, reach, opacity }: { wall: number; reach: number; opacity: number }) {
  useFrame(({ clock }) => {
    const seconds = clock.getElapsedTime()
    const position = washGeometry(farShore.width, reach).attributes.position

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      // The plane's rows sit at ±reach/2; the row toward the wall is pinned
      // to it and the other breathes with the swell it is riding on.
      const outer = i >= position.count / 2 ? 1 : 0
      const crest = Math.max(0, waveHeight(x, wall, seconds) / water.amplitude)
      const z = outer * reach * (0.55 + 0.45 * crest)

      position.setY(i, waveHeight(x, wall + z, seconds) + WASH_LIFT)
      position.setZ(i, z)
    }

    position.needsUpdate = true
  })

  return (
    <mesh geometry={washGeometry(farShore.width, reach)} position={[0, 0, wall]} renderOrder={1}>
      <meshBasicMaterial
        color={fordeColors.waterWash}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}

function Wash({ wall }: { wall: number }) {
  return (
    <>
      <WashBand wall={wall} reach={water.wash} opacity={0.28} />
      <WashBand wall={wall} reach={water.wash * 0.45} opacity={0.6} />
    </>
  )
}

function placed(at: Vec3, scale: Vec3): Matrix4 {
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

// The roof is extruded along z, so its ridge runs away from the camera and the
// gable triangle is the face we see. Everything the houses gain in detail hangs
// off that: the stepped fronts, the gable openings and the eaves line all sit
// on the same plane.
const EAVES_OVERHANG = 0.45
const EAVES_DEPTH = 0.5
const FASCIA_HEIGHT = 0.3

function extruded(shape: Shape, depth: number): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

/** A ridge roof over a `span`, `length` long, with its ridge running along z. */
function pitchedRoof(span: number, height: number, length: number): BufferGeometry {
  const shape = new Shape()
  shape.moveTo(-span / 2, 0)
  shape.lineTo(span / 2, 0)
  shape.lineTo(0, height)
  shape.closePath()

  return extruded(shape, length)
}

const QUARTER_TURN = new Matrix4().makeRotationY(Math.PI / 2)

/** The roof in the house's frame: a gable house's ridge runs along z, an eaves house's along x. */
function houseRoof(house: HarbourHouse): BufferGeometry {
  if (house.kind === 'eaves') {
    return pitchedRoof(
      house.depth + 2 * EAVES_OVERHANG,
      house.roofHeight,
      house.width + EAVES_DEPTH,
    ).applyMatrix4(QUARTER_TURN)
  }

  const overhang = house.stepped ? 0 : EAVES_OVERHANG
  const height = house.stepped ? house.roofHeight * 0.88 : house.roofHeight
  return pitchedRoof(
    house.width + 2 * overhang,
    height,
    house.depth + (house.stepped ? 0 : EAVES_DEPTH),
  )
}

/**
 * The Flensburg merchant front: the facade climbs past the roof in steps to a
 * narrow crest. Built as a plate standing just proud of the gable wall, so the
 * ordinary roof can sit behind it and the silhouette is all steps.
 */
function steppedGable(house: HarbourHouse): BufferGeometry {
  const width = house.width + 0.3
  const steps = 3
  // Wide enough to read as the gable's crown. A narrow one reads as a mast or
  // a chimney standing on the roof instead.
  const crest = 1.8
  const run = (width / 2 - crest / 2) / steps
  const rise = house.roofHeight / steps

  const climb: [number, number][] = [[-width / 2, 0]]
  for (let step = 1; step <= steps; step++) {
    const x = -width / 2 + (step - 1) * run
    climb.push([x, step * rise], [x + run, step * rise])
  }

  const shape = new Shape()
  shape.moveTo(...climb[0])
  for (const [x, y] of climb.slice(1)) {
    shape.lineTo(x, y)
  }
  for (const [x, y] of [...climb].reverse().map(([x, y]): [number, number] => [-x, y])) {
    shape.lineTo(x, y)
  }
  shape.closePath()

  return extruded(shape, 0.5)
}

/** Which way a wall faces: the front toward the water, or a flank along ±x. */
type Facing = 'front' | -1 | 1

/**
 * An opening a little proud of a wall, with a light frame around it when it
 * has one. The frame stands a shade less proud than the glass, so the dark pane
 * is what catches the eye and the frame only edges it.
 */
function opening(
  house: HarbourHouse,
  facing: Facing,
  across: number,
  y: number,
  width: number,
  height: number,
  tone: string,
  framed = true,
): BufferGeometry[] {
  const parts: BufferGeometry[] = []
  const wall = facing === 'front' ? house.depth / 2 : house.width / 2
  const out = (proud: number) => wall + proud

  const box = (proud: number, thickness: number, w: number, h: number) =>
    facing === 'front'
      ? placed([across, y, out(proud)], [w, h, thickness])
      : placed([facing * out(proud), y, across], [thickness, h, w])

  if (framed) {
    parts.push(
      painted(unitBox, box(0.02, 0.08, width + 0.3, height + 0.3), fordeColors.windowFrame),
    )
  }
  parts.push(painted(unitBox, box(0.05, 0.12, width, height), tone))

  return parts
}

function warehouseOpenings(house: HarbourHouse): BufferGeometry[] {
  const parts: BufferGeometry[] = []
  const storey = (house.wallHeight - HOUSE_PLINTH) / house.floors
  const bayWidth = house.width / house.bays

  // Small hatches with shutters rather than windows, and a stack of loading
  // doors up the middle under the hoist beam: a store, not a home.
  for (let floor = 0; floor < house.floors; floor++) {
    const y = HOUSE_PLINTH + (floor + 0.5) * storey
    for (let bay = 0; bay < house.bays; bay++) {
      const x = -house.width / 2 + bayWidth * (bay + 0.5)
      parts.push(...opening(house, 'front', x, y, 0.9, 0.9, fordeColors.hatch, false))
    }
    for (const side of [-1, 1] as const) {
      for (let bay = 0; bay < 2; bay++) {
        const z = -house.depth / 2 + (house.depth / 2) * (bay + 0.5)
        parts.push(...opening(house, side, z, y, 0.9, 0.9, fordeColors.hatch, false))
      }
    }
    parts.push(...opening(house, 'front', 0, y, 1.3, 1.7, fordeColors.hatch, false))
  }

  const beamY = house.wallHeight + house.roofHeight * 0.55
  parts.push(
    ...opening(
      house,
      'front',
      0,
      house.wallHeight + house.roofHeight * 0.3,
      1.3,
      1.5,
      fordeColors.hatch,
      false,
    ),
    painted(
      unitBox,
      placed([0, beamY, house.depth / 2 + 0.9], [0.3, 0.3, 2.2]),
      fordeColors.houseEaves,
    ),
  )

  return parts
}

/**
 * Windows as openings a little proud of the wall rather than set into it: at a
 * quarter of a kilometre a reveal is invisible, but the dark rectangle is the
 * whole reason the row reads as houses and not as blocks.
 */
function houseOpenings(house: HarbourHouse): BufferGeometry[] {
  if (house.kind === 'warehouse') {
    return warehouseOpenings(house)
  }

  const parts: BufferGeometry[] = []
  const storey = (house.wallHeight - HOUSE_PLINTH) / house.floors
  const bayWidth = house.width / house.bays
  const doorBay = house.bays === 3 ? 1 : 0

  for (let floor = 0; floor < house.floors; floor++) {
    const ground = floor === 0
    const shop = ground && !house.door
    const y = HOUSE_PLINTH + (floor + 0.5) * storey
    const height = Math.min(shop ? 2.1 : ground ? 1.8 : 1.5, storey * (shop ? 0.72 : 0.55))
    const width = Math.min(shop ? 1.9 : 1.25, bayWidth * (shop ? 0.72 : 0.5))
    const tone = shop ? fordeColors.shopfront : fordeColors.windowGlass

    for (let bay = 0; bay < house.bays; bay++) {
      const x = -house.width / 2 + bayWidth * (bay + 0.5)
      if (ground && house.door && bay === doorBay) {
        parts.push(...opening(house, 'front', x, HOUSE_PLINTH + 1.15, 1.1, 2.3, fordeColors.door))
      } else {
        parts.push(...opening(house, 'front', x, y, width, height, tone))
      }
    }

    // The outermost houses are seen well off their fronts, so the flanks carry
    // a couple of bays too or they read as blank slabs at the ends of the row.
    for (const side of [-1, 1] as const) {
      for (let bay = 0; bay < 2; bay++) {
        const z = -house.depth / 2 + (house.depth / 2) * (bay + 0.5)
        parts.push(...opening(house, side, z, y, width, height, tone))
      }
    }
  }

  if (house.banded) {
    parts.push(
      painted(
        unitBox,
        placed([0, HOUSE_PLINTH + storey, 0], [house.width + 0.1, 0.18, house.depth + 0.1]),
        fordeColors.windowFrame,
      ),
    )
  }

  // A hoist door in the gable, where the merchant houses took goods in.
  if (house.kind === 'gable') {
    parts.push(
      ...opening(
        house,
        'front',
        0,
        house.wallHeight + house.roofHeight * 0.34,
        0.85,
        1,
        fordeColors.windowGlass,
      ),
    )
  }

  return parts
}

/** Gable dormers in the front slope of an eaves house, each with its own window. */
function dormers(house: HarbourHouse): BufferGeometry[] {
  const parts: BufferGeometry[] = []
  const slope = house.depth / 2 + EAVES_OVERHANG
  const face = house.depth * 0.28
  const sill = house.wallHeight + house.roofHeight * (1 - face / slope)
  const width = 1.5
  const depth = 1.4
  const spots = house.dormers === 2 ? [-house.width * 0.25, house.width * 0.25] : [0]

  for (const x of spots) {
    parts.push(
      painted(
        unitBox,
        placed([x, sill + 0.2, face - depth / 2], [width, 1.6, depth]),
        houseTones[house.wallTone],
      ),
      painted(
        pitchedRoof(width + 0.3, 0.7, depth + 0.2),
        new Matrix4().makeTranslation(x, sill + 1, face - depth / 2),
        roofTones[house.roofTone],
      ),
      painted(
        unitBox,
        placed([x, sill + 0.25, face + 0.02], [1, 1.1, 0.08]),
        fordeColors.windowFrame,
      ),
      painted(
        unitBox,
        placed([x, sill + 0.25, face + 0.05], [0.7, 0.8, 0.12]),
        fordeColors.windowGlass,
      ),
    )
  }

  return parts
}

function houseGeometry(house: HarbourHouse): BufferGeometry[] {
  const eaves = house.kind === 'eaves'
  const overhang = house.stepped ? 0 : EAVES_OVERHANG
  const ridge = house.wallHeight + house.roofHeight
  const fasciaSize: Vec3 = eaves
    ? [house.width + EAVES_DEPTH, FASCIA_HEIGHT, house.depth + 2 * EAVES_OVERHANG]
    : [house.width + 2 * overhang, FASCIA_HEIGHT, house.depth + EAVES_DEPTH]
  const ridgeSize: Vec3 = eaves
    ? [house.width + EAVES_DEPTH, 0.26, 0.4]
    : [0.4, 0.26, house.depth + EAVES_DEPTH]

  const parts = [
    painted(
      unitBox,
      placed([0, house.wallHeight / 2, 0], [house.width, house.wallHeight, house.depth]),
      houseTones[house.wallTone],
    ),
    // A stone base. Without it the plaster runs straight into the ground and
    // the house looks dropped onto the bank rather than built on it.
    painted(
      unitBox,
      placed([0, HOUSE_PLINTH / 2, 0], [house.width + 0.16, HOUSE_PLINTH, house.depth + 0.16]),
      fordeColors.housePlinth,
    ),
    painted(
      unitBox,
      placed([0, house.wallHeight - FASCIA_HEIGHT / 2, 0], fasciaSize),
      fordeColors.houseEaves,
    ),
    painted(
      houseRoof(house),
      new Matrix4().makeTranslation(0, house.wallHeight, 0),
      roofTones[house.roofTone],
    ),
    painted(unitBox, placed([0, ridge - 0.12, 0], ridgeSize), fordeColors.houseRidge),
    ...houseOpenings(house),
    ...dormers(house),
  ]

  if (house.stepped) {
    parts.push(
      painted(
        steppedGable(house),
        new Matrix4().makeTranslation(0, house.wallHeight, house.depth / 2 - 0.24),
        houseTones[house.wallTone],
      ),
    )
  }

  for (const chimney of house.chimneys) {
    const base = ridge - 0.4
    const stack: Vec3 = eaves ? [chimney.at, base, 0] : [0, base, chimney.at]
    parts.push(
      painted(
        unitBox,
        placed([stack[0], base + chimney.height / 2, stack[2]], [0.8, chimney.height, 0.8]),
        fordeColors.chimney,
      ),
      painted(
        unitBox,
        placed([stack[0], base + chimney.height, stack[2]], [1.05, 0.2, 1.05]),
        fordeColors.houseEaves,
      ),
    )
  }

  // Set down on the bank rather than at the waterline. Seen from out on the
  // Förde the bank's front edge sits higher on screen than y = 0 does, so a
  // house left at zero reads as standing in the water in front of its shore.
  return parts.map((part) =>
    part.applyMatrix4(new Matrix4().makeTranslation(house.x, farShore.top, house.z)),
  )
}

// Four sides, turned a half facet when placed, so the pyramid's ridges sit over
// the tower's corners rather than across its faces.
const unitNeedle = new CylinderGeometry(0, 1, 1, 4)
const unitOctagonCone = new CylinderGeometry(0, 1, 1, 8)
const unitOctagonCap = new CylinderGeometry(0.44, 1, 1, 8)
const unitOctagonDrum = new CylinderGeometry(1, 1, 1, 8)
const unitDisc = new CylinderGeometry(1, 1, 1, 16)
const unitBall = new IcosahedronGeometry(1, 1)
const HALF_FACET = new Matrix4().makeRotationY(Math.PI / 4)

/** A cone or drum stood on end at a point, `radius` wide and `height` tall. */
function stood(at: Vec3, radius: number, height: number, turned = false): Matrix4 {
  const matrix = new Matrix4().makeTranslation(...at)
  if (turned) {
    matrix.multiply(HALF_FACET)
  }
  return matrix.multiply(new Matrix4().makeScale(radius, height, radius))
}

/** A disc laid flat against a wall facing +z. */
function facing(at: Vec3, radius: number, thickness: number): Matrix4 {
  return new Matrix4()
    .makeTranslation(...at)
    .multiply(new Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new Matrix4().makeScale(radius, thickness, radius))
}

type TowerFace = (across: number, y: number, width: number, height: number) => Matrix4

/** The front and the two flanks of a tower; the back is never seen. */
function towerFaces(spire: Spire): TowerFace[] {
  const half = spire.width / 2
  return [
    (across, y, width, height) => placed([across, y, half], [width, height, 0.12]),
    (across, y, width, height) => placed([half, y, across], [0.12, height, width]),
    (across, y, width, height) => placed([-half, y, across], [0.12, height, width]),
  ]
}

/**
 * Slit windows up the shaft and the tall louvred openings of the belfry: the
 * two things that make a box with a cone on it read as a church tower.
 */
function towerOpenings(spire: Spire): BufferGeometry[] {
  const parts: BufferGeometry[] = []
  const belfryBase = spire.towerHeight - BELFRY_HEIGHT
  const clockRadius = spire.width * 0.19
  const clockY = belfryBase - clockRadius - 1.3
  // The clock takes the storey under the belfry, so the slits stop below it.
  const slitsEnd = spire.clock ? clockY - clockRadius - 0.6 : belfryBase - 0.6
  const slitHeight = 2.2

  for (const face of towerFaces(spire)) {
    for (
      let y = HOUSE_PLINTH + TOWER_STOREY * 0.9;
      y + slitHeight / 2 < slitsEnd;
      y += TOWER_STOREY
    ) {
      parts.push(painted(unitBox, face(0, y, 0.7, slitHeight), fordeColors.windowGlass))
    }

    for (const side of [-1, 1]) {
      parts.push(
        painted(
          unitBox,
          face(
            side * spire.width * 0.2,
            belfryBase + BELFRY_HEIGHT / 2,
            spire.width * 0.17,
            BELFRY_HEIGHT * 0.66,
          ),
          fordeColors.belfry,
        ),
      )
    }
  }

  if (spire.clock) {
    const front = spire.width / 2
    parts.push(
      painted(
        unitDisc,
        facing([0, clockY, front + 0.05], clockRadius + 0.2, 0.1),
        fordeColors.houseEaves,
      ),
      painted(unitDisc, facing([0, clockY, front + 0.1], clockRadius, 0.14), fordeColors.clockFace),
    )
  }

  return parts
}

/**
 * The cap of the tower: a gothic needle, or a baroque lantern with an open
 * drum between two roofs. Either ends in a ball and a spike, which is what a
 * spire's tip is in every skyline drawing and what stops it looking cut off.
 */
function towerCap(spire: Spire): BufferGeometry[] {
  const base = spire.towerHeight
  const top = base + spire.spireHeight
  const wallTone = spire.brick ? fordeColors.towerBrick : fordeColors.house
  const parts: BufferGeometry[] = []

  if (spire.lantern) {
    const capHeight = spire.spireHeight * 0.36
    const drumHeight = spire.spireHeight * 0.26
    const drumRadius = spire.width * 0.3
    const drumY = base + capHeight + drumHeight / 2
    parts.push(
      painted(
        unitOctagonCap,
        stood([0, base + capHeight / 2, 0], spire.width * 0.78, capHeight),
        fordeColors.spire,
      ),
      painted(unitOctagonDrum, stood([0, drumY, 0], drumRadius, drumHeight), wallTone),
      painted(
        unitOctagonCone,
        stood(
          [0, top - (spire.spireHeight * 0.38) / 2, 0],
          spire.width * 0.36,
          spire.spireHeight * 0.38,
        ),
        fordeColors.spire,
      ),
    )
    // The lantern is open on every side, so the bells can be heard.
    const opening = [drumRadius * 0.8, drumHeight * 0.55] as const
    for (const side of [-1, 1]) {
      parts.push(
        painted(
          unitBox,
          placed([side * drumRadius, drumY, 0], [0.12, opening[1], opening[0]]),
          fordeColors.belfry,
        ),
        painted(
          unitBox,
          placed([0, drumY, side * drumRadius], [opening[0], opening[1], 0.12]),
          fordeColors.belfry,
        ),
      )
    }
  } else {
    // A needle inside a ring of pinnacles rises from within the parapet; one
    // without them reaches out to the eaves like an ordinary roof.
    const radius = spire.width * (spire.pinnacles ? 0.52 : 0.78)
    parts.push(
      painted(
        unitNeedle,
        stood([0, base + spire.spireHeight / 2, 0], radius, spire.spireHeight, true),
        fordeColors.spire,
      ),
    )
  }

  if (spire.pinnacles) {
    const inset = spire.width / 2 - 0.4
    for (const across of [-inset, inset]) {
      for (const along of [-inset, inset]) {
        parts.push(
          painted(unitBox, placed([across, base + 0.75, along], [0.7, 1.5, 0.7]), wallTone),
          painted(
            unitNeedle,
            stood([across, base + 1.5 + 0.85, along], 0.5, 1.7, true),
            fordeColors.spire,
          ),
        )
      }
    }
  }

  parts.push(
    painted(unitBall, stood([0, top + 0.2, 0], 0.32, 0.32), fordeColors.finial),
    painted(unitBox, placed([0, top + 1.1, 0], [0.1, 1.2, 0.1]), fordeColors.finial),
  )

  return parts
}

function spireGeometry(spire: Spire): BufferGeometry[] {
  const wallTone = spire.brick ? fordeColors.towerBrick : fordeColors.house
  // Plaster towers carry a dark cornice like the houses' eaves; on brick the
  // string courses are the light stone bands, or they vanish into the wall.
  const bandTone = spire.brick ? fordeColors.housePlinth : fordeColors.houseEaves
  const belfryBase = spire.towerHeight - BELFRY_HEIGHT

  const parts = [
    painted(
      unitBox,
      placed([0, spire.towerHeight / 2, 0], [spire.width, spire.towerHeight, spire.width]),
      wallTone,
    ),
    painted(
      unitBox,
      placed([0, HOUSE_PLINTH / 2, 0], [spire.width + 0.3, HOUSE_PLINTH, spire.width + 0.3]),
      fordeColors.housePlinth,
    ),
    painted(
      unitBox,
      placed([0, belfryBase, 0], [spire.width + 0.3, 0.28, spire.width + 0.3]),
      bandTone,
    ),
    painted(
      unitBox,
      placed([0, spire.towerHeight - 0.2, 0], [spire.width + 0.6, 0.4, spire.width + 0.6]),
      bandTone,
    ),
    ...towerOpenings(spire),
    ...towerCap(spire),
  ]

  return parts.map((part) =>
    part.applyMatrix4(new Matrix4().makeTranslation(spire.x, farShore.top, spire.z)),
  )
}

// Some eighty houses and four towers of a dozen parts each, none of which ever
// moves: one merged geometry with the tones baked into its vertex colours keeps
// the whole harbour front at a single draw call.
const townGeometry = merged([
  ...quayHouses.flatMap(houseGeometry),
  ...spires.flatMap(spireGeometry),
])

function HarbourFront() {
  return (
    <mesh geometry={townGeometry}>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  )
}

// A ship is close to fifty parts once it has a rig worth looking at, so each
// one is merged into a single geometry with its tones in the vertex colours,
// the same way the avenue is built. Everything below works in the ship's own
// frame: x runs aft from the stem, y up from the waterline, z across the beam.
const unitMast = new CylinderGeometry(0.5, 1, 1, 6)
const unitLine = new CylinderGeometry(1, 1, 1, 5)
const unitFunnel = new CylinderGeometry(1, 1, 1, 12)
const ALONG_SPAR = new Vector3(0, 1, 0)
const UNMOVED = new Matrix4()

type Point = readonly [number, number]

/**
 * A mast, spar or stay laid between two points. The unit cylinder stands along
 * y, so turning that axis onto the run between the ends puts the piece at
 * whatever angle it leans, in or out of the fore-and-aft plane.
 */
function rigging(
  unit: CylinderGeometry,
  from: Vec3,
  to: Vec3,
  radius: number,
  color: string,
): BufferGeometry {
  const run = new Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2])
  const length = run.length()

  return painted(
    unit,
    new Matrix4().compose(
      new Vector3((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2),
      new Quaternion().setFromUnitVectors(ALONG_SPAR, run.normalize()),
      new Vector3(radius, length, radius),
    ),
    color,
  )
}

const HULL_FLOOR = -1.6
const SHEER_SAMPLES = 10
/** How far the rail cap stands above the deck edge. */
const RAIL_CAP = 0.18
const BOOM_HEIGHT = 1.7
// Peaked up steeply, so the head of the sail ends just under the masthead. A
// flatter gaff leaves a bare pole standing over the rig, which is what the two
// plain triangles it replaces looked like.
const GAFF_ANGLE = 0.68
const GAFF_THROAT = 0.7

/** The deck edge along the hull: a sheer that dips amidships and lifts towards
  both ends, most of it at the bow. A straight deck line is the single thing
  that makes a hull look like a crate. */
function sheerAt(ship: Ship, x: number): number {
  const along = x / (ship.hullLength / 2)
  return ship.hullHeight * (0.88 + 0.24 * along * along - 0.08 * along)
}

/** How far the hull is drawn in from its full beam at a point along it. */
function pinch(ship: Ship, x: number): number {
  const along = x / (ship.hullLength / 2)
  return 1 - 0.9 * Math.max(0, -along) ** 2.4 - 0.45 * Math.max(0, along) ** 3
}

function sheerLine(ship: Ship): Point[] {
  return Array.from({ length: SHEER_SAMPLES + 1 }, (_, step) => {
    const x = -ship.hullLength / 2 + (ship.hullLength * step) / SHEER_SAMPLES
    return [x, sheerAt(ship, x)] as Point
  })
}

function outline(points: readonly Point[]): Shape {
  const shape = new Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (const [x, y] of points.slice(1)) {
    shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function hullShape(ship: Ship): Shape {
  const half = ship.hullLength / 2

  return outline([
    ...sheerLine(ship),
    [half - ship.hullLength * 0.05, HULL_FLOOR],
    [-half + ship.hullLength * 0.22, HULL_FLOOR],
    // The stem, raked forward on its way up to the bow: the last leg back to
    // the first point of the sheer closes it.
    [-half + ship.hullLength * 0.05, ship.hullHeight * 0.3],
  ])
}

/**
 * A band following the sheer, for the one light strake along the deck edge. It
 * stands a little proud of the sheer rather than flush with it: level with the
 * deck its top face and the hull's would be the same plane, and the two fight
 * over every pixel of the deck line as the camera drifts.
 */
function strakeShape(ship: Ship): Shape {
  const line = sheerLine(ship).map(([x, y]) => [x, y + RAIL_CAP] as Point)
  const depth = ship.hullHeight * 0.15 + RAIL_CAP

  return outline([...line, ...line.map(([x, y]) => [x, y - depth] as Point).reverse()])
}

/**
 * Extruding the profile gives a slab of one width, so afterwards every vertex
 * is drawn towards the centreline by how far it lies from amidships. That is
 * what turns the slab into a stem forward and a narrowing counter aft.
 */
function hullPlating(ship: Ship, shape: Shape, spread: number): BufferGeometry {
  const geometry = extruded(shape, ship.beam * spread)
  const position = geometry.attributes.position

  for (let i = 0; i < position.count; i++) {
    position.setZ(i, position.getZ(i) * pinch(ship, position.getX(i)))
  }

  geometry.computeVertexNormals()
  return geometry
}

/** Points along an edge pushed out to one side, so a sail carries a belly
  instead of reading as a triangle cut from paper. */
function bellied(from: Point, to: Point, belly: number): Point[] {
  const run = [to[0] - from[0], to[1] - from[1]]

  return [0.25, 0.5, 0.75].map((along) => {
    const swell = belly * Math.sin(Math.PI * along)

    return [
      from[0] + run[0] * along - run[1] * swell,
      from[1] + run[1] * along + run[0] * swell,
    ] as Point
  })
}

function sailGeometry(points: readonly Point[], offset: number, color: string): BufferGeometry {
  return painted(
    new ShapeGeometry(outline(points)),
    new Matrix4().makeTranslation(0, 0, offset),
    color,
  )
}

function mastHead(ship: Ship, mast: Ship['masts'][number]): Vec3 {
  return [mast.at, sheerAt(ship, mast.at) + mast.height, 0]
}

function shipGeometry(ship: Ship): BufferGeometry {
  const half = ship.hullLength / 2
  const stem: Vec3 = [-half + 0.4, sheerAt(ship, -half + 0.4), 0]
  const stern: Vec3 = [half - 0.4, sheerAt(ship, half - 0.4), 0]
  const sprit: Vec3 = [-half - ship.bowsprit, sheerAt(ship, -half) + 1.2, 0]

  const parts = [
    painted(hullPlating(ship, hullShape(ship), 1), UNMOVED, fordeColors.hull),
    painted(hullPlating(ship, strakeShape(ship), 1.03), UNMOVED, fordeColors.hullStrake),
  ]

  if (ship.deckhouse) {
    const { at, length, height } = ship.deckhouse
    const width = ship.beam * 0.52 * pinch(ship, at)
    const deck = sheerAt(ship, at) - ship.hullHeight * 0.14

    parts.push(
      painted(
        unitBox,
        placed([at, deck + height / 2, 0], [length, height, width]),
        fordeColors.deckhouse,
      ),
      painted(
        unitBox,
        placed([at, deck + height, 0], [length * 1.08, 0.3, width * 1.14]),
        fordeColors.deckhouseRoof,
      ),
    )
  }

  if (ship.bowsprit > 0) {
    parts.push(
      rigging(unitMast, [-half + 2, sheerAt(ship, -half + 2), 0], sprit, 0.24, fordeColors.mast),
      // The bobstay. Without it the bowsprit reads as a stick glued to the bow.
      rigging(unitLine, sprit, [-half + 0.8, 0.7, 0], 0.07, fordeColors.mast),
    )
  }

  ship.masts.forEach((mast, index) => {
    const deck = sheerAt(ship, mast.at)
    const head = mastHead(ship, mast)
    const spread = ship.beam * 0.46 * pinch(ship, mast.at)

    parts.push(
      rigging(unitMast, [mast.at, deck - ship.hullHeight * 0.5, 0], head, 0.32, fordeColors.mast),
      // Crosstrees. A bare pole ends in nothing, and this is what gives the
      // masthead a shape of its own against the sky.
      painted(
        unitBox,
        placed([mast.at, deck + mast.height * 0.78, 0], [0.4, 0.3, spread * 1.6]),
        fordeColors.mast,
      ),
    )

    // Shrouds, the one part of the rig that stands out of the fore-and-aft
    // plane: they are what keeps the masts from reading as flat cutouts once
    // the camera has drifted off the fleet's beam.
    for (const side of [-1, 1]) {
      for (const along of [-1.2, 1.5]) {
        const chainplate: Vec3 = [
          mast.at + along,
          sheerAt(ship, mast.at + along) - ship.hullHeight * 0.12,
          side * spread,
        ]
        parts.push(rigging(unitLine, head, chainplate, 0.06, fordeColors.mast))
      }
    }

    if (index === 0) {
      parts.push(rigging(unitLine, head, stem, 0.08, fordeColors.mast))

      if (ship.bowsprit > 0) {
        parts.push(rigging(unitLine, head, sprit, 0.07, fordeColors.mast))
      }
    } else {
      // Forward to the mast ahead rather than all the way to the stem, which
      // would draw a line straight through the rig in front of it.
      parts.push(
        rigging(unitLine, head, mastHead(ship, ship.masts[index - 1]), 0.07, fordeColors.mast),
      )
    }

    if (index === ship.masts.length - 1) {
      parts.push(rigging(unitLine, head, stern, 0.07, fordeColors.mast))
    }

    if (mast.boom <= 0) {
      return
    }

    const tack: Point = [mast.at, deck + BOOM_HEIGHT]
    const clew: Point = [mast.at + mast.boom, deck + BOOM_HEIGHT + 0.6]

    parts.push(rigging(unitLine, [...tack, 0], [...clew, 0], 0.16, fordeColors.mast))

    if (mast.gaff) {
      const throat: Point = [mast.at, deck + mast.height * GAFF_THROAT]
      const peak: Point = [
        mast.at + mast.gaff * Math.cos(GAFF_ANGLE),
        throat[1] + mast.gaff * Math.sin(GAFF_ANGLE),
      ]

      parts.push(
        rigging(unitLine, [...throat, 0], [...peak, 0], 0.14, fordeColors.mast),
        // The peak halyard, which is what holds the gaff up at that angle.
        rigging(unitLine, head, [...peak, 0], 0.05, fordeColors.mast),
        sailGeometry(
          [throat, peak, ...bellied(peak, clew, 0.07), clew, tack],
          -0.05,
          fordeColors.sail,
        ),
      )
    }

    // The staysail on the forestay, and ahead of it the jib out on the
    // bowsprit. Each takes the shade the sail beside it does not, or two
    // canvases that overlap merge into one silhouette.
    const stayHead: Point = [mast.at, deck + mast.height]
    const stayClew: Point = [mast.at - 0.5, deck + 1]

    parts.push(
      sailGeometry(
        [stayHead, [stem[0], stem[1]], ...bellied([stem[0], stem[1]], stayClew, -0.05), stayClew],
        0,
        fordeColors.sailShaded,
      ),
    )

    if (ship.bowsprit > 0) {
      const jibHead: Point = [mast.at, deck + mast.height * 0.92]
      const jibTack: Point = [sprit[0], sprit[1]]
      const jibClew: Point = [
        jibHead[0] + (stem[0] - jibHead[0]) * 0.7,
        jibHead[1] + (stem[1] - jibHead[1]) * 0.7,
      ]

      parts.push(
        sailGeometry(
          [jibHead, jibTack, ...bellied(jibTack, jibClew, -0.05), jibClew],
          0.1,
          fordeColors.sail,
        ),
      )
    }
  })

  const tallest = ship.masts.reduce((best, mast) => (mast.height > best.height ? mast : best))
  const truck = mastHead(ship, tallest)

  parts.push(
    sailGeometry(
      [
        [truck[0], truck[1]],
        [truck[0] + 2.2, truck[1] - 0.5],
        [truck[0] + 0.15, truck[1] - 1.1],
      ],
      0,
      fordeColors.funnel,
    ),
  )

  if (ship.funnel) {
    const deck = sheerAt(ship, 0)

    parts.push(
      painted(
        unitFunnel,
        placed(
          [0, deck + ship.funnel.height / 2, 0],
          [ship.funnel.radius, ship.funnel.height, ship.funnel.radius],
        ),
        fordeColors.funnel,
      ),
      painted(
        unitFunnel,
        // Kept clear of the funnel's own top, which it would otherwise cap with
        // a second disc in the same plane.
        placed(
          [0, deck + ship.funnel.height - 0.9, 0],
          [ship.funnel.radius * 1.1, 1.2, ship.funnel.radius * 1.1],
        ),
        fordeColors.hull,
      ),
    )
  }

  return merged(parts)
}

const shipGeometries = museumShips.map(shipGeometry)

// A street tree is a trunk, a few limbs and a dozen or so lobes of foliage, and
// there are twenty-one of them on screen for the whole opening. Merging each
// tree into one geometry with its tone baked into the vertex colours keeps the
// avenue at one draw call per tree, which is what lets it carry this much detail.
const unitTrunk = new CylinderGeometry(0.62, 1, 1, 9)
const unitFlare = new CylinderGeometry(1, 1.6, 1, 9)
const unitLimb = new CylinderGeometry(0.5, 1, 1, 6)
// Twenty facets for the clumps on the outside, not eighty. At this size the
// finer ball reads as a sphere, the coarse one, squashed and turned, as a clump
// of leaves. The body behind them is bigger and gets the finer mesh, or its
// facets are the size of houses.
const unitLobe = new IcosahedronGeometry(1, 0)
const unitCrownBody = new IcosahedronGeometry(1, 1)
const unitPit = new CylinderGeometry(1, 1, 1, 16)

const canopyPalettes = [
  [fordeColors.treeCanopyLit, fordeColors.treeCanopy, fordeColors.treeCanopyDark],
  [fordeColors.treeCanopyWarm, fordeColors.treeCanopyLit, fordeColors.treeCanopy],
  [fordeColors.treeCanopy, fordeColors.treeCanopyDark, fordeColors.treeCanopyDeep],
]

function treeGeometry(tree: QuayTree): BufferGeometry {
  const crown = tree.canopyRadius
  const parts = [
    painted(
      unitTrunk,
      placed([0, tree.height / 2, 0], [tree.trunkRadius, tree.height, tree.trunkRadius]),
      fordeColors.treeTrunk,
    ),
    // The root flare. A trunk that meets the ground as a plain tube reads as a
    // post someone drove in, which is the opposite of what the scene is about.
    painted(
      unitFlare,
      placed([0, tree.height * 0.07, 0], [tree.trunkRadius, tree.height * 0.14, tree.trunkRadius]),
      fordeColors.treeTrunk,
    ),
  ]

  for (const limb of tree.limbs) {
    parts.push(
      painted(
        unitLimb,
        new Matrix4()
          .makeTranslation(0, tree.height * limb.at, 0)
          .multiply(new Matrix4().makeRotationY(limb.turn))
          .multiply(new Matrix4().makeRotationZ(-limb.lean))
          .multiply(new Matrix4().makeTranslation(0, limb.length / 2, 0))
          .multiply(new Matrix4().makeScale(limb.radius, limb.length, limb.radius)),
        fordeColors.treeLimb,
      ),
    )
  }

  const tones = canopyPalettes[tree.shade]

  for (const lobe of tree.canopy) {
    parts.push(
      painted(
        lobe.smooth ? unitCrownBody : unitLobe,
        new Matrix4()
          .makeTranslation(lobe.at[0] * crown, tree.height + lobe.at[1] * crown, lobe.at[2] * crown)
          .multiply(new Matrix4().makeRotationY(lobe.spin))
          .multiply(new Matrix4().makeRotationZ(lobe.roll))
          .multiply(
            new Matrix4().makeScale(
              lobe.scale[0] * crown,
              lobe.scale[1] * crown,
              lobe.scale[2] * crown,
            ),
          ),
        tones[lobe.tone],
      ),
    )
  }

  return merged(parts)
}

const treeGeometries = quayTrees.map(treeGeometry)

// The pits stand still while the crowns move, so they are their own geometry:
// one mesh for the whole avenue, set into the promenade far enough that its top
// face and the pit's floor never fight over the same plane.
const pitGeometry = merged(
  quayTrees.flatMap((tree) => {
    const floor = quay.top - treePit.sink
    const soilRadius = treePit.radius - treePit.kerbWidth

    return [
      painted(
        unitPit,
        placed(
          [tree.x, floor + treePit.kerbHeight / 2, tree.z],
          [treePit.radius, treePit.kerbHeight, treePit.radius],
        ),
        fordeColors.treePitKerb,
      ),
      painted(
        unitPit,
        placed(
          [tree.x, floor + treePit.soilHeight / 2, tree.z],
          [soilRadius, treePit.soilHeight, soilRadius],
        ),
        fordeColors.treePitSoil,
      ),
    ]
  }),
)

function Avenue() {
  const trees = useRef<(Group | null)[]>([])

  useFrame(({ clock }) => {
    const seconds = clock.getElapsedTime()

    trees.current.forEach((tree, index) => {
      if (tree) {
        tree.rotation.z = quayTrees[index].tilt + swayAngle(quayTrees[index].phase, seconds)
      }
    })
  })

  return (
    <>
      <mesh geometry={pitGeometry}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>

      {quayTrees.map((tree, index) => (
        <group
          key={tree.x}
          ref={(node) => {
            trees.current[index] = node
          }}
          position={[tree.x, quay.top, tree.z]}
        >
          <mesh geometry={treeGeometries[index]}>
            <meshLambertMaterial vertexColors flatShading />
          </mesh>
        </group>
      ))}
    </>
  )
}

const antennaTip = sensor.postHeight + sensor.housing[1] + sensor.antennaHeight

const sensorGeometry = merged([
  painted(
    unitPit,
    placed(
      [0, sensor.postHeight / 2, 0],
      [sensor.postRadius, sensor.postHeight, sensor.postRadius],
    ),
    fordeColors.sensorPost,
  ),
  painted(
    unitBox,
    placed([0, sensor.postHeight + sensor.housing[1] / 2, 0], sensor.housing),
    fordeColors.sensorHousing,
  ),
  // A dark band round the housing, or it reads as a white box on a stick.
  painted(
    unitBox,
    placed(
      [0, sensor.postHeight + sensor.housing[1] * 0.3, 0],
      [sensor.housing[0] * 1.04, sensor.housing[1] * 0.16, sensor.housing[2] * 1.04],
    ),
    fordeColors.sensorPost,
  ),
  painted(
    unitPit,
    placed(
      [0, antennaTip - sensor.antennaHeight / 2, 0],
      [sensor.antennaRadius, sensor.antennaHeight, sensor.antennaRadius],
    ),
    fordeColors.sensorPost,
  ),
])

// One open ring, facing the camera. Each pulse is this ring scaled out from the
// antenna tip and faded as it goes.
const unitSignal = new RingGeometry(
  0.84,
  1,
  28,
  1,
  Math.PI / 2 - sensor.signal.arc / 2,
  sensor.signal.arc,
)

function Sensor({ tree, phase }: { tree: QuayTree; phase: number }) {
  const rings = useRef<(Mesh | null)[]>([])
  const foot: Vec3 = [
    tree.x + sensor.offset[0],
    quay.top - treePit.sink + treePit.soilHeight,
    tree.z + sensor.offset[1],
  ]

  useFrame(({ clock }) => {
    const seconds = clock.getElapsedTime()

    rings.current.forEach((ring, index) => {
      if (ring) {
        const progress = signalProgress(index, seconds, phase)
        const radius = sensor.signal.from + (sensor.signal.to - sensor.signal.from) * progress
        ring.scale.set(radius, radius, 1)
        ;(ring.material as MeshBasicMaterial).opacity = (1 - progress) ** 1.6 * 0.9
      }
    })
  })

  return (
    <group position={foot}>
      <mesh geometry={sensorGeometry}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      {Array.from({ length: sensor.signal.rings }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            rings.current[index] = node
          }}
          geometry={unitSignal}
          position={[0, antennaTip, 0]}
        >
          <meshBasicMaterial
            color={fordeColors.sensorSignal}
            transparent
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// Flattened spheres in a row, the same vocabulary as the canopies. They carry
// fog={false} because they sit above the haze, not in it.
const PUFFS = [
  { at: [-1.15, -0.05, 0], radius: 0.7 },
  { at: [-0.25, 0.2, 0.18], radius: 1 },
  { at: [0.75, 0.02, -0.12], radius: 0.78 },
  { at: [1.55, -0.14, 0.06], radius: 0.52 },
] as const

function Clouds() {
  const banks = useRef<(Group | null)[]>([])

  useFrame(({ clock }) => {
    const seconds = clock.getElapsedTime()

    banks.current.forEach((bank, index) => {
      if (bank) {
        bank.position.x = cloudX(clouds[index], seconds)
      }
    })
  })

  return (
    <>
      {clouds.map((cloud, index) => (
        <group
          key={cloud.x}
          ref={(node) => {
            banks.current[index] = node
          }}
          position={[cloud.x, cloud.y, cloud.z]}
        >
          <group scale={[cloud.scale, cloud.scale * 0.46, cloud.scale]}>
            {PUFFS.map((puff) => (
              <mesh key={puff.at[0]} position={puff.at}>
                <sphereGeometry args={[puff.radius, 12, 9]} />
                {/* The sun is behind them, so their camera-facing side is the
                    shaded one. Without a lift it reads as a storm front. The
                    emissive floor keeps that side bright and still leaves the
                    diffuse term enough range to give the puffs form. */}
                <meshLambertMaterial
                  color={fordeColors.cloud}
                  emissive={fordeColors.cloudShade}
                  fog={false}
                />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </>
  )
}

// The drift starts over each time the harbour comes back into view.
function Rig({ shown }: { shown: boolean }) {
  const camera = useThree((state) => state.camera)
  const elapsed = useRef(0)

  useEffect(() => {
    if (shown) {
      elapsed.current = 0
    }
  }, [shown])

  useFrame((_, delta) => {
    if (shown) {
      elapsed.current += delta
    }

    const frame = cameraAt(elapsed.current)
    camera.position.set(...frame.position)
    camera.lookAt(...frame.target)
  })

  return null
}

function FordeModel({ shown }: { shown: boolean }) {
  return (
    <>
      <fogExp2 attach="fog" args={[fordeColors.fog, fordeScene.fogDensity]} />

      {/* Kept well under 1 in total: lambert adds ambient and diffuse, so a
          bright fill washes every surface toward white before the fog does. */}
      <ambientLight intensity={0.55} />
      {/* Low and from starboard: morning light coming up the Förde. */}
      <directionalLight position={[160, 38, -40]} intensity={0.9} color={fordeColors.skyLow} />
      <directionalLight position={[-70, 30, 90]} intensity={0.25} color={fordeColors.skyHigh} />

      <Rig shown={shown} />
      <Clouds />
      <Water />

      {/* The far bank. Without it the harbour front stands in open water. */}
      <mesh position={[0, farShore.top - farShore.height / 2, farShore.centerZ]}>
        <boxGeometry args={[farShore.width, farShore.height, farShore.depth]} />
        <meshLambertMaterial color={fordeColors.shore} />
      </mesh>
      {/* The harbour wall along it, carried from the bank's top to below the
          waterline so the swell breaks against stone rather than against a
          lit face of the bank itself. */}
      <mesh position={[0, farShore.top - 1.2, farShore.centerZ + farShore.depth / 2 - 0.84]}>
        <boxGeometry args={[farShore.width, 2.4, 1.8]} />
        <meshLambertMaterial color={fordeColors.shoreEdge} />
      </mesh>
      <Wash wall={farShore.centerZ + farShore.depth / 2 + 0.06} />

      <HarbourFront />
      {museumShips.map((ship, index) => (
        <mesh
          key={ship.x}
          geometry={shipGeometries[index]}
          position={[ship.x, 0, ship.z]}
          rotation={[0, ship.heading, 0]}
        >
          <meshLambertMaterial vertexColors flatShading side={DoubleSide} />
        </mesh>
      ))}

      {/* The promenade runs from behind the avenue all the way past the camera,
          so the trees stand on ground rather than on a pier with water on both
          sides. Its top clears the wave crests, which otherwise wash over the
          trunks at the top of a swell. */}
      <mesh position={[0, quay.top / 2, quay.centerZ]}>
        <boxGeometry args={[quay.width, quay.top, quay.depth]} />
        <meshLambertMaterial color={fordeColors.quay} />
      </mesh>
      {/* A coping along the water's edge: without it the promenade reads as an
          endless plane rather than as a bank the Förde stops at. */}
      <mesh position={[0, quay.top - 0.25, quay.centerZ - quay.depth / 2 + 1]}>
        <boxGeometry args={[quay.width, 0.9, 2]} />
        <meshLambertMaterial color={fordeColors.quayEdge} />
      </mesh>
      <Avenue />
      {sensor.trees.map((index, k) => (
        <Sensor key={index} tree={quayTrees[index]} phase={k / sensor.trees.length} />
      ))}
    </>
  )
}

// The ClientRouter swaps the document rather than unmounting react, so fiber's
// own teardown does not run reliably. Same guard as the tour canvas.
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

/**
 * Mounted once for the whole run by ShowcaseLoop and only faded between its
 * slots. Building a webgl context up and down three hundred times over a fair
 * day is the reliable way to crash after two hours, the same reason the tour
 * canvas is hoisted.
 *
 * The title scene's own wipe covers the harbour before the scene ends, so the
 * fade here only ever runs under an opaque layer.
 */
export default function FordeScene3D({ shown }: { shown: boolean }) {
  // The sky is a css gradient behind a transparent canvas: no skybox to render,
  // no banding, and the fog colour blends straight into it at the horizon.
  const sky = useMemo(
    () =>
      `linear-gradient(to bottom, ${fordeColors.skyHigh} 0%, ${fordeColors.skyMid} 44%, ${fordeColors.fog} 74%, ${fordeColors.skyLow} 100%)`,
    [],
  )

  return (
    <div
      className="showcase-canvas-fade pointer-events-none absolute inset-0 transition-opacity duration-800"
      style={{ opacity: shown ? 1 : 0, background: sky }}
      aria-hidden={!shown}
    >
      <Canvas
        flat
        dpr={[1, 2]}
        frameloop={shown ? 'always' : 'demand'}
        camera={{ fov: fordeScene.fov, near: 1, far: 900 }}
        gl={{ antialias: true, alpha: true }}
        className="h-full w-full"
      >
        <ReleaseContextOnNavigate />
        <FordeModel shown={shown} />
      </Canvas>
    </div>
  )
}
