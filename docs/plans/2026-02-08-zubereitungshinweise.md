# Zubereitungshinweise (Preparation Notes) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support preparation notes in parentheses after ingredients, e.g. `@Zwiebel{1}(geschält und fein gewürfelt)`

**Architecture:** Add `preparation` field to the ingredient type, parse `(...)` immediately after `}` in tokenizer, thread `preparation` through serializer, API types, bridge, and editor UI.

**Tech Stack:** TypeScript, Vitest, TipTap/React, Radix UI Popover

---

### Task 1: Add `preparation` field to `CooklangIngredient` type

**Files:**
- Modify: `packages/backend/src/parser/types.ts:5-10`

**Step 1: Modify the type**

In `packages/backend/src/parser/types.ts`, add `preparation` to the interface:

```typescript
export interface CooklangIngredient {
	type: "ingredient";
	name: string;
	amount: string;
	unit: string;
	preparation: string;
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/parser/types.ts
git commit -m "feat: add preparation field to CooklangIngredient type"
```

---

### Task 2: Write failing tokenizer tests for preparation notes

**Files:**
- Modify: `packages/backend/src/parser/__tests__/tokenizer.test.ts`

**Step 1: Write failing tests**

Add these tests after the existing ingredient tests (after line 57) in `packages/backend/src/parser/__tests__/tokenizer.test.ts`:

```typescript
	// --- Preparation notes ---

	it("parses ingredient with preparation note", () => {
		const { tokens } = tokenizeLine(
			"@Zwiebel{1}(geschält und fein gewürfelt) anbraten.",
		);
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Zwiebel",
				amount: "1",
				unit: "",
				preparation: "geschält und fein gewürfelt",
			},
			{ type: "text", value: " anbraten." },
		]);
	});

	it("parses ingredient with preparation note and unit", () => {
		const { tokens } = tokenizeLine("@Knoblauch{2%Zehen}(gepresst) dazu.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Knoblauch",
				amount: "2",
				unit: "Zehen",
				preparation: "gepresst",
			},
			{ type: "text", value: " dazu." },
		]);
	});

	it("parses ingredient without preparation note (no parens)", () => {
		const { tokens } = tokenizeLine("@Hackfleisch{500%g} anbraten.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Hackfleisch",
				amount: "500",
				unit: "g",
				preparation: "",
			},
			{ type: "text", value: " anbraten." },
		]);
	});

	it("parses ingredient with empty preparation note", () => {
		const { tokens } = tokenizeLine("@Mehl{200%g}() einrühren.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Mehl",
				amount: "200",
				unit: "g",
				preparation: "",
			},
			{ type: "text", value: " einrühren." },
		]);
	});

	it("does not parse parentheses with space after brace as preparation", () => {
		const { tokens } = tokenizeLine("@Mehl{200%g} (optional) einrühren.");
		expect(tokens).toEqual([
			{
				type: "ingredient",
				name: "Mehl",
				amount: "200",
				unit: "g",
				preparation: "",
			},
			{ type: "text", value: " (optional) einrühren." },
		]);
	});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/tokenizer.test.ts`
Expected: FAIL — existing ingredient tokens don't include `preparation` field

**Step 3: Commit**

```bash
git add packages/backend/src/parser/__tests__/tokenizer.test.ts
git commit -m "test: add failing tokenizer tests for preparation notes"
```

---

### Task 3: Implement preparation parsing in tokenizer

**Files:**
- Modify: `packages/backend/src/parser/tokenizer.ts:129-165`

**Step 1: Add preparation parsing helper**

Add this function after `parseBraceContent` (after line 46) in `packages/backend/src/parser/tokenizer.ts`:

