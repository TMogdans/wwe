# Fixe (nicht-skalierende) Mengen (`=` Prefix) unterstützen

**Priorität:** Mittel
**Bereich:** Parser, Serializer, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec erlaubt das Markieren von Mengen als "fix" mit einem `=` Prefix. Diese Mengen sollen beim Skalieren des Rezepts nicht verändert werden.

```cooklang
@Salz{=1%TL}
@Vanilleextrakt{=1%TL}
```

## Aktuelles Verhalten

Der `=` Prefix wird nicht erkannt. `@Salz{=1%TL}` würde `=1` als Menge parsen.

## Erwartetes Verhalten

- Der Parser erkennt `=` als Prefix vor der Menge
- `CooklangIngredient` erhält ein `fixed: boolean`-Feld
- Fixe Mengen werden beim Skalieren nicht angepasst (relevant wenn #014 Skalierung implementiert ist)
- Der Serializer gibt das `=` Prefix korrekt aus
- Die Anzeige kann fixe Mengen visuell kennzeichnen

### Editor

- Das Ingredient-Popover (`ingredient-component.tsx`) erhält eine Checkbox "Fixe Menge" / "Nicht skalieren"
- Die `IngredientExtension` erhält ein neues Attribut `fixed: boolean`
- Fixe Zutaten werden im Editor-Chip visuell gekennzeichnet (z.B. kleines Schloss-Icon oder andere Farbe)
- Die `cooklang-bridge.ts` muss das `fixed`-Attribut beim Parsen und Serialisieren berücksichtigen

## Betroffene Dateien

- `packages/backend/src/parser/types.ts` - `fixed?: boolean` zu `CooklangIngredient`
- `packages/backend/src/parser/tokenizer.ts` - `=` Prefix in `parseBraceContent()`
- `packages/backend/src/parser/serializer.ts` - `=` Prefix serialisieren
- `packages/frontend/src/tiptap/ingredient-extension.ts` - `fixed`-Attribut hinzufügen
- `packages/frontend/src/tiptap/ingredient-component.tsx` - Checkbox und visuelle Kennzeichnung
- `packages/frontend/src/tiptap/cooklang-bridge.ts` - `fixed`-Konvertierung
- Tests ergänzen

## Hinweise

Dieses Feature ist eng verknüpft mit #014 (Skalierung). Ohne Skalierung hat es begrenzten Nutzen, aber der Parser sollte den `=` Prefix trotzdem korrekt verarbeiten.
