# Dach-Modus (zweiter Grundaufbau) – Plan

Stand: 21.11.2026 · nur Planung, noch nichts gebaut.

## Entscheide (vom Besitzer)
1. **Details** sollen sich aus dem Dach erstellen lassen (Schnitte durch Traufe, First, Ortgang, Grat, Kehle, Kamin, Fenster, Lukarne – massstäblich im Plan, mit Schichtenaufbau und Blechprofilen).
2. **Dachformen zuerst:** Satteldach, Pultdach, Walmdach.
3. **Gebäudekörper:** nur der Ansatz (Grundriss, Wandhöhe, Wände als einfache Körper, Mauerkrone als Auflager) – so gebaut, dass später Geschosse, Öffnungen und Wandaufbau ergänzt werden können.
4. **Deckung:** Schiebeziegel (Falzziegel) und Biberschwanzziegel – einfache Deckung und Doppeldeckung (Biber).
5. **Eingabe:** beides – Grundform mit Massen eintippen **oder** eigenen Grundriss zeichnen.
6. **Export:** DXF und Listen genügen vorerst (kein IFC).

## Konzept
- Neuer Modus **«Dach»** (Umschalter oben, wie «2D») mit eigenem Register: Gebäude · Dachform · Aufbau · Elemente · Details · Listen.
- Gleiches Projekt, gleiche Zeitleiste; neue Feature-Typen (`gebaeude`, `dach`, `dachelement`), parametrisch: Grundriss, Neigung, Aufbau oder Element ändern → alles rechnet neu.
- Assistent **«Dach automatisch»**: Grundform/Grundriss → Dachform → Aufbau → Deckung → fertig; danach jede Fläche und jedes Element einzeln editierbar (Ziehpfeile, Dialoge).

## Bausteine
**Gebäude (Ansatz):** Grundriss (Rechteck, L, T, U, Winkel oder Skizze), Traufhöhe, Wandstärke, Wände als Körper, Mauerkrone. Datenmodell mit Geschossliste (vorerst 1 Geschoss), damit Erweiterung möglich bleibt.

**Dachform:** Neigung je Kante, Überstand, First-Richtung. Aus dem Grundriss entstehen per Straight-Skeleton (eigene Umsetzung) Dachflächen, First, Grate, Kehlen, Traufe, Ortgang. Phase 1: rechtwinklige Grundrisse; später beliebige Polygone.

**Dachaufbau (Vorlagen, mit Cloud-Abgleich wie Kantenbausteine):** Sparren (Querschnitt, Achsabstand, Überstand) · Dämmung (zwischen/auf/unter Sparren) · Unterdach (Schalung + Bahn oder diffusionsoffen) · Konterlattung · Dachlattung · Deckung. Beispiel: «Sparren 8/20, e = 70, Dämmung 200».

**Deckungs-Vorlagen:** Lattweite/Lattenabstand, Deckbreite, Überdeckung, Mindestneigung, Stück/m², Gewicht/m² – für Schiebeziegel, Biber einfach (Spiess), Biber doppelt.

**Sparren:** parallel zur Fallinie; Grat-/Kehlsparren und Schifter mit Gehrung automatisch; optional Pfetten (First-, Mittel-, Fusspfette).

**Lattung:** horizontal je Dachfläche aus der Lattweite der Deckung; Grat-/Kehllatten.

**Elemente (auf einer Dachfläche positioniert):** Dachfenster (Hersteller-Vorlagen mit Einbaumassen, Wechsel/Auswechslung automatisch), Kamin (Durchdringung, Wechsel), Lukarnen (Sattel-, Schlepp-, Flachgaube mit eigenem Dachaufbau). Später: Solar, Entlüfter, Schneefang.

**Spengler-Brücke:** aus der Dachgeometrie entstehen automatisch Flächenbleche mit Kantenbausteinen: Traufblech, Ortgang, First, Grat, Kehle, Kamin- und Fenstereinfassung – mit Abwicklung, Stückliste, DXF und Übergabe an die App.

**Details:** «Detail aus Dach»: Schnittlinie wählen → Schnitt durch den Aufbau (Sparren, Dämmung, Unterdach, Lattung, Deckung, Blech) massstäblich, bemasst, als Planblatt-Detail. Standarddetails (Traufe, First, Ortgang, Kehle, Grat, Kamin, Fenster) mit einem Klick an der jeweiligen Stelle.

**Ausgaben:** Holzliste (Querschnitt, Länge, Gehrung, Stück), Flächen (Dämmung, Unterdach), Lattenlängen, Ziegelmenge, Dachaufsicht mit Bemassung, Schnitte/Details, Cloud-Ablage.

## Technik
- `kern/dach/`: `grundriss.js`, `form.js` (Skeleton), `schichten.js`, `sparren.js`, `latten.js`, `deckung.js`, `elemente.js`, `bleche.js`, `schnitt.js`, `liste.js` – reine Rechnung mit Tests.
- `src/dach.js`: Oberfläche (Modus, Register, Assistent). Darstellung als Netz; exakter Kern später optional.
- Wiederverwendet: Flächenblech/Kantenbausteine, Plan-Modul (Details, Bemassung, Zoom), Ziehpfeile, Cloud-Vorlagen und -Ablage.

## Phasen
| Phase | Inhalt |
|---|---|
| 1 | Gebäude-Ansatz, Grundriss (Rechteck), Satteldach/Pultdach/Walmdach, Dachflächen, Aufbau- und Deckungs-Vorlagen, Assistent |
| 2 | Sparren, Dämmung, Unterdach, Konter-/Dachlattung, Holzliste, Ziegelmenge |
| 3 | Grundformen L/T/U, Grat/Kehle, Schifter; eigener Grundriss aus Skizze |
| 4 | Dachfenster, Kamin, Lukarne mit Wechseln |
| 5 | Spengler-Brücke: automatische Anschlussbleche |
| 6 | Details (Schnitte), Dachaufsicht-Plan, Listen, Vorlagen in der Cloud |

Empfehlung: Phasen 1, 2 und 5 zuerst (Dach mit Blechen), dann 3, 4, 6.

## Offene Punkte (vor Phase 1 klären)
- Genaue Deckungsdaten (Lattweiten, Überdeckungen, Mindestneigungen) der gewünschten Ziegel – aus Herstellerdaten oder eigene Werte?
- Welche Dachfenster-Hersteller/-Grössen als erste Vorlagen?
- Sparrenquerschnitte und Achsabstände als Standard (z. B. 8/20, e = 70)?
- Normen/Richtwerte, die das Programm prüfen soll (Mindestneigung je Deckung, Lüftungsquerschnitt)?
