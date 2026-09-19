Die Nährwertberechnung nutzt `synonyme.json` nicht. Ein Rezept mit `@Schlagsahne` findet die Zuordnung `Sahne` nicht, obwohl beide in derselben Synonymgruppe stehen. Die Einkaufsliste dagegen löst Synonyme korrekt auf.

## Betroffene Services

- backend

## Notizen

Ursache ist ein hart gesetztes `undefined` in `packages/backend/src/nutrition/calculator.ts:109`:

```ts
const ingredientMapping = findMapping(ingredient.name, mapping, undefined);
```

`findMapping` hat den Synonym-Parameter und wertet ihn aus (Stufen 3 und 4 der Auflösung), `calculateRecipeNutrition` reicht ihn aber nicht durch. Die Route in `packages/backend/src/routes/nutrition.ts` lädt die Synonyme über `loadSynonyms` bereits und nutzt sie für `suggestBlsFoods` — nur die Berechnung sieht sie nicht.

Daraus folgt eine Inkonsistenz zwischen zwei Endpunkten derselben Route: Der Vorschlags-Endpunkt filtert mit `findMapping(ing.name, mapping, synonyms)` (`routes/nutrition.ts:227`) und hält eine per Synonym auflösbare Zutat für erledigt, schlägt also nichts vor. Die Berechnung zählt dieselbe Zutat als Fehlschlag. Eine solche Zutat fällt damit durch beide Raster: Sie taucht weder in den Vorschlägen auf noch in den Nährwerten.

Der Fix ist klein: `synonymMap` als Parameter in `calculateRecipeNutrition` aufnehmen und durchreichen. Er ändert aber Nährwertergebnisse bestehender Rezepte, deshalb gehört ein Test dazu, der genau diesen Weg absichert — ein Rezept mit einem Synonym-Namen muss denselben BLS-Code treffen wie eines mit dem kanonischen Namen.

Messbar heute: über die ganze Sammlung löst der Synonym-Pfad genau eine Zutat zusätzlich auf (204 ungemappte Namen ohne, 203 mit Synonymen). Der Nutzen wächst mit Issue #021, weil Wortformen wie `Zwiebel` vs. `Zwiebeln` dann über Synonyme statt über Doppeleinträge im Mapping gelöst werden können.
