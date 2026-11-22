# Vergleich mit Fusion (Blech und Körper) – Stand 22.11.2026

## Blech (Fusion «Sheet Metal»)
| Fusion | Hier | Stand |
|---|---|---|
| Flange (Winkel, Länge, Radius, Mass bis) | Flansch an Kanten von Flächenblech und Blechprofil | ✔ |
| Contour Flange | Blechprofil aus Skizze, Freies Profil (Tabelle entfernt), Vorlagen | ✔ |
| Lofted Flange | Feature «Lofted Flange» (Blech zwischen zwei Profilen, Abwicklung genähert) | ✔ neu |
| Hem (geschlossen, offen, Tropfen) | Umschlag mit Saumart, Bausteine Säume | ✔ (Rollsaum fehlt: Biegungen > 180° nicht gerechnet) |
| Bend (an Linie) | «Biegung an Linie» (Flächenblech, Winkel, Radius, K-Faktor) | ✔ neu |
| Rip | «Rip (Auftrennen)»: Schlitz mit Spalt, in der Abwicklung | ✔ neu |
| Corner closure / seam | Eckenschluss Gehrung / Stoss / Spalt, Quetschfalte | ✔ |
| Unfold / Refold / Flat pattern / DXF | Abwickeln/Falten, Zuschnitt, DXF | ✔ |
| Convert to sheet metal | Blech auf Körperfläche | ✔ |
| Sheet metal rules | Materialien (Dicke, Radius, K-Faktor) | ✔ |
| Jog | Kröpfungs-Bausteine (45°, 90°) | ✔ |
| Bend relief (Entlastungsformen) | nur Spalt/Rip | offen |
| Biegung + Flansche gleichzeitig am selben Blech | nicht möglich (Fehlermeldung) | offen |
| Form tools, Louvres | – | offen |

## Körper (Fusion «Solid»)
| Fusion | Hier | Stand |
|---|---|---|
| Extrude (neu/join/cut/intersect, beidseitig, bis Fläche) | ✔ | ✔ |
| Revolve, Sweep, Loft | ✔ | ✔ |
| Fillet, Chamfer | Abrunden/Fasen (konstant) | ✔ (variabel/Vollrundung offen) |
| Shell | ✔ | ✔ |
| Hole (einfach, Senkung, Kegelsenkung) | «Bohrung» an Skizzenpunkten | ✔ neu |
| Scale | «Skalieren» (gleichmässig) | ✔ neu |
| Pipe | «Rohr» (Pfad, Wand) | ✔ neu |
| Coil | «Spirale» (auch als Ausschnitt = Gewinde-Schnitt) | ✔ neu |
| Rib | «Rippe» | ✔ neu |
| Move/Copy, Rectangular/Circular pattern, Mirror, Split body, Combine | ✔ | ✔ |
| Construction planes/axes/points | ✔ | ✔ |
| Pattern on path | Muster «Entlang eines Pfads» | ✔ neu |
| Draft (Konuswinkel der Extrusion) | Extrusion mit Konuswinkel | ✔ neu |
| Draft auf bestehende Flächen, Thicken, Offset face | – | offen |
| Surface modelling (Patch, Stitch, Trim) | – | offen |
| Sketch: Linie, Kreis, Bogen, Rechteck, Ellipse, Spline, Langloch, Polygon, Text, Abrunden, Versatz, Stutzen, Spiegeln, Muster, Bemassung, Abhängigkeiten | ✔ | ✔ |
| Assembly (Joints, Motion) | – | offen (Zielbereich Blech/Körper) |
| Simulation, CAM, Rendering | – | ausserhalb |


## Nachtrag 22.11.2026 (Skizze und Blech)
- Skizze: **Fase**, **Skalieren**, **Schnitt mit Körper** (Schnittlinien der Körper mit der Skizzenebene) neu.
- Blech: **Eckentlastung** (rund/quadratisch) am Flächenblech neu; Flansch/Umschlag mit Live-Vorschau, Ziehpfeilen und Fusion-Bezügen («Länge bis», «Biegeposition»).
- Weiter offen (Skizze/Blech): Kegelschnitt (Conic), Rollsaum, Biegung gleichzeitig mit Kantenflanschen, Formwerkzeuge.
