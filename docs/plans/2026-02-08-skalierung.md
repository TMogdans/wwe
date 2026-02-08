# Rezept-Skalierung (Cooklang-Spec-konform) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Skalierungslogik konsolidieren, Cooklang-Spec-Konformität herstellen (fixe Mengen, Bereiche), und Einkaufsliste skalierbar machen.

**Architecture:** Gemeinsame `scaleAmount()`-Utility im Frontend statt 3 Kopien. Die Funktion bekommt ein `fixed`-Flag, um fixe Mengen zu erkennen, und Bereichs-Support (`5-7`). Die Shopping-List-API bekommt einen optionalen `servings`-Parameter pro Rezept, um skalierte Mengen zu liefern.

**Tech Stack:** TypeScript, React, Vitest, Express

---

### Task 1: Shared scaleAmount-Utility mit Tests erstellen

**Files:**
- Create: `packages/frontend/src/utils/scale-amount.ts`
- Create: `packages/frontend/src/utils/__tests__/scale-amount.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/frontend/src/utils/__tests__/scale-amount.test.ts
import { describe, expect, it } from "vitest";
import { scaleAmount } from "../scale-amount.js";

describe("scaleAmount", () => {
  // Einfache Zahlen
  it("scales integer amounts", () => {
    expect(scaleAmount("500", 2)).toBe("1000");
  });

  it("scales decimal amounts", () => {
    expect(scaleAmount("1.5", 2)).toBe("3");
  });

  it("formats non-integer results to 1 decimal", () => {
    expect(scaleAmount("100", 1.5)).toBe("150");
    expect(scaleAmount("3", 1.5)).toBe("4.5");
  });

  it("returns empty string for empty input", () => {
    expect(scaleAmount("", 2)).toBe("");
  });

  // Brüche
  it("scales fractions", () => {
    expect(scaleAmount("1/2", 2)).toBe("1");
    expect(scaleAmount("1/4", 2)).toBe("0.5");
    expect(scaleAmount("3/4", 2)).toBe("1.5");
  });

  // Bereiche (NEU)
  it("scales ranges", () => {
    expect(scaleAmount("5-7", 2)).toBe("10-14");
    expect(scaleAmount("2-3", 3)).toBe("6-9");
  });

  it("scales ranges with decimal results", () => {
    expect(scaleAmount("5-7", 1.5)).toBe("7.5-10.5");
  });

  // Text-Mengen
  it("returns text amounts unchanged", () => {
    expect(scaleAmount("Handvoll", 2)).toBe("Handvoll");
    expect(scaleAmount("kleine Dose", 3)).toBe("kleine Dose");
  });

  // Fixe Mengen (NEU)
  it("does not scale when fixed is true", () => {
    expect(scaleAmount("500", 2, true)).toBe("500");
    expect(scaleAmount("1/2", 3, true)).toBe("1/2");
    expect(scaleAmount("5-7", 2, true)).toBe("5-7");
  });

  // Scale = 1 (keine Änderung)
  it("returns original amount when scale is 1", () => {
    expect(scaleAmount("500", 1)).toBe("500");
    expect(scaleAmount("1/2", 1)).toBe("0.5");
    expect(scaleAmount("5-7", 1)).toBe("5-7");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/tmogdans/Code/wwe && npx vitest run packages/frontend/src/utils/__tests__/scale-amount.test.ts`
Expected: FAIL – module not found

**Step 3: Write implementation**

```typescript
// packages/frontend/src/utils/scale-amount.ts
function formatScaled(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

export function scaleAmount(
  amount: string,
  scale: number,
  fixed?: boolean,
): string {
  if (!amount) return "";
  if (fixed) return amount;

  // Range like "5-7"
  const rangeMatch = amount.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const low = Number(rangeMatch[1]) * scale;
    const high = Number(rangeMatch[2]) * scale;
    return `${formatScaled(low)}-${formatScaled(high)}`;
  }

  // Simple number
  const num = Number(amount);
  if (!Number.isNaN(num)) {
    return formatScaled(num * scale);
  }

  // Fraction like "1/2"
  const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const decimal = Number(fractionMatch[1]) / Number(fractionMatch[2]);
    return formatScaled(decimal * scale);
  }

  // Text amounts – don't scale
  return amount;
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/tmogdans/Code/wwe && npx vitest run packages/frontend/src/utils/__tests__/scale-amount.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/frontend/src/utils/scale-amount.ts packages/frontend/src/utils/__tests__/scale-amount.test.ts
git commit -m "feat: add shared scaleAmount utility with range and fixed support"
```

