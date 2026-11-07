# Konzept: WKR-Positionen einfacher konfigurieren

Stand: 07.11.2026. **Abgestimmt, in Umsetzung.** Erledigt sind die Korrekturen an den heutigen
Aufbauten, Baden-Württemberg (§6, §5.1), Berlin Rechts (§5.1) und die Reihenfolge der Ergebnisliste
(§4.3), die Zeitnahme (§4.5), die Kurzform (§4, §5.1) und die Kursvariante mit dem Möwe-Parcours in
Oranienburg als erstem neuen Aufbau (§4.4, §5.2). Den Stand der Schritte zeigt §10.
Die Prüfung aus §5.1 läuft als Test mit (`src/config/kurzform.test.ts`).

Eine Veranstaltung hat wenige Personen und oft eigene Standorte am Kurs. Eine neue Verteilung der
WKR-Positionen braucht heute Repo, Build und Deploy. Das Konzept schlägt drei Dinge vor, die
aufeinander aufbauen: eine kurze Beschreibung der Positionen (§4), einen Assistenten in der App (§7)
und einen Weg, das Ergebnis zu speichern und weiterzugeben (§8).

## 1. Abgrenzung

- Es geht um das normale DM-Umfeld: Regelwerk DM 2026, Disziplin Manövrieren, ein Kurs mit örtlichen
  Varianten (§4.4), Klassen E und 1 bis 7.
- Parallelslalom hat eigene Bojen und bleibt in der ausführlichen Form, ebenso alles aus
  `KONZEPT-UIM.md`. Die ausführliche Form bleibt überall gültig.
- Steg, Vorsteg und Knoten bleiben feste Bausteine. Ihre Spalten hängen nicht davon ab, wo jemand
  steht, deshalb werden sie nur ausgewählt, nicht abgeleitet. Zeit ist dagegen eine Aufgabe wie
  die Fehler an Tor 5 oder MüB und kann mit Bojen auf einer Liste stehen (§4.5).
- Fehlerpunkte und Disqualifikationen bleiben im Regelwerk und sind nicht Teil davon.
- Der Assistent speichert keine Personennamen. Die WKR-Namen bleiben wie bisher am Bogen und damit
  außerhalb des Einstellungs-Links.

## 2. Ausgangslage

Einen Assistenten gibt es nicht. In der Bedienleiste lässt sich ein vorhandener Aufbau wählen, dazu
die Option „Tor 5 übernimmt die Parcoursüberwachung“ und die Bezeichnung der Bojen-Seiten. Alles
andere steht in `src/config/aufbauten/*.yaml`.

Dort beschreiben 13 Tor-Positionen mit 133 Spalteneinträgen denselben Kurs. Jede nennt von Hand ihre
Spalten, Bojen-Seiten, `innen`, `hebt`, `abblenden` und die Bilddrehung. Daraus folgt:

- **Varianten vervielfachen sich.** „Frontal ohne Start/Ziel“ braucht zwei neue Blöcke mit je rund
  25 Zeilen und einen neuen Aufbau, dazu Commit, Build und Deploy, weil die Bilder beim Build entstehen.
- **Der Kurs steht dreimal im Repo:** in den Positionen, in `ergebnisspalten` und in `ueberwachung`.
- **Handarbeit läuft auseinander**, siehe den Befund zu Baden-Württemberg in §6 (inzwischen korrigiert).

## 3. Begriffe

| Begriff | Bedeutung |
|---|---|
| Kurzform | Beschreibung einer Position durch ihre Bojen, Aufgaben und ihren Blick. |
| Boje | ID aus dem Parcoursbild: ein ganzes Tor (`Tor1`) oder eine Einzelboje (`Tor1_innen`, `Tor5_oben`). |
| Aufgabe | Was keine Boje ist: `zeit`, `tor5` (Fehler Tor 5), `mueb`, `parcours`. |
| Fehler Tor 5 | Die Fehlercodes an Tor 5, in der Ausschreibung unter „Einfahrt Tor 5“. Nicht „Einfahrt“ oder „Rückwärtstor“: Die Klassen E und 1 fahren vorwärts durch Tor 5. |
| Blick | Von welcher Seite die Person überwiegend auf den Kurs schaut: `hinten`, `vorne`, `rechts`, `links` (§4.2). |
| Baustein | Feste Liste, die nur gewählt wird: Steg, Vorsteg, Knoten. |
| Zeitnahme | Ein Gerät, das die Zeit misst: `elektronisch` (Lichtschranke) oder `stoppuhr` (§4.5). |
| Fahrweg | Die Bojen und Aufgaben in der Reihenfolge, in der das Boot sie passiert. |
| Kursvariante | Was ein Austragungsort am Kurs anders macht: eigene Bilder je Klasse (§4.4). |
| Eigener Aufbau | Ein Aufbau, der im Browser liegt, nicht im Repo. |

## 4. Die Kurzform

### 4.1 Beispiel

```yaml
aufbauten:
  - id: alcatrazdm26
    name: Alcatraz-DM26
    positionen:
      - { aufgaben: [zeit], zeiten: [elektronisch] }
      - { aufgaben: [zeit], zeiten: [stoppuhr] }
      - { aufgaben: [zeit], zeiten: [stoppuhr] }
      - vorsteg
      - steg
      - { titel: "Tor 1 / 3 / 5", blick: hinten, bojen: [Tor1, Tor3, Tor5_unten, Speedboje_unten] }
      - { titel: "Tor 2 / 4 / 5", blick: hinten, bojen: [Tor2, Tor4, Tor5_oben, Speedboje_oben] }
      - { titel: "Tor 5", aufgaben: [tor5] }
      - { titel: "Mann-über-Bord", blick: hinten, aufgaben: [mueb] }
      - { titel: "Parcours", bojen: [StartZiel], aufgaben: [parcours] }

  - id: berlin
    name: Berlin
    positionen:
      - steg
      - { titel: "Start/Ziel", bojen: [StartZiel], aufgaben: [zeit], bildNeben: true }
      - { titel: "Rechts", blick: rechts, bojen: [Tor1, Tor3], aufgaben: [mueb], bildNeben: true }
      - { titel: "Links", blick: links, bojen: [Tor2, Tor4, Tor5, Speedboje_oben, Speedboje_unten], aufgaben: [tor5], bildNeben: true }

  - id: bawue
    name: Baden-Württemberg
    positionen:
      - zeit
      - steg
      - { titel: "Land 1", blick: rechts, bojen: [StartZiel_unten, Tor1_aussen, Tor2_innen, Tor3_aussen] }
      - { titel: "Land 2", blick: rechts, bojen: [Tor4_innen, Tor5_unten, Speedboje_unten], aufgaben: [tor5] }
      - { titel: "Wasser 1", blick: links, bojen: [StartZiel_oben, Tor1_innen, Tor2_aussen, Tor3_innen], aufgaben: [mueb] }
      - { titel: "Wasser 2", blick: links, bojen: [Tor4_aussen, Tor5_oben, Speedboje_oben] }
      - knoten
```

