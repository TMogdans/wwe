# WWE – "Was wollen wir essen?" – Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eine lokale Rezeptdatenbank als Web-App mit Cooklang-Parser, TipTap-Editor, Kochmodus und Einkaufslistengenerierung.

**Architecture:** pnpm Monorepo mit React-Frontend (Vite) und Express-Backend (tsup). Cooklang `.cook`-Dateien als einzige Datenquelle im Dateisystem. Distroless Docker-Container fuer Raspberry Pi 3B.

**Tech Stack:** TypeScript, React, Vite, Express, TipTap, Zod, Vitest, Biome, Husky, pnpm Workspaces, Docker

**Design-Dokument:** `docs/plans/2026-02-07-wwe-design.md`

---

## Task 1: Monorepo Setup

Grundgeruest des Projekts mit pnpm Workspaces, Biome, Husky und gemeinsamer Konfiguration.

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `pnpm-catalog.yaml`
- Create: `biome.json`
- Create: `.husky/pre-commit`
- Create: `.gitignore`
- Create: `.github/workflows/ci.yml`
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`

**Step 1: Git Repository initialisieren**

```bash
cd /Users/tmogdans/Code/wwe
git init
```

**Step 2: Root package.json und pnpm-workspace.yaml erstellen**

`package.json`:
```json
{
  "name": "wwe",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"

catalog:
  typescript: ^5.7.0
  zod: ^3.24.0
  vitest: ^3.0.0
  "@biomejs/biome": ^1.9.0
```

**Step 3: Biome-Konfiguration erstellen**

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "files": {
    "ignore": ["node_modules", "dist", "*.cook"]
  }
}
```

**Step 4: .gitignore erstellen**

```
node_modules/
dist/
.DS_Store
*.tgz
```

**Step 5: Backend package.json und tsconfig.json erstellen**

`packages/backend/package.json`:
```json
{
  "name": "@wwe/backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^5.0.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

`packages/backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

**Step 6: Frontend package.json und tsconfig.json erstellen**

`packages/frontend/package.json`:
```json
{
  "name": "@wwe/frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "catalog:",
    "vite": "^6.0.0",
    "vitest": "catalog:"
  }
}
```

`packages/frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 7: Husky einrichten**

```bash
pnpm add -Dw husky
pnpm exec husky init
```

`.husky/pre-commit`:
```bash
pnpm lint && pnpm test
```

**Step 8: GitHub Actions CI erstellen**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

**Step 9: Dependencies installieren und pruefen**

```bash
pnpm install
pnpm lint
```

**Step 10: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo with pnpm workspaces, biome, husky, ci"
```

---

## Task 2: Cooklang Parser – Tokenizer und Typen

Der Parser ist das Herzstück. Er wandelt `.cook`-Dateien in strukturiertes JSON und zurueck. Zuerst die Typen und der Tokenizer.

**Hinweis:** Die bestehenden Rezepte haben diverse Varianten, die der Parser abdecken muss:
- Zutaten: `@Name{Menge%Einheit}`, `@Name{Menge}`, `@Name` (ohne Klammern)
- Equipment: `#Name`, `#Name{}`, `#Name, Qualifier{}`
- Timer: `~{Dauer%Einheit}`, `~name{Dauer%Einheit}`
- Metadata: `>> key: value` (Casing variiert: `servings` vs `Servings`)
- Mengenangaben: Zahlen (`500`), Brueche (`1/2`), Bereiche (`5-7`), Texte (`Handvoll`, `kleine Dose`)

**Files:**
- Create: `packages/backend/src/parser/types.ts`
- Create: `packages/backend/src/parser/tokenizer.ts`
- Test: `packages/backend/src/parser/__tests__/tokenizer.test.ts`

**Step 1: Typen definieren**

`packages/backend/src/parser/types.ts`:
```typescript
export interface CooklangMetadata {
	[key: string]: string;
}

export interface CooklangIngredient {
	type: "ingredient";
	name: string;
	amount: string;
	unit: string;
}

export interface CooklangTimer {
	type: "timer";
	name: string;
	duration: string;
	unit: string;
}

export interface CooklangEquipment {
	type: "equipment";
	name: string;
}

export interface CooklangText {
	type: "text";
	value: string;
}

export type CooklangToken =
	| CooklangIngredient
	| CooklangTimer
	| CooklangEquipment
	| CooklangText;

export interface CooklangStep {
	tokens: CooklangToken[];
}

export interface CooklangRecipe {
	metadata: CooklangMetadata;
	steps: CooklangStep[];
}
```

**Step 2: Failing Tests fuer den Tokenizer schreiben**

`packages/backend/src/parser/__tests__/tokenizer.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { tokenizeLine } from "../tokenizer.js";

describe("tokenizeLine", () => {
	it("parses plain text", () => {
		const tokens = tokenizeLine("Alles gut vermengen.");
		expect(tokens).toEqual([{ type: "text", value: "Alles gut vermengen." }]);
	});

	it("parses ingredient with amount and unit", () => {
		const tokens = tokenizeLine("Das @Hackfleisch{500%g} anbraten.");
		expect(tokens).toEqual([
			{ type: "text", value: "Das " },
			{ type: "ingredient", name: "Hackfleisch", amount: "500", unit: "g" },
			{ type: "text", value: " anbraten." },
		]);
	});

	it("parses ingredient with amount only (no separator)", () => {
		const tokens = tokenizeLine("@Passierte Tomaten{400g} hinzufuegen.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Passierte Tomaten",
				amount: "400g",
				unit: "",
			},
			{ type: "text", value: " hinzufuegen." },
		]);
	});

	it("parses ingredient without amount", () => {
		const tokens = tokenizeLine("Mit @Salz und @Pfeffer wuerzen.");
		expect(tokens).toEqual([
			{ type: "text", value: "Mit " },
			{ type: "ingredient", name: "Salz", amount: "", unit: "" },
			{ type: "text", value: " und " },
			{ type: "ingredient", name: "Pfeffer", amount: "", unit: "" },
			{ type: "text", value: " wuerzen." },
		]);
	});

	it("parses ingredient with fraction amount", () => {
		const tokens = tokenizeLine("@Vanilleschote{1/2} auskratzen.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Vanilleschote",
				amount: "1/2",
				unit: "",
			},
			{ type: "text", value: " auskratzen." },
		]);
	});

	it("parses ingredient with comma in name", () => {
		const tokens = tokenizeLine("@Chili, grün{1%Stück} hacken.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Chili, grün",
				amount: "1",
				unit: "Stück",
			},
			{ type: "text", value: " hacken." },
		]);
	});

	it("parses equipment", () => {
		const tokens = tokenizeLine("In einem #Topf erhitzen.");
		expect(tokens).toEqual([
			{ type: "text", value: "In einem " },
			{ type: "equipment", name: "Topf" },
			{ type: "text", value: " erhitzen." },
		]);
	});

	it("parses equipment with empty braces", () => {
		const tokens = tokenizeLine("In einer #großen Schüssel{} mischen.");
		expect(tokens).toEqual([
			{ type: "text", value: "In einer " },
			{ type: "equipment", name: "großen Schüssel" },
			{ type: "text", value: " mischen." },
		]);
	});

	it("parses timer with name", () => {
		const tokens = tokenizeLine("~braten{4%Minuten} braten.");
		expect(tokens).toEqual([
			{ type: "timer", name: "braten", duration: "4", unit: "Minuten" },
			{ type: "text", value: " braten." },
		]);
	});

	it("parses timer without name", () => {
		const tokens = tokenizeLine("~{10%Minuten} kochen.");
		expect(tokens).toEqual([
			{ type: "timer", name: "", duration: "10", unit: "Minuten" },
			{ type: "text", value: " kochen." },
		]);
	});

	it("parses timer with range duration", () => {
		const tokens = tokenizeLine("~simmern{5-7%Minuten} simmern.");
		expect(tokens).toEqual([
			{
				type: "timer",
				name: "simmern",
				duration: "5-7",
				unit: "Minuten",
			},
			{ type: "text", value: " simmern." },
		]);
	});

	it("parses mixed tokens in complex line", () => {
		const tokens = tokenizeLine(
			"@Öl{2%EL} in einem #Topf erhitzen und @Hackfleisch{500%g} anbraten.",
		);
		expect(tokens).toEqual([
			{ type: "ingredient", name: "Öl", amount: "2", unit: "EL" },
			{ type: "text", value: " in einem " },
			{ type: "equipment", name: "Topf" },
			{ type: "text", value: " erhitzen und " },
			{ type: "ingredient", name: "Hackfleisch", amount: "500", unit: "g" },
			{ type: "text", value: " anbraten." },
		]);
	});
});
```

**Step 3: Test ausfuehren und Fehlschlag verifizieren**

```bash
cd packages/backend && pnpm test
```

Expected: FAIL – `tokenizeLine` existiert noch nicht.

**Step 4: Tokenizer implementieren**

`packages/backend/src/parser/tokenizer.ts`:

Der Tokenizer muss zeichenweise durch die Zeile gehen und `@`, `#`, `~` als Trigger fuer spezielle Tokens erkennen. Zutaten-Namen koennen Leerzeichen und Kommas enthalten und enden entweder bei `{` (mit Mengenangabe) oder beim naechsten Sonderzeichen / Wortende ohne Klammer.

Implementierungshinweise:
- `@` startet Zutat: Name lesen bis `{` oder Ende (Wortgrenze: naechstes Leerzeichen gefolgt von Nicht-Buchstabe, oder Zeilenende)
- Bei `{`: Inhalt bis `}` lesen, bei `%` in Amount/Unit splitten
- `#` startet Equipment: analog zu Zutat, `{}` ist optional und leer
- `~` startet Timer: optionaler Name bis `{`, dann Dauer/Unit in `{}`
- Alles andere ist Text

**Step 5: Tests ausfuehren und Erfolg verifizieren**

```bash
cd packages/backend && pnpm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/backend/src/parser/
git commit -m "feat: add cooklang tokenizer with types"
```

---

## Task 3: Cooklang Parser – Rezept-Parser und Serializer

Baut auf dem Tokenizer auf: parst komplette `.cook`-Dateien (Metadata + Schritte) und serialisiert zurueck.

**Files:**
- Create: `packages/backend/src/parser/parser.ts`
- Create: `packages/backend/src/parser/serializer.ts`
- Create: `packages/backend/src/parser/index.ts`
- Test: `packages/backend/src/parser/__tests__/parser.test.ts`
- Test: `packages/backend/src/parser/__tests__/serializer.test.ts`

**Step 1: Failing Tests fuer den Parser schreiben**

`packages/backend/src/parser/__tests__/parser.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { parseRecipe } from "../parser.js";

describe("parseRecipe", () => {
	it("parses metadata lines", () => {
		const input = `>> time required: 30 Minuten
>> course: dinner
>> servings: 2`;
		const recipe = parseRecipe(input);
		expect(recipe.metadata).toEqual({
			"time required": "30 Minuten",
			course: "dinner",
			servings: "2",
		});
		expect(recipe.steps).toEqual([]);
	});

	it("normalizes metadata keys to lowercase", () => {
		const input = ">> Servings: 4";
		const recipe = parseRecipe(input);
		expect(recipe.metadata).toEqual({ servings: "4" });
	});

	it("parses steps separated by blank lines", () => {
		const input = `>> servings: 2

Ersten Schritt machen.

Zweiten Schritt machen.`;
		const recipe = parseRecipe(input);
		expect(recipe.steps).toHaveLength(2);
	});

	it("treats consecutive non-empty lines as one step", () => {
		const input = `>> servings: 2

Zeile eins.
Zeile zwei.

Neuer Schritt.`;
		const recipe = parseRecipe(input);
		expect(recipe.steps).toHaveLength(2);
	});

	it("parses a real recipe file", () => {
		const input = `>> time required: 10 Minuten
>> servings: 4

@Butter, weich{250%g} aus dem Kuehlschrank nehmen.

Den @Knoblauch{3%Zehen} schälen und reiben.`;
		const recipe = parseRecipe(input);
		expect(recipe.metadata["time required"]).toBe("10 Minuten");
		expect(recipe.steps).toHaveLength(2);
		expect(
			recipe.steps[0].tokens.find((t) => t.type === "ingredient"),
		).toMatchObject({
			name: "Butter, weich",
			amount: "250",
			unit: "g",
		});
	});
});
```

**Step 2: Test ausfuehren – FAIL erwartet**

```bash
cd packages/backend && pnpm test
```

**Step 3: Parser implementieren**

`packages/backend/src/parser/parser.ts`:

Logik:
1. Datei zeilenweise lesen
2. Zeilen die mit `>>` starten sind Metadata (key/value nach `:`), Keys werden lowercase normalisiert
3. Leere Zeilen trennen Schritte
4. Aufeinanderfolgende nicht-leere Zeilen (nach Metadata-Block) werden zu einem Schritt zusammengefasst
5. Jeder Schritt wird durch den Tokenizer gejagt

**Step 4: Tests ausfuehren – PASS erwartet**

```bash
cd packages/backend && pnpm test
```

**Step 5: Failing Tests fuer den Serializer schreiben**

`packages/backend/src/parser/__tests__/serializer.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { parseRecipe } from "../parser.js";
import { serializeRecipe } from "../serializer.js";

describe("serializeRecipe", () => {
	it("serializes metadata", () => {
		const recipe = {
			metadata: { "time required": "30 Minuten", servings: "2" },
			steps: [],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain(">> time required: 30 Minuten");
		expect(output).toContain(">> servings: 2");
	});

	it("serializes ingredients back to cooklang format", () => {
		const recipe = {
			metadata: {},
			steps: [
				{
					tokens: [
						{ type: "ingredient" as const, name: "Hackfleisch", amount: "500", unit: "g" },
						{ type: "text" as const, value: " anbraten." },
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("@Hackfleisch{500%g} anbraten.");
	});

	it("serializes ingredient without amount", () => {
		const recipe = {
			metadata: {},
			steps: [
				{
					tokens: [
						{ type: "ingredient" as const, name: "Salz", amount: "", unit: "" },
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toContain("@Salz");
		expect(output).not.toContain("{");
	});

	it("roundtrips a parsed recipe", () => {
		const input = `>> time required: 30 Minuten
>> servings: 2

@Öl{2%EL} in einem #Topf erhitzen.

@Hackfleisch{500%g} anbraten.`;
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		const reparsed = parseRecipe(output);
		expect(reparsed.metadata).toEqual(parsed.metadata);
		expect(reparsed.steps.length).toBe(parsed.steps.length);
	});
});
```

**Step 6: Tests ausfuehren – FAIL erwartet**

**Step 7: Serializer implementieren**

`packages/backend/src/parser/serializer.ts`:

Logik:
- Metadata: `>> key: value` pro Zeile
- Leerzeile nach Metadata
- Pro Schritt: Tokens zu Text zusammenbauen
  - Ingredient: `@Name{Amount%Unit}` (ohne Klammern wenn kein Amount)
  - Equipment: `#Name` (mit `{}` wenn Name Leerzeichen enthaelt)
  - Timer: `~Name{Duration%Unit}`
  - Text: direkt ausgeben
- Schritte durch Leerzeilen trennen

**Step 8: Barrel export erstellen**

`packages/backend/src/parser/index.ts`:
```typescript
export { parseRecipe } from "./parser.js";
export { serializeRecipe } from "./serializer.js";
export { tokenizeLine } from "./tokenizer.js";
export type * from "./types.js";
```

**Step 9: Alle Tests ausfuehren – PASS erwartet**

```bash
cd packages/backend && pnpm test
```

**Step 10: Commit**

```bash
git add packages/backend/src/parser/
git commit -m "feat: add cooklang parser and serializer with roundtrip support"
```

---

## Task 4: Zod Schemas und Hilfsfunktionen

Shared Schemas fuer die API-Validierung und Zutatenaggregation fuer die Einkaufsliste.

**Files:**
- Create: `packages/backend/src/schemas/recipe.ts`
- Create: `packages/backend/src/schemas/shopping-list.ts`
- Create: `packages/backend/src/schemas/index.ts`
- Test: `packages/backend/src/schemas/__tests__/shopping-list.test.ts`

**Step 1: Rezept-Schemas definieren**

`packages/backend/src/schemas/recipe.ts`:
```typescript
import { z } from "zod";

export const recipeMetadataSchema = z.object({
	"time required": z.string().optional(),
	course: z.string().optional(),
	servings: z.string().optional(),
});

export const recipeSummarySchema = z.object({
	slug: z.string(),
	name: z.string(),
	metadata: recipeMetadataSchema,
});

export const createRecipeSchema = z.object({
	name: z.string().min(1),
	content: z.string(),
});

export const updateRecipeSchema = z.object({
	content: z.string(),
});

export const shoppingListRequestSchema = z.object({
	slugs: z.array(z.string()).min(1),
});

export type RecipeSummary = z.infer<typeof recipeSummarySchema>;
export type CreateRecipeRequest = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeRequest = z.infer<typeof updateRecipeSchema>;
export type ShoppingListRequest = z.infer<typeof shoppingListRequestSchema>;
```

**Step 2: Failing Tests fuer Zutatenaggregation schreiben**

`packages/backend/src/schemas/__tests__/shopping-list.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { aggregateIngredients } from "../shopping-list.js";
import type { CooklangIngredient } from "../../parser/types.js";

describe("aggregateIngredients", () => {
	it("groups identical ingredients", () => {
		const input = [
			{
				recipeName: "Chili",
				ingredients: [
					{ type: "ingredient" as const, name: "Knoblauch", amount: "2", unit: "Zehen" },
				],
			},
			{
				recipeName: "Gyoza",
				ingredients: [
					{ type: "ingredient" as const, name: "Knoblauch", amount: "2", unit: "" },
				],
			},
		];
		const result = aggregateIngredients(input);
		const knoblauch = result.find((r) => r.name === "Knoblauch");
		expect(knoblauch).toBeDefined();
		expect(knoblauch!.entries).toHaveLength(2);
		expect(knoblauch!.entries[0].recipeName).toBe("Chili");
		expect(knoblauch!.entries[1].recipeName).toBe("Gyoza");
	});

	it("lists unique ingredients separately", () => {
		const input = [
			{
				recipeName: "Chili",
				ingredients: [
					{ type: "ingredient" as const, name: "Hackfleisch", amount: "500", unit: "g" },
					{ type: "ingredient" as const, name: "Knoblauch", amount: "2", unit: "Zehen" },
				],
			},
		];
		const result = aggregateIngredients(input);
		expect(result).toHaveLength(2);
	});

	it("formats as plain text for clipboard", () => {
		const input = [
			{
				recipeName: "Chili",
				ingredients: [
					{ type: "ingredient" as const, name: "Hackfleisch", amount: "500", unit: "g" },
				],
			},
		];
		const result = aggregateIngredients(input);
		const text = result
			.map((r) =>
				r.entries.map((e) => `${e.amount} ${e.unit} ${r.name} (${e.recipeName})`).join("\n")
			)
			.join("\n");
		expect(text).toContain("500 g Hackfleisch (Chili)");
	});
});
```

**Step 3: Tests ausfuehren – FAIL erwartet**

**Step 4: aggregateIngredients implementieren**

`packages/backend/src/schemas/shopping-list.ts`:
```typescript
import type { CooklangIngredient } from "../parser/types.js";

export interface RecipeIngredients {
	recipeName: string;
	ingredients: CooklangIngredient[];
}

export interface AggregatedEntry {
	amount: string;
	unit: string;
	recipeName: string;
}

export interface AggregatedIngredient {
	name: string;
	entries: AggregatedEntry[];
}

export function aggregateIngredients(
	recipes: RecipeIngredients[],
): AggregatedIngredient[] {
	// Group by ingredient name (case-insensitive)
	// Each entry keeps its amount, unit, and source recipe
	// Return sorted alphabetically by ingredient name
}
```

**Step 5: Tests ausfuehren – PASS erwartet**

**Step 6: Barrel export**

`packages/backend/src/schemas/index.ts`:
```typescript
export * from "./recipe.js";
export * from "./shopping-list.js";
```

**Step 7: Commit**

```bash
git add packages/backend/src/schemas/
git commit -m "feat: add zod schemas and ingredient aggregation"
```

---

## Task 5: Backend API – Express Server und Rezept-Routen

Der Express-Server mit allen REST-Endpunkten.

**Files:**
- Create: `packages/backend/src/index.ts`
- Create: `packages/backend/src/routes/recipes.ts`
- Create: `packages/backend/src/routes/shopping-list.ts`
- Create: `packages/backend/tsup.config.ts`
- Test: `packages/backend/src/routes/__tests__/recipes.test.ts`
- Test: `packages/backend/src/routes/__tests__/shopping-list.test.ts`

**Step 1: tsup-Konfiguration erstellen**

`packages/backend/tsup.config.ts`:
```typescript
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node22",
	clean: true,
	sourcemap: true,
});
```

**Step 2: Failing Tests fuer die Rezept-Routen schreiben**

`packages/backend/src/routes/__tests__/recipes.test.ts`:

Tests mit Vitest und `supertest` (oder direkt Express-App instanziieren):
- `GET /api/rezepte` liefert Liste aller Rezepte als Summary (slug, name, metadata)
- `GET /api/rezepte/chili-con-carne` liefert vollstaendig geparstes Rezept
- `GET /api/rezepte/nicht-vorhanden` liefert 404
- `POST /api/rezepte` mit Name und Content erstellt neue `.cook`-Datei
- `PUT /api/rezepte/chili-con-carne` aktualisiert bestehende Datei
- `DELETE /api/rezepte/chili-con-carne` loescht Datei

Wichtig: Tests sollten ein temporaeres Verzeichnis mit Test-`.cook`-Dateien verwenden, nicht die echten Rezepte.

**Step 3: Tests ausfuehren – FAIL erwartet**

**Step 4: Express-App und Rezept-Routen implementieren**

`packages/backend/src/index.ts`:
```typescript
import express from "express";
import { createRecipeRouter } from "./routes/recipes.js";
import { createShoppingListRouter } from "./routes/shopping-list.js";

const app = express();
const recipesDir = process.env.RECIPES_DIR ?? "./rezepte";

app.use(express.json());
app.use("/api/rezepte", createRecipeRouter(recipesDir));
app.use("/api/einkaufsliste", createShoppingListRouter(recipesDir));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
	console.log(`WWE running on port ${port}`);
});
```

`packages/backend/src/routes/recipes.ts`:

Implementierung:
- Slug = Dateiname ohne `.cook`, URL-encoded
- `GET /` – Alle `.cook`-Dateien lesen, nur Metadata parsen, als Summary zurueckgeben
- `GET /:slug` – Einzelne Datei lesen, komplett parsen
- `POST /` – Zod-Validierung mit `createRecipeSchema`, neue Datei schreiben
- `PUT /:slug` – Zod-Validierung mit `updateRecipeSchema`, bestehende Datei ueberschreiben
- `DELETE /:slug` – Datei loeschen, 404 wenn nicht vorhanden

**Step 5: Tests ausfuehren – PASS erwartet**

**Step 6: Failing Tests fuer Einkaufslisten-Route schreiben**

`packages/backend/src/routes/__tests__/shopping-list.test.ts`:

Tests:
- `POST /api/einkaufsliste` mit `{ slugs: ["chili-con-carne", "gyoza-fuellung"] }` liefert aggregierte Zutatenliste
- Leeres `slugs`-Array liefert 400
- Nicht-existierender Slug liefert 404

**Step 7: Einkaufslisten-Route implementieren**

`packages/backend/src/routes/shopping-list.ts`:

Implementierung:
- Slugs validieren (Zod)
- Jedes Rezept parsen, Zutaten extrahieren
- `aggregateIngredients()` aufrufen
- Ergebnis als JSON zurueckgeben

**Step 8: Alle Tests ausfuehren – PASS erwartet**

**Step 9: Commit**

```bash
git add packages/backend/src/
git commit -m "feat: add express api with recipe and shopping list routes"
```

---

## Task 6: Frontend Setup und Routing

React-App mit Vite, grundlegendes Layout und Client-Side Routing.

**Files:**
- Create: `packages/frontend/index.html`
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/api.ts`
- Create: `packages/frontend/src/styles/global.css`
- Create: `packages/frontend/src/styles/variables.css`

**Step 1: Vite-Konfiguration erstellen**

`packages/frontend/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			"/api": "http://localhost:3000",
		},
	},
});
```

**Step 2: HTML-Entry und React-App erstellen**

`packages/frontend/index.html`:
```html
<!doctype html>
<html lang="de">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>WWE – Was wollen wir essen?</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/main.tsx"></script>
	</body>