---

### Task 2: IngredientList auf shared Utility umstellen + fixed-Flag respektieren

**Files:**
- Modify: `packages/frontend/src/components/IngredientList.tsx`

**Step 1: Write the code changes**

Ersetze die lokale `scaleAmount`-Funktion und nutze die neue Utility. Trage das `fixed`-Flag in die Ingredient-Daten durch.

```typescript
// IngredientList.tsx – Änderungen:
// 1. Import hinzufügen:
import { scaleAmount } from "../utils/scale-amount.js";

// 2. Lokale scaleAmount-Funktion (Zeile 8-26) ENTFERNEN

// 3. In der ingredients-Schleife (Zeile 34-49): fixed-Flag durchreichen
const ingredients: Array<{
  name: string;
  amount: string;
  unit: string;
  preparation: string;
  fixed?: boolean;
}> = [];

for (const step of section.steps) {
  for (const token of step.tokens) {
    if (token.type === "ingredient") {
      ingredients.push({
        name: token.name,
        amount: token.amount,
        unit: token.unit,
        preparation: token.preparation,
        fixed: token.fixed,
      });
    }
  }
}

// 4. Im Rendering (Zeile 66): fixed übergeben
{scaleAmount(ing.amount, scale, ing.fixed)}
```

**Step 2: Run all frontend tests + typecheck**

Run: `cd /Users/tmogdans/Code/wwe && npx vitest run packages/frontend && cd packages/frontend && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/frontend/src/components/IngredientList.tsx
git commit -m "refactor: use shared scaleAmount in IngredientList, respect fixed flag"
```

---

### Task 3: StepList auf shared Utility umstellen + fixed-Flag respektieren

**Files:**
- Modify: `packages/frontend/src/components/StepList.tsx`

**Step 1: Write the code changes**

```typescript
// StepList.tsx – Änderungen:
// 1. Import hinzufügen:
import { scaleAmount } from "../utils/scale-amount.js";

// 2. Lokale scaleAmount-Funktion (Zeile 8-22) ENTFERNEN

// 3. Im ingredient-case (Zeile 81-82): fixed übergeben
case "ingredient":
  return (
    <span key={key} className="token-ingredient">
      {token.amount
        ? `${scaleAmount(token.amount, scale, token.fixed)} `
        : ""}
      {token.unit ? `${token.unit} ` : ""}
      {token.name}
      {token.preparation ? ` (${token.preparation})` : ""}
    </span>
  );
```

**Step 2: Run typecheck**

Run: `cd /Users/tmogdans/Code/wwe/packages/frontend && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/frontend/src/components/StepList.tsx
git commit -m "refactor: use shared scaleAmount in StepList, respect fixed flag"
```

---

### Task 4: CookMode auf shared Utility umstellen + fixed-Flag respektieren

**Files:**
- Modify: `packages/frontend/src/views/CookMode.tsx`

**Step 1: Write the code changes**

```typescript
// CookMode.tsx – Änderungen:
// 1. Import hinzufügen:
import { scaleAmount } from "../utils/scale-amount.js";

// 2. Lokale scaleAmount-Funktion (Zeile 55-69) ENTFERNEN

// 3. In renderToken, ingredient-case (Zeile 77-83): fixed übergeben
case "ingredient":
  return (
    <span key={key} className="token-ingredient">
      {token.amount
        ? `${scaleAmount(token.amount, scale, token.fixed)} `
        : ""}
      {token.unit ? `${token.unit} ` : ""}
      {token.name}
    </span>
  );
```

**Step 2: Run typecheck**

