import { describe, expect, it } from 'vitest'
import { optionalText } from './text'

describe('optionalText', () => {
  it('gibt einen vorhandenen Text unverändert zurück', () => {
    expect(optionalText('Quelle: TBZ Flensburg')).toBe('Quelle: TBZ Flensburg')
  })

  it('macht aus dem Marker eines fehlenden Schlüssels einen leeren String', () => {
    expect(optionalText('??scenes.title.source')).toBe('')
  })

  it('behandelt einen leeren Wert als fehlend', () => {
    expect(optionalText('')).toBe('')
  })

  it('lässt einen Text mit zwei Fragezeichen im Inneren stehen', () => {
    expect(optionalText('Wirklich??')).toBe('Wirklich??')
  })
})