`bojen` nutzt die IDs, die es im Parcoursbild und in `abblenden` schon gibt. „Frontal ohne Start/Ziel“
wird damit zu zwei Zeilen: dieselben Bojen wie oben, nur `blick: vorne`.

### 4.2 Was woraus folgt

| Heute von Hand | Folgt aus | Regel |
|---|---|---|
| Spalten und Reihenfolge | `bojen`, `aufgaben` | Der Fahrweg (§4.3), gefiltert auf das, was die Position beobachtet. |
| `sub` | `bojen`, `blick` | Eine Unter-Spalte je Boje; von vorne liegt die obere Boje links, sonst die untere. |
| Tor 5 Hin und Rück | `blick` | Von vorne zuerst die Rückfahrt, sonst zuerst die Hinfahrt. |
| `innen` | Kurs | Fest je Tor: Tor 1 und 3 innen oben, Tor 2 und 4 innen unten. |
| `klassen` | Kurs | Fest je Halt, siehe §4.3. |
| `hebt`, `abblenden` | `bojen`, `aufgaben` | Abgeblendet wird alles, was nicht beobachtet wird. Die Parcoursüberwachung sieht alles. |
| `bild`, `bildGenerator` | `bojen`, `aufgaben` | Ein Bild gibt es bei Bojen, `mueb` oder `parcours`. |
| `bildDrehung` | `blick` | `hinten` 90°, `vorne` −90°, `rechts` und ohne Blick 0°, `links` 180°. |
| `pfeileSpiegeln` | `blick`, `bojen` | Nur bei `hinten` mit Bojen. |
| `disq` | `aufgaben` | `mueb` bei Mann-über-Bord, sonst `parcours`. |
| `katalog` | `aufgaben` | `mueb` oder `tor5`. |
| `subTrenner`, Trennlinien | Fahrweg | Gepunktet zwischen den beiden Bojen eines Tores, bei jedem Blick. Doppelt, wo die Hinfahrt endet und die Rückfahrt beginnt. Die Fehler an Tor 5 zählen noch zur Hinfahrt: Tor 5 Hin, Fehler Tor 5 ‖ Tor 5 Rück. |
| Zeitspalten | `zeiten` | Eine Spalte je Gerät (§4.5). |

**Warum der Blick nur vier Werte hat:** Er steuert die Bilddrehung in 90°-Schritten (mehr passt nicht
ins A4-Layout), welche Boje eines Tores links steht, ob bei Tor 5 Hin- oder Rückfahrt zuerst kommt und
ob die Pfeile gespiegelt werden. Eine Gradzahl müsste dafür wieder gerundet werden. Sie würde auch
nicht genauer: Wer bei Möwe auf Höhe von Tor 2 steht, sieht Tor 2 von der Seite und Tor 4 und 5 schräg
von vorne. Gefragt wird deshalb, von wo die Person überwiegend schaut. Bei der Wahl hilft: Zwischen `hinten` und
`rechts` ändert sich nur das Bild, zwischen `vorne` und `links` auch die Spalten.

Jedes Feld der ausführlichen Form darf zusätzlich angegeben werden und gewinnt dann gegen die Regel,
wie `bildNeben` im Beispiel. So bleibt für jede Besonderheit ein Ausweg, ohne die Position wieder ganz
ausschreiben zu müssen.

### 4.3 Der Kurs als Daten

Der Kurs steht genau einmal im Code und gilt für alle Positionen:

| Fahrweg | Spalte | Bild-ID | Klassen |
|---|---|---|---|
| Start | `start` | `StartZiel` | alle |
| Tore 1 bis 4, Hinfahrt | `t1a` … `t4a` | `Tor1` … `Tor4` | alle |
| Tor 5, Hinfahrt | `t5` | `Tor5` | alle |
| Fehler Tor 5 | Katalog `tor5` | – | alle |
| Tor 5, Rückfahrt | `t5` | `Tor5` | alle |
| Tore 4 bis 2, Rückfahrt | `t4b` … `t2b` | `Tor4` … `Tor2` | alle |
| Tor 1, Rückfahrt | `t1b` | `Tor1` | alle außer 4 |
| Mann-über-Bord | Katalog `mueb` | `Schikane` | 4, 5, 6, 7 |
| Speed 1 | `speed1` | `Speedboje_oben` | 5, 6, 7 |
| Speed 2 | `speed2` | `Speedboje_unten` | 7 |
| Tor 1, Ende der Speedrunde | `t1c` | `Tor1` | 7 |
| Ziel | `ziel` | `StartZiel` | alle |

Klasse 7 passiert Tor 1 also dreimal: auf der Hinfahrt, auf der Rückfahrt vor Mann-über-Bord und am
Ende der Speedrunde um Speed 1 und Speed 2.

