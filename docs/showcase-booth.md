# Die Tafel am Messestand

Die Dauerschleife liegt unter `/de/showcase` und läuft am Stand aus einem
lokalen Build, damit ein Ausfall des Messe-WLAN sie nicht trifft.

## Vor der Messe

1. Screencasts aufnehmen und in den Bucket legen, siehe unten.
2. `pnpm showcase:clips` holt sie nach `public/showcase-clips/`.
3. `pnpm showcase:build` erzeugt `dist/`. Nicht `pnpm build`: nur dieser
   Befehl stellt die Videoquelle auf den eigenen Ursprung um, sonst sucht die
   Tafel die Clips am Stand im Internet.
4. `dist/`, `scripts/showcase-kiosk.sh` und `node_modules/` auf den
   Standrechner kopieren (oder dort per `pnpm install` mit Netz einmal
   auffrischen). `node_modules/` wird gebraucht, damit `npx serve` die im
   Projekt gepinnte Version findet, statt sie am Stand aus dem Internet zu
   laden, siehe Warnung unten.
5. Einmal Probe fahren: Netzwerk am Standrechner trennen und
   `pnpm showcase:kiosk` aus dem Stand starten (nicht nur währenddessen
   trennen). Nur ein echter Kaltstart ohne Netz zeigt, ob `npx serve` wirklich
   lokal auflöst.

## Am Stand

```bash
pnpm showcase:kiosk
```

Das Skript schaltet den Bildschirmschoner ab, serviert `dist/` lokal, startet
Chromium im Vollbild und startet ihn neu, falls er abstürzt. Beenden mit
Strg+C.

## Die Screencasts

Stumm, 1920 × 1080, je 8 bis 12 Sekunden, mit zwei Sekunden Ruhe am Ende.
Aufnahmequelle ist `demo.green-ecolution.de`, ohne sichtbare Browserleiste,
mit langsamer und bewusster Mausführung.

| Datei                         | Inhalt                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `showcase-karte.mp4`          | Zoom über Flensburg, Ampel-Marker bauen sich auf, ein roter Baum wird geöffnet |
| `showcase-verlauf.mp4`        | Baum-Detailseite, Feuchtekurven über die Tiefen                                |
| `showcase-einsatzplanung.mp4` | Eine Gruppe wird per Drag & Drop in einen Einsatz gezogen                      |

Fehlt ein Clip, zeigt die Tafel an seiner Stelle den passenden Screenshot mit
langsamer Fahrt. Sie ist also auch ohne Aufnahmen vollständig vorführbar.

## Warnung: `npx serve` und das fehlende Netz

`scripts/showcase-kiosk.sh` startet den lokalen Server mit `npx serve`.
`serve` ist als gepinnte Dev-Abhängigkeit in `package.json` eingetragen, damit
`npx` die Version aus `node_modules/.bin` findet und sie nicht erst aus dem
Netz lädt. Das greift aber nur, wenn `node_modules/` tatsächlich mit auf den
Standrechner kommt oder dort vorher per `pnpm install` installiert wurde.
Wird nur `dist/` und das Kiosk-Skript kopiert, ohne `node_modules/`, versucht
`npx` am Stand ins Internet zu greifen und schlägt dort ohne Netz fehl. Vor
der Messe deshalb immer den Kaltstart-Test aus Schritt 5 durchführen, mit
tatsächlich getrenntem Netz, nicht erst nach dem Start.
