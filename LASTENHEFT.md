# Lastenheft - Fehlerpunkte-Eingabemasken (Motorbootslalom)

Version 0.3 · Konzept-Prototyp · Stand 2026-11

Dieses Dokument beschreibt die Anforderungen an die digitalen Eingabemasken
für die Wettkampfrichter-Listen (WKR-Listen) beim Motorboot-/Schlauchboot­slalom.
Es dient der Abstimmung mit den Fachteams und als Grundlage für die spätere
Umsetzung im Auswertungstool. Der beiliegende Prototyp setzt die hier
beschriebenen Punkte beispielhaft um.

---

## 1. Ausgangslage

- Die WKR-Listen werden bisher **mit Excel** erzeugt und als PDF gedruckt
  (siehe Ordner `alte PDF-Listen/`).
- **Großer Vorteil der bisherigen Lösung:** Ausdruck (PDF) und Eingabe erfolgen
  in **derselben Maske/Ansicht**. Dadurch ist eine **Kontrolle der Eingaben
  extrem einfach** - man sieht Formular und eingetragene Werte gleichzeitig.
- Nachteil: Excel ist umständlich, fehleranfällig, nicht scanner-/tabletfähig
  und rechnet Ergebnisse nur eingeschränkt zusammen.

## 2. Ziele

1. **Eingabe = Ausdruck.** Die Bildschirm-Eingabemaske ist optisch identisch mit
   dem gedruckten Bogen (WYSIWYG). Die einfache Kontrollierbarkeit bleibt erhalten.
2. **Automatische Summenbildung.** Fehlerpunkte werden pro Zeile hinten
   zusammengerechnet (Σ-Spalte). Bei Schikane / Mann-über-Bord liegt die
   Ergebnisspalte bewusst **etwas mittig**.
3. **Disqualifikationen verorten.** In den Tor-Spalten können auch
   Disqualifikations-Codes eingetragen werden, damit auf der (nicht zum Prototyp
   gehörenden) Ergebnisseite sichtbar ist, **wo und warum** disqualifiziert wurde.
4. **Druck / PDF.** Die Bögen lassen sich per Knopfdruck als PDF ausgeben und
   drucken.
5. **Scanner-Vorbereitung.** Die Bögen tragen maschinenlesbare Codes (QR), damit
   sie später automatisch der richtigen Position, Klasse und Lauf zugeordnet
   werden können.
6. **Schnelle Zeiteingabe** über das Numpad, robust gegenüber verschiedenen
   Stoppuhr-Anzeigen.

## 3. Aufbau eines Bogens

Jeder Bogen ist eine A4-Seite (Knoten: Querformat) und besteht aus:

- **Kopf:** Veranstaltungstitel, QR-Code, links gestapelt Listentyp / Klasse /
  Lauf, rechts das WKR-Feld. Am Bildschirm zeigt es einen Platzhalter, im Druck steht
  die Bezeichnung klein unter der Linie, damit sie nicht wie ein Eintrag wirkt.
- **Tabelle:** eine Zeile je Startnummer (Startreihenfolge), plus einige leere
  Zeilen. Spalten je nach Listentyp (siehe §4).
- **Fuß:** Legende (Fehlercodes mit Punkten, Disqualifikations-Codes des Regelwerks),
  ggf. Parcoursbild, Unterschriftszeile „Unterschrift WKR“ mit genug Platz zum
  Unterschreiben darüber (ca. 1 cm).

## 4. Aufbauten & Listentypen (Stationen am Parcours)

> **Konfigurierbar:** Positionen, Spaltenreihenfolge und Fehlerpunkte sind
> datengetrieben (YAML, siehe §12a). Fehlerpunkte/Disqualifikationen kommen aus
> der Ausschreibung (`regelwerke/<id>.yaml`, je Regelwerk und Version); die
> Positionen sind orts-/personenabhängig (`aufbauten/*.yaml`).

**Aufbauten (Setups)** bündeln die bei einem Wettkampf genutzten Positionen. Beim
Start wird ein Aufbau gewählt:

- **Alcatraz** (Standard, WKR-Blick von **hinten**): Zeit · Vorsteg · Steg · Tore 1/3/5 ·
  Tore 2/4/5 · Tor 5 · Mann-über-Bord · Parcours.
- **Alcatraz-DM26:** wie Alcatraz mit drei Zeit-Listen. Start und Ziel stehen nicht auf
  den Tor-Listen, sondern auf der Parcoursliste.
- **Frontal** (gleiche Bojen, Blick vom **Start/Ziel** = von vorne): Zeit · Steg ·
  Tore 1/3/5 · Tore 2/4/5 · Tor 5 · Mann-über-Bord · Parcours, Tor-Blätter gespiegelt;
  das Parcoursbild ist entsprechend gedreht.
- **Berlin** (vier feste WKR-Positionen rund um den Kurs): Steg · Start/Ziel (Zeitnahme
  + Start-/Zieltor-Bojen) · Rechts (Tor 1/3 + Mann-über-Bord) · Links (Tor 2/4/5 mit
  Einfahrt Tor 5 + Speedbojen). Das Bild steht neben der Legende, nicht beobachtete
  Elemente sind abgeblendet. Bei „Rechts“ liegt Start/Ziel links im Bild, bei „Links“
  (um 180° gedreht) rechts, so wie der WKR den Kurs von seiner Seite sieht. Bei „Links“
  fehlen deshalb die Ziffern im Bild, „Tempo-Runde“ steht dort kopfüber.
