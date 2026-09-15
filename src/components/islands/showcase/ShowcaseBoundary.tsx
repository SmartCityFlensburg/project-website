import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { SceneId } from '../../../data/showcase'

interface Props {
  sceneId: SceneId
  children: ReactNode
}

interface State {
  hasError: boolean
  sceneId: SceneId
}

// The booth runs unattended for a full day. A render error (a typo'd asset
// filename, a missing translation key) must not leave a white screen for the
// rest of it, so a thrown error falls back to a calm brand plate instead of a
// stack trace on the show monitor. The loop keeps ticking behind the fallback,
// so once it reaches a new scene the failing render is behind it too — the
// fallback clears itself instead of sitting there for the rest of the day.
export default class ShowcaseBoundary extends Component<Props, State> {
  state: State = { hasError: false, sceneId: this.props.sceneId }

  static getDerivedStateFromError(): Pick<State, 'hasError'> {
    return { hasError: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.sceneId === state.sceneId) {
      return null
    }
    return { hasError: false, sceneId: props.sceneId }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ShowcaseLoop crashed', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ backgroundColor: '#2D4A27' }}
        >
          <p className="font-lato text-5xl font-light tracking-[-0.022em] text-[#E8EBCC]">
            Green Ecolution
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
