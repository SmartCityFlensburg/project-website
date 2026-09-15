import logoColor from '../../../assets/press/green-ecolution-logo-color.svg'
import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'
import { optionalText } from '../../../lib/showcase/text'
import { delay, outroAt } from '../../../lib/showcase/delay'

// The Förde scene is hoisted into ShowcaseLoop so its webgl context survives
// the whole run; this layer is the type over it. The wordmark already reads
// "Smartes Grünflächenmanagement", so the headline continues that line rather
// than setting it a second time in larger letters.
//
// The scene closes in three beats rather than cutting away from the harbour:
// the type lifts off, the pale ground it stood on sweeps right across the
// whole frame, and the brand rises large on the cleared plate. The plate then
// dissolves into the first photo with the rest of the layer.
const MARK_AT_MS = 3500
const HEADLINE_FROM_MS = 4000
const HEADLINE_STEP_MS = 200
const LIFT_AT_MS = 12500
const WIPE_AT_MS = 13200
const BRAND_AT_MS = 14600

const GROUND = '#F7F5EF'

export default function TitleScene({ scene }: { scene: Scene }) {
  const t = useT()
  const lines = t(`scenes.${scene.id}.statement`).split('\n')
  const tagline = optionalText(t(`scenes.${scene.id}.body`))
  const ruleAtMs = HEADLINE_FROM_MS + lines.length * HEADLINE_STEP_MS + 300

  return (
    <div className="relative flex h-full w-full items-center">
      {/* The type spans pale sky and dark water, so it carries its own ground
          rather than depending on what the camera happens to be over. It fades
          in just ahead of the wordmark: the harbour should be seen unveiled
          first, and a scrim with nothing on it only looks like haze. */}
      <div
        className="showcase-veil absolute inset-y-0 left-0 w-[62%]"
        style={{
          ...delay(MARK_AT_MS - 300),
          background: `linear-gradient(to right, ${GROUND}F2 0%, ${GROUND}E8 42%, ${GROUND}99 72%, ${GROUND}00 100%)`,
        }}
      />

      <div className="relative w-[52%] pl-24" style={outroAt(LIFT_AT_MS)}>
        <img
          src={logoColor.src}
          alt=""
          className="showcase-rise mb-12 h-16 w-auto"
          style={delay(MARK_AT_MS)}
        />

        <h1 className="font-lato text-[5rem] leading-[1.06] font-light tracking-[-0.024em] text-[#2D4A27]">
          {lines.map((line, index) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <span
                className="showcase-unmask block"
                style={delay(HEADLINE_FROM_MS + index * HEADLINE_STEP_MS)}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        <div
          className="showcase-rule-draw mt-10 h-px w-16 bg-[#8B735599]"
          style={delay(ruleAtMs)}
        />

        {tagline && (
          <p className="mt-8 font-nunito-sans text-2xl tracking-[0.01em] text-[#8B7355]">
            {tagline.split(' ').map((word, index) => (
              <span
                key={word}
                className="showcase-rise mr-[0.35em] inline-block"
                style={delay(ruleAtMs + 240 + index * 190)}
              >
                {word}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Wider than the frame so its feathered right edge has left the screen
          by the time it comes to rest, and the plate is solid under the brand. */}
      <div
        className="showcase-wipe absolute inset-y-0 left-0 w-[140%]"
        style={{
          ...delay(WIPE_AT_MS),
          background: `linear-gradient(to right, ${GROUND} 0%, ${GROUND} 72%, ${GROUND}00 100%)`,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={logoColor.src}
          alt=""
          className="showcase-emerge h-44 w-auto"
          style={delay(BRAND_AT_MS)}
        />
      </div>
    </div>
  )
}
