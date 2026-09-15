import { describe, expect, test } from 'vitest'
import {
  baysFor,
  cityBlocks,
  depotDepth,
  depotPosition,
  depotWidth,
  kerb,
  lawns,
  roadWidth,
  tourFrame,
  tourLegs,
  tourMarks,
  tourSeconds,
  trees,
  windowSpec,
  type GroundPoint,
} from './streamletTour'

interface Footprint {
  x: number
  z: number
  width: number
  depth: number
}

const carriageway = roadWidth / 2 + kerb.width

// Axis-aligned rectangle against the swept corridor of every road segment.
function touchesRoad(footprint: Footprint, clearance = 0) {
  const minX = footprint.x - footprint.width / 2 - clearance
  const maxX = footprint.x + footprint.width / 2 + clearance
  const minZ = footprint.z - footprint.depth / 2 - clearance
  const maxZ = footprint.z + footprint.depth / 2 + clearance

  return tourLegs.some((leg) =>
    leg.points.slice(1).some((to, index) => {
      const from = leg.points[index]
      const segMinX = Math.min(from[0], to[0]) - carriageway
      const segMaxX = Math.max(from[0], to[0]) + carriageway
      const segMinZ = Math.min(from[1], to[1]) - carriageway
      const segMaxZ = Math.max(from[1], to[1]) + carriageway

      return minX < segMaxX && maxX > segMinX && minZ < segMaxZ && maxZ > segMinZ
    }),
  )
}

const depotFootprint: Footprint = {
  x: depotPosition[0],
  z: depotPosition[1],
  width: depotWidth,
  depth: depotDepth,
}

describe('street layout', () => {
  test('keeps every block off the kerb', () => {
    for (const block of cityBlocks) {
      expect(touchesRoad(block, 0.5), `block at ${block.x},${block.z}`).toBe(false)
    }
  })

  test('keeps every lawn off the kerb', () => {
    for (const lawn of lawns) {
      expect(touchesRoad(lawn), `lawn at ${lawn.x},${lawn.z}`).toBe(false)
    }
  })

  test('keeps the lawns out of the blocks', () => {
    for (const lawn of lawns) {
      for (const block of cityBlocks) {
        const apart =
          Math.abs(lawn.x - block.x) >= (lawn.width + block.width) / 2 ||
          Math.abs(lawn.z - block.z) >= (lawn.depth + block.depth) / 2
        expect(apart, `lawn at ${lawn.x},${lawn.z} meets block at ${block.x},${block.z}`).toBe(true)
      }
    }
  })

  test('keeps every crown out of the blocks and the depot', () => {
    const buildings = [...cityBlocks, depotFootprint]
    for (const tree of trees) {
      for (const building of buildings) {
        const dx = Math.max(0, Math.abs(tree.at[0] - building.x) - building.width / 2)
        const dz = Math.max(0, Math.abs(tree.at[1] - building.z) - building.depth / 2)
        expect(
          Math.hypot(dx, dz),
          `tree at ${tree.at.join(',')} meets building at ${building.x},${building.z}`,
        ).toBeGreaterThanOrEqual(tree.canopyRadius)
      }
    }
  })

  test('keeps the depot off the kerb', () => {
    expect(touchesRoad(depotFootprint, 0.5)).toBe(false)
  })

  // The camera looks in from +x, so a depot wholly west of the road the
  // vehicle parks on can never stand between the camera and the vehicle.
  test('stands the depot west of the road the vehicle parks on', () => {
    const [startX] = tourMarks[0].at
    expect(depotPosition[0] + depotWidth / 2).toBeLessThan(startX - roadWidth / 2)
  })

  test('parks the vehicle in front of the depot gate', () => {
    const [, startZ] = tourMarks[0].at
    expect(Math.abs(depotPosition[1] - startZ)).toBeLessThanOrEqual(depotDepth / 2)
  })

  // The tour has to leave the depot the way it arrived, or the vehicle snaps
  // round when the loop wraps and the road shows a seam where its ends meet.
  test('closes the loop on a straight run', () => {
    const first = tourLegs[0].points
    const last = tourLegs[tourLegs.length - 1].points
    const leaving = direction(first[0], first[1])
    const arriving = direction(last[last.length - 2], last[last.length - 1])
    expect(leaving).toEqual(arriving)
    expect(first[0]).toEqual(last[last.length - 1])
  })
})

function direction(from: GroundPoint, to: GroundPoint): GroundPoint {
  return [Math.sign(to[0] - from[0]), Math.sign(to[1] - from[1])]
}

describe('facades', () => {
  test('fits every window row into its storey', () => {
    for (const block of cityBlocks) {
      const storey = block.height / block.floors
      expect(storey, `block at ${block.x},${block.z}`).toBeGreaterThanOrEqual(
        windowSpec.height + windowSpec.sill,
      )
    }
  })

  test('fits the window columns a face gets into that face', () => {
    for (const length of [1, 2.9, 3, 8, 13]) {
      const bays = baysFor(length)
      const needed = bays * windowSpec.width + (bays + 1) * windowSpec.gap
      if (bays > 0) expect(needed).toBeLessThanOrEqual(length + 1e-9)
      expect(needed + windowSpec.width + windowSpec.gap).toBeGreaterThan(length)
    }
  })

  test('gives every block at least one window on its narrower face', () => {
    for (const block of cityBlocks) {
      expect(
        baysFor(Math.min(block.width, block.depth)),
        `block at ${block.x},${block.z}`,
      ).toBeGreaterThan(0)
    }
  })
})

describe('tourFrame', () => {
  test('dwells at the depot where the tour starts', () => {
    let seen = false
    for (let t = 0; t < tourSeconds; t += 0.05) {
      const frame = tourFrame(t)
      if (frame.dwellMark?.kind !== 'depot') continue
      seen = true
      expect(frame.at).toBe(1)
    }
    expect(seen).toBe(true)
  })
})
