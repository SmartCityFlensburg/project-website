import { memo } from 'react'
import { isDarkAct, type Scene } from '../../../data/showcase'
import DemoScene from './DemoScene'
import ExhibitScene from './ExhibitScene'
import PhotoScene from './PhotoScene'
import ShowcaseVisual from './ShowcaseVisual'
import StatementScene from './StatementScene'
import TitleScene from './TitleScene'

// scene only changes ten times per 99s loop and is a stable reference from
// the module-level showcaseScenes array, but the loop clock re-renders its
// parent at ~60fps; memo keeps that tick from cascading into every scene.
function ShowcaseScene({ scene }: { scene: Scene }) {
  const dark = isDarkAct(scene.act)
  const visual = <ShowcaseVisual visual={scene.visual} seconds={scene.seconds} />

  switch (scene.layout) {
    case 'title':
      return <TitleScene scene={scene} />
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
    case 'demo':
      return <DemoScene scene={scene} />
  }
}

export default memo(ShowcaseScene)
