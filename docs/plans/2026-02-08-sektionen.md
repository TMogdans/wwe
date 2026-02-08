# Sektionen (Sections) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support Cooklang sections (`= Name`) throughout the parser, serializer, API, and frontend views.

**Architecture:** The flat `steps[]` array on `CooklangRecipe` is replaced with a `sections[]` array. Each section has an optional `name` (unnamed = default section) and its own `steps[]`. The parser detects `= Name` lines and creates new sections. All downstream consumers (serializer, API, frontend types, StepList, IngredientList, EquipmentList, RecipeDetail, CookMode, TipTap bridge) are updated to work with sections.

**Tech Stack:** TypeScript, Vitest, React, TipTap

---

### Task 1: Update types — add CooklangSection, restructure CooklangRecipe

**Files:**
- Modify: `packages/backend/src/parser/types.ts`

**Step 1: Write the new types**

Replace the `CooklangRecipe` interface. Add `CooklangSection`:

```typescript
export interface CooklangSection {
	name: string;
	steps: CooklangStep[];
}

export interface CooklangRecipe {
	metadata: CooklangMetadata;
	sections: CooklangSection[];
}
```

A section with `name: ""` is the default/unnamed section (steps before the first `= Name` line).

**Step 2: Commit**

```bash
git add packages/backend/src/parser/types.ts
git commit -m "refactor: replace steps with sections in CooklangRecipe type"
```

---

### Task 2: Update parser — detect section headers

**Files:**
- Modify: `packages/backend/src/parser/__tests__/parser.test.ts`
- Modify: `packages/backend/src/parser/parser.ts`

**Step 1: Write failing tests**

Add new tests to `parser.test.ts`:

```typescript
it("parses a section header", () => {
	const input = `= Teig\n\n@Mehl{500%g} verrühren.`;
	const recipe = parseRecipe(input);
	expect(recipe.sections).toHaveLength(1);
	expect(recipe.sections[0].name).toBe("Teig");
	expect(recipe.sections[0].steps).toHaveLength(1);
});

it("parses multiple sections", () => {
	const input = `= Teig\n\n@Mehl{500%g} verrühren.\n\n= Füllung\n\n@Hackfleisch{300%g} anbraten.`;
	const recipe = parseRecipe(input);
	expect(recipe.sections).toHaveLength(2);
	expect(recipe.sections[0].name).toBe("Teig");
	expect(recipe.sections[0].steps).toHaveLength(1);
	expect(recipe.sections[1].name).toBe("Füllung");
	expect(recipe.sections[1].steps).toHaveLength(1);
});

it("puts steps before first section into unnamed section", () => {
	const input = `@Öl{2%EL} erhitzen.\n\n= Soße\n\n@Tomaten{400%g} kochen.`;
	const recipe = parseRecipe(input);
	expect(recipe.sections).toHaveLength(2);
	expect(recipe.sections[0].name).toBe("");
	expect(recipe.sections[0].steps).toHaveLength(1);
	expect(recipe.sections[1].name).toBe("Soße");
});

it("handles section syntax with trailing equals signs", () => {
	const input = `== Teig ==\n\n@Mehl{500%g} verrühren.`;
	const recipe = parseRecipe(input);
	expect(recipe.sections).toHaveLength(1);
	expect(recipe.sections[0].name).toBe("Teig");
});

it("handles section syntax with multiple leading equals signs", () => {
	const input = `=== Glasur\n\n@Zucker{100%g} schmelzen.`;
	const recipe = parseRecipe(input);
	expect(recipe.sections).toHaveLength(1);
	expect(recipe.sections[0].name).toBe("Glasur");
});

it("recipe without sections puts all steps in one unnamed section", () => {
	const input = `@Mehl{500%g} verrühren.\n\nWeiter rühren.`;
	const recipe = parseRecipe(input);
	expect(recipe.sections).toHaveLength(1);
	expect(recipe.sections[0].name).toBe("");
	expect(recipe.sections[0].steps).toHaveLength(2);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/backend && pnpm test`
Expected: FAIL — `recipe.sections` is undefined (old code returns `steps`)

**Step 3: Update existing tests to use sections**

