# Quellkarte (erzeugt mit `node tools/karte.mjs --schreibe`) – mit grep durchsuchen, nicht ganz lesen

Format: `Zeile name` (fn = Funktion, § = Abschnitt)

## src/ablage.js
5 KEY
6 lies
7 schreibe
8 MIME
10 fn ablageModul

## src/ansicht.js
6 RICHTUNGEN
12 UNPACK
15 fn umrisse
34 fn rechneAnsicht
86 fn verbinde
91 fn kantenGeometrie

## src/arbeitsbereich.js
3 SCHLUESSEL
4 mitte
5 lies
6 speichere
7 setze
24 leiste

## src/befehlssuche.js
3 SYNONYME
12 GRUPPEN
13 norm
14 fn befehle
30 zusatzBefehle
32 ZUL
33 lesZuletzt
34 merkeZuletzt
35 offen
36 fn oeffneBefehlssuche
64 fn schliesse

## src/cad.js
62 zuWeltK
65 VERSION
66 SPEICHER
68 § Ebenen
70 EBENEN
75 V
76 ebene
77 E_
78 ebenenName
79 basis
80 zu3D
81 ebenenEbene
82 aufEbene
84 § Dokument
85 doc
87 speichern
88 neueId
90 fn entferneFeature
94 fn einfuegen
99 fn bezuegeVon
110 finde
112 paramWerte
113 zahlAus
114 fn wendeAusdrueckeAn
123 fn skizzenAusdruecke
133 teilFinden
134 waehlbar
135 hauptVon
137 vorSk
138 vorDach
139 zeigerAuswahl
141 EINST
142 standardEinst
151 GRUPPEN
153 fn mitStandard
162 einst
165 rastern
167 darstellung
174 neuMaterial
175 SICHERUNG
176 sichLesen
177 sichSchreiben
179 fn sichereEinst
180 einstSpeichern
182 material
183 matOpt
184 auswahl
186 § Szene
187 leinwand
188 renderer
190 szene
191 kamera
192 steuerung
198 drehPivot
218 modellRadius
219 flaechenTreffer
220 fn ziehNahe
235 rollZug
247 licht
248 licht2
249 boden
251 modell
252 skizzenRaster
254 WUERFEL
255 wuerfelSzene
256 wuerfelMat
260 wuerfel
262 wuerfelHit
263 fn wuerfelTreffer
270 fn zeichneWuerfel
277 fn groesse
289 leeren
291 § Skizzengeometrie
294 schrift
295 TEXTE
296 fn textKonturen
309 fn elGeo
325 profilElemente
327 verbunden
328 fn zugPunkte
334 fn schleifen
341 ketten
352 flaeche
353 fn innen
362 REGIONEN
363 fn skizzenRegionen
374 fn gewaehlteRegionen
381 fn exakteProfile
392 fn formen
414 § Blech aus Linienzug
415 fn blechAusKette
416 fn blechOps
435 § Körper erzeugen
436 § Darstellung (wie «Erscheinungsbild» in Fusion): Metalle der Spenglerei, Holz, Beton
437 OBERFLAECHEN
454 oberflaecheFuer
455 farbe
456 TEXTUREN
457 fn textur
470 fn wuerfelUV
481 fn glatteNormalen
499 fn oberflaechenMaterial
507 darstellungVon
508 csg
509 fn koerperMesh
516 fn verknuepfe
524 nurPos
527 fn koerperGeometrie
535 fn drehGeometrie
559 fn zusammen
566 fn nachAussen
574 fn spiegleFlaechen
575 fn stirnMeshes
587 fn stirnAnhaengen
594 fn koerper
600 fn koerperAusGeo
606 konturForm
608 dunkelModus
609 § Layer (2D): Farbe und Linienart je Layer, Elemente verweisen mit el.layer
610 layerListe
611 layerVon
612 fn skizzenObjekt
643 § Konstruktionsebenen: Darstellung und Bezüge
644 EBENEN_ARTEN
649 fn ebenenObjekt
658 grundebenen
660 fn ebenenGroesse
670 zahl3
671 fmt3
672 elementPunkte
674 ELEMENTNAME
675 elementKanten
684 elementPfad
685 skizzeElement
686 welt
687 ACHSEN_EBENE
689 fn bezugEbene
693 fn bezugKante
703 fn bezugPunkt
712 fn bezugZylinder
720 fn bezugPfad
726 fn baueEbene
741 vorher
742 SCHNAPP
743 mitWert
744 ebenenOpt
745 fn kantenListe
751 fn punkteListe
757 fn zylinderListe
765 pfadListe
767 § Auswahl im 3D-Raum (Bezüge in Dialogen, Skizzierebene)
768 aufSchirm
769 abstandStrecke
770 fn koerperKanten
778 fn waehleImRaum
853 aktiveWahl
854 fn zeigeWahl
863 hoverGruppe
864 HOVERFARBE
865 hoverCache
866 fn flaechenRegion
880 waehlGruppe
881 fn regionMesh
888 fn zeichneGewaehlt
893 hoverWartet
894 fn hoverWahl
898 fn hoverLoeschen
899 fn hoverZeichnen
924 fn uebernimmWahl
954 § Ziehpfeile (wie in Fusion): Masse im Dialog zusätzlich mit einem Pfeil in der Ansicht ziehen
955 griffGruppe
956 griffe
958 fn beidseitig
965 fn griffeFuer
983 regen-Zweig kmuster
991 regen-Zweig schale
1014 griffLaenge
1015 fn zeichneGriffe
1029 fn griffAn
1051 griffEnde
1055 § Neuaufbau (parametrisch, in Reihenfolge der Zeitleiste)
1056 fn regen
1102 regen-Zweig ebene
1106 regen-Zweig achse
1109 regen-Zweig konpunkt
1112 regen-Zweig skizze
1116 regen-Zweig extrusion
1124 regen-Zweig bild
1127 regen-Zweig import
1131 regen-Zweig detail3d
1139 regen-Zweig kehle
1142 regen-Zweig kanten3d
1148 regen-Zweig kantenrund
1151 regen-Zweig schale
1157 regen-Zweig teilen
1159 regen-Zweig drehung
1164 regen-Zweig sweep
1167 regen-Zweig loft
1171 regen-Zweig blech
1197 regen-Zweig vorlage
1205 regen-Zweig flaeche
1224 regen-Zweig gebaeude
1229 regen-Zweig dach
1244 regen-Zweig dachbleche
1257 regen-Zweig profilkante
1260 regen-Zweig eindeckung
1273 regen-Zweig dachelement
1280 regen-Zweig lukarne
1288 regen-Zweig kante
1291 regen-Zweig abwickeln
1298 regen-Zweig falten
1310 regen-Zweig rundblech
1315 regen-Zweig detail
1317 regen-Zweig profil
1341 § Rückgängig / Wiederholen
1343 verlauf
1344 zustand
1345 fn merke
1356 fn springe
1364 fn zeigeVerlauf
1378 fn markiere
1389 richtung
1390 fn zeigeRichtung
1405 richtungSkalieren
1411 § Browser und Zeitleiste
1412 NAMEN
1413 AUGE
1414 fn zeigeBrowser
1439 fn zeigeZeit
1449 gezogen
1459 fn verschiebeFeature
1471 fn abwickelnSchalten
1491 istAbgewickelt
1493 fn featureMenue
1558 fn waehle
1565 § Werkstatt
1566 f1
1567 register
1569 blechteile
1571 rundteile
1575 fn auftrag
1578 f2
1580 bedarf
1581 fn bedarfCsv
1590 fn bedarfHtml
1601 fn zeigeAuftrag
1620 fn dachListeZeilen
1630 fn zeigeDachListe
1639 fn zeigeWerkstatt
1698 fn dupliziere
1708 § Druck: Werkstattblatt je Blechteil (A4)
1709 kopf
1710 fn werkstattblatt
1734 fn stuecklisteBlatt
1750 fn druckeEtiketten
1764 fn drucke
1770 esc
1773 hinweisZeit
1774 fn status
1781 fn kopiere
1784 § Dateien
1786 pc
1787 DATEITYPEN
1788 dateiname
1789 fn herunterladen
1816 § Befehlsdialog
1817 dlg
1819 fn dialog
1844 schrittNamen
1845 fn zeigeSchritt
1860 mitSchritten
1861 werte
1863 fn merkeAusdruecke
1876 fn schliesse
1885 fn featureDialog
1905 bisFelder
1909 fn bisAbstand
1915 wendeBisAn
1916 fn extrusionMitteUV
1920 bisWert
1921 zweiFeld
1922 RICHTUNGEN
1923 LAGEN
1925 fn bearbeite
1959 fn ebeneDialog
2006 fn extrusionDialog
2023 VORGAENGE
2024 vorgangFelder
2029 fn drehAchse
2036 achsenOpt
2038 fn drehungDialog
2051 fn blechDialog
2073 fn vorlageDialog
2103 fn profilDialog
2154 § Rund-/Kegelblech (Zylinder- oder Kegelmantel mit exakter Abwicklung)
2156 rohrNeigung
2158 fn rohrSchnitt
2162 fn rohrSchnittWerkzeug
2166 fn rundMeridian
2175 fn rundGeometrie
2183 fn rundDialog
2206 fn zeigeRund
2226 § Flächenblech: Grundfläche aus der Skizze, Kantenbausteine je Kante
2227 alleBausteine
2228 bausteinFuer
2229 bausteinName
2231 fn bausteinKontur
2243 fn prisma
2257 fn sweepGlatt
2288 boxUeberlappt
2290 fn flachKoerper
2304 fn kantenBeschneiden
2319 fn lochRaender
2324 fn schneideAus
2339 fn blechEbene
2343 fn flaechenKoerper
2384 kantenZeiger
2385 menueKante
2386 kantenLabels
2387 kantenName
2388 fn zeigeKanten
2411 fn kanteUnterMaus
2422 § Komponenten: Lage (verschieben/drehen als Ganzes) und Kollisionsprüfung
2424 fn lageMatrix
2431 lageVon
2432 fn wendeKomponentenLageAn
2440 fn komponenteDialog
2452 kollisionen
2453 fn pruefeKollision
2474 fn kantenProfil
2480 fn berechneKanten
2490 kantenSchritte
2491 fn setzeKanteRoh
2499 fn setzeKanteVon
2506 werkzeugKante
2507 werkzeugNeu
2509 fn kantenMenue
2532 fn partnerKante
2540 § Dach-Modus (Phase 1): Gebäude-Ansatz + Dach aus Grundriss, Dachform und Aufbau
2541 dachEinst
2542 deckungBasis
2543 aufbauBasis
2544 BLECH_VORLAGE
2546 fn dachPlatte
2555 fn zeigeDachKoerper
2558 DACH_ARTEN
2560 fn dachBoxenGeo
2572 fn dachZiegelGeo
2581 fn dachBoxenKanten
2587 fn skizzenGrundriss
2592 gebaeudeUmriss
2594 deckungVon
2595 aufbauVon
2597 fn ebeneAktuell
2598 weltAkt
2599 dist3
2600 dachKoordinaten
2602 fn skizzenVieleck
2605 fn dachKoppeln
2626 fn lukarneKopplungSetzen
2633 lukarneSkizzenStand
2635 fn lukarneDachNeu
2644 fn lukarneKoppeln
2663 fn lukarneGeo
2675 fn skizzeAusFlaeche
2684 fn lukarneDachZuSkizzen
2693 fn dachAusSkizzen
2706 fn dachZuSkizzen
2713 fn dachErgebnis
2720 dachWelt
2722 fn dachPrisma
2731 fn wandPlatte
2739 fn eindeckungDialog
2746 fn lukarneDialog
2771 fn dachelementDialog
2786 fn dachblecheDialog
2798 fn gebaeudeDialog
2807 AUFBAU_ZAHLEN
2808 DECKUNG_ZAHLEN
2809 dachAufbauFelder
2810 dachDeckungFelder
2811 fn dachMasseUebernehmen
2820 fn dachDialog
2856 § Kanten-Werkzeug: Flansch / Umschlag / Kantenbaustein (erst Blech anklicken, dann die Kante)
2857 kantenWz
2858 kantenWzText
2859 fn kantenBarZeigen
2866 fn endeKantenWz
2867 kHoverWartet
2878 fn stirnErweiterungen
2881 fn profilErweiterungen
2884 istProfil
2885 fn kantenWert
2889 fn wendeProfilKante
2897 fn starteKantenWz
2906 fn kantenWzKlick
2914 fn wendeKantenWz
2928 fn kanteUmkehren
2935 fn kanteDialog
2958 fn flaecheDialog
3041 fn belegteKanten
3044 fn zeigeFlaechenteil
3063 fn flaechenblatt
3084 § Baustein-Editor: Abkantfolge als Tabelle mit Live-Querschnitt und Zugabe
3085 bEdit
3086 neuerBaustein
3088 fn bZeilen
3092 bText
3093 fn bausteinEditor
3098 fn bVorschau
3107 bFolgeOk
3108 fn zeigeBEditor
3143 bZeilenAusTabelle
3179 § Konstruieren: Achsen und Punkte (wie in Fusion)
3180 ACHSEN_ARTEN
3181 PUNKT_ARTEN
3182 v3n
3183 kreuz3
3184 skal3
3185 fn baueAchse
3200 fn bauePunkt
3213 fn achsenObjekt
3218 fn punktObjekt
3222 fn konstruktionDialog
3247 § Körper: Abrunden/Fasen, Schale, Muster, Spiegeln, Verschieben/Kopieren (wie in Fusion)
3249 fn eckenBearbeiten
3261 fn gerundeteExtrusion
3275 fn schalenWerkzeug
3287 koerperVon
3292 fn transformAus
3308 fn koerperTeilen
3326 fn koerperTransform
3345 koerperOpt
3346 KOERPER_WZ
3349 fn koerperDialog
3383 § Bild / PDF-Plan als Hintergrund (wie «Arbeitsfläche» in Fusion) und DXF in die Skizze
3384 bilder
3385 BILDTEX
3386 fn bildObjekt
3398 fn bildAusQuelle
3404 pdfjs
3405 fn pdfLaden
3412 fn bildEinfuegen
3432 fn bildDialog
3480 § Abrunden / Fasen an angeklickten Kanten (beliebige Volumenkörper, gerade Kanten zwischen ebenen Flächen)
3482 fn kantenInfo
3498 fn kantenWerkzeug
3523 fn kantenBearbeiten
3534 fn skizzenTreffer
3550 fn kanteAmKoerper
3572 fn kantenDialog
3597 § Kehl- und Gratblech zwischen zwei Flächen (gekantet, mit Abwicklung)
3599 fn flaechenEbene
3600 fn flaechenAusdehnung
3613 fn umkehren
3614 fn kehlBlech
3662 norm2
3663 fn schnitt2
3664 fn kehleDialog
3680 fn blechAufFlaeche
3694 fn blechAufFlaecheStart
3701 § Sweep und Loft (wie in Fusion)
3702 v3
3704 fn ringNetz
3715 fn deckel
3719 flaeche2
3720 fn sweepGeometrie
3749 fn loftGeometrie
3771 fn sweepDialog
3782 fn loftDialog
3794 § Parameter ändern (Fusion: Ändern → Parameter ändern)
3795 fn parameterDialog
3839 § Prüfen: Messen und Schnittanalyse (wie in Fusion)
3840 messen
3841 messGruppe
3843 fn messPunkt
3850 fn messMarke
3854 fn messKlick
3864 fn messenUmschalten
3873 schnitt
3876 kappen
3877 schraffur
3878 fn schraffurTextur
3885 fn zeigeKappen
3904 fn wendeSchnittAn
3937 § Planblatt (Zeichnung): Ansichten, Details, Bemassung, Schriftfeld
3939 fn abwicklungPlanAnsicht
3962 fn dachDetails
3969 fn dachDetailSvg
3976 fn dachAufsichtAnsicht
3988 fn skizzenPlanAnsicht
4012 plaene
4039 § Einstellungen: Materialien kalibrieren, Lagerformate
4040 entwurf
4042 PROBE_SKIZZE
4057 probeWerte
4058 meldung
4059 zahlen
4060 einstRegister
4061 EINST_REGISTER
4063 fn einstFeld
4070 fn zeigeEinst
4208 fn etikettenPruefen
4212 fn probe
4239 fn einstWert
4249 fn einstLaden
4335 § Hilfe
4336 hilfe
4351 § Ansichten
4352 fn fitte
4359 alleBox
4360 fn ansicht
4368 § Skizzieren
4369 skizze
4371 WERKZEUGE
4415 ABH_NAME
4417 GLYPHE
4418 GRUND
4419 KNOPF_MENUE
4428 braucheEingabe
4429 fn eingabeBeschriften
4433 fn setzeWerkzeug
4447 fn loescheSkizzenAuswahl
4454 fn hilfslinieUmschalten
4459 fn starteSkizze
4483 § 2D-Modus: nur Skizzen/Zeichnung, Körper ausgeblendet, Layer-Leiste, DXF-Ausgabe
4484 modus2d
4485 fn layerZeigen
4517 fn zeichnungObjekte
4529 fn schalte2D
4542 fn beendeSkizze
4560 strahl
4561 fn ndc
4562 fn bildschirm
4563 fn fangPunkte
4567 FANGNAME
4568 kantenCache
4569 fn koerperKantenCache
4574 fn koerperFang
4587 fn skizzenFang
4601 FANGGLYPHE
4603 fangArtZuletzt
4604 fn fangZeigen
4611 fn ebenenPunkt
4628 abst
4629 abstandZurGeraden
4630 rechteckMitte
4631 rechteckEl
4632 rechteckM
4633 rechteck3Bed
4634 polygonBed
4636 fn erstelle
4652 fn klick
4722 § Ändern: Abrunden, Versatz, Spiegeln, Stutzen
4723 zuLinienzug
4729 fn trefferEcke
4737 fn abrunden
4747 fn versatzVorschau
4780 fn versatzKlick
4790 fn trefferStrecke
4795 fn spiegelnKlick
4807 schneidKanten
4808 fn stutzen
4814 fn stutzeLinie
4839 fn stutzeBogen
4861 § Dehnen, Trennen, Verschieben/Kopieren/Drehen, Muster, Projizieren
4862 REF_FELDER
4863 refsVon
4865 lageGebunden
4867 fn transformiere
4872 fn bewege
4891 dreher
4892 fertigMehr
4893 fn verschiebeUm
4899 fn dreheUm
4901 fn mehrfachKlick
4914 fn musterDialog
4935 fn aufBogen
4936 fn dehnen
4958 fn trennen
5002 umschaltAn
5004 fn flaechenRand
5014 fn teileAnEcken
5027 fn projizieren
5071 fn abschliessenLinie
5078 fn eingabeAnwenden
5120 § Bemassung und Auswahl
5121 gleich
5122 drehung
5128 RAD
5129 grad
5130 fgText
5132 fn uebernimm
5137 fn entferneBed
5143 fn massAendern
5163 fn bezuege
5180 projektion
5181 mitte
5183 fn waehleGeo
5208 fn wahlKlick
5222 fn abhAusWahl
5244 fn massFuerWahl
5296 fn massEingabe
5316 fn zugZiele
5322 fn segmente
5326 fn trefferElement
5336 fn trefferPunkt
5353 labels
5354 fgCache
5355 fn analyseGecacht
5364 fn zeichneLive
5470 fn zeigeLabels
5489 § Maus und Tastatur
5490 runter
5493 planUV
5494 smPos
5576 § Werkzeugleiste
5577 fn neueSkizze
5599 umformLetzt
5600 umformWerte
5601 fn umformDialog
5636 § Werkzeugleiste: Klappmenüs (fest positioniert, die Leiste rollt seitlich)
5637 leiste
5638 fn klappZu
5663 fn leisteZustand
5698 letzteVariante
5713 projektPfad
5715 ZULETZT
5716 zuletzt
5717 fn merkeDatei
5722 fn titel
5726 fn projektSpeichern
5732 fn ladeProjekt
5740 fn projektOeffnen
5747 § Konto & Cloud (Spengler-Digital-App)
5748 fn setzeAuftrag
5749 cloud
5762 projekte
5765 ablage
5768 fn auftragAnzeige
5777 § 3D-Detailvorlagen (STEP-Körper mit Ankerkante, ersetzen die .f3d-Vorlagen des Add-ins)
5778 DETAILMESH
5779 fn detail3dDialog
5796 fn detailAusDatei
5809 § Exakter CAD-Kern (Beta): OpenCascade im Web Worker (kern/cad)
5812 cadK
5813 kernAn
5814 fn kern
5822 fn kernAnzeige
5826 kernFehlerText
5828 fn exaktKoerper
5834 fn stepExakt
5839 fn pruefe3D
5855 exaktLauf
5857 regenStand
5858 exaktPlanen
5861 planAus
5862 fn exakteAnsicht
5894 fn ersetzeNetz
5903 fn exaktesModell
5932 regen-Zweig extrusion
5945 regen-Zweig kanten3d
5951 regen-Zweig schale
5959 regen-Zweig teilen
5976 regen-Zweig flaeche
5984 regen-Zweig rundblech
5993 regen-Zweig detail3d
6045 fn zeigeEigenschaften
6063 § Austausch: STEP/STL exportieren, STEP/STL importieren
6064 fn sichtbareKoerper
6071 dateiBasis
6072 fn exportiere
6078 occt
6079 fn occtLaden
6089 fn importFeature
6097 fn importiereDatei
6153 neuBestaetigt
6160 § Start
6203 neueVersionGemeldet
6204 fn pruefeNeueVersion

