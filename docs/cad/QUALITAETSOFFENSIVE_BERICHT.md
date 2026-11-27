# Qualitätsoffensive – Bericht (Etappe 0: Bestandsaufnahme)

Stand: 27.11.2026. Untersuchter Commit: `10c6e66` (main). Letzte CI-Läufe zu diesem Commit laut GitHub Actions: «Web-Version» #386, «Windows-Installer» #387 und «CAD-Kern Windows-Nachweis» #63, alle `success`. Ein Lauf von «Android-App» zu diesem Commit wurde nicht geprüft.

**Dieser Bericht ist Etappe 0.** Es wurden keine Logik-Änderungen für die Offensive vorgenommen. Alles, was unten als «nicht untersucht» steht, wurde nicht untersucht.

Ampel: Grün = nachgewiesen · Gelb = teilweise geprüft/Einschränkung · Rot = offen/fehlerhaft/nicht nachgewiesen.

## 1. Was untersucht wurde (tatsächlich ausgeführt)

- `git status`, Branch, letzte Commits, Remote: Arbeitsbaum sauber; lokal `claude/tauri-windows-github-action-ltlved`, die Commits liegen auch auf `main`.
- Workflows in `.github/workflows/` gelesen (Auszüge): `web.yml`, `windows-build.yml`, `cad-windows.yml`, `android.yml`.
- `package.json` (Skripte `test`, `t`, `t:alle`, `build`), `tests/lauf.mjs` (Kopf), `web/sw.js` (vollständig), `kern/fem/normen.js` (Schneelast), `docs/cad/STATUS.md` (Kopf), Ausschnitt der exakten Kette in `src/cad.js` (Zeilen 7330–7425).
- Vor diesem Auftrag gelaufen und grün: `npm run t` (Schnelltests, 40–48 Tests), die Kern-Tests `test/cad.test.js` und `test/flaechenblech.test.js`, einzelne App-Tests (`pruefen`, `stirnquetsch`, `flanschende`).
- **Nicht** in dieser Etappe ausgeführt: `npm test` (alle 32 Kern-Tests), `npm run t:alle`, Produktionsbuilds, Android-Build.

## 2. Bestandsaufnahme der Probleme

