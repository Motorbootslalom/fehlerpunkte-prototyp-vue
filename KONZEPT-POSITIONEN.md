# Konzept: WKR-Positionen einfacher konfigurieren

Stand: 07.11.2026. **Vorschlag zum Abstimmen, noch nicht umgesetzt.** Offene Fragen stehen in §11.
Die Prüfung aus §5 lässt sich jederzeit wiederholen: `node scripts/konzept-positionen.ts`.

Eine Veranstaltung hat wenige Personen und oft eigene Standorte am Kurs. Eine neue Verteilung der
WKR-Positionen braucht heute Repo, Build und Deploy. Das Konzept schlägt drei Dinge vor, die
aufeinander aufbauen: eine kurze Beschreibung der Positionen (§4), einen Assistenten in der App (§7)
und einen Weg, das Ergebnis zu speichern und weiterzugeben (§8).

## 1. Abgrenzung

- Es geht um das normale DM-Umfeld: Regelwerk DM 2026, Disziplin Manövrieren, ein Kurs, Klassen E
  und 1 bis 7.
- Parallelslalom hat eigene Bojen und bleibt in der ausführlichen Form, ebenso alles aus
  `KONZEPT-UIM.md`. Die ausführliche Form bleibt überall gültig.
- Zeit, Steg, Vorsteg und Knoten bleiben feste Bausteine. Sie werden nur ausgewählt, nicht abgeleitet.
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
- **Handarbeit läuft auseinander**, siehe den Befund zu Baden-Württemberg in §6.

## 3. Begriffe

| Begriff | Bedeutung |
|---|---|
| Kurzform | Beschreibung einer Position durch ihre Bojen, Aufgaben und ihren Blick. |
| Boje | ID aus dem Parcoursbild: ein ganzes Tor (`Tor1`) oder eine Einzelboje (`Tor1_innen`, `Tor5_oben`). |
| Aufgabe | Was keine Boje ist: `zeit`, `tor5` (Einfahrt), `mueb`, `parcours`. |
| Blick | Wo die Person steht: `hinten`, `vorne`, `rechts`, `links`. |
| Baustein | Feste Liste, die nur gewählt wird: Zeit, Steg, Vorsteg, Knoten. |
| Fahrweg | Die Bojen und Aufgaben in der Reihenfolge, in der das Boot sie passiert. |
| Eigener Aufbau | Ein Aufbau, der im Browser liegt, nicht im Repo. |

## 4. Die Kurzform

### 4.1 Beispiel

