# Design: Auto-Discovery für Nährwerte-Mappings

**Issue:** [017-naehrwerte-auto-discovery.md](../../_issues/017-naehrwerte-auto-discovery.md)
**Datum:** 2026-02-09

## Überblick

Automatische Erkennung und Mapping-Vorschläge für ungemappte Zutaten in Rezepten. Wenn ein Rezept geöffnet wird und Zutaten ohne BLS-Mapping enthält, werden automatisch passende BLS-Einträge vorgeschlagen. Mappings können direkt im Nährwerte-Tab editiert werden.

## Design-Entscheidungen

1. **Mapping-Interface:** Im bestehenden Nährwerte-Tab (nicht separates Modal/Route)
2. **Workflow:** Auto-Vorschläge mit Auswahl (3-5 BLS-Kandidaten sofort sichtbar)
3. **Fuzzy-Matching:** JavaScript Levenshtein (npm: `fastest-levenshtein`)
4. **Synonym-Integration:** Synonym-Lookup zuerst, dann Fuzzy-Match
5. **gramsPer:** Optional beim Mapping (nur wenn nicht-metrische Einheiten erkannt)
6. **Speichern:** Append + alphabetische Sortierung
7. **UI:** Kompakte Liste mit Radio-Buttons
8. **Nach Speichern:** Auto-Refresh der Nährwerte, Mapping-UI bleibt offen

## Architektur

### Backend

**Synonym-Integration (`calculator.ts`)**
- Erweitere `findMapping()` um `synonymMap?: SynonymMap` Parameter
- Lookup-Reihenfolge:
  1. Exakter Match auf Original-Name
  2. Case-insensitive Match auf Original-Name
  3. Synonym-Auflösung → kanonischer Name → exakter Match
  4. Synonym-Auflösung → kanonischer Name → case-insensitive Match
- Synonym-Map wird beim Server-Start aus `synonyme.json` geladen

**Fuzzy-Matching (`bls.ts`)**
- Neue Funktion `suggestBlsFoods(db, ingredientName, synonymMap?, limit=5)`
- Algorithmus:
  1. Lade alle Foods: `SELECT code, name_de FROM foods`
  2. Für jeden BLS-Eintrag: Berechne Levenshtein-Distanz zu `ingredientName`
  3. Falls Synonym existiert: Berechne auch Distanz zum kanonischen Namen, nimm bessere
  4. Sortiere nach Distanz (aufsteigend), nimm Top N
- Optimierung: Vorfilter auf BLS-Namen die mindestens 50% gemeinsame Zeichen haben

**API-Endpoint `GET /api/naehrwerte/:slug/suggestions`**
- Lädt Rezept, parsed Zutaten
- Lädt Mapping + Synonyme
- Filtert ungemappte Zutaten (kein `findMapping()`-Treffer)
- Für jede ungemappte Zutat: `suggestBlsFoods()` aufrufen
- Response-Schema:
  ```typescript
  {
    ingredient: string;
    suggestions: BlsFood[];  // { code, name_de, name_en }
    units: string[];         // Im Rezept verwendete Einheiten
  }[]
  ```

**API-Endpoint `POST /api/naehrwerte/mapping`**
- Request Body:
  ```typescript
  {
    ingredientName: string;
    blsCode: string;
    gramsPer?: Record<string, number>;
  }
  ```
- Lädt `naehrwerte-mapping.json`
- Fügt Mapping hinzu
- Sortiert Objekt-Keys alphabetisch
- Schreibt Datei (formatiert, 2 Spaces)
- Atomic write (temp file + rename)

### Frontend

**Erweiterung `NutritionTable.tsx`**
- Neue Komponente `UnmappedIngredients`
- Rendering-Bedingung: `data.ingredients.some(ing => !ing.matched)`
- Lädt Suggestions: `GET /api/naehrwerte/:slug/suggestions`

**Pro ungemappte Zutat:**
- Heading: Zutat-Name
- Radio-Button-Liste (3-5 BLS-Vorschläge)
- Format: `○ Paprikaschote, rot, roh (G480200)`
- Optional: `gramsPer`-Input wenn nicht-metrische Einheiten
  - Detection: Unit nicht in `['g','kg','ml','l','el','tl','prise','tasse','dose']`
  - Input: "Gramm pro {unit}: [___]"
- "Speichern"-Button

