export interface RecipeSummary {
	slug: string;
	name: string;
	metadata: Record<string, string>;
}

export interface RecipeDetail {
	slug: string;
	name: string;
	metadata: Record<string, string>;
	sections: Array<{
		name: string;
		steps: Array<{
			tokens: Array<
				| { type: "text"; value: string }
				| {
						type: "ingredient";
						name: string;
						amount: string;
						unit: string;
						preparation: string;
						fixed?: boolean;
				  }
				| { type: "timer"; name: string; duration: string; unit: string }
				| { type: "equipment"; name: string }
				| { type: "inlineComment"; value: string }
				| { type: "blockComment"; value: string }
				| { type: "recipeRef"; ref: string; amount: string; unit: string }
			>;
			isNote?: boolean;
		}>;
	}>;
}

export interface AggregatedIngredient {
	name: string;
	entries: Array<{
		amount: string;
		unit: string;
		preparation: string;
		recipeName: string;
	}>;
}

export async function fetchRecipes(): Promise<RecipeSummary[]> {
	const res = await fetch("/api/rezepte");
	if (!res.ok) throw new Error("Failed to fetch recipes");
	return res.json();
}

export async function fetchRecipe(slug: string): Promise<RecipeDetail> {
	const res = await fetch(`/api/rezepte/${encodeURIComponent(slug)}`);
	if (!res.ok) throw new Error("Recipe not found");
	return res.json();
}

export async function createRecipe(
	name: string,
	content: string,
): Promise<RecipeSummary> {
	const res = await fetch("/api/rezepte", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, content }),
	});
	if (!res.ok) throw new Error("Failed to create recipe");
	return res.json();
}

export async function updateRecipe(
	slug: string,
	content: string,
): Promise<void> {
	const res = await fetch(`/api/rezepte/${encodeURIComponent(slug)}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});
	if (!res.ok) throw new Error("Failed to update recipe");
}

export async function deleteRecipe(slug: string): Promise<void> {
	const res = await fetch(`/api/rezepte/${encodeURIComponent(slug)}`, {
		method: "DELETE",
	});
	if (!res.ok) throw new Error("Failed to delete recipe");
}

export async function fetchCourses(): Promise<string[]> {
	const res = await fetch("/api/kategorien");
	if (!res.ok) return [];
	return res.json();
}

export interface NutrientEntry {
	code: string;
	name: string;
	value: number;
	unit: string;
}

export interface NutritionIngredient {
	name: string;
	amount: string;
	unit: string;
	grams: number | null;
	blsCode: string | null;
	blsName: string | null;
	matched: boolean;
}

export interface NutritionData {
	servings: number;
	perServing: NutrientEntry[];
	total: NutrientEntry[];
	ingredients: NutritionIngredient[];
	coverage: number;
}

export async function fetchNutrition(
	slug: string,
	servings?: number,
): Promise<NutritionData | null> {
	const params = servings ? `?servings=${servings}` : "";
	const res = await fetch(
		`/api/naehrwerte/${encodeURIComponent(slug)}${params}`,
	);
	if (res.status === 503) return null; // BLS DB not available
	if (!res.ok) throw new Error("Failed to fetch nutrition");
	return res.json();
}

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