| Nr. | Priorität | Problem | Beleg | Betroffene Dateien | Ampel |
|---|---|---|---|---|---|
| 1 | P1 | **CI führt nur Kern-Tests aus.** `web.yml` und `windows-build.yml` rufen `npm test` (32 Kern-Test-Dateien) auf. Die 73 App-Integrationstests (`tests/app-kern/*.mjs`, Playwright) laufen in keinem Workflow. Das steht so auch im Auftrag. | `grep -l "lauf.mjs\|t:alle\|app-kern" .github/workflows/*.yml` liefert keinen Treffer; die Workflows rufen nur `npm test` bzw. `node test/cad.test.js` auf | `.github/workflows/*.yml`, `tests/lauf.mjs` | Rot |
| 2 | P1 | **Keine maschinenlesbare Genauigkeitsinformation pro Feature.** Die exakte Kette in `src/cad.js` führt eine lokale Map `nicht` (Körper → Grund), die für Meldungen und STEP genutzt wird. Ein gespeicherter Status pro Feature/Bauteil, den Abwicklung, Zeichnung, Eigenschaften und DXF verwenden, existiert nicht. | `src/cad.js` um Zeile 7332 ff. (`nicht.set(...)`) | `src/cad.js` | Gelb (Etappe 1: siehe Abschnitt 6) |
| 3 | P1 | **Gemischte Geometriewelt (Mesh und exakt).** Laut `STATUS.md` und Code sind Sweep, Loft, Kehle/Grat, STEP/STL-Import, Teilen, Muster/Bewegen an Blechteilen, Quetschfalte und Schale ohne offene Seite nur als Netz modelliert. Der exakte Weg meldet diese mit Text («noch nicht exakt»). | `src/cad.js` 7383–7425; `docs/cad/STATUS.md` | `src/cad.js`, `kern/cad/*` | Gelb |
| 4 | P1 | **Genauigkeit der Quetschfalte und neuer Blechdetails:** Die Quetschfalte (Dreieck, Wulst, 90°-Biegung, 180°-Saum) ist nur als Netz-Darstellung vorhanden, nicht im exakten Kern. Die Gehrung im Biegebereich gibt es nur im exakten Kern, nicht im Netz. Beides ist in der Oberfläche nicht als Näherung gekennzeichnet. | Code-Stand dieser Session | `src/cad.js` (`quetschFaltMeshes`, `prisma`), `kern/cad/featureBau.js` | Rot |
| 5 | P1 | **Schneelast nach SIA 261:** `kern/fem/normen.js` liefert ab 300 m `s_k = (1 + (h/350)²)·0,4`, darunter fest 0,9 kN/m². Bei 300 m ergibt das 0,694 kN/m², also weniger als bei 299 m (0,9). Ob in der Norm ein Mindestwert gilt und welche Höhenbezugsgrösse (h₀) richtig ist, ist **nicht geprüft**. Die Norm wurde nicht eingesehen. | Quelltext, Zeile 8; Rechnung nachvollzogen | `kern/fem/normen.js`, `kern/fem/*`, `test/fem.test.js` | Rot (Formel unverändert, Prüfung offen; Kennzeichnung siehe Abschnitt 6) |
| 6 | P2 | **Service Worker:** `web/sw.js` ist «Netz zuerst, bei Fehler Cache». `addAll` legt nur 7 Dateien an (HTML, Manifest, Icons, Logo, Banner). Alle anderen Dateien (Kern/WASM, Hilfebilder) kommen erst beim ersten Abruf in den Cache. Ein Kaltstart ohne Internet nach frischer Installation lädt den CAD-Kern nicht. Eine Versionsprüfung (HTML neu, Kern alt) gibt es nicht. `STATUS.md` führt «Offline-Cache für den Kern» selbst als offen. | `web/sw.js` vollständig gelesen | `web/sw.js`, `web/` | Rot |
| 7 | P2 | **Testläufer wiederholt Fehlschläge einmal still.** `tests/lauf.mjs` weist das mit «beim 2. Versuch grün» aus, markiert den Test aber nicht als instabil. Bekannte Kandidaten: `kantenwz` (regelmässig im 2. Versuch). | Ausgaben der Läufe in dieser Session | `tests/lauf.mjs` | Gelb |
| 8 | P2 | **Ein App-Test schlägt bestehend fehl:** `tests/app-kern/quetschfalte.mjs`, Prüfung «Ecke ohne Flansche: verständliche Meldung» (statt der erwarteten Meldung erscheint «Eine Ecke … anklicken»). Er läuft in den Schnelltests nicht mit und war vorher nicht aufgefallen. Ursache nicht geklärt. | wiederholt reproduziert | `tests/app-kern/quetschfalte.mjs` | Rot |
| 9 | P2 | **`src/cad.js` ist rund 783 KB gross** und enthält UI, Dialoge, Regeneration, Selektion, 3D-Ansicht und die exakte Kette. | `wc -c` | `src/cad.js` | Gelb |
| 10 | P2 | **Android:** Die Capacitor-App lädt die Web-Version. Die Offline-Szenarien (Kaltstart, Neustart, abgebrochener Download, Update während der Sitzung) sind nicht geprüft. Stift-Schweben am Lenovo-Tablet wurde bisher nur über Diagnose-Zähler betrachtet (Gerät meldete Schweben nicht an die WebView). Android-Build und Signatur nicht in dieser Etappe geprüft. | früherer Verlauf; nicht neu geprüft | `android-app/`, `.github/workflows/android.yml` | Rot |
| 11 | P3 | **Dokumentation:** `docs/cad/STATUS.md` hat den Stand 20.11.2026 und kennt die neueren Funktionen (u. a. Biegesimulation, Quetschfalte mit Biegungen) nicht. Phasenberichte sind nicht als historisch gekennzeichnet. | `docs/cad` Listing, `STATUS.md` Kopf | `docs/cad/*.md`, `README.md` (nicht gelesen) | Gelb |
| 12 | P3 | **Nicht untersucht in dieser Etappe:** FEM-Solver (Netz, Lager, Lasten, Konvergenz), Windlast/Lastkombinationen/Materialkennwerte, Topologie-Referenzen nach Modelländerungen, OCCT-Ressourcenfreigabe, `regen()`-Leistung, DXF/STEP-Export gegen unabhängigen Viewer, Rund-/Kegelblech-Referenzwerte. | – | `kern/fem/*`, `kern/cad/*` | Rot (offen) |

