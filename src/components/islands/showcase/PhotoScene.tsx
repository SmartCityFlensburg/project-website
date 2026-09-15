import type { ReactNode } from 'react'
import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'
import { optionalText } from '../../../lib/showcase/text'
import { delay } from '../../../lib/showcase/delay'

export default function PhotoScene({ scene, children }: { scene: Scene; children?: ReactNode }) {
  const t = useT()
  const source = optionalText(t(`scenes.${scene.id}.source`))

  return (
    <div className="relative h-full w-full overflow-hidden">
      {children}
      {/* Sized for the tallest stack among the four photo scenes: eyebrow,
          statement, body and a source line (water carries all four). */}
      <div
        className="absolute inset-x-0 bottom-0 h-[46%]"
        style={{
          background:
            'linear-gradient(to top, rgba(45,74,39,0.98) 0%, rgba(45,74,39,0.86) 45%, rgba(45,74,39,0) 100%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 px-24 pb-20">
        {scene.opensStep && (
          <p className="showcase-rise font-lato text-sm font-bold tracking-[0.2em] text-[#E8EBCC99] uppercase">
            {t(`scenes.${scene.id}.eyebrow`)}
          </p>
        )}
        <p
          className="showcase-rise mt-4 font-lato text-6xl leading-[1.08] font-light tracking-[-0.022em] text-[#E8EBCC]"
          style={delay(80)}
        >
          {t(`scenes.${scene.id}.statement`)}
        </p>
        <p
          className="showcase-rise mt-5 max-w-[60ch] font-nunito-sans text-xl leading-relaxed text-[#E8EBCCB0]"
          style={delay(160)}
        >
          {t(`scenes.${scene.id}.body`)}
        </p>
        {source && (
          <p
            className="showcase-rise mt-5 font-nunito-sans text-base text-[#E8EBCC70]"
            style={delay(240)}
          >
            {source}
          </p>
        )}
      </div>
    </div>
  )
}
