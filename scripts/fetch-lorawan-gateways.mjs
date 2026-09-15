/**
 * Builds the LoRaWAN coverage map for the showcase's `lorawan` scene.
 *
 * Run by hand, not by the build: the output is committed so the slide never
 * depends on a network the booth does not have, and so the state of the map is
 * reviewable in a diff.
 *
 *   node scripts/fetch-lorawan-gateways.mjs
 *
 * Sources
 *   Outline   Natural Earth 10m admin-1 (public domain, no attribution due).
 *   Gateways  The Things Network's public gateway list. Only the state network
 *             is kept: the gateways the Landesverwaltung put up in 2024,
 *             built by HanseWerk (`SH-Netz_*`) and ADDIX (`adx*`). Everything
 *             else in the sky over Schleswig-Holstein is somebody's community
 *             gateway and not what the slide is about.
 *
 * What lands in the repo is the drawing, not the dataset: positions come out
 * as viewBox units rounded to a tenth. At this scale one unit is well over a
 * hundred metres, so the rounding costs the map nothing it could have shown.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const NATURAL_EARTH =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'
const TTN_GATEWAYS = 'https://www.thethingsnetwork.org/gateway-data/'

// The two contractors named in the state's own announcement of the rollout.
const STATE_NETWORK = /^(sh-?netz|adx|addix)/i

/** Where the map is anchored: the city the project actually waters trees in. */
const FLENSBURG = { lon: 9.4321, lat: 54.7836 }

/**
 * Helgoland belongs to the state but sits fifty kilometres out in the North
 * Sea, which stretches the map by an eighth of its width to render three
 * pixels that read as a blemish rather than an island. Nothing else of
 * Schleswig-Holstein lies west of this meridian.
 */
const OFFSHORE_WEST_OF = 8.2

const VIEW_WIDTH = 1000
const MARGIN = 12

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`${url} antwortete mit ${response.status}`)
  }

  return response.json()
}

function ringsOf(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons
    .map((polygon) => polygon[0])
    .filter((ring) => Math.max(...ring.map(([lon]) => lon)) > OFFSHORE_WEST_OF)
}

function inRing([x, y], ring) {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Equirectangular, with longitude squeezed by the cosine of the middle
 * latitude. Over a state a hundred and eighty kilometres tall the error is
 * far below the width of the coastline stroke, and unlike a conformal
 * projection it needs no library.
 */
function projector(rings) {
  const lons = rings.flat().map(([lon]) => lon)
  const lats = rings.flat().map(([, lat]) => lat)

  const west = Math.min(...lons)
  const east = Math.max(...lons)
  const south = Math.min(...lats)
  const north = Math.max(...lats)

  const squeeze = Math.cos(((south + north) / 2) * (Math.PI / 180))
  const scale = (VIEW_WIDTH - 2 * MARGIN) / ((east - west) * squeeze)
  const height = (north - south) * scale + 2 * MARGIN

  return {
    height,
    project: ({ lon, lat }) => [
      round((lon - west) * squeeze * scale + MARGIN),
      round((north - lat) * scale + MARGIN),
    ],
  }
}

function round(value) {
  return Math.round(value * 10) / 10
}

function pathOf(ring, project) {
  return ring
    .map(([lon, lat], index) => `${index === 0 ? 'M' : 'L'}${project({ lon, lat }).join(' ')}`)
    .join('')
    .concat('Z')
}

const [world, gateways] = await Promise.all([fetchJson(NATURAL_EARTH), fetchJson(TTN_GATEWAYS)])

const state = world.features.find((feature) => feature.properties.name === 'Schleswig-Holstein')

if (!state) {
  throw new Error('Schleswig-Holstein fehlt in den Natural-Earth-Daten')
}

const rings = ringsOf(state.geometry)
const { height, project } = projector(rings)

const stateNetwork = Object.values(gateways).filter(
  (gateway) =>
    gateway.location &&
    (STATE_NETWORK.test(gateway.name ?? '') || STATE_NETWORK.test(gateway.id ?? '')) &&
    rings.some((ring) => inRing([gateway.location.longitude, gateway.location.latitude], ring)),
)

if (stateNetwork.length < 300) {
  throw new Error(
    `nur ${stateNetwork.length} Gateways des Landesnetzes gefunden; die Namensmuster stimmen nicht mehr`,
  )
}

// Two gateways on the same mast draw the same dot twice, which only darkens a
// pixel and costs an animation slot.
const points = [
  ...new Set(
    stateNetwork.map((gateway) =>
      project({ lon: gateway.location.longitude, lat: gateway.location.latitude }).join(','),
    ),
  ),
].map((key) => key.split(',').map(Number))

const coverage = {
  source: 'The Things Network gateway list, Natural Earth 10m admin-1',
  retrieved: new Date().toISOString().slice(0, 10),
  gatewayCount: stateNetwork.length,
  viewBox: [0, 0, VIEW_WIDTH, Math.round(height)],
  outline: rings.map((ring) => pathOf(ring, project)),
  anchor: project(FLENSBURG),
  points,
}

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'showcaseCoverage.generated.json',
)

await writeFile(target, `${JSON.stringify(coverage, null, 2)}\n`)

console.log(
  `${coverage.gatewayCount} Gateways des Landesnetzes, ${points.length} Punkte auf der Karte, viewBox ${coverage.viewBox.join(' ')}`,
)