**Korrigiert (07.11.2026):** Speed 1 stand hier und in den Ergebnisspalten (`gemeinsam.yaml`) vor
Tor 1 Rückfahrt, übernommen aus der DM-Liste 2026. Gefahren wird die Speedrunde aber erst nach
Mann-über-Bord. Die Ergebnisliste folgt jetzt der Fahrt und schreibt „MüB“ statt „SCH“, wie es in der
DM-Liste noch heißt. Die Prüfung in §5.1 konnte das nicht finden, weil keine heutige Liste Speed 1
zusammen mit Tor 1 oder MüB hat. Bei Möwe wäre es aufgefallen (§5.2).

Die Seite einer Boje ist physisch festgelegt: `seiteA` ist die untere Boje im Bild, `seiteB` die obere.
R/L, Land/See und die anderen Kürzel bleiben reine Beschriftung (`beschriftungen`).

`rechts` meint die rechte Seite auf der Hinfahrt. Das ist im Bild unten, so wie bei Berlin „Rechts“.

### 4.4 Kursvarianten

Ein Austragungsort kann vom Kurs abweichen, ohne dass sich der Fahrweg ändert. Eine Kursvariante nennt
nur ihre Abweichungen und wird am Aufbau gewählt:

```yaml
kurse:
  - id: moewe
    name: Möwe-Parcours
    bilder: { 5: Klasse5_Moewe, 6: Klasse6_Moewe, 7: Klasse7_Moewe }   # aus alcatraz_Parcours
```

- **`bilder`:** eigene Quellbilder je Klasse, die übrigen Klassen nutzen die Standardbilder. Das gilt für
  alle Positionen des Aufbaus, auch für MüB und Parcours. Bei Möwe läuft in Klasse 5 und 6 die Speedrunde
  andersherum, die Felder bleiben dieselben.
- **Fehlt eine Boje vor Ort, bleiben ihre Felder.** Beispiele sind Tonne 8 bei Möwe oder Start und Ziel
  als Linie ohne Bojen. Die WKR lassen die Spalte leer. So hat jeder Aufbau dieselben Felder, und Listen,
  Prüfung auf Lücken und Ergebnisliste brauchen keine Ausnahme. Nur das Bild zeigt, was vor Ort liegt:
  Bei Möwe fehlt Tonne 8 schon im Quellbild.
- Die Bilder der Variante müssen dieselben Element-IDs haben. Bei Möwe stimmt das: Nur in Klasse 7 fehlt
  `Speedboje_unten`, und das ist heute schon bei allen Klassen ohne Speed 2 so. Das Abblenden funktioniert
  deshalb unverändert.

**Umgesetzt (07.11.2026):** Der Generator legt ohnehin alle Quellbilder in jeden erzeugten Ordner, auch
`Klasse5_Moewe`. Die Variante wählt deshalb nur beim Anzeigen die Datei je Klasse (`bildDatei` in
`active.ts`, auch in der PDF-Insel). Das gilt für jede Liste des Aufbaus, auch für die gemeinsamen
Listen MüB und Parcours; neue Bildordner braucht es nur bei neuer Abblendung. Ein Test prüft, dass jede
Datei einer Variante in jedem erzeugten Ordner liegt.

### 4.5 Zeitnahme

Bei der DM 2026 gab es drei Zeit-Blätter: eine Lichtschranke und zwei Stoppuhren. Gewertet wurde die
Lichtschranke, die Stoppuhren nur bei ihrem Ausfall. Auf den Blättern stand trotzdem nur „Zeit 1“ bis
„Zeit 3“. Möwe hat nur die elektronische Zeiterfassung.

- **Zeit ist eine Aufgabe.** Jede Liste mit `aufgaben: [zeit]` bekommt Zeitspalten, auch zusammen mit
  Bojen wie bei Berlin Start/Ziel.
- **`zeiten`** nennt die Geräte der Liste, je Gerät eine Spalte, zum Beispiel `[elektronisch]` oder
  `[stoppuhr, stoppuhr]`. Ohne Angabe gelten drei Stoppuhren wie heute.
- **Der Titel nennt das Gerät:** „Elektronische Zeiterfassung“ oder „Stoppuhr“, mehrfach nummeriert wie
  heute „Zeit (1)“. Ein eigener `titel` gewinnt.
- **`- zeit`** bleibt als Kurzschrift für eine Liste nur mit Zeit erhalten.
- **IDs bleiben:** Die Listen heißen weiter `zeit-1` … und die Spalten `zeit1` …. Links, QR-Codes und
  Eingaben von vorher funktionieren also weiter.
- **Ergebnisliste:** Gibt es eine elektronische Zeit, gilt sie, sonst der Mittelwert der Stoppuhren.
  Vorher rechnete sie den Mittelwert aller eingetragenen Zeiten, bei der DM 2026 also die Lichtschranke
  mit den Stoppuhren zusammen.
- **Beispielwerte:** Die Wahl „Lichtschranke“ füllt die elektronische Spalte, ohne eine solche die erste.
  „Stoppuhr“ füllt die Stoppuhr-Spalten.

**Umgesetzt (07.11.2026)** ohne Kurzform: Eine Zeitspalte nennt ihr Gerät (`geraet`), eine Position kann
`zeiten` haben, und ein Eintrag im Aufbau wandelt sie ab, etwa `{ id: zeit, zeiten: [elektronisch] }`.
Abwandlungen sind immer nummeriert. Alcatraz-DM26 hat so „Elektronische Zeiterfassung“, „Stoppuhr (1)“
und „Stoppuhr (2)“ mit je einer Spalte, weiter als `zeit-1` bis `zeit-3`. Die Kurzform übernimmt das
später für `aufgaben: [zeit]`.

### 4.6 Einbau

Ein neues Modul `src/config/kurzform.ts` wandelt eine Kurzform in die heutige Roh-Position
(`RawPosition`) um. Es braucht keinen Bundler, wie `feld.ts` und `kombi.ts`, und läuft dadurch im
Build, in den Prüfungen und im Browser. Der Aufruf gehört vor `buildConfig`. Alles danach bleibt
unverändert: Bögen, Eingaben, Ergebnislisten, Laufzettel, QR-Code und Prüfungen.

