// Matches the marker form exactly (mirrors MISSING_KEY in
// scripts/check-build-output.mjs and MISSING_PREFIX in src/i18n/resolve.ts),
// not just a leading '??': the island is client:only, so scene text never
// reaches the static HTML that script scans. A catalog string that happens to
// start with '??' would be silently swallowed here and never caught by the
// build check. Segments allow '-' alongside word characters because scene ids
// are kebab-case ('open-source').
const MISSING_MARKER = /^\?\?[\w-]+(?:\.[\w-]+)*$/

function isMissingMarker(value: string): boolean {
  return MISSING_MARKER.test(value)
}

// A scene only fills the fields it needs. On a booth screen a missing key must
// disappear rather than show up as the resolver's '??key' marker.
export function optionalText(value: string): string {
  return isMissingMarker(value) ? '' : value
}

// Keys a scene does not carry resolve to the '??key' marker. They must not reach
// the built page: check-build-output.mjs rejects them, and rightly so.
export function withoutMissing(strings: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(strings).filter(([, value]) => !isMissingMarker(value)))
}
