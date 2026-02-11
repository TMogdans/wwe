# Design: Verbessertes Fuzzy Matching mit Boosting-Regeln

**Datum:** 2026-02-11
**Problem:** Bei der Auto-Discovery für Nährwertmappings werden verarbeitete Produkte wie "Milchpulver" höher gerankt als Grundzutaten wie "Vollmilch frisch"
**Ziel:** Grundzutaten sollen vor verarbeiteten Produkten in den Vorschlägen erscheinen

## Problem-Analyse

Der aktuelle Algorithmus in `suggestBlsFoods()` verwendet:
- Levenshtein-Distance für Ähnlichkeit
- Substring-Bonus (0.1) wenn Zutat im BLS-Namen enthalten ist
- SQL LIKE Pre-Filtering für Performance

**Beispiel-Problem:**
```
Suche: "Milch"
Aktuelles Ranking:
1. Milchpulver (substring match + kurz)
2. Milchmischgetränk (substring match)
3. Milchreis (substring match)
4. Vollmilch frisch, 3,5 % Fett (weiter hinten)
```

**Ursache:** Der Substring-Bonus bevorzugt "Milchpulver" (5 Zeichen Unterschied) gegenüber "Vollmilch frisch, 3,5 % Fett" (20 Zeichen Unterschied), obwohl letzteres semantisch korrekter ist.

## Lösungsansatz

**Strategie:** Penalty-basiertes Boosting
- Verarbeitete Produkte erhalten Penalties auf ihre Distance
- Zwei Penalty-Typen: Keyword-basiert + Komplexitäts-basiert
- Keine positiven Boosts (YAGNI)

## Design

### 1. Keyword-basierte Penalties

**Konzept:** Bestimmte Wörter im BLS-Namen signalisieren verarbeitete/komplexe Produkte.

**Keyword-Liste:**
```typescript
const PENALTY_KEYWORDS = [
  'pulver',      // Milchpulver, Kakaopulver
  'getränk',     // Milchmischgetränk
  'drink',       // alternativ zu getränk
  'backteig',    // Milchbackteig
  'teig',        // allgemein Teigprodukte
  'dessert',     // Desserts
  'eis',         // Eiscreme
  'reis',        // Milchreis, Apfelreis
  'küchlein',    // Apfelküchlein
  'gesüßt',      // gesüßte Produkte
  'süß',         // süße Varianten
  'aromatisiert',
  'zubereitung', // Fruchtzubereitung
  'fermentiert',
  'gebraten',
  'frittiert',
  'angereichert',
];
```

**Matching-Logik:**
- Case-insensitive substring match in `name_de`
- Wenn mindestens ein Keyword matched: Penalty-Faktor 2.0

**Beispiele:**
- "Vollmilch 3,5%" → kein Keyword → Faktor 1.0
- "Milchpulver" → hat "pulver" → Faktor 2.0
- "Milchmischgetränk gesüßt" → hat "getränk" + "gesüßt" → Faktor 2.0 (nicht kumulativ)

### 2. Komplexitäts-basierte Penalties

**Konzept:** Je mehr Wörter ein BLS-Eintrag hat, desto spezifischer/verarbeiteter ist er.

**Wort-Zählung:**
```typescript
const words = food.name_de.split(/[\s,/]+/).filter(w => w.length > 0);
const wordCount = words.length;
```

**Trennzeichen:** Leerzeichen, Komma, Slash

**Komplexitäts-Formel:**
```typescript
const complexityPenalty = wordCount > 2
  ? 1.0 + (wordCount - 2) * 0.15
  : 1.0;
```

**Beispiele:**
- "Vollmilch 3,5%" → 2 Wörter → Penalty 1.0
- "H-Milch fettarm, 1,5 % Fett" → 5 Wörter → Penalty 1.45
- "Milchmischgetränk 1,5 % Fett, aromatisiert, gesüßt" → 6 Wörter → Penalty 1.60

**Rationale:**
- Keine Penalty für 1-2 Wörter (Grundzutaten)
- Moderate Steigerung (+15% pro Wort) um nicht zu aggressiv zu sein
- Schwächer als Keyword-Penalty (2.0), da Wortanzahl weniger verlässlich ist

### 3. Kombination der Penalties

**Finale Distance-Berechnung:**
```typescript
finalDistance = baseDistance * keywordPenalty * complexityPenalty;
```

**Beispiel-Rechnung für "Milch":**

| BLS-Eintrag | Base Distance | Keyword | Complexity | Final Distance |
|-------------|--------------|---------|------------|----------------|
| Vollmilch 3,5% | 8.0 | 1.0 | 1.0 | 8.0 |
| H-Milch fettarm, 1,5 % | 12.0 | 1.0 | 1.45 | 17.4 |
| Milchpulver | 6.0 | 2.0 | 1.15 | 13.8 |
| Milchreis gesüßt | 9.0 | 2.0 | 1.15 | 20.7 |

**Resultat:** "Vollmilch 3,5%" rankt jetzt am besten!

## Implementierung

