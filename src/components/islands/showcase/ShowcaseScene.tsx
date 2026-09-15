import type { Scene } from '../../../data/showcase'
import ExhibitScene from './ExhibitScene'
import PhotoScene from './PhotoScene'
import StatementScene from './StatementScene'

export default function ShowcaseScene({ scene }: { scene: Scene }) {
  const dark = scene.act === 'lage' || scene.act === 'fahrt'

  switch (scene.layout) {
    case 'statement':
      return <StatementScene scene={scene} dark={dark} />
    case 'exhibit':
      return <ExhibitScene scene={scene} dark={dark} />
    case 'photo':
      return <PhotoScene scene={scene} />
  }
}