</html>
```

**Step 3: CSS-Variablen und globale Styles definieren**

`packages/frontend/src/styles/variables.css`:
```css
:root {
	--color-bg: #fafaf9;
	--color-text: #1c1917;
	--color-ingredient: #ea580c;
	--color-equipment: #2563eb;
	--color-timer: #059669;
	--color-border: #d6d3d1;
	--color-surface: #ffffff;
	--radius: 8px;
	--font-base: system-ui, -apple-system, sans-serif;
}
```

`packages/frontend/src/styles/global.css`:
```css
@import "./variables.css";

* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family: var(--font-base);
	background: var(--color-bg);
	color: var(--color-text);
	line-height: 1.6;
}
```

**Step 4: API-Client erstellen**

`packages/frontend/src/api.ts`:

Einfache Fetch-Wrapper fuer alle API-Endpunkte:
- `fetchRecipes()` → `GET /api/rezepte`
- `fetchRecipe(slug)` → `GET /api/rezepte/:slug`
- `createRecipe(data)` → `POST /api/rezepte`
- `updateRecipe(slug, data)` → `PUT /api/rezepte/:slug`
- `deleteRecipe(slug)` → `DELETE /api/rezepte/:slug`
- `generateShoppingList(slugs)` → `POST /api/einkaufsliste`

**Step 5: App-Komponente mit Routing erstellen**

`packages/frontend/src/App.tsx`:

Einfaches Client-Side-Routing (kein React Router noetig fuer 4 Views – ein simpler State-basierter Router reicht):
- `/` → Rezeptuebersicht
- `/rezept/:slug` → Rezeptdetail
- `/rezept/:slug/kochen` → Kochmodus
- `/rezept/:slug/bearbeiten` → Editor
- `/neu` → Editor (neues Rezept)

Oder alternativ: `react-router` verwenden, wenn gewuenscht. Entscheidung beim Implementieren.

**Step 6: Dev-Server starten und pruefen**

```bash
cd packages/frontend && pnpm dev
```

Seite sollte im Browser ohne Fehler laden.

**Step 7: Commit**

```bash
git add packages/frontend/
git commit -m "feat: add frontend setup with vite, routing, and api client"
```

---

## Task 7: Rezeptuebersicht (Startseite)

Kachelansicht mit Suche und Checkbox-Auswahl fuer die Einkaufsliste.

**Files:**
- Create: `packages/frontend/src/views/RecipeOverview.tsx`
- Create: `packages/frontend/src/components/RecipeCard.tsx`
- Create: `packages/frontend/src/components/ShoppingListButton.tsx`
- Create: `packages/frontend/src/styles/overview.css`
- Test: `packages/frontend/src/views/__tests__/RecipeOverview.test.tsx`

**Step 1: Failing Test schreiben**

Test (mit Vitest + jsdom oder happy-dom):
- Rendert Rezeptkarten basierend auf API-Daten
- Suche filtert Karten nach Name
- Checkbox-Auswahl zeigt "Einkaufsliste generieren"-Button
- Ohne Auswahl ist der Button nicht sichtbar

**Step 2: Tests ausfuehren – FAIL erwartet**

**Step 3: RecipeCard-Komponente implementieren**

Zeigt pro Kachel:
- Rezeptname
- Zubereitungszeit (aus Metadata)
- Gang/Course (aus Metadata)
- Checkbox oben rechts
- Klick auf Kachel navigiert zur Detailansicht

**Step 4: RecipeOverview-View implementieren**

- Laedt Rezepte via `fetchRecipes()`
- Textfeld fuer Suche (filtert clientseitig nach Name)
- Grid-Layout fuer Kacheln
- State fuer ausgewaehlte Rezepte (Set von Slugs)
- `ShoppingListButton` erscheint wenn `selectedSlugs.size > 0`

**Step 5: ShoppingListButton implementieren**

- Ruft `generateShoppingList(slugs)` auf
- Zeigt Ergebnis in einem Dialog/Modal (Radix UI Dialog)
- "Kopieren"-Button nutzt `navigator.clipboard.writeText()`
- Plain-Text-Format: `Menge Einheit Zutat (Rezeptname)` pro Zeile

**Step 6: Tests ausfuehren – PASS erwartet**

**Step 7: Manuell testen mit laufendem Backend**

```bash
pnpm dev
```

Alle 14 Rezepte sollten als Kacheln erscheinen.

**Step 8: Commit**

```bash
git add packages/frontend/src/
git commit -m "feat: add recipe overview with search and shopping list"
```

---

## Task 8: Rezeptdetail-Ansicht

Detail-View mit Tabs (Zutaten/Zubereitung), Portionsrechner und Kochmodus-Button.

**Files:**
- Create: `packages/frontend/src/views/RecipeDetail.tsx`
- Create: `packages/frontend/src/components/IngredientList.tsx`
- Create: `packages/frontend/src/components/StepList.tsx`
- Create: `packages/frontend/src/components/PortionCalculator.tsx`
- Create: `packages/frontend/src/styles/detail.css`
- Test: `packages/frontend/src/views/__tests__/RecipeDetail.test.tsx`

**Step 1: Failing Tests schreiben**

Tests:
- Zeigt Rezeptname und Metadaten
- Tab "Zutaten" zeigt alle Zutaten mit Mengen
- Tab "Zubereitung" zeigt Schritte mit farbig hervorgehobenen Zutaten/Equipment
- Portionsrechner skaliert Mengen (2 Portionen → 4 verdoppelt alle Mengen)
- "Kochmodus"-Button ist sichtbar
- "Bearbeiten"-Button ist sichtbar

**Step 2: Tests ausfuehren – FAIL erwartet**

**Step 3: PortionCalculator implementieren**

- Props: `baseServings: number`, `currentServings: number`, `onChange: (n: number) => void`
- +/- Buttons
- Berechnet Skalierungsfaktor: `currentServings / baseServings`

**Step 4: IngredientList implementieren**

- Props: `ingredients: CooklangIngredient[]`, `scale: number`
- Zeigt jede Zutat mit skalierter Menge
- Mengen-Skalierung: numerische Werte multiplizieren, Brueche (`1/2`) und Texte (`Handvoll`) unveraendert lassen

**Step 5: StepList implementieren**

- Props: `steps: CooklangStep[]`, `scale: number`
- Pro Schritt: Tokens rendern, Zutaten in `<span class="ingredient">`, Equipment in `<span class="equipment">`, Timer in `<span class="timer">`
- Mengen in Zutaten-Spans werden ebenfalls skaliert

**Step 6: RecipeDetail-View zusammenbauen**

- Laedt Rezept via `fetchRecipe(slug)`
- Kopfbereich mit Name und Metadaten
- Radix UI Tabs fuer Zutaten/Zubereitung
- Portionsrechner im Zutaten-Tab
- "Kochmodus starten"-Button (immer sichtbar, ausserhalb der Tabs)
- "Bearbeiten"-Button

**Step 7: Tests ausfuehren – PASS erwartet**

**Step 8: Commit**

```bash
git add packages/frontend/src/
git commit -m "feat: add recipe detail view with tabs and portion calculator"
```

---

## Task 9: Kochmodus

Vollbild-Schritt-fuer-Schritt-Ansicht fuer die Nutzung beim Kochen.

**Files:**
- Create: `packages/frontend/src/views/CookMode.tsx`
- Create: `packages/frontend/src/styles/cook-mode.css`
- Test: `packages/frontend/src/views/__tests__/CookMode.test.tsx`

**Step 1: Failing Tests schreiben**

Tests:
- Zeigt nur den aktuellen Schritt
- Navigation vorwaerts/rueckwaerts aendert den Schritt
- Erster Schritt: Zurueck-Button deaktiviert
- Letzter Schritt: Vorwaerts-Button zeigt "Fertig"
- Fortschrittsanzeige zeigt "Schritt X von Y"
- Zutaten und Equipment sind farblich hervorgehoben
- "Beenden"-Button navigiert zurueck zur Detailansicht

**Step 2: Tests ausfuehren – FAIL erwartet**

**Step 3: CookMode implementieren**

`packages/frontend/src/views/CookMode.tsx`:

- State: `currentStep: number`
- Grosse Touch-Bereiche links (zurueck) und rechts (vor) – per CSS `position: fixed` mit halber Bildschirmbreite
- Alternativ Swipe-Gesten (optional, `touch-action` CSS oder einfaches `onTouchStart`/`onTouchEnd`)
- Grosses Schrift-Styling (`font-size: clamp(1.2rem, 4vw, 1.8rem)`)
- Dunkler Hintergrund optional fuer hohen Kontrast
- Fortschrittsbalken oder Text oben
- "Beenden" X-Button oben rechts

`packages/frontend/src/styles/cook-mode.css`:
```css
.cook-mode {
	position: fixed;
	inset: 0;
	background: var(--color-bg);
	display: flex;
	flex-direction: column;
	padding: 2rem;
}

