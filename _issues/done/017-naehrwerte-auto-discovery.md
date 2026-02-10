Auto-Discovery fuer noch nicht gemappte Zutaten in Rezepten. Beim Oeffnen eines Rezepts soll erkannt werden, welche Zutaten noch kein BLS-Mapping haben, und es sollen automatisch passende BLS-Eintraege vorgeschlagen werden. Mapping soll auch auf dem Raspi editierbar sein.

## Idee

1. **Synonym-Integration** — `synonyme.json` (aus Issue 011) bei der Mapping-Suche beruecksichtigen. Wenn "Schlagsahne" im Rezept steht und "Sahne" im Mapping existiert, soll der kanonische Name matchen. `buildSynonymMap()` aus `schemas/shopping-list.ts` kann direkt wiederverwendet werden.
2. **Fuzzy-Matching** — Wenn weder exakter Name noch Synonym-Match greift, BLS-Datenbank nach aehnlichen Eintraegen durchsuchen (Levenshtein-Distanz oder Trigram-Aehnlichkeit auf `foods.name_de`). Die bestehende `searchFoods()` LIKE-Suche ist ein Anfang, reicht aber fuer "Paprika" → "Paprikaschote" nicht.
3. **Vorschlags-Endpoint** `GET /api/naehrwerte/:slug/unmapped` — liefert fuer jede ungemappte Zutat die Top-5 BLS-Kandidaten
4. **Mapping-Endpoint** `POST /api/naehrwerte/mapping` — nimmt neue Mappings entgegen und schreibt sie in `naehrwerte-mapping.json` (muss auch auf dem Raspi funktionieren, da das File im gemounteten Volume liegt)
5. **Frontend** — Hinweis im Naehrwerte-Tab wenn Zutaten ungemappt sind, mit Klick-Workflow zum Zuordnen (BLS-Vorschlaege auswaehlen, ggf. `gramsPer` angeben)

## Vorhandene Grundlagen

- `searchFoods()` in `nutrition/bls.ts` — LIKE-Suche auf `foods.name_de`
- `buildSynonymMap()` + `SynonymMap` in `schemas/shopping-list.ts` — Synonym-Aufloesung
- `synonyme.json` — bereits vorhandene Synonym-Gruppen
- `findMapping()` in `nutrition/calculator.ts` — Case-insensitive Mapping-Suche (muss um Synonym-Lookup erweitert werden)
- Coverage-Indikator im Frontend zeigt schon an, dass Zutaten fehlen

## Umsetzung (grob)

### Backend

- `findMapping()` in `calculator.ts` um Synonym-Lookup erweitern: Name → Synonym-Map → kanonischer Name → Mapping nachschlagen
- Fuzzy-Suche: Levenshtein oder Trigram auf `foods.name_de` (evtl. als SQLite-Extension oder in JS)
- Neuer Endpoint fuer BLS-Vorschlaege pro ungemappter Zutat
- Neuer Endpoint zum Schreiben von Mappings (JSON-Datei aktualisieren)

### Frontend

- Im Naehrwerte-Tab: Button/Bereich fuer ungemappte Zutaten
- Pro Zutat: Suchfeld mit BLS-Vorschlaegen, Auswahl per Klick
- Optional: `gramsPer`-Eingabe fuer nicht-metrische Einheiten
- Mapping wird direkt per POST gespeichert

## Betroffene Services

- backend (Synonym-Integration, Fuzzy-Suche, neue Endpoints, Mapping-Schreibzugriff)
- frontend (Discovery-UI im Naehrwerte-Tab)
