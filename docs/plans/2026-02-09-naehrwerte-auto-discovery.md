# Nährwerte Auto-Discovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatische BLS-Mapping-Vorschläge für ungemappte Zutaten mit direkter Editier-Möglichkeit im Nährwerte-Tab.

**Architecture:** Backend erweitert `findMapping()` um Synonym-Support und fügt Fuzzy-Matching (Levenshtein) hinzu. Neue API-Endpoints liefern Suggestions und speichern Mappings. Frontend zeigt Radio-Button-Listen mit BLS-Vorschlägen direkt unter der Nährwert-Tabelle.

**Tech Stack:** fastest-levenshtein, Express, React, TypeScript, Vitest

---

## Task 1: Add fastest-levenshtein Dependency

**Files:**
- Modify: `packages/backend/package.json`

**Step 1: Install dependency**

Run:
```bash
cd packages/backend
pnpm add fastest-levenshtein
```

Expected: Package added to dependencies

**Step 2: Verify installation**

Run:
```bash
pnpm list fastest-levenshtein
```

Expected: Shows installed version

**Step 3: Commit**

```bash
git add packages/backend/package.json packages/backend/pnpm-lock.yaml
git commit -m "chore(backend): add fastest-levenshtein for fuzzy matching

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Extend findMapping with Synonym Support

**Files:**
- Modify: `packages/backend/src/nutrition/calculator.ts:181-195`
- Test: `packages/backend/src/nutrition/__tests__/calculator.test.ts`

**Step 1: Write failing test for synonym lookup**

Add to `calculator.test.ts`:

```typescript
import { buildSynonymMap } from "../schemas/shopping-list.js";