.cook-mode__step {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: clamp(1.2rem, 4vw, 1.8rem);
	line-height: 1.8;
	text-align: center;
	padding: 2rem;
}

.cook-mode__nav {
	display: flex;
	justify-content: space-between;
	padding: 1rem;
}

.cook-mode__nav button {
	font-size: 1.2rem;
	padding: 1rem 2rem;
	min-width: 120px;
	border-radius: var(--radius);
	border: none;
	cursor: pointer;
}
```

**Step 4: Tests ausfuehren – PASS erwartet**

**Step 5: Manuell am Browser testen**

Navigation testen, Touch-Bereiche auf verschiedenen Viewports pruefen.

**Step 6: Commit**

```bash
git add packages/frontend/src/
git commit -m "feat: add cook mode with step-by-step navigation"
```

---

## Task 10: TipTap Editor – Ingredient Extension

Die erste und komplexeste TipTap Custom Extension. Timer und Equipment folgen dem gleichen Muster.

**Files:**
- Create: `packages/frontend/src/tiptap/ingredient-extension.ts`
- Create: `packages/frontend/src/tiptap/ingredient-component.tsx`
- Test: `packages/frontend/src/tiptap/__tests__/ingredient-extension.test.ts`

**Step 1: Failing Tests schreiben**

Tests:
- Extension registriert sich korrekt als TipTap Node
- Ingredient-Node hat Attribute: name, amount, unit
- Serialisierung zu Cooklang-Format: `@Name{Amount%Unit}`
- Parsen von Cooklang-Format zurueck in Node
- Input Rule: `/zutat` triggert das Einfuegen

**Step 2: Tests ausfuehren – FAIL erwartet**

**Step 3: Ingredient Extension implementieren**

`packages/frontend/src/tiptap/ingredient-extension.ts`:
```typescript
import { Node, mergeAttributes } from "@tiptap/core";

