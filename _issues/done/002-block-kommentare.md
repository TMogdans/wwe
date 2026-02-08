# Block-Kommentare (`[- -]`) im Parser unterstützen

**Priorität:** Hoch
**Bereich:** Parser, Serializer, Editor
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert mehrzeilige Block-Kommentare mit `[- ... -]`. Diese können sich über mehrere Zeilen erstrecken.

```cooklang
[- Das ist ein
   mehrzeiliger Kommentar -]
Nächster Schritt hier.
```

## Aktuelles Verhalten

Der Parser erkennt `[- -]` nicht. Der gesamte Inhalt wird als normaler Rezepttext behandelt.

## Erwartetes Verhalten

- `[- ... -]` wird als Block-Kommentar erkannt, auch über mehrere Zeilen
- Kommentar-Inhalt erscheint nicht in der Rezeptanzeige
- Block-Kommentare können auch inline verwendet werden: `Text [- Kommentar -] weiter`
- Der Serializer gibt Block-Kommentare korrekt aus

### Editor

- Block-Kommentare können die gleiche `CommentExtension` wie Inline-Kommentare nutzen (siehe #001), ggf. als Variante
- Im Editor werden Block-Kommentare als eigener Block dargestellt (z.B. eingerückter, ausgegrauer Bereich)
- Einfügen über Toolbar-Button oder Slash-Command (gemeinsam mit Inline-Kommentaren aus #001)
- Mehrzeilige Kommentare müssen im TipTap-Datenmodell korrekt abgebildet werden
- Die `cooklang-bridge.ts` muss `[- ... -]` beim Parsen und Serialisieren korrekt behandeln

## Betroffene Dateien

- `packages/backend/src/parser/tokenizer.ts` - Block-Kommentar-Erkennung
- `packages/backend/src/parser/parser.ts` - Mehrzeilige Kommentare über Zeilengrenzen
- `packages/backend/src/parser/types.ts` - Kommentar-Typ (gemeinsam mit #001)
- `packages/backend/src/parser/serializer.ts` - Kommentare serialisieren
- `packages/frontend/src/tiptap/comment-extension.ts` - Block-Kommentar-Variante (gemeinsam mit #001)
- `packages/frontend/src/tiptap/comment-component.tsx` - Block-Darstellung
- `packages/frontend/src/tiptap/cooklang-bridge.ts` - Block-Kommentar Konvertierung
- `packages/backend/src/parser/__tests__/tokenizer.test.ts` - Tests
- `packages/backend/src/parser/__tests__/parser.test.ts` - Mehrzeilige Tests

## Hinweise

Hängt teilweise von #001 (Inline-Kommentare) ab - beide Kommentar-Typen sollten konsistent implementiert werden.
