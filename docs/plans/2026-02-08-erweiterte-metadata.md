# Erweiterte Metadata-Felder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support all Cooklang-spec metadata fields (tags, source, author, prep/cook time, difficulty, cuisine, diet, description) across backend schema, editor, and recipe detail view.

**Architecture:** The parser already stores arbitrary metadata as `Record<string, string>` — no parser changes needed. We extend the backend Zod schema, the frontend `RecipeMetadata` type + `MetadataForm`, the `RecipeDetail` view, the `RecipeCard`, and the `RecipeOverview` filter. The `RecipeSummary` metadata type gets widened to include all spec fields.

**Tech Stack:** Zod (backend schema), React + TypeScript (frontend), CSS

---

### Task 1: Extend backend `recipeMetadataSchema`

**Files:**
- Modify: `packages/backend/src/schemas/recipe.ts:3-7`

**Step 1: Write the failing test**

Create file `packages/backend/src/schemas/__tests__/recipe-metadata.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { recipeMetadataSchema } from "../recipe.js";

describe("recipeMetadataSchema", () => {
	it("accepts all spec-defined metadata fields", () => {
		const result = recipeMetadataSchema.safeParse({
			"time required": "90 Minuten",
			course: "dinner",
			servings: "4",
			tags: "italian, quick",
			source: "https://example.com",
			author: "Max Mustermann",
			"prep time": "15 Minuten",
			"cook time": "30 Minuten",
			difficulty: "easy",
			cuisine: "Italian",
			diet: "vegetarian",
			description: "A tasty dish",
		});
		expect(result.success).toBe(true);
	});

	it("accepts unknown metadata fields via catchall", () => {
		const result = recipeMetadataSchema.safeParse({
			"custom field": "custom value",
		});
		expect(result.success).toBe(true);
	});

	it("works with empty metadata", () => {
		const result = recipeMetadataSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/backend && npx vitest run src/schemas/__tests__/recipe-metadata.test.ts`
Expected: FAIL — new fields like `tags`, `source` etc. are rejected by the current strict schema.

**Step 3: Write minimal implementation**

In `packages/backend/src/schemas/recipe.ts`, replace the `recipeMetadataSchema` with:

```typescript
export const recipeMetadataSchema = z
	.object({
		"time required": z.string().optional(),
		course: z.string().optional(),
		servings: z.string().optional(),
		tags: z.string().optional(),
		source: z.string().optional(),
		author: z.string().optional(),
		"prep time": z.string().optional(),
		"cook time": z.string().optional(),
		difficulty: z.string().optional(),
		cuisine: z.string().optional(),
		diet: z.string().optional(),
		description: z.string().optional(),
	})
	.catchall(z.string());
```

**Step 4: Run test to verify it passes**

Run: `cd packages/backend && npx vitest run src/schemas/__tests__/recipe-metadata.test.ts`
Expected: PASS

**Step 5: Run all backend tests to check nothing breaks**

Run: `cd packages/backend && npx vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add packages/backend/src/schemas/recipe.ts packages/backend/src/schemas/__tests__/recipe-metadata.test.ts
git commit -m "feat: extend recipeMetadataSchema with all Cooklang spec fields"
```

---

### Task 2: Extend frontend `RecipeSummary` and `RecipeMetadata` types

**Files:**
- Modify: `packages/frontend/src/api.ts:1-9`
- Modify: `packages/frontend/src/components/MetadataForm.tsx:1-5`

**Step 1: Update `RecipeSummary` interface in `api.ts`**

Replace the `RecipeSummary` interface metadata with `Record<string, string>` to match backend flexibility:

```typescript
export interface RecipeSummary {
	slug: string;
	name: string;
	metadata: Record<string, string>;
}
```

**Step 2: Extend `RecipeMetadata` interface in `MetadataForm.tsx`**

```typescript
export interface RecipeMetadata {
	timeRequired: string;
	course: string;
	servings: string;
	tags: string;
	source: string;
	author: string;
	prepTime: string;
	cookTime: string;
	difficulty: string;
	cuisine: string;
	diet: string;
	description: string;
}
```

**Step 3: Commit**

```bash
git add packages/frontend/src/api.ts packages/frontend/src/components/MetadataForm.tsx
git commit -m "feat: extend frontend metadata types for all spec fields"
```

---

### Task 3: Update RecipeEditor metadata mapping

