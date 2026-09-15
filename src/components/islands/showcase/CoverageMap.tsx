import type { CSSProperties } from 'react'
import { COVERAGE_TIMING, coverage, ignitionDelayMs } from '../../../data/showcaseCoverage'
import { delay } from '../../../lib/showcase/delay'

const COAST = '#2D4A27'
const CELL = '#4C7741'
/** The brand's lime, the one warm note on a slide that is otherwise all green. */
const ANCHOR = '#ACB63B'

// Read by the animation classes in motion.css. Set once here so the durations
// have a single home next to the delays they are timed against, and inherited
// down to all three hundred and sixty gateways from the one element.
const durations = {
  '--showcase-coast-duration': `${COVERAGE_TIMING.coastMs}ms`,
  '--showcase-cell-duration': `${COVERAGE_TIMING.cellMs}ms`,
  '--showcase-gateway-duration': `${COVERAGE_TIMING.gatewayMs}ms`,
} as CSSProperties

const LAND = 'showcase-coverage-land'

/**
 * Schleswig-Holstein filling in with the state's LoRaWAN network: the coast
 * draws itself, then the gateways come up from the Elbe northwards and their
 * cells overlap into one field. Flensburg sets itself apart at the end, where
 * the fill has just arrived.
 *
 * The cells are clipped to the land. Radio does not stop at a border, but an
 * unclipped field softens the silhouette until the state is no longer the
 * thing on screen, and the state is the point.
 */
export default function CoverageMap() {
  const [anchorX, anchorY] = coverage.anchor

  return (
    // Bottom-heavy on purpose: the map is the only visual that reaches the
    // corner the QR code stands in, and the state's south-eastern tip lands
    // exactly on the demo address. The padding is what keeps that corner clear.
    <div className="showcase-media-out flex h-full w-full items-center justify-center px-14 pt-14 pb-56">
      <svg
        viewBox={coverage.viewBox.join(' ')}
        className="h-full w-full"
        aria-hidden="true"
        style={durations}
      >
        <defs>
          <clipPath id={LAND}>
            {coverage.outline.map((d) => (
              <path key={d} d={d} />
            ))}
          </clipPath>
        </defs>

        <g clipPath={`url(#${LAND})`} fill={CELL} fillOpacity={0.13}>
          {coverage.points.map(([x, y]) => (
            <circle
              key={`${x},${y}`}
              className="showcase-cell"
              cx={x}
              cy={y}
              r={COVERAGE_TIMING.cellRadius}
              style={delay(ignitionDelayMs(x, y))}
            />
          ))}
        </g>

        <g fill="none" stroke={COAST} strokeWidth={2.2} strokeLinejoin="round">
          {coverage.outline.map((d) => (
            <path key={d} className="showcase-coast" d={d} pathLength={1} />
          ))}
        </g>

        <g fill={COAST}>
          {coverage.points.map(([x, y]) => (
            <circle
              key={`${x},${y}`}
              className="showcase-gateway"
              cx={x}
              cy={y}
              r={3.2}
              style={delay(ignitionDelayMs(x, y))}
            />
          ))}
        </g>

        <g style={delay(COVERAGE_TIMING.anchorAtMs)}>
          <circle
            className="showcase-anchor-ping"
            cx={anchorX}
            cy={anchorY}
            r={46}
            fill="none"
            stroke={ANCHOR}
            strokeWidth={3}
          />
          <circle
            className="showcase-gateway"
            cx={anchorX}
            cy={anchorY}
            r={9}
            fill={ANCHOR}
            stroke={COAST}
            strokeWidth={2.5}
          />
        </g>
      </svg>
    </div>
  )
}
