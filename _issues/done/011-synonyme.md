# Zutaten-Synonyme für Einkaufsliste unterstützen

**Priorität:** Niedrig
**Bereich:** Backend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec erlaubt es, Synonyme für Zutaten zu definieren. So können verschiedene Bezeichnungen für dieselbe Zutat in der Einkaufsliste zusammengeführt werden.

```
Thunfisch|Tunfisch
Sahne|Schlagsahne|Obers
Hackfleisch|Gehacktes|Faschiertes
```

## Aktuelles Verhalten

Die Einkaufslisten-Aggregation in `packages/backend/src/routes/shopping-list.ts` vergleicht Zutatennamen case-insensitiv, erkennt aber keine Synonyme. "Sahne" und "Schlagsahne" werden als separate Zutaten aufgelistet.

## Erwartetes Verhalten

- Synonyme werden in der Einkaufslisten-Konfiguration definiert
- Bei der Aggregation werden Synonyme zusammengeführt
- Der kanonische Name (erster in der Liste) wird in der Einkaufsliste verwendet

## Betroffene Dateien

- Konfigurationsdatei (zusammen mit #010 Einkaufslisten-Kategorien)
- `packages/backend/src/routes/shopping-list.ts` - Synonym-Auflösung bei Aggregation
- Tests ergänzen
