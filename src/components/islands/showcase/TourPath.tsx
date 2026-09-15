import { useT } from '../../../i18n/useT'
import { showcaseScenes, STEP_ORDER } from '../../../data/showcase'
import { stepStops } from '../../../lib/showcase/timeline'

interface Props {
  progress: number
  dark: boolean
}

// Where each step's scenes actually run on the timeline, not a hand-picked
// guess: a changed scene duration moves the stop with it.
const STOP_AT = stepStops(showcaseScenes)

export default function TourPath({ progress, dark }: Props) {
  const t = useT()
  const line = dark ? '#E8EBCC40' : '#8B735540'
  const active = dark ? '#E8EBCC' : '#4C7741'
  const idle = dark ? '#E8EBCC70' : '#8B7355'

  // Wider inset than the rest of the chrome: the first station sits at the very
  // start of the line with its label centred under it, so the line needs room to
  // its left for that label to stay inside the frame.
  return (
    <div className="pointer-events-none absolute inset-x-40 bottom-16">
      <div
        className="showcase-act-fade relative h-px w-full transition-colors duration-[1200ms]"
        style={{ backgroundColor: line }}
      >
        <div
          className="showcase-act-fade absolute inset-y-0 left-0 transition-colors duration-[1200ms]"
          style={{ width: `${progress * 100}%`, backgroundColor: active }}
        />
        {STEP_ORDER.map((step) => {
          // Same source as the point's own position, so a station can never light
          // up before the point that is supposed to be reaching it.
          const done = progress >= STOP_AT[step]
          return (
            <div
              key={step}
              className="absolute -translate-x-1/2"
              style={{ left: `${STOP_AT[step] * 100}%`, top: '-4px' }}
            >
              <div
                className="h-2 w-2 rounded-full transition-colors duration-500"
                style={{ backgroundColor: done ? active : line }}
              />
              <span
                className="absolute top-4 left-1/2 -translate-x-1/2 font-lato text-xs tracking-[0.18em] whitespace-nowrap uppercase transition-colors duration-500"
                style={{ color: done ? active : idle }}
              >
                {t(`steps.${step}`)}
              </span>
            </div>
          )
        })}
        <div
          className="showcase-act-fade absolute h-3 w-3 -translate-x-1/2 rounded-full transition-colors duration-[1200ms]"
          style={{ left: `${progress * 100}%`, top: '-6px', backgroundColor: active }}
        />
      </div>
    </div>
  )
}