```typescript
/**
 * Check if a `(` immediately follows the current position and read the
 * preparation note content until the matching `)`.
 * Returns the preparation string and the index after `)`, or empty string
 * and unchanged index if no `(` is present.
 */
function readPreparation(
	line: string,
	pos: number,
): { preparation: string; end: number } {
	if (pos < line.length && line[pos] === "(") {
		const closeIdx = line.indexOf(")", pos + 1);
		if (closeIdx !== -1) {
			const preparation = line.substring(pos + 1, closeIdx).trim();
			return { preparation, end: closeIdx + 1 };
		}
	}
	return { preparation: "", end: pos };
}
```

**Step 2: Use `readPreparation` in the `@` ingredient branch**

Replace the ingredient token creation in the **brace branch** (lines ~148-154). After `i = closingBrace + 1;`, add preparation reading. The full brace-branch should become:

```typescript
			if (braceIndex !== -1) {
				// Multi-word name: everything between '@' and '{' is the name
				const name = line.substring(i, braceIndex);
				// Find closing brace
				const closingBrace = line.indexOf("}", braceIndex + 1);
				if (closingBrace === -1) {
					// Malformed: treat rest as text
					textAccumulator += `@${line.substring(i)}`;
					i = line.length;
					continue;
				}
				const content = line.substring(braceIndex + 1, closingBrace);
				const { amount, unit } = parseBraceContent(content);
				const { preparation, end: prepEnd } = readPreparation(
					line,
					closingBrace + 1,
				);
				tokens.push({
					type: "ingredient",
					name,
					amount,
					unit,
					preparation,
				} as CooklangIngredient);
				i = prepEnd;
```

And in the **no-brace branch** (lines ~158-164), add `preparation: ""`:

```typescript
			} else {
				// Single word name
				const { name, end } = readSingleWordName(line, i);
				tokens.push({
					type: "ingredient",
					name,
					amount: "",
					unit: "",
					preparation: "",
				} as CooklangIngredient);
				i = end;
			}
```

**Step 3: Run tests to verify they pass**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/tokenizer.test.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add packages/backend/src/parser/tokenizer.ts
git commit -m "feat: parse preparation notes after ingredient braces"
```

---

### Task 4: Fix existing tokenizer tests that now need `preparation` field

**Files:**
- Modify: `packages/backend/src/parser/__tests__/tokenizer.test.ts`

**Step 1: Update all existing ingredient expectations**

Every existing ingredient token in the test file needs `preparation: ""` added. Update these tests:

- Line 14: `{ type: "ingredient", name: "Hackfleisch", amount: "500", unit: "g" }` → add `preparation: ""`
- Lines 22-27: Passierte Tomaten ingredient → add `preparation: ""`
- Line 36: Salz → add `preparation: ""`
- Line 38: Pfeffer → add `preparation: ""`
- Line 46: Vanilleschote → add `preparation: ""`
- Line 54: Chili, grün → add `preparation: ""`
- Line 106: Öl → add `preparation: ""`
- Line 110: Hackfleisch → add `preparation: ""`
- Line 130: Öl → add `preparation: ""`

**Step 2: Run all tokenizer tests**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/tokenizer.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/backend/src/parser/__tests__/tokenizer.test.ts
git commit -m "test: update existing tokenizer tests with preparation field"
```

---

### Task 5: Write failing serializer tests for preparation notes

**Files:**
- Modify: `packages/backend/src/parser/__tests__/serializer.test.ts`

**Step 1: Write failing tests**

Add these tests after the existing ingredient serializer tests (after line 66) in `packages/backend/src/parser/__tests__/serializer.test.ts`:

```typescript
	it("serializes ingredient with preparation note", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Zwiebel",
									amount: "1",
									unit: "",
									preparation: "geschält und fein gewürfelt",
								},
								{ type: "text" as const, value: " anbraten." },
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe(
			"@Zwiebel{1}(geschält und fein gewürfelt) anbraten.",
		);
	});

	it("serializes ingredient without preparation note", () => {
		const recipe = {
			metadata: {},
			sections: [
				{
					name: "",
					steps: [
						{
							tokens: [
								{
									type: "ingredient" as const,
									name: "Mehl",
									amount: "500",
									unit: "g",
									preparation: "",
								},
							],
						},
					],
				},
			],
		};
		const output = serializeRecipe(recipe);
		expect(output).toBe("@Mehl{500%g}");
	});

	it("roundtrips ingredient with preparation note", () => {
		const input = "@Knoblauch{2%Zehen}(gepresst) dazugeben.";
		const parsed = parseRecipe(input);
		const output = serializeRecipe(parsed);
		expect(output).toBe("@Knoblauch{2%Zehen}(gepresst) dazugeben.");
	});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/serializer.test.ts`
Expected: FAIL — serializer doesn't output `(...)` yet

**Step 3: Commit**

```bash
git add packages/backend/src/parser/__tests__/serializer.test.ts
git commit -m "test: add failing serializer tests for preparation notes"
```

---

### Task 6: Implement preparation serialization

**Files:**
- Modify: `packages/backend/src/parser/serializer.ts:8-13`

**Step 1: Update `serializeToken` ingredient case**

Replace the `case "ingredient"` block (lines 8-13) with:

```typescript
		case "ingredient": {
			let result: string;
			if (token.amount === "" && token.unit === "") {
				result = `@${token.name}`;
			} else {
				result = `@${token.name}{${token.amount}%${token.unit}}`;
			}
			if (token.preparation) {
				result += `(${token.preparation})`;
			}
			return result;
		}
```

**Step 2: Run serializer tests**

Run: `cd packages/backend && npx vitest run src/parser/__tests__/serializer.test.ts`
Expected: ALL PASS

**Step 3: Run all backend tests to make sure nothing else broke**

Run: `cd packages/backend && npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add packages/backend/src/parser/serializer.ts
git commit -m "feat: serialize preparation notes for ingredients"
```

---

### Task 7: Update existing serializer tests with `preparation` field

**Files:**
- Modify: `packages/backend/src/parser/__tests__/serializer.test.ts`

**Step 1: Add `preparation: ""` to all existing ingredient tokens**

Existing ingredient token objects in the serializer tests that need updating:

- Lines 27-30: Hackfleisch → add `preparation: ""`
- Lines 53-57: Salz → add `preparation: ""`
- Line 327: Butter → add `preparation: ""`

**Step 2: Run all backend tests**

Run: `cd packages/backend && npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/backend/src/parser/__tests__/serializer.test.ts
git commit -m "test: update existing serializer tests with preparation field"
```

---

### Task 8: Update frontend API types

**Files:**
- Modify: `packages/frontend/src/api.ts:20`

**Step 1: Add `preparation` to ingredient type in `RecipeDetail`**

Change line 20 from:
```typescript
				| { type: "ingredient"; name: string; amount: string; unit: string }
```
to:
```typescript
				| { type: "ingredient"; name: string; amount: string; unit: string; preparation: string }
```

**Step 2: Commit**

```bash
git add packages/frontend/src/api.ts
git commit -m "feat: add preparation to frontend ingredient API type"
```

---

### Task 9: Update TipTap ingredient extension

**Files:**
- Modify: `packages/frontend/src/tiptap/ingredient-extension.ts`

**Step 1: Add `preparation` attribute**

Add `preparation` to `addAttributes()` (after line 27):

```typescript
	addAttributes() {
		return {
			name: { default: "" },
			amount: { default: "" },
			unit: { default: "" },
			preparation: { default: "" },
		};
	},
```

**Step 2: Update the `insertIngredient` command type**

Update the type declaration (lines 8-12) and `addCommands` (lines 51-52):

```typescript
declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		ingredient: {
			insertIngredient: (attrs: {
				name: string;
				amount: string;
				unit: string;
				preparation: string;
			}) => ReturnType;
		};
	}
}
```

And in `addCommands`:
```typescript
			insertIngredient:
				(attrs: { name: string; amount: string; unit: string; preparation: string }) =>
				({ commands }) => {
```

**Step 3: Commit**

```bash
git add packages/frontend/src/tiptap/ingredient-extension.ts
git commit -m "feat: add preparation attribute to ingredient extension"
```

---

### Task 10: Update ingredient component with preparation field

**Files:**
- Modify: `packages/frontend/src/tiptap/ingredient-component.tsx`

**Step 1: Add preparation to the component**

Update the component to include `preparation` in state, display, and form:

```tsx
import * as Popover from "@radix-ui/react-popover";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export function IngredientComponent({ node, updateAttributes }: NodeViewProps) {
	const { name, amount, unit, preparation } = node.attrs;
	const [open, setOpen] = useState(false);
	const [editName, setEditName] = useState(name as string);
	const [editAmount, setEditAmount] = useState(amount as string);
	const [editUnit, setEditUnit] = useState(unit as string);
	const [editPreparation, setEditPreparation] = useState(
		preparation as string,
	);

	const displayText = [amount, unit, name].filter(Boolean).join(" ");
	const displayWithPrep = preparation
		? `${displayText} (${preparation})`
		: displayText;

	const handleSave = () => {
		updateAttributes({
			name: editName,
			amount: editAmount,
			unit: editUnit,
			preparation: editPreparation,
		});
		setOpen(false);
	};

	return (
		<NodeViewWrapper as="span" className="ingredient-chip">
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<span className="ingredient-chip__label">
						{displayWithPrep || "Zutat"}
					</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content className="popover-content" sideOffset={5}>
						<div className="popover-form">
							<label>
								Name
								<input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder="z.B. Hackfleisch"
								/>
							</label>
							<label>
								Menge
								<input
									value={editAmount}
									onChange={(e) => setEditAmount(e.target.value)}
									placeholder="z.B. 500"
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
							<label>
								Zubereitung
								<input
									value={editPreparation}
									onChange={(e) => setEditPreparation(e.target.value)}
									placeholder="z.B. fein gewürfelt"
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

**Step 2: Commit**

```bash
git add packages/frontend/src/tiptap/ingredient-component.tsx
git commit -m "feat: add preparation field to ingredient editor UI"
```

---

### Task 11: Update cooklang-bridge for preparation support

**Files:**
- Modify: `packages/frontend/src/tiptap/cooklang-bridge.ts`

**Step 1: Update `parseToken` — add preparation parsing after braces**

In `parseToken()` (line ~112-124), after parsing the `}` for ingredient, check for `(...)`:

Replace the `if (trigger === "@")` block inside the brace-present branch (lines 114-125):

```typescript
		if (trigger === "@") {
			const parts = braceContent.split("%");
			const amount = parts[0] ?? "";
			const unit = parts[1] ?? "";
			let preparation = "";
			let finalEnd = end;
			if (end < text.length && text[end] === "(") {
				const closeIdx = text.indexOf(")", end + 1);
				if (closeIdx !== -1) {
					preparation = text.substring(end + 1, closeIdx).trim();
					finalEnd = closeIdx + 1;
				}
			}
			return {
				node: {
					type: "ingredient",
					attrs: { name, amount, unit, preparation },
				},
				end: finalEnd,
			};
		}