All existing tests reference `recipe.steps`. Update them to use `recipe.sections[0].steps` since they all have no section headers and will be placed in one unnamed section. For each existing test, replace:
- `recipe.steps` → `recipe.sections[0].steps`
- `recipe.steps.length` → sum of all sections' steps, or target the specific section

Example changes:
- `expect(recipe.steps).toEqual([])` → `expect(recipe.sections).toEqual([])` (metadata-only recipe has no sections)
- `expect(recipe.steps).toHaveLength(2)` → `expect(recipe.sections[0].steps).toHaveLength(2)` (for recipes without section headers)

**Note:** The metadata-only test (`parses metadata lines`) currently expects `steps: []`. With the new model, a recipe with no steps and no sections should have `sections: []`.

**Step 4: Implement parser changes**

In `parser.ts`, update `parseRecipe` to:

1. Add a regex to detect section lines: `/^=+\s*(.*?)(?:\s*=+)?$/`
2. Track current section (starts as unnamed `{ name: "", steps: [] }`)
3. When a section line is detected, push current section to array (if it has steps), start new section
4. At end, push final section (if it has steps)

```typescript
export function parseRecipe(input: string): CooklangRecipe {
	const lines = input.split("\n");
	const metadata: CooklangMetadata = {};
	const sections: CooklangSection[] = [];

	let currentSection: CooklangSection = { name: "", steps: [] };
	let insideBlockComment = false;
	let blockCommentContent = "";

	const sectionRegex = /^=+\s*(.*?)(?:\s*=+)?$/;

	for (const line of lines) {
		const trimmed = line.trim();

		// Handle block comment accumulation (unchanged logic, but push to currentSection.steps)
		if (insideBlockComment) {
			// ... same logic but replace `steps.push(...)` with `currentSection.steps.push(...)`
			continue;
		}

		if (trimmed.startsWith(">>")) {
			// ... metadata logic unchanged
			continue;
		}

		if (trimmed === "") {
			continue;
		}

		// Section detection
		const sectionMatch = trimmed.match(sectionRegex);
		if (sectionMatch && trimmed.startsWith("=")) {
			// Push current section if it has steps
			if (currentSection.steps.length > 0) {
				sections.push(currentSection);
			}
			currentSection = { name: sectionMatch[1].trim(), steps: [] };
			continue;
		}

		const result = tokenizeLine(trimmed);
		if (result.openBlockComment !== undefined) {
			if (result.tokens.length > 0) {
				currentSection.steps.push({ tokens: result.tokens });
			}
			insideBlockComment = true;
			blockCommentContent = result.openBlockComment;
		} else {
			currentSection.steps.push({ tokens: result.tokens });
		}
	}

	// Push final section
	if (currentSection.steps.length > 0) {
		sections.push(currentSection);
	}

	return { metadata, sections };
}
```

**Step 5: Run tests to verify all pass**

Run: `cd packages/backend && pnpm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/backend/src/parser/parser.ts packages/backend/src/parser/__tests__/parser.test.ts
git commit -m "feat: parse section headers in cooklang recipes"
```

---

### Task 3: Update serializer — serialize sections

**Files:**
- Modify: `packages/backend/src/parser/__tests__/serializer.test.ts`
- Modify: `packages/backend/src/parser/serializer.ts`

**Step 1: Write failing tests**

Add new tests to `serializer.test.ts`:

```typescript
it("serializes a section header", () => {
	const recipe = {
		metadata: {},
		sections: [{ name: "Teig", steps: [{ tokens: [{ type: "text" as const, value: "Mehl verrühren." }] }] }],
	};
	const output = serializeRecipe(recipe);
	expect(output).toBe("= Teig\n\nMehl verrühren.");
});

it("serializes multiple sections", () => {
	const recipe = {
		metadata: {},
		sections: [
			{ name: "Teig", steps: [{ tokens: [{ type: "text" as const, value: "Mehl verrühren." }] }] },
			{ name: "Füllung", steps: [{ tokens: [{ type: "text" as const, value: "Fleisch anbraten." }] }] },
		],
	};
	const output = serializeRecipe(recipe);
	expect(output).toBe("= Teig\n\nMehl verrühren.\n\n= Füllung\n\nFleisch anbraten.");
});

it("serializes unnamed section without header", () => {
	const recipe = {
		metadata: {},
		sections: [{ name: "", steps: [{ tokens: [{ type: "text" as const, value: "Schritt eins." }] }] }],
	};
	const output = serializeRecipe(recipe);
	expect(output).toBe("Schritt eins.");
});

it("roundtrips a recipe with sections", () => {
	const input = `>> servings: 2\n\n= Teig\n\n@Mehl{500%g} verrühren.\n\n= Füllung\n\n@Hackfleisch{300%g} anbraten.`;
	const parsed = parseRecipe(input);
	const output = serializeRecipe(parsed);
	const reparsed = parseRecipe(output);
	expect(reparsed.sections).toHaveLength(2);
	expect(reparsed.sections[0].name).toBe("Teig");
	expect(reparsed.sections[1].name).toBe("Füllung");
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/backend && pnpm test`
Expected: FAIL — serializer still uses `recipe.steps`

