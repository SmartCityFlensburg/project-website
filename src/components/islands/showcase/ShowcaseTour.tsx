import { useRef } from 'react'
import StreamletTour3D from '../streamlet/StreamletTour3D'

// The canvas is built once and only hidden between its slots. Tearing a webgl
// context down and up three hundred times over a fair day is the reliable way
// to crash after two hours; a small constant load is the better trade.
export default function ShowcaseTour({ active }: { active: boolean }) {
  // StreamletTour3D drives a tank gauge through this ref. The booth loop shows
  // no gauge, so the ref stays empty and the component's own guard skips it.
  const unusedLevel = useRef<HTMLDivElement>(null)

  return (
    <div
      className="showcase-tour-fade h-full w-full transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0 }}
      aria-hidden={!active}
    >
      <StreamletTour3D isStatic={false} levelRef={unusedLevel} />
    </div>
  )
}