Run: `cd /Users/tmogdans/Code/wwe/packages/frontend && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/frontend/src/views/CookMode.tsx
git commit -m "refactor: use shared scaleAmount in CookMode, respect fixed flag"
```

---

### Task 5: Shopping-List-API um Skalierung erweitern

**Files:**
- Modify: `packages/backend/src/schemas/recipe.ts` (Schema erweitern)
- Modify: `packages/backend/src/routes/shopping-list.ts` (Skalierungslogik)
- Modify: `packages/backend/src/routes/__tests__/shopping-list.test.ts` (Tests)

**Step 1: Write the failing tests**

Neue Tests in `shopping-list.test.ts` hinzufügen:

```typescript
it("POST / scales amounts when servings provided", async () => {
  const res = await request(app)
    .post("/api/einkaufsliste")
    .send({
      slugs: [
        { slug: "Chili", servings: 4 },
      ],
    });
  expect(res.status).toBe(200);
  const hackfleisch = res.body.find(
    (i: { name: string }) => i.name === "Hackfleisch",
  );
  expect(hackfleisch).toBeDefined();
  // Chili hat servings: 2, bei 4 Portionen wird verdoppelt
  expect(hackfleisch.entries[0].amount).toBe("1000");
});

it("POST / does not scale fixed amounts", async () => {
  await writeFile(
    path.join(tempDir, "Pasta.cook"),
    ">> servings: 2\n\n@Nudeln{500%g} kochen.\n@Salz{=1%TL} hinzufuegen.",
  );
  const res = await request(app)
    .post("/api/einkaufsliste")
    .send({
      slugs: [
        { slug: "Pasta", servings: 4 },
      ],
    });
  expect(res.status).toBe(200);
  const nudeln = res.body.find(
    (i: { name: string }) => i.name === "Nudeln",
  );
  expect(nudeln.entries[0].amount).toBe("1000");
  const salz = res.body.find(
    (i: { name: string }) => i.name === "Salz",
  );
  expect(salz.entries[0].amount).toBe("1");
});

it("POST / works with plain string slugs (backward compatible)", async () => {
  const res = await request(app)
    .post("/api/einkaufsliste")
    .send({ slugs: ["Chili"] });
  expect(res.status).toBe(200);
  const hackfleisch = res.body.find(
    (i: { name: string }) => i.name === "Hackfleisch",
  );
  expect(hackfleisch.entries[0].amount).toBe("500");
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/tmogdans/Code/wwe && npx vitest run packages/backend/src/routes/__tests__/shopping-list.test.ts`
Expected: FAIL – schema validation rejects new format

**Step 3: Update schema to accept both formats**

In `packages/backend/src/schemas/recipe.ts`:

```typescript
// Ersetze shoppingListRequestSchema:
const slugEntry = z.union([
  z.string(),
  z.object({
    slug: z.string(),
    servings: z.number().positive().optional(),
  }),
]);

export const shoppingListRequestSchema = z.object({
  slugs: z.array(slugEntry).min(1),
});
```

**Step 4: Add scaleAmount utility to backend**

Create: `packages/backend/src/utils/scale-amount.ts`

```typescript
function formatScaled(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

export function scaleAmount(
  amount: string,
  scale: number,
  fixed?: boolean,
): string {
  if (!amount) return "";
  if (fixed) return amount;

  const rangeMatch = amount.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const low = Number(rangeMatch[1]) * scale;
    const high = Number(rangeMatch[2]) * scale;
    return `${formatScaled(low)}-${formatScaled(high)}`;
  }

  const num = Number(amount);
  if (!Number.isNaN(num)) {
    return formatScaled(num * scale);
  }

  const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const decimal = Number(fractionMatch[1]) / Number(fractionMatch[2]);
    return formatScaled(decimal * scale);
  }

  return amount;
}
```

**Step 5: Update shopping-list route to use scaling**

In `packages/backend/src/routes/shopping-list.ts`:

