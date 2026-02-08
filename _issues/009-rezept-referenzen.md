# Rezept-Referenzen als Zutaten unterstützen

**Priorität:** Niedrig
**Bereich:** Parser, Serializer, Frontend, Backend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec erlaubt es, andere Rezepte als Zutat zu referenzieren. So können Unterrezepte (z.B. Saucen, Teige) eingebunden werden.

```cooklang
@./sauces/Hollandaise{150%g}
@./Pizzateig{1%Portion}
```

## Aktuelles Verhalten

Pfade wie `./sauces/Hollandaise` werden als normaler Zutatenname geparst. Es gibt keine Verknüpfung zu anderen Rezeptdateien.

## Erwartetes Verhalten

- Der Parser erkennt relative Pfade als Rezept-Referenzen
- Referenzierte Rezepte werden in der Anzeige als klickbare Links dargestellt
- Die Einkaufsliste kann Zutaten aus referenzierten Rezepten rekursiv auflösen
- Der Editor bietet eine Auswahl bestehender Rezepte als Referenz an

## Betroffene Dateien

- `packages/backend/src/parser/types.ts` - `CooklangIngredient` um `recipeRef?: string` erweitern
- `packages/backend/src/parser/tokenizer.ts` - Pfad-Erkennung bei `@`
- `packages/backend/src/parser/serializer.ts` - Referenzen serialisieren
- `packages/backend/src/routes/recipes.ts` - Rezept-Auflösung
- `packages/backend/src/routes/shopping-list.ts` - Rekursive Zutatenliste
- `packages/frontend/src/views/RecipeDetail.tsx` - Klickbare Links
- Tests ergänzen

## Hinweise

Dieses Feature erfordert eine Überprüfung der Rezept-Verzeichnisstruktur und zirkuläre Referenzen müssen verhindert werden.