## 3. Fähigkeitsmatrix (vorläufig, aus Code und STATUS.md, nicht durch Läufe belegt)

Klassen: exact (B-Rep über OCCT), mesh, hybrid (Netz-Darstellung, exakte Rechnung), unsupported, failed. Die Einstufung beruht auf dem Lesen der Verzweigungen der exakten Kette und von `STATUS.md`. Sie ist **noch nicht** durch Tests je Operation bestätigt.

| Operation | vorläufige Klasse | Hinweis |
|---|---|---|
| Skizze (2D) | exact (reine Rechnung) | Löser in `kern/` |
| Extrusion, Drehung | exact (Schalter «Exakter CAD-Kern») | Mesh bei ausgeschaltetem Schalter |
| Abrunden/Fasen, Schale (mit offener Seite) | exact | andere Schalenformen: mesh mit Meldung |
| Sweep, Loft | mesh | «noch nicht exakt» |
| Teilen, Muster/Bewegen an Blechteilen | mesh | «noch nicht exakt» |
| Flächenblech mit Kantenbausteinen | exact (Fläche, Prismen, Gehrung, Freistellung) | Abwicklung/Ausschnitte laufen im Netz-Pfad |
| Quetschfalte | mesh | nur Darstellung, Abwicklung der Ecke separat |
| Rund-/Kegelblech | exact (Drehkörper) | Kegel mit schrägem Anschnitt: mesh |
| Kehle/Grat, STEP/STL-Import | mesh | |
| Dach-/Spenglerbauteile | nicht untersucht | |
| Abwicklung, DXF | Rechnung (kein B-Rep), eigene Quelle | Bezug zum exakten Körper nicht geprüft |
| STEP-Export | exact für exakte Körper, Rest ausgelassen mit Meldung | Meldung nennt «nicht enthalten» |

## 4. Vorgeschlagene Reihenfolge der nächsten Schritte

1. **Etappe 1a:** Datenmodell für den Genauigkeitsstatus (je Feature `exact`/`mesh`/`hybrid`/`unsupported`/`failed`, Weitergabe an Abhängige), Anzeige in der Oberfläche und im STEP-Export. Referenztests mit analytischen Werten.
2. **Etappe 1b:** SIA-Normprüfung (Schnee, Wind) nur anhand zugänglicher Quelle; falls nicht zugänglich, im Bericht und in der Oberfläche als «fachlich ungeprüft» kennzeichnen und die Aussage «Tragfähigkeit» im Bericht entfernen/begrenzen. **Keine Formel ändern ohne Quelle.**
3. **Etappe 2:** `npm run t:alle` (oder eine geeignete Auswahl) als eigener CI-Job mit Playwright; Retry sichtbar als instabil markieren; Test `quetschfalte` klären; Release-Sperre.
4. **Etappe 3:** Service-Worker-Konzept mit versionierter Vorab-Liste inkl. Kern/WASM, Android-Offline-Prüfung am Gerät.
5. **Etappen 4 und 5** wie im Auftrag.

## 5. Offene Rückfragen

- Zugang zu SIA 261 / 261/1 (Ausgabe und Abschnitt)? Ohne Quelle bleibt die Schneelast als ungeprüft markiert.
- Soll die CI-Ausführung der App-Tests (Playwright, Software-Grafik) bei jedem Push oder nur bei Release-Tags/`main` laufen? Die Laufzeit liegt lokal bei 7–25 Minuten.
- Android-Test am Gerät: Das Lenovo-Tablet ist verfügbar, die automatische Prüfung dort nicht.

## 6. Etappe 1 – umgesetzt (27.11.2026)