**Step 3: Update existing serializer tests to use sections**

All existing tests construct recipes with `steps: [...]`. Update them to use `sections: [{ name: "", steps: [...] }]`.

**Step 4: Implement serializer changes**

In `serializer.ts`, update `serializeRecipe`:

```typescript
export function serializeRecipe(recipe: CooklangRecipe): string {
	const parts: string[] = [];

	// Serialize metadata
	const metadataKeys = Object.keys(recipe.metadata);
	for (const key of metadataKeys) {
		parts.push(`>> ${key}: ${recipe.metadata[key]}`);
	}

	// Blank line between metadata and sections
	if (metadataKeys.length > 0 && recipe.sections.length > 0) {
		parts.push("");
	}

	// Serialize sections
	for (let i = 0; i < recipe.sections.length; i++) {
		const section = recipe.sections[i];

		// Add blank line between sections (not before first)
		if (i > 0) {
			parts.push("");
		}

		// Section header (skip for unnamed sections)
		if (section.name) {
			parts.push(`= ${section.name}`);
			if (section.steps.length > 0) {
				parts.push("");
			}
		}

		// Steps within section
		for (const step of section.steps) {
			const stepText = step.tokens.map(serializeToken).join("");
			parts.push(stepText);
		}
	}

	return parts.join("\n");
}
```

**Step 5: Run tests to verify all pass**

Run: `cd packages/backend && pnpm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/backend/src/parser/serializer.ts packages/backend/src/parser/__tests__/serializer.test.ts
git commit -m "feat: serialize section headers in cooklang recipes"
```

---

### Task 4: Update frontend API type — RecipeDetail with sections

**Files:**
- Modify: `packages/frontend/src/api.ts`

**Step 1: Update RecipeDetail type**

Replace the `steps` field with `sections`:

```typescript
export interface RecipeDetail {
	slug: string;
	name: string;
	metadata: Record<string, string>;
	sections: Array<{
		name: string;
		steps: Array<{
			tokens: Array<
				| { type: "text"; value: string }
				| { type: "ingredient"; name: string; amount: string; unit: string }
				| { type: "timer"; name: string; duration: string; unit: string }
				| { type: "equipment"; name: string }
				| { type: "inlineComment"; value: string }
				| { type: "blockComment"; value: string }
			>;
		}>;
	}>;
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/api.ts
git commit -m "refactor: update RecipeDetail type to use sections"
```

---

### Task 5: Update IngredientList — iterate sections

**Files:**
- Modify: `packages/frontend/src/components/IngredientList.tsx`

**Step 1: Update props and iteration**

Change props from `steps` to `sections`. Iterate sections to collect ingredients, grouping by section name:

```typescript
import type { RecipeDetail } from "../api.js";

interface IngredientListProps {
	sections: RecipeDetail["sections"];
	scale: number;
}

export function IngredientList({ sections, scale }: IngredientListProps) {
	const hasMultipleSections = sections.filter(s => s.name).length > 1;

	return (
		<ul className="ingredient-list">
			{sections.map((section) => {
				const ingredients = section.steps.flatMap(step =>
					step.tokens.filter(t => t.type === "ingredient")
				) as Array<{ name: string; amount: string; unit: string }>;

				if (ingredients.length === 0) return null;

				return (
					<li key={section.name || "__default"}>
						{hasMultipleSections && section.name && (
							<strong className="ingredient-section-header">{section.name}</strong>
						)}
						<ul>
							{ingredients.map((ing, i) => (
								<li key={`${ing.name}-${i}`} className="ingredient-item">
									{ing.amount && (
										<span className="ingredient-amount">{scaleAmount(ing.amount, scale)}</span>
									)}{" "}
									{ing.unit && <span className="ingredient-unit">{ing.unit}</span>}{" "}
									<span className="ingredient-name">{ing.name}</span>
								</li>
							))}
						</ul>
					</li>
				);
			})}
		</ul>
	);
}
```

