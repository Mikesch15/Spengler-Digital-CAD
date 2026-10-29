# Live-Tests in Fusion – gebündelt (ca. 20 Minuten)

Diese Tests konnten in der Entwicklungsumgebung **nicht** ausgeführt werden (kein Fusion verfügbar).
Bitte der Reihe nach durchgehen und am Ende die Protokolldatei schicken:
`%APPDATA%\SpenglerDigitalCAD\protokoll\spengler_cad.log` (macOS: `~/Library/Application Support/SpenglerDigitalCAD/protokoll/`).

## Block A – Start und Selbsttest (3 Min.)
1. Add-in ausführen. Erwartet: Register **SPENGLER** mit 8 Befehlen, keine Fehlermeldung.
2. **Hilfe → Fusion-Fähigkeiten prüfen.** Ergebnis abschreiben/Screenshot (✓/✗ je Zeile).
3. **Hilfe → Selbsttest in neuem Dokument.** Erwartet: ✓ Einheiten, ✓ Rundblech (Ø ca. 200.7 mm),
   ✓ 3D-Detail Export/Import (Ursprung ca. (0, 100, 0) mm; «fehlend» möglichst leer). Text abschreiben/Screenshot.

## Block B – Verwaltung (4 Min.)
4. **Vorlagen & Einstellungen** öffnen: Kantenvorlagen leer, Materialien leer.
5. Material anlegen: Name, Dicke = Dicke Ihrer Blechregel, Innenradius, K-Faktor, eine Tafel.
6. Neue Vorlage: Kurzschrift `90 H U+ u`, «übernehmen», H = 25, u = 7, Prüfen & Trockenlauf, Speichern.
7. Löschen → Bestätigungsdialog erscheint → «Nein» → Vorlage bleibt.

## Block C – Kanten (6 Min.)
8. Blech-Arbeitsbereich: Rechteck 300 × 200 → Grundlasche (Blechregel mit Ihrer Dicke).
9. **Kanten bearbeiten**: eine obere Aussenkante, Ihre Vorlage, Vorschau an. Erwartet: Vorschau zeigt Flansch + Umschlag.
   OK → Meldung «Erfolgreich». Strg+Z nimmt alles in einem Schritt zurück.
10. Zwei Kanten gleichzeitig wählen → OK. Erwartet: beide Kanten bearbeitet.
11. Eine Biegekante oder eine Kante eines normalen Volumenkörpers wählen. Erwartet: Bauplan zeigt «ungeeignet» mit Grund, OK gesperrt.
12. Expertenmodus: Folge auf `90 20 -90 10` ändern → OK. Erwartet: Z-Profil; Vorlage unverändert.

## Block D – 3D-Detail (4 Min.)
13. Neue Komponente, darin ein kleines Detail (Körper) mit Benutzerparameter z. B. `SD_Laenge`.
14. **3D-Detail erfassen**: Komponente, gerade Anschlusskante, Parameter ankreuzen, Name → OK.
15. **3D-Detail anwenden** an einer Kante eines anderen Bauteils, Wert ändern → Vorschau → OK.
    Erwartet: Detail sitzt an der Kante, Meldung nennt gesetzte Parameter.

## Block E – Fertigung (3 Min.)
16. **Abwicklung & DXF**: Blechkörper aus Block C wählen (falls keine Abwicklung: feststehende Fläche wählen) → OK.
    Erwartet: Ordner öffnet sich mit `.dxf` und `_werkstattblatt.html`; DXF in einem CAD öffnen.
17. **Material & Zuschnitt**: Körper wählen, Stück 5 → OK. Erwartet: Bericht, `zuschnittplan.svg/.csv/.dxf`.
18. **Rundblech / Umformung**: Scheibe r = 100, Rand 20 → OK. Erwartet: Drehkörper, Beurteilung «nicht beurteilbar»
    solange kein eigener Grenzwert im Material steht.

Bei jedem ✗: Meldungstext notieren und das Protokoll schicken. Besonders wichtig für die Weiterentwicklung
sind die Protokollzeilen `EdgeFlangeInput eigenschaften=…` und `HemFeatureInput eigenschaften=…`
(sie zeigen die tatsächlichen Namen der Preview-API in Ihrer Fusion-Version).
