import iconColor from '../../../assets/press/green-ecolution-icon-color.svg'
import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'
import { optionalText } from '../../../lib/showcase/text'

// The opening scene gets its own layout rather than reusing StatementScene:
// the mark stays small and off-centre instead of a large wordmark stacked
// dead-centre above a headline that repeats it word for word.
export default function TitleScene({ scene }: { scene: Scene }) {
  const t = useT()
  const body = optionalText(t(`scenes.${scene.id}.body`))

  return (
    <div className="relative flex h-full w-full flex-col justify-center px-40 pb-24">
      <img src={iconColor.src} alt="" className="showcase-rise mb-14 h-32 w-auto" />
      <p
        className="showcase-rise max-w-[900px] font-lato text-[6rem] leading-[1.05] font-light tracking-[-0.022em] text-[#E8EBCC]"
        style={{ animationDelay: '260ms' }}
      >
        {t(`scenes.${scene.id}.statement`)}
      </p>
      <div
        className="showcase-rise mt-10 h-px w-12 bg-[#E8EBCC66]"
        style={{ animationDelay: '860ms' }}
      />
      {body && (
        <p
          className="showcase-rise mt-8 font-nunito-sans text-2xl tracking-[0.01em] text-[#E8EBCCB0]"
          style={{ animationDelay: '1080ms' }}
        >
          {body}
        </p>
      )}
    </div>
  )
}