export const IngredientExtension = Node.create({
	name: "ingredient",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			name: { default: "" },
			amount: { default: "" },
			unit: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="ingredient"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "ingredient",
				class: "ingredient-chip",
			}),
		];
	},

	// addNodeView() fuer React-Komponente
	// addCommands() fuer programmatisches Einfuegen
});
```

**Step 4: Ingredient React-Komponente (NodeView) implementieren**

`packages/frontend/src/tiptap/ingredient-component.tsx`:

- Zeigt farbigen Chip: `🥕 Name (Amount Unit)`
- Doppelklick oeffnet Popover zum Bearbeiten (Radix UI Popover)
- Popover mit 3 Feldern: Name, Menge, Einheit

**Step 5: Tests ausfuehren – PASS erwartet**

**Step 6: Commit**

```bash
git add packages/frontend/src/tiptap/
git commit -m "feat: add tiptap ingredient extension with popover editing"
```

---

## Task 11: TipTap Editor – Timer und Equipment Extensions

Gleich Muster wie Ingredient, nur einfacher.

**Files:**
- Create: `packages/frontend/src/tiptap/timer-extension.ts`
- Create: `packages/frontend/src/tiptap/timer-component.tsx`
- Create: `packages/frontend/src/tiptap/equipment-extension.ts`
- Create: `packages/frontend/src/tiptap/equipment-component.tsx`
- Create: `packages/frontend/src/tiptap/index.ts`
- Test: `packages/frontend/src/tiptap/__tests__/timer-extension.test.ts`
- Test: `packages/frontend/src/tiptap/__tests__/equipment-extension.test.ts`

**Step 1: Failing Tests fuer Timer schreiben**

Analog zu Ingredient:
- Timer-Node mit Attributen: name, duration, unit
- Serialisierung: `~Name{Duration%Unit}`
- Chip-Darstellung: `⏱ Duration Unit`

**Step 2: Timer Extension und Komponente implementieren**

**Step 3: Tests ausfuehren – PASS erwartet**

**Step 4: Failing Tests fuer Equipment schreiben**

Equipment ist am einfachsten – nur ein Name, keine Menge:
- Equipment-Node mit Attribut: name
- Serialisierung: `#Name`
- Chip-Darstellung: `🍳 Name`