## src/cloud.js
7 KEY
8 lies
9 schreibe
11 fn cloudModul

## src/kontext.js
5 api
6 knopf
7 KOERPER
8 BLECH
10 A
11 F
12 fest
14 fn aktionenFuer
59 fn symbol
60 fn verfuegbar
62 fn zeichne
76 fn initKontext
80 kontextAktionen

## src/meldungen.js
3 box
4 fn zeigeMeldung

## src/plan.js
6 FORMATE
7 PLAN_MASSSTAEBE
8 z
9 esc
12 § Schnitt: Körper an der Ebene d·p = lage abschneiden (Blick von +d), Schnittflächen
13 csg
14 nurPos
15 fn geschnitten
31 fn schnittFlaechen
57 fn imKreis
65 fn planModul

## src/projekte.js
5 fn projekteModul

## kern/abwicklungRund.js
6 RAD
9 fn zylinderAbwicklung
17 fn kegelAbwicklung
29 fn abwickelbarkeit
39 fn rundblechAbwicklung
66 fn rundblechSvg
83 fn rohrSchraeg

## kern/auftrag.js
4 fn stueckliste
26 fn stuecklisteCsv

## kern/ausdruck.js
7 FUNK
12 EINHEIT
13 NAME
15 fn zerlege
32 fn rechne
72 istZahl
73 fn namenIn
76 fn parameterWerte