```yaml
aufbauten:
  - id: alcatrazdm26
    name: Alcatraz-DM26
    positionen:
      - zeit
      - zeit
      - zeit
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
| Einfahrt Tor 5 | Katalog `tor5` | – | alle |
| Tor 5, Rückfahrt | `t5` | `Tor5` | alle |
| Tore 4 bis 2, Rückfahrt | `t4b` … `t2b` | `Tor4` … `Tor2` | alle |
| Speed 1 | `speed1` | `Speedboje_oben` | 5, 6, 7 |
| Tor 1, Rückfahrt | `t1b` | `Tor1` | alle außer 4 |
| Mann-über-Bord | Katalog `mueb` | `Schikane` | 4, 5, 6, 7 |
| Speed 2 | `speed2` | `Speedboje_unten` | 7 |
| Tor 1, zweite Durchfahrt | `t1c` | `Tor1` | 7 |
| Ziel | `ziel` | `StartZiel` | alle |

Die Seite einer Boje ist physisch festgelegt: `seiteA` ist die untere Boje im Bild, `seiteB` die obere.
R/L, Land/See und die anderen Kürzel bleiben reine Beschriftung (`beschriftungen`).

`rechts` meint die rechte Seite auf der Hinfahrt. Das ist im Bild unten, so wie bei Berlin „Rechts“.

### 4.4 Einbau

Ein neues Modul `src/config/kurzform.ts` wandelt eine Kurzform in die heutige Roh-Position
(`RawPosition`) um. Es braucht keinen Bundler, wie `feld.ts` und `kombi.ts`, und läuft dadurch im
Build, in den Prüfungen und im Browser. Der Aufruf gehört vor `buildConfig`. Alles danach bleibt
unverändert: Bögen, Eingaben, Ergebnislisten, Laufzettel, QR-Code und Prüfungen.

## 5. Prüfung gegen die heutige Konfiguration

`scripts/konzept-positionen.ts` leitet 19 Positionen je Klasse aus der Kurzform ab und vergleicht sie
mit den echten Quelldateien. Die Schreibweise im Skript entspricht §4.1.

**Ergebnis:**

| Prüfung | Ergebnis |
|---|---|
| Bojenfelder, ihre Reihenfolge und Klassen | 15 von 19 gleich, 4 nur mit vertauschten Seiten (Baden-Württemberg, §6) |
| Abblendung im Bild, Bild ja oder nein | alle gleich |
| `pfeileSpiegeln`, `disq` | alle gleich |
| `innen` | gleich, nur in Baden-Württemberg vertauscht (§6) |
| `bildDrehung` | gleich außer bei Wasser 1 und 2 |
| Jedes abgeleitete Feld kommt in den Ergebnislisten vor | ja |
| Dasselbe Feld auf zwei Listen eines Aufbaus | kommt heute nicht vor |

**Diese Ausnahmen brauchen eine Regel oder eine Entscheidung:**

| Position | Heute | Aus dem Fahrweg | Vorschlag |
|---|---|---|---|
| Wasser 1, Wasser 2 | Bild 0° | 180°, wie von dieser Seite gesehen | Frage 2 in §11 |
| Wasser 2 | `katalog: tor5`, aber keine Fehlerspalte | kein Katalog | Angabe entfällt; laut Lastenheft §4a steht ohne Fehlerspalte ohnehin kein Fehlerblock auf dem Bogen. |
| Berlin Rechts | Kl. 7: MüB hinter der zweiten Durchfahrt von Tor 1 | MüB davor | Frage 3 in §11 |
| Berlin Links | Fehlerspalte hinter allen vier Bojen von Tor 5 | zwischen Hin- und Rückfahrt | Regel: Tor 5 mit beiden Bojen bleibt eine Gruppe, die Fehlerspalte folgt dahinter. |
| Tor 5 + Parcours mit Start und Ziel | Start und Ziel, dann Fehler | Fehler dazwischen | Regel: Bei der Parcoursüberwachung stehen die Bojen vorn. |

**Nicht geprüft und noch nicht abgeleitet** ist die Darstellung. Das Skript listet sie je Position auf.
Dafür braucht es Standardwerte und einzelne Überschreibungen:

| Angabe | Vorschlag |
|---|---|
| `subTrenner`, Trennlinien | Gepunktet zwischen zwei Bojen bei `hinten` und `vorne`, doppelt an der Wende bei Einzelbojen. Berlin weicht davon ab. |
| Beschriftung | Standard aus dem Fahrweg. Abweichungen wie „Sp. 1“ oder „Tor 5 tief“ prüfen und möglichst vereinheitlichen. |
| Disq., Σ, Bemerkung | Disq. immer, Σ bei Punkten, Bemerkung bei Fehlerlisten. Das deckt noch nicht alles ab: Tor-Listen haben heute keine Bemerkung, die Parcours-Listen keine Σ, auch wenn sie Bojen haben. |
| `bildNeben`, `bildBreite`, `breite` | Bleiben Überschreibungen. |
| `hinweis` | Standard `blickrichtung` bei Bojen, `parcours` bei Parcoursüberwachung. Baden-Württemberg zeigt heute keinen. |

Zum Umfang: Die vier Dateien mit den Tor-Positionen haben samt Kommentaren 23.513 Zeichen, die
Kurzform dieser 13 Positionen 1.075 Zeichen. Der Vergleich schmeichelt, denn Titel und Darstellung
fehlen in der Kurzform noch.

## 6. Befund Baden-Württemberg

Alle vier Positionen vertauschen die Seiten gegenüber den anderen Aufbauten. Laut den Kommentaren in
den Quelldateien ist `seiteB` in `alcatraz.yaml` die obere Boje, in `bawue.yaml` die untere. Alle
Angaben zu `innen` sind dort passend mitgedreht, und `bawue.yaml` trägt den Vermerk „ENTWURF, Seiten
prüfen“. Es ist also wohl ein Fehler, aber noch nicht bestätigt.

| Auswirkung | Stimmt das heute? |
|---|---|
| Punkte, Summen, Abblendung im Bild | ja |
| Kürzel Innen/Außen | ja, weil `innen` mitgedreht ist |
| Kürzel R/L auf dem Bogen und in der Ergebnisliste | Dieselbe Boje heißt dort „L“ und sonst „R“. |
| Aufbau-Wechsel | Ein Eintrag bleibt im selben Feld und springt damit auf die gegenüberliegende Boje. |

**Korrektur, wenn bestätigt:** in `bawue.yaml` `seiteA` und `seiteB` tauschen, auch bei `innen`. Das
geht unabhängig vom Assistenten, und mit der Kurzform kann der Fehler gar nicht mehr entstehen, weil die
Seite aus der Bild-ID folgt. Welche Seite „Land“ heißt, bleibt eine Frage der Beschriftung (`ls` oder
`sl`). Land unten im Bild ist nach der Korrektur `ls`.

## 7. Der Assistent

Annahme: Ihn bedient die Auswertung oder der WKR-Kommissar vor der WKR-Besprechung, am eigenen
Rechner und ohne Repo-Zugang. Die WKR selbst arbeiten auf Papier.

Er gehört direkt in die App, als Bereich „Eigener Aufbau“. Die Vorschau rechts bleibt, sie zeigt die
echten Bögen und ist damit schon die Kontrolle.

1. **Vorlage wählen:** ein vorhandener Aufbau oder leer. Die meisten Fälle sind kleine Änderungen.
2. **Bausteine wählen:** Anzahl der Zeitnahmen, Vorsteg ja oder nein, Steg, Knoten.
3. **Positionen anlegen:** Name und Standort, in Klartext: „hinter Tor 5“ (`hinten`), „am Start/Ziel“
   (`vorne`), „rechte Seite“, „linke Seite“.
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
   Einfahrt Tor 5                              ●
   Mann-über-Bord (ab 4)                               ●
   Parcoursüberwachung                                          ●
   ```

