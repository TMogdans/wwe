# Erweiterte Metadata-Felder laut Spec unterstützen

**Priorität:** Mittel
**Bereich:** Backend-Schema, Editor, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert zahlreiche standardisierte Metadata-Felder. Aktuell werden nur 3 davon unterstützt (`time required`, `course`, `servings`).

### Fehlende Felder laut Spec

| Feld | Beschreibung |
|------|-------------|
| `title` | Rezeptname (alternativ zum Dateinamen) |
| `tags` | Beschreibende Labels |
| `source` | Herkunft/Quelle |
| `author` | Autor |
| `prep time` | Nur Vorbereitungszeit |
| `cook time` | Nur Kochzeit |
| `difficulty` | Schwierigkeitsgrad |
| `cuisine` | Küche/kulinarische Tradition |
| `diet` | Ernährungsform (z.B. glutenfrei, vegan) |
| `locale` | ISO Sprach-/Ländercode |
| `image` / `picture` | Bild-URL(s) |
| `introduction` / `description` | Einleitungstext |

## Aktuelles Verhalten

- Der Parser speichert beliebige Metadata-Keys als `Record<string, string>` - das funktioniert bereits
- Das Schema in `packages/backend/src/schemas/recipe.ts` validiert nur `time required`, `course`, `servings`
- Der Editor zeigt nur Felder für diese 3 Metadaten
- Die Rezeptübersicht und Detailansicht nutzen nur diese 3 Felder

## Erwartetes Verhalten

- Das Schema akzeptiert alle standardisierten Felder
- Der Editor bietet Eingabefelder für die wichtigsten Metadaten
- Die Rezeptansicht zeigt verfügbare Metadaten an (Tags, Schwierigkeit, Küche etc.)
- Filter/Suche kann auf die erweiterten Felder zugreifen

## Betroffene Dateien

- `packages/backend/src/schemas/recipe.ts` - Schema erweitern
- `packages/frontend/src/views/RecipeEditor.tsx` - Metadata-Formular erweitern
- `packages/frontend/src/views/RecipeDetail.tsx` - Metadaten-Anzeige
- `packages/frontend/src/views/RecipeOverview.tsx` - Filter erweitern
- `packages/frontend/src/api.ts` - Typen anpassen