### Code-Änderungen in bls.ts

**Neue Konstante:**
```typescript
const PENALTY_KEYWORDS = [
  'pulver', 'getränk', 'drink', 'backteig', 'teig', 'dessert',
  'eis', 'reis', 'küchlein', 'gesüßt', 'süß', 'aromatisiert',
  'zubereitung', 'fermentiert', 'gebraten', 'frittiert', 'angereichert',
];
```

**Neue Helper Function:**
```typescript
function calculatePenalties(foodName: string): { keyword: number; complexity: number } {
  const lower = foodName.toLowerCase();

  // Keyword penalty
  const hasKeyword = PENALTY_KEYWORDS.some(kw => lower.includes(kw));
  const keywordPenalty = hasKeyword ? 2.0 : 1.0;

  // Complexity penalty
  const wordCount = foodName.split(/[\s,/]+/).filter(w => w.length > 0).length;
  const complexityPenalty = wordCount > 2 ? 1.0 + (wordCount - 2) * 0.15 : 1.0;

  return { keyword: keywordPenalty, complexity: complexityPenalty };
}
```

**Änderung in suggestBlsFoods() (Zeile ~126-160):**

*Vorher:*
```typescript
const scored = candidates.map((food) => {
  // ... distance calculation ...
  const bestDist = Math.min(distOriginal, distCanonical);
  return { food, distance: bestDist };
});
```

*Nachher:*
```typescript
const scored = candidates.map((food) => {
  // ... distance calculation ...
  let bestDist = Math.min(distOriginal, distCanonical);

  // Apply boosting penalties
  const penalties = calculatePenalties(food.name_de);
  bestDist = bestDist * penalties.keyword * penalties.complexity;

  return { food, distance: bestDist };
});
```

**Reihenfolge wichtig:** Penalties werden NACH Substring-Bonus angewendet, so dass beide Mechanismen zusammenwirken.

## Edge Cases

### 1. Keyword-Kollisionen

**Problem:** "eis" matched auch "Milchreis", "Reis"
**Lösung:** Zusätzlich "reis" als separates Keyword → beide Fälle abgedeckt

**Problem:** "süß" matched auch seltene Wörter wie "Preußisch"
**Risiko:** Niedrig bei BLS-Daten (hauptsächlich Lebensmittel-Namen)
**Monitoring:** Bei Bedarf zu "gesüßt", "süße" erweitern

### 2. Deutsche Komposita

**Problem:** "Milchpulver" ist ein Wort, nicht zwei
**Verhalten:** Korrekt - Keyword-Match funktioniert für Substrings
**Beispiel:** "pulver" matched in "Milchpulver" ✓

### 3. Wortgrenze bei kurzen Keywords

**Problem:** "eis" matched "Weiß", "Preis"
**Wahrscheinlichkeit:** Sehr niedrig bei BLS-Lebensmittelnamen
**Lösung bei Bedarf:** Wortgrenze-Check `\beis\b` (später, falls nötig)

### 4. Bestehende Tests

**Betroffene Tests:** `packages/backend/src/nutrition/__tests__/bls.test.ts`

**Aktueller Test-Fokus:**
- Struktur der Rückgabewerte (BlsFood[])
- Limit-Parameter funktioniert
- Synonym-Integration
- Minimum-Länge-Anforderung

**Erwartung:** Tests sollten weiterhin passen, da sie nicht das genaue Ranking prüfen, sondern nur die Struktur.

**Neue Tests (optional):**
```typescript
test('prefers basic ingredients over processed foods', () => {
  const suggestions = suggestBlsFoods(db, 'Milch', undefined, 5);

  // First result should be basic milk, not milk powder
  const firstResult = suggestions[0];
  expect(firstResult.name_de.toLowerCase()).not.toContain('pulver');
  expect(firstResult.name_de.toLowerCase()).not.toContain('getränk');
});
```

## Testing-Strategie

### Manuelle Verifikation

**Test-Zutaten:**
1. "Milch" → Erwarte Vollmilch/H-Milch vor Milchpulver
2. "Butter" → Erwarte Butter vor Butterkekse
3. "Mehl" → Erwarte Weizenmehl vor Mehlspeise
4. "Ei" → Erwarte Hühnerei vor Eiersalat

### Automatisierte Tests

**Bestehende Tests:** Alle 6 Tests in `bls.test.ts` sollten weiterhin passen

**Neue Tests (optional):**
- Test für Keyword-Penalty-Anwendung
- Test für Komplexitäts-Penalty-Anwendung
- Test für kombinierte Penalties

## Performance-Überlegungen

**Zusätzlicher Overhead:**
- String-Operationen: `toLowerCase()`, `split()`, `includes()`
- Auf bereits gefilterten Kandidaten (~50-200 statt 7.140)
- Pro Kandidat: ~17 Keyword-Checks + 1 Split-Operation

**Geschätzte Performance-Impact:** < 1ms zusätzlich pro Anfrage

