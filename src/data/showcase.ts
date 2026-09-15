export type Act = 'lage' | 'boden' | 'software' | 'fahrt'
export type Step = 'messen' | 'verstehen' | 'handeln'
export type Layout = 'statement' | 'exhibit' | 'photo' | 'demo'

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
  | { kind: 'image'; asset: string }
  | { kind: 'video'; clip: string; poster: string }
  | { kind: 'tour' }
  | { kind: 'partners' }
  | { kind: 'wordmark' }
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
  /** Which side the visual sits on in the exhibit layout. */
  side?: 'left' | 'right'
  /**
   * Persistent elements to hide for this scene. The title replaces the small
   * corner logo with its own large one; the closing slide replaces the QR
   * corner and tour path with its own centered call to action.
   */
  hideChrome?: ChromeElement[]
  visual: Visual
}

// The texts live in the i18n catalogs under scenes.<id>, so both languages
// share this one running order.
export const showcaseScenes: Scene[] = [
  {
    id: 'title',
    act: 'software',
    layout: 'statement',
    seconds: 12,
    hideChrome: ['logo'],
    visual: { kind: 'wordmark' },
  },
  {
    id: 'quote',
    act: 'lage',
    layout: 'photo',
    seconds: 14,
    visual: { kind: 'image', asset: 'bewaesserung-jungbaum-tbz.jpg' },
  },
  {
    id: 'water',
    act: 'lage',
    layout: 'photo',
    seconds: 13,
    visual: { kind: 'image', asset: 'baumscheibe-bagger-tbz.jpg' },
  },
  {
    id: 'sensor',
    act: 'boden',
    layout: 'photo',
    seconds: 14,
    step: 'messen',
    opensStep: true,
    visual: { kind: 'image', asset: 'sensor-einbau-erdbohrer.jpg' },
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
    side: 'left',
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
    side: 'left',
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
    visual: { kind: 'tour' },
  },
  {
    id: 'inspection',
    act: 'fahrt',
    layout: 'photo',
    seconds: 13,
    visual: { kind: 'image', asset: 'einsatz-jungbaum-tablet.jpg' },
  },
  {
    id: 'team',
    act: 'fahrt',
    layout: 'photo',
    seconds: 13,
    visual: { kind: 'image', asset: 'team-progeek.jpg' },
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
    seconds: 19,
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