```

Also update the no-brace `@` ingredient branch (lines 153-160):

```typescript
		if (trigger === "@") {
			return {
				node: {
					type: "ingredient",
					attrs: { name, amount: "", unit: "", preparation: "" },
				},
				end: i,
			};
		}
```

**Step 2: Update `tiptapDocToCooklang` — serialize preparation**

Replace the `if (child.type === "ingredient")` block (lines 201-205):

```typescript
					if (child.type === "ingredient") {
						const { name, amount, unit, preparation } = child.attrs ?? {};
						let result: string;
						if (!amount && !unit) result = `@${name}`;
						else if (unit) result = `@${name}{${amount}%${unit}}`;
						else result = `@${name}{${amount}}`;
						if (preparation) result += `(${preparation})`;
						return result;
					}
```

**Step 3: Update `tokenToTiptapNode` — pass through preparation**

Replace the `case "ingredient"` (lines 242-245):

```typescript
		case "ingredient":
			return {
				type: "ingredient",
				attrs: {
					name: token.name,
					amount: token.amount,
					unit: token.unit,
					preparation: token.preparation,
				},
			};
```

**Step 4: Commit**

```bash
git add packages/frontend/src/tiptap/cooklang-bridge.ts
git commit -m "feat: support preparation notes in cooklang bridge"
```

---

### Task 12: Run all tests and verify

**Step 1: Run backend tests**

Run: `cd packages/backend && npx vitest run`
Expected: ALL PASS

**Step 2: Run frontend tests**

Run: `cd packages/frontend && npx vitest run`
Expected: ALL PASS

**Step 3: Final commit (if any fixes needed)**

If everything passes, no commit needed. If fixes were required, commit them.

---

### Task 13: Manual verification

**Step 1: Start the dev server**

Run: `pnpm dev` (or however the project starts)

**Step 2: Test in browser**

1. Open a recipe in the editor
2. Type `@Zwiebel{1}(geschält)` — should parse as ingredient with preparation
3. Click the ingredient chip — should show "Zubereitung" field with "geschält"
4. Edit the preparation in the popover, save, and verify it persists
5. Save the recipe and reload — preparation should still be there
