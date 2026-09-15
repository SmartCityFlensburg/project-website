import { useRef } from 'react'
import { useT } from '../../../i18n/useT'
import { staticTankLevel } from '../../../data/streamletTour'
import StreamletTankGauge from '../streamlet/StreamletTankGauge'
import StreamletTour3D from '../streamlet/StreamletTour3D'

// The canvas is built once and only hidden between its slots. Tearing a webgl
// context down and up three hundred times over a fair day is the reliable way
// to crash after two hours; a small constant load is the better trade.
export default function ShowcaseTour({ shown }: { shown: boolean }) {
  const t = useT()
  // StreamletTour3D writes the tank level into this ref every frame; the
  // gauge below reads from the same element, so it moves without any state
  // of its own.
  const level = useRef<HTMLDivElement>(null)

  return (
    <div
      className="showcase-canvas-fade flex h-full w-full items-stretch gap-10 px-16 transition-opacity duration-800"
      style={{ opacity: shown ? 1 : 0 }}
      aria-hidden={!shown}
    >
      <StreamletTankGauge
        levelRef={level}
        level={staticTankLevel}
        label={t('gauge.tankLabel')}
        dark
      />
      <div className="min-w-0 flex-1">
        <StreamletTour3D isStatic={false} levelRef={level} />
      </div>
    </div>
  )
}
