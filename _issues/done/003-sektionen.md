# Sektionen (`= Name`) im Parser und Editor unterstützen

**Priorität:** Hoch
**Bereich:** Parser, Serializer, Editor, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert Sektionen mit `=` am Zeilenanfang. Sektionen strukturieren komplexe Rezepte in Unterabschnitte (z.B. Teig, Füllung, Glasur).

```cooklang
= Teig

@Mehl{500%g} mit @Wasser{250%ml} verrühren.

= Füllung

@Hackfleisch{300%g} anbraten.
```

Auch `== Name ==` ist gültig (Anzahl der `=` ist egal).

## Aktuelles Verhalten

Zeilen wie `= Teig` werden als normale Steps geparst. Das `CooklangRecipe`-Modell hat kein Konzept von Sektionen.

## Erwartetes Verhalten

- Zeilen die mit `=` beginnen (optional mit `=` am Ende) werden als Sektionen erkannt
- Das Datenmodell bildet Sektionen ab (z.B. `CooklangSection` mit Name und zugehörigen Steps)
- Die Rezeptanzeige zeigt Sektionen als visuelle Trennungen/Überschriften
- Der Editor ermöglicht das Einfügen von Sektionen
- Der Cook-Modus gruppiert Steps nach Sektionen

## Betroffene Dateien

- `packages/backend/src/parser/types.ts` - `CooklangSection`-Typ, Recipe-Struktur anpassen
- `packages/backend/src/parser/parser.ts` - Sektions-Erkennung
- `packages/backend/src/parser/serializer.ts` - Sektionen serialisieren
- `packages/frontend/src/views/RecipeDetail.tsx` - Sektionen anzeigen
- `packages/frontend/src/views/CookMode.tsx` - Sektionen im Cook-Modus
- `packages/frontend/src/tiptap/` - Editor-Unterstützung
- Tests in `packages/backend/src/parser/__tests__/`
