Nährwertdaten für Zutaten über den Bundeslebensmittelschlüssel (BLS) 4.0 bereitstellen.

Datenquelle: CSV-Download von OpenAgrar (CC BY 4.0, kostenlos).
- https://www.openagrar.de/receive/openagrar_mods_00112643
- 7.140 Lebensmittel, 138 Nährstoffe, deutsche Bezeichnungen

Speicherung: noch offen (SQLite als Option).

Offene Fragen:
- Wie speichern wir die Daten? (SQLite, JSON, direkt im Repo?)
- Wie mappen wir Rezept-Zutaten auf BLS-Einträge? (Fuzzy-Matching, manuelles Mapping?)
- Welche Nährstoffe zeigen wir an? (Kalorien, Makros, KH/BE für Diabetiker, Protein für Sportler?)
- Wie skalieren die Nährwerte mit den Portionen?

## Betroffene Services

- backend (Datenimport, Mapping, API)
- frontend (Anzeige der Nährwerte)