**Umgesetzt (07.11.2026):** Eine Position ohne `spalten` ist eine Kurzform. Sie steht unter `positionen:`
oder direkt im Aufbau und braucht `id` und `titel`. `aufloesen()` schreibt sie aus: beim Laden in der
App (`mergeAndBuild`), im Bildgenerator und in der Prüfung, die vorher Blick, Bojen und Aufgaben gegen
den festen Wortschatz prüft. `config:sync` lässt die Kurzform in `public/config/positionen.yaml` stehen,
weil der Assistent sie als Vorlage braucht. Die Abblendung entsteht in der Form, die der Generator schon kannte: ein Tor als Ganzes, wenn
keine seiner Bojen beobachtet wird, sonst die einzelne Boje. Kurzformen direkt im Aufbau, wie in §4.1,
kommen mit den eigenen Aufbauten (§8).

## 5. Prüfung

### 5.1 Gegen die heutige Konfiguration

Vor dem Umbau leitete ein Skript 19 Positionen je Klasse aus der Kurzform ab und verglich sie mit den
handgeschriebenen Quelldateien. Seit die Positionen selbst in Kurzform stehen (§10, Schritt 4), hält
`src/config/kurzform.test.ts` das fest: Ein Snapshot, aufgenommen von den handgeschriebenen Listen, nennt
je Position die Felder je Klasse in ihrer Reihenfolge, Disq.- und Bemerkungsfelder, `innen`, Bild,
Abblendung, Drehung, Pfeile, Disqualifikationen und Katalog. Die Kurzform muss ihn treffen.

**Ergebnis:**

| Prüfung | Ergebnis |
|---|---|
| Bojenfelder, ihre Reihenfolge und Klassen | alle 19 gleich, seit Baden-Württemberg korrigiert ist (§6) |
| Abblendung im Bild, Bild ja oder nein | alle gleich |
| `pfeileSpiegeln`, `disq` | alle gleich |
| `innen` | alle gleich |
| `bildDrehung` | alle gleich, seit Wasser 1 und 2 gedreht sind |
| Jedes abgeleitete Feld kommt in den Ergebnislisten vor | ja |
| Dasselbe Feld auf zwei Listen eines Aufbaus | kommt heute nicht vor |

**Korrigiert (07.11.2026):**

- **Wasser 1 und 2:** Bild um 180° gedreht wie bei Berlin Links. Bilder zeigen den Kurs immer aus der
  Sicht der Position.
- **Berlin Rechts, Klasse 7:** MüB steht jetzt zwischen der zweiten und der dritten Durchfahrt von Tor 1,
  vorher stand es dahinter.

**Diese Ausnahmen brauchen eine Regel oder eine Entscheidung:**

| Position | Heute | Aus dem Fahrweg | Vorschlag |
|---|---|---|---|
| Wasser 2 | `katalog: tor5`, aber keine Fehlerspalte | kein Katalog | Angabe entfällt; laut Lastenheft §4a steht ohne Fehlerspalte ohnehin kein Fehlerblock auf dem Bogen. |
| Berlin Links | Fehlerspalte hinter allen vier Bojen von Tor 5 | zwischen Hin- und Rückfahrt | Der Fahrweg gilt, auch mit beiden Bojen von Tor 5 (umgesetzt). |
| Tor 5 + Parcours mit Start und Ziel | Start und Ziel, dann Fehler | Fehler dazwischen | Regel: Bei der Parcoursüberwachung stehen die Bojen vorn. |

**Die Darstellung** prüft der Snapshot nicht, sie folgt Regeln. So ist sie umgesetzt (07.11.2026):

| Angabe | Regel |
|---|---|
| `subTrenner`, Trennlinien | Wie in §4.2. Berlin und die Listen mit Start und Ziel bekommen damit Linien, die sie vorher nicht hatten. |
| Beschriftung | „Tor 1“ …, „Start“, „Ziel“, „Sp. 1“, „Sp. 2“. Fehler allein auf der Liste heißen „Fehler“ mit „Fehlerpunkte“. Neben Bojen oder anderen Fehlern heißen sie „Fehler Tor 5“ und „Fehler MüB“ mit „F-Pkt.“, wie beim Steg „Fehler AB“. Menüs, Legende („Einfahrt Tor 5“) und Ergebnisliste („E“) bleiben bei „Einfahrt“. „Sp. 1“ statt „Speed 1“, weil die Spalten bei Berlin Links sonst zu schmal sind, und so steht es auch auf der Papierliste Alcatraz 2. |
| Disq., Σ, Bemerkung | Mit Punkten: Disq., Σ, dann Bemerkung. Ohne Punkte: Bemerkung, Disq. Bemerkung gibt es bei der Parcoursüberwachung und auf Fehlerlisten ohne Bojen. Neu: Σ auf der Parcoursliste mit Start und Ziel, bei MüB Disq. vor Σ. |
| `hinweis` | `blickrichtung` bei Bojen, `parcours` bei Parcoursüberwachung. Baden-Württemberg setzt `hinweis: keiner`: Mit dem Hinweis passt Wasser 1 nicht mehr auf eine Seite. |
| `bild` | Bleibt eine Angabe, damit die erzeugten Ordner ihre Namen behalten. Ohne sie heißt der Ordner wie die Position. |
| `bildNeben`, `bildBreite`, `menue` | Bleiben Angaben. |

Alle anderen Felder und Bilder stimmen. Bei Land 2 und Wasser 2 ändert sich nur der Text der
SVG-Bilder: Die Kurzform blendet Start/Ziel als Ganzes ab statt beide Bojen einzeln, die PNGs bleiben
gleich. Wasser 2 verliert die Angabe `katalog: tor5`, die keine Spalte hatte.

Zum Umfang: Die vier Dateien mit den Tor-Positionen hatten samt Kommentaren rund 24.000 Zeichen, jetzt
rund 5.700, Titel, Menü und Bildordner eingeschlossen.

### 5.2 Neuer Aufbau: Möwe-Parcours

