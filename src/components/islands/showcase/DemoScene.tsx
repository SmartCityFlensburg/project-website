import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'

// Same address as PressContact.astro / ContactSection.astro. Not in a locale
// catalog: an email address needs no translation.
const CONTACT_EMAIL = 'info@green-ecolution.de'

export default function DemoScene({ scene }: { scene: Scene }) {
  const t = useT()

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-40 text-center">
      <p
        className="showcase-rise font-lato text-[5.5rem] leading-[1.05] font-light tracking-[-0.022em]"
        style={{ color: '#E8EBCC' }}
      >
        {t(`scenes.${scene.id}.statement`)}
      </p>
      <p
        className="showcase-rise mt-8 max-w-[52ch] font-nunito-sans text-2xl leading-relaxed"
        style={{ animationDelay: '80ms', color: '#E8EBCCB0' }}
      >
        {t(`scenes.${scene.id}.body`)}
      </p>
      <img
        src="/assets/showcase/qr-demo.svg"
        alt=""
        className="showcase-rise mt-12 h-64 w-64 rounded-lg bg-white p-4 ring-1 ring-black/10"
        style={{ animationDelay: '160ms' }}
      />
      <div
        className="showcase-rise mt-10 flex flex-col items-center gap-2"
        style={{ animationDelay: '240ms' }}
      >
        <p
          className="font-lato text-3xl font-light tracking-[-0.022em]"
          style={{ color: '#E8EBCC' }}
        >
          {t('demo.url')}
        </p>
        <p className="font-nunito-sans text-lg" style={{ color: '#E8EBCC99' }}>
          {t('scenes.demo.siteUrl')}
        </p>
        <p className="font-nunito-sans text-base" style={{ color: '#E8EBCC70' }}>
          {CONTACT_EMAIL}
        </p>
      </div>
    </div>
  )
}
