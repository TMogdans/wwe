# Screen Wake Lock — Design

**Issue:** #019
**Datum:** 2026-02-21

## Problem

Beim Kochen nach Rezept dunkelt der Bildschirm auf mobilen Geräten automatisch ab. Der Nutzer muss das Gerät immer wieder entsperren, oft mit nassen oder schmutzigen Händen.

## Lösung

Ein React-Hook `useWakeLock()`, der über die Screen Wake Lock API den Bildschirm aktiv hält. Automatisch aktiv auf Rezept-Detailseite und im Kochmodus, kein UI nötig.

## Architektur

### Hook: `useWakeLock`

- **Mount:** `navigator.wakeLock.request('screen')` anfordern
- **Unmount:** `WakeLockSentinel.release()` aufrufen
- **visibilitychange:** Lock wird vom Browser beim Tab-Wechsel aufgehoben → bei Rückkehr neu anfordern

### Feature Detection

`'wakeLock' in navigator` prüfen. Wenn nicht vorhanden, passiert nichts. Alle `request()`-Aufrufe mit try/catch umschlossen (Browser kann Lock ablehnen, z.B. bei niedrigem Akkustand).

### Integration

`useWakeLock()` als parameterloser Side-Effect-Hook in:
- `RecipeDetail.tsx`
- `CookMode.tsx`

## Betroffene Dateien

| Aktion | Datei |
|--------|-------|
| Neu | `packages/frontend/src/hooks/useWakeLock.ts` |
| Neu | `packages/frontend/src/hooks/__tests__/useWakeLock.test.ts` |
| Edit | `packages/frontend/src/views/RecipeDetail.tsx` |
| Edit | `packages/frontend/src/views/CookMode.tsx` |

## Browsersupport

Chrome, Edge, Safari (ab 16.4), Firefox (ab 126). Ältere Browser werden durch Feature Detection graceful ignoriert.