Der WSC „Möwe“ Oranienburg hat eigene Parcoursbilder für Klasse 5 bis 7 (Repo Parcours, `*_Moewe`).
Vor Ort gilt:

- Eine Person steht auf Höhe von Tor 5 und schaut eher von hinten: Tor 1, Tor 3, Tor 5 rechts und die
  Fehler an Tor 5.
- Eine Person steht auf Höhe von Tor 2 und schaut von der linken Seite: Tor 2, Tor 4, Tor 5 links und
  Speed 1.
- Mann-über-Bord hat eine eigene Position.
- Start und Ziel sind eine Linie über die ganze Flussbreite, ohne Bojen. Die Zeit misst nur die
  elektronische Zeiterfassung. Start und Ziel stehen trotzdem auf der Zeitliste und bleiben leer, wenn es
  nichts einzutragen gibt. So hat jeder Aufbau dieselben Felder.
- Tonne 8 (Speed 2, Klasse 7) wird nicht ausgelegt. Die Starter kennen ihren Platz, die Spalte bleibt
  auf der Liste und wird ignoriert.

```yaml
aufbauten:
  - id: moewe
    name: Möwe
    kurs: moewe   # §4.4
    positionen:
      - { bojen: [StartZiel], aufgaben: [zeit], zeiten: [elektronisch] }
      - steg
      - { titel: "Tor 1 / 3 / 5", blick: hinten, bojen: [Tor1, Tor3, Tor5_unten, Speedboje_unten], aufgaben: [tor5] }
      - { titel: "Tor 2 / 4 / 5", blick: links, bojen: [Tor2, Tor4, Tor5_oben, Speedboje_oben] }
      - { titel: "Mann-über-Bord", blick: hinten, aufgaben: [mueb] }
      - { titel: "Parcours", aufgaben: [parcours] }
```

Abgeleitet für Klasse 7, mit den Regeln aus §4.2 und dem Fahrweg aus §4.3. A ist die untere Boje im
Bild, B die obere, ‖ eine doppelte Linie:

| Liste | Spalten | Bild |
|---|---|---|
| Tor 1 / 3 / 5 | Tor 1 (A, B) · Tor 3 (A, B) · Tor 5 Hin (A) · Fehler Tor 5 ‖ Tor 5 Rück (A) · Tor 3 · Tor 1 · Speed 2 · Tor 1 Speedrunde | 90°, wie Alcatraz |
| Tor 2 / 4 / 5 | Tor 2 (A, B) · Tor 4 (A, B) · Tor 5 Hin ‖ Rück (B) · Tor 4 · Tor 2 · Speed 1 | 180°, wie Berlin Links |
| Mann-über-Bord | Fehler | 90°, nur die Schikane hell |
| Elektronische Zeiterfassung | Zeit · Start (A, B) · Ziel (A, B) | Start/Ziel hell, wie Berlin Start/Ziel |

In den anderen Klassen fällt weg, was sie nicht fahren. Jede Boje und Aufgabe steht in jeder Klasse auf
genau einer Liste. Start und Ziel könnten statt auf der Zeitliste auch auf der Parcoursliste stehen, wie
bei `parcoursms`.

**Umgesetzt (07.11.2026)** in `src/config/aufbauten/moewe.yaml`, mit `kurs: moewe`. Die Zeitliste und
Tor 1 / 3 / 5 nutzen die Bildordner von Berlin Start/Ziel und „Tore 1 / 3 / 5 ohne Start/Ziel“, weil sie
genauso abblenden; nur Tor 2 / 4 / 5 von links bekommt einen eigenen. MüB und Parcours sind die
gemeinsamen Listen und zeigen im Möwe-Aufbau die Möwe-Bilder.

**Was das Konzept dafür gebraucht hat:** die Kursvariante (§4.4), Zeit mit einem Gerät (§4.5) und den
richtigen Fahrweg. Beim Durchspielen mit Speed 1 auf „Tor 1 / 3 / 5“ stand Speed 1 noch vor Tor 1. So
fiel der Fehler in §4.3 auf. Ohne Kurzform bräuchte Möwe fünf neue handgeschriebene Positionen, denn
auch MüB und Parcours zeigen andere Bilder, dazu einen eigenen Ordner mit Quellbildern und einen Build.

## 6. Befund Baden-Württemberg (korrigiert)

Alle vier Positionen hatten die Seiten gegenüber den anderen Aufbauten vertauscht: `seiteB` war in
`alcatraz.yaml` die obere Boje, in `bawue.yaml` die untere. Die Angaben zu `innen` waren passend
mitgedreht, und `bawue.yaml` trug den Vermerk „ENTWURF, Seiten prüfen“.

| Auswirkung | Vor der Korrektur |
|---|---|
| Punkte, Summen, Abblendung im Bild | stimmten |
| Kürzel Innen/Außen | stimmten, weil `innen` mitgedreht war |
| Kürzel R/L auf dem Bogen und in der Ergebnisliste | Dieselbe Boje hieß dort „L“ und sonst „R“. |
| Aufbau-Wechsel | Ein Eintrag blieb im selben Feld und sprang damit auf die gegenüberliegende Boje. |

**Korrektur (07.11.2026):** In `bawue.yaml` sind `seiteA` und `seiteB` getauscht, auch bei `innen` und
in den Kommentaren. Land beobachtet jetzt `seiteA`, die untere Boje, Wasser `seiteB`, die obere. Die
Bilder ändern sich dadurch nicht. Mit der Beschriftung „Land / See“ (`ls`) heißt die untere Seite jetzt
auf allen Listen „L“.

**Folgen:**

- Beim Aufbau-Wechsel landet ein Eintrag jetzt auf der Liste, die dieselbe Boje beobachtet. Beispiel aus
  dem Test: Tor 5 von „Tore 1/3/5“ (untere Boje) geht nach Land 2, vorher ging es nach Wasser 2.
