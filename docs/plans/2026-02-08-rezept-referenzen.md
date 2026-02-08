# Rezept-Referenzen als Zutaten Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rezept-Referenzen (z.B. `@./sauces/Hollandaise{150%g}`) als eigenen Token-Typ unterstützen — vom Parser über Serializer bis zur Frontend-Anzeige und Einkaufsliste.

**Architecture:** Rezept-Referenzen nutzen die Cooklang-Syntax `@./path/to/Recipe{amount%unit}`. Sie werden im Tokenizer als eigener Token-Typ `recipeRef` erkannt, wenn der Name nach `@` mit `./` beginnt. Im Frontend werden sie als klickbare Links dargestellt. In der Einkaufsliste werden referenzierte Rezepte rekursiv aufgelöst.

**Tech Stack:** TypeScript, Vitest, Express, React, TipTap

---

### Task 1: Typ-Definition für RecipeRef-Token

**Files:**
- Modify: `packages/backend/src/parser/types.ts:41-47`

**Step 1: Write the failing test**

Kein separater Test nötig — die Typ-Definition wird durch die Tokenizer-Tests in Task 2 validiert.

**Step 2: Implementiere den neuen Typ**

In `packages/backend/src/parser/types.ts` füge das neue Interface hinzu und erweitere die Union:

```typescript
export interface CooklangRecipeRef {
	type: "recipeRef";
	ref: string;
	amount: string;
	unit: string;
}
```

Und in der `CooklangToken` Union:

```typescript
export type CooklangToken =
	| CooklangIngredient
	| CooklangTimer
	| CooklangEquipment
	| CooklangText
	| CooklangInlineComment
	| CooklangBlockComment
	| CooklangRecipeRef;
```

**Step 3: Commit**

```bash
git add packages/backend/src/parser/types.ts
git commit -m "feat: add CooklangRecipeRef type for recipe references"
```

---

### Task 2: Tokenizer — Rezept-Referenzen erkennen

**Files:**
- Modify: `packages/backend/src/parser/tokenizer.ts:1-9,160-204`
- Test: `packages/backend/src/parser/__tests__/tokenizer.test.ts`

**Step 1: Write the failing tests**

Füge folgende Tests am Ende von `describe("tokenizeLine", ...)` in `tokenizer.test.ts` hinzu:

```typescript
// --- Recipe references ---

it("parses recipe reference with amount and unit", () => {
	const { tokens } = tokenizeLine("Dazu @./sauces/Hollandaise{150%g} servieren.");
	expect(tokens).toEqual([
		{ type: "text", value: "Dazu " },
		{
			type: "recipeRef",
			ref: "./sauces/Hollandaise",
			amount: "150",
			unit: "g",
		},
		{ type: "text", value: " servieren." },
	]);
});

it("parses recipe reference without amount", () => {
	const { tokens } = tokenizeLine("Den @./Pizzateig dazu.");
	expect(tokens).toEqual([
		{ type: "text", value: "Den " },
		{
			type: "recipeRef",
			ref: "./Pizzateig",
			amount: "",
			unit: "",
		},
		{ type: "text", value: " dazu." },
	]);
});

it("parses recipe reference with braces and unit", () => {
	const { tokens } = tokenizeLine("@./Pizzateig{1%Portion} ausrollen.");
	expect(tokens).toEqual([
		{
			type: "recipeRef",
			ref: "./Pizzateig",
			amount: "1",
			unit: "Portion",
		},
		{ type: "text", value: " ausrollen." },
	]);
});

it("parses recipe reference in nested path", () => {
	const { tokens } = tokenizeLine("@./basics/Gemüsebrühe{500%ml} aufkochen.");
	expect(tokens).toEqual([
		{
			type: "recipeRef",
			ref: "./basics/Gemüsebrühe",
			amount: "500",
			unit: "ml",
		},
		{ type: "text", value: " aufkochen." },
	]);
});

it("parses recipe reference alongside normal ingredient", () => {
	const { tokens } = tokenizeLine("@./Pizzateig{1%Portion} mit @Mozzarella{200%g} belegen.");
	expect(tokens).toEqual([
		{
			type: "recipeRef",
			ref: "./Pizzateig",
			amount: "1",
			unit: "Portion",
		},
		{ type: "text", value: " mit " },
		{
			type: "ingredient",
			name: "Mozzarella",
			amount: "200",
			unit: "g",
			preparation: "",
		},
		{ type: "text", value: " belegen." },
	]);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/tokenizer.test.ts`
