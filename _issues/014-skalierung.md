# Rezept-Skalierung implementieren

**Priorität:** Niedrig
**Bereich:** Backend, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert lineare Skalierung von Zutatenmengen basierend auf der Portionszahl (`servings`-Metadata).

### Regeln laut Spec

- **Lineare Skalierung (Standard):** Zutatenmengen ändern sich proportional zur Portionszahl. Bei Verdopplung der Portionen verdoppeln sich die Mengen.
- **Fixe Mengen:** Zutaten mit `=` Prefix (siehe #006) werden nicht skaliert.
- **Timer:** Zeitangaben bleiben unverändert.
- **Kochgeschirr:** Mengen bleiben unverändert.

### Beispiel

Originalrezept für 2 Portionen:
```cooklang
>> servings: 2

@Nudeln{250%g} kochen.
@Salz{=1%TL} hinzufügen.
```

Skaliert auf 4 Portionen:
- Nudeln: 500g (verdoppelt)
- Salz: 1 TL (fix, nicht skaliert)

## Aktuelles Verhalten

Die Rezeptdetailansicht und der Cook-Modus zeigen bereits einen Portionsregler. Die Mengen in der Anzeige werden skaliert (`packages/frontend/src/views/RecipeDetail.tsx`). Allerdings:
- Der Parser kennt keine fixen Mengen (`=` Prefix)
- Brüche und Bereiche werden möglicherweise nicht korrekt skaliert
- Die Skalierungslogik sollte auf Korrektheit geprüft werden

## Erwartetes Verhalten

- Mengen werden korrekt linear skaliert
- Brüche (1/2, 1/3 etc.) werden korrekt berechnet
- Bereiche (5-7) werden korrekt skaliert (10-14 bei Verdopplung)
- Fixe Mengen (siehe #006) werden nicht skaliert
- Timer und Kochgeschirr werden nicht skaliert
- Die Einkaufsliste berücksichtigt die gewählte Portionszahl

## Betroffene Dateien

- `packages/frontend/src/views/RecipeDetail.tsx` - Skalierungslogik prüfen/erweitern
- `packages/frontend/src/views/CookMode.tsx` - Skalierung im Cook-Modus
- `packages/backend/src/routes/shopping-list.ts` - Skalierte Mengen in Einkaufsliste
- Neue Utility-Funktion für Mengen-Skalierung (Brüche, Bereiche etc.)
- Tests für Skalierungslogik

## Hinweise

Teilweise bereits implementiert. Prüfung der bestehenden Logik auf Korrektheit und Vollständigkeit ist der erste Schritt.