**Step 5: Equipment Extension und Komponente implementieren**

**Step 6: Tests ausfuehren – PASS erwartet**

**Step 7: Barrel export und Slash-Commands**

`packages/frontend/src/tiptap/index.ts`:

Exportiert alle drei Extensions plus eine gemeinsame Slash-Command-Konfiguration:
- `/zutat` → Ingredient einfuegen
- `/timer` → Timer einfuegen
- `/equipment` → Equipment einfuegen

Hierfuer TipTap's `@tiptap/suggestion` nutzen.

**Step 8: Commit**

```bash
git add packages/frontend/src/tiptap/
git commit -m "feat: add timer and equipment tiptap extensions"
```

---

## Task 12: Rezept-Editor View

Bringt den TipTap-Editor, Metadata-Formular und Cooklang-Serialisierung zusammen.

**Files:**
- Create: `packages/frontend/src/views/RecipeEditor.tsx`
- Create: `packages/frontend/src/components/MetadataForm.tsx`
- Create: `packages/frontend/src/tiptap/cooklang-bridge.ts`
- Create: `packages/frontend/src/styles/editor.css`
- Test: `packages/frontend/src/views/__tests__/RecipeEditor.test.tsx`
- Test: `packages/frontend/src/tiptap/__tests__/cooklang-bridge.test.ts`

