Die Nährwertberechnung deckt nur einen kleinen Teil der Sammlung ab: Von 447 Zutatennennungen in 42 Rezepten finden 159 ein Mapping (36 %). 204 verschiedene Zutatennamen haben keinen BLS-Code.

## Betroffene Services

- backend

## Notizen

Stand nach dem Mapping der Cremigen Gnocchi-Suppe (`rezepte/naehrwerte-mapping.json`, 26 Einträge).

Häufigste ungemappte Zutaten:

| Nennungen | Zutat |
|---|---|
| 10 | Zwiebel |
| 9 | Wasser |
| 7 | Zitronensaft |
| 7 | Butter |
| 5 | Milch |
| 5 | Senf |
| 5 | Oregano |
| 4 | Kreuzkümmel |
| 4 | Sake |
| 3 | Sojasauce, Lorbeerblätter, Paprikapulver edelsüßes, Schnittlauch, Sesamöl, Champignons |

Drei verschiedene Ursachen, die getrennt behandelt werden sollten:

1. **Wortform statt fehlender Daten.** `Zwiebel` (10x) scheitert nur am Singular, der Mapping-Key heißt `Zwiebeln`. `findMapping` vergleicht exakt und case-insensitiv, sonst nichts. Solche Fälle lösen sich über `synonyme.json` — sobald Issue #022 behoben ist, denn aktuell wirken Synonyme bei den Nährwerten nicht.
2. **Echte Lücken.** Butter, Milch, Senf, Sojasauce, Champignons usw. brauchen schlicht einen Eintrag.
3. **Ohne BLS-Datensatz.** Für Oregano, Lorbeerblätter, Kreuzkümmel, Paprikapulver und Chili existiert kein Eintrag — die BLS-Gruppe R enthält 97 Datensätze, davon genau drei Gewürze (Ingwer, Basilikum, Pfeffer). Diese Zutaten bleiben dauerhaft ungemappt und sollten die Coverage nicht drücken.

Fallstricke aus dem Gnocchi-Mapping, die beim Ausbau wieder auftreten:

- **Zubereitet vs. Pulver.** `Gemüsebrühe` zeigt bewusst auf `X416243` (zubereitete Brühe, 4 kcal/100 g), nicht auf `R821000` (Brühwürfel/Pulver, 51,7 g Salz/100 g). Bei `1 L` hätte der Pulver-Code über 500 g Salz ergeben. Dieselbe Falle droht bei `Wasser`, `Milch` und allem, was als Flüssigkeit in Litern im Rezept steht.
- **Die Fuzzy-Vorschläge sind unzuverlässig.** `suggestBlsFoods` lieferte für `Paprika, rot` als besten Treffer "Papaya roh", für `Sahne` "Sahnestandmittel", für `Chili` "Chili con carne". Jeder Code gehört vor dem Eintragen gegen `getFood` und `getNutrients` geprüft. Siehe auch Issue #020.
- **Einheiten.** Unbekannte Einheiten führen zu `grams = null` und damit zum Fehlschlag, auch wenn der Code stimmt. `Handvoll` musste für Petersilie über `gramsPer` ergänzt werden.

Nebenbefund an der Kennzahl selbst: `coverage` ist `matchedCount / ingredients.length`, und `matched` setzt eine Mengenangabe voraus. Zutaten wie `@Salz` ohne Menge sind gemappt, zählen aber als Fehlschlag. Die Coverage ist dadurch systematisch pessimistisch.
