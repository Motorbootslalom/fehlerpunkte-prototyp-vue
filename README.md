# Fehlerpunkte - Motorbootslalom (Prototyp)

**Live-Demo:** _(nach Deploy)_ <https://motorbootslalom.github.io/fehlerpunkte-prototyp/>

Interaktiver Konzept-**Prototyp** für die **Eingabemasken der
Wettkampfrichter-Fehlerpunktlisten** (WKR-Listen) beim Motorboot-/Schlauchboot­slalom.
Schwesterprojekt zu *verzahnungs-prototyp*.

Ziel: mit den Fachteams abstimmen, wie eine Eingabemaske für Fehlerpunkte aussehen
kann, und das anderen Entwicklern anschaulich erklären. Kernidee (wie bei der
bisherigen Excel-Lösung): **Eingabe und Ausdruck sind dieselbe Ansicht** - so ist
die Kontrolle der Eintragungen extrem einfach.

Die ausführlichen Anforderungen stehen im **[Lastenheft](./LASTENHEFT.md)**.

Es werden **keine echten personenbezogenen Daten** verarbeitet; alle Eingaben
bleiben ausschließlich **lokal im Browser** (localStorage) und überleben ein Reload.

## Funktionen

- **Konfigurierbare Positionen** (per YAML, siehe unten): mitgeliefert sind die
  Alcatraz-Listen (Tore 1/3/5, Tore 2/4/5, Tor 5, Mann-über-Bord/Schikane, Steg,
  Zeit, Knoten, Parcours einfach) plus Beispiel-Positionen. Eigene Positionen mit
  anderer Spaltenreihenfolge/Blickrichtung lassen sich frei ergänzen.
- **WYSIWYG:** Bildschirm-Eingabemaske = Druckansicht. Zellen sind direkt
  beschreibbar.
- **Automatische Summen (Σ):** Bojenberührungen × 5 bzw. Fehlercodes → Punkte
  laut Legende, laufend aufsummiert. Bei Mann-über-Bord/Schikane liegt die
  Σ-Spalte bewusst mittig.
- **Disqualifikation verorten:** Codes A-X in der Disq.-Spalte **oder** direkt in
  einer Tor-Spalte (dokumentiert Ort und Grund).
- **Schnelle Zeiteingabe** über das Numpad: eine Zahl mit Komma/Punkt, Regel
  „> 20 = Sekunden, ≤ 20 = Minuten“; Enter springt weiter; Anzeige normalisiert
  auf `mm:ss,00 (ss,00)`.
- **Parcoursbilder** (SVG) je Klasse auf den Tor-/Parcours-Bögen.
- **QR-Code** je Bogen für die spätere automatische Scanner-Zuordnung
  (Listentyp/Klasse/Lauf).
- **Drei Export-Wege zum Vergleich** (siehe unten): Browser-Druck, Raster-PDF
  (html2canvas + jsPDF) und ein **zweiter Prototyp als echtes Vektor-PDF**
  (`@react-pdf/renderer`, eigene Seite `pdf.html`).
- **Bögen zusammenstellen:** Listentyp, Klasse und Lauf je Bogen wählen,
  sortieren, hinzufügen/entfernen; Startnummern editierbar.

## Bedienung

Links die Steuerleiste (nur am Bildschirm, im Druck ausgeblendet):

1. Veranstaltungsnamen setzen.
2. Unter **Bögen** die gewünschten Listen zusammenstellen (Typ/Klasse/Lauf).
3. In den Bögen rechts die Werte eintragen - Σ und Zeiten aktualisieren sich live.
4. **Drucken / Als PDF (Browser)** oder **PDF herunterladen (JS)**.

## PDF-Export - drei Wege im Vergleich

Es gibt **zwei Einstiegspunkte** (Multi-Page-Build):

| Seite | URL | Ansatz |
| ----- | --- | ------ |
| Haupt-Prototyp | `index.html` | Eingabemaske + **Browser-Druck** (Vektor) & **Raster-Download** |
| Vektor-Prototyp | `pdf.html` | **echtes Vektor-PDF** via `@react-pdf/renderer` |

- **Browser-Druck → „Als PDF speichern"** (empfohlen): scharfer, markierbarer
  Text inkl. QR-Codes. Dateiname wird über `document.title` vorgeschlagen
  (mit Zeitstempel und - falls eindeutig - Position/Klasse/Lauf).
- **Raster-Download** (html2canvas + jsPDF): Ein-Klick-Download, aber gerastert
  (unschärfer). QR-Codes werden dafür als Canvas neu gezeichnet.
