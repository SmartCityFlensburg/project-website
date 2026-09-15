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
 */
export function delay(ms: number): CSSProperties {
  return { '--showcase-delay': `${ms}ms` } as CSSProperties
}
