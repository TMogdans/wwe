# Bild-Konventionen laut Cooklang-Spec umsetzen

**Priorität:** Niedrig
**Bereich:** Backend, Frontend
**Spec-Referenz:** https://cooklang.org/docs/spec/

## Beschreibung

Die Cooklang-Spec definiert Konventionen für Rezeptbilder basierend auf Dateinamen.

### Konventionen

- **Rezeptbild:** Gleicher Dateiname wie das Rezept: `Spaghetti Bolognese.cook` → `Spaghetti Bolognese.jpg`
- **Step-spezifische Bilder:** Nummerierung nach Step: `Spaghetti Bolognese.0.jpg`, `Spaghetti Bolognese.3.jpg`
- **Unterstützte Formate:** `.png`, `.jpg`

## Aktuelles Verhalten

Es gibt keine Bildunterstützung für Rezepte. Bilder im Rezeptverzeichnis werden ignoriert.

## Erwartetes Verhalten

- Das Backend sucht automatisch nach passenden Bilddateien im Rezeptverzeichnis
- Das Rezept-API liefert Bild-URLs mit (Hauptbild + Step-Bilder)
- Die Rezeptdetailansicht zeigt das Hauptbild an
- Der Cook-Modus zeigt Step-spezifische Bilder beim jeweiligen Schritt an
- Optional: Bild-Upload im Editor

## Betroffene Dateien

- `packages/backend/src/routes/recipes.ts` - Bildsuche bei Rezeptabruf
- Neuer Static-File-Server oder Bild-Route
- `packages/frontend/src/views/RecipeDetail.tsx` - Bildanzeige
- `packages/frontend/src/views/CookMode.tsx` - Step-Bilder
- `packages/frontend/src/api.ts` - Bild-URLs in Typen
