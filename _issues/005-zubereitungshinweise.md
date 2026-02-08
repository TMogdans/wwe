# Zubereitungshinweise bei Zutaten (`()`) unterstützen

**Priorität:** Mittel
**Bereich:** Parser, Serializer, Editor, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec erlaubt Zubereitungshinweise in Klammern direkt nach einer Zutat.

```cooklang
@Zwiebel{1}(geschält und fein gewürfelt)
@Knoblauch{2%Zehen}(gepresst)
```

## Aktuelles Verhalten

Klammern nach Zutaten werden als normaler Text geparst. `@Zwiebel{1}(geschält)` ergibt die Zutat "Zwiebel" mit Menge 1, und "(geschält)" wird als separater Text-Token behandelt.

## Erwartetes Verhalten

- Der Parser erkennt `(...)` direkt nach `}` als Zubereitungshinweis
- `CooklangIngredient` erhält ein `preparation`-Feld
- Die Rezeptanzeige zeigt Zubereitungshinweise bei der Zutat an (z.B. als Tooltip oder Zusatztext)
- Die Einkaufsliste kann Zubereitungshinweise optional anzeigen
- Der Editor erlaubt die Eingabe von Zubereitungshinweisen

## Betroffene Dateien

- `packages/backend/src/parser/types.ts` - `preparation?: string` zu `CooklangIngredient`
- `packages/backend/src/parser/tokenizer.ts` - Klammer-Erkennung nach `}`
- `packages/backend/src/parser/serializer.ts` - Zubereitungshinweise serialisieren
- `packages/frontend/src/tiptap/ingredient-extension.ts` - `preparation`-Attribut
- `packages/frontend/src/tiptap/ingredient-component.tsx` - UI für Zubereitungshinweis
- `packages/frontend/src/tiptap/cooklang-bridge.ts` - Konvertierung
- Tests ergänzen
