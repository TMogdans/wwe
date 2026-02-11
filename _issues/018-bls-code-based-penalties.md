# BLS-Code-basierte Penalties für Fuzzy Matching

**Follow-up zu Issue 017** - Die aktuelle Keyword-basierte Penalty-Lösung hat Skalierungsprobleme.

## Problem

Die Keyword-Liste (Issue 017) funktioniert für häufige Fälle (z.B. "Milchpulver" wird erfolgreich deprioritisiert), aber:

- **Nicht skalierbar**: Jedes Lebensmittel braucht eigene Keywords
  - Milch: "schokolade", "zucker", "kokos"
  - Butter: "keks", "gebäck", "kuchen"
  - Mehl: "kuchen", "speise"
- **Unvollständig**: Aktuell schlägt "Milch" vor:
  - Milchschokolade (S530000) - Süßware, kein Milchprodukt
  - Milchzucker (S116000) - Zucker, kein Milchprodukt
  - Statt: Vollmilch frisch (M111300) - echte Basis-Milch

## Lösung: BLS-Code-basierte Penalties

BLS-Codes sind systematisch organisiert:

```
M111xxx = Konsummilch (Basis-Milch) → kein Penalty oder Bonus
M15xxxx = Buttermilch → leichtes Penalty
M88xxxx = Milchpulver (verarbeitet) → starkes Penalty
S5xxxxx = Süßwaren/Schokolade → starkes Penalty für Nicht-Süßwaren-Suchen
S116xxx = Zucker → starkes Penalty für Nicht-Zucker-Suchen
H154xxx = Kokosmilch (pflanzlich) → Penalty für tierische Milch-Suchen
```

## Vorgeschlagene Implementierung

**Hybrid-System**: Keywords (bestehend) + Code-basierte Kategorien (neu)

```typescript
const CODE_PENALTIES: { pattern: RegExp; penalty: number; applies: (query: string) => boolean }[] = [
  { pattern: /^S5/, penalty: 2.5, applies: () => true }, // Süßwaren (außer Zucker-Suche)
  { pattern: /^S116/, penalty: 2.5, applies: () => true }, // Zucker (außer Zucker-Suche)
  { pattern: /^M88/, penalty: 2.0, applies: () => true }, // Milchpulver
  { pattern: /^H154/, penalty: 1.5, applies: (q) => !q.includes('kokos') }, // Kokosmilch
  // ... weitere Kategorien
];

function calculatePenalties(foodName: string, blsCode: string, query: string) {
  // Bestehende Keyword-Penalties
  let keywordPenalty = PENALTY_KEYWORDS.some(kw => foodName.toLowerCase().includes(kw)) ? 2.0 : 1.0;

  // Neue Code-basierte Penalties
  let codePenalty = 1.0;
  for (const rule of CODE_PENALTIES) {
    if (rule.pattern.test(blsCode) && rule.applies(query)) {
      codePenalty = Math.max(codePenalty, rule.penalty);
    }
  }

  // Bestehende Complexity-Penalty
  const wordCount = foodName.split(/[\s,/]+/).filter(w => w.length > 0).length;
  const complexityPenalty = wordCount > 2 ? 1.0 + (wordCount - 2) * 0.15 : 1.0;

  return { keyword: keywordPenalty, code: codePenalty, complexity: complexityPenalty };
}
```

## Vorteile

- ✅ Skalierbar: Ein Code-Pattern deckt tausende Produkte ab
- ✅ Wartbar: BLS-Code-Struktur ist stabil
- ✅ Präzise: Nutzt existierende BLS-Kategorisierung
- ✅ Hybrid: Kombiniert Keywords (schnelle Edge-Cases) + Codes (systematisch)

## Betroffene Dateien

- `packages/backend/src/nutrition/bls.ts` (calculatePenalties, suggestBlsFoods)
- `packages/backend/src/nutrition/__tests__/bls.test.ts` (neue Tests)

## Testing

- Unit Tests: Code-Penalties für verschiedene Kategorien
- Integration: "Milch" sollte M111300 (Vollmilch) vor S530000 (Schokolade) vorschlagen
- Edge Cases: Kokosmilch-Suche sollte H154000 erlauben
