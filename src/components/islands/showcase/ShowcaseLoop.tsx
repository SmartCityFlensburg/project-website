import { useEffect, useState } from 'react'
import { TranslationProvider } from '../../../i18n/TranslationProvider'
import { showcaseScenes, type Act } from '../../../data/showcase'
import { buildTimeline, sceneAt } from '../../../lib/showcase/timeline'
import ShowcaseScene from './ShowcaseScene'

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

  return (
    <TranslationProvider strings={strings}>
      <div className="relative h-full w-full overflow-hidden">
        {/* The act colour lives on its own layer and crosses over twice as slowly
            as the content, so a change of act reads as light, not as a cut. */}
        <div
          className="absolute inset-0 transition-colors duration-[1200ms]"
          style={{ backgroundColor: ACT_BACKGROUND[current.scene.act] }}
        />
        <ShowcaseScene key={current.scene.id} scene={current.scene} />
      </div>
    </TranslationProvider>
  )
}