**1a Genauigkeitsstatus (neu: `kern/genauigkeit.js`)**
- Klassen `exact` · `hybrid` · `mesh` · `unsupported` · `failed`. Ein exaktes Feature auf einer Netz-Grundlage ist `hybrid`; ungenauere Klassen und Fehler werden an abgeleitete Features weitergegeben (Ziel, Skizze, Pfad, Profile …). Zyklische Abhängigkeiten werden als `failed` gemeldet.
- Ein Körper gilt nur als `exact`, wenn der Kern sein Netz tatsächlich ersetzt hat. Fehlt die Meldung und der exakte Körper, wird er als `mesh` geführt (nicht als exakt behauptet). Läuft die exakte Berechnung noch, steht «exakte Berechnung läuft …».
- Nur als Netz modelliert (fest hinterlegt): Sweep, Loft, Kehle/Grat, Quetschfalte, Quetschfalte an der Stirn, Teilen. Eine nicht ausgeschaltete Quetschfalte macht ihr Flächenblech zu `hybrid`.
- **Anzeige:** Im Browser trägt jedes nicht exakte Körper-Feature ein «≈» mit Klasse und Grund (Tooltip). Der Status liegt als `f._genau` am Feature (nicht in der Projektdatei, Projektformat unverändert).
- **STEP-Export:** exportiert nur gültige, geschlossene B-Rep-Körper. Die Meldung heisst «STEP exakt», wenn alle exportierten Körper gültig sind und nichts ausgelassen wurde, sonst «STEP nur teilweise exakt … NICHT enthalten: …» mit Namen und Grund.
- **Noch nicht umgesetzt (Gelb):** Weitergabe des Status an Abwicklung, Zeichnung/Plan und DXF (sie zeigen den Status nicht an); Volumen/Schwerpunkt aus dem Kern und der Netz-Fallback teilen nicht dieselbe Versionsprüfung ausser über das bestehende `exaktFuer === regenStand`; Topologie-Referenzen nach Modelländerungen nicht geprüft.

**1b Normwerte (`kern/fem/normen.js`, `kern/fem/bericht.js`, `src/simulation.js`)**
- Kein Zugriff auf SIA 261 / 261/1 (Rückfrage beantwortet: nein). **Keine Formel und kein Zahlenwert wurde geändert.**
- Neu: `QUELLENSTAND` (`geprueft: false`) mit Text zu Schnee, Wind und Lastkombinationen. Er steht im Simulationsfenster bei den Normlasten und im Bericht unter «Normlasten». `schneelast()` liefert `geprueft: false`, einen Hinweis und eine Warnung, wenn die Unstetigkeit bei 300 m (0,69 gegenüber 0,90 kN/m²) im Bereich liegt.
- Der bestehende Bericht-Hinweis «Richtwert, kein statischer Nachweis» bleibt unverändert.
- **Offen (Rot):** Mindestwert und Bezugshöhe der Schneelast, Windlast (Staudruck, Exposition, Formbeiwerte) und die Teilsicherheits-/Kombinationsbeiwerte sind fachlich nicht verifiziert. Prüfung durch eine fachkundige Person mit Zugang zur Norm nötig.
- **Nicht geprüft (Rot):** FEM-Solver (Reaktionen gegen Lasten, Konvergenz, Netzqualität) und die analytischen Vergleichsfälle. Es gibt bereits Tests in `test/fem.test.js` (u. a. Beulen N_cr); eine vollständige Prüfung steht aus.

**Referenztests Geometrie:** `test/cad.test.js` enthält bereits eine Referenzbibliothek mit analytischen Sollwerten (Quader, Zylinder, Kegel, Kugel, Boolesch, Bohrung, Flächenblech mit Aufkantungen, STEP-Roundtrip). Sie wurde in dieser Etappe nicht erweitert und nicht auf Toleranzen hin geprüft.

**Tatsächlich ausgeführt (diese Etappe)**
- `npm test` (alle 33 Kern-Test-Dateien inkl. neuer `genauigkeit.test.js`): Exit 0.
- `npm run t` (Schnelltests zu den 13 geänderten Dateien): 43/43 grün, `kantenwz` erst im 2. Versuch (bekannt instabil).
- Neuer App-Test `tests/app-kern/genauigkeit.mjs` (Kern aus: Näherung gekennzeichnet; Kern an: exakter Quader ohne Kennzeichnung, Flächenblech mit Quetschfalte «teilweise exakt»): grün.
- Nicht ausgeführt: `npm run t:alle`, Android-Build, Windows-Build lokal.

**Entscheidung des Eigentümers (27.11.2026):** App-Tests laufen nicht automatisch bei jedem Push, sondern nur auf Anweisung. Die Release-Sperre in der CI (Etappe 2) wird entsprechend als **manuell ausgelöster** Workflow geplant, nicht als Pflicht-Check bei jedem Push.