## kern/bedingungen.js
5 dx
6 lang
7 kreuz
8 skal
9 wickel
11 abstandGerade
12 winkelZwischen
14 GL

## kern/cad/ansichtExakt.js
8 kreuz
9 norm
10 dot
11 fn kameraAchsen
17 segmente
20 fn abstand
26 fn ohneDeckungsgleiche
31 fn ansichtAusProjektion
58 fn kettenAusKanten
78 fn kreiseAusLinienzuegen

## kern/cad/blech.js
6 fn blechQuerschnitt
28 fn verschiebeProfil
32 profilGrenzen
38 blechExtrusion
40 zuschnittAusVolumen

## kern/cad/featureBau.js
12 kreuz
13 dot
16 fn kernEbene
24 fn blechTeilKommando
36 fn extrusionKommandos
43 fn rotationKommandos
53 fn extrusionsHoehen
60 fn extrusionsKanten
67 fn extrusionsFlaechen
72 matrixZeilen
74 § Flächenblech mit Kantenbausteinen (exakt)
77 fn bausteinQuerschnitt
89 mal
94 basisMatrix
99 fn flaechenblechPlan
127 fn baueFlaechenblech

## kern/cad/klient.js
8 fn cadKlient

## kern/cad/occt.js
8 fehl
9 norm
10 kreuz
11 vec
14 fn kreisMitte
20 fn occtKern