- **Baden-Württemberg** (Blick von den Seiten): Zeit · Steg · Land 1 · Land 2 ·
  Wasser 1 · Wasser 2 · Knoten.
- **Parallelslalom** (Beispiel): Zeit · Steg · Parallel-Parcours.

In Aufbauten mit Tor 5 und Parcoursliste kann **eine Person beides übernehmen** (Option
„Tor 5 übernimmt die Parcoursüberwachung“, §12a).

Mitgelieferte Positionen (Auszug, Aufbau Alcatraz):

| Typ | Kopf-Titel | Spalten (nach Nr.) | Σ | Bild |
| --- | ---------- | ------------------ | :-: | :-: |
| Tore 1/3/5 | Tor 1 / 3 / 5 | Start · Tor 1 · Tor 3 · Tor 5 · Tor 3 · Tor 1 · Ziel (je Bojenspalten mit Fahrtrichtung/Seite) · Disq. · Σ | ✓ | alcatraz_I (generiert, §4b) |
| Tore 2/4/5 | Tor 2 / 4 / 5 | analog mit Toren 2/4/5, dazu **Speedbojen (je Klasse, §4a)** | ✓ | alcatraz_II (generiert, §4b) |
| Tor 5 | Tor 5 | Fehler · Σ · Disq. · Bemerkung | ✓ | - |
| Tor 5 + Parcours (Option) | Tor 5 + Parcours | Fehler · Disq. · **Σ** · Bemerkung (Alcatraz-DM26: davor Start · Ziel) | ✓ | alcatraz_Parcours |
| Mann-über-Bord | Mann-über-Bord | Fehler · Fehlerpunkte · **Σ (mittig)** · Disq. · Bemerkung | ✓ | mueb (generiert, §4b) |
| Steg | Steg | Fehler AB · F-Pkt. AB · Fehler AN · F-Pkt. AN · Disq. · Bemerkung | (je Gruppe) | - |
| Vorsteg (an Land, vor dem Steg) | Vorsteg | Disq. · Bemerkung | - | - |
| Zeit | Zeit | Zeit 1 · Zeit 2 · Zeit 3 | - | - |
| Knoten (quer, **ohne Lauf**) | Knoten | Webleinstek · Schotstek · Palstek · Kreuzknoten · Klampe · Σ · Bemerkung | ✓ | - |
| Parcours einfach | Parcours | Bemerkung · Disq. | - | alcatraz_Parcours |
| Parcours mit Start und Ziel | Parcours | Start · Ziel · Bemerkung · Disq. | - | alcatraz_Parcours |

**Bojen-Beschriftung** an den Tor-Spalten: zwei Zeichen = **Fahrtrichtung**
(`H` = Hinfahrt, `R` = Rückfahrt) + **Seite**. Die Seiten-Kürzel sind global und
**auf der Seite umschaltbar** (§12a): R/L (Rechts/Links, Standard), L/S (Land/See),
S/L, K/H (Kai/Hafen), **Pfeile** (→/←) oder **Innen/Außen** (I/A). Beispiel
Standard: `H R` = Hinfahrt Rechts, `R L` = Rückfahrt Links.

## 4a. Klassenabhängige Spalten & Blätter

Umfang und Spalten der Listen hängen von **Klasse** (und Aufbau) ab:

- **Speedbojen:** keine bis Klasse 4, **Speed 1** ab Klasse 5, **Speed 2** nur bei
  Klasse 7. Bei Alcatraz steht Speed 1 auf den Toren 2/4/5 und Speed 2 auf den Toren
  1/3/5, bei Berlin beide auf „Links“, bei Baden-Württemberg Speed 1 auf Wasser 2 und
  Speed 2 auf Land 2. In den Parcoursbildern erscheint Speed 2 nur
  bei den Klassen, deren Route um sie herumführt (`Klasse7`, `Klasse7_rc1`, `Klasse7_rc2`).