```typescript
import { scaleAmount } from "../utils/scale-amount.js";

// In the POST handler, nach dem Parsen des Schemas:
const { slugs } = result.data;

// Normalisiere slugs zu einheitlichem Format
const normalizedSlugs = slugs.map((entry) =>
  typeof entry === "string"
    ? { slug: entry, servings: undefined }
    : entry,
);

// Dann in der for-Schleife:
for (const { slug, servings } of normalizedSlugs) {
  // ... file read + parse wie bisher ...

  // Scale-Factor berechnen
  const baseServings = parsed.metadata.servings
    ? Number.parseInt(parsed.metadata.servings, 10)
    : undefined;
  const scale =
    servings && baseServings ? servings / baseServings : 1;

  const ingredients: CooklangIngredient[] = [];
  for (const section of parsed.sections) {
    for (const step of section.steps) {
      for (const token of step.tokens) {
        if (token.type === "ingredient") {
          ingredients.push(
            scale !== 1
              ? {
                  ...token,
                  amount: scaleAmount(token.amount, scale, token.fixed),
                }
              : token,
          );
        }
      }
    }
  }

  recipeIngredientsList.push({
    recipeName: slug,
    ingredients,
  });
}
```

**Step 6: Run tests to verify they pass**

Run: `cd /Users/tmogdans/Code/wwe && npx vitest run packages/backend/src/routes/__tests__/shopping-list.test.ts`
Expected: All PASS

**Step 7: Commit**

```bash
git add packages/backend/src/utils/scale-amount.ts packages/backend/src/schemas/recipe.ts packages/backend/src/routes/shopping-list.ts packages/backend/src/routes/__tests__/shopping-list.test.ts
git commit -m "feat: support scaled amounts in shopping list API"
```

---

### Task 6: Frontend-API und ShoppingListDialog an neue API anpassen

**Files:**
- Modify: `packages/frontend/src/api.ts`
- Modify: Komponente die `generateShoppingList` aufruft (prüfen wo)

**Step 1: API-Funktion erweitern**

In `packages/frontend/src/api.ts`:

```typescript
// Ersetze generateShoppingList:
export async function generateShoppingList(
  slugs: Array<string | { slug: string; servings?: number }>,
): Promise<AggregatedIngredient[]> {
  const res = await fetch("/api/einkaufsliste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slugs }),
  });
  if (!res.ok) throw new Error("Failed to generate shopping list");
  return res.json();
}
```

Die Funktion ist abwärtskompatibel – bestehende Aufrufe mit `string[]` funktionieren weiterhin.

**Step 2: Run typecheck**

Run: `cd /Users/tmogdans/Code/wwe/packages/frontend && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/frontend/src/api.ts
git commit -m "feat: extend generateShoppingList API to accept servings parameter"
```

---

### Task 7: Alle Tests laufen lassen + manueller Smoke-Test

**Step 1: Alle Tests**

Run: `cd /Users/tmogdans/Code/wwe && npx vitest run`
Expected: All PASS

**Step 2: TypeCheck beider Packages**

Run: `cd /Users/tmogdans/Code/wwe/packages/frontend && npx tsc --noEmit && cd ../backend && npx tsc --noEmit`
Expected: PASS

**Step 3: Issue-Datei nach done verschieben**

```bash
mv _issues/014-skalierung.md _issues/done/014-skalierung.md
```

**Step 4: Final Commit**

```bash
git add _issues/
git commit -m "chore: mark issue 014 (Skalierung) as done"
```

---

## Zusammenfassung der Änderungen

| Was | Status vorher | Status nachher |
|-----|--------------|----------------|
| Fixe Mengen (`=` Prefix) nicht skaliert | Parser erkennt es, Frontend ignoriert es | Frontend respektiert `fixed`-Flag |
| Bereiche (`5-7`) skaliert | Nicht unterstützt | Beide Zahlen werden skaliert |
| Code-Duplikation `scaleAmount` | 3 identische Kopien | 1 shared Utility |
| Shopping-List skalierbar | Nur Basismengen | Optionaler `servings`-Parameter pro Rezept |
| Timer/Equipment nicht skaliert | Korrekt | Korrekt (unverändert) |