- Einträge, die vor der Korrektur auf einer BaWü-Liste im Browser standen, erscheinen jetzt auf der
  Gegenseite (Land 1 ↔ Wasser 1, Land 2 ↔ Wasser 2). Eine Umrechnung gibt es nicht, weil es im Prototyp
  nur Test- und Beispielwerte gibt.

Mit der Kurzform kann der Fehler gar nicht mehr entstehen, weil die Seite aus der Bild-ID folgt.

## 7. Der Assistent

**Wer ihn nutzt:** Der Prototyp ist frei zugänglich, also kann jede Person den Assistenten nutzen, ohne
Anmeldung und ohne Repo-Zugang. Typisch ist die Auswertung oder der WKR-Kommissar vor der
WKR-Besprechung. Die WKR selbst arbeiten auf Papier. Ist ein Aufbau für andere wichtig oder wird er
öfter genutzt, kommt er als YAML ins Repo und steht dann allen im Menü (§8, „Übernahme ins Repo“).

Daraus folgt:

- **Ohne Anleitung bedienbar:** Klartext statt Fachbegriffen aus der YAML, die Vorschau als Kontrolle und
  verständliche Meldungen bei der Prüfung.
- **Nichts verlässt den Browser von selbst.** Es gibt keinen Server. Weitergabe geht nur über Link oder
  Datei, und die Person entscheidet selbst darüber.
- **Fremde Links und Dateien werden geprüft** (§8), denn jede Person kann sie erstellen.
- **Eigene Aufbauten sind erkennbar** und gehen nicht mit denen aus dem Repo durcheinander, auch nicht in
  Link und QR-Code.

Er gehört direkt in die App, als Bereich „Eigener Aufbau“. Die Vorschau rechts bleibt, sie zeigt die
echten Bögen und ist damit schon die Kontrolle.

1. **Vorlage wählen:** ein vorhandener Aufbau oder leer. Die meisten Fälle sind kleine Änderungen. Dazu
   der Kurs: Standard oder eine Variante wie Möwe.
2. **Zeitnahme und Bausteine wählen:** welche Geräte es gibt (elektronisch, Stoppuhren) und ob jedes ein
   eigenes Blatt bekommt; Vorsteg ja oder nein, Steg, Knoten.
3. **Positionen anlegen:** Name und Standort. Gefragt wird, von wo die Person überwiegend schaut, in
   Klartext: „von hinten, hinter Tor 5“ (`hinten`), „von vorne, vom Start/Ziel“ (`vorne`), „von der
   rechten Seite“, „von der linken Seite“.
4. **Zuordnen:** Eine Tabelle mit Bojen und Aufgaben als Zeilen und Positionen als Spalten. Ein Klick
   setzt den Punkt. Standard sind ganze Tore, Einzelbojen lassen sich aufklappen.

   ```text
                       Tor 1/3/5   Tor 2/4/5   Tor 5   MüB   Parcours
   Start/Ziel                                                   ●
   Tor 1 (aufklappbar)    ●
   Tor 2                              ●
   Tor 3                  ●
   Tor 4                              ●
   Tor 5 unten            ●
   Tor 5 oben                         ●
   Speed 1 (ab Kl. 5)                 ●
   Speed 2 (Kl. 7)        ●
   Fehler Tor 5                                ●
   Mann-über-Bord (ab 4)                               ●
   Parcoursüberwachung                                          ●
   ```

5. **Prüfen, laufend beim Klicken:**
   - Rot: Eine Boje oder Aufgabe fehlt. Das ist die vorhandene Prüfung `ueberwachungsLuecken`.
   - Gelb: Eine Boje steht auf zwei Listen. Beide Listen teilen sich dann einen Wert, weil die Eingaben
     am Feld hängen. Diese Prüfung ist neu.
6. **Speichern:** Der Aufbau steht danach im Aufbau-Menü, gekennzeichnet als eigener.

**Umgesetzt (08.11.2026)** als breiter Bereich oberhalb der Bögen, die darunter live den Entwurf zeigen
(Vorschau-Klasse wählbar). Abweichend von den Schritten oben stehen Zeitnahme und Positionen zusammen in
der Tabelle: Jede Spalte hat Name, Blick, Zeitnahme und „Bild klein“. Positionen aus einer Vorlage im
Repo werden mit neuer ID kopiert; beim Bearbeiten bleiben die IDs. Rot zeigt die Prüfung auf Lücken je
Klasse, gelb doppelte Felder und Spalten ohne Inhalt. Beim Speichern läuft die volle Prüfung.

Das macht die Option „Tor 5 übernimmt die Parcoursüberwachung“ für eigene Aufbauten überflüssig: Beide
Aufgaben stehen einfach auf derselben Position. Für die Aufbauten aus dem Repo bleibt sie.

Eingaben überleben eine Änderung am Aufbau, denn sie hängen am Feld, nicht an der Liste. Wandert eine
Boje auf eine andere Liste, wandert ihr Wert mit. Disq., Bemerkung und WKR-Name gehören dagegen zu ihrer
Liste. Beim Wechsel des Aufbaus zieht `listenUmziehen` sie um; dasselbe muss beim Ändern eines eigenen
Aufbaus passieren.

**Ausbaustufe:** Bojen direkt im Parcoursbild anklicken statt in der Tabelle. Das ist vermutlich am
anschaulichsten und wegen der stabilen IDs machbar, setzt aber dasselbe Datenmodell voraus. Deshalb
kommt erst die Tabelle.

## 8. Speichern und Weitergeben

Die Frage „YAML-Download oder Browser“ beantwortet das Konzept mit beidem, aber mit getrennten Rollen:

| Weg | Stärke | Schwäche | Rolle |
|---|---|---|---|
| Browser | sofort, ohne Repo und Build | nur dieses Gerät, Browserdaten können verschwinden | Arbeitskopie |
| Einstellungs-Link | gibt es schon, die Kurzform braucht nur rund 300 Zeichen | sehr lange Links | Weitergabe |
| YAML-Datei | lesbar, archivierbar, gleiche Form wie im Repo | wirkt erst nach Import oder Commit | Sicherung, Übernahme ins Repo |