Expected: FAIL — recipeRef tokens are not recognized yet.

**Step 3: Implement the tokenizer changes**

In `packages/backend/src/parser/tokenizer.ts`:

1. Add the import for `CooklangRecipeRef`:

```typescript
import type {
	CooklangBlockComment,
	CooklangEquipment,
	CooklangIngredient,
	CooklangInlineComment,
	CooklangRecipeRef,
	CooklangText,
	CooklangTimer,
	CooklangToken,
} from "./types.js";
```

2. In the `@` handling block (around line 160-204), after `i++; // skip '@'`, add a check for `./` **before** the existing `findBraceBeforeNextTrigger` call:

```typescript
if (ch === "@") {
	flushText();
	i++; // skip '@'

	// Check for recipe reference: @./path...
	if (i + 1 < line.length && line[i] === "." && line[i + 1] === "/") {
		// Read the ref path until { or space/comma/period
		const braceIndex = findBraceBeforeNextTrigger(line, i);
		if (braceIndex !== -1) {
			const ref = line.substring(i, braceIndex);
			const closingBrace = line.indexOf("}", braceIndex + 1);
			if (closingBrace === -1) {
				textAccumulator += `@${line.substring(i)}`;
				i = line.length;
				continue;
			}
			const content = line.substring(braceIndex + 1, closingBrace);
			const { amount, unit } = parseBraceContent(content);
			tokens.push({
				type: "recipeRef",
				ref,
				amount,
				unit,
			} as CooklangRecipeRef);
			i = closingBrace + 1;
		} else {
			// Single word ref (no braces): @./Pizzateig
			const { name, end } = readSingleWordName(line, i);
			tokens.push({
				type: "recipeRef",
				ref: name,
				amount: "",
				unit: "",
			} as CooklangRecipeRef);
			i = end;
		}
		continue;
	}

	// ... existing ingredient parsing code stays unchanged
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/tokenizer.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/backend/src/parser/tokenizer.ts packages/backend/src/parser/__tests__/tokenizer.test.ts
git commit -m "feat: tokenize recipe references (@./path{amount%unit})"
```

---

### Task 3: Serializer — Rezept-Referenzen serialisieren

**Files:**
- Modify: `packages/backend/src/parser/serializer.ts:6-43`
- Test: `packages/backend/src/parser/__tests__/serializer.test.ts`

**Step 1: Write the failing tests**

Füge in `serializer.test.ts` hinzu:

```typescript
it("serializes recipe reference with amount and unit", () => {
	const recipe = {
		metadata: {},
		sections: [
			{
				name: "",
				steps: [
					{
						tokens: [
							{
								type: "recipeRef" as const,
								ref: "./sauces/Hollandaise",
								amount: "150",
								unit: "g",
							},
							{ type: "text" as const, value: " servieren." },
						],
					},
				],
			},
		],
	};
	const output = serializeRecipe(recipe);
	expect(output).toBe("@./sauces/Hollandaise{150%g} servieren.");
});

it("serializes recipe reference without amount", () => {
	const recipe = {
		metadata: {},
		sections: [
			{
				name: "",
				steps: [
					{
						tokens: [
							{
								type: "recipeRef" as const,
								ref: "./Pizzateig",
								amount: "",
								unit: "",
							},
						],
					},
				],
			},
		],
	};
	const output = serializeRecipe(recipe);
	expect(output).toBe("@./Pizzateig");
});

it("roundtrips recipe reference", () => {
	const input = "@./sauces/Hollandaise{150%g} servieren.";
	const parsed = parseRecipe(input);
	const output = serializeRecipe(parsed);
	expect(output).toBe("@./sauces/Hollandaise{150%g} servieren.");
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/serializer.test.ts`
Expected: FAIL — serializeToken does not handle recipeRef.

**Step 3: Implement the serializer case**

In `packages/backend/src/parser/serializer.ts`, add a case in `serializeToken`:

```typescript
case "recipeRef": {
	if (token.amount === "" && token.unit === "") {
		return `@${token.ref}`;
	}
	return `@${token.ref}{${token.amount}%${token.unit}}`;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/serializer.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/backend/src/parser/serializer.ts packages/backend/src/parser/__tests__/serializer.test.ts
git commit -m "feat: serialize recipe references back to cooklang format"
```

