import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// The booth runs unattended for a full day. A render error (a typo'd asset
// filename, a missing translation key) must not leave a white screen for the
// rest of it, so a thrown error falls back to a calm brand plate instead of a
// stack trace on the show monitor.
export default class ShowcaseBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
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