- **Tor 1 auf der Rückfahrt:** nicht bei Klasse 4; Klasse 7 fährt zweimal durch.
- **Mann-über-Bord:** erst **ab Klasse 4**. Als eigenes Blatt (Alcatraz) wird es
  für Klasse E-3 gar nicht erzeugt; als Spalte (Berlin „Rechts") entfällt es dort.
- **Legende je Klasse:** Hat eine Klasse keine Fehler-Spalte, entfallen auf ihrem Bogen
  auch die Fehlerpunkte, der Hinweis dazu und die MüB-Buchstaben L und Q.
- **Klassen je Regelwerk:** Die DM kennt E und 1-7, die UIM E (Dolphin) und 1-5.
- **Tor-Bojen bleiben immer vollständig** (beide Bojen je Tor, in jeder Klasse).
  In den Alt-Listen führte Klasse E nur die Außenbojen - im neuen System bleiben
  bewusst beide erhalten (innere Berührungen werden dort vermerkt und gewertet).

Technisch: Spalten und Positionen tragen optional `klassen: [...]` (fehlt = alle).
Ein Bogen gilt genau einer Klasse, daher wird pro Blatt gefiltert; die
Schnellauswahl lässt nicht passende Klassen aus.

## 4b. Parcoursbilder: automatische Hervorhebung

Statt für jede Tor-Position ein eigenes Bild von Hand zu malen (früher
`alcatraz_I` für Tore 1/3/5, `alcatraz_II` für 2/4/5), wird aus **einer** sauberen
Quelle (`alcatraz_Parcours`) je Position das passende Bild **beim Build erzeugt**.

- **Master der Parcoursbilder** ist `Motorbootslalom/Parcours/parcours.svg`. Ihr
  `make` (`split.py`) exportiert nach `dist/alcatraz_Parcours`; SVG und PNG von dort
  werden nach `public/parcours/alcatraz_Parcours` kopiert. Änderungen, auch an IDs,
  gehören in den Master, nicht in die Kopie.
- Jedes Bild-Element hat eine stabile, sprechende `id` (`Tor1`…`Tor5`, `StartZiel`,
  `Speedboje_oben`, `Speedboje_unten`, `Schikane`, `Zeitnahme`, `Zeit_oben`, `Zeit_unten`,
  `Zeit_oben_Flagge`, `Zeit_unten_Flagge`, `Nummer_Tor1`…`Nummer_Tor5`,
  `Nummer_Schikane`, `Nummer_Speedboje_oben`, `Nummer_Speedboje_unten`), über alle Klassen
  identisch. Nur `Speedboje_unten` und seine Nummer fehlen in den Klassen ohne Speed 2.
- An den Positionen markiert das Spalten-Feld `hebt: Tor1` die im Bild
  **hervorzuhebenden** Tore. Die übrigen Tore werden mit reduzierter Deckkraft
  (opacity) abgeblendet. **Fahrweg und Zeitnahme bleiben zur Orientierung immer
  sichtbar**, alles andere nur, solange es nicht in `abblenden` steht. Weil `hebt` an der Spalte hängt, wandert die Hervorhebung beim
  Kopieren einer Spaltenzeile automatisch mit.
- Alternativ/ergänzend blendet eine Positions-Liste `abblenden: [Tor2, Tor4]`
  gezielt Elemente ab (Fallback, falls keine Spalte `hebt` nutzt). `ausblenden` macht
  Elemente ganz unsichtbar; das nutzt Berlin „Links“ für die Ziffern.
- **Einzelne Bojen** sind ebenso ansprechbar wie ganze Tore: Tor 5 (`Tor5_oben` /
  `Tor5_unten`), die beiden Start/Ziel-Bojen (`StartZiel_oben` oben / `StartZiel_unten`
  unten) und die beiden Speedbojen (`Speedboje_oben` oben / `Speedboje_unten` unten).
  Damit zeigt jede Position genau die **beobachtete Hälfte**: bei Alcatraz z. B.
  Tore 1/3/5 nur die untere Boje von Tor 5 und Start/Ziel, bei Baden-Württemberg
  je Land-/Wasser-Seite die passende Einzelboje jedes Tores.
- Auch die **Baden-Württemberg**-Positionen (Land 1/2, Wasser 1/2) und die
  **Berlin**-Positionen werden so aus `alcatraz_Parcours` erzeugt (`bawue_Land_1` …
  `bawue_wasser_2`, `berlin_startziel`, `berlin_rechts`, `berlin_links`).
- Der Schalter `bildGenerator: true` aktiviert die Erzeugung; `bild` ist dann der
  **Ziel**-Ordner, `bildQuelle` der Quell-Ordner (Default `alcatraz_Parcours`).
  Ohne den Schalter zeigt `bild` weiter auf ein festes fertiges Bild - **beides
  funktioniert parallel**.
- Erzeugt werden je Klasse eine gedimmte **SVG** (Bildschirm) und ein **PNG**
  (für den Vektor-PDF-Druck, der kein SVG einbetten kann). Skript:
  `npm run parcours:build` (Teil von `npm run build`).

## 5. Fehlerpunkt-Berechnung

- **Bojenspalten (Tore, Knoten):** der WKR trägt die **Punkte direkt** ein
  (5, 10, 15 …), nicht die Anzahl der Berührungen. Beispiel: „10“ an Tor 1 H R
  = 10 Punkte.
- **Fehlercode-Spalten (MüB, Steg, Tor 5):** der WKR trägt die Fehlernummer(n)
  laut Legende ein (kommagetrennt möglich). Die Punkte werden automatisch aus der
  Fehlertabelle summiert und in die zugehörige Punkte- bzw. Σ-Spalte geschrieben.
  Beispiele: MüB „13, 17“ → 10 · Tor 5 „1“ → 20 · Steg AN „9, 12“ → 20.
- **Steg getrennt (Ablegen/Anlegen):** „Fehler AB“ und „Fehler AN“ haben je einen
  eigenen Katalog und lassen **nur ihre eigenen Codes** zu (Ablegen 3-6, Anlegen
  7-12 und 23); die Legende zeigt beide Blöcke sauber getrennt nebeneinander.
- **Kombinierbar:** Getrennte Punkte der Ausschreibung sind je ein Code und lassen
  sich kombinieren (MüB „14, 18“ → 10), eine gemeinsame Zeile ist ein Code (MüB 15
  → 5). Mehrfachnennungen zählen mehrfach und stehen als „2x6“ (2. und 3. Versuch: → 10;
  auch „6, 6“ wird so geschrieben). Das X zwischen zwei Zahlen ist der Faktor, allein
  bleibt es der Disq-Buchstabe. Die Legende weist darauf hin.
- **Disqualifikation in einer Fehler-Spalte:** ein Disq-Buchstabe in einer
  Fehlercode-Spalte zählt als Disqualifikation an dieser Stelle (wie in den
  Bojenspalten) und wird in die Disq-Spalte übernommen.
- **Σ** = Summe aller Bojen-, Code- und Punktebeiträge einer Zeile, laufend
  aktualisiert.

Fehlertabellen der DM 2026 (die UIM 2026 weicht ab, siehe
`regelwerke/uim-2026.yaml`):

- **Tor 5:** 1 = nicht mit gesamter Länge eingefahren (20) · 2 = Durchreißen der
  Schaltung / erst ab Klasse 4 (5) · 20 = 2. und 3. Versuch (5).
- **Ablegen (Steg):** 3, 4, 5, 6 = je 5.
- **Anlegen (Steg):** 7, 8, 10, 11, 23 = je 5 · 9, 12 = je 10.
- **Mann-über-Bord:** 13-19 = je 5.
- **Knoten:** 5 pro fehlerhafter Knoten.

Alle Codes, Strafen und Disqualifikationen eines Regelwerks lassen sich als
**A4-Legende** drucken bzw. als PDF speichern („Nur Legende drucken / Als PDF“).

## 6. Disqualifikation

- Jedes Regelwerk hat eine eigene Code-Tabelle, je Punkt der Ausschreibung ein
  Buchstabe (DM 2026: **A-N, P-R, X**; das O entfällt wegen der Verwechslung mit
  der 0). Auf jedem Bogen stehen als Legende die Buchstaben seines Bereichs.
- Disqualifikation kann eingetragen werden
  - in der eigenen **Disq.-Spalte** der Zeile **oder**
  - **direkt in einer Tor-/Bojenspalte** (Buchstabe statt Zahl). So ist die
    genaue Stelle dokumentiert (z. B. „G an Tor 3 H R“).
- Für die Ergebnisseite (nicht Teil des Prototyps) stehen damit **Ort und Grund**
  der Disqualifikation strukturiert bereit.
- **Eingabehilfe:** Disq-Eingaben werden automatisch groß geschrieben; es sind
  **nur Codes zulässig, die in der Legende stehen**. Mehrere Codes mit
  Komma und/oder Leerzeichen; die Anzeige normalisiert einheitlich auf „A, B".

## 7. Zeiteingabe

Es existieren verschiedene Stoppuhren: manche zeigen `mm:ss,00`, manche `ss,00`.
Die Eingabe muss **sehr schnell über das Numpad** möglich sein und beide Formate
abdecken.

**Regeln** (eine Zahl mit Trenner - Komma **oder** Punkt, je nach Layout):

- Zahl vor dem Trenner **> 20** → es sind **Sekunden**, danach **Hundertstel**.
  Beispiel `45,67` → 0:45,67.
- Zahl vor dem Trenner **≤ 20** → es sind **Minuten**, danach **Sekunden +
  Hundertstel** (`mm,ssHH`). Beispiel `1,2345` → 1:23,45.
- **Enter** übernimmt und springt ins nächste Zeitfeld.
- Nach Verlassen des Feldes normalisiert die Anzeige auf **`mm:ss,00 (ss,00)`**
  (Uhrzeit- und reine Sekundendarstellung zugleich), z. B. `01:23,45 (83,45)`.

Intern wird jede Zeit als Hundertstelsekunden geführt, damit gerechnet werden kann.

## 7a. Zeilen & Seitenumbruch

- Nach den Startnummern folgt eine **einstellbare Anzahl leerer Zeilen**
  (Standard **3**) für Nachmeldungen.
- **Jede 5. Zeile** ist grau hinterlegt (Lesehilfe).
- **Zeilen pro Seite** (einstellbar, Standard **0 = automatisch**): Bei `0`
  misst die Vorschau, wie viele Starter neben Kopf, Legende/Bild und
  Leerzeilen auf ein A4-Blatt passen. Passt ein Bogen nicht, wird er auf so
  wenige Seiten wie möglich verteilt - gleichmäßig (Mitte, Drittel, …) und auf
  **5er-Schritte** aufgerundet: 24 Starter bei höchstens 20 je Blatt → 15 + 9,
  58 → 20 + 20 + 18. Kostet das Aufrunden eine zusätzliche Seite, wird nur
  gleichmäßig geteilt (20 bei höchstens 9 → 7 + 7 + 6). Am Blattende bleiben
  **5 mm Sicherheitsreserve** frei, damit der Druck mit den Standard-Rändern
  des Browsers (= `@page`-Rand 8 mm) nicht doch umbricht - Vorschau und Druck
  setzen minimal verschieden. Ohne Ränder zu drucken ist keine Lösung: Dann
  schneidet der Drucker den Rand ab. Gilt für Bildschirm und Browser-Druck;
  react-pdf-Insel und pdfmake/jsPDF brechen bei `0` weiterhin selbst um.
- Ist ein Wert **≥ 5** gesetzt, wird der Bogen **fest nach so vielen Startern**
  auf mehrere A4-Seiten aufgeteilt. **Jede Seite** trägt Kopf,
  Spaltenüberschriften, **Legende/Parcoursbild und die konfigurierten
  Leerzeilen** sowie - mittig auf Höhe der Unterschrift - eine **„Seite n / X"**-
  Angabe. So bleibt jede Einzelseite eine vollständige, unterschreibbare Liste.
- **Teilen ab** (einstellbar, Standard **0 = immer**): Aufgeteilt werden nur
  Klassen mit **mindestens so vielen Startern**, kleinere bleiben eine Seite.
  Beispiel: Zeilen/Seite 15, Teilen ab 25 → 25 Starter = 15 + 10 Zeilen,
  16-24 Starter bleiben eine Seite. Wie viele Starter auf eine A4-Seite passen,
  hängt vom Listentyp und Regelwerk ab (DM 2026 mit 3 Leerzeilen: Steg, Tore, Tor 5
  je 16, Mann-über-Bord und Parcours je 10 Starter). Ergäbe ein fester Wert eine Seite, die nicht aufs Blatt
  passt, gilt dafür die automatische Aufteilung - Beschreibung und
  Unterschrift rutschen nie auf eine eigene Seite.
- **Vorschau = Druckseite:** Das Blatt am Bildschirm hat dieselben Maße wie die
  Druckseite (A4, 8 mm Rand). Passt eine Seite nicht auf ein Blatt (z. B. ein
  zu großer fester Wert), zeigt die Vorschau einen Hinweis „ca. N Zeilen zu
  viel" und eine rote Seitenende-Linie (nur am Bildschirm, nicht im Druck).

## 8. Druck / PDF-Export

Mehrere Wege sind vorhanden, zum **Vergleich**. Das Layout der Bögen in dieser
Beschreibung gilt für den Browser-Druck; die anderen Wege sind vereinfacht:

1. **Browser-Druck** (empfohlen): Button löst den Druckdialog aus; exakte
   A4-Print-CSS erzeugt WYSIWYG-Seiten (je Bogen eine Seite, Querformat für
   Knoten). „Als PDF speichern“ läuft über den Druckdialog → scharfer,
   auswählbarer Text, keine Zusatzbibliothek.
2. **JS-Download** (html2canvas + jsPDF): direkter PDF-Download ohne Dialog.
   Nachteil: rasterisierter (nicht auswählbarer) Text. QR-Codes werden als
   Canvas neu gezeichnet, da html2canvas SVG nicht erfasst.
3. **Vektor-Prototyp** (`pdf.html`, `@react-pdf/renderer`): echtes, kleines
   Vektor-PDF mit Live-Vorschau und Ein-Klick-Download; Kopf und
   Spaltenüberschriften wiederholen sich zuverlässig auf jeder Seite, mit
   Vektor-QR, eingebetteter Schrift (korrektes „Σ") und eingebettetem
   Parcoursbild (PNG; Tor-Bögen gedreht). Er übernimmt den **mehrseitigen
   Druck** (§7a „Zeilen pro Seite") genauso wie der Eingabe-Prototyp: bei festem
   Umbruch je Block eine eigene A4-Seite mit Kopf, Legende/Bild, Leerzeilen und
   mittiger „Seite n / X"-Angabe; bei `0` eine durchlaufende, selbst umbrechende
   Tabelle. Dient dem Vergleich.
4. **pdfmake** und **jsPDF + autotable**: direkter Vektor-PDF-Download mit
   vereinfachtem Layout, ohne Parcoursbild. Nur als Vergleichsobjekt.

Der Dateiname wird bei Browser-Druck und Vektor-Prototyp automatisch gebildet:
`Fehlerpunkte - <Event> [- <Position>] [- Klasse X] [- N. Lauf] - <Zeitstempel>`,
wobei Position/Klasse/Lauf nur erscheinen, wenn über alle Bögen eindeutig.

## 8a. Einstellungs-Link (teilbare Zusammenstellung)

- Die aktuelle **Zusammenstellung** steckt fortlaufend in der **Adresszeile**
  (URL-Parameter `c`): Veranstaltung, Regelwerk, Sprache, Aufbau, die Option „Tor 5
  übernimmt die Parcoursüberwachung“, Bojen-Bezeichnung, Leerzeilen, Zeilen/Seite samt
  „Teilen ab“, die Beschreibung auf der Rückseite, die **Startnummern je Klasse**, die **Klassen-Reihenfolge** der
  Schnellauswahl und die **Bogen-Auswahl** (Liste × Klasse × Lauf). So lässt sich z. B. „Baden-Württemberg, alle
  Wasser-2-Listen" zusammenklicken und einfach **die URL teilen**; ein Knopf
  „Einstellungs-Link kopieren" legt sie in die Zwischenablage.
- **Nicht** enthalten sind eingetragene Werte (Punkte/Zeiten) und WKR-Namen -
  der Link stellt nur die leere Zusammenstellung her, keine Daten.
- Öffnet jemand einen geteilten Link, hat dessen Konfiguration Vorrang vor dem
  lokal gespeicherten Stand. Beim normalen Neuladen (eigene URL) bleiben die
  lokalen Eingaben erhalten.

## 8b. Legende als A4-Blatt

„Nur Legende drucken / Als PDF“ gibt alle Fehlercodes, Strafen und Disqualifikationen
des gewählten Regelwerks auf einem Blatt aus, in der gewählten Sprache. Im Kopf steht
der Wettkampf, darunter die Quelle des Regelwerks. Die Bögen bleiben dabei in der
Vorschau, werden aber nicht gedruckt.

## 8c. Laufzettel

Je Klasse/Lauf der Bögen-Liste gibt es ein A4-Querblatt, das auf A5 gefaltet wird: rechts
am Falz Klasse und Lauf, daneben eine Checkbox je gedruckter Seite in der Reihenfolge des
Aufbaus, darunter die Arbeitsschritte der Auswertung (`einstellungen.yaml`). Die
Seitenzahlen kommen aus der Vorschau. Gedruckt wird über „Nur Laufzettel drucken“.

## 8d. Beschreibung auf der Rückseite

Für den doppelseitigen Druck (Wenden an der langen Kante) lassen sich Legende und
Parcoursbild auf eine eigene Rückseite je Blatt legen. Klappt man das Blatt am Klemmbrett
nach oben, steht die Beschreibung richtig herum in der sichtbaren Hälfte; vorne ist mehr
Platz für Starter. Passt sie nicht in diese Hälfte, warnt die Vorschau.

## 9. Scanner-Erfassung (spätere Ausbaustufe)

- Jeder Bogen trägt einen **QR-Code** im Kopf. Inhalt (kompakt, scannerfreundlich):
  `FP1;e=<event>;t=<listentyp>;k=<klasse>;l=<lauf>`.
- Damit kann ein eingescannter Bogen automatisch der richtigen **Position
  (Listentyp), Klasse und Lauf** zugeordnet werden.
- Optional später erweiterbar um Bogen-/Seiten-ID und Formmarken für die
  Feld-Erkennung (OMR).

## 10. Startnummern / Verzahnung

- Die Zeilen (Startnummern) ergeben sich aus der **Startreihenfolge** je Klasse.
- Im Prototyp sind Demo-Nummern hinterlegt und editierbar (keine echten Daten).
- Produktiv kommen die Nummern und die Verzahnungs-/Gruppenaufteilung aus dem
  Schwesterprojekt *verzahnungs-prototyp* bzw. dem Auswertungstool.
- Es gibt die Klassen **E und 1-7** (Klasse A entfällt); welche davon gelten, legt das
  Regelwerk fest (§4a).
- **Reihenfolge der Bögen:** Die Schnellauswahl legt die Bögen in einer frei
  wählbaren **Klassen-Reihenfolge** an (z. B. 1, 3, E, 2, 5, 7, 4, 6 - passend
  zur Startfolge der Veranstaltung). Nicht genannte Klassen lässt sie aus; ein
  ↻-Knopf hängt fehlende Klassen wieder an (E, 1 … 7). Mit **„Alle Läufe"** kommt erst Lauf 1
  komplett, dann Lauf 2 in derselben Reihenfolge usw. Lauf-unabhängige Listen
  (`lauf: false`, z. B. Knoten) legt die Schnellauswahl je Klasse **nur einmal**
  an - auch bei „Alle Läufe“ oder mehreren „Kompletter Lauf“-Klicks. Produktiv
  ließe sich die Reihenfolge aus der Verzahnung ableiten.
- **Jede 5. Zeile** ist grau hinterlegt - reine Lesehilfe zur Orientierung.

## 11. Datenschutz

- Der Prototyp verarbeitet **keine echten personenbezogenen Daten**.
- Alle Eingaben bleiben **lokal im Browser** (localStorage), keine Server-Übertragung.

## 12a. Konfiguration (Positionen & Fehlerpunkte)

- **Trennung der Belange:** Fehlerpunkte/Disqualifikationen (aus der
  **Ausschreibung**, je Regelwerk und Version) sind getrennt von den
  **orts-/personenabhängigen Positionen** (z. B. wenige WKR oder Plätze nur von
  einer Seite einsehbar).
- **Mehrere Regelwerke und Versionen:** In der Bedienleiste wird das Regelwerk
  gewählt (z. B. DM 2026, UIM 2026); die Wahl steckt auch im Einstellungs-Link.
  Es bestimmt Fehlercodes, Punkte, Disqualifikationen und Klassen. Bögen von
  Klassen, die das neue Regelwerk nicht kennt, entfallen beim Wechsel.
- **Sprachen:** Ein Regelwerk mit `sprachen: [de, en]` bietet die Listen deutsch,
  englisch oder zweisprachig an. Die englischen Texte stehen im Regelwerk (`en`) und
  in `i18n/en.yaml`; `config:check` meldet fehlende Übersetzungen. Bojen-Kürzel,
  Bedienleiste, Laufzettel und Dateinamen bleiben deutsch. Für eine weitere Sprache ist
  `i18n/` vorbereitet; die Sprachwahl und die Texte im Regelwerk kennen bisher nur
  Deutsch und Englisch.
- **YAML-Dateien** - gepflegt **ausschließlich** unter `src/config/` (einzige
  Quelle). Von dort werden sie zweifach genutzt: fest ins JS-Bundle kompiliert
  (Fallback, immer verfügbar) und per `npm run config:sync` (Teil von `dev`/`build`)
  nach `public/config/` gebracht, von wo sie zur Laufzeit per fetch geladen werden
  (Override; ohne Neubau austauschbar, z. B. im Deploy). `public/config/` ist reine
  Ausgabe, liegt nicht in Git und wird automatisch erzeugt.
  - `regelwerke.yaml` - Liste der Regelwerke (der erste ist der Standard).
  - `regelwerke/<id>.yaml` - `disqualifikationen` (beliebig viele, mit Buchstaben
    und `bereiche`), benannte `kataloge` (Fehler mit Zahlen → Punkte), `direktpunkte`
    und `klassen`. Jedes Regelwerk muss alle Kataloge anbieten, die die Positionen
    nennen.
  - `aufbauten.yaml` (Liste der Dateien und Sprachen, Parameter-Beschreibung),
    `aufbauten/*.yaml`, `einstellungen.yaml` und `i18n/*.yaml` - der Build führt sie zu
    EINER Datei `public/config/positionen.yaml` zusammen. Darin: wiederverwendbare
    `hinweise`, die `positionen` (Spalten/Reihenfolge, `katalog`- und `hinweis`-Verweis,
    `bild`, `bildDrehung: 0|90|-90|180`), die `aufbauten` (Setups), `laufzettel` und
    `ueberwachung`. Neuer Austragungsort: Datei unter `aufbauten/` anlegen und in
    `aufbauten.yaml` eintragen.
- **Aufbauten (Setups):** Positionen sind zu Aufbauten gebündelt (§4). Bei einem
  Wettkampf wird ein Aufbau gewählt; er enthält alle Listen. Gemeinsame Listen werden
  geteilt, nur die Tor-Positionen unterscheiden sich je Aufbau. Steht eine Position
  mehrfach in einem Aufbau (dreimal Zeit), wird sie durchnummeriert: „Zeit (1)“ usw.
- **Bild neben der Legende:** `bildNeben: true` setzt das querliegende Bild rechts neben
  Fehlerpunkte und Beschreibung, die Disqualifikationen stehen darunter über die ganze
  Breite. Das nutzen Berlin und die Tor-5-Parcours-Listen.
- **Tor 5 mit Parcoursüberwachung:** Eine Position mit `ersetzt: [tor5, parcours]` legt
  die genannten zusammen, die Bedienleiste bietet das in jedem Aufbau an, der alle
  genannten enthält (Checkbox). Die extra Parcoursliste entfällt dann. Alcatraz-DM26 nutzt
  eine eigene Liste, weil seine Tor-Listen kein Start/Ziel haben.
- **Überwachungs-Check:** `config:check` prüft je Aufbau und Klasse, ob jede Boje und
  jede Aufgabe aus `ueberwachung` (`einstellungen.yaml`) auf einer Liste steht, auch
  zusammengelegt. In der Prüfung sind Lücken Hinweise, ein Test verlangt aber, dass jeder
  Aufbau lückenlos ist. `eigeneStrecke: true` nimmt einen Aufbau aus (Parallelslalom).
- **Disqualifikationen pro Position** via `disq: alle | keine | <Bereich>`: Die
  Buchstaben nennen im Regelwerk ihre `bereiche` (`vorsteg`, `steg`, `parcours`,
  `mueb`), die Position nur ihren Bereich. So stehen MüB-Buchstaben nur auf Listen
  mit Mann-über-Bord. Bei querliegendem Bild steht die Liste zweispaltig.
- **Klassenabhängigkeit** (`klassen: [...]` an Spalte oder Position; fehlt = alle,
  siehe §4a): z. B. Speed 1 `[5,6,7]`, Speed 2 `[7]`, Mann-über-Bord `[4,5,6,7]`.
- **Bild** je Position (`bild`, `bildDrehung: 0|90|-90|180`). Um ±90° gedrehte
  Bilder erscheinen hochkant neben der Legende, sonst quer darunter (oder mit
  `bildNeben` daneben). Hochkant füllt
  das Bild die Rahmenbreite (`bildBreite`, Standard 40 mm) und setzt die
  Mindesthöhe; es schrumpft also nicht mit einer kurzen Legende. (Frontal-Tore
  nutzen die Alcatraz-Bilder um -90° = Alcatraz 90° + 180°-Blickwende.)
- **Bildgenerator (§4b):** `bild` kann auf ein festes fertiges Bild zeigen ODER
  mit `bildGenerator: true` beim Build automatisch aus einer Quelle
  (`bildQuelle`, Default `alcatraz_Parcours`) erzeugt werden. Dabei bleiben die
  per Spalten-`hebt: <ElementID>` markierten Tore voll sichtbar, die übrigen
  werden abgeblendet (der Fahrweg bleibt immer sichtbar). So entfallen die
  früher von Hand gemalten Varianten `alcatraz_I`/`alcatraz_II`.
- **Spalten-Trenner** (optische Linien): Zwischen zwei Spalten lässt sich eine
  hervorgehobene Linie legen - als eigener Eintrag `{ typ: trenner, design: … }`
  (linke Kante der Folgespalte) oder als Kurzform `trenner: …` an der Spalte.
  Zwischen den Unter-Spalten (`sub`) eines Tores steuert `subTrenner` das Design
  (positionsweit oder je Spalte überschreibbar, z. B. Tor 5 „doppelt"). Designs:
  **fett, doppelt, gepunktet, gestrichelt**. Nutzen: Hin- und Rückfahrt-Spalten
  bzw. die beiden Bojen eines Tores klar auseinanderhalten. (Alcatraz/Frontal
  nutzen zwischen den Tor-Bojen standardmäßig „gepunktet", Tor 5 „doppelt".)
- **Live-Neuladen der Konfiguration:** Der Entwicklungsserver beobachtet die
  generierten `public/config/*.yaml` und lädt die Seite bei Änderung automatisch
  neu. Beim Start von `dev` werden sie aus `src/config/` erzeugt; wer während einer
  laufenden Sitzung an der Quelle arbeitet, stößt mit `npm run config:sync` eine
  Aktualisierung an (oder editiert testweise direkt die `public/config`-Kopie).
- **Hinweise** (Bojen-Bezeichnungen) sind zentral und werden per Verweis
  eingebunden; der Hinweistext passt sich dem gewählten Schema an.
- **Bojen-Beschriftung, umschaltbar** (`bezeichnungen` + `beschriftungen`): die
  Richtungs-/Seitenkürzel sind eine Token-Map (`hin`/`rueck`/`seiteA`/`seiteB`
  plus Langnamen), in `sub` und Hinweisen als ganze Wörter ersetzt. Über
  `beschriftungen` stehen **auf der Seite live umschaltbare Schemata** bereit:
  R/L (Standard), L/S (Land/See), S/L, K/H (Kai/Hafen), **Pfeile** (→/←) und
  **Innen/Außen** (I/A). Fahrtrichtung: Hin = `H`, Rück = `R` (früher `Z`).
  - **Pfeile** sind räumlich (`raeumlich: true`): an von hinten betrachteten
    Positionen (`pfeileSpiegeln: true`, Alcatraz-Tore) werden die Seiten
    gespiegelt, damit die Pfeile in beiden Aufbauten dieselbe Bildrichtung zeigen
    (dabei je Aufbau eine andere Boje meinen).
  - **Innen/Außen** ist tor-relativ: jede Tor-Spalte markiert die innere Seite
    (`innen: seiteA|seiteB`); Tor 5/Start/Ziel bleiben bei R/L.
- Beide Ausgaben (Eingabe-Prototyp und Vektor-PDF) nutzen dieselbe Konfiguration.
- **Konfigurations-Prüfung** (`npm run config:check`, Teil von `npm run check` und
  damit Pre-Commit/CI): meldet doppelte Definitionen (Positions-IDs, Spalten-Keys,
  Fehler-Codes …), Verweise ins Leere (Aufbau → Position, Spalte → Katalog /
  Summenspalte, `disq`-Bereiche), fehlende Übersetzungen, Tor-Spalten ohne `innen`,
  Tor-Spalten mit falschem Namen und Überwachungslücken. Geprüft wird die Quelle unter
  `src/config`. Fehler blocken den Commit, Hinweise (z. B. Format-Hygiene, verwaiste
  Positionen) nicht.
- **Excel-Zuordnung:** `npm run excel:mapping` (`scripts/excel_mapping.py`) leitet aus der
  Auswertungs-Arbeitsmappe `src/config/excel-zuordnung.json` ab (nur Blätter, Spalten,
  Zeilen). Die App nutzt sie noch nicht.

## 12. Nicht-Ziele / offene Punkte

- Ergebnis-/Ranglistenseite (Zusammenführung aller Bögen) ist **nicht** Teil des
  Prototyps.
- Klassenabhängige Listen/Spalten (Speedbojen, Mann-über-Bord) sind umgesetzt
  (§4a). DM 2026 und UIM 2026 sind mit ihren Regelwerken abgeglichen; ob die Hinweise
  „ab Klasse …“ bei Fehlercodes auch die Eingabe einschränken, ist noch offen, heute sind
  sie nur Text.
- Offen beim nächsten Wettkampf: Wiederholtes Anfahren und Vollkreis als eigener Buchstabe
  P oder wie bisher unter J.
- Rollen/Login, Mehrbenutzer-Synchronisation, Offline-Sync: später.
- Exakte Gruppen-/Verzahnungsschattierung je Klasse: mit Verzahnungstool zu koppeln.
