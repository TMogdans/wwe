# WWE – "Was wollen wir essen?" – Design

## Zusammenfassung

Eine lokale Rezeptdatenbank als Web-App, die auf einem Raspberry Pi 3B im Heimnetz läuft. Rezepte werden im Cooklang-Format als `.cook`-Dateien gespeichert und sind die einzige Datenquelle (keine Datenbank). Die App bietet eine komfortable Rezeptansicht, einen Kochmodus fuer die Nutzung am Tablet in der Kueche, einen TipTap-basierten Editor mit Cooklang-Unterstuetzung und eine Einkaufslistengenerierung.

## Architektur

### Stack

- **Frontend:** React + TypeScript, Vite, TipTap-Editor mit Custom Cooklang Extensions
- **Backend:** Node.js + Express + TypeScript, tsup
- **Validierung:** Zod (Schemas werden zwischen Frontend und Backend geteilt)
- **Testing:** Vitest
- **Linting:** Biome
- **Pre-Commit Hooks:** Husky
- **CI/CD:** GitHub Actions
- **Paketmanager:** pnpm mit Workspaces und Catalog
- **Deployment:** Distroless Docker-Container (`gcr.io/distroless/nodejs`, arm64)
- **Host:** Raspberry Pi 3B, Raspberry Pi OS Lite 64-bit
- **UI-Komponenten:** Plain CSS, Radix UI nur wo noetig (Tabs, Dialog, Popover)

### Entscheidungen

- **Keine Datenbank** – `.cook`-Dateien im Dateisystem sind Single Source of Truth
- **Kein Auth** – laeuft nur im Heimnetz
- **Kein Offline-Modus** – WLAN ist stabil
- **Kein Reverse Proxy** – Docker mappt direkt auf Port 80, Fritz!Box loest `rezepte.fritz.box` auf
- **Images werden auf dem Mac gebaut** – `docker buildx` fuer arm64 Cross-Compilation

### Projektstruktur

```
wwe/
├── rezepte/                  # Cooklang-Dateien (Volume Mount im Container)
├── packages/
│   ├── frontend/             # React + TipTap
│   │   ├── src/
│   │   │   ├── components/   # UI-Komponenten
│   │   │   ├── views/        # Uebersicht, Detail, Editor, Kochmodus
│   │   │   ├── tiptap/       # Custom Extensions (Ingredient, Timer, Equipment)
│   │   │   └── styles/       # Plain CSS
│   │   └── package.json
│   └── backend/              # Express API
│       ├── src/
│       │   ├── routes/       # API-Endpunkte
│       │   ├── parser/       # Cooklang Parser + Serializer
│       │   └── schemas/      # Zod Schemas
│       └── package.json
├── Dockerfile
├── docker-compose.yml
└── package.json              # pnpm Workspace Root
```

## Views & Features

### 1. Rezeptuebersicht (Startseite)

- Kachelansicht aller Rezepte mit Name, Zubereitungszeit und Gang
- Textsuche zum Filtern
- Checkboxen an jeder Kachel fuer Einkaufslistenauswahl
- Button "Einkaufsliste generieren" erscheint bei mindestens einer Auswahl

### 2. Rezeptdetail

- Kopfbereich: Rezeptname, Metadaten (Zubereitungszeit, Portionen, Gang)
- **Portionsrechner** – +/- Buttons, rechnet alle Mengen proportional um
- Zwei Tabs:
  - **Tab "Zutaten"** – Zutatenliste mit Portionsrechner
  - **Tab "Zubereitung"** – Schritte als formatierter Text, Zutaten und Equipment farblich hervorgehoben
- Buttons: "Kochmodus starten" (immer sichtbar), "Bearbeiten"

### 3. Kochmodus

- Vollbild-artige Ansicht, ein Schritt pro Bildschirm
- Grosse Schrift, hoher Kontrast
- Vor/Zurueck-Navigation mit grossen Touch-Bereichen (links/rechts tippen oder wischen)
- Zutaten und Mengen inline hervorgehoben
- Fortschrittsanzeige (z.B. "Schritt 3 von 8")
- "Beenden"-Button zurueck zur Detailansicht

### 4. Rezept-Editor

- TipTap-Editor mit drei Custom Node Extensions:
  - **Ingredient** – Trigger via Slash-Command `/zutat` oder Toolbar-Button, Popover fragt Name/Menge/Einheit ab, zeigt farbigen Chip im Editor
  - **Timer** – Trigger via `/timer`, Popover fuer Dauer/Einheit
  - **Equipment** – Trigger via `/equipment`, Popover fuer Geraetename
- Metadaten (Portionen, Zubereitungszeit, Gang) als Formularfelder ueber dem Editor
- Absaetze im Editor = Zubereitungsschritte
- Speichern serialisiert zurueck ins Cooklang-Format und schreibt die `.cook`-Datei
- Funktioniert fuer neue Rezepte und zum Bearbeiten bestehender

### 5. Einkaufsliste

- Rezepte per Checkbox auf der Startseite auswaehlen
- "Einkaufsliste generieren" zeigt zusammengefasste Liste:
  - Gleiche Zutaten werden addiert (z.B. 2 Knoblauch + 2 Knoblauch = 4 Knoblauch)
  - Herkunft je Zutat sichtbar (aus welchem Rezept)
- "Kopieren"-Button kopiert als Plain Text in die Zwischenablage
- Manuelles Uebertragen in Google Keep durch den Nutzer

## Backend API

```
GET    /api/rezepte              # Liste aller Rezepte (Metadaten)
GET    /api/rezepte/:slug        # Einzelnes Rezept, vollstaendig geparst
POST   /api/rezepte              # Neues Rezept anlegen
PUT    /api/rezepte/:slug        # Rezept aktualisieren
DELETE /api/rezepte/:slug        # Rezept loeschen
POST   /api/einkaufsliste        # Rezept-Slugs rein, zusammengefasste Zutatenliste raus
```

Zod-Schemas validieren alle Requests und definieren gleichzeitig die TypeScript-Typen.

### Cooklang Parser

Eigenes Modul das:
- `.cook`-Dateien parst in strukturiertes JSON (Metadaten, Schritte, Zutaten, Timer, Equipment)
- Strukturiertes JSON zurueck ins Cooklang-Format serialisiert
- Zutaten-Aggregation fuer die Einkaufsliste bereitstellt (gleiche Zutaten addieren)

## Deployment

### Raspberry Pi 3B Setup

1. SD-Karte flashen mit Raspberry Pi OS Lite 64-bit
2. Hostname auf `rezepte` setzen
3. Docker installieren
4. Feste IP in Fritz!Box zuweisen

### Docker

- Distroless Base-Image: `gcr.io/distroless/nodejs` (arm64)
- Multi-Stage Build: Build-Stage mit `node:alpine`, Runtime mit Distroless
- `docker-compose.yml` mit Volume Mount fuer `rezepte/`-Verzeichnis
- Port-Mapping: `80:3000`
- Images werden auf dem Mac via `docker buildx` fuer arm64 gebaut

### Zugriff

- Im Heimnetz erreichbar unter `http://rezepte.fritz.box`
- Fritz!Box loest den Hostnamen automatisch auf