**Step 1: Failing Tests fuer cooklang-bridge schreiben**

Die Bridge wandelt zwischen TipTap-JSON und Cooklang-Format um:
- `cooklangToTiptap(cooklangString)` → TipTap-JSON (Nodes mit Ingredient/Timer/Equipment)
- `tiptapToCooklang(tiptapJSON)` → Cooklang-String

Tests:
- Einfacher Text bleibt unveraendert
- `@Hackfleisch{500%g}` wird zu Ingredient-Node und zurueck
- Mehrere Schritte (Absaetze) werden korrekt gemappt
- Roundtrip: Cooklang → TipTap → Cooklang ergibt gleiches Ergebnis

**Step 2: Tests ausfuehren – FAIL erwartet**

**Step 3: cooklang-bridge implementieren**

Nutzt den Parser aus dem Backend (oder eine leichtgewichtige Frontend-Variante des Tokenizers) um Cooklang zu parsen und in TipTap Nodes zu wandeln.

**Step 4: Tests ausfuehren – PASS erwartet**

**Step 5: Failing Tests fuer RecipeEditor schreiben**

Tests:
- Bearbeiten: Laedt bestehendes Rezept, zeigt Metadata-Formular und Editor
- Neues Rezept: Leeres Formular und Editor
- Speichern: Serialisiert TipTap-Content zu Cooklang und sendet an API
- Metadata-Felder: Portionen, Zubereitungszeit, Gang

