import logoColor from '../../../assets/press/green-ecolution-logo-color.svg'
import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'
import { optionalText } from '../../../lib/showcase/text'
import { delay } from '../../../lib/showcase/delay'

// The Förde scene is hoisted into ShowcaseLoop so its webgl context survives
// the whole run; this layer is the type over it. The wordmark already reads
// "Smartes Grünflächenmanagement", so the headline continues that line rather
// than setting it a second time in larger letters.
// The camera gets the harbour to itself for three and a half seconds before the
// type arrives, and the build is done by about five and a half.
const MARK_AT_MS = 3500
const HEADLINE_FROM_MS = 4000
const HEADLINE_STEP_MS = 200

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
          background:
            'linear-gradient(to right, #F7F5EFF2 0%, #F7F5EFE8 42%, #F7F5EF99 72%, #F7F5EF00 100%)',
        }}
      />

      <div className="relative w-[52%] pl-24">
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
    </div>
  )
}