## kern/cad/schnittstelle.js
50 SCHNITTSTELLE_VERSION
52 CODES
75 TOLERANZ
77 zahl
78 punkt
79 fehler
82 fn pruefeKommando

## kern/cad/skizzeProfile.js
9 auf
10 gleich
13 fn linienzug
39 fn splineSegmente
53 fn elementPfad
62 fn elementProfil
81 fn kettenProfil
99 fn profilPolygon
121 flaeche
122 fn innen
130 fn skizzenProfile

## kern/cad/topologie.js
8 r
9 rp
10 abst
13 fn flaechenSignatur
16 fn kantenSignatur
25 fn abweichung
43 fn aufloesen

## kern/cad/worker.js
7 laden
10 fn puffer

## kern/cloud/abgleich.js
6 PRAEFIX
7 fn sha256
11 sortiert
13 pruefsumme
14 schl
15 kurz
19 fn abgleichen

## kern/cloud/ablage.js
3 HAUPT
4 SCHLECHT
5 ordnerName
6 dateiName
8 projektOrdnerName
9 fn ordnerPlan
14 fn findeProjektOrdner
22 fn zuordnung
28 fn baum
34 modellDateiName

## kern/cloud/appformat.js
4 fn zeilenAusSchenkel
7 fn schenkelAusZeilen
9 fn teilFuerApp

