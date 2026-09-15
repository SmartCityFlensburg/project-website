import { useEffect, useState } from 'react'
import { TranslationProvider } from '../../../i18n/TranslationProvider'
import { isDarkAct, showcaseScenes, type Act } from '../../../data/showcase'
import {
  buildTimeline,
  leavingOf,
  loopProgress,
  sceneAt,
  type TimelineEntry,
} from '../../../lib/showcase/timeline'
import { useT } from '../../../i18n/useT'
import logoColor from '../../../assets/press/green-ecolution-logo-color.svg'
import logoWhite from '../../../assets/press/green-ecolution-logo-white.svg'
import ShowcaseBoundary from './ShowcaseBoundary'
import ShowcaseScene from './ShowcaseScene'
import ShowcaseTour from './ShowcaseTour'
import TourPath from './TourPath'

interface Props {
  language: string
  strings: Record<string, string>
}

const ACT_BACKGROUND: Record<Act, string> = {
  lage: '#2D4A27',
  boden: '#F7F5EF',
  software: '#FFFFFF',
  fahrt: '#2D4A27',
}

const FADE_MS = 600

const timeline = buildTimeline(showcaseScenes)

function LoopBody({ elapsedMs }: { elapsedMs: number }) {
  const t = useT()
  const current = sceneAt(timeline, elapsedMs)
  // The scene that just left keeps rendering until its fade is done, so the
  // change reads as a dissolve instead of a cut. Derived from the clock rather
  // than a timer: a second time source beside the loop's own would drift.
  const leaving = leavingOf(timeline, current, elapsedMs, FADE_MS)
  const dark = isDarkAct(current.scene.act)
  // The photo layout lays its own deep-green scrim over the lower third and
  // fills the frame with a dark photograph, so the persistent elements follow
  // the scene, not the act it belongs to.
  const onDarkPlate = dark || current.scene.layout === 'photo'
  // Keyed by scene id and filtered rather than the previous `key={id + '-out'}`
  // vs `key={id}` pair: those never matched, so React tore the leaving layer
  // down and remounted it fresh on every crossfade. Keeping the id stable
  // across the hand-off lets the video, Ken Burns pan and Lottie keep playing
  // from where they were instead of restarting.
  const layers = [leaving, current].filter((entry): entry is TimelineEntry => entry !== null)

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The act colour lives on its own layer and crosses over twice as slowly
          as the content, so a change of act reads as light, not as a cut. */}
      <div
        className="showcase-act-fade absolute inset-0 transition-colors duration-[1200ms]"
        style={{ backgroundColor: ACT_BACKGROUND[current.scene.act] }}
      />
      <div className="absolute inset-y-0 right-0 w-[65.5%]">
        <ShowcaseTour active={current.scene.visual.kind === 'tour'} />
      </div>
      <div className="absolute inset-0">
        {layers.map((entry) => (
          <div
            key={entry.scene.id}
            className={entry === leaving ? 'showcase-sink absolute inset-0' : 'absolute inset-0'}
          >
            <ShowcaseScene scene={entry.scene} />
          </div>
        ))}
      </div>

      {/* A plain src swap cuts the moment the plate changes, while the
          background behind it is still 1200ms into its own crossfade — worst
          case a white logo lands on a still-white background. Two stacked
          images crossfading on the same clock keep the logo in step with it. */}
      <div className="absolute top-10 left-24 h-10">
        <img
          src={logoColor.src}
          alt=""
          className="showcase-act-fade absolute top-0 left-0 h-10 transition-opacity duration-[1200ms]"
          style={{ opacity: onDarkPlate ? 0 : 1 }}
        />
        <img
          src={logoWhite.src}
          alt=""
          className="showcase-act-fade absolute top-0 left-0 h-10 transition-opacity duration-[1200ms]"
          style={{ opacity: onDarkPlate ? 1 : 0 }}
        />
      </div>

      <div className="absolute right-24 bottom-24 flex items-center gap-4">
        <div className="text-right">
          <p
            className="showcase-act-fade font-lato text-sm tracking-[0.16em] uppercase transition-colors duration-[1200ms]"
            style={{ color: onDarkPlate ? '#E8EBCC99' : '#8B7355' }}
          >
            {t('demo.label')}
          </p>
          <p
            className="showcase-act-fade font-nunito-sans text-base transition-colors duration-[1200ms]"
            style={{ color: onDarkPlate ? '#E8EBCC' : '#2D4A27' }}
          >
            {t('demo.url')}
          </p>
        </div>
        <img
          src="/assets/showcase/qr-demo.svg"
          alt=""
          className="h-24 w-24 rounded bg-white p-1.5 ring-1 ring-black/10"
        />
      </div>

      <TourPath progress={loopProgress(showcaseScenes, elapsedMs)} dark={onDarkPlate} />
    </div>
  )
}

export default function ShowcaseLoop({ strings }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const started = performance.now()
    let frame = 0

    const tick = (now: number) => {
      setElapsedMs(now - started)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <ShowcaseBoundary>
      <TranslationProvider strings={strings}>
        <LoopBody elapsedMs={elapsedMs} />
      </TranslationProvider>
    </ShowcaseBoundary>
  )
}
