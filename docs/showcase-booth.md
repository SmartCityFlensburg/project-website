# Die Tafel am Messestand

Die Dauerschleife liegt unter `/de/showcase` und läuft am Stand aus einem
lokalen Build, damit ein Ausfall des Messe-WLAN sie nicht trifft.

## Vor der Messe

1. Screencasts aufnehmen und in den Bucket legen, siehe unten.
2. `pnpm showcase:clips` holt sie nach `public/showcase-clips/`.
3. `pnpm showcase:build` erzeugt `dist/`. Nicht `pnpm build`: nur dieser
   Befehl stellt die Videoquelle auf den eigenen Ursprung um, sonst sucht die
   Tafel die Clips am Stand im Internet.
4. `dist/`, `scripts/showcase-kiosk.sh` und `scripts/showcase-server.mjs` auf
   den Standrechner kopieren. Mehr wird nicht gebraucht: der Server ist ein
   eigenes Skript ohne Abhängigkeiten, kein `node_modules/` nötig.
5. Einmal Probe fahren: Netzwerk am Standrechner trennen und
   `pnpm showcase:kiosk` aus dem Stand starten (nicht nur währenddessen
   trennen). Nur ein echter Kaltstart ohne Netz zeigt, ob am Ende auch wirklich
   nichts aus dem Internet nachgeladen wird.

## Am Stand

```bash
pnpm showcase:kiosk
```

Das Skript schaltet den Bildschirmschoner ab, startet `scripts/showcase-server.mjs`
als lokalen Server, prüft, dass er tatsächlich antwortet, und startet dann
Chromium im Vollbild. Stirbt der Server oder Chromium während der Messe, wird
jeweils neu gestartet, ohne dass jemand eingreifen muss. Beenden mit Strg+C.

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