## kern/cloud/client.js
3 URL_STANDARD
4 SCHLUESSEL_STANDARD

## kern/cloud/projekte.js
2 STATUS
3 norm
6 fn pruefeProjekt
16 fn suche
21 modellFelder
23 geaendert

## kern/cloud/spiegel.js
7 leererSpiegel
8 norm
9 gleichB
10 gleichM
13 fn einstInSpiegel
39 fn loescheImSpiegel
46 fn spiegelInEinst
65 fn spiegelSpeicher

## kern/dach/bleche.js
4 sub
5 cross
6 BLECHARTEN
9 fn kantenListe
15 fn ueberlapp
21 punktBei
23 fn querWinkel
28 fn verschmelze
45 fn dachSegmente
74 fn dachBleche

## kern/dach/detail.js
4 FARBEN
5 z
6 DETAILARTEN
9 klippX
12 fn dachSchnitt
58 fn dachSchnittSvg

## kern/dach/eindeckung.js
7 sub
9 fn abziehenKlein
14 ccw
17 fn eindeckung
43 fn ziegelPrisma

## kern/dach/elemente.js
6 VELUX_BREITEN
7 VELUX_HOEHEN
8 BESTAETIGT
9 veluxListe
10 ELEMENTARTEN
12 innenPunkt
14 fn elementRechteck
20 fn elementKoerper
29 elementFlaeche
31 fn kaminBleche