Keep the `scaleAmount` helper function as-is.

**Step 2: Commit**

```bash
git add packages/frontend/src/components/IngredientList.tsx
git commit -m "feat: update IngredientList to group by sections"
```

---

### Task 6: Update EquipmentList — iterate sections

**Files:**
- Modify: `packages/frontend/src/components/EquipmentList.tsx`

**Step 1: Update props and iteration**

Change props from `steps` to `sections`:

```typescript
interface EquipmentListProps {
	sections: RecipeDetail["sections"];
}

export function EquipmentList({ sections }: EquipmentListProps) {
	const seen = new Set<string>();
	const equipment: string[] = [];

	for (const section of sections) {
		for (const step of section.steps) {
			for (const token of step.tokens) {
				if (token.type === "equipment" && !seen.has(token.name)) {
					seen.add(token.name);
					equipment.push(token.name);
				}
			}
		}
	}

	// ... rest unchanged
}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/components/EquipmentList.tsx
git commit -m "feat: update EquipmentList to iterate sections"
```

---

### Task 7: Update StepList — render section headers

**Files:**
- Modify: `packages/frontend/src/components/StepList.tsx`

**Step 1: Update props and rendering**

Change props from `steps` to `sections`. Render section names as headings:

```typescript
interface StepListProps {
	sections: RecipeDetail["sections"];
	scale: number;
}

export function StepList({ sections, scale }: StepListProps) {
	const hasNamedSections = sections.some(s => s.name);

	return (
		<div className="step-list">
			{sections.map((section) => (
				<div key={section.name || "__default"} className="step-section">
					{hasNamedSections && section.name && (
						<h3 className="step-section-header">{section.name}</h3>
					)}
					{section.steps.map((step, stepIndex) => (
						<p key={stepKey(step, stepIndex)} className="step-paragraph">
							{step.tokens.map((token, tokenIndex) => {
								// ... existing token rendering logic unchanged
							})}
						</p>
					))}
				</div>
			))}
		</div>
	);
}
```

Keep `scaleAmount`, `tokenKey`, `stepKey` helpers as-is.

**Step 2: Commit**

```bash
git add packages/frontend/src/components/StepList.tsx
git commit -m "feat: update StepList to render section headers"
```

---

### Task 8: Update RecipeDetail view — pass sections to components

**Files:**
- Modify: `packages/frontend/src/views/RecipeDetail.tsx`

**Step 1: Update component calls**

Replace `recipe.steps` with `recipe.sections`:

- `<IngredientList steps={recipe.steps} scale={scale} />` → `<IngredientList sections={recipe.sections} scale={scale} />`
- `<EquipmentList steps={recipe.steps} />` → `<EquipmentList sections={recipe.sections} />`
- `<StepList steps={recipe.steps} scale={scale} />` → `<StepList sections={recipe.sections} scale={scale} />`

**Step 2: Commit**

```bash
git add packages/frontend/src/views/RecipeDetail.tsx
git commit -m "feat: pass sections to recipe detail sub-components"
```

---

### Task 9: Update CookMode — navigate sections and steps

**Files:**
- Modify: `packages/frontend/src/views/CookMode.tsx`

**Step 1: Update to flatten sections into steps for navigation, showing section headers**

CookMode navigates step-by-step linearly. Flatten sections into a list of items where each item is either a step or a section header indicator:

```typescript
type CookStep = {
	sectionName: string;
	tokens: RecipeDetail["sections"][number]["steps"][number]["tokens"];
	isFirstInSection: boolean;
};

function flattenSections(sections: RecipeDetail["sections"]): CookStep[] {
	const result: CookStep[] = [];
	for (const section of sections) {
		for (let i = 0; i < section.steps.length; i++) {
			result.push({
				sectionName: section.name,
				tokens: section.steps[i].tokens,
				isFirstInSection: i === 0 && section.name !== "",
			});
		}
	}
	return result;
}
```