---

### Task 4: Frontend API-Typ erweitern

**Files:**
- Modify: `packages/frontend/src/api.ts:14-28`

**Step 1: Erweitere den Token-Typ in der Frontend-API**

In `packages/frontend/src/api.ts`, füge den neuen Token-Typ in die `tokens` Union ein:

```typescript
| {
		type: "recipeRef";
		ref: string;
		amount: string;
		unit: string;
  }
```

**Step 2: Commit**

```bash
git add packages/frontend/src/api.ts
git commit -m "feat: add recipeRef token type to frontend API types"
```

---

### Task 5: Frontend — RecipeRef in StepList als klickbarer Link

**Files:**
- Modify: `packages/frontend/src/components/StepList.tsx:9-25,58-89`

**Step 1: Erweitere tokenKey für recipeRef**

In `tokenKey` Funktion, füge einen neuen case hinzu:

```typescript
case "recipeRef":
	return `ref-${index}-${token.ref}`;
```

**Step 2: Erweitere das Rendering im switch-Statement**

Im `step.tokens.map(...)` switch-Statement, füge hinzu:

```typescript
case "recipeRef": {
	const refSlug = token.ref.replace(/^\.\//, "");
	return (
		<a
			key={key}
			href={`#/rezept/${encodeURIComponent(refSlug)}`}
			className="token-recipe-ref"
		>
			{token.amount ? `${token.amount} ` : ""}
			{token.unit ? `${token.unit} ` : ""}
			{refSlug.split("/").pop()}
		</a>
	);
}
```

**Step 3: Commit**

```bash
git add packages/frontend/src/components/StepList.tsx
git commit -m "feat: render recipe references as clickable links in step list"
```

---

### Task 6: Frontend — RecipeRef in IngredientList

**Files:**
- Modify: `packages/frontend/src/components/IngredientList.tsx:15-35,44-63`

**Step 1: Erweitere die Ingredient-Extraktion für recipeRef**

In der Schleife, die ingredients sammelt, füge ein `else if` für `recipeRef` hinzu. Recipe-Referenzen sollen als spezielle Einträge mit Link in der Zutatenliste erscheinen.

Erweitere den lokalen Array-Typ:

```typescript
const ingredients: Array<{
	name: string;
	amount: string;
	unit: string;
	preparation: string;
	fixed?: boolean;
	recipeRef?: string;
}> = [];
```

Und in der Token-Schleife:

```typescript
if (token.type === "ingredient") {
	ingredients.push({
		name: token.name,
		amount: token.amount,
		unit: token.unit,
		preparation: token.preparation,
		fixed: token.fixed,
	});
} else if (token.type === "recipeRef") {
	ingredients.push({
		name: token.ref.split("/").pop() ?? token.ref,
		amount: token.amount,
		unit: token.unit,
		preparation: "",
		recipeRef: token.ref,
	});
}
```

Im Rendering (`ingredients.map(...)`) den Namen als Link darstellen wenn `recipeRef` gesetzt ist:

```typescript
{ing.recipeRef ? (
	<a
		href={`#/rezept/${encodeURIComponent(ing.recipeRef.replace(/^\.\//, ""))}`}
		className="ingredient-name ingredient-recipe-ref"
	>
		{ing.name}
	</a>
) : (
	<span className="ingredient-name">{ing.name}</span>
)}
```

**Step 2: Commit**

```bash
git add packages/frontend/src/components/IngredientList.tsx
git commit -m "feat: show recipe references as links in ingredient list"
```

---

### Task 7: TipTap — cooklang-bridge für recipeRef erweitern

**Files:**
- Modify: `packages/frontend/src/tiptap/cooklang-bridge.ts:74-82,114-139,166-176,214-225,258-296`

**Step 1: parseCooklangTokens — recipeRef erkennen**

In der `parseToken` Funktion (Zeile 92ff), erweitere den `@`-Block.
Wenn nach dem `@` der Name mit `./` beginnt, erzeuge ein `recipeRef` node statt `ingredient`:

Im `if (trigger === "@")` Block (Zeile 114), prüfe den Namen:

```typescript
if (trigger === "@") {
	if (name.startsWith("./")) {
		// Recipe reference
		let raw = braceContent;
		const parts = raw.split("%");
		const amount = parts[0] ?? "";
		const unit = parts[1] ?? "";
		return {
			node: {
				type: "recipeRef",
				attrs: { ref: name, amount, unit },
			},
			end,
		};
	}
	// ... existing ingredient parsing
}
```

Ebenso im "No braces: single-word token"-Block (Zeile 167ff):

```typescript
if (trigger === "@") {
	if (name.startsWith("./")) {
		return {
			node: {
				type: "recipeRef",
				attrs: { ref: name, amount: "", unit: "" },
			},
			end: i,
		};
	}
	return {
		node: {
			type: "ingredient",
			attrs: { name, amount: "", unit: "", preparation: "", fixed: false },
		},
		end: i,
	};
}
```

**Step 2: tiptapDocToCooklang — recipeRef serialisieren**

Im `tiptapDocToCooklang` Funktion, füge vor dem `return ""` am Ende der child-map hinzu:

```typescript
if (child.type === "recipeRef") {
	const { ref, amount, unit } = child.attrs ?? {};
	if (!amount && !unit) return `@${ref}`;
	return `@${ref}{${amount}%${unit}}`;
}
```

**Step 3: tokenToTiptapNode — recipeRef konvertieren**

In `tokenToTiptapNode` (Zeile 258ff), füge einen neuen case hinzu:

```typescript
case "recipeRef":
	return {
		type: "recipeRef",
		attrs: {
			ref: token.ref,
			amount: token.amount,
			unit: token.unit,
		},
	};
