import { describe, expect, test } from 'vitest'
import {
  cameraAt,
  cloudSpan,
  cloudX,
  clouds,
  farShore,
  glint,
  glintOf,
  quay,
  quayHouses,
  scene,
  spires,
  limbTip,
  sensor,
  signalProgress,
  shallowness,
  swayAngle,
  waveHeight,
  waveSurface,
  waves,
  wind,
  water,
  quayTrees,
  treePit,
} from './showcaseForde'

describe('cloudX', () => {
  // A cloud that runs off the band and never comes back leaves a bare sky for
  // the rest of the fair day.
  test('keeps every cloud inside the band for a long run', () => {
    for (const cloud of clouds) {
      for (let t = 0; t < 4000; t += 17.3) {
        const x = cloudX(cloud, t)
        expect(x).toBeGreaterThanOrEqual(-cloudSpan)
        expect(x).toBeLessThanOrEqual(cloudSpan)
      }
    }
  })

  test('starts each cloud where it was placed', () => {
    for (const cloud of clouds) {
      expect(cloudX(cloud, 0)).toBeCloseTo(cloud.x, 6)
    }
  })

  test('drifts in one direction between wraps', () => {
    const cloud = clouds[0]
    expect(cloudX(cloud, 5)).toBeGreaterThan(cloudX(cloud, 0))
  })
})

describe('swayAngle', () => {
  test('stays within the wind amplitude', () => {
    for (let t = 0; t < 40; t += 0.37) {
      expect(Math.abs(swayAngle(0.8, t))).toBeLessThanOrEqual(wind.amplitude)
    }
  })

  // A shared phase would move the whole avenue as one block, which reads as a
  // camera shake rather than as wind.
  test('moves each tree on its own phase', () => {
    expect(swayAngle(0, 1.5)).not.toBeCloseTo(swayAngle(2.1, 1.5), 4)
  })
})

describe('waveHeight', () => {
  test('stays within the water amplitude', () => {
    for (let t = 0; t < 20; t += 0.43) {
      for (const x of [-180, -40, 0, 55, 210]) {
        for (const z of [-260, -90, 0, 30]) {
          expect(Math.abs(waveHeight(x, z, t))).toBeLessThanOrEqual(water.amplitude)
        }
      }
    }
  })

  test('varies across the surface at a single moment', () => {
    expect(waveHeight(0, 0, 3)).not.toBeCloseTo(waveHeight(37, -60, 3), 4)
  })

  // The amplitude bound above only holds because the shares add up to the
  // whole: a set that sums past one lets a crest climb over the promenade.
  test('shares the amplitude out between the waves without remainder', () => {
    const total = waves.reduce((sum, wave) => sum + wave.weight, 0)
    expect(total).toBeCloseTo(1, 6)
  })

  // A cell wider than half a wavelength cannot show that wave: the mesh
  // samples it as a slow shimmer instead of as chop.
  test('is resolved by the water mesh down to the shortest chop', () => {
    const shortest = Math.min(...waves.map((wave) => wave.length))

    expect(water.width / water.segmentsX).toBeLessThan(shortest / 2)
    expect(water.depth / water.segmentsZ).toBeLessThan(shortest / 2)
  })
})

describe('waveSurface', () => {
  const surface = { height: 0, tiltX: 0, tiltZ: 0 }

  // The shader glints off the analytic slope, so it has to be the slope of
  // the height the same shader displaces by.
  test('reports the slope the height actually has', () => {
    const step = 0.001

    for (const [x, z, t] of [
      [12, -80, 1.5],
      [-90, -160, 7.2],
      [200, -30, 12.9],
    ]) {
      waveSurface(x, z, t, surface)
      const alongX = (waveHeight(x + step, z, t) - waveHeight(x - step, z, t)) / (2 * step)
      const alongZ = (waveHeight(x, z + step, t) - waveHeight(x, z - step, t)) / (2 * step)

      expect(surface.tiltX).toBeCloseTo(alongX, 4)
      expect(surface.tiltZ).toBeCloseTo(alongZ, 4)
    }
  })
})