Ein reiner YAML-Download wäre eine Sackgasse: GitHub Pages hat keinen Upload, die Veranstaltung bräuchte
also wieder Commit und Build, und die Bilder entstehen heute beim Build. Nur der Browser wäre zu flüchtig,
denn die Person am Druckplatz ist oft eine andere als die, die den Aufbau anlegt.

**Browser:** Eigene Aufbauten liegen unter einem eigenen Schlüssel, zum Beispiel
`fehlerpunkte-prototyp:aufbauten:v1`, getrennt vom Stand `fehlerpunkte-prototyp:v1`. So löscht „Alles
zurücksetzen“ sie nicht. Gelöscht wird ein eigener Aufbau einzeln, mit einem eigenen Knopf im Bereich
„Eigener Aufbau“ und einer Rückfrage. Beim Start kommen sie zu den Roh-Positionen, bevor die
Konfiguration gebaut wird.

**Link:** Die Definition kommt als neues Feld in den Parameter `c`, nur bei eigenen Aufbauten. Bei einer
ganzen DM ist der Link heute schon rund 5.400 Zeichen lang (geschätzt mit 12 Startern je Klasse), die
Kurzform fällt also kaum auf. Wie in Lastenheft §8a hat der Link Vorrang: Unbekannter Aufbau wird
übernommen; gleicher Aufbau mit anderem Inhalt gilt wie im Link, der lokale bleibt als Kopie erhalten.

**YAML:** Export und Import nutzen die Form aus §4.1. Ein Aufbau lässt sich dadurch ohne Umbau ins Repo
übernehmen: Datei nach `src/config/aufbauten/` legen und in `aufbauten.yaml` eintragen.

**Übernahme ins Repo:** Ist ein eigener Aufbau für andere wichtig oder wird er öfter genutzt, kommt er
dauerhaft in den Prototyp.

1. Die Person lädt die YAML herunter und schickt sie an das Repo-Team, per GitHub-Issue oder E-Mail.
   Ein Kopf in der Datei nennt Datum, App-Version und Regelwerk.
2. Das Repo-Team legt die Datei unter `src/config/aufbauten/` ab, trägt sie in `aufbauten.yaml` ein und
   prüft mit `npm run check`. Der Build erzeugt dabei die Bilder.
3. Die ID bleibt gleich. So funktionieren Links und QR-Codes von vorher weiter.
4. Findet die App danach einen eigenen Aufbau mit derselben ID wie einen aus dem Repo, gilt der aus dem
   Repo. Sie zeigt einen Hinweis und bietet an, die eigene Kopie zu löschen. Weichen beide voneinander
   ab, bleibt die Kopie unter neuem Namen erhalten.

Damit IDs eigener Aufbauten nicht mit späteren aus dem Repo zusammenstoßen, wählt der Assistent sie
eindeutig: aus dem Namen und einem kurzen Zufallsteil, ohne Trennzeichen (§9), zum Beispiel `sommercupx7k2`.

**Umgesetzt (07./08.11.2026):** `src/config/eigene.ts` (Prüfung, YAML, Vorrang des Links),
`src/lib/storage.ts` (Schlüssel `fehlerpunkte-prototyp:aufbauten:v1`), `buildInitialState` sortiert
Bögen mit unbekannter Position aus (§9). Ein Aufbau aus dem Repo verdeckt einen eigenen mit derselben
ID; abweichende Kopien werden noch nicht umbenannt, sondern nur angezeigt und können gelöscht werden.
Die IDs vergibt der Assistent (Schritt 8); in Dateien stehen sie schon.

**Fremde Eingaben:** Links und Dateien kommen von anderen. Vor der Übernahme laufen sie durch die Prüfung,
und Bojen und Aufgaben müssen zum festen Wortschatz gehören. Ein Fehler wird angezeigt und nichts übernommen.

## 9. Technische Folgen

- **Bilder im Browser:** Eigene Aufbauten haben keine vorgebauten Bilder. `applyDimming`, `ohneRahmen`,
  `deriveDimSet` und `kleinesBild` arbeiten nur auf Text und Daten. Sie ziehen aus
  `scripts/generate-parcours.ts` nach `src/`, das Skript nutzt sie von dort weiter. `CourseImage.vue` lädt
  dann die Quelle (`alcatraz_Parcours/Klasse*.svg`, rund 35 KB), blendet ab und zeigt das Ergebnis als
  Blob-URL. Am Bildschirm und im Browser-Druck sollte das gehen; das Raster-PDF (html2canvas) ist zu testen.
  **Umgesetzt (07.11.2026):** `src/lib/parcoursbild.ts` enthält den Kern, `bildVorgabe` und `bildSvg`
  bündeln Quelle, Abblendung und Ziffern. Eine Position mit `bildImBrowser: true` braucht keinen
  Bildordner; `CourseImage.vue` erzeugt ihr Bild als Blob-URL, gleiche Bilder nur einmal
  (`parcoursbildBrowser.ts`). Ein Test prüft für jede Position des Repos, dass der Browser dieselben
  SVGs erzeugt wie der Build. Noch nicht geprüft ist das Raster-PDF (html2canvas).
- **Kursvariante:** Generator und Browser wählen das Quellbild je Klasse aus der Variante. Fahrweg,
  Felder, `ueberwachungsLuecken` und Ergebnisliste bleiben unverändert.
- **Zeit:** Die Zeitspalte kennt ihr Gerät. `mittlereZeit` in `src/lib/ergebnis.ts` nimmt danach die
  elektronische Zeit und nur ohne sie den Mittelwert der Stoppuhren.
- **PDF-Insel:** Sie braucht PNGs. **Umgesetzt:** Im Browser erzeugte Bilder rastert sie per Canvas in
  doppelter Auflösung, wie die PNGs des Builds.
- **Unbekannte Positionen:** Steht in einem Link eine Bogen-Auswahl mit unbekannter Position, warf
  `getSheetDef` „Unbekannte Position“. **Umgesetzt:** `buildInitialState` sortiert solche Bögen aus, ebenso
  das Löschen eines eigenen Aufbaus.
