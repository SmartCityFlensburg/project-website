export type Act = 'lage' | 'boden' | 'software' | 'fahrt'
export type Step = 'messen' | 'verstehen' | 'handeln'
export type Layout = 'statement' | 'exhibit' | 'photo'

export type Visual =
  | { kind: 'lottie'; name: 'logo' | 'cable' | 'dashboard' }
  | { kind: 'image'; asset: string }
  | { kind: 'video'; clip: string; poster: string }
  | { kind: 'tour' }
  | { kind: 'partners' }

export interface Scene {
  id: string
  act: Act
  layout: Layout
  seconds: number
  step?: Step
  /** Only the scene that opens a step carries the numbered label. */
  opensStep?: boolean
  /** Which side the visual sits on in the exhibit layout. */
  side?: 'left' | 'right'
  visual: Visual
}

// The texts live in the i18n catalogs under scenes.<id>, so both languages
// share this one running order.
export const showcaseScenes: Scene[] = [
  {
    id: 'title',
    act: 'lage',
    layout: 'statement',
    seconds: 8,
    visual: { kind: 'lottie', name: 'logo' },
  },
  {
    id: 'quote',
    act: 'lage',
    layout: 'statement',
    seconds: 10,
    visual: { kind: 'lottie', name: 'dashboard' },
  },
  {
    id: 'water',
    act: 'lage',
    layout: 'statement',
    seconds: 9,
    visual: { kind: 'lottie', name: 'dashboard' },
  },
  {
    id: 'sensor',
    act: 'boden',
    layout: 'photo',
    seconds: 10,
    step: 'messen',
    opensStep: true,
    visual: { kind: 'image', asset: 'sensor-einbau-erdbohrer.jpg' },
  },
  {
    id: 'lorawan',
    act: 'boden',
    layout: 'exhibit',
    seconds: 9,
    step: 'messen',
    side: 'right',
    visual: { kind: 'lottie', name: 'cable' },
  },
  {
    id: 'map',
    act: 'software',
    layout: 'exhibit',
    seconds: 11,
    step: 'verstehen',
    opensStep: true,
    side: 'left',
    visual: { kind: 'video', clip: 'showcase-karte.mp4', poster: 'v0.3.0-karte-uebersicht.png' },
  },
  {
    id: 'history',
    act: 'software',
    layout: 'exhibit',
    seconds: 10,
    step: 'verstehen',
    side: 'right',
    visual: { kind: 'video', clip: 'showcase-verlauf.mp4', poster: 'v0.6.0-baum-detailseite.png' },
  },
  {
    id: 'planning',
    act: 'software',
    layout: 'exhibit',
    seconds: 10,
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
    seconds: 12,
    step: 'handeln',
    side: 'right',
    visual: { kind: 'tour' },
  },
  {
    id: 'open-source',
    act: 'fahrt',
    layout: 'statement',
    seconds: 10,
    visual: { kind: 'partners' },
  },
]

export const STEP_ORDER: Step[] = ['messen', 'verstehen', 'handeln']
