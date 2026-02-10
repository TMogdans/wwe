# WWE – Was wollen wir essen?

Lokale Rezeptdatenbank mit [Cooklang](https://cooklang.org/)-Support. Rezepte werden als `.cook`-Dateien gespeichert und ueber eine Web-Oberflaeche verwaltet.

## Features

- Rezepte erstellen, bearbeiten und loeschen
- Rich-Text-Editor mit Cooklang-Syntax (Zutaten, Equipment, Timer)
- Kochmodus mit Swipe-Navigation und dynamischer Textgroesse
- Einkaufsliste aus mehreren Rezepten generieren
- Portionenrechner mit automatischer Skalierung
- Suche und Filterung nach Kategorie/Gang
- Konfigurierbare Kategorien ueber `kategorien.json`
- Naehrwertdaten via BLS 4.0 (Bundeslebensmittelschluessel)

## Tech Stack

- **Frontend:** React, TipTap, Radix UI, Vite
- **Backend:** Express 5, Zod
- **Runtime:** Node.js 22 (Distroless Container)
- **Build:** pnpm Workspaces, tsup, TypeScript
- **CI/CD:** GitHub Actions → ghcr.io (arm64)

## Voraussetzungen

- Node.js >= 22
- pnpm >= 10

## Entwicklung

```bash
pnpm install
pnpm dev
```

Frontend: http://localhost:5173 (Vite Dev Server mit Proxy)
Backend: http://localhost:3000

## Befehle

| Befehl | Beschreibung |
|---|---|
| `pnpm dev` | Frontend + Backend parallel starten |
| `pnpm build` | Alles bauen |
| `pnpm test` | Tests ausfuehren |
| `pnpm lint` | Biome Linter |
| `pnpm lint:fix` | Biome mit Auto-Fix |

## Projektstruktur

```
packages/
  backend/       Express API + Cooklang Parser
  frontend/      React SPA
rezepte/         .cook Dateien + kategorien.json
```

## Deployment (Docker)

```yaml
# docker-compose.prod.yml
services:
  wwe:
    image: ghcr.io/tmogdans/wwe:latest
    user: "1000:1000"
    ports:
      - "80:3000"
    volumes:
      - ./rezepte:/data/rezepte
    restart: unless-stopped
```

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Rezepte

Rezepte liegen als `.cook`-Dateien im `rezepte/`-Verzeichnis:

```
>> time required: 30 Minuten
>> course: dinner
>> servings: 2

@Zwiebeln{2} in #Pfanne{} anbraten.
@Hackfleisch{500%g} dazu geben und ~{10%Minuten} braten.
```

## Kategorien

Die Datei `rezepte/kategorien.json` definiert die verfuegbaren Gaenge:

```json
["dinner", "dessert", "dip"]
```

Neue Kategorien einfach ans Array anfuegen — kein Rebuild noetig.

## Naehrwertdaten (BLS 4.0)

Die App kann Naehrwerte pro Rezept berechnen. Datenquelle ist der [Bundeslebensmittelschluessel (BLS) 4.0](https://www.openagrar.de/receive/openagrar_mods_00112643) (CC BY 4.0, 7.140 Lebensmittel, 138 Naehrstoffe).

### 1. BLS-Datenbank importieren

CSV herunterladen von OpenAgrar und importieren:

```bash
npx tsx packages/backend/src/scripts/import-bls.ts data/BLS_4_0_Daten_2025_DE.csv
```

Das erzeugt `rezepte/bls.sqlite` (~45 MB). Die Datei muss im `rezepte/`-Verzeichnis liegen (bzw. im gemounteten Volume auf dem Raspi).

### 2. Naehrstoffe konfigurieren

`rezepte/naehrwerte.json` legt fest, welche Naehrstoffe angezeigt werden:

```json
{
  "nutrients": ["ENERCC", "PROT625", "FAT", "CHO", "FIBT", "SUGAR", "FASAT", "FAMS", "FAPU", "CHORL", "NA", "NACL"]
}
```

Die Codes sind BLS-Naehrstoffcodes. Namen und Einheiten kommen automatisch aus der Datenbank. Codes hinzufuegen oder entfernen — kein Rebuild noetig.

### 3. Zutaten mappen

`rezepte/naehrwerte-mapping.json` ordnet Rezept-Zutaten den BLS-Eintraegen zu:

```json
{
  "Hackfleisch": {
    "code": "U010100"
  },
  "Zwiebeln": {
    "code": "G480100",
    "gramsPer": { "Stueck": 150 }
  }
}
```

- `code` — BLS-Code des Lebensmittels
- `gramsPer` — optional: Gewicht pro Einheit fuer nicht-metrische Units (z.B. Stueck, Zehen, Dose)

Standard-Einheiten (g, kg, ml, l, EL, TL, Prise, Tasse, Dose) werden automatisch umgerechnet. `gramsPer` ueberschreibt die Defaults pro Zutat.

Nicht gemappte Zutaten werden im Frontend als "Nicht erfasst" angezeigt. Die Coverage zeigt an, wie viel Prozent der Zutaten erfasst sind.