describe("findMapping with synonyms", () => {
	test("finds mapping via synonym", () => {
		const mapping: MappingConfig = {
			Sahne: { code: "M010100" },
		};
		const synonymMap = buildSynonymMap([
			["Sahne", "Schlagsahne", "Obers"],
		]);

		const result = findMapping("Schlagsahne", mapping, synonymMap);
		expect(result).toEqual({ code: "M010100" });
	});

	test("prefers exact match over synonym", () => {
		const mapping: MappingConfig = {
			Sahne: { code: "M010100" },
			Schlagsahne: { code: "M020200" },
		};
		const synonymMap = buildSynonymMap([
			["Sahne", "Schlagsahne"],
		]);

		const result = findMapping("Schlagsahne", mapping, synonymMap);
		expect(result).toEqual({ code: "M020200" });
	});

	test("returns null when no match found", () => {
		const mapping: MappingConfig = {
			Sahne: { code: "M010100" },
		};
		const synonymMap = buildSynonymMap([
			["Sahne", "Schlagsahne"],
		]);

		const result = findMapping("Unbekannt", mapping, synonymMap);
		expect(result).toBeNull();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test calculator.test.ts`

Expected: FAIL - "findMapping expects 2 arguments but got 3"

**Step 3: Update findMapping signature and implementation**

In `calculator.ts`, replace the `findMapping` function:

```typescript
import type { SynonymMap } from "../schemas/shopping-list.js";

export function findMapping(
	ingredientName: string,
	mapping: MappingConfig,
	synonymMap?: SynonymMap,
): IngredientMapping | null {
	// 1. Exact match
	if (mapping[ingredientName]) return mapping[ingredientName];

	// 2. Case-insensitive match
	const lowerName = ingredientName.toLowerCase();
	for (const [key, value] of Object.entries(mapping)) {
		if (key.toLowerCase() === lowerName) return value;
	}

	// 3. Synonym lookup → exact match
	if (synonymMap) {
		const canonical = synonymMap.get(lowerName);
		if (canonical && mapping[canonical]) {
			return mapping[canonical];
		}

		// 4. Synonym lookup → case-insensitive match
		if (canonical) {
			const canonicalLower = canonical.toLowerCase();
			for (const [key, value] of Object.entries(mapping)) {
				if (key.toLowerCase() === canonicalLower) return value;
			}
		}
	}

	return null;
}
```

**Step 4: Update calculateRecipeNutrition call**

In `calculator.ts`, update line 108:

```typescript
const ingredientMapping = findMapping(ingredient.name, mapping);
```

to:

```typescript
const ingredientMapping = findMapping(ingredient.name, mapping, undefined);
```

**Step 5: Run test to verify it passes**

Run: `pnpm test calculator.test.ts`

Expected: PASS - all tests green

**Step 6: Commit**

```bash
git add packages/backend/src/nutrition/calculator.ts packages/backend/src/nutrition/__tests__/calculator.test.ts
git commit -m "feat(nutrition): add synonym support to findMapping

Extends findMapping with optional synonym lookup. Lookup order:
1. Exact match, 2. Case-insensitive, 3. Synonym→exact, 4. Synonym→case-insensitive

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Implement Fuzzy Matching in bls.ts

**Files:**
- Modify: `packages/backend/src/nutrition/bls.ts`
- Test: `packages/backend/src/nutrition/__tests__/bls.test.ts`

**Step 1: Create test file with fuzzy matching tests**

Create `packages/backend/src/nutrition/__tests__/bls.test.ts`:

```typescript
import { DatabaseSync } from "node:sqlite";
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { suggestBlsFoods } from "../bls.js";
import { buildSynonymMap } from "../../schemas/shopping-list.js";

let db: DatabaseSync;

beforeAll(() => {
	db = new DatabaseSync(":memory:");
	db.exec(`
		CREATE TABLE foods (
			code TEXT PRIMARY KEY,
			name_de TEXT NOT NULL,
			name_en TEXT
		);
		INSERT INTO foods VALUES
			('G480100', 'Paprikaschote, rot, roh', 'Red bell pepper, raw'),
			('G480200', 'Paprikaschote, gelb, roh', 'Yellow bell pepper, raw'),
			('G480300', 'Paprikaschote, grün, roh', 'Green bell pepper, raw'),
			('M010100', 'Sahne, 30% Fett', 'Cream, 30% fat'),
			('U010100', 'Rinderhackfleisch', 'Ground beef');
	`);
});

afterAll(() => {
	db.close();
});

describe("suggestBlsFoods", () => {
	test("finds similar foods by name", () => {
		const results = suggestBlsFoods(db, "Paprika", undefined, 3);

		expect(results).toHaveLength(3);
		expect(results[0].name_de).toContain("Paprikaschote");
	});

	test("ranks closer matches higher", () => {
		const results = suggestBlsFoods(db, "Paprikaschote", undefined, 3);

		expect(results[0].name_de).toBe("Paprikaschote, rot, roh");
	});

	test("respects limit parameter", () => {
		const results = suggestBlsFoods(db, "Paprika", undefined, 2);

		expect(results).toHaveLength(2);
	});

	test("uses synonym for matching", () => {
		const synonymMap = buildSynonymMap([["Sahne", "Schlagsahne"]]);
		const results = suggestBlsFoods(db, "Schlagsahne", synonymMap, 3);

		expect(results[0].name_de).toContain("Sahne");
	});

	test("returns empty array when no matches found", () => {
		const results = suggestBlsFoods(db, "xyz123abc", undefined, 3);

		expect(results).toEqual([]);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test bls.test.ts`

Expected: FAIL - "suggestBlsFoods is not a function"

**Step 3: Implement suggestBlsFoods**

Add to `bls.ts`:

```typescript
import { distance } from "fastest-levenshtein";
import type { SynonymMap } from "../schemas/shopping-list.js";

export function suggestBlsFoods(
	db: DatabaseSync,
	ingredientName: string,
	synonymMap?: SynonymMap,
	limit = 5,
): BlsFood[] {
	const lowerName = ingredientName.toLowerCase();
	const canonical = synonymMap?.get(lowerName) ?? ingredientName;

	// Fetch all foods
	const stmt = db.prepare("SELECT code, name_de, name_en FROM foods");
	const allFoods = stmt.all() as BlsFood[];

	// Calculate distances
	const scored = allFoods.map((food) => {
		const foodLower = food.name_de.toLowerCase();

		// Distance to original name
		const distOriginal = distance(lowerName, foodLower);

		// Distance to canonical name if synonym exists
		const distCanonical = canonical !== ingredientName
			? distance(canonical.toLowerCase(), foodLower)
			: Infinity;

		// Use better distance
		const bestDist = Math.min(distOriginal, distCanonical);

		return { food, distance: bestDist };
	});

	// Filter: keep only foods with at least 50% common characters
	const maxDistance = Math.max(lowerName.length, canonical.length);
	const filtered = scored.filter((s) => s.distance <= maxDistance * 0.5);

	// Sort by distance and take top N
	return filtered
		.sort((a, b) => a.distance - b.distance)
		.slice(0, limit)
		.map((s) => s.food);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test bls.test.ts`

Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add packages/backend/src/nutrition/bls.ts packages/backend/src/nutrition/__tests__/bls.test.ts
git commit -m "feat(nutrition): add fuzzy matching for BLS foods

Implements suggestBlsFoods using Levenshtein distance. Supports synonym lookup
and filters results to 50% max distance.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add API Types and Schemas

**Files:**
- Create: `packages/backend/src/schemas/nutrition.ts`

**Step 1: Create nutrition schemas file**

Create `packages/backend/src/schemas/nutrition.ts`:

```typescript
import { z } from "zod";

export const suggestionSchema = z.object({
	ingredient: z.string(),
	suggestions: z.array(
		z.object({
			code: z.string(),
			name_de: z.string(),
			name_en: z.string().nullable(),
		}),
	),
	units: z.array(z.string()),
});

export const suggestionsResponseSchema = z.array(suggestionSchema);

export const createMappingSchema = z.object({
	ingredientName: z.string().min(1),
	blsCode: z.string().min(1),
	gramsPer: z.record(z.string(), z.number().positive()).optional(),
});

export type SuggestionResponse = z.infer<typeof suggestionSchema>;
export type CreateMappingRequest = z.infer<typeof createMappingSchema>;
```

**Step 2: Verify file compiles**

Run: `pnpm -F @wwe/backend build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/backend/src/schemas/nutrition.ts
git commit -m "feat(nutrition): add API schemas for suggestions and mapping

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Implement GET /api/naehrwerte/:slug/suggestions Endpoint

**Files:**
- Modify: `packages/backend/src/routes/nutrition.ts`
- Test: `packages/backend/src/routes/__tests__/nutrition.test.ts`

**Step 1: Write failing test**

Add to `nutrition.test.ts`:

```typescript
import { describe, test, expect } from "vitest";

describe("GET /api/naehrwerte/:slug/suggestions", () => {
	test("returns suggestions for unmapped ingredients", async () => {
		const response = await request(app)
			.get("/api/naehrwerte/test-rezept/suggestions")
			.expect(200);

		expect(response.body).toBeInstanceOf(Array);
		if (response.body.length > 0) {
			expect(response.body[0]).toHaveProperty("ingredient");
			expect(response.body[0]).toHaveProperty("suggestions");
			expect(response.body[0]).toHaveProperty("units");
		}
	});

	test("returns 404 for non-existent recipe", async () => {
		await request(app)
			.get("/api/naehrwerte/nonexistent/suggestions")
			.expect(404);
	});

	test("returns 503 when BLS database not available", async () => {
		// This test depends on BLS DB presence - may skip if DB exists
		// Implementation will handle this case
	});
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test nutrition.test.ts`

Expected: FAIL - 404 Not Found

**Step 3: Implement suggestions endpoint**

Add to `nutrition.ts`:

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSynonymMap, type SynonymMap } from "../schemas/shopping-list.js";
import type { SuggestionResponse } from "../schemas/nutrition.js";
import { suggestBlsFoods } from "../nutrition/bls.js";
import { findMapping } from "../nutrition/calculator.js";

// Load synonyms at module level
let synonymMap: SynonymMap | undefined;

async function loadSynonyms(dataDir: string): Promise<SynonymMap | undefined> {
	if (synonymMap) return synonymMap;

	try {
		const synonymsPath = join(dataDir, "synonyme.json");
		const content = await readFile(synonymsPath, "utf-8");
		const groups = JSON.parse(content) as string[][];
		synonymMap = buildSynonymMap(groups);
		return synonymMap;
	} catch {
		return undefined;
	}
}

router.get("/:slug/suggestions", async (req, res) => {
	const { slug } = req.params;
	const dataDir = process.env.DATA_DIR || "./rezepte";

	try {
		// Load recipe
		const recipe = await loadRecipe(dataDir, slug);
		if (!recipe) {
			return res.status(404).json({ error: "Recipe not found" });
		}

		// Load BLS database
		const dbPath = join(dataDir, "bls.sqlite");
		let db: DatabaseSync;
		try {
			db = openDatabase(dbPath);
		} catch {
			return res.status(503).json({
				error: "BLS database not available"
			});
		}

		// Load mapping and synonyms
		const mappingPath = join(dataDir, "naehrwerte-mapping.json");
		const mapping = await loadMapping(mappingPath);
		const syns = await loadSynonyms(dataDir);

		// Find unmapped ingredients
		const unmapped = recipe.ingredients.filter(
			(ing) => !findMapping(ing.name, mapping, syns),
		);

		// Build suggestions
		const suggestions: SuggestionResponse[] = unmapped.map((ing) => ({
			ingredient: ing.name,
			suggestions: suggestBlsFoods(db, ing.name, syns, 5),
			units: [ing.unit],
		}));

		res.json(suggestions);
	} catch (error) {
		console.error("Error generating suggestions:", error);
		res.status(500).json({ error: "Failed to generate suggestions" });
	}
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm test nutrition.test.ts`

Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add packages/backend/src/routes/nutrition.ts packages/backend/src/routes/__tests__/nutrition.test.ts
git commit -m "feat(nutrition): add suggestions endpoint

GET /api/naehrwerte/:slug/suggestions returns BLS suggestions for unmapped
ingredients using fuzzy matching and synonym lookup.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Implement POST /api/naehrwerte/mapping Endpoint

**Files:**
- Modify: `packages/backend/src/routes/nutrition.ts`
- Test: `packages/backend/src/routes/__tests__/nutrition.test.ts`

**Step 1: Write failing test**

Add to `nutrition.test.ts`:

```typescript
import { writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";

describe("POST /api/naehrwerte/mapping", () => {
	const testMappingPath = join(
		process.env.DATA_DIR || "./rezepte",
		"naehrwerte-mapping-test.json",
	);

	afterEach(async () => {
		try {
			await unlink(testMappingPath);
		} catch {
			// Ignore
		}
	});

	test("creates new mapping", async () => {
		await writeFile(testMappingPath, JSON.stringify({}));

		const response = await request(app)
			.post("/api/naehrwerte/mapping")
			.send({
				ingredientName: "Paprika",
				blsCode: "G480100",
			})
			.expect(200);

		expect(response.body).toHaveProperty("success", true);

		const content = await readFile(testMappingPath, "utf-8");
		const mapping = JSON.parse(content);
		expect(mapping.Paprika).toEqual({ code: "G480100" });
	});

	test("adds mapping with gramsPer", async () => {
		await writeFile(testMappingPath, JSON.stringify({}));

		await request(app)
			.post("/api/naehrwerte/mapping")
			.send({
				ingredientName: "Zwiebel",
				blsCode: "G480200",
				gramsPer: { Stueck: 150 },
			})
			.expect(200);

		const content = await readFile(testMappingPath, "utf-8");
		const mapping = JSON.parse(content);
		expect(mapping.Zwiebel).toEqual({
			code: "G480200",
			gramsPer: { Stueck: 150 },
		});
	});

	test("sorts mappings alphabetically", async () => {
		await writeFile(
			testMappingPath,
			JSON.stringify({ Zwiebel: { code: "G1" } }),
		);

		await request(app)
			.post("/api/naehrwerte/mapping")
			.send({
				ingredientName: "Apfel",
				blsCode: "O100",
			})
			.expect(200);

		const content = await readFile(testMappingPath, "utf-8");
		const keys = Object.keys(JSON.parse(content));
		expect(keys).toEqual(["Apfel", "Zwiebel"]);
	});

	test("validates request body", async () => {
		await request(app)
			.post("/api/naehrwerte/mapping")
			.send({ ingredientName: "" })
			.expect(400);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test nutrition.test.ts`

Expected: FAIL - 404 Not Found

**Step 3: Implement mapping endpoint**

Add to `nutrition.ts`:

```typescript
import { writeFile, rename } from "node:fs/promises";
import { createMappingSchema } from "../schemas/nutrition.js";
import type { MappingConfig } from "../nutrition/calculator.js";

router.post("/mapping", async (req, res) => {
	const dataDir = process.env.DATA_DIR || "./rezepte";

	try {
		// Validate request
		const parsed = createMappingSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: "Invalid request body" });
		}

		const { ingredientName, blsCode, gramsPer } = parsed.data;

		// Load current mapping
		const mappingPath = join(dataDir, "naehrwerte-mapping.json");
		const mapping = await loadMapping(mappingPath);

		// Add new mapping
		mapping[ingredientName] = gramsPer
			? { code: blsCode, gramsPer }
			: { code: blsCode };

		// Sort alphabetically
		const sorted = Object.keys(mapping)
			.sort()
			.reduce((acc, key) => {
				acc[key] = mapping[key];
				return acc;
			}, {} as MappingConfig);

		// Atomic write: temp file + rename
		const tempPath = `${mappingPath}.tmp`;
		await writeFile(tempPath, JSON.stringify(sorted, null, 2), "utf-8");
		await rename(tempPath, mappingPath);

		res.json({ success: true });
	} catch (error) {
		console.error("Error saving mapping:", error);
		res.status(500).json({ error: "Failed to save mapping" });
	}
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm test nutrition.test.ts`

Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add packages/backend/src/routes/nutrition.ts packages/backend/src/routes/__tests__/nutrition.test.ts
git commit -m "feat(nutrition): add mapping creation endpoint

POST /api/naehrwerte/mapping saves new mappings with atomic write and
alphabetical sorting.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Frontend API Types

**Files:**
- Modify: `packages/frontend/src/api.ts`

**Step 1: Add new types**

Add to `api.ts`:

```typescript
export interface BlsFood {
	code: string;
	name_de: string;
	name_en: string | null;
}

export interface IngredientSuggestion {
	ingredient: string;
	suggestions: BlsFood[];
	units: string[];
}

export interface CreateMappingRequest {
	ingredientName: string;
	blsCode: string;
	gramsPer?: Record<string, number>;
}
```

**Step 2: Add API functions**

Add to `api.ts`:

```typescript
export async function getNutritionSuggestions(
	slug: string,
): Promise<IngredientSuggestion[]> {
	const response = await fetch(`/api/naehrwerte/${slug}/suggestions`);
	if (!response.ok) throw new Error("Failed to fetch suggestions");
	return response.json();
}

export async function createMapping(
	request: CreateMappingRequest,
): Promise<void> {
	const response = await fetch("/api/naehrwerte/mapping", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(request),
	});
	if (!response.ok) throw new Error("Failed to save mapping");
}
```

**Step 3: Verify compilation**

Run: `pnpm -F @wwe/frontend build`

Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/frontend/src/api.ts
git commit -m "feat(frontend): add nutrition mapping API functions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Implement UnmappedIngredients Component

**Files:**
- Modify: `packages/frontend/src/components/NutritionTable.tsx`

**Step 1: Add UnmappedIngredients component**

Add to `NutritionTable.tsx`:

```typescript
import { useState, useEffect } from "react";
import type { IngredientSuggestion, CreateMappingRequest } from "../api.js";
import { getNutritionSuggestions, createMapping } from "../api.js";

interface UnmappedIngredientsProps {
	slug: string;
	unmatchedIngredients: string[];
	onMappingCreated: () => void;
}

function UnmappedIngredients({
	slug,
	unmatchedIngredients,
	onMappingCreated,
}: UnmappedIngredientsProps) {
	const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
	const [selectedCodes, setSelectedCodes] = useState<Map<string, string>>(
		new Map(),
	);
	const [gramsPerInputs, setGramsPerInputs] = useState<
		Map<string, Record<string, number>>
	>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState<Set<string>>(new Set());

	const METRIC_UNITS = ["g", "kg", "ml", "l", "el", "tl", "prise", "tasse", "dose"];

	useEffect(() => {
		if (unmatchedIngredients.length === 0) {
			setLoading(false);
			return;
		}

		setLoading(true);
		getNutritionSuggestions(slug)
			.then((data) => {
				setSuggestions(data);
				setError(null);
			})
			.catch((err) => {
				setError(err.message);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [slug, unmatchedIngredients.length]);

	const hasNonMetricUnits = (units: string[]): boolean => {
		return units.some((u) => !METRIC_UNITS.includes(u.toLowerCase()));
	};

	const handleSave = async (ingredient: string) => {
		const code = selectedCodes.get(ingredient);
		if (!code) return;

		setSaving((prev) => new Set(prev).add(ingredient));

		try {
			const request: CreateMappingRequest = {
				ingredientName: ingredient,
				blsCode: code,
			};

			const gramsPer = gramsPerInputs.get(ingredient);
			if (gramsPer && Object.keys(gramsPer).length > 0) {
				request.gramsPer = gramsPer;
			}

			await createMapping(request);

			// Remove from UI
			setSuggestions((prev) =>
				prev.filter((s) => s.ingredient !== ingredient),
			);
			setSelectedCodes((prev) => {
				const next = new Map(prev);
				next.delete(ingredient);
				return next;
			});

			onMappingCreated();
		} catch (err) {
			alert(`Fehler beim Speichern: ${err instanceof Error ? err.message : "Unbekannt"}`);
		} finally {
			setSaving((prev) => {
				const next = new Set(prev);
				next.delete(ingredient);
				return next;
			});
		}
	};

	if (loading) return <p className="nutrition-loading">Lade Vorschläge...</p>;
	if (error) return <p className="nutrition-error">Fehler: {error}</p>;
	if (suggestions.length === 0) return null;

	return (
		<div className="nutrition-unmapped-mappings">
			<h3>Mappings hinzufügen</h3>
			{suggestions.map((suggestion) => (
				<div key={suggestion.ingredient} className="unmapped-ingredient">
					<h4>{suggestion.ingredient}</h4>

					{suggestion.suggestions.length === 0 ? (
						<p className="no-suggestions">
							Keine passenden BLS-Einträge gefunden
						</p>
					) : (
						<>
							<div className="bls-suggestions">
								{suggestion.suggestions.map((bls) => (
									<label key={bls.code} className="bls-suggestion-item">
										<input
											type="radio"
											name={`mapping-${suggestion.ingredient}`}
											value={bls.code}
											checked={selectedCodes.get(suggestion.ingredient) === bls.code}
											onChange={(e) => {
												setSelectedCodes((prev) =>
													new Map(prev).set(suggestion.ingredient, e.target.value),
												);
											}}
										/>
										<span>
											{bls.name_de} ({bls.code})
										</span>
									</label>
								))}
							</div>

							{hasNonMetricUnits(suggestion.units) && (
								<div className="grams-per-input">
									<label>
										Gramm pro {suggestion.units[0]}:
										<input
											type="number"
											min="1"
											step="1"
											placeholder="z.B. 150"
											onChange={(e) => {
												const value = Number(e.target.value);
												if (value > 0) {
													setGramsPerInputs((prev) =>
														new Map(prev).set(suggestion.ingredient, {
															[suggestion.units[0]]: value,
														}),
													);
												}
											}}
										/>
									</label>
								</div>
							)}

							<button
								type="button"
								onClick={() => handleSave(suggestion.ingredient)}
								disabled={
									!selectedCodes.has(suggestion.ingredient) ||
									saving.has(suggestion.ingredient)
								}
								className="save-mapping-btn"
							>
								{saving.has(suggestion.ingredient)
									? "Speichert..."
									: "Speichern"}
							</button>
						</>
					)}
				</div>
			))}
		</div>
	);
}
```

**Step 2: Integrate into NutritionTable**

Modify `NutritionTable` component:

```typescript
export function NutritionTable({ data, slug }: NutritionTableProps & { slug: string }) {
	const [refreshKey, setRefreshKey] = useState(0);
	const unmatchedIngredients = data.ingredients
		.filter((ing) => !ing.matched)
		.map((ing) => ing.name);

	return (
		<div className="nutrition" key={refreshKey}>
			{/* ... existing table code ... */}

			{unmatchedIngredients.length > 0 && (
				<UnmappedIngredients
					slug={slug}
					unmatchedIngredients={unmatchedIngredients}
					onMappingCreated={() => setRefreshKey((k) => k + 1)}
				/>
			)}
		</div>
	);
}
```

**Step 3: Update component usage in RecipeView**

Find where `NutritionTable` is used and add `slug` prop:

```typescript
<NutritionTable data={nutritionData} slug={slug} />
```

**Step 4: Test manually**

Run: `pnpm dev`

Navigate to a recipe with unmapped ingredients, verify UI appears

**Step 5: Commit**

```bash
git add packages/frontend/src/components/NutritionTable.tsx
git commit -m "feat(frontend): add unmapped ingredients UI

Shows BLS suggestions with radio buttons, optional gramsPer input,
and auto-refresh on save.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Add Styling for Unmapped Ingredients UI

**Files:**
- Modify: `packages/frontend/src/index.css` (or relevant stylesheet)

**Step 1: Add CSS for unmapped ingredients**

Add to stylesheet:

```css
.nutrition-unmapped-mappings {
	margin-top: 2rem;
	padding-top: 2rem;
	border-top: 1px solid #e5e7eb;
}

.nutrition-unmapped-mappings h3 {
	margin-bottom: 1rem;
	font-size: 1.125rem;
	font-weight: 600;
}

.unmapped-ingredient {
	margin-bottom: 2rem;
	padding: 1rem;
	background: #f9fafb;
	border-radius: 0.5rem;
}

.unmapped-ingredient h4 {
	margin-bottom: 0.75rem;
	font-size: 1rem;
	font-weight: 500;
}

.bls-suggestions {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	margin-bottom: 1rem;
}

.bls-suggestion-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem;
	cursor: pointer;
	border-radius: 0.25rem;
}

.bls-suggestion-item:hover {
	background: #f3f4f6;
}

.bls-suggestion-item input[type="radio"] {
	cursor: pointer;
}

.grams-per-input {
	margin-bottom: 1rem;
}

.grams-per-input label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.875rem;
}

.grams-per-input input {
	width: 8rem;
	padding: 0.375rem 0.5rem;
	border: 1px solid #d1d5db;
	border-radius: 0.25rem;
}

.save-mapping-btn {
	padding: 0.5rem 1rem;
	background: #3b82f6;
	color: white;
	border: none;
	border-radius: 0.25rem;
	cursor: pointer;
	font-weight: 500;
}

.save-mapping-btn:hover:not(:disabled) {
	background: #2563eb;
}

.save-mapping-btn:disabled {
	background: #9ca3af;
	cursor: not-allowed;
}

.nutrition-loading,
.nutrition-error {
	padding: 1rem;
	font-size: 0.875rem;
	color: #6b7280;
}

.nutrition-error {
	color: #dc2626;
}

.no-suggestions {
	font-size: 0.875rem;
	color: #6b7280;
	font-style: italic;
}
```

**Step 2: Test styling**

Run: `pnpm dev`

Verify UI looks good

**Step 3: Commit**

```bash
git add packages/frontend/src/index.css
git commit -m "style(frontend): add styles for unmapped ingredients UI

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Final Integration Testing

**Step 1: Run all tests**

Run: `pnpm test`

Expected: All tests pass

**Step 2: Manual E2E test**

1. Start dev server: `pnpm dev`
2. Create test recipe with unmapped ingredient (e.g., "Paprika")
3. Open recipe nutrition tab
4. Verify suggestions appear
5. Select BLS entry, save
6. Verify nutrition table updates
7. Check `rezepte/naehrwerte-mapping.json` contains new entry (alphabetically sorted)

**Step 3: Update issue status**

Move `_issues/017-naehrwerte-auto-discovery.md` to `_issues/done/`

**Step 4: Final commit**

```bash
git add _issues
git commit -m "docs: mark issue 017 as done

Auto-discovery for nutrition mappings implemented and tested.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Execution Notes

**Use @superpowers:test-driven-development for each task** - Red-Green-Refactor cycle

**Use @superpowers:systematic-debugging if tests fail** - Don't guess, debug systematically

**Commit frequently** - One logical change per commit

**DRY principle** - Reuse existing functions (`buildSynonymMap`, `loadMapping`, etc.)

**YAGNI** - Don't add features not in the design (e.g., manual search field can come later)

**Reference docs:**
- Design: `docs/plans/2026-02-09-naehrwerte-auto-discovery-design.md`
- Issue: `_issues/017-naehrwerte-auto-discovery.md`
- BLS schema: Check `bls.sqlite` structure if needed
- Existing tests: `packages/backend/src/**/__tests__/*.test.ts`
