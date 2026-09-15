import { useT } from '../../../i18n/useT'
import { STEP_ORDER, type Step } from '../../../data/showcase'

interface Props {
  progress: number
  dark: boolean
}

// The three stops sit where their scenes run, not at even thirds: the point has
// to arrive at a stop while that step is on screen.
const STOP_AT: Record<Step, number> = {
  messen: 0.3,
  verstehen: 0.52,
  handeln: 0.76,
}

export default function TourPath({ progress, dark }: Props) {
  const t = useT()
  const line = dark ? '#E8EBCC40' : '#8B735540'
  const active = dark ? '#E8EBCC' : '#4C7741'
  const idle = dark ? '#E8EBCC70' : '#8B7355'

  return (
    <div className="pointer-events-none absolute inset-x-24 bottom-10">
      <div className="relative h-px w-full" style={{ backgroundColor: line }}>
        <div
          className="absolute inset-y-0 left-0"
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
          className="absolute h-3 w-3 -translate-x-1/2 rounded-full"
          style={{ left: `${progress * 100}%`, top: '-6px', backgroundColor: active }}
        />
      </div>
    </div>
  )
}