## kern/dach/flaechen.js
5 sub
6 area2
7 links
10 fn zerlegeKonvex
46 fn flaecheAus
62 fn dachAusFlaechen

## kern/dach/fluegel.js
5 EPS
7 GRUNDFORMEN
9 fn grundrissForm
18 ebeneVon
19 hoehe
20 flaechePoly
21 gleich
23 kantenEbenen
24 inHuelle
26 fn abziehen
36 fn kantenHaupt
37 fn kantenQuer
39 fn fluegelDach
86 gegenUhrzeiger
87 fn konvex
88 fn polygonDach

## kern/dach/form.js
5 rad
6 flaecheVon
7 gegenUhr
10 fn beschneide
19 schnittGerade
25 fn dachFlaechen
66 fn waende
79 fn rechteckDach
88 DACHFORMEN

## kern/dach/koerper.js
4 sub
5 cross
6 norm
9 fn flaechenSystem
20 fn intervall
29 spanne
30 flaecheEbene
33 fn flaechenRahmen
38 fn flaechenKoerper
99 fn dachMengen

## kern/dach/lukarne.js
6 rad
7 LUKARNENARTEN
8 innenPunkt
11 fn lukarne

## kern/dach/lukarneAufmass.js
7 rad
8 sub
9 cross
10 innenPunkt
12 fn ebene3
16 hull
21 fn rahmen
26 fn aufmassAusPunkt
31 fn lukarneAufmass

