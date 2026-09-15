import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE =
  process.env.VIDEO_BASE_URL ?? 'https://green-ecolution-public-videos.s3.de.io.cloud.ovh.net'

const CLIPS = ['showcase-karte.mp4', 'showcase-verlauf.mp4', 'showcase-einsatzplanung.mp4']

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'showcase-clips')

await mkdir(target, { recursive: true })

let missing = 0

for (const clip of CLIPS) {
  const response = await fetch(`${BASE}/${clip}`)

  if (!response.ok) {
    console.warn(`fehlt im Bucket, wird übersprungen: ${clip} (${response.status})`)
    missing += 1
    continue
  }

  await writeFile(join(target, clip), Buffer.from(await response.arrayBuffer()))
  console.log(`geladen: ${clip}`)
}

console.log(
  missing === 0
    ? 'alle Clips vorhanden'
    : `${missing} von ${CLIPS.length} Clips fehlen, die Tafel zeigt dort Screenshots`,
)
