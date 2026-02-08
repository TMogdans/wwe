# Notizen (`>`) im Parser und Frontend unterstützen

**Priorität:** Hoch
**Bereich:** Parser, Serializer, Editor, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert Notizen mit `>` am Zeilenanfang. Notizen sind Hintergrundinformationen, die nicht als Kochschritt behandelt werden sollen.

```cooklang
> Dieses Rezept stammt aus Omas Kochbuch und wird seit Generationen weitergegeben.

@Mehl{500%g} in eine #Schüssel{} geben.
```

## Aktuelles Verhalten

Zeilen mit `>` werden als normale Steps geparst und in der Rezeptanzeige als Kochschritte dargestellt.

## Erwartetes Verhalten

- Zeilen die mit `>` beginnen werden als Notizen erkannt
- Notizen werden visuell anders dargestellt als Kochschritte (z.B. eingerückt, kursiv, andere Hintergrundfarbe)
- Notizen erscheinen nicht in der Step-Nummerierung im Cook-Modus
- Der Serializer gibt Notizen mit `>` Prefix korrekt aus

### Editor

- Neue TipTap-Extension `NoteExtension` als Block-Node (ähnlich Blockquote)
- Notizen werden im Editor visuell abgesetzt (z.B. linker Rand, Hintergrundfarbe, kursiv)
- Neuer Toolbar-Button "Notiz" in `EditorToolbar.tsx`
- Neuer Slash-Command `/notiz` in `slash-commands.ts`
- Notizen können weiterhin Cooklang-Tokens enthalten (Zutaten, Timer etc.)
- Die `cooklang-bridge.ts` muss `>`-Zeilen als Notiz-Nodes im TipTap-Dokument abbilden und beim Serialisieren das `>` Prefix wiederherstellen

## Betroffene Dateien

- `packages/backend/src/parser/types.ts` - `CooklangNote`-Typ oder Step-Typ erweitern
- `packages/backend/src/parser/parser.ts` - Notiz-Erkennung
- `packages/backend/src/parser/serializer.ts` - Notizen serialisieren
- `packages/frontend/src/views/RecipeDetail.tsx` - Notizen visuell absetzen
- `packages/frontend/src/views/CookMode.tsx` - Notizen ausblenden oder anders darstellen
- `packages/frontend/src/tiptap/note-extension.ts` - Neue TipTap-Extension
- `packages/frontend/src/tiptap/note-component.tsx` - Visuelle Darstellung im Editor
- `packages/frontend/src/tiptap/cooklang-bridge.ts` - Notiz-Konvertierung
- `packages/frontend/src/tiptap/slash-commands.ts` - `/notiz` Slash-Command
- `packages/frontend/src/components/EditorToolbar.tsx` - Notiz-Button
- Tests in `packages/backend/src/parser/__tests__/`
