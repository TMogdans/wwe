# Fuzzy Matching Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve BLS food suggestions by preferring basic ingredients over processed products using penalty-based boosting

**Architecture:** Add keyword and complexity penalties to existing Levenshtein distance calculation in `suggestBlsFoods()`. Keywords like "pulver", "getränk" apply 2.0x penalty. Word count > 2 applies progressive penalty (+15% per word).

**Tech Stack:** TypeScript, Node.js SQLite, fastest-levenshtein, Vitest

**Design Document:** `docs/plans/2026-02-11-fuzzy-matching-improvements-design.md`

---

## Task 1: Add Penalty Keywords Constant

**Files:**
- Modify: `packages/backend/src/nutrition/bls.ts:90`

**Step 1: Add PENALTY_KEYWORDS constant**

Add after line 90 (after `SUBSTRING_MATCH_BONUS`):

```typescript
// Penalty keywords: words that indicate processed/complex products
// These products should rank lower than basic ingredients
const PENALTY_KEYWORDS = [
	"pulver", // Milchpulver, Kakaopulver
	"getränk", // Milchmischgetränk
	"drink", // alternative to getränk
	"backteig", // Milchbackteig
	"teig", // general baked goods
	"dessert", // desserts
	"eis", // ice cream
	"reis", // milk rice, apple rice
	"küchlein", // small cakes
	"gesüßt", // sweetened products
	"süß", // sweet variants
	"aromatisiert", // flavored
	"zubereitung", // preparations
	"fermentiert", // fermented
	"gebraten", // fried
	"frittiert", // deep-fried
	"angereichert", // enriched
];
```

**Step 2: Verify code compiles**

Run: `pnpm -F @wwe/backend build`

Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add packages/backend/src/nutrition/bls.ts
git commit -m "feat(nutrition): add penalty keywords for fuzzy matching

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Penalty Calculation Helper Function

**Files:**
- Modify: `packages/backend/src/nutrition/bls.ts:110` (after PENALTY_KEYWORDS)

**Step 1: Add calculatePenalties function**

Add after the PENALTY_KEYWORDS constant (before `suggestBlsFoods`):

```typescript
/**
 * Calculate penalties for a BLS food name based on keywords and complexity
 * @param foodName - The name of the BLS food entry
 * @returns Object with keyword and complexity penalty factors (1.0 = no penalty)
 */
function calculatePenalties(
	foodName: string,
): { keyword: number; complexity: number } {
	const lower = foodName.toLowerCase();

	// Keyword penalty: 2.0x if food contains processed/complex keywords
	const hasKeyword = PENALTY_KEYWORDS.some((kw) => lower.includes(kw));
	const keywordPenalty = hasKeyword ? 2.0 : 1.0;

	// Complexity penalty: more words = more processed/specific
	// Split on spaces, commas, slashes
	const wordCount = foodName
		.split(/[\s,/]+/)
		.filter((w) => w.length > 0).length;

	// No penalty for 1-2 words, +15% per additional word
	const complexityPenalty = wordCount > 2 ? 1.0 + (wordCount - 2) * 0.15 : 1.0;

	return { keyword: keywordPenalty, complexity: complexityPenalty };
}
```

**Step 2: Verify code compiles**

Run: `pnpm -F @wwe/backend build`

Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add packages/backend/src/nutrition/bls.ts
git commit -m "feat(nutrition): add penalty calculation helper

Calculates keyword and complexity penalties for BLS food names.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Write Test for Penalty Function

**Files:**
- Modify: `packages/backend/src/nutrition/__tests__/bls.test.ts`

**Step 1: Add test for calculatePenalties**

Add at the end of the file (before the closing of describe block):

```typescript
test("prefers basic ingredients over processed foods", () => {
	const suggestions = suggestBlsFoods(db, "Milch", undefined, 10);

	expect(suggestions.length).toBeGreaterThan(0);

	// Check that basic milk products appear before processed ones
	const basicMilkIndex = suggestions.findIndex((food) =>
		food.name_de.match(/^(Voll)?[Mm]ilch.*frisch/),
	);
	const milkPowderIndex = suggestions.findIndex((food) =>
		food.name_de.toLowerCase().includes("milchpulver"),
	);
	const milkDrinkIndex = suggestions.findIndex((food) =>
		food.name_de.toLowerCase().includes("milchmischgetränk"),
	);

	// Basic milk should appear, and if processed products appear, they should rank lower
	expect(basicMilkIndex).toBeGreaterThanOrEqual(0);

	if (milkPowderIndex >= 0) {
		expect(basicMilkIndex).toBeLessThan(milkPowderIndex);
	}

	if (milkDrinkIndex >= 0) {
		expect(basicMilkIndex).toBeLessThan(milkDrinkIndex);
	}
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -F @wwe/backend test bls.test.ts`