**Step 6: MetadataForm implementieren**

- Formularfelder: Name (nur bei neuem Rezept), Portionen, Zubereitungszeit, Gang
- Gang als Dropdown (dinner, dessert, dip, oder freier Text)
- Gibt Metadata-Objekt zurueck

**Step 7: RecipeEditor View implementieren**

- Laedt Rezept wenn Slug vorhanden (Bearbeiten) oder leerer State (Neu)
- TipTap-Editor mit allen drei Extensions
- Toolbar: Buttons fuer Zutat, Timer, Equipment einfuegen
- Speichern-Button: `cooklangBridge.tiptapToCooklang()` + Metadata → API-Call

**Step 8: Tests ausfuehren – PASS erwartet**

**Step 9: Commit**

```bash
git add packages/frontend/src/
git commit -m "feat: add recipe editor with tiptap and cooklang bridge"
```

---

## Task 13: Docker Setup

Dockerfile und docker-compose fuer Deployment auf dem Raspi.

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: .dockerignore erstellen**

```
node_modules
dist
.git
.github
docs
*.md
.DS_Store
```

**Step 2: Multi-Stage Dockerfile erstellen**

`Dockerfile`:
```dockerfile
# Build Stage
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml pnpm-catalog.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
RUN pnpm build

# Runtime Stage
FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app

COPY --from=build /app/packages/backend/dist ./
COPY --from=build /app/packages/frontend/dist ./public

ENV PORT=3000
ENV RECIPES_DIR=/data/rezepte
EXPOSE 3000

CMD ["index.js"]
```

