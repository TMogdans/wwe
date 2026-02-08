# Inline-Kommentare (`--`) im Parser unterstützen

**Priorität:** Hoch
**Bereich:** Parser, Serializer, Editor
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert Inline-Kommentare mit `--`. Alles nach `--` bis zum Zeilenende soll als Kommentar behandelt und nicht als Rezepttext ausgegeben werden.

```cooklang
Zwiebel anbraten -- bis sie glasig sind
```

## Aktuelles Verhalten

Der Parser in `packages/backend/src/parser/tokenizer.ts` erkennt `--` nicht. Der gesamte Text inklusive Kommentar wird als normaler Step-Text geparst und angezeigt.

## Erwartetes Verhalten

- `--` und alles danach bis Zeilenende wird ignoriert bzw. als Kommentar-Token gespeichert
- Kommentare erscheinen nicht in der Rezeptanzeige
- Der Serializer gibt Kommentare beim Zurückschreiben korrekt aus

### Editor

- Neue TipTap-Extension `CommentExtension` für Inline-Kommentare
- Kommentare werden im Editor visuell abgesetzt dargestellt (z.B. ausgegraut, kursiv)
- Neuer Toolbar-Button "Kommentar" in `EditorToolbar.tsx`
- Neuer Slash-Command `/kommentar` in `slash-commands.ts`
- Der Editor serialisiert Kommentare korrekt mit `--` Prefix zurück in Cooklang
- Die `cooklang-bridge.ts` muss Kommentar-Tokens als TipTap-Nodes abbilden

## Betroffene Dateien

- `packages/backend/src/parser/tokenizer.ts` - Kommentar-Erkennung einbauen
- `packages/backend/src/parser/types.ts` - `CooklangComment`-Typ hinzufügen
- `packages/backend/src/parser/serializer.ts` - Kommentare serialisieren
- `packages/backend/src/parser/__tests__/tokenizer.test.ts` - Tests ergänzen
- `packages/frontend/src/tiptap/comment-extension.ts` - Neue TipTap-Extension
- `packages/frontend/src/tiptap/comment-component.tsx` - Visuelle Darstellung im Editor
- `packages/frontend/src/tiptap/cooklang-bridge.ts` - Kommentar-Token Konvertierung
- `packages/frontend/src/tiptap/slash-commands.ts` - `/kommentar` Slash-Command
- `packages/frontend/src/components/EditorToolbar.tsx` - Kommentar-Button
