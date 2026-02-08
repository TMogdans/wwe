# Einkaufslisten-Kategorien unterstützen

**Priorität:** Niedrig
**Bereich:** Backend, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert eine Konfigurationsmöglichkeit für Einkaufslisten-Kategorien. Zutaten können Kategorien zugeordnet werden, um sie nach Supermarkt-Abteilungen zu gruppieren.

```
[Obst & Gemüse]
Zwiebeln
Tomaten
Knoblauch

[Fleisch & Wurst]
Hackfleisch
Speck

[Milchprodukte]
Sahne
Butter
```

Auch verschiedene Einkaufsstätten können als Kategorien verwendet werden:
```
[Aldi]
...
[Wochenmarkt]
...
```

## Aktuelles Verhalten

Die Einkaufsliste in `packages/backend/src/routes/shopping-list.ts` aggregiert Zutaten nur nach Name. Es gibt keine Kategorisierung.

## Erwartetes Verhalten

- Eine Konfigurationsdatei für Zutat-Kategorien-Zuordnung
- Die Einkaufsliste gruppiert Zutaten nach Kategorien
- Nicht zugeordnete Zutaten erscheinen in "Sonstiges"
- Das Frontend zeigt Kategorien als Gruppen mit Überschriften an

## Betroffene Dateien

- Neue Konfigurationsdatei (z.B. `rezepte/shopping-list.conf`)
- `packages/backend/src/routes/shopping-list.ts` - Kategorisierung einbauen
- `packages/frontend/src/views/ShoppingList.tsx` - Gruppierte Anzeige
- Neuer Parser für die Konfigurationsdatei
