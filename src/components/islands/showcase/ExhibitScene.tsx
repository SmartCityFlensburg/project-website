import type { ReactNode } from 'react'
import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'
import { optionalText } from '../../../lib/showcase/text'

interface Props {
  scene: Scene
  dark: boolean
  children?: ReactNode
}

export default function ExhibitScene({ scene, dark, children }: Props) {
  const t = useT()
  const visualFirst = scene.side !== 'right'
  const source = optionalText(t(`scenes.${scene.id}.source`))

  return (
    <div
      className={`grid h-full w-full items-center ${
        visualFirst ? 'grid-cols-[1.9fr_1fr]' : 'grid-cols-[1fr_1.9fr]'
      }`}
    >
      <div className={`h-full w-full overflow-hidden ${visualFirst ? 'order-1' : 'order-2'}`}>
        {children}
      </div>
      <div className={`px-20 ${visualFirst ? 'order-2' : 'order-1'}`}>
        {scene.opensStep && (
          <p
            className="showcase-rise font-lato text-sm font-bold tracking-[0.2em] uppercase"
            style={{ color: dark ? '#E8EBCC99' : '#4C7741' }}
          >
            {t(`scenes.${scene.id}.eyebrow`)}
          </p>
        )}
        <p
          className="showcase-rise mt-5 font-lato text-5xl leading-[1.1] font-light tracking-[-0.022em]"
          style={{ animationDelay: '80ms', color: dark ? '#E8EBCC' : '#2D4A27' }}
        >
          {t(`scenes.${scene.id}.statement`)}
        </p>
        <p
          className="showcase-rise mt-6 max-w-[46ch] font-nunito-sans text-xl leading-relaxed"
          style={{ animationDelay: '160ms', color: dark ? '#E8EBCCB0' : '#1F1F1F' }}
        >
          {t(`scenes.${scene.id}.body`)}
        </p>
        {source && (
          <p
            className="showcase-rise mt-6 font-nunito-sans text-base"
            style={{ animationDelay: '240ms', color: dark ? '#E8EBCC70' : '#8B7355' }}
          >
            {source}
          </p>
        )}
      </div>
    </div>
  )
}
