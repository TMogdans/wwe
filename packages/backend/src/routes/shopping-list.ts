import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { parseRecipe } from "../parser/index.js";
import type { CooklangIngredient } from "../parser/types.js";
import { shoppingListRequestSchema } from "../schemas/index.js";
import {
	type RecipeIngredients,
	type SynonymMap,
	aggregateIngredients,
	buildSynonymMap,
	synonymsSchema,
} from "../schemas/shopping-list.js";
import { scaleAmount } from "../utils/scale-amount.js";

const SYNONYMS_FILE = "synonyme.json";

function slugToFilename(slug: string): string {
	return `${decodeURIComponent(slug)}.cook`;
}

function resolveRecipePath(recipesDir: string, slug: string): string {
	const filename = slugToFilename(slug);
	const resolved = path.resolve(recipesDir, filename);
	const resolvedDir = path.resolve(recipesDir);

	if (
		!resolved.startsWith(resolvedDir + path.sep) &&
		resolved !== resolvedDir
	) {
		throw new Error("Path traversal detected");
	}

	return resolved;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

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

export function createShoppingListRouter(recipesDir: string): Router {
	const router = Router();

	// POST / – generate aggregated shopping list
	router.post("/", async (req, res) => {
		const result = shoppingListRequestSchema.safeParse(req.body);
		if (!result.success) {
			res.status(400).json({ error: result.error.issues });
			return;
		}

		let synonymMap: SynonymMap | undefined;
		try {
			const raw = await readFile(path.join(recipesDir, SYNONYMS_FILE), "utf-8");
			const parsed = synonymsSchema.safeParse(JSON.parse(raw));
			if (parsed.success) {
				synonymMap = buildSynonymMap(parsed.data);
			}
		} catch {
			// No synonyms file – continue without synonyms
		}

		const { slugs } = result.data;
		const normalizedSlugs = slugs.map((entry) =>
			typeof entry === "string"
				? { slug: entry, servings: undefined as number | undefined }
				: entry,
		);
		const recipeIngredientsList: RecipeIngredients[] = [];

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

		const aggregated = aggregateIngredients(recipeIngredientsList, synonymMap);
		res.json(aggregated);
	});

	return router;
}
