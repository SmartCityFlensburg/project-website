import type { CSSProperties } from 'react'
import { TranslationProvider } from '../../../i18n/TranslationProvider'
import {
  isDarkAct,
  showcaseScenes,
  TRANSITION,
  type Act,
  type ChromeElement,
  type Scene,
} from '../../../data/showcase'
import {
  buildTimeline,
  inLastMs,
  leavingOf,
  previousOf,
  sceneAt,
  stepProgress,
  type TimelineEntry,
} from '../../../lib/showcase/timeline'
import { useShowcaseClock } from '../../../lib/showcase/useShowcaseClock'
import { useT } from '../../../i18n/useT'
import logoColor from '../../../assets/press/green-ecolution-logo-color.svg'
import logoWhite from '../../../assets/press/green-ecolution-logo-white.svg'
import ShowcaseBoundary from './ShowcaseBoundary'
import ShowcaseScene from './ShowcaseScene'
import FordeScene3D from './FordeScene3D'
import ShowcaseTour from './ShowcaseTour'
import TourPath from './TourPath'

interface Props {
  strings: Record<string, string>
}

const ACT_BACKGROUND: Record<Act, string> = {
  lage: '#2D4A27',
  boden: '#F7F5EF',
  software: '#F7F5EF',
  fahrt: '#2D4A27',
}

const timeline = buildTimeline(showcaseScenes)

// Read by the scene's build animations through inherited custom properties.
// Constant for the scene's lifetime on purpose: a delay that changes under a
// running css animation makes it jump. A scene that dips lifts its text before
// the canvas goes, so the model stands bare for a beat.
function layerTiming(scene: Scene): CSSProperties {
  const dip = scene.exit === 'dip' ? TRANSITION.dipMs : 0
  return {
    '--showcase-layer-delay': `${TRANSITION.enterHoldMs}ms`,
    '--showcase-outro-at': `${scene.seconds * 1000 - dip - TRANSITION.outroMs}ms`,
  } as CSSProperties
}

function layerClass(isLeaving: boolean, entersFromPlate: boolean): string {
  if (isLeaving) {
    return 'showcase-leave absolute inset-0'
  }
  return entersFromPlate ? 'showcase-enter absolute inset-0' : 'absolute inset-0'
}

// Which webgl canvas is on screen: a canvas is shown while its scene runs,
// minus the dip at the end for a scene that leaves that way.
function canvasOnScreen(current: TimelineEntry, elapsedMs: number): 'forde' | 'tour' | null {
  const kind = current.scene.visual.kind
  if (kind !== 'forde' && kind !== 'tour') {
    return null
  }
  const dipping =
    current.scene.exit === 'dip' && inLastMs(timeline, current, elapsedMs, TRANSITION.dipMs)
  return dipping ? null : kind
}

