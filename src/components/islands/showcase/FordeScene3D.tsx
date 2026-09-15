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
  Shape,
  ShapeGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  cameraAt,
  cloudX,
  clouds,
  farShore,
  fordeColors,
  houseTones,
  HOUSE_PLINTH,
  museumShips,
  quay,
  quayHouses,
  quayTrees,
  roofTones,
  scene as fordeScene,
  spires,
  swayAngle,
  treePit,
  water,
  waveHeight,
  type GableHouse,
  type QuayTree,
  type Ship,
  type Vec3,
} from '../../../data/showcaseForde'

// Built in the xz plane straight away, so a wave only has to move a vertex's y.
const waterGeometry = (() => {
  const geometry = new PlaneGeometry(water.width, water.depth, water.segmentsX, water.segmentsZ)
  geometry.rotateX(-Math.PI / 2)
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3),
  )
  return geometry
})()

const waterRest = Float32Array.from(waterGeometry.attributes.position.array)

const deepWater = new Color(fordeColors.waterDeep)
const crestWater = new Color(fordeColors.waterCrest)
const crestTint = new Color()

function Water() {
  const mesh = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) {
      return
    }

    const seconds = clock.getElapsedTime()
    const position = waterGeometry.attributes.position
    const color = waterGeometry.attributes.color

    for (let i = 0; i < position.count; i++) {
      const x = waterRest[i * 3]
      const z = waterRest[i * 3 + 2]
      const height = waveHeight(x, z + water.centerZ, seconds)

      position.setY(i, height)
      // Only the tips catch the light. Tinting across the whole wave, troughs
      // included, averages the surface to the midpoint and the water reads as
      // a pale field instead of as water.
      const crest = Math.max(0, height / water.amplitude)
      crestTint.copy(deepWater).lerp(crestWater, crest * crest * 0.55)
      color.setXYZ(i, crestTint.r, crestTint.g, crestTint.b)
    }

    position.needsUpdate = true
    color.needsUpdate = true
    waterGeometry.computeVertexNormals()
  })

  return (
    <mesh ref={mesh} geometry={waterGeometry} position={[0, 0, water.centerZ]}>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
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

function gableRoof(house: GableHouse): BufferGeometry {
  const overhang = house.stepped ? 0 : EAVES_OVERHANG
  const height = house.stepped ? house.roofHeight * 0.88 : house.roofHeight
  const shape = new Shape()
  shape.moveTo(-house.width / 2 - overhang, 0)
  shape.lineTo(house.width / 2 + overhang, 0)
  shape.lineTo(0, height)
  shape.closePath()

  return extruded(shape, house.depth + (house.stepped ? 0 : EAVES_DEPTH))
}

/**
 * The Flensburg merchant front: the facade climbs past the roof in steps to a
 * narrow crest. Built as a plate standing just proud of the gable wall, so the
 * ordinary roof can sit behind it and the silhouette is all steps.
 */
function steppedGable(house: GableHouse): BufferGeometry {
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

/**
 * Windows, as openings a little proud of the wall rather than set into it: at
 * a quarter of a kilometre a reveal is invisible, but the dark rectangle is
 * the whole reason the row reads as houses and not as blocks.
 */
function houseWindows(house: GableHouse): BufferGeometry[] {
  const parts: BufferGeometry[] = []
  const front = house.depth / 2
  const storey = (house.wallHeight - HOUSE_PLINTH) / house.floors
  const bayWidth = house.width / house.bays

  for (let floor = 0; floor < house.floors; floor++) {
    const shop = floor === 0
    const y = HOUSE_PLINTH + (floor + 0.5) * storey
    const height = Math.min(shop ? 2.1 : 1.5, storey * (shop ? 0.72 : 0.55))
    const width = Math.min(shop ? 1.9 : 1.25, bayWidth * (shop ? 0.72 : 0.5))
    const tone = shop ? fordeColors.shopfront : fordeColors.windowGlass

    for (let bay = 0; bay < house.bays; bay++) {
      const x = -house.width / 2 + bayWidth * (bay + 0.5)
      parts.push(painted(unitBox, placed([x, y, front], [width, height, 0.12]), tone))
    }

    // The outermost houses are seen well off their fronts, so the flanks carry
    // a couple of bays too or they read as blank slabs at the ends of the row.
    for (const side of [-1, 1]) {
      for (let bay = 0; bay < 2; bay++) {
        const z = -house.depth / 2 + (house.depth / 2) * (bay + 0.5)
        parts.push(
          painted(unitBox, placed([(side * house.width) / 2, y, z], [0.12, height, width]), tone),
        )
      }
    }
  }

  // A hoist door in the gable, where the merchant houses took goods in.
  parts.push(
    painted(
      unitBox,
      placed([0, house.wallHeight + house.roofHeight * 0.34, front], [0.85, 1, 0.12]),
      fordeColors.windowGlass,
    ),
  )

  return parts
}

function houseGeometry(house: GableHouse): BufferGeometry[] {
  const roofSpan = house.width + (house.stepped ? 0 : 2 * EAVES_OVERHANG)
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
      placed(
        [0, house.wallHeight - FASCIA_HEIGHT / 2, 0],
        [roofSpan, FASCIA_HEIGHT, house.depth + EAVES_DEPTH],
      ),
      fordeColors.houseEaves,
    ),
    painted(
      gableRoof(house),
      new Matrix4().makeTranslation(0, house.wallHeight, 0),
      roofTones[house.roofTone],
    ),
    painted(
      unitBox,
      placed(
        [0, house.wallHeight + house.roofHeight - 0.12, 0],
        [0.4, 0.26, house.depth + EAVES_DEPTH],
      ),
      fordeColors.houseRidge,
    ),
    ...houseWindows(house),
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
    const base = house.wallHeight + house.roofHeight - 0.4
    parts.push(
      painted(
        unitBox,
        placed([0, base + chimney.height / 2, chimney.at], [0.8, chimney.height, 0.8]),
        fordeColors.chimney,
      ),
      painted(
        unitBox,
        placed([0, base + chimney.height, chimney.at], [1.05, 0.2, 1.05]),
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

// Two dozen houses of a dozen parts each, none of which ever moves: one merged
// geometry with the tones baked into its vertex colours keeps the whole harbour
// front at a single draw call.
const townGeometry = merged(quayHouses.flatMap(houseGeometry))

function HarbourFront() {
  return (
    <>
      <mesh geometry={townGeometry}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>

      {spires.map((spire) => (
        <group key={spire.x} position={[spire.x, farShore.top, spire.z]}>
          <mesh position={[0, spire.towerHeight / 2, 0]}>
            <boxGeometry args={[spire.width, spire.towerHeight, spire.width]} />
            <meshLambertMaterial color={fordeColors.house} />
          </mesh>
          {/* Four sides, turned a half facet so the pyramid's ridges sit over
              the tower's corners rather than across its faces. */}
          <mesh
            position={[0, spire.towerHeight + spire.spireHeight / 2, 0]}
            rotation={[0, Math.PI / 4, 0]}
          >
            <coneGeometry args={[spire.width * 0.78, spire.spireHeight, 4]} />
            <meshLambertMaterial color={fordeColors.spire} />
          </mesh>
        </group>
      ))}
    </>
  )
}

const mastGeometry = new CylinderGeometry(0.22, 0.3, 1, 6)
const sparGeometry = new CylinderGeometry(0.15, 0.15, 1, 6)
const stayGeometry = new CylinderGeometry(0.09, 0.09, 1, 5)

/**
 * A line from the masthead down to a point on the deck. Both ends lie in the
 * ship's fore-and-aft plane, so one rotation about z is enough to aim a
 * y-aligned cylinder along it.
 */
function Stay({ run, height }: { run: number; height: number }) {
  const length = Math.hypot(run, height)

  return (
    <mesh
      geometry={stayGeometry}
      position={[run / 2, height / 2, 0]}
      rotation={[0, 0, Math.atan2(-run, -height)]}
      scale={[1, length, 1]}
    >
      <meshLambertMaterial color={fordeColors.mast} />
    </mesh>
  )
}

const BOOM_HEIGHT = 1.7

function sailGeometry(points: readonly (readonly [number, number])[]) {
  const shape = new Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (const [x, y] of points.slice(1)) {
    shape.lineTo(x, y)
  }
  shape.closePath()
  return new ShapeGeometry(shape)
}

// Two sails per rigged mast, both in the ship's fore-and-aft plane, which faces
// the camera: the headsail on the forestay and the main between mast and boom.
const shipSails = museumShips.map((ship) =>
  ship.masts.map((mast) => {
    if (mast.boom <= 0) {
      return null
    }

    const bow = -ship.hullLength / 2 - mast.at

    return {
      head: sailGeometry([
        [0, mast.height],
        [bow, 0],
        [0, 0],
      ]),
      main: sailGeometry([
        [0, mast.height],
        [mast.boom, BOOM_HEIGHT],
        [0, BOOM_HEIGHT],
      ]),
    }
  }),
)

function MuseumShip({ ship, sails }: { ship: Ship; sails: (typeof shipSails)[number] }) {
  return (
    <group position={[ship.x, 0, ship.z]} rotation={[0, ship.heading, 0]}>
      <mesh position={[0, ship.hullHeight / 2, 0]}>
        <boxGeometry args={[ship.hullLength, ship.hullHeight, 6]} />
        <meshLambertMaterial color={fordeColors.hull} />
      </mesh>

      {ship.masts.map((mast, index) => {
        const sail = sails[index]

        return (
          <group key={mast.at} position={[mast.at, ship.hullHeight, 0]}>
            {sail && (
              <>
                <mesh geometry={sail.head}>
                  <meshLambertMaterial color={fordeColors.sail} side={DoubleSide} />
                </mesh>
                {/* A shade apart from the headsail, so two overlapping canvases
                  do not merge into one silhouette. */}
                <mesh geometry={sail.main}>
                  <meshLambertMaterial color={fordeColors.sailShaded} side={DoubleSide} />
                </mesh>
              </>
            )}
            <mesh
              geometry={mastGeometry}
              position={[0, mast.height / 2, 0]}
              scale={[1, mast.height, 1]}
            >
              <meshLambertMaterial color={fordeColors.mast} />
            </mesh>
            {/* The forestay doubles as the headsail's leading edge. */}
            <Stay run={-ship.hullLength / 2 - mast.at} height={mast.height} />

            {/* The boom lies just above the deck, where it reads as part of the
              hull rather than as an arm on a standing pole. */}
            {mast.boom > 0 && (
              <mesh
                geometry={sparGeometry}
                position={[mast.boom / 2, BOOM_HEIGHT, 0]}
                rotation={[0, 0, Math.PI / 2]}
                scale={[1, mast.boom, 1]}
              >
                <meshLambertMaterial color={fordeColors.mast} />
              </mesh>
            )}
          </group>
        )
      })}

      {ship.funnel && (
        <mesh position={[0, ship.hullHeight + ship.funnel.height / 2, 0]}>
          <cylinderGeometry
            args={[ship.funnel.radius, ship.funnel.radius, ship.funnel.height, 12]}
          />
          <meshLambertMaterial color={fordeColors.funnel} />
        </mesh>
      )}
    </group>
  )
}

// A street tree is ten parts, and there are twenty-one of them on screen for
// the whole opening. Merging each tree into one geometry with its tone baked
// into the vertex colours keeps the avenue at one draw call per tree instead of
// ten, which is what lets it carry this much detail at all.
const unitTrunk = new CylinderGeometry(0.62, 1, 1, 9)
const unitFlare = new CylinderGeometry(1, 1.6, 1, 9)
const unitLimb = new CylinderGeometry(0.5, 1, 1, 6)
const unitLobe = new IcosahedronGeometry(1, 1)
const unitPit = new CylinderGeometry(1, 1, 1, 16)

const canopyTones = [fordeColors.treeCanopyLit, fordeColors.treeCanopy, fordeColors.treeCanopyDark]

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

  for (const lobe of tree.canopy) {
    const radius = lobe.radius * crown

    parts.push(
      painted(
        unitLobe,
        placed(
          [lobe.at[0] * crown, tree.height + lobe.at[1] * crown, lobe.at[2] * crown],
          [radius, radius * 0.86, radius],
        ),
        canopyTones[lobe.tone],
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

function Rig({ active }: { active: boolean }) {
  const camera = useThree((state) => state.camera)
  const elapsed = useRef(0)

  useEffect(() => {
    if (active) {
      elapsed.current = 0
    }
  }, [active])

  useFrame((_, delta) => {
    if (active) {
      elapsed.current += delta
    }

    const frame = cameraAt(elapsed.current)
    camera.position.set(...frame.position)
    camera.lookAt(...frame.target)
  })

  return null
}

function FordeModel({ active }: { active: boolean }) {
  return (
    <>
      <fogExp2 attach="fog" args={[fordeColors.fog, fordeScene.fogDensity]} />

      {/* Kept well under 1 in total: lambert adds ambient and diffuse, so a
          bright fill washes every surface toward white before the fog does. */}
      <ambientLight intensity={0.55} />
      {/* Low and from starboard: morning light coming up the Förde. */}
      <directionalLight position={[160, 38, -40]} intensity={0.9} color={fordeColors.skyLow} />
      <directionalLight position={[-70, 30, 90]} intensity={0.25} color={fordeColors.skyHigh} />

      <Rig active={active} />
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

      <HarbourFront />
      {museumShips.map((ship, index) => (
        <MuseumShip key={ship.x} ship={ship} sails={shipSails[index]} />
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
 */
export default function FordeScene3D({ active }: { active: boolean }) {
  // The sky is a css gradient behind a transparent canvas: no skybox to render,
  // no banding, and the fog colour blends straight into it at the horizon.
  const sky = useMemo(
    () =>
      `linear-gradient(to bottom, ${fordeColors.skyHigh} 0%, ${fordeColors.skyMid} 44%, ${fordeColors.fog} 74%, ${fordeColors.skyLow} 100%)`,
    [],
  )

  return (
    <div
      className="showcase-tour-fade pointer-events-none absolute inset-0 transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0, background: sky }}
      aria-hidden={!active}
    >
      <Canvas
        flat
        dpr={[1, 2]}
        frameloop={active ? 'always' : 'demand'}
        camera={{ fov: fordeScene.fov, near: 1, far: 900 }}
        gl={{ antialias: true, alpha: true }}
        className="h-full w-full"
      >
        <ReleaseContextOnNavigate />
        <FordeModel active={active} />
      </Canvas>
    </div>
  )
}