- **Vektor-Prototyp** (`pdf.html`): echtes, kleines Vektor-PDF mit Live-Vorschau
  und Ein-Klick-Download. Kopf **und** Spaltenüberschriften wiederholen sich
  zuverlässig auf jeder Seite (react-pdf `fixed`), inkl. mittiger Seitenzahlen,
  Vektor-QR und eingebetteter Schrift (Liberation Sans → korrektes „Σ"). Das
  **Parcoursbild** wird als PNG eingebettet - für die Tor-Bögen 90° gedreht,
  für Tor 5/Parcours quer (per Schalter ab-/zuschaltbar). Konfiguriert wird im
  Haupt-Prototyp (gemeinsamer localStorage); die Vergleichsseite dann neu laden.

Die Parcoursbilder liegen unter `../Parcours/dist/` als **SVG, PNG und PDF** vor
(eigenes Querformat ~226 × 95 mm, Seitenverhältnis 2,36:1 - kein A4). Der
Haupt-Prototyp nutzt die SVGs, der Vektor-Prototyp die PNGs.

Beide Seiten sind über einen Link miteinander verbunden.

## Konfiguration (Positionen & Fehlerpunkte)

Listen, Spalten und Fehlerpunkte sind **datengetrieben** und liegen in zwei
YAML-Dateien unter `public/config/` (werden zur Laufzeit geladen - Änderung
wirkt nach dem Neuladen der Seite, ohne Neubau):

- **`fehlerpunkte.yaml`** - Disqualifikationen und Fehler-Kataloge. Kommen aus
  der **Ausschreibung** und sind i. d. R. für alle gleich.
- **`positionen.yaml`** - die **orts-/personenabhängigen Positionen** (welche
  Liste, welche Spalten in welcher Reihenfolge, welches Bild/Drehung). Positionen
  binden Kataloge und wiederverwendbare **Hinweise** per Verweis (ID) ein.
  Positionen sind zu **Aufbauten (Setups)** gebündelt (z. B. `Alcatraz`, `Frontal`);
  ein Aufbau enthält alle genutzten Listen. Gemeinsame Listen (Zeit, Knoten, …)
  werden geteilt, nur die Tor-Positionen unterscheiden sich je Aufbau. In der
  Bedienleiste wählt man den Aufbau; das erzeugt dessen Bögen neu.

Wichtige Felder einer Position: `spalten` (Reihenfolge/Typen), `katalog`
(Verweis auf einen Fehler-Katalog), `hinweis` (Verweis auf einen Hinweistext),
`disq: alle | keine | [A, B, …]` (nicht relevante Disqualifikationen ausblenden),
`bild` + `bildDrehung: 0 | 90 | -90 | 180`.

**Globale Bojen-Kürzel:** Die Seiten-/Richtungskürzel stehen zentral unter
`bezeichnungen` (Token-Map, z. B. `seiteA: R`, `seiteB: L`). In `sub` und in den
Hinweisen werden die Tokens (`hin`, `rueck`, `seiteA`, `seiteB`) als ganze Wörter
ersetzt - so stellt man von Rechts/Links auf Land/See (`L`/`S`) oder Hafen/Kai
(`H`/`K`) an EINER Stelle um; die Spaltenköpfe und der Hinweis ziehen automatisch nach.

Die gebündelten Kopien unter `src/config/` dienen als Fallback (offline / falls
die Laufzeit-Datei fehlt oder fehlerhaft ist). Beide Prototypen (Eingabe und
Vektor-PDF) nutzen dieselbe Konfiguration.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

## Tests

Die Kernlogik (Zeit-Parsing, Punkte-/Disq-Berechnung, QR-Payload) und ein
UI-Render-Smoke-Test sind mit **Vitest** abgedeckt.

```bash
npm test            # alle Tests einmal ausführen
npm run test:watch  # Watch-Modus
npm run check       # Typecheck (tsc) + Tests - auch im pre-commit-Hook
```

Die Tests laufen automatisch **lokal bei jedem Commit** (Git-Hook
`.githooks/pre-commit`, aktiviert durch `npm install` via `prepare`; manuell:
`git config core.hooksPath .githooks`; Notausgang: `git commit --no-verify`) und
**in der CI** (`.github/workflows/ci.yml`) sowie vor jedem Pages-Deploy.

## Deployment auf GitHub Pages

1. Repository auf GitHub anlegen und pushen.
2. **Settings → Pages → Build and deployment → Source** = **GitHub Actions**.
3. Bei jedem Push auf `main` baut und deployt
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) nach
   <https://motorbootslalom.github.io/fehlerpunkte-prototyp/>.

Der Vite-`base` ist `./`, daher läuft der Build unter Projekt-Unterpfad **und** lokal.

## Assets

Die Parcoursbilder unter `public/parcours/` stammen aus `../Parcours/dist/`
(Verzeichnisse `alcatraz_I`, `alcatraz_II`, `alcatraz_Parcours`, SVG je Klasse).

## Tech-Stack

React 19 · TypeScript · Vite (Multi-Page) · qrcode-generator (QR) ·
html2canvas + jsPDF (Raster-Variante) · @react-pdf/renderer (Vektor-Prototyp).
Persistenz via localStorage.
