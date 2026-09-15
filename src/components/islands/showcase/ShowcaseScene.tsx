import { useT } from '../../../i18n/useT'
import type { Scene } from '../../../data/showcase'

export default function ShowcaseScene({ scene }: { scene: Scene }) {
  const t = useT()
  const dark = scene.act === 'lage' || scene.act === 'fahrt'

  return (
    <div
      className="relative flex h-full w-full items-center justify-center px-24"
      style={{ color: dark ? '#E8EBCC' : '#1F1F1F' }}
    >
      <p className="font-lato text-6xl font-light">{t(`scenes.${scene.id}.statement`)}</p>
    </div>
  )
}