describe('glintOf', () => {
  test('leaves a level surface dark', () => {
    expect(glintOf({ height: 0, tiltX: 0, tiltZ: 0 })).toBe(0)
  })

  test('lights a facet leaning toward the sun and not one leaning away', () => {
    const lean = glint.to
    expect(glintOf({ height: 0, tiltX: -lean * glint.towardX, tiltZ: -lean * glint.towardZ })).toBe(
      1,
    )
    expect(glintOf({ height: 0, tiltX: lean * glint.towardX, tiltZ: lean * glint.towardZ })).toBe(0)
  })

  // A chop that never leans far enough would leave the whole Förde matt.
  test('is reached somewhere on the surface', () => {
    const surface = { height: 0, tiltX: 0, tiltZ: 0 }
    let brightest = 0

    for (let x = -100; x <= 100; x += 1.7) {
      for (let z = -180; z <= -30; z += 1.3) {
        brightest = Math.max(brightest, glintOf(waveSurface(x, z, 4, surface)))
      }
    }

    expect(brightest).toBeGreaterThan(0.9)
  })
})

describe('shallowness', () => {
  const quayWall = quay.centerZ - quay.depth / 2
  const shoreWall = farShore.centerZ + farShore.depth / 2

  test('is full against either wall and gone in the middle of the Förde', () => {
    expect(shallowness(quayWall)).toBeCloseTo(1, 6)
    expect(shallowness(shoreWall)).toBeCloseTo(1, 6)
    expect(shallowness((quayWall + shoreWall) / 2)).toBe(0)
  })

  test('fades out within the shallows', () => {
    const half = shallowness(quayWall - water.shallows / 2)
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(1)
    expect(shallowness(quayWall - water.shallows)).toBe(0)
  })
})

describe('the promenade', () => {
  // A crest that reaches the promenade washes over the trunks, which is what
  // the avenue looked like before the bank was raised.
  test('stands clear of the highest wave along the water line', () => {
    let highest = 0

    for (let t = 0; t < 60; t += 0.31) {
      for (let x = -200; x <= 200; x += 13) {
        highest = Math.max(highest, waveHeight(x, quay.centerZ - quay.depth / 2, t))
      }
    }

    expect(quay.top).toBeGreaterThan(highest)
  })
})

describe('the harbour front', () => {
  // A row that ends inside the frame leaves bare bank at the edge, and the
  // camera's drift to port exposes more of it with every second.
  test('runs past a widescreen frame at both ends of the drift', () => {
    const aspect = 16 / 9
    const nearestZ = Math.max(...quayHouses.map((house) => house.z))
    const leftmost = Math.min(...quayHouses.map((house) => house.x - house.width / 2))
    const rightmost = Math.max(...quayHouses.map((house) => house.x + house.width / 2))

    for (const t of [0, scene.seconds]) {
      const { position, target } = cameraAt(t)
      const distance = position[2] - nearestZ
      const along = distance / (position[2] - target[2])
      const centre = position[0] + (target[0] - position[0]) * along
      const halfWidth = Math.tan((scene.fov * Math.PI) / 360) * distance * aspect

      expect(leftmost).toBeLessThan(centre - halfWidth)
      expect(rightmost).toBeGreaterThan(centre + halfWidth)
    }
  })

  // Houses are set down by a running cursor, so a wrong gap would stack them.
  test('leaves no two houses of a row standing in each other', () => {
    const rows = new Map<number, typeof quayHouses>()
    for (const house of quayHouses) {
      const rowZ = house.z < -205 ? -214 : -196
      rows.set(rowZ, [...(rows.get(rowZ) ?? []), house])
    }

    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x)
      for (let i = 1; i < sorted.length; i++) {
        const left = sorted[i - 1]
        const right = sorted[i]
        expect(right.x - right.width / 2).toBeGreaterThanOrEqual(left.x + left.width / 2)
      }
    }
  })

  test('mixes all three kinds of house into the front', () => {
    const kinds = new Set(quayHouses.map((house) => house.kind))
    expect(kinds).toEqual(new Set(['gable', 'eaves', 'warehouse']))
  })

  test('stands on the far shore', () => {
    for (const house of quayHouses) {
      expect(Math.abs(house.x) + house.width / 2).toBeLessThan(farShore.width / 2)
      expect(Math.abs(house.z - farShore.centerZ)).toBeLessThan(farShore.depth / 2)
    }
  })

  // A tower growing out of a neighbour's roof reads as a mistake, not as a nave.
  test('leaves the church towers standing free', () => {
    for (const spire of spires) {
      for (const house of quayHouses) {
        const apart = Math.abs(house.x - spire.x) >= (spire.width + house.width) / 2
        const inFront = house.z - house.depth / 2 > spire.z + spire.width / 2
        expect(apart || inFront).toBe(true)
      }
    }
  })
})