**Files:**
- Modify: `packages/frontend/src/views/RecipeEditor.tsx:41-61`

**Step 1: Update `EMPTY_METADATA`**

```typescript
const EMPTY_METADATA: RecipeMetadata = {
	timeRequired: "",
	course: "",
	servings: "",
	tags: "",
	source: "",
	author: "",
	prepTime: "",
	cookTime: "",
	difficulty: "",
	cuisine: "",
	diet: "",
	description: "",
};
```

**Step 2: Update `metadataFromRecipe`**

```typescript
function metadataFromRecipe(recipe: RecipeDetail): RecipeMetadata {
	return {
		timeRequired: recipe.metadata["time required"] ?? "",
		course: recipe.metadata.course ?? "",
		servings: recipe.metadata.servings ?? "",
		tags: recipe.metadata.tags ?? "",
		source: recipe.metadata.source ?? "",
		author: recipe.metadata.author ?? "",
		prepTime: recipe.metadata["prep time"] ?? "",
		cookTime: recipe.metadata["cook time"] ?? "",
		difficulty: recipe.metadata.difficulty ?? "",
		cuisine: recipe.metadata.cuisine ?? "",
		diet: recipe.metadata.diet ?? "",
		description: recipe.metadata.description ?? "",
	};
}
```

**Step 3: Update `metadataToRecord`**

```typescript
function metadataToRecord(meta: RecipeMetadata): Record<string, string> {
	const record: Record<string, string> = {};
	if (meta.timeRequired) record["time required"] = meta.timeRequired;
	if (meta.course) record.course = meta.course;
	if (meta.servings) record.servings = meta.servings;
	if (meta.tags) record.tags = meta.tags;
	if (meta.source) record.source = meta.source;
	if (meta.author) record.author = meta.author;
	if (meta.prepTime) record["prep time"] = meta.prepTime;
	if (meta.cookTime) record["cook time"] = meta.cookTime;
	if (meta.difficulty) record.difficulty = meta.difficulty;
	if (meta.cuisine) record.cuisine = meta.cuisine;
	if (meta.diet) record.diet = meta.diet;
	if (meta.description) record.description = meta.description;
	return record;
}
```

**Step 4: Commit**

```bash
git add packages/frontend/src/views/RecipeEditor.tsx
git commit -m "feat: update RecipeEditor metadata mapping for all spec fields"
```

---

### Task 4: Extend MetadataForm UI with new fields

**Files:**
- Modify: `packages/frontend/src/components/MetadataForm.tsx:35-116`
- Modify: `packages/frontend/src/styles/editor.css:61-66`

**Step 1: Add new form fields to MetadataForm**

After the existing `metadata-form__row` div (which has timeRequired, course, servings), add a second and third row. The full return block becomes:

