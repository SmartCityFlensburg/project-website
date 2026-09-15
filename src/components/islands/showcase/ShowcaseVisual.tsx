import { useState } from 'react'
import LottiePlayer from '../LottiePlayer'
import cableAnimation from '../../../json/cableAnimation.json'
import dashboardAnimation from '../../../json/dashboardAnimation.json'
import logoAnimation from '../../../json/logoAnimation.json'
import { showcaseClipBaseUrl } from '../../../lib/runtimeEnv'
import type { Visual } from '../../../data/showcase'

const LOTTIE = {
  logo: logoAnimation,
  cable: cableAnimation,
  dashboard: dashboardAnimation,
}

const photos = import.meta.glob<{ default: { src: string } }>(
  '../../../assets/photos/*.{jpg,png}',
  { eager: true },
)
const releases = import.meta.glob<{ default: { src: string } }>('../../../assets/releases/*.png', {
  eager: true,
})

function assetUrl(name: string): string {
  const entry =
    photos[`../../../assets/photos/${name}`] ?? releases[`../../../assets/releases/${name}`]

  if (!entry) {
    throw new Error(`Showcase-Asset nicht gefunden: ${name}`)
  }

  return entry.default.src
}

function PannedImage({ name, seconds }: { name: string; seconds: number }) {
  return (
    <img
      src={assetUrl(name)}
      alt=""
      className="showcase-pan h-full w-full object-cover"
      style={{ animationDuration: `${seconds}s` }}
    />
  )
}

const logos = import.meta.glob<{ default: { src: string } }>('../../../assets/logos/*.{png,svg}', {
  eager: true,
})

const PARTNERS = [
  { file: 'hochschule-flensburg.png', height: 'h-16' },
  { file: 'progeek.svg', height: 'h-20' },
  { file: 'smarte-grenzregion.png', height: 'h-14' },
  { file: 'tbz.png', height: 'h-12' },
] as const

function PartnerLogos() {
  return (
    <div className="mb-14 flex items-center justify-center gap-16">
      {PARTNERS.map(({ file, height }) => {
        const entry = logos[`../../../assets/logos/${file}`]

        if (!entry) {
          throw new Error(`Partnerlogo nicht gefunden: ${file}`)
        }

        return (
          <img
            key={file}
            src={entry.default.src}
            alt=""
            // The logos are dark artwork on a dark act, so they run inverted.
            className={`${height} w-auto opacity-90 brightness-0 invert`}
          />
        )
      })}
    </div>
  )
}

// A clip that failed once will fail again: the booth build is fixed and the
// stand has no network. Remembering it outside component state survives the
// scene change, so the slot shows its screenshot straight away instead of
// staring at a still poster for the error latency, three hundred times a day.
const failedClips = new Set<string>()

function ShowcaseVideo({
  visual,
  seconds,
}: {
  visual: Extract<Visual, { kind: 'video' }>
  seconds: number
}) {
  const [clipFailed, setClipFailed] = useState(() => failedClips.has(visual.clip))

  // Until a clip exists in the bucket the slot shows its screenshot, so the
  // loop is complete from day one and gains the recording without a change.
  if (clipFailed) {
    return <PannedImage name={visual.poster} seconds={seconds} />
  }

  return (
    <video
      src={`${showcaseClipBaseUrl()}/${visual.clip}`}
      poster={assetUrl(visual.poster)}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="h-full w-full object-cover"
      onError={() => {
        failedClips.add(visual.clip)
        setClipFailed(true)
      }}
    />
  )
}

export default function ShowcaseVisual({ visual, seconds }: { visual: Visual; seconds: number }) {
  switch (visual.kind) {
    case 'image':
      return <PannedImage name={visual.asset} seconds={seconds} />

    case 'lottie':
      return (
        <LottiePlayer
          animationData={LOTTIE[visual.name]}
          autoplay
          loop
          aria-hidden="true"
          className="h-full w-full"
        />
      )

    case 'video':
      return <ShowcaseVideo visual={visual} seconds={seconds} />

    case 'tour':
      // Mounted once for the whole run by ShowcaseLoop, not per scene.
      return null

    case 'partners':
      return <PartnerLogos />
  }
}
