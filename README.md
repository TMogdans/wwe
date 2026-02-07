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
