Beim Kochen nach Rezept dunkelt der Bildschirm auf mobilen Geräten automatisch ab. Über die Screen Wake Lock API kann die Webapp das Gerät anweisen, den Bildschirm aktiv zu halten, solange ein Rezept geöffnet ist.

## Betroffene Services

- frontend

## Notizen

- API: `navigator.wakeLock.request('screen')`
- Lock wird beim Tab-Wechsel automatisch aufgehoben, muss bei `visibilitychange` neu angefordert werden
- Browsersupport: Chrome, Edge, Safari (ab 16.4), Firefox (ab 126)
- Wake Lock sollte auf der Rezept-Detailseite und im Kochmodus aktiv sein, nicht global
