# Phase E – Zeichnungen und Schnitte (laufender Bericht)

## E1 – Zeichnungsansichten aus der exakten Projektion (erledigt, 20.11.2026)

- **Kern:** Das Kommando `projektion` nimmt jetzt eine frei wählbare Blickrichtung (`richtung`, `xAchse`) und mehrere Körper (`ziele`). Kurven werden in 96 Schritten ausgegeben (Sehnenfehler unter 0,01 mm bei r 100).
- **`kern/cad/ansichtExakt.js` (rein, getestet):**
  - Es wandelt die Linienzüge aus dem Kern ins Format des Planblatts um (Papier-mm, y nach unten, Massstab, Blattgrösse mit 1 % Rand).
  - **Verdeckte Kanten, die genau hinter sichtbaren liegen, entfallen** (z. B. der Lochgrund hinter dem Lochkreis, die Rückseite des Umrisses).
  - Fangpunkte tragen Weltpunkte in der Bildebene: Bemassung und `abbild()` des Plans funktionieren unverändert, Abstände sind die wahren Abstände in der Ansicht.
- **App (Kern ein):**
  - Nach jedem exakten Modellaufbau bleiben die Körper in Weltlage (inklusive Komponentenverschiebung) im Kern, die der vorigen Runde werden freigegeben.
  - Das Planblatt fragt pro Ansicht zuerst den Kern. Bis das Ergebnis da ist, bleibt das Netz stehen, dann wird die Ansicht automatisch ersetzt.
  - Sind nicht alle sichtbaren Körper exakt, bleibt die ganze Ansicht Netz (keine Mischung).
  - Nach einem Neustart des Kern-Workers werden die alten Kennungen verworfen.
- **Schnittansichten und Lupe** bleiben vorerst Netz (Schnitt mit Netz-CSG).

**Tests:**
- Kern (+7, `cad.test.js`): Blattgrösse, Linienlängen = Umriss + Lochkreis (181,41 gegen 181,42), keine doppelte verdeckte Linie, Draufsicht mit verdecktem Lochmantel, Fangpunkte tragen Weltpunkte, Seitenansicht ohne verdeckte Kanten.
- App (`tests/app-kern/plan.mjs`, 10):
  - Kern aus: Netz wie 0.2.
  - Kern ein: exakte Vorder- und Draufsicht, Länge 362,82 mm gegen erwartet 362,83 mm.
  - Das Planblatt öffnet und zeigt die Ansicht, keine Seitenfehler.

**Offen in Phase E:** Schnitte und Detailansichten aus dem exakten Modell (echte Schnittflächen mit Schraffur aus dem Kern), Mittellinien, Schnittverlaufslinien mit Kennzeichnung, Bemassung aus exakten Kanten (Radien, Durchmesser, Winkel).