5. **Prüfen, laufend beim Klicken:**
   - Rot: Eine Boje oder Aufgabe fehlt. Das ist die vorhandene Prüfung `ueberwachungsLuecken`.
   - Gelb: Eine Boje steht auf zwei Listen. Beide Listen teilen sich dann einen Wert, weil die Eingaben
     am Feld hängen. Diese Prüfung ist neu.
6. **Speichern:** Der Aufbau steht danach im Aufbau-Menü, gekennzeichnet als eigener.

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
zurücksetzen“ sie nicht. Beim Start kommen sie zu den Roh-Positionen, bevor die Konfiguration gebaut wird.

**Link:** Die Definition kommt als neues Feld in den Parameter `c`, nur bei eigenen Aufbauten. Bei einer
ganzen DM ist der Link heute schon rund 5.400 Zeichen lang (geschätzt mit 12 Startern je Klasse), die
Kurzform fällt also kaum auf. Wie in Lastenheft §8a hat der Link Vorrang: Unbekannter Aufbau wird
übernommen; gleicher Aufbau mit anderem Inhalt gilt wie im Link, der lokale bleibt als Kopie erhalten.

**YAML:** Export und Import nutzen die Form aus §4.1. Ein Aufbau lässt sich dadurch ohne Umbau ins Repo
übernehmen: Datei nach `src/config/aufbauten/` legen und in `aufbauten.yaml` eintragen.

**Fremde Eingaben:** Links und Dateien kommen von anderen. Vor der Übernahme laufen sie durch die Prüfung,
und Bojen und Aufgaben müssen zum festen Wortschatz gehören. Ein Fehler wird angezeigt und nichts übernommen.

## 9. Technische Folgen

