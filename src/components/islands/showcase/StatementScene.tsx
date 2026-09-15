import type { ReactNode } from 'react'
import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'
import { optionalText } from '../../../lib/showcase/text'

interface Props {
  scene: Scene
  dark: boolean
  children?: ReactNode
}

export default function StatementScene({ scene, dark, children }: Props) {
  const t = useT()
  const body = optionalText(t(`scenes.${scene.id}.body`))
  const source = optionalText(t(`scenes.${scene.id}.source`))

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-40 text-center">
      {children}
      <p
        className="showcase-rise font-lato text-[5.5rem] leading-[1.05] font-light tracking-[-0.022em]"
        style={{ color: dark ? '#E8EBCC' : '#2D4A27' }}
      >
        {t(`scenes.${scene.id}.statement`)}
      </p>
      <div
        className="showcase-rise mt-8 h-px w-12"
        style={{ animationDelay: '80ms', backgroundColor: dark ? '#E8EBCC66' : '#8B735566' }}
      />
      {body && (
        <p
          className="showcase-rise mt-8 max-w-[52ch] font-nunito-sans text-2xl leading-relaxed"
          style={{ animationDelay: '160ms', color: dark ? '#E8EBCCB0' : '#1F1F1F' }}
        >
          {body}
        </p>
      )}
      {source && (
        <p
          className="showcase-rise mt-6 font-nunito-sans text-base"
          style={{ animationDelay: '240ms', color: dark ? '#E8EBCC70' : '#8B7355' }}
        >
          {source}
        </p>
      )}
    </div>
  )
}
