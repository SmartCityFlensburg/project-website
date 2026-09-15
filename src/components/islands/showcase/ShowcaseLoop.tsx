import { useEffect, useState } from 'react'
import { TranslationProvider } from '../../../i18n/TranslationProvider'
import { showcaseScenes, type Act } from '../../../data/showcase'
import {
  buildTimeline,
  leavingOf,
  loopProgress,
  reachedSteps,
  sceneAt,
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
  const dark = current.scene.act === 'lage' || current.scene.act === 'fahrt'

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The act colour lives on its own layer and crosses over twice as slowly
          as the content, so a change of act reads as light, not as a cut. */}
      <div
        className="absolute inset-0 transition-colors duration-[1200ms]"
        style={{ backgroundColor: ACT_BACKGROUND[current.scene.act] }}
      />
      <div className="absolute inset-y-0 right-0 w-[65.5%]">
        <ShowcaseTour active={current.scene.visual.kind === 'tour'} />
      </div>
      <div className="absolute inset-0">
        {leaving && (
          <div key={`${leaving.scene.id}-out`} className="showcase-sink absolute inset-0">
            <ShowcaseScene scene={leaving.scene} />
          </div>
        )}
        <div key={current.scene.id} className="absolute inset-0">
          <ShowcaseScene scene={current.scene} />
        </div>
      </div>

      <img
        src={dark ? logoWhite.src : logoColor.src}
        alt=""
        className="absolute top-10 left-24 h-10"
      />

      <div className="absolute right-24 bottom-24 flex items-center gap-4">
        <div className="text-right">
          <p
            className="font-lato text-sm tracking-[0.16em] uppercase"
            style={{ color: dark ? '#E8EBCC99' : '#8B7355' }}
          >
            {t('demo.label')}
          </p>
          <p className="font-nunito-sans text-base" style={{ color: dark ? '#E8EBCC' : '#2D4A27' }}>
            {t('demo.url')}
          </p>
        </div>
        <img
          src="/assets/showcase/qr-demo.svg"
          alt=""
          className="h-24 w-24 rounded bg-white p-1.5"
        />
      </div>

      <TourPath
        progress={loopProgress(showcaseScenes, elapsedMs)}
        reached={reachedSteps(showcaseScenes, elapsedMs)}
        dark={dark}
      />
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