```tsx
return (
	<div className="metadata-form">
		{isNew && (
			<label className="metadata-form__field">
				<span className="metadata-form__label">Rezeptname</span>
				<input
					type="text"
					className="metadata-form__input"
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					placeholder="z.B. Spaghetti Bolognese"
					required
				/>
			</label>
		)}

		<div className="metadata-form__row metadata-form__row--3">
			<label className="metadata-form__field">
				<span className="metadata-form__label">Zubereitungszeit</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.timeRequired}
					onChange={(e) =>
						onMetadataChange({ ...metadata, timeRequired: e.target.value })
					}
					placeholder="z.B. 30 Minuten"
				/>
			</label>

			<div className="metadata-form__field">
				<label className="metadata-form__label" htmlFor="metadata-course">
					Gang
				</label>
				{isCustomCourse ? (
					<input
						id="metadata-course"
						type="text"
						className="metadata-form__input"
						value={metadata.course}
						onChange={(e) =>
							onMetadataChange({ ...metadata, course: e.target.value })
						}
						placeholder="z.B. Vorspeise"
					/>
				) : (
					<select
						id="metadata-course"
						className="metadata-form__input"
						value={
							courseOptions.includes(metadata.course)
								? metadata.course
								: "__custom"
						}
						onChange={(e) => handleCourseSelect(e.target.value)}
					>
						<option value="">-- Kein Gang --</option>
						{courseOptions.map((course) => (
							<option key={course} value={course}>
								{course.charAt(0).toUpperCase() + course.slice(1)}
							</option>
						))}
						<option value="__custom">Eigener...</option>
					</select>
				)}
			</div>

			<label className="metadata-form__field">
				<span className="metadata-form__label">Portionen</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.servings}
					onChange={(e) =>
						onMetadataChange({ ...metadata, servings: e.target.value })
					}
					placeholder="z.B. 4"
				/>
			</label>
		</div>

		<div className="metadata-form__row metadata-form__row--3">
			<label className="metadata-form__field">
				<span className="metadata-form__label">Vorbereitungszeit</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.prepTime}
					onChange={(e) =>
						onMetadataChange({ ...metadata, prepTime: e.target.value })
					}
					placeholder="z.B. 15 Minuten"
				/>
			</label>

			<label className="metadata-form__field">
				<span className="metadata-form__label">Kochzeit</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.cookTime}
					onChange={(e) =>
						onMetadataChange({ ...metadata, cookTime: e.target.value })
					}
					placeholder="z.B. 30 Minuten"
				/>
			</label>

			<label className="metadata-form__field">
				<span className="metadata-form__label">Schwierigkeit</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.difficulty}
					onChange={(e) =>
						onMetadataChange({ ...metadata, difficulty: e.target.value })
					}
					placeholder="z.B. einfach"
				/>
			</label>
		</div>

		<div className="metadata-form__row metadata-form__row--3">
			<label className="metadata-form__field">
				<span className="metadata-form__label">Küche</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.cuisine}
					onChange={(e) =>
						onMetadataChange({ ...metadata, cuisine: e.target.value })
					}
					placeholder="z.B. Italienisch"
				/>
			</label>

			<label className="metadata-form__field">
				<span className="metadata-form__label">Ernährungsform</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.diet}
					onChange={(e) =>
						onMetadataChange({ ...metadata, diet: e.target.value })
					}
					placeholder="z.B. vegetarisch"
				/>
			</label>

			<label className="metadata-form__field">
				<span className="metadata-form__label">Tags</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.tags}
					onChange={(e) =>
						onMetadataChange({ ...metadata, tags: e.target.value })
					}
					placeholder="z.B. schnell, einfach"
				/>
			</label>
		</div>

		<div className="metadata-form__row metadata-form__row--2">
			<label className="metadata-form__field">
				<span className="metadata-form__label">Quelle</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.source}
					onChange={(e) =>
						onMetadataChange({ ...metadata, source: e.target.value })
					}
					placeholder="z.B. https://example.com"
				/>
			</label>

			<label className="metadata-form__field">
				<span className="metadata-form__label">Autor</span>
				<input
					type="text"
					className="metadata-form__input"
					value={metadata.author}
					onChange={(e) =>
						onMetadataChange({ ...metadata, author: e.target.value })
					}
					placeholder="z.B. Max Mustermann"
				/>
			</label>
		</div>

		<div className="metadata-form__row metadata-form__row--1">
			<label className="metadata-form__field">
				<span className="metadata-form__label">Beschreibung</span>
				<textarea
					className="metadata-form__input metadata-form__textarea"
					value={metadata.description}
					onChange={(e) =>
						onMetadataChange({ ...metadata, description: e.target.value })
					}
					placeholder="Kurze Beschreibung des Rezepts"
					rows={2}
				/>
			</label>
		</div>
	</div>
);
```

**Step 2: Update CSS for the new row variants**

In `packages/frontend/src/styles/editor.css`, replace the `.metadata-form__row` rule:

```css
.metadata-form__row {
	display: grid;
	gap: 1rem;
	margin-top: 1rem;
}

.metadata-form__row--3 {
	grid-template-columns: 1fr 1fr 1fr;
}

.metadata-form__row--2 {
	grid-template-columns: 1fr 1fr;
}

.metadata-form__row--1 {
	grid-template-columns: 1fr;
}

.metadata-form__textarea {
	resize: vertical;
	min-height: 3rem;
}
```

Update the responsive media query at the bottom:

```css
@media (max-width: 640px) {
	.metadata-form__row--3,
	.metadata-form__row--2 {
		grid-template-columns: 1fr;
	}
}
```

**Step 3: Commit**

```bash
git add packages/frontend/src/components/MetadataForm.tsx packages/frontend/src/styles/editor.css
git commit -m "feat: add editor form fields for all metadata spec fields"
```

---

### Task 5: Show extended metadata in RecipeDetail

**Files:**
- Modify: `packages/frontend/src/views/RecipeDetail.tsx:59-80`
- Modify: `packages/frontend/src/styles/detail.css`

