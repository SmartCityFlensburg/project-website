import type { RefObject } from 'react'
import { useT } from '../../../i18n/useT'

interface StreamletTankGaugeProps {
  levelRef: RefObject<HTMLDivElement | null>
  level: number
  // Overrides the label read from the streamlet i18n namespace. Callers
  // outside that namespace (the showcase loop) pass their own translation.
  label?: string
  // The website hero sits on a light background; the showcase tour scene
  // runs on the dark plate, where the light-mode track and label would be
  // nearly invisible.
  dark?: boolean
}

function StreamletTankGauge({ levelRef, level, label, dark = false }: StreamletTankGaugeProps) {
  const t = useT()
  const displayLabel = label ?? t('hero.tank')

  return (
    <div className="flex w-8 shrink-0 flex-col items-center justify-center gap-2 lg:w-10">
      <span
        className={`text-xxs font-semibold uppercase tracking-wide ${
          dark ? 'text-[#E8EBCC]/70' : 'text-grey-900/45'
        }`}
      >
        {displayLabel}
      </span>

      <div
        className={`relative h-1/2 max-h-64 w-3.5 overflow-hidden rounded-full ${
          dark ? 'bg-[#E8EBCC]/15' : 'bg-green-dark-900/10'
        }`}
      >
        <div
          ref={levelRef}
          className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-full bg-green-light-900"
          style={{ transform: `scaleY(${level})` }}
        />
      </div>
    </div>
  )
}

export default StreamletTankGauge