Then replace the existing `recipe.steps` usage with the flattened array. Show the section name in the header when `isFirstInSection` is true.

Update the header to show section context:
```
Schritt {n} von {total} — {sectionName ? `${sectionName} — ` : ""}{recipe.name}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/views/CookMode.tsx
git commit -m "feat: update CookMode to handle sections"
```

---

### Task 10: Update TipTap cooklang-bridge — handle sections

**Files:**
- Modify: `packages/frontend/src/tiptap/cooklang-bridge.ts`

**Step 1: Update stepsToTiptapDoc to accept sections**

Rename and update `stepsToTiptapDoc` → `sectionsToTiptapDoc`:

```typescript
export function sectionsToTiptapDoc(sections: RecipeDetail["sections"]): JSONContent {
	const content: JSONContent[] = [];

	for (const section of sections) {
		if (section.name) {
			content.push({
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: section.name }],
			});
		}
		for (const step of section.steps) {
			content.push({
				type: "paragraph",
				content: step.tokens.map(tokenToTiptapNode),
			});
		}
	}

	return { type: "doc", content };
}
```

**Step 2: Update tiptapDocToCooklang to emit section headers**

When converting back, treat `heading` nodes as section markers:

```typescript
export function tiptapDocToCooklang(doc: JSONContent): string {
	if (!doc.content) return "";

	return doc.content
		.map((node) => {
			if (node.type === "heading") {
				const text = node.content?.map(c => c.text ?? "").join("") ?? "";
				return `= ${text}`;
			}
			if (node.type === "paragraph") {
				if (!node.content) return "";
				return node.content.map(/* ... existing token serialization ... */).join("");
			}
			return "";
		})
		.join("\n\n");
}
```

**Step 3: Update cooklangToTiptapDoc to handle section lines**

In `cooklangToTiptapDoc`, detect section lines and create heading nodes:

```typescript
export function cooklangToTiptapDoc(content: string): JSONContent {
	const blocks = content.split(/\n\n+/).filter(Boolean);
	const sectionRegex = /^=+\s*(.*?)(?:\s*=+)?$/;

	return {
		type: "doc",
		content: blocks.map((block) => {
			const trimmed = block.trim();
			const sectionMatch = trimmed.match(sectionRegex);
			if (sectionMatch) {
				return {
					type: "heading",
					attrs: { level: 2 },
					content: [{ type: "text", text: sectionMatch[1].trim() }],
				};
			}
			return {
				type: "paragraph",
				content: parseCooklangTokens(trimmed.replace(/\n/g, " ")),
			};
		}),
	};
}
```

**Step 4: Update buildCooklangFile — no changes needed** (it calls `tiptapDocToCooklang` which now handles headings)

**Step 5: Update RecipeEditor.tsx if it calls stepsToTiptapDoc**

Find and update the call from `stepsToTiptapDoc(recipe.steps)` to `sectionsToTiptapDoc(recipe.sections)`.

**Step 6: Commit**

```bash
git add packages/frontend/src/tiptap/cooklang-bridge.ts
git commit -m "feat: update tiptap bridge to handle sections as headings"
```

---

### Task 11: Update RecipeEditor — use sectionsToTiptapDoc

**Files:**
- Modify: `packages/frontend/src/views/RecipeEditor.tsx`

**Step 1: Update imports and calls**

Replace `stepsToTiptapDoc` with `sectionsToTiptapDoc` and `recipe.steps` with `recipe.sections`.

**Step 2: Commit**

```bash
git add packages/frontend/src/views/RecipeEditor.tsx
git commit -m "feat: update RecipeEditor to use sectionsToTiptapDoc"
```

---

### Task 12: Run full test suite and manual verification

**Step 1: Run backend tests**

Run: `cd packages/backend && pnpm test`
Expected: ALL PASS

**Step 2: Run linter**

Run: `pnpm lint`
Expected: No errors

**Step 3: Build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve build/lint issues from section implementation"
```