function LoopBody({ elapsedMs }: { elapsedMs: number }) {
  const t = useT()
  const current = sceneAt(timeline, elapsedMs)
  // The scene that just left keeps rendering until its fade is done, so the
  // change reads as a dissolve instead of a cut. Derived from the clock rather
  // than a timer: a second time source beside the loop's own would drift.
  const leaving = leavingOf(timeline, current, elapsedMs, TRANSITION.fadeMs)
  const dark = isDarkAct(current.scene.act)
  // The photo layout lays its own deep-green scrim over the lower third and
  // fills the frame with a dark photograph, so the persistent elements follow
  // the scene, not the act it belongs to.
  const onDarkPlate = dark || current.scene.layout === 'photo'
  // The new scene lies complete beneath the old one from its first frame and
  // the old one dissolves on top: at the midpoint the frame is half old, half
  // new picture, never half plate. A scene following a dip instead rises out
  // of the plate the canvas has just gone into. Decided from the running order
  // rather than from `leaving`, which goes away mid-scene and would strip the
  // class from under a finished animation.
  const entersFromPlate = previousOf(timeline, current).scene.exit === 'dip'
  const shownCanvas = canvasOnScreen(current, elapsedMs)
  // Faded, not unmounted: a corner that pops in at a scene boundary is the
  // one cut left in a loop that otherwise dissolves everything.
  const hiddenChrome = new Set(current.scene.hideChrome ?? [])
  // The tour path belongs to the three steps and to nothing else. On the
  // harbour, the photographs and the closing slide there is no step to be at,
  // so it fades out rather than parking its point past the last station.
  if (!current.scene.step) {
    hiddenChrome.add('tour')
  }
  const chromeFade = (element: ChromeElement): CSSProperties => ({
    opacity: hiddenChrome.has(element) ? 0 : 1,
  })

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The act colour lives on its own layer and crosses over twice as slowly
          as the content, so a change of act reads as light, not as a cut. */}
      <div
        className="showcase-act-fade absolute inset-0 transition-colors duration-[1200ms]"
        style={{ backgroundColor: ACT_BACKGROUND[current.scene.act] }}
      />
      <FordeScene3D shown={shownCanvas === 'forde'} />
      <div className="absolute inset-y-0 right-0 w-[65.5%]">
        <ShowcaseTour shown={shownCanvas === 'tour'} />
      </div>
      {/* One keyed array, not two slots: React matches array children by key,
          so the node a scene built in as current is the very node that leaves.
          The video, Ken Burns pan and Lottie play on from where they were
          instead of restarting at the hand-off. Order is paint order, so the
          leaving layer comes last and dissolves on top. */}
      <div className="absolute inset-0">
        {[current, leaving]
          .filter((entry): entry is TimelineEntry => entry !== null)
          .map((entry) => (
            <div
              key={entry.scene.id}
              className={layerClass(entry === leaving, entersFromPlate)}
              style={layerTiming(entry.scene)}
            >
              <ShowcaseScene scene={entry.scene} />
            </div>
          ))}
      </div>

      {/* A plain src swap cuts the moment the plate changes, while the
          background behind it is still 1200ms into its own crossfade — worst
          case a white logo lands on a still-white background. Two stacked
          images crossfading on the same clock keep the logo in step with it. */}
      <div
        className="showcase-act-fade absolute top-10 left-24 transition-opacity duration-[1200ms]"
        style={chromeFade('logo')}
      >
        {/* The colour mark stays in flow and gives the box its width. Stacking
            both absolutely collapses the box to nothing, and preflight's
            max-width: 100% then takes the artwork down with it. */}
        <img
          src={logoColor.src}
          alt=""
          className="showcase-act-fade block h-10 w-auto transition-opacity duration-[1200ms]"
          style={{ opacity: onDarkPlate ? 0 : 1 }}
        />
        <img
          src={logoWhite.src}
          alt=""
          className="showcase-act-fade absolute top-0 left-0 h-10 w-auto transition-opacity duration-[1200ms]"
          style={{ opacity: onDarkPlate ? 1 : 0 }}
        />
      </div>

      <div
        className="showcase-act-fade absolute right-24 bottom-24 flex items-center gap-4 transition-opacity duration-[1200ms]"
        style={chromeFade('qr')}
      >
        <div className="text-right">
          <p
            className="showcase-act-fade font-lato text-sm tracking-[0.16em] uppercase transition-colors duration-[1200ms]"
            style={{ color: onDarkPlate ? '#E8EBCC99' : '#8B7355' }}
          >
            {t('demo.label')}
          </p>
          <p
            className="showcase-act-fade font-nunito-sans text-base transition-colors duration-[1200ms]"
            style={{ color: onDarkPlate ? '#E8EBCC' : '#2D4A27' }}
          >
            {t('demo.url')}
          </p>
        </div>
        <img
          src="/assets/showcase/qr-demo.svg"
          alt=""
          className="h-24 w-24 rounded bg-white p-1.5 ring-1 ring-black/10"
        />
      </div>

      <div
        className="showcase-act-fade transition-opacity duration-[1200ms]"
        style={chromeFade('tour')}
      >
        <TourPath progress={stepProgress(showcaseScenes, elapsedMs)} dark={onDarkPlate} />
      </div>
    </div>
  )
}

export default function ShowcaseLoop({ strings }: Props) {
  const elapsedMs = useShowcaseClock(timeline)

  return (
    <ShowcaseBoundary sceneId={sceneAt(timeline, elapsedMs).scene.id}>
      <TranslationProvider strings={strings}>
        <LoopBody elapsedMs={elapsedMs} />
      </TranslationProvider>
    </ShowcaseBoundary>
  )
}
