import { describe, expect, it } from 'vitest'
import { optionalText, withoutMissing } from './text'

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

  it('lässt einen Text mit zwei Fragezeichen am Anfang stehen, der kein Schlüssel ist', () => {
    expect(optionalText('Wirklich?? Ja.')).toBe('Wirklich?? Ja.')
  })

  it('lässt einen Satz stehen, der mit zwei Fragezeichen beginnt, aber kein Schlüssel ist', () => {
    expect(optionalText('??Das ist eine Frage')).toBe('??Das ist eine Frage')
  })

  it('erkennt den Marker eines fehlenden verschachtelten Schlüssels', () => {
    expect(optionalText('??scenes.title.source')).toBe('')
  })

  it('erkennt den Marker eines fehlenden flachen Schlüssels', () => {
    expect(optionalText('??steps.messen')).toBe('')
  })

  it('erkennt den Marker eines Schlüssels mit Bindestrich in der Szenen-ID', () => {
    expect(optionalText('??scenes.open-source.eyebrow')).toBe('')
  })
})

describe('withoutMissing', () => {
  it('behält einen vorhandenen Wert', () => {
    expect(withoutMissing({ 'scenes.water.source': 'Quelle: TBZ Flensburg' })).toEqual({
      'scenes.water.source': 'Quelle: TBZ Flensburg',
    })
  })

  it('entfernt einen Marker-Wert', () => {
    expect(withoutMissing({ 'scenes.title.source': '??scenes.title.source' })).toEqual({})
  })

  it('lässt einen Text stehen, der mit zwei Fragezeichen beginnt, aber kein Schlüssel ist', () => {
    expect(withoutMissing({ 'scenes.title.statement': '??Das ist eine Frage' })).toEqual({
      'scenes.title.statement': '??Das ist eine Frage',
    })
  })

  it('erkennt den Marker eines fehlenden flachen Schlüssels', () => {
    expect(withoutMissing({ 'steps.messen': '??steps.messen' })).toEqual({})
  })

  it('erkennt den Marker eines Schlüssels mit Bindestrich in der Szenen-ID', () => {
    expect(
      withoutMissing({ 'scenes.open-source.eyebrow': '??scenes.open-source.eyebrow' }),
    ).toEqual({})
  })

  it('behält den echten Wert und entfernt nur den Marker, Schlüssel bleiben erhalten', () => {
    expect(
      withoutMissing({
        'scenes.water.statement': '50.000 Liter Wasser pro Jahr',
        'scenes.water.eyebrow': '??scenes.water.eyebrow',
      }),
    ).toEqual({
      'scenes.water.statement': '50.000 Liter Wasser pro Jahr',
    })
  })
})