**State-Management:**
```typescript
const [suggestions, setSuggestions] = useState<SuggestionMap>({});
const [selectedMappings, setSelectedMappings] = useState<Map<string, SelectedMapping>>();
// SelectedMapping = { blsCode: string, gramsPer?: Record<string, number> }
```

**Save-Flow:**
1. `handleSave(ingredientName)` → POST `/api/naehrwerte/mapping`
2. Bei Erfolg:
   - Entferne Zutat aus `selectedMappings`
   - Triggere Nährwerte-Refresh (SWR revalidate)
   - Entferne Zutat aus Suggestions
3. Bei Fehler: Toast mit Error-Message

**UI-States:**
- Loading: Spinner während Suggestions laden
- Empty: "Alle Zutaten sind bereits gemappt"
- Error: Fehlermeldung bei Request-Fehler

## Error Handling & Edge Cases

**BLS-Datenbank fehlt:**
- `/suggestions` prüft `bls.sqlite` Existenz
- Falls nicht: `503 Service Unavailable` + Message
- Frontend: "Nährwert-Datenbank nicht konfiguriert"

**Keine Suggestions:**
- Fuzzy-Match liefert keine Ergebnisse
- Zeige: "Keine passenden BLS-Einträge gefunden für '{zutat}'"

**Datei-Schreibfehler:**
- POST `/mapping` kann fehlschlagen (Permissions, Disk Full)
- Return `500` mit Error-Message
- Frontend Toast: "Mapping konnte nicht gespeichert werden: {error}"

**Race Conditions:**
- Mehrere Mappings nacheinander: Sequenziell verarbeiten (await)
- Backend: Atomic file write

**Synonym-Konflikte:**
- Mehrere Treffer in Synonym-Gruppe: Nimm ersten kanonischen Namen

**Nicht-metrische Einheiten:**
- Wenn Unit nicht in `DEFAULT_UNIT_GRAMS`: Zeige `gramsPer`-Feld

## Testing

**Backend-Tests:**
1. `bls.test.ts` - Fuzzy-Matching
   - Relevante Ergebnisse ("Paprika" → "Paprikaschote")
   - Synonym-Integration ("Schlagsahne" → "Sahne"-Vorschläge)
   - Levenshtein-Ranking korrekt
   - Limit funktioniert (max 5)

2. `calculator.test.ts` - Synonym-Lookup
   - `findMapping()` mit Synonym-Map
   - Korrekte Reihenfolge
   - Kein Match bei unbekannter Zutat

3. `nutrition.test.ts` - API-Endpoints
   - GET `/suggestions` korrekte Struktur
   - POST `/mapping` schreibt und sortiert JSON
   - Error-Handling

**Frontend-Tests (optional):**
4. `NutritionTable.test.tsx`
   - Unmapped-Bereich bei `coverage < 100%`
   - Radio-Buttons funktionieren
   - `gramsPer`-Feld bei nicht-metrischen Einheiten
   - Save triggert API-Call und Refresh

**Manuelle Tests:**
- End-to-End: Ungemappte Zutat → Mapping → Nährwerte prüfen
- Raspi-Deployment: JSON-Schreiben im Volume
- Performance: Fuzzy-Match <500ms auf 7.140 Lebensmitteln

## Dependencies

**Neu:**
- `fastest-levenshtein` (npm) - Levenshtein-Distanz Berechnung

**Wiederverwendet:**
- `buildSynonymMap()` aus `schemas/shopping-list.ts`
- `searchFoods()` aus `nutrition/bls.ts` (als Fallback/Referenz)
- `synonyme.json` - bestehende Synonym-Gruppen

## Betroffene Dateien

**Backend:**
- `packages/backend/src/nutrition/calculator.ts` - `findMapping()` erweitern
- `packages/backend/src/nutrition/bls.ts` - `suggestBlsFoods()` hinzufügen
- `packages/backend/src/routes/nutrition.ts` - neue Endpoints
- `packages/backend/src/routes/__tests__/nutrition.test.ts` - Tests

**Frontend:**
- `packages/frontend/src/components/NutritionTable.tsx` - UI erweitern
- `packages/frontend/src/api.ts` - neue API-Typen

**Data:**
- `rezepte/naehrwerte-mapping.json` - wird von POST-Endpoint geschrieben

## Offene Fragen

Keine - alle Design-Entscheidungen getroffen.
