import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three'
import {
  cameraAt,
  cloudX,
  clouds,
  fordeColors,
  museumShips,
  quay,
  quayHouses,
  quayTrees,
  scene as fordeScene,
  spires,
  swayAngle,
  water,
  waveHeight,
  type GableHouse,
  type Ship,
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

function gableRoof(house: GableHouse): BufferGeometry {
  const shape = new Shape()
  shape.moveTo(-house.width / 2, 0)
  shape.lineTo(house.width / 2, 0)
  shape.lineTo(0, house.roofHeight)
  shape.closePath()

  const geometry = new ExtrudeGeometry(shape, { depth: house.depth, bevelEnabled: false })
  geometry.translate(0, 0, -house.depth / 2)
  return geometry
}

const houseWalls = quayHouses.map(
  (house) => new BoxGeometry(house.width, house.wallHeight, house.depth),
)
const houseRoofs = quayHouses.map(gableRoof)

function HarbourFront() {
  return (
    <>
      {quayHouses.map((house, index) => (
        <group key={house.x} position={[house.x, 0, house.z]}>
          <mesh geometry={houseWalls[index]} position={[0, house.wallHeight / 2, 0]}>
            <meshLambertMaterial color={fordeColors.house} />
          </mesh>
          <mesh geometry={houseRoofs[index]} position={[0, house.wallHeight, 0]}>
            <meshLambertMaterial color={fordeColors.roof} />
          </mesh>
        </group>
      ))}

      {spires.map((spire) => (
        <group key={spire.x} position={[spire.x, 0, spire.z]}>
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

function Avenue() {
  const trees = useRef<(Group | null)[]>([])

  useFrame(({ clock }) => {
    const seconds = clock.getElapsedTime()

    trees.current.forEach((tree, index) => {
      if (tree) {
        tree.rotation.z = swayAngle(quayTrees[index].phase, seconds)
      }
    })
  })

  return (
    <>
      {quayTrees.map((tree, index) => (
        <group
          key={tree.x}
          ref={(node) => {
            trees.current[index] = node
          }}
          position={[tree.x, quay.top, tree.z]}
        >
          <mesh position={[0, tree.height / 2, 0]}>
            <cylinderGeometry args={[0.32, 0.48, tree.height, 8]} />
            <meshLambertMaterial color={fordeColors.treeTrunk} />
          </mesh>

          {/* Two offset spheres rather than one: a single ball reads as a
              lollipop at this size, two read as a crown. */}
          <mesh position={[0, tree.height + tree.canopyRadius * 0.35, 0]} scale={[1, 0.86, 1]}>
            <sphereGeometry args={[tree.canopyRadius, 14, 11]} />
            <meshLambertMaterial
              color={tree.dark ? fordeColors.treeCanopyDark : fordeColors.treeCanopy}
            />
          </mesh>
          <mesh
            position={[
              tree.canopyRadius * 0.42,
              tree.height + tree.canopyRadius * 0.82,
              tree.canopyRadius * 0.2,
            ]}
            scale={[1, 0.84, 1]}
          >
            <sphereGeometry args={[tree.canopyRadius * 0.66, 12, 9]} />
            <meshLambertMaterial
              color={tree.dark ? fordeColors.treeCanopy : fordeColors.treeCanopyDark}
            />
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