Hinweis: Das Backend muss im Production-Modus die statischen Frontend-Assets aus `./public` ausliefern (`express.static`).

**Step 3: docker-compose.yml erstellen**

```yaml
services:
  wwe:
    build: .
    ports:
      - "80:3000"
    volumes:
      - ./rezepte:/data/rezepte
    restart: unless-stopped
```

**Step 4: Lokalen Docker-Build testen**

```bash
docker compose build
docker compose up -d
```

App sollte auf `http://localhost` erreichbar sein.

**Step 5: Cross-Build fuer arm64 testen**

```bash
docker buildx build --platform linux/arm64 -t wwe:latest .
```

**Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add docker setup with distroless multi-stage build"
```

---

## Task 14: Backend Static File Serving

Im Production-Modus muss das Backend die Frontend-Assets ausliefern.

**Files:**
- Modify: `packages/backend/src/index.ts`

**Step 1: Static File Serving hinzufuegen**

In `packages/backend/src/index.ts` nach den API-Routen:
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
	const publicDir = path.join(
		path.dirname(fileURLToPath(import.meta.url)),
		"public",
	);
	app.use(express.static(publicDir));

	// SPA fallback: all non-API routes serve index.html
	app.get("*", (_req, res) => {
		res.sendFile(path.join(publicDir, "index.html"));
	});
}
```

**Step 2: Testen mit Docker**

```bash
docker compose build && docker compose up -d
```

Alle Views sollten funktionieren, API-Calls ebenso.

**Step 3: Commit**

```bash
git add packages/backend/src/index.ts
git commit -m "feat: serve frontend assets from backend in production"
```

---

## Task 15: GitHub Actions Docker Build

CI-Pipeline um Docker-Image zu bauen und optional auf den Raspi zu deployen.

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Docker-Build-Job hinzufuegen**

Erweitere die CI um einen Build-Job:
```yaml
  docker:
    runs-on: ubuntu-latest
    needs: check
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/arm64
          push: false
          tags: wwe:latest
```

Spaeter kann hier ein Push zu einem Registry oder ein Deployment-Step ergaenzt werden.

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add docker build step for arm64"
```

---

## Reihenfolge und Abhaengigkeiten

```
Task 1: Monorepo Setup
  └─→ Task 2: Tokenizer
       └─→ Task 3: Parser + Serializer
            └─→ Task 4: Zod Schemas
                 └─→ Task 5: Backend API
                      └─→ Task 6: Frontend Setup
                           ├─→ Task 7: Rezeptuebersicht
                           ├─→ Task 8: Rezeptdetail
                           ├─→ Task 9: Kochmodus
                           ├─→ Task 10: Ingredient Extension
                           │    └─→ Task 11: Timer + Equipment Extensions
                           │         └─→ Task 12: Editor View
                           └─→ Task 13: Docker Setup
                                └─→ Task 14: Static File Serving
                                     └─→ Task 15: CI Docker Build
```

Tasks 7, 8, 9 koennen parallel zu Tasks 10, 11 bearbeitet werden.
