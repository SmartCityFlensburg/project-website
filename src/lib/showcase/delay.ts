import type { CSSProperties } from 'react'

/**
 * Stagger for one element of a scene's build.
 *
 * The showcase animation classes carry `!important` so they survive the
 * reduced-motion reset, which the booth loop has no user to respect. An
 * important `animation` shorthand also declares an important `animation-delay`
 * of zero, and that beats any inline one — so every stagger set through
 * `style={{ animationDelay }}` silently did nothing. The shorthand reads this
 * custom property instead, and a custom property set inline does win.
 *
 * Counted from the end of the scene change, not from the scene boundary: the
 * layer adds the hold that lets the old picture dissolve before new text
 * arrives.
 */
export function delay(ms: number): CSSProperties {
  return { '--showcase-delay': `${ms}ms` } as CSSProperties
}

/**
 * When the build animations below this element lift off again, counted from
 * the scene's start. The layer sets it for the whole scene; a scene with its
 * own closing choreography overrides it for the part that goes early.
 */
export function outroAt(ms: number): CSSProperties {
  return { '--showcase-outro-at': `${ms}ms` } as CSSProperties
}