**Benchmark bei Bedarf:**
```typescript
console.time('suggestBlsFoods');
suggestBlsFoods(db, 'Milch', synonymMap, 5);
console.timeEnd('suggestBlsFoods');
```

## Alternativen (nicht gewählt)

### Alternative 1: BLS-Code-basiertes Boosting
**Idee:** Nutze BLS-Kategorien (M11* = Milch, M88* = Milchpulver)
**Vorteil:** Präzise, nutzt vorhandene Struktur
**Nachteil:** Müssen alle Code-Muster kennen und pflegen
**Warum nicht:** Zu viel Maintenance-Aufwand

### Alternative 2: Machine Learning
**Idee:** Trainiere Model auf User-Feedback
**Vorteil:** Lernt optimale Gewichtung
**Nachteil:** Komplexität, Trainings-Daten benötigt
**Warum nicht:** YAGNI, Rule-basiert reicht

### Alternative 3: Whitelist für häufige Zutaten
**Idee:** Definiere bevorzugte Einträge (Milch → M111300)
**Vorteil:** Sehr zielgenau
**Nachteil:** Hoher Wartungsaufwand, nicht skalierbar
**Warum nicht:** Zu spezifisch, Keyword-Ansatz ist generischer

## Offene Fragen

1. **Faktor-Tuning:** Sind 2.0 (Keyword) und 0.15 (Komplexität) die richtigen Werte?
   - **Antwort:** Muss in der Praxis getestet werden, kann später angepasst werden

2. **Keyword-Liste vollständig?** Gibt es weitere wichtige Keywords?
   - **Antwort:** Liste kann iterativ erweitert werden basierend auf User-Feedback

3. **Soll "eis" als Keyword bleiben?** Risk von False Positives (Reis, Weiß)?
   - **Antwort:** Ja, zusätzlich "reis" separat hinzufügen für bessere Coverage

## Nächste Schritte

1. Implementierung in `packages/backend/src/nutrition/bls.ts`
2. Manuelle Tests mit typischen Zutaten (Milch, Butter, Mehl, Ei)
3. Überprüfung bestehender Tests (sollten weiterhin passen)
4. Optional: Neue Tests für Penalty-Logik
5. Deployment und User-Feedback sammeln
6. Bei Bedarf: Keyword-Liste erweitern, Faktoren anpassen

## Erfolgs-Kriterien

✅ "Milch" schlägt "Vollmilch frisch" vor "Milchpulver" vor
✅ "Butter" schlägt "Butter" vor "Butterkekse" vor
✅ Alle bestehenden Tests passen weiterhin
✅ Performance-Impact < 5ms pro Anfrage
✅ User-Feedback: Vorschläge sind "relevanter"

## Implementation Results

**Implemented:** 2026-02-11

**Changes:**
- Added `PENALTY_KEYWORDS` constant with 17 keywords (lines 92-112 in bls.ts)
- Added `calculatePenalties()` helper function (lines 114-139 in bls.ts)
- Applied penalties in `suggestBlsFoods()` distance calculation (lines 208-210 in bls.ts)
- Added 1 new test for penalty behavior (bls.test.ts)

**Commits:**
- `4ea2384`: feat(nutrition): add penalty keywords for fuzzy matching
- `6a45bb7`: feat(nutrition): add penalty calculation helper
- `d9fbc4a`: test(nutrition): add test for ingredient preference
- `8d93800`: test(nutrition): improve test robustness and consistency
- `7c7ad87`: feat(nutrition): apply penalties to prefer basic ingredients

**Test Results:**
- All existing 6 tests continue to pass ✓
- New preference test passes ✓
- Total: 7 bls tests passing, 161 backend tests passing

**Manual Testing Results:**
- "Milch" (milk) search tested:
  - ✅ "Milchpulver" successfully removed from top 5
  - ❌ Still showing processed products: Milchschokolade, Milchzucker, Kokosmilch
  - ⚠️ Basic milk (M111300 "Vollmilch frisch") exists but not ranking top

**Performance:**
- No measurable performance impact
- Penalty calculation adds negligible overhead (~0.5ms per request)

**Limitations Identified:**
- **Keyword approach not scalable**: Different foods need different keywords (milk needs "schokolade"/"zucker", butter would need "keks"/"gebäck", etc.)
- **BLS code structure more systematic**: Codes like M111xxx (consumer milk), S5xxxx (sweets), M88xxxx (milk powder) provide better categorization than keywords
- **Current keywords cover common cases**: "pulver", "getränk", "dessert" work for many scenarios, but not comprehensive

**Future Improvements:**
- **Priority**: Implement BLS-code-based penalty system (see Issue #XXX)
  - Use code prefixes for systematic categorization (e.g., S5xxxx = sweets → penalty 2.0)
  - Combine with keyword penalties for hybrid approach
  - More scalable than maintaining keyword lists per food type
- Monitor user feedback for additional keyword adjustments
- Consider tuning penalty factors (2.0, 0.15) based on usage data
- Potential to add category-specific bonuses for basic ingredients (M111xxx = consumer milk → boost)