## kern/dach/vorlagen.js
3 DECKUNGEN_STANDARD
8 AUFBAU_STANDARD
12 grundeinstellung
14 fn schichten
28 fn pruefeDach
34 lattenAnzahl

## kern/details.js
8 § Abkantfolge als Kurzschrift
11 fn folge
31 folgeText
39 Z
40 rechteck
41 rad
42 teil
43 holz
44 mass
46 § Vorlagen
48 ROLLEN
50 DETAILS
181 DETAIL
182 detailStandard
183 rollenVon
187 fn baueDetail
204 teilKontur

## kern/dxf.js
8 fn teil
37 fn abwicklungDxf
45 fn flaeche
54 fn flaecheDxf
62 fn abwicklungenDxf
70 fn ascii
76 fn rundblechDxf

## kern/dxflesen.js
4 FAKTOR
7 fn paare
13 fn objekte
21 wert
22 alle
25 fn bulgeBogen
34 fn polylinie
48 fn bspline
63 fn dxfLesen

## kern/ebenen.js
7 plus
8 minus
9 mal
10 punkt
11 kreuz
12 laenge
13 einheit
14 rad
15 vek
18 fn drehe
24 fn ebeneAus
36 BASIS
41 ACHSEN
43 zuWelt
44 zuLokal
47 versetzt
50 fn unterWinkel
59 fn mittelebene
71 fn zweiKanten
84 fn dreiPunkte
91 fn tangential
100 fn entlangPfad
113 aufFlaeche

## kern/flaechenblech.js
14 BAUSTEINE_STANDARD
34 X
35 fn bausteinProfil
51 fn profilLage
66 xBei
70 fn eckFaktor
74 innenPoly
77 fn intervalle
83 fn streifenSchnitt
94 fn treffer
112 fn schraegSchnitt
132 UEB
133 fn eckSchnitt
148 knick
149 richtung
150 fn eckFaktoren
161 sub
162 len
163 flaeche
164 gegenUhrzeiger
167 fn kantenGruppen
185 schnitt
189 fn lappenLinie
198 fn abwicklung
225 fn plattenUmriss
234 fn flaechenblech
240 § -
243 fn profilPunkt
263 fn faltePunkt
281 fn ausschnittWerkzeug
329 fn ausschnittKante

## kern/flansch.js
4 zahl
5 fn werkzeugAuf
12 flanschStandard
13 werkzeugName
17 fn folgeUmkehren
25 folgeAnhaengen

## kern/geometrie.js
15 rad
17 fn rueckversatz
25 fn berechne
96 fn polylinie
116 fn versatzLinie
129 fn grenzen
137 fn kontur

## kern/loeser.js
6 rest
7 quadsumme
8 groesster
11 fn jacobi
29 fn lgs
42 fn loese
73 fn freiheitsgrade

## kern/materialien.js
5 MATERIALIEN
15 TAFELN
16 COIL
17 SPALTBAENDER
19 LAGER
22 fn quelle
33 fn kFaktorAusProbe

