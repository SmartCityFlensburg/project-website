import { useEffect, useState } from 'react'
import { TranslationProvider } from '../../../i18n/TranslationProvider'
import { showcaseScenes, type Act } from '../../../data/showcase'
import { buildTimeline, leavingOf, sceneAt } from '../../../lib/showcase/timeline'
import ShowcaseScene from './ShowcaseScene'
import ShowcaseTour from './ShowcaseTour'

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

  const current = sceneAt(timeline, elapsedMs)
  // The scene that just left keeps rendering until its fade is done, so the
  // change reads as a dissolve instead of a cut. Derived from the clock rather
  // than a timer: a second time source beside the loop's own would drift.
  const leaving = leavingOf(timeline, current, elapsedMs, FADE_MS)

  return (
    <TranslationProvider strings={strings}>
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
      </div>
    </TranslationProvider>
  )
}