- **IDs:** Position und Aufbau bekommen beim Anlegen eine feste ID aus `a-z0-9`. Die Zeichen `:`, `/`, `@`
  und `-` sind vergeben (Link, Lauf-Schlüssel, `disq@steg`, `zeit-1`). Die ID steht auch im QR-Code
  (in Großbuchstaben, `FP2.….ZEIT.S1`) und bleibt deshalb bei Änderungen gleich.
- **Prüfungen:** `validate.ts` hängt nicht an Node und läuft auch im Browser. Neu kommt die Warnung für
  doppelte Felder dazu, auch in `config:check`.
- **Nicht geprüft:** Regelwerks-Wechsel auf UIM mit einem eigenen Aufbau. Vorschlag: Den Assistenten gibt
  es vorerst nur bei DM 2026.
- **Später möglich:** Laufen die Bilder im Browser, könnten die 14 erzeugten Bildordner (rund 29 MB) aus
  dem Repo verschwinden. Nur die PDF-Insel braucht noch PNGs.

## 10. Umsetzung in Schritten

Jeder Schritt ist einzeln nutzbar und endet mit Tests.

1. **Baden-Württemberg klären** (§6). Erledigt: Die Seiten sind angeglichen.
2. **Ergebnisliste in der Reihenfolge der Fahrt** (§4.3). Erledigt: MüB vor der Speedrunde, Beschriftung
   „MüB“ statt „SCH“. Ebenso erledigt: Berlin Rechts in dieser Reihenfolge, Wasser 1 und 2 um 180°
   gedreht (§5.1).
3. **Zeitnahme** (§4.5). Erledigt: Geräte an den Zeitspalten (`geraet`), Titel nach Gerät, elektronische
   Zeit vor Stoppuhr. Ohne Kurzform wandelt ein Eintrag im Aufbau die Position ab,
   `{ id: zeit, zeiten: [elektronisch] }`; Alcatraz-DM26 nutzt das für seine drei Zeitlisten.
4. **Kurzform.** Erledigt: `src/config/kurzform.ts` mit Fahrweg und Regeln für die Darstellung, alle 19
   Positionen aus §5.1 stehen in Kurzform. `config:sync` schreibt sie aus, `config:check` prüft Blick,
   Bojen und Aufgaben. Der Test aus §5.1 ersetzt das Prüfskript.
5. **Kursvariante** (§4.4). Erledigt: `kurse` mit Bildern je Klasse, Möwe als erster Aufbau im Repo
   (`src/config/aufbauten/moewe.yaml`, §5.2).
6. **Bilder im Browser** (§9). Erledigt: `bildImBrowser: true` an einer Position; noch nutzt sie keine
   Position im Repo, die eigenen Aufbauten werden es tun.
7. **Speicher, Link und YAML** (§8). Erledigt: eigene Aufbauten im Browser, im Einstellungs-Link und als
   YAML-Datei, bedienbar über „Eigenen Aufbau laden“, „Aufbau als YAML speichern“ und „Löschen“
   (Lastenheft §8h). Positionen dürfen dafür in Kurzform direkt im Aufbau stehen.
8. **Assistent** (§7). Erledigt: `src/components/AufbauAssistent.vue` oberhalb der Bögen, Datenmodell in
   `src/lib/assistent.ts`. Die Bögen zeigen den Entwurf live; Zeitlisten sind Spalten mit Zeitnahme,
   damit Start und Ziel auch auf die Zeitliste können (Möwe).
9. **Ausbau, falls gewünscht:** Klicken im Bild; `ergebnisspalten` und `ueberwachung` aus dem Fahrweg
   ableiten.

**Zum Schluss:** Lastenheft (§4, §8a, §12a) und README nachziehen.

## 11. Offene Fragen

**Geklärt (07.11.2026):**

- **Wer den Assistenten bedient:** jede Person, denn der Prototyp ist frei zugänglich. Wichtige oder
  häufige Aufbauten kommen als YAML ins Repo (§7, §8).
- **Baden-Württemberg, Seiten:** angeglichen (§6).
- **Blick:** bleibt bei vier Werten, keine Gradzahl (§4.2).
- **Trennlinien:** Regel statt Handarbeit (§4.2).
- **Reihenfolge Tor 1, MüB, Speedrunde:** so wie gefahren, auch in der Ergebnisliste (§4.3). Bei
  Klasse 7 liegt MüB zwischen der zweiten und der dritten Durchfahrt von Tor 1, auch bei Berlin Rechts.
- **Bilder:** immer aus der Sicht der Position. Wer links vom Parcours sitzt, bekommt das Bild um 180°
  gedreht, auch bei Baden-Württemberg Wasser 1 und 2 (§5.1) und bei Möwe (§5.2).
- **Zeitnahme:** flexibel, mit dem Gerät auf der Liste (§4.5).
- **Möwe:** Zuordnung und Tonne 8 (§5.2).
- **„Alles zurücksetzen“:** Eigene Aufbauten bleiben erhalten. Löschen geht einzeln mit eigenem Knopf (§8).
- **Beschriftungen:** werden angeglichen, „Sp. 1“, „Tor 5 tief“ und „MüB Fehler“ eingeschlossen (§5.1).
- **Übernahme ins Repo:** per GitHub-Issue oder E-Mail (§8).
- **Möwe, Start und Ziel:** Die Felder bleiben auf der Zeitliste, auch ohne Bojen. Was nichts zu
  beobachten hat, bleibt leer (§5.2).
- **Zeit in der Ergebnisliste:** Die elektronische Zeit geht vor, die Stoppuhren gelten nur ohne sie
  (§4.5).

- **Bojen, die vor Ort fehlen:** Ihre Felder bleiben und werden auf den Listen ignoriert, bei Möwe also
  auch Speed 2 in Klasse 7 auf „Tor 1 / 3 / 5“ (§4.4, §5.2).

**Offen:** derzeit nichts.
