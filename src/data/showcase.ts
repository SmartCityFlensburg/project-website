export type Act = 'lage' | 'boden' | 'software' | 'fahrt'
export type Step = 'messen' | 'verstehen' | 'handeln'
export type Layout = 'title' | 'statement' | 'exhibit' | 'photo' | 'demo'

// The four Ken Burns directions a full-bleed photo can carry: 'in' grows the
// crop over the scene, 'out' shrinks it back toward the resting scale, and
// 'a'/'b' send the drift to opposite corners so neighbouring photo scenes
// never repeat the same move.
export type PanVariant = 'in-a' | 'in-b' | 'out-a' | 'out-b'

export type SceneId =
  | 'title'
  | 'quote'
  | 'water'
  | 'sensor'
  | 'lorawan'
  | 'map'
  | 'history'
  | 'planning'
  | 'tour'
  | 'inspection'
  | 'team'
  | 'open-source'
  | 'demo'

export type Visual =
  | { kind: 'lottie'; name: 'cable' }
  | { kind: 'image'; asset: string; pan?: PanVariant }
  | { kind: 'video'; clip: string; poster: string }
  | { kind: 'tour' }
  | { kind: 'partners' }
  | { kind: 'forde' }
  | { kind: 'demo' }

export type ChromeElement = 'logo' | 'qr' | 'tour'

export interface Scene {
  id: SceneId
  act: Act
  layout: Layout
  seconds: number
  step?: Step
  /** Only the scene that opens a step carries the numbered label. */
  opensStep?: boolean
  /**
   * Which side the visual sits on in the exhibit layout. The screencast scenes
   * all keep the same side: a frame that changes place between two consecutive
   * recordings turns the dissolve into two app windows drifting across each
   * other. The full-bleed photo scenes between the acts carry the variety.
   */
  side?: 'left' | 'right'
  /**
   * Persistent elements to hide for this scene. The closing slide replaces the
   * QR corner and tour path with its own centered call to action.
   */
  hideChrome?: ChromeElement[]
  /**
   * How the scene hands over. The default dissolves into the next scene; a
   * scene on one of the webgl canvases dips through the plate first, because
   * the canvas lies beneath every scene layer and cannot be dissolved over.
   * The title scene needs neither: its own wipe covers the harbour before it
   * ends.
   */
  exit?: 'dip'
  visual: Visual
}

// The Förde scene's camera move has to span exactly the slide it runs under, so
// both read the length from here rather than each carrying their own copy.
// Two seconds over the original 180s script: the closing wipe and the large
// wordmark take their own time rather than the harbour's reading time.
export const TITLE_SECONDS = 19

// One scene change, in order: the text lifts off `outroMs` before the scene
// ends, the picture dissolves into the next over `fadeMs` from the boundary,
// and the new text waits `enterHoldMs` after it so the two never overlap.
// Slow on purpose: the loop plays to people standing metres from the screen,
// where a snappy cut reads as nervous.
//
// A scene marked `exit: 'dip'` leaves through the plate instead: its canvas
// fades to the act colour over the scene's last `dipMs`, and the next picture
// rises out of it over the same span. A low-poly model and a photograph share
// no structure, so half of each on top of the other reads as a double
// exposure, not as a dissolve.
export const TRANSITION = {
  fadeMs: 1000,
  outroMs: 700,
  enterHoldMs: 400,
  dipMs: 800,
} as const

// The texts live in the i18n catalogs under scenes.<id>, so both languages
// share this one running order.
export const showcaseScenes: Scene[] = [
  {
    id: 'title',
    act: 'lage',
    layout: 'title',
    seconds: TITLE_SECONDS,
    // The scene ends on the pale plate with the brand alone; the corner's
    // light-on-dark type would vanish there.
    hideChrome: ['logo', 'qr', 'tour'],
    visual: { kind: 'forde' },
  },
  {
    id: 'quote',
    act: 'lage',
    layout: 'photo',
    seconds: 14,
    visual: { kind: 'image', asset: 'bewaesserung-jungbaum-tbz.jpg', pan: 'in-a' },
  },
  {
    id: 'water',
    act: 'lage',
    layout: 'photo',
    seconds: 13,
    visual: { kind: 'image', asset: 'baumscheibe-bagger-tbz.jpg', pan: 'out-b' },
  },
  {
    id: 'sensor',
    act: 'boden',
    layout: 'photo',
    seconds: 14,
    step: 'messen',
    opensStep: true,
    visual: { kind: 'image', asset: 'sensor-einbau-erdbohrer.jpg', pan: 'in-b' },
  },
  {
    id: 'lorawan',
    act: 'boden',
    layout: 'exhibit',
    seconds: 12,
    step: 'messen',
    side: 'right',
    visual: { kind: 'lottie', name: 'cable' },
  },
  {
    id: 'map',
    act: 'software',
    layout: 'exhibit',
    seconds: 14,
    step: 'verstehen',
    opensStep: true,
    side: 'right',
    visual: { kind: 'video', clip: 'showcase-karte.mp4', poster: 'v0.3.0-karte-uebersicht.png' },
  },
  {
    id: 'history',
    act: 'software',
    layout: 'exhibit',
    seconds: 14,
    step: 'verstehen',
    side: 'right',
    visual: { kind: 'video', clip: 'showcase-verlauf.mp4', poster: 'v0.6.0-baum-detailseite.png' },
  },
  {
    id: 'planning',
    act: 'software',
    layout: 'exhibit',
    seconds: 12,
    step: 'handeln',
    opensStep: true,
    side: 'right',
    visual: {
      kind: 'video',
      clip: 'showcase-einsatzplanung.mp4',
      poster: 'v0.4.0-einsatzplanung-board.png',
    },
  },
  {
    id: 'tour',
    act: 'fahrt',
    layout: 'exhibit',
    seconds: 16,
    step: 'handeln',
    side: 'right',
    exit: 'dip',
    visual: { kind: 'tour' },
  },
  {
    id: 'inspection',
    act: 'fahrt',
    layout: 'photo',
    seconds: 13,
    visual: { kind: 'image', asset: 'einsatz-jungbaum-tablet.jpg', pan: 'out-a' },
  },
  {
    id: 'team',
    act: 'fahrt',
    layout: 'photo',
    seconds: 13,
    visual: { kind: 'image', asset: 'team-progeek.jpg', pan: 'in-b' },
  },
  {
    id: 'open-source',
    act: 'fahrt',
    layout: 'statement',
    seconds: 14,
    visual: { kind: 'partners' },
  },
  {
    id: 'demo',
    act: 'fahrt',
    layout: 'demo',
    seconds: 14,
    hideChrome: ['qr', 'tour'],
    visual: { kind: 'demo' },
  },
]

export const STEP_ORDER: Step[] = ['messen', 'verstehen', 'handeln']

// The lage and fahrt acts run on the deep-green plate; boden and software on
// the light one. Shared so the persistent chrome and the scene body never
// disagree about which plate is showing.
export function isDarkAct(act: Act): boolean {
  return act === 'lage' || act === 'fahrt'
}
