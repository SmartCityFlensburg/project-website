import type { Scene } from '../../../data/showcase'
import ExhibitScene from './ExhibitScene'
import PhotoScene from './PhotoScene'
import ShowcaseVisual from './ShowcaseVisual'
import StatementScene from './StatementScene'

export default function ShowcaseScene({ scene }: { scene: Scene }) {
  const dark = scene.act === 'lage' || scene.act === 'fahrt'
  const visual = <ShowcaseVisual visual={scene.visual} seconds={scene.seconds} />

  switch (scene.layout) {
    case 'statement':
      return (
        <StatementScene scene={scene} dark={dark}>
          {visual}
        </StatementScene>
      )
    case 'exhibit':
      return (
        <ExhibitScene scene={scene} dark={dark}>
          {visual}
        </ExhibitScene>
      )
    case 'photo':
      return <PhotoScene scene={scene}>{visual}</PhotoScene>
  }
}
