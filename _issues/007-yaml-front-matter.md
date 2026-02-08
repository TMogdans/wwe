# YAML Front Matter als alternatives Metadata-Format unterstützen

**Priorität:** Mittel
**Bereich:** Parser, Serializer
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert neben dem `>> key: value` Format auch YAML Front Matter, begrenzt durch `---`.

```cooklang
---
title: Spaghetti Bolognese
servings: 4
tags: pasta, italienisch
source: Omas Kochbuch
prep time: 15 min
cook time: 45 min
---

@Hackfleisch{500%g} anbraten.
```

## Aktuelles Verhalten

Nur `>> key: value` Syntax wird unterstützt. YAML Front Matter wird nicht erkannt und als Rezepttext behandelt.

## Erwartetes Verhalten

- Der Parser erkennt `---` am Dateianfang als Start von YAML Front Matter
- YAML-Inhalte werden als Metadata geparst
- Beide Formate (`>>` und YAML) werden unterstützt
- Der Serializer kann in beide Formate ausgeben (oder eines als Standard verwenden)

## Betroffene Dateien

- `packages/backend/src/parser/parser.ts` - YAML Front Matter Erkennung
- `packages/backend/src/parser/serializer.ts` - YAML Ausgabe
- `packages/backend/package.json` - ggf. YAML-Parser-Dependency (z.B. `yaml`)
- Tests ergänzen

## Hinweise

Es muss entschieden werden, ob bei neuen Rezepten weiterhin `>>` oder YAML Front Matter als Standard verwendet wird. Beide Formate sollten lesbar sein.
