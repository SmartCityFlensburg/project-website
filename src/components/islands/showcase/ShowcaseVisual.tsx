import { useState, type ReactNode } from 'react'
import LottiePlayer from '../LottiePlayer'
import cableAnimation from '../../../json/cableAnimation.json'
import { showcaseClipBaseUrl } from '../../../lib/runtimeEnv'
import type { PanVariant, Visual } from '../../../data/showcase'

const LOTTIE = {
  cable: cableAnimation,
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

const PAN_CLASS: Record<PanVariant, string> = {
  'in-a': 'showcase-pan-in-a',
  'in-b': 'showcase-pan-in-b',
  'out-a': 'showcase-pan-out-a',
  'out-b': 'showcase-pan-out-b',
}

function PannedImage({
  name,
  seconds,
  contain = false,
  pan = 'in-a',
}: {
  name: string
  seconds: number
  // A full-app screenshot standing in for a screencast must stay fully
  // visible rather than crop like a photo, so it gets the smaller,
  // crop-free pan instead of the regular Ken Burns sweep.
  contain?: boolean
  pan?: PanVariant
}) {
  return (
    <img
      src={assetUrl(name)}
      alt=""
      className={
        contain
          ? 'showcase-pan-contain h-full w-full object-contain'
          : `${PAN_CLASS[pan]} h-full w-full object-cover`
      }
      style={{ animationDuration: `${seconds}s` }}
    />
  )
}

// Every clip and every screenshot standing in for one is 16:9, so the frame is
// cut to that ratio instead of filling the column: a frame that fills the
// column leaves a third of its own height as bare white above and below the
// recording. Capped in width as well, so the frame clears the QR corner and
// keeps the same rect from one screencast scene to the next — that identity is
// what lets the hand-over read as a change of content rather than of picture.
function ExhibitMedia({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-10">
      <div
        className="relative w-full max-w-[68rem] rounded-[1.5rem] bg-white p-3 ring-1 ring-[#2D4A27]/10"
        style={{ boxShadow: '0 2rem 4.5rem -1.75rem rgba(45,74,39,0.4)' }}
      >
        <div className="aspect-video w-full overflow-hidden rounded-[1.05rem]">
          {children}
        </div>
      </div>
    </div>
  )
}

const logos = import.meta.glob<{ default: { src: string } }>('../../../assets/logos/*.{png,svg}', {
  eager: true,
})

const PARTNERS = [
  { file: 'progeek.svg', height: 'h-20' },
  { file: 'smarte-grenzregion.png', height: 'h-14' },
  { file: 'hochschule-flensburg.png', height: 'h-16' },
  { file: 'tbz.svg', height: 'h-14' },
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
    return (
      <ExhibitMedia>
        <PannedImage name={visual.poster} seconds={seconds} contain />
      </ExhibitMedia>
    )
  }

  return (
    <ExhibitMedia>
      <video
        src={`${showcaseClipBaseUrl()}/${visual.clip}`}
        poster={assetUrl(visual.poster)}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        // contain, not cover: a screencast is a UI recording, not a photo — a
        // crop that cuts off part of the app is a defect, not a stylistic choice.
        className="h-full w-full object-contain"
        onError={() => {
          failedClips.add(visual.clip)
          setClipFailed(true)
        }}
      />
    </ExhibitMedia>
  )
}

export default function ShowcaseVisual({ visual, seconds }: { visual: Visual; seconds: number }) {
  switch (visual.kind) {
    case 'image':
      return <PannedImage name={visual.asset} seconds={seconds} pan={visual.pan} />

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

    case 'forde':
      // Mounted once for the whole run by ShowcaseLoop, not per scene.
      return null

    case 'demo':
      // DemoScene draws its own QR code and addresses; there is no
      // per-scene media to route through this slot.
      return null
  }
}