## kern/profile.js
5 L
6 B
7 HEM
8 ARC
10 fn traufe
21 fn ortgang
35 fn first
45 fn wandanschluss
54 fn kappleiste
63 fn abdeckung
73 fn haengerinne
79 fn kastenrinne
91 fn kehle
101 fn fensterbank
114 VORLAGEN
150 VORLAGE
152 fn standardwerte
158 fn freiesProfil
171 fn alsZeilen
189 bend
191 erweiterungsOps
192 fn profilErweitern

## kern/regionen.js
4 EPS
5 kreuz2
6 flaecheVon
7 punktInPolygon
16 inRegion
19 fn innenpunkt
38 fn regionen

## kern/richtung.js
2 rueckVersatz
5 zweiseitig
11 laengeVon

## kern/selbsttest.js
12 M
13 fn selbsttest

## kern/sicherung.js
2 kopie
3 gleich
6 fn sichere
11 fn geloeschte
15 fn inPapierkorb
20 fn zurueckholen
26 einspielen

## kern/skizze.js
5 abst
6 winkelVon
7 norm2pi
8 auf
11 fn kreisDurch3
20 fn bogenDaten
26 fn bogenPunkte
33 fn bogenAusMitte
38 kreisPunkte
41 fn polygonPunkte
46 fn rechteck3
52 fn langlochPunkte
60 fn abrundung
79 fn rundePolylinie
91 fn versatzPolylinie
108 fn spiegelPunkt
115 fn schnittStrecken
123 fn schnittStreckeKreis
133 fn verbindeStuecke
163 fn splinePunkte
183 fn ellipsePunkte

## kern/skizzenloeser.js
11 ABH
12 IST_MASS
15 fn sichereIds
20 neueElementId
23 fn vorbereiten
39 rechteckBedingungen
42 fn punkte
55 kantenZahl
58 fn modell
93 fn gleichung
106 fn uebersetze
139 fn festeVariablen
147 fn bereinige
154 fn system
163 fn schreibe
187 fn loeseSkizze
215 fn analyse
225 fn fuegeHinzu

## kern/step.js
6 zahl
7 text
9 vek
10 kreuz
11 punkt3
12 norm
14 fn brep
79 fn stepDatei
124 fn stlDatei
141 fn stlLesen

## kern/stirnflansch.js
9 hyp
12 fn schenkelBereiche
21 verschiebe
25 fn stirnLaschen
42 fn abwicklungUmriss
54 fn laschenBiegelinien

## kern/umformung.js
6 VERFAHREN
7 rad
9 fn tangentialeDehnung
13 fn scheibeMitRand
19 fn kragen
26 fn kegelstumpf
33 fn beurteilen
55 fn zuschnitt
72 fn zuschnittDxf

## kern/vorlagen/detail3d.js
6 norm
7 kreuz
11 fn kantenLage
21 anwenden
24 fn detailAusStep
32 fn pruefeDetail
43 meshAusVorlage

## kern/vorlagen/kurzschrift.js
6 WINKEL
7 zahlOderAusdruck
10 fn zerlege
26 txt
27 negativ
29 fn alsText
37 fn aufloesen

## kern/vorlagen/modelle.js
5 SCHEMA
6 KATEGORIE_OHNE
7 TYPEN
9 jetzt
10 hex
11 neueId
12 kopie
14 parameter
16 operation
18 fn neueKantenvorlage
28 fn neueDetailvorlage
39 fn neuesMaterialprofil

## kern/vorlagen/parameter.js
6 ZAHL_TOKEN
7 hatAusdruck
8 RESERVIERT
11 fn bausteinWerte
17 fn bausteinFolge
22 fn pruefeEignung
38 fn parameterText
39 fn parameterAusText

## kern/vorlagen/wandler.js
10 fn bausteinZuVorlage
21 fn vorlageZuBaustein
30 fn materialZuProfil
39 profilZuMaterial

## kern/zeichnung.js
5 z
6 esc
9 fn profilSvg
69 fn abwicklungSvg
96 svgNr
99 MASSSTAEBE
100 fn passenderMassstab
104 fn detailSvg
148 fn zuschnittSvg
172 fn bausteinPunkte
178 bausteinGrenzen
180 fn bausteinSvg

## kern/zeichnung2d.js
3 FARBEN
7 LINIENARTEN
11 farbeHex
12 standardLayer
13 ascii
14 lname
18 fn skizzenDxf

## kern/zuschnitt.js
8 fn tafelnBelegen
25 fn materialbedarf
