# done

Nährwertdaten für Zutaten über den Bundeslebensmittelschlüssel (BLS) 4.0 bereitstellen.

Datenquelle: CSV-Download von OpenAgrar (CC BY 4.0, kostenlos).
- https://www.openagrar.de/receive/openagrar_mods_00112643
- 7.140 Lebensmittel, 138 Nährstoffe, deutsche Bezeichnungen

Speicherung: SQLite via `node:sqlite` (Node.js built-in).

## Umsetzung

- BLS-Import-Script: `packages/backend/src/scripts/import-bls.ts`
- SQLite-Zugriff: `packages/backend/src/nutrition/bls.ts`
- Nährwertberechnung: `packages/backend/src/nutrition/calculator.ts`
- API-Route: `GET /api/naehrwerte/:slug?servings=N`
- Frontend: Nährwerte-Tab in Rezeptansicht
- Konfigurierbare Nährstoffe via `rezepte/naehrwerte.json`
- Manuelles Zutat→BLS-Mapping via `rezepte/naehrwerte-mapping.json`

## Betroffene Services

- backend (Datenimport, Mapping, API)
- frontend (Anzeige der Nährwerte)
