# Lastenheft - Fehlerpunkte-Eingabemasken (Motorbootslalom)

Version 0.2 · Konzept-Prototyp · Stand 2026-07

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
  Lauf, rechts das WKR-Feld (Name/Unterschrift).
- **Tabelle:** eine Zeile je Startnummer (Startreihenfolge), plus einige leere
  Zeilen. Spalten je nach Listentyp (siehe §4).
- **Fuß:** Legende (Fehlercodes mit Punkten, Disqualifikations-Codes A-X),
  ggf. Parcoursbild, Unterschriftszeile „Unterschrift WKR“.

## 4. Aufbauten & Listentypen (Stationen am Parcours)

> **Konfigurierbar:** Positionen, Spaltenreihenfolge und Fehlerpunkte sind
> datengetrieben (YAML, siehe §12a). Fehlerpunkte/Disqualifikationen kommen aus
> der Ausschreibung (`fehlerpunkte.yaml`, für alle gleich); die Positionen sind
> orts-/personenabhängig (`positionen.yaml`).

**Aufbauten (Setups)** bündeln die bei einem Wettkampf genutzten Positionen. Beim
Start wird ein Aufbau gewählt:

- **Alcatraz** (Standard, WKR-Blick von **hinten**): Zeit · Steg · Tore 1/3/5 ·
  Tore 2/4/5 · Tor 5 · Mann-über-Bord · Parcours · Knoten.
- **Frontal** (gleiche Bojen, Blick vom **Start/Ziel** = von vorne): wie Alcatraz,
  aber Tor-Blätter gespiegelt; das Parcoursbild ist entsprechend gedreht.
- **Berlin** (vier feste WKR-Positionen rund um den Kurs, jeweils das **ganze**
  Parcoursbild): Steg · Start/Ziel (Zeitnahme + Start-/Zieltor-Bojen) ·
  Rechts (Tor 1/3 + Mann-über-Bord) · Links (Tor 2/4/5 + Speedbojen).
- **Parallelslalom** (Beispiel): Zeit · Steg · Parallel-Parcours.

Mitgelieferte Positionen (Auszug, Aufbau Alcatraz):

| Typ | Kopf-Titel | Spalten (nach Nr.) | Σ | Bild |
| --- | ---------- | ------------------ | :-: | :-: |
| Tore 1/3/5 | Tor 1 / 3 / 5 | Start · Tor 1 · Tor 3 · Tor 5 · Tor 3 · Tor 1 · Ziel (je Bojenspalten mit Fahrtrichtung/Seite) · Disq. · Σ | ✓ | alcatraz_I (generiert, §4b) |
| Tore 2/4/5 | Tor 2 / 4 / 5 | analog mit Toren 2/4/5, dazu **Speedbojen (je Klasse, §4a)** | ✓ | alcatraz_II (generiert, §4b) |
| Tor 5 | Tor 5 | Fehler · Σ · Disq. · Bemerkung | ✓ | alcatraz_Parcours |
| Mann-über-Bord | Mann-über-Bord | Fehler · Fehlerpunkte · **Σ (mittig)** · Disq. · Bemerkung | ✓ | - |
| Steg | Steg | Fehler AB · F-Pkt. AB · Fehler AN · F-Pkt. AN · Disq. · Bemerkung | (je Gruppe) | - |
| Zeit | Zeit | Zeit 1 · Zeit 2 · Zeit 3 | - | - |
| Knoten (quer, **ohne Lauf**) | Knoten | Webleinstek · Schotstek · Palstek · Kreuzknoten · Klampe · * · Σ | ✓ | - |
| Parcours einfach | Parcours | Bemerkung · Disq. | - | alcatraz_Parcours |

**Bojen-Beschriftung** an den Tor-Spalten: zwei Zeichen = **Fahrtrichtung**
(`H` = Hinfahrt, `R` = Rückfahrt) + **Seite**. Die Seiten-Kürzel sind global und
**auf der Seite umschaltbar** (§12a): R/L (Rechts/Links, Standard), L/S (Land/See),
S/L, K/H (Kai/Hafen), **Pfeile** (→/←) oder **Innen/Außen** (I/A). Beispiel
Standard: `H R` = Hinfahrt Rechts, `R L` = Rückfahrt Links.