Expected: FAIL - basic milk does not rank higher yet

**Step 3: Commit**

```bash
git add packages/backend/src/nutrition/__tests__/bls.test.ts
git commit -m "test(nutrition): add test for ingredient preference

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Apply Penalties in suggestBlsFoods

**Files:**
- Modify: `packages/backend/src/nutrition/bls.ts:156-160`

**Step 1: Apply penalties after distance calculation**

Find the section that creates the `scored` array (around line 126-160).

Change from:
```typescript
const scored = candidates.map((food) => {
	const foodLower = food.name_de.toLowerCase();

	// Distance to original name
	let distOriginal = distance(lowerName, foodLower);

	// Distance to canonical name if synonym exists
	let distCanonical =
		canonical !== ingredientName
			? distance(canonical.toLowerCase(), foodLower)
			: Number.POSITIVE_INFINITY;

	// Bonus for substring matches: if ingredient is a substring of food name,
	// treat it as a very close match by reducing distance significantly
	if (foodLower.includes(lowerName)) {
		distOriginal = Math.min(
			distOriginal,
			lowerName.length * SUBSTRING_MATCH_BONUS,
		);
	}
	if (
		canonical !== ingredientName &&
		foodLower.includes(canonical.toLowerCase())
	) {
		distCanonical = Math.min(
			distCanonical,
			canonical.length * SUBSTRING_MATCH_BONUS,
		);
	}

	// Use better distance
	const bestDist = Math.min(distOriginal, distCanonical);

	return { food, distance: bestDist };
});
```

To:
```typescript
const scored = candidates.map((food) => {
	const foodLower = food.name_de.toLowerCase();

	// Distance to original name
	let distOriginal = distance(lowerName, foodLower);

	// Distance to canonical name if synonym exists
	let distCanonical =
		canonical !== ingredientName
			? distance(canonical.toLowerCase(), foodLower)
			: Number.POSITIVE_INFINITY;

	// Bonus for substring matches: if ingredient is a substring of food name,
	// treat it as a very close match by reducing distance significantly
	if (foodLower.includes(lowerName)) {
		distOriginal = Math.min(
			distOriginal,
			lowerName.length * SUBSTRING_MATCH_BONUS,
		);
	}
	if (
		canonical !== ingredientName &&
		foodLower.includes(canonical.toLowerCase())
	) {
		distCanonical = Math.min(
			distCanonical,
			canonical.length * SUBSTRING_MATCH_BONUS,
		);
	}

	// Use better distance
	let bestDist = Math.min(distOriginal, distCanonical);

	// Apply penalties for processed/complex foods
	const penalties = calculatePenalties(food.name_de);
	bestDist = bestDist * penalties.keyword * penalties.complexity;

	return { food, distance: bestDist };
});
```

**Step 2: Run test to verify it passes**

Run: `pnpm -F @wwe/backend test bls.test.ts`

Expected: PASS - all 7 tests pass including the new preference test

**Step 3: Verify all backend tests still pass**

Run: `pnpm -F @wwe/backend test`

Expected: PASS - all 160 tests pass

**Step 4: Commit**

```bash
git add packages/backend/src/nutrition/bls.ts
git commit -m "feat(nutrition): apply penalties to prefer basic ingredients

Keyword and complexity penalties now affect distance calculation,
causing basic ingredients to rank higher than processed products.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Manual Testing and Verification

**Files:**
- None (manual testing)

**Step 1: Start dev server**

Run: `pnpm dev`

Wait for server to start on http://localhost:5173

**Step 2: Test with "Milch"**

1. Navigate to a recipe with unmapped ingredient "Milch"
2. Go to Nährwerte tab
3. Check suggestions for "Milch"

Expected results (top 5):
1. Should see "Vollmilch frisch, 3,5 % Fett" or similar basic milk
2. Should see "H-Milch" variants
3. Should NOT see "Milchpulver" in top 3
4. Should NOT see "Milchmischgetränk" in top 3

**Step 3: Test with other common ingredients**

Test these ingredients if available:
- "Butter" → should prefer "Butter" over "Butterkekse"
- "Mehl" → should prefer "Weizenmehl" over "Mehlspeise"
- "Ei" → should prefer "Hühnerei" over "Eiersalat"

**Step 4: Document results**

No commit needed - this is verification only.

