import { useCallback, useEffect, useRef, useState } from 'react'
import { seekScene } from './clock'
import type { TimelineEntry } from './timeline'

// Frame deltas rather than `now - started`: a clock that can be paused or moved
// has no fixed origin to subtract from, and resuming against the old one would
// hand the loop every millisecond it stood still.
export function useShowcaseClock(timeline: TimelineEntry[]): number {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [paused, setPaused] = useState(false)
  const elapsed = useRef(0)

  useEffect(() => {
    if (paused) {
      return
    }

    let previous = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      elapsed.current += now - previous
      previous = now
      setElapsedMs(elapsed.current)
      frame = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(frame)
  }, [paused])

  const seek = useCallback(
    (offset: -1 | 0 | 1) => {
      elapsed.current = seekScene(timeline, elapsed.current, offset)
      setElapsedMs(elapsed.current)
    },
    [timeline],
  )

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      switch (event.key) {
        case ' ':
          setPaused((wasPaused) => !wasPaused)
          break
        case 'ArrowRight':
          seek(1)
          break
        case 'ArrowLeft':
          seek(-1)
          break
        case 'r':
        case 'R':
          seek(0)
          break
        default:
          return
      }

      // Space scrolls the page, the arrows scroll it sideways.
      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [seek])

  return elapsedMs
}