**Step 1: Extend the detail-meta section**

Replace the `detail-meta` div in RecipeDetail with:

```tsx
<div className="detail-meta">
	{recipe.metadata["time required"] && (
		<span className="detail-badge">
			{recipe.metadata["time required"]}
		</span>
	)}
	{recipe.metadata["prep time"] && (
		<span className="detail-badge">
			Vorbereitung: {recipe.metadata["prep time"]}
		</span>
	)}
	{recipe.metadata["cook time"] && (
		<span className="detail-badge">
			Kochen: {recipe.metadata["cook time"]}
		</span>
	)}
	{recipe.metadata.course && (
		<span className="detail-badge">{recipe.metadata.course}</span>
	)}
	{recipe.metadata.servings && (
		<span className="detail-badge">{recipe.metadata.servings}</span>
	)}
	{recipe.metadata.difficulty && (
		<span className="detail-badge">{recipe.metadata.difficulty}</span>
	)}
	{recipe.metadata.cuisine && (
		<span className="detail-badge">{recipe.metadata.cuisine}</span>
	)}
	{recipe.metadata.diet && (
		<span className="detail-badge">{recipe.metadata.diet}</span>
	)}
	{recipe.metadata.tags && (
		<span className="detail-badge">{recipe.metadata.tags}</span>
	)}
</div>
{recipe.metadata.description && (
	<p className="detail-description">{recipe.metadata.description}</p>
)}
{(recipe.metadata.source || recipe.metadata.author) && (
	<p className="detail-source">
		{recipe.metadata.author && <>Von: {recipe.metadata.author}</>}
		{recipe.metadata.author && recipe.metadata.source && " · "}
		{recipe.metadata.source && (
			<a href={recipe.metadata.source} target="_blank" rel="noopener noreferrer">
				Quelle
			</a>
		)}
	</p>
)}
```

**Step 2: Add CSS for new detail elements**

Append to `packages/frontend/src/styles/detail.css` (before the `/* Portion calculator */` section):

```css
.detail-description {
	color: #78716c;
	font-size: 0.9375rem;
	line-height: 1.5;
	margin-bottom: 1.5rem;
}

.detail-source {
	font-size: 0.8125rem;
	color: #78716c;
	margin-bottom: 1.5rem;
}

.detail-source a {
	color: var(--color-primary);
}
```

**Step 3: Commit**

```bash
git add packages/frontend/src/views/RecipeDetail.tsx packages/frontend/src/styles/detail.css
git commit -m "feat: show extended metadata in recipe detail view"
```

---

### Task 6: Extend RecipeCard to show more metadata

**Files:**
- Modify: `packages/frontend/src/components/RecipeCard.tsx`

**Step 1: Update props and display**

Change the metadata prop type to `Record<string, string>`:

```typescript
interface RecipeCardProps {
	slug: string;
	name: string;
	metadata: Record<string, string>;
	selected: boolean;
	onToggleSelect: () => void;
}
```

Update the `recipe-card-meta` div:

```tsx
<div className="recipe-card-meta">
	{metadata["time required"] && (
		<span>Dauer: {metadata["time required"]}</span>
	)}
	{metadata.course && <span>Gang: {metadata.course}</span>}
	{metadata.servings && <span>Portionen: {metadata.servings}</span>}
	{metadata.difficulty && <span>{metadata.difficulty}</span>}
	{metadata.cuisine && <span>{metadata.cuisine}</span>}
</div>
```

**Step 2: Commit**

```bash
git add packages/frontend/src/components/RecipeCard.tsx
git commit -m "feat: show difficulty and cuisine on recipe cards"
```

---

### Task 7: Run full build and verify

**Step 1: Run backend tests**

Run: `cd packages/backend && npx vitest run`
Expected: All pass

**Step 2: Run frontend build**

Run: `cd packages/frontend && npx tsc --noEmit`
Expected: No type errors

**Step 3: Final commit (if any fixups needed)**

---

### Task 8: Mark issue as done

**Files:**
- Modify: `_issues/008-erweiterte-metadata-felder.md`

**Step 1: Add done marker to issue file**

Prepend `**Status: Done**` to the issue frontmatter.

**Step 2: Commit**

```bash
git add _issues/008-erweiterte-metadata-felder.md
git commit -m "chore: mark issue 008 (erweiterte Metadata-Felder) as done"
```
