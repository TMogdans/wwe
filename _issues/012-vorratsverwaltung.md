# Vorratsverwaltung (Pantry) implementieren

**Priorität:** Niedrig
**Bereich:** Backend, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert eine TOML-basierte Vorratsverwaltung, um den Haushaltsinventar nach Lagerort zu organisieren.

```toml
[Kühlschrank]
Butter = "250%g"
Milch = { quantity = "1%L", bought = "2024-05-01", expire = "2024-05-10" }

[Gefriertruhe]
Hackfleisch = "500%g"

[Vorratskammer]
Mehl = { quantity = "1%kg", low = "200%g" }
Reis = "2%kg"
```

### Features laut Spec

- **Einfaches Format:** `Zutat = "Menge%Einheit"`
- **Erweitertes Format:** Objekt mit `quantity`, `bought`, `expire`, `low` (Mindestbestand)
- **Lagerorte:** `[Kühlschrank]`, `[Gefriertruhe]`, `[Vorratskammer]`

## Aktuelles Verhalten

Es gibt keine Vorratsverwaltung. Die Einkaufsliste berücksichtigt keine vorhandenen Vorräte.

## Erwartetes Verhalten

- TOML-Konfigurationsdatei für Vorräte
- CRUD-API für Vorratseinträge
- Die Einkaufsliste kann vorhandene Vorräte abziehen
- Frontend-Ansicht zur Vorratsverwaltung
- Optional: Warnungen bei niedrigem Bestand oder ablaufenden Produkten

## Betroffene Dateien

- Neue Konfigurationsdatei (z.B. `rezepte/pantry.toml`)
- Neuer TOML-Parser oder Dependency
- Neue Backend-Route für Vorratsverwaltung
- `packages/backend/src/routes/shopping-list.ts` - Vorräte berücksichtigen
- Neue Frontend-Ansicht für Vorratsverwaltung

## Hinweise

Dies ist ein umfangreiches Feature. Es könnte sinnvoll sein, es in Teilschritte zu unterteilen:
1. Pantry-Datei lesen und anzeigen
2. Vorräte in der Einkaufsliste berücksichtigen
3. CRUD-Operationen für Vorräte
4. Ablaufwarnungen
