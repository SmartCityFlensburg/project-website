import { MISSING_PREFIX } from '../../i18n/resolve'

// A scene only fills the fields it needs. On a booth screen a missing key must
// disappear rather than show up as the resolver's '??key' marker.
export function optionalText(value: string): string {
  return value.startsWith(MISSING_PREFIX) ? '' : value
}

// Keys a scene does not carry resolve to the '??key' marker. They must not reach
// the built page: check-build-output.mjs rejects them, and rightly so.
export function withoutMissing(strings: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(strings).filter(([, value]) => !value.startsWith(MISSING_PREFIX)),
  )
}