describe('cameraAt', () => {
  test('drifts sideways across the scene without turning back', () => {
    const samples = [0, 3, 6, 9, scene.seconds].map((t) => cameraAt(t).position[0])

    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1])
    }
  })

  test('closes in on the far shore over the scene', () => {
    expect(cameraAt(scene.seconds).position[2]).toBeLessThan(cameraAt(0).position[2])
  })

  // The avenue has to stay in frame for the whole drift, so the camera may
  // never travel further than the trees reach.
  test('keeps the camera inside the planted stretch', () => {
    const planted = Math.max(...quayTrees.map((tree) => Math.abs(tree.x)))

    for (const t of [0, scene.seconds]) {
      expect(Math.abs(cameraAt(t).position[0])).toBeLessThan(planted)
    }
  })
})

describe('quayTrees', () => {
  // A limb that ends in open air is a stick poking out of the crown.
  test('ends every limb inside a lobe of its own crown', () => {
    for (const tree of quayTrees) {
      const crown = tree.canopyRadius

      for (const limb of tree.limbs) {
        const tip = limbTip(limb, tree.height)
        const covered = tree.canopy.some((lobe) => {
          const gap = Math.hypot(
            tip[0] - lobe.at[0] * crown,
            tip[1] - (tree.height + lobe.at[1] * crown),
            tip[2] - lobe.at[2] * crown,
          )
          return gap < Math.min(...lobe.scale) * crown
        })

        expect(covered).toBe(true)
      }
    }
  })

  // The trunk has to show below the foliage, or the tree is a bush on a stick.
  test('keeps every crown clear of the lower trunk', () => {
    for (const tree of quayTrees) {
      for (const lobe of tree.canopy) {
        const bottom = tree.height + (lobe.at[1] - lobe.scale[1]) * tree.canopyRadius
        expect(bottom).toBeGreaterThan(tree.height * 0.4)
      }
    }
  })

  // One shape repeated down the quay reads as a row of bollards with leaves on.
  test('mixes the crown forms along the avenue', () => {
    expect(new Set(quayTrees.map((tree) => tree.form)).size).toBe(4)

    for (let i = 2; i < quayTrees.length; i++) {
      const run = new Set(quayTrees.slice(i - 2, i + 1).map((tree) => tree.form))
      expect(run.size).toBeGreaterThan(1)
    }
  })

  test('uses every canopy palette', () => {
    expect(new Set(quayTrees.map((tree) => tree.shade)).size).toBe(3)
  })
})

describe('sensor', () => {
  test('stands inside its tree pit and clear of the trunk', () => {
    const fromTrunk = Math.hypot(...sensor.offset)
    expect(fromTrunk).toBeLessThan(treePit.radius - treePit.kerbWidth)

    for (const index of sensor.trees) {
      expect(quayTrees[index]).toBeDefined()
      expect(fromTrunk).toBeGreaterThan(quayTrees[index].trunkRadius * 1.6)
    }
  })

  test('lets the two sensors pulse out of step', () => {
    expect(signalProgress(0, 4, 0)).not.toBeCloseTo(signalProgress(0, 4, 0.5), 3)
  })

  test('keeps every ring on its way out and staggers them', () => {
    for (let t = 0; t < 30; t += 0.31) {
      const progress = Array.from({ length: sensor.signal.rings }, (_, i) => signalProgress(i, t))

      for (const p of progress) {
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThan(1)
      }
      expect(new Set(progress.map((p) => p.toFixed(3))).size).toBe(sensor.signal.rings)
    }
  })
})