```

**Step 4: Commit**

```bash
git add packages/frontend/src/tiptap/cooklang-bridge.ts
git commit -m "feat: support recipe references in TipTap cooklang bridge"
```

---

### Task 8: TipTap — RecipeRef Extension und Component

**Files:**
- Create: `packages/frontend/src/tiptap/recipe-ref-extension.ts`
- Create: `packages/frontend/src/tiptap/recipe-ref-component.tsx`

**Step 1: Erstelle die Extension**

Datei `packages/frontend/src/tiptap/recipe-ref-extension.ts`:

```typescript
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { RecipeRefComponent } from "./recipe-ref-component.js";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		recipeRef: {
			insertRecipeRef: (attrs: {
				ref: string;
				amount: string;
				unit: string;
			}) => ReturnType;
		};
	}
}

export const RecipeRefExtension = Node.create({
	name: "recipeRef",
	group: "inline",
	inline: true,
	atom: true,

	addAttributes() {
		return {
			ref: { default: "" },
			amount: { default: "" },
			unit: { default: "" },
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="recipe-ref"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-type": "recipe-ref",
				class: "recipe-ref-chip",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(RecipeRefComponent);
	},

	addCommands() {
		return {
			insertRecipeRef:
				(attrs: { ref: string; amount: string; unit: string }) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs,
					});
				},
		};
	},
});
```

**Step 2: Erstelle die Component**

Datei `packages/frontend/src/tiptap/recipe-ref-component.tsx`:

```typescript
import * as Popover from "@radix-ui/react-popover";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export function RecipeRefComponent({ node, updateAttributes }: NodeViewProps) {
	const { ref, amount, unit } = node.attrs;
	const [open, setOpen] = useState(false);
	const [editRef, setEditRef] = useState(ref as string);
	const [editAmount, setEditAmount] = useState(amount as string);
	const [editUnit, setEditUnit] = useState(unit as string);

	const refName = (ref as string).replace(/^\.\//, "").split("/").pop() ?? ref;
	const displayText = [amount, unit, refName].filter(Boolean).join(" ");

	const handleSave = () => {
		updateAttributes({
			ref: editRef,
			amount: editAmount,
			unit: editUnit,
		});
		setOpen(false);
	};

	return (
		<NodeViewWrapper as="span" className="recipe-ref-chip">
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<span className="recipe-ref-chip__label">
						{displayText || "Rezept-Referenz"}
					</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content className="popover-content" sideOffset={5}>
						<div className="popover-form">
							<label>
								Rezept-Pfad
								<input
									value={editRef}
									onChange={(e) => setEditRef(e.target.value)}
									placeholder="z.B. ./sauces/Hollandaise"
								/>
							</label>
							<label>
								Menge
								<input
									value={editAmount}
									onChange={(e) => setEditAmount(e.target.value)}
									placeholder="z.B. 150"
								/>
							</label>
							<label>
								Einheit
								<input
									value={editUnit}
									onChange={(e) => setEditUnit(e.target.value)}
									placeholder="z.B. g"
								/>
							</label>
							<button type="button" onClick={handleSave}>
								Speichern
							</button>
						</div>
						<Popover.Arrow className="popover-arrow" />
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		</NodeViewWrapper>
	);
}
```

**Step 3: Registriere die Extension im Editor**

Suche die Datei, wo die TipTap-Extensions registriert werden (wahrscheinlich dort wo `IngredientExtension` importiert wird), und füge `RecipeRefExtension` hinzu.

**Step 4: Commit**

```bash
git add packages/frontend/src/tiptap/recipe-ref-extension.ts packages/frontend/src/tiptap/recipe-ref-component.tsx
git commit -m "feat: add TipTap extension and component for recipe references"
```

---

### Task 9: Slash-Command `/rezept` im Editor

**Files:**
- Modify: `packages/frontend/src/tiptap/slash-commands.ts`

**Step 1: Füge den Slash-Command hinzu**

In `slash-commands.ts`, füge eine neue InputRule hinzu:

```typescript
new InputRule({
	find: /\/rezept\s$/,
	handler: ({ state, range, chain }) => {
		chain()
			.deleteRange(range)
			.insertRecipeRef({ ref: "./", amount: "", unit: "" })
			.run();
	},
}),
```

**Step 2: Commit**

```bash
git add packages/frontend/src/tiptap/slash-commands.ts
git commit -m "feat: add /rezept slash command for recipe references"
```

---

### Task 10: Einkaufsliste — Rezept-Referenzen rekursiv auflösen

**Files:**
- Modify: `packages/backend/src/routes/shopping-list.ts:46-119`
- Test: `packages/backend/src/routes/__tests__/shopping-list.test.ts`

**Step 1: Write the failing tests**

Füge in `shopping-list.test.ts` hinzu:

```typescript
it("POST / resolves recipe references recursively", async () => {
	await writeFile(
		path.join(tempDir, "Hollandaise.cook"),
		">> servings: 2\n\n@Butter{100%g} schmelzen.\n@Eigelb{2%Stück} einrühren.",
	);
	await writeFile(
		path.join(tempDir, "Spargel.cook"),
		">> servings: 2\n\n@Spargel{500%g} kochen.\n@./Hollandaise{150%g} servieren.",
	);

	const res = await request(app)
		.post("/api/einkaufsliste")
		.send({ slugs: ["Spargel"] });
	expect(res.status).toBe(200);

	const spargel = res.body.find((i: { name: string }) => i.name === "Spargel");
	expect(spargel).toBeDefined();
	expect(spargel.entries[0].amount).toBe("500");

	const butter = res.body.find((i: { name: string }) => i.name === "Butter");
	expect(butter).toBeDefined();
	expect(butter.entries[0].amount).toBe("100");

	const eigelb = res.body.find((i: { name: string }) => i.name === "Eigelb");
	expect(eigelb).toBeDefined();
});

it("POST / prevents circular recipe references", async () => {
	await writeFile(
		path.join(tempDir, "A.cook"),
		">> servings: 2\n\n@Mehl{100%g} sieben.\n@./B{1%Portion} dazu.",
	);
	await writeFile(
		path.join(tempDir, "B.cook"),
		">> servings: 2\n\n@Zucker{50%g} dazu.\n@./A{1%Portion} dazu.",
	);

	const res = await request(app)
		.post("/api/einkaufsliste")
		.send({ slugs: ["A"] });
	expect(res.status).toBe(200);

	// Should not infinite-loop; Mehl and Zucker should each appear once
	const mehl = res.body.find((i: { name: string }) => i.name === "Mehl");
	expect(mehl).toBeDefined();
	const zucker = res.body.find((i: { name: string }) => i.name === "Zucker");
	expect(zucker).toBeDefined();
});

it("POST / ignores recipe references to non-existent files", async () => {
	await writeFile(
		path.join(tempDir, "MitRef.cook"),
		">> servings: 2\n\n@Mehl{100%g} sieben.\n@./NichtDa{1%Portion} dazu.",
	);

	const res = await request(app)
		.post("/api/einkaufsliste")
		.send({ slugs: ["MitRef"] });
	expect(res.status).toBe(200);

	const mehl = res.body.find((i: { name: string }) => i.name === "Mehl");
	expect(mehl).toBeDefined();
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/backend && npx vitest run src/routes/__tests__/shopping-list.test.ts`
Expected: FAIL — recipe references are not resolved.

**Step 3: Implement the recursive resolution**

In `packages/backend/src/routes/shopping-list.ts`, refaktoriere die Ingredient-Extraktion in eine rekursive Hilfsfunktion:

```typescript
async function collectIngredients(
	recipesDir: string,
	slug: string,
	scale: number,
	visited: Set<string>,
): Promise<CooklangIngredient[]> {
	if (visited.has(slug)) return [];
	visited.add(slug);

	const filePath = resolveRecipePath(recipesDir, slug);
	if (!(await fileExists(filePath))) return [];

	const content = await readFile(filePath, "utf-8");
	const parsed = parseRecipe(content);
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
				} else if (token.type === "recipeRef") {
					const refSlug = token.ref.replace(/^\.\//, "");
					const refIngredients = await collectIngredients(
						recipesDir,
						refSlug,
						scale,
						visited,
					);
					ingredients.push(...refIngredients);
				}
			}
		}
	}

	return ingredients;
}
```

Dann in der Route `POST /`, ersetze den for-loop der Ingredient-Extraktion durch den Aufruf:

```typescript
for (const { slug, servings } of normalizedSlugs) {
	const filePath = resolveRecipePath(recipesDir, slug);

	if (!(await fileExists(filePath))) {
		res.status(404).json({ error: `Recipe not found: ${slug}` });
		return;
	}

	const content = await readFile(filePath, "utf-8");
	const parsed = parseRecipe(content);

	const baseServingsStr = parsed.metadata.servings;
	const baseServings = baseServingsStr
		? Number.parseInt(baseServingsStr, 10)
		: undefined;
	const scale = servings && baseServings ? servings / baseServings : 1;

	const visited = new Set<string>();
	const ingredients = await collectIngredients(
		recipesDir,
		slug,
		scale,
		visited,
	);

	recipeIngredientsList.push({
		recipeName: slug,
		ingredients,
	});
}
```

Importiere `CooklangRecipeRef` (oder nutze den `token.type === "recipeRef"` Check direkt).

**Step 4: Run tests to verify they pass**

Run: `cd packages/backend && npx vitest run src/routes/__tests__/shopping-list.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/backend/src/routes/shopping-list.ts packages/backend/src/routes/__tests__/shopping-list.test.ts
git commit -m "feat: resolve recipe references recursively in shopping list"
```

---

### Task 11: Alle Tests laufen lassen

**Step 1: Backend-Tests**

Run: `cd packages/backend && npx vitest run`
Expected: ALL PASS

**Step 2: Frontend-Build**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit (falls Fixes nötig waren)**

---

### Task 12: CSS-Styling für Recipe-Referenzen

**Files:**
- Modifiziere die relevante CSS-Datei (z.B. `packages/frontend/src/styles/detail.css` oder wo `.token-ingredient` definiert ist)

**Step 1: Finde die relevante CSS-Datei**

Suche nach `.token-ingredient` in den CSS-Dateien.

**Step 2: Füge Styling hinzu**

```css
.token-recipe-ref {
	color: var(--color-primary, #2563eb);
	text-decoration: underline;
	cursor: pointer;
}

.ingredient-recipe-ref {
	color: var(--color-primary, #2563eb);
	text-decoration: underline;
}

.recipe-ref-chip {
	display: inline;
}

.recipe-ref-chip__label {
	background: var(--color-primary-light, #dbeafe);
	color: var(--color-primary, #2563eb);
	padding: 0.125rem 0.375rem;
	border-radius: 0.25rem;
	cursor: pointer;
}
```

**Step 3: Commit**

```bash
git add <css-file>
git commit -m "feat: add CSS styling for recipe reference tokens"
```

---

### Task 13: Issue als erledigt markieren

**Step 1: Aktualisiere die Issue-Datei**

In `_issues/009-rezept-referenzen.md`, füge am Anfang hinzu:

```markdown
**Status:** Done ✅
```

**Step 2: Commit**

```bash
git add _issues/009-rezept-referenzen.md
git commit -m "chore: mark issue 009 (Rezept-Referenzen) as done"
```