- **Bilder im Browser:** Eigene Aufbauten haben keine vorgebauten Bilder. `applyDimming`, `ohneRahmen`,
  `deriveDimSet` und `kleinesBild` arbeiten nur auf Text und Daten. Sie ziehen aus
  `scripts/generate-parcours.ts` nach `src/`, das Skript nutzt sie von dort weiter. `CourseImage.vue` lädt
  dann die Quelle (`alcatraz_Parcours/Klasse*.svg`, rund 35 KB), blendet ab und zeigt das Ergebnis als
  Blob-URL. Am Bildschirm und im Browser-Druck sollte das gehen; das Raster-PDF (html2canvas) ist zu testen.
- **PDF-Insel:** Sie braucht PNGs. Für eigene Aufbauten kommt zuerst kein Bild, später eine Rasterung per
  Canvas. Laut README ist sie ohnehin nur ein Vergleichsweg.
- **Unbekannte Positionen:** Steht in einem Link eine Bogen-Auswahl mit unbekannter Position, wirft
  `getSheetDef` laut Code „Unbekannte Position“. `buildInitialState` soll solche Bögen künftig aussortieren.
  Das ist auch ohne Assistent sinnvoll.
- **IDs:** Position und Aufbau bekommen beim Anlegen eine feste ID aus `a-z0-9`. Die Zeichen `:`, `/`, `@`
  und `-` sind vergeben (Link, Lauf-Schlüssel, `disq@steg`, `zeit-1`). Die ID steht auch im QR-Code (`t=`)
  und bleibt deshalb bei Änderungen gleich.
- **Prüfungen:** `validate.ts` hängt nicht an Node und läuft auch im Browser. Neu kommt die Warnung für
  doppelte Felder dazu, auch in `config:check`.
- **Nicht geprüft:** Regelwerks-Wechsel auf UIM mit einem eigenen Aufbau. Vorschlag: Den Assistenten gibt
  es vorerst nur bei DM 2026.
- **Später möglich:** Laufen die Bilder im Browser, könnten die 14 erzeugten Bildordner (rund 29 MB) aus
  dem Repo verschwinden. Nur die PDF-Insel braucht noch PNGs.

## 10. Umsetzung in Schritten

Jeder Schritt ist einzeln nutzbar und endet mit Tests.

1. **Baden-Württemberg klären** (§6). Das ist unabhängig vom Rest.
2. **Kurzform:** `kurzform.ts` mit Fahrweg und Regeln für die Darstellung. Ein Test verlangt, dass die
   Ableitung die heutigen Listen 1:1 nachbildet; er ersetzt `scripts/konzept-positionen.ts`. Danach ziehen
   die Positionen nach und nach um. Schon das macht neue Aufbauten im Repo zu wenigen Zeilen.
3. **Bilder im Browser** (§9), zuerst nur für eigene Aufbauten.
4. **Speicher, Link und YAML** (§8), bedienbar erst einmal über Import einer Datei.
5. **Assistent** (§7) mit Tabelle und laufender Prüfung.
6. **Ausbau, falls gewünscht:** Klicken im Bild; `ergebnisspalten` und `ueberwachung` aus dem Fahrweg
   ableiten.

**Zum Schluss:** Lastenheft (§4, §8a, §12a) und README nachziehen.

## 11. Offene Fragen

1. **Wer bedient den Assistenten?** Angenommen ist die Auswertung oder der WKR-Kommissar ohne Repo-Zugang
   (§7). Pflegt nur eine Person die Aufbauten im Repo, reichen vielleicht die Schritte 1 und 2.
2. **Baden-Württemberg:** Sollen die Seiten angeglichen werden (§6)? Sollen die Wasser-Bilder wie bei
   Berlin um 180° gedreht werden, so wie die Person den Kurs sieht? Heute stehen alle vier bei 0°.
3. **Berlin Rechts, Klasse 7:** Darf MüB an den Platz im Fahrweg rücken, also vor die zweite Durchfahrt von
   Tor 1? Vorschlag: ja, das entspricht der Fahrt und vermeidet eine Ausnahme.
4. **„Alles zurücksetzen“:** Sollen eigene Aufbauten das überleben? Vorschlag: ja, mit eigenem Knopf zum
   Löschen.
5. **Beschriftungen:** Sind „Sp. 1“, „Tor 5 tief“ und „MüB Fehler“ gewollt oder können sie vereinheitlicht
   werden?
