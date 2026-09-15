import { describe, expect, test } from 'vitest'
import {
  cameraAt,
  cloudSpan,
  cloudX,
  clouds,
  farShore,
  quay,
  quayHouses,
  scene,
  spires,
  swayAngle,
  waveHeight,
  wind,
  water,
  quayTrees,
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
