# Dark Mode Design

**Datum**: 2026-02-10
**Issue**: [#018](../../_issues/018-dark-mode.md)

## Übersicht

Dark Mode für die WWE-Rezepte-App mit automatischer System-Erkennung und manuellem Toggle.

## Architektur

### 1. Theme-System (3 Schichten)

**CSS Variables (Design Tokens)**:
- Alle Farben in `variables.css` werden verdoppelt (Light + Dark)
- Aktuelle Variablen (`--color-bg`, `--color-text`, etc.) bleiben als API erhalten
- Dynamische Zuweisung basierend auf `data-theme` Attribut

**Theme Detection & Storage**:
- React Hook `useTheme` managed Theme-State
- Drei Modi: `'light'`, `'dark'`, `'system'`
- Persistenz in `localStorage`
- Priorität: localStorage → System-Präferenz → Default (light)

**DOM Integration**:
- `data-theme` Attribut am `<html>` Element
- Steuert aktive CSS Variables

### 2. Farbpalette

#### Light Mode (aktuell)
```css
--color-bg: #fafaf9      /* warm-gray-50 */
--color-surface: #ffffff /* white */
--color-text: #1c1917    /* warm-gray-900 */
--color-border: #d6d3d1  /* warm-gray-300 */
```

#### Dark Mode (neu)
```css
--color-bg: #1c1917      /* warm-gray-900 */
--color-surface: #292524 /* warm-gray-800 */
--color-text: #fafaf9    /* warm-gray-50 */
--color-border: #44403c  /* warm-gray-700 */
```

#### Semantic Colors (angepasst für Kontrast)

**Light Mode**:
```css
--color-ingredient: #ea580c  /* orange-600 */
--color-equipment: #2563eb   /* blue-600 */
--color-timer: #059669       /* emerald-600 */
--color-comment: #78716c     /* warm-gray-500 */
--color-primary: #ea580c     /* orange-600 */
```

**Dark Mode**:
```css
--color-ingredient: #fb923c  /* orange-400 */
--color-equipment: #60a5fa   /* blue-400 */
--color-timer: #34d399       /* emerald-400 */
--color-comment: #a8a29e     /* warm-gray-400 */
--color-primary: #fb923c     /* orange-400 */
```

### 3. UI-Komponente

**Theme Toggle Button**:
- **Position**: Floating bottom-right (fixed)
- **Design**: Icon-only (☀️/🌙)
- **Interaktion**: Cycle durch `system` → `light` → `dark` → `system`
- **Feedback**: Visueller Indikator für aktiven Modus
- **Accessibility**:
  - `aria-label` für Screen Reader
  - Keyboard navigierbar
  - Respektiert `prefers-reduced-motion`

**Styling**:
```css
position: fixed;
bottom: 20px;
right: 20px;
z-index: 1000;
```

### 4. Implementierungs-Details

#### Neue Dateien
- `src/hooks/useTheme.ts` - Theme Hook
- `src/components/ThemeToggle.tsx` - Toggle Button
- `src/styles/themes.css` - Dark Mode Variables

#### Zu ändernde Dateien
- `src/styles/variables.css` - Theme-aware Variables
- `src/App.tsx` - Theme Provider Integration
- Alle CSS-Dateien - Hardcoded Colors → Variables

#### Technische Umsetzung
- `prefers-color-scheme` Media Query als Fallback
- `localStorage.getItem('theme')` für Persistenz
- CSS: `:root[data-theme="dark"]` Selector
- Smooth transitions: `transition: background 0.3s, color 0.3s`

#### Testing
- Manuelle Tests in allen Views (Overview, Detail, Editor, Cook-Mode)
- Verschiedene Bildschirmgrößen
- Theme-Wechsel Transitions
- localStorage Persistenz
- System-Theme Wechsel

## Erfolgs-Kriterien

- [ ] Dark Mode funktioniert in allen Views
- [ ] System-Theme wird automatisch erkannt
- [ ] Manueller Toggle funktioniert
- [ ] User-Präferenz bleibt über Page-Reloads erhalten
- [ ] Smooth Transitions zwischen Themes
- [ ] Alle Farben nutzen CSS Variables (keine Hardcoded Colors)
- [ ] Gute Lesbarkeit und Kontrast in beiden Modi