## 4a. Klassenabhängige Spalten & Blätter

Umfang und Spalten der Listen hängen von **Klasse** (und Aufbau) ab:

- **Speedbojen** (Tore 2/4/5 bzw. Berlin „Links"): keine bis Klasse 4, **eine**
  bei Klasse 5/6, **zwei** bei Klasse 7.
- **Mann-über-Bord:** erst **ab Klasse 4**. Als eigenes Blatt (Alcatraz) wird es
  für Klasse E-3 gar nicht erzeugt; als Spalte (Berlin „Rechts") entfällt es dort.
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

- Jedes Bild-Element hat eine stabile `id` (`Tor1`…`Tor5`, `Start+Ziel`,
  `SpeedbojeKlasse7`, `Schikane`, `Zeitnahme`), über alle Klassen identisch.
- In `positionen.yaml` markiert das Spalten-Feld `hebt: Tor1` die im Bild
  **hervorzuhebenden** Tore. Die übrigen Tore werden mit reduzierter Deckkraft
  (opacity) abgeblendet; **Fahrweg, Start/Ziel, Zeitnahme usw. bleiben immer voll
  sichtbar**. Weil `hebt` an der Spalte hängt, wandert die Hervorhebung beim
  Kopieren einer Spaltenzeile automatisch mit.
- Alternativ/ergänzend blendet eine Positions-Liste `abblenden: [Tor2, Tor4]`
  gezielt Elemente ab (Fallback, falls keine Spalte `hebt` nutzt).
- **Einzelne Bojen** sind ebenso ansprechbar wie ganze Tore: Tor 5 (`Tor5_oben` /
  `Tor5_unten`), die beiden Start/Ziel-Bojen (`Tor1_innen-7` oben / `Tor1_aussen-3`
  unten) und die beiden Speedbojen (`g3068` oben / `SpeedbojeKlasse7` unten).
  Damit zeigt jede Position genau die **beobachtete Hälfte**: bei Alcatraz z. B.
  Tore 1/3/5 nur die untere Boje von Tor 5 und Start/Ziel, bei Baden-Württemberg
  je Land-/Wasser-Seite die passende Einzelboje jedes Tores.
- Auch die **Baden-Württemberg**-Positionen (Land 1/2, Wasser 1/2) werden so aus
  `alcatraz_Parcours` erzeugt (`bawue_Land_1` … `bawue_wasser_2`).
- Der Schalter `bildGenerator: true` aktiviert die Erzeugung; `bild` ist dann der
  **Ziel**-Ordner, `bildQuelle` der Quell-Ordner (Default `alcatraz_Parcours`).
  Ohne den Schalter zeigt `bild` weiter auf ein festes fertiges Bild - **beides
  funktioniert parallel**.
- Erzeugt werden je Klasse eine gedimmte **SVG** (Bildschirm) und ein **PNG**
  (für den Vektor-PDF-Druck, der kein SVG einbetten kann). Skript:
  `npm run parcours:build` (Teil von `npm run build`).

## 5. Fehlerpunkt-Berechnung

- **Bojenspalten (Tore, Knoten):** der WKR trägt die **Punkte direkt** ein
  (5, 10, 15 …), nicht die Anzahl der Berührungen. Beispiel: „10“ an Tor 1 H K
  = 10 Punkte.
- **Fehlercode-Spalten (MüB, Steg, Tor 5):** der WKR trägt die Fehlernummer(n)
  laut Legende ein (kommagetrennt möglich). Die Punkte werden automatisch aus der
  Fehlertabelle summiert und in die zugehörige Punkte-/Σ-Spalte geschrieben.
  Beispiele: MüB „13, 17“ → 10 · Tor 5 „1“ → 20 · Steg AN „9, 12“ → 20.
- **Steg getrennt (Ablegen/Anlegen):** „Fehler AB“ und „Fehler AN“ haben je einen
  eigenen Katalog und lassen **nur ihre eigenen Codes** zu (Ablegen 3-5, Anlegen
  7-12); die Legende zeigt beide Blöcke sauber getrennt nebeneinander.
- **Disqualifikation in einer Fehler-Spalte:** ein Disq-Buchstabe in einer
  Fehlercode-Spalte zählt als Disqualifikation an dieser Stelle (wie in den
  Bojenspalten) und wird in die Disq-Spalte übernommen.
- **Σ** = Summe aller Bojen-, Code- und Punktebeiträge einer Zeile, laufend
  aktualisiert.

Fehlertabellen (aus den Alt-Listen übernommen):

- **Tor 5:** 1 = nicht mit gesamter Länge eingefahren (20) · 2 = Durchreißen der
  Schaltung / erst ab Klasse 5 (5).
- **Ablegen (Steg):** 3, 4, 5 = je 5.
- **Anlegen (Steg):** 7, 8, 10, 11 = je 5 · 9, 12 = je 10.
- **Mann-über-Bord:** 13-19 = je 5.
- **Knoten:** 5 pro fehlerhafter Knoten.

## 6. Disqualifikation

- Es gibt eine geltungsweite Code-Tabelle **A-L, X** (auf jedem Bogen als Legende).
- Disqualifikation kann eingetragen werden
  - in der eigenen **Disq.-Spalte** der Zeile **oder**
  - **direkt in einer Tor-/Bojenspalte** (Buchstabe statt Zahl). So ist die
    genaue Stelle dokumentiert (z. B. „G an Tor 3 H H“).
- Für die Ergebnisseite (nicht Teil des Prototyps) stehen damit **Ort und Grund**
  der Disqualifikation strukturiert bereit.
- **Eingabehilfe:** Disq-Eingaben werden automatisch groß geschrieben; es sind
  **nur Codes zulässig, die in der Legende stehen** (A-L, X). Mehrere Codes mit
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
  bleibt es eine durchlaufende Tabelle; der Browser bricht bei Bedarf selbst um
  und wiederholt Kopf/Spaltenüberschriften (`thead`) sowie die Fuß-Legende
  (`tfoot`) je Seite (Firefox jede Seite, Chrome letzte Seite).
- Ist ein Wert **≥ 5** gesetzt, wird der Bogen **fest nach so vielen Startern**
  auf mehrere A4-Seiten aufgeteilt. **Jede Seite** trägt Kopf,
  Spaltenüberschriften, **Legende/Parcoursbild und die konfigurierten
  Leerzeilen** sowie - mittig auf Höhe der Unterschrift - eine **„Seite n / X"**-
  Angabe. So bleibt jede Einzelseite eine vollständige, unterschreibbare Liste.

## 8. Druck / PDF-Export

Zwei Wege sind vorgesehen (im Prototyp beide vorhanden, zum **Vergleich**):

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
   Druck** (§7 „Zeilen pro Seite") genauso wie der Eingabe-Prototyp: bei festem
   Umbruch je Block eine eigene A4-Seite mit Kopf, Legende/Bild, Leerzeilen und
   mittiger „Seite n / X"-Angabe; bei `0` eine durchlaufende, selbst umbrechende
   Tabelle. Dient dem Vergleich.

Der Dateiname wird bei Browser-Druck und Vektor-Prototyp automatisch gebildet:
`Fehlerpunkte - <Event> [- <Position>] [- Klasse X] [- N. Lauf] - <Zeitstempel>`,
wobei Position/Klasse/Lauf nur erscheinen, wenn über alle Bögen eindeutig.

## 8a. Einstellungs-Link (teilbare Zusammenstellung)

- Die aktuelle **Zusammenstellung** steckt fortlaufend in der **Adresszeile**
  (URL-Parameter `c`): Veranstaltung, Aufbau, Bojen-Bezeichnung, Leerzeilen,
  Zeilen/Seite, die **Startnummern je Klasse** und die **Bogen-Auswahl**
  (Liste × Klasse × Lauf). So lässt sich z. B. „Baden-Württemberg, alle
  Wasser-2-Listen" zusammenklicken und einfach **die URL teilen**; ein Knopf
  „Einstellungs-Link kopieren" legt sie in die Zwischenablage.
- **Nicht** enthalten sind eingetragene Werte (Punkte/Zeiten) und WKR-Namen -
  der Link stellt nur die leere Zusammenstellung her, keine Daten.
- Öffnet jemand einen geteilten Link, hat dessen Konfiguration Vorrang vor dem
  lokal gespeicherten Stand. Beim normalen Neuladen (eigene URL) bleiben die
  lokalen Eingaben erhalten.

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
- Es gibt die Klassen **E und 1-7** (Klasse A entfällt).
- **Jede 5. Zeile** ist grau hinterlegt - reine Lesehilfe zur Orientierung.

## 11. Datenschutz

- Der Prototyp verarbeitet **keine echten personenbezogenen Daten**.
- Alle Eingaben bleiben **lokal im Browser** (localStorage), keine Server-Übertragung.

## 12a. Konfiguration (Positionen & Fehlerpunkte)

- **Trennung der Belange:** Fehlerpunkte/Disqualifikationen (aus der
  **Ausschreibung**, i. d. R. für alle gleich) sind getrennt von den
  **orts-/personenabhängigen Positionen** (z. B. wenige WKR oder Plätze nur von
  einer Seite einsehbar).
- **Zwei YAML-Dateien** - gepflegt **ausschließlich** unter `src/config/` (einzige
  Quelle). Von dort werden sie zweifach genutzt: fest ins JS-Bundle kompiliert
  (Fallback, immer verfügbar) und per `npm run config:sync` (Teil von `dev`/`build`)
  nach `public/config/` kopiert, von wo sie zur Laufzeit per fetch geladen werden
  (Override; ohne Neubau austauschbar, z. B. im Deploy). `public/config/` ist reine
  Ausgabe, liegt nicht in Git und wird automatisch erzeugt.
  - `fehlerpunkte.yaml` - `disqualifikationen` (beliebig viele, mit Buchstaben) und
    benannte `kataloge` (Fehler mit Zahlen → Punkte).
  - `positionen.yaml` - wiederverwendbare `hinweise`, die `positionen`
    (Spalten/Reihenfolge, `katalog`- und `hinweis`-Verweis, `bild`,
    `bildDrehung: 0|90|-90|180`) und die `aufbauten` (Setups).
- **Aufbauten (Setups):** Positionen sind zu Aufbauten gebündelt - **Alcatraz**
  (von hinten), **Frontal** (gleiche Bojen von vorne, Blätter gespiegelt),
  **Berlin** (vier feste WKR-Positionen, ganzes Parcoursbild) und
  **Parallelslalom** (Beispiel). Bei einem Wettkampf wird ein Aufbau gewählt; er
  enthält alle Listen (auch Zeit/Knoten). Gemeinsame Listen werden geteilt, nur
  die Tor-Positionen unterscheiden sich je Aufbau.
- **Disqualifikationen pro Position ausblendbar** via `disq: alle | keine | [A,…]`.
- **Klassenabhängigkeit** (`klassen: [...]` an Spalte oder Position; fehlt = alle,
  siehe §4a): z. B. Speed 1 `[5,6,7]`, Speed 2 `[7]`, Mann-über-Bord `[4,5,6,7]`.
- **Bild** je Position (`bild`, `bildDrehung: 0|90|-90|180`). Um ±90° gedrehte
  Bilder erscheinen hochkant neben der Legende, sonst quer darunter. (Frontal-Tore
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
  Fehler-Codes …) und Verweise ins Leere (Aufbau → Position, Spalte → Katalog /
  Summenspalte, `disq`-Codes). Geprüft wird die Quelle unter `src/config`.
  Fehler blocken den Commit, Hinweise (z. B. Format-Hygiene,
  verwaiste Positionen) nicht.

## 12. Nicht-Ziele / offene Punkte

- Ergebnis-/Ranglistenseite (Zusammenführung aller Bögen) ist **nicht** Teil des
  Prototyps.
- Klassenabhängige Listen/Spalten (Speedbojen, Mann-über-Bord) sind umgesetzt
  (§4a). Weitere Reglement-Feinheiten (Mehrfachwertungen, exakte Fehlerzuordnung
  je Klasse) bleiben vereinfacht und sind mit dem Reglement abzugleichen.
- Rollen/Login, Mehrbenutzer-Synchronisation, Offline-Sync: später.
- Exakte Gruppen-/Verzahnungsschattierung je Klasse: mit Verzahnungstool zu koppeln.
