import { MISSING_PREFIX } from '../../i18n/resolve'

// A scene only fills the fields it needs. On a booth screen a missing key must
// disappear rather than show up as the resolver's '??key' marker.
export function optionalText(value: string): string {
  return value.startsWith(MISSING_PREFIX) ? '' : value
}
