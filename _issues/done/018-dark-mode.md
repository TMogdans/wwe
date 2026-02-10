# Dark Mode Implementation

Dark Mode für die Rezepte-App mit automatischer System-Erkennung und manuellem Toggle.

## Anforderungen

- **Automatische System-Erkennung**: App passt sich an macOS/Windows Dark Mode an
- **Manueller Toggle**: Nutzer können manuell zwischen Light/Dark wechseln (Override)
- **Persistenz**: Nutzer-Präferenz wird gespeichert (localStorage)
- **Design-System**: Nutzung von CSS Custom Properties für alle Farben
- **Alle Views**: Dark Mode funktioniert in Overview, Detail, Editor und Cook-Mode

## Technische Umsetzung

- CSS Variables für Light/Dark Theme in `variables.css`
- `prefers-color-scheme` Media Query für System-Erkennung
- React Context/State für Theme-Management
- Toggle-Button in der UI (wahrscheinlich Header/Navigation)

## Betroffene Services

- frontend