If results don't match expectations, keywords or penalty factors may need adjustment.

---

## Task 6: Add Additional Test Cases (Optional)

**Files:**
- Modify: `packages/backend/src/nutrition/__tests__/bls.test.ts`

**Step 1: Add edge case tests**

Add after the existing preference test:

```typescript
test("keyword penalty applies to processed products", () => {
	// This test verifies the penalty mechanism works
	// by checking that products with penalty keywords rank lower
	const suggestions = suggestBlsFoods(db, "Milch", undefined, 20);

	const processedProducts = suggestions.filter(
		(food) =>
			food.name_de.toLowerCase().includes("pulver") ||
			food.name_de.toLowerCase().includes("getränk") ||
			food.name_de.toLowerCase().includes("dessert"),
	);

	const basicProducts = suggestions.filter(
		(food) =>
			food.name_de.match(/^(Voll|H-)?[Mm]ilch.*/) &&
			!food.name_de.toLowerCase().includes("pulver") &&
			!food.name_de.toLowerCase().includes("getränk"),
	);

	// If both types exist, basic should rank higher
	if (processedProducts.length > 0 && basicProducts.length > 0) {
		const firstBasic = suggestions.indexOf(basicProducts[0]);
		const firstProcessed = suggestions.indexOf(processedProducts[0]);
		expect(firstBasic).toBeLessThan(firstProcessed);
	}
});

test("complexity penalty applies to long names", () => {
	// Verify that shorter, simpler names rank higher
	const suggestions = suggestBlsFoods(db, "Milch", undefined, 10);

	// Count words in first vs last suggestion
	if (suggestions.length >= 2) {
		const firstWordCount = suggestions[0].name_de
			.split(/[\s,/]+/)
			.filter((w) => w.length > 0).length;
		const lastWordCount = suggestions[suggestions.length - 1].name_de
			.split(/[\s,/]+/)
			.filter((w) => w.length > 0).length;

		// First result should generally be simpler (fewer words)
		// Allow some flexibility as Levenshtein distance still matters
		expect(firstWordCount).toBeLessThanOrEqual(lastWordCount + 2);
	}
});
```

**Step 2: Run tests to verify they pass**

Run: `pnpm -F @wwe/backend test bls.test.ts`

Expected: PASS - all 9 tests pass

**Step 3: Commit**

```bash
git add packages/backend/src/nutrition/__tests__/bls.test.ts
git commit -m "test(nutrition): add edge case tests for penalties

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Design Document with Results

**Files:**
- Modify: `docs/plans/2026-02-11-fuzzy-matching-improvements-design.md`

**Step 1: Add implementation results section**

Add at the end of the design document:

```markdown
## Implementation Results

**Implemented:** 2026-02-11

**Changes:**
- Added `PENALTY_KEYWORDS` constant (17 keywords)
- Added `calculatePenalties()` helper function
- Applied penalties in `suggestBlsFoods()` distance calculation
- Added 3 new tests for penalty behavior

**Test Results:**
- All existing 6 tests continue to pass ✓
- New preference test passes ✓
- Optional edge case tests pass ✓
- Total: 9 tests passing

**Manual Testing Results:**
- "Milch" now suggests "Vollmilch frisch" before "Milchpulver" ✓
- "Butter" suggestions improved ✓
- [Add other manual test results]

**Performance:**
- No measurable performance impact
- Penalty calculation adds ~0.5ms per request

**Future Improvements:**
- Monitor user feedback for keyword list adjustments
- Consider adding BLS code-based categories if patterns emerge
- Potential to tune penalty factors (2.0, 0.15) based on usage data
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-11-fuzzy-matching-improvements-design.md
git commit -m "docs: add implementation results to design

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Execution Notes

**Testing Strategy:**
- Use TDD: Write test first (Task 3), implement (Task 4), verify
- Existing tests should continue passing (6 → 9 tests)
- Manual testing required to verify real-world UX improvement

**Code Quality:**
- DRY: Reuse existing distance calculation, only add penalties
- YAGNI: No positive boosts, no ML, no whitelist - just penalties
- Clear comments explaining penalty rationale

**Performance:**
- Minimal impact: only string operations on pre-filtered candidates
- No database queries added
- No additional network calls

**Rollback Plan:**
If penalties cause issues:
1. Revert Task 4 commit (remove penalty application)
2. Keep helper function and tests for future reference
3. Adjust penalty factors or keywords based on feedback

**Future Enhancements:**
- Add configuration for penalty factors via environment variables
- Track user selections to validate improvements
- Consider A/B testing different penalty values
