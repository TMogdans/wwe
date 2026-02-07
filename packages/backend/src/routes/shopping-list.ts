import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { parseRecipe } from "../parser/index.js";
import type { CooklangIngredient } from "../parser/types.js";
import { shoppingListRequestSchema } from "../schemas/index.js";
import {
	type RecipeIngredients,
	aggregateIngredients,
} from "../schemas/shopping-list.js";

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

export function createShoppingListRouter(recipesDir: string): Router {
	const router = Router();

	// POST / – generate aggregated shopping list
	router.post("/", async (req, res) => {
		const result = shoppingListRequestSchema.safeParse(req.body);
		if (!result.success) {
			res.status(400).json({ error: result.error.issues });
			return;
		}

		const { slugs } = result.data;
		const recipeIngredientsList: RecipeIngredients[] = [];

		for (const slug of slugs) {
			const filePath = resolveRecipePath(recipesDir, slug);

			if (!(await fileExists(filePath))) {
				res.status(404).json({ error: `Recipe not found: ${slug}` });
				return;
			}

			const content = await readFile(filePath, "utf-8");
			const parsed = parseRecipe(content);

			const ingredients: CooklangIngredient[] = [];
			for (const step of parsed.steps) {
				for (const token of step.tokens) {
					if (token.type === "ingredient") {
						ingredients.push(token);
					}
				}
			}

			recipeIngredientsList.push({
				recipeName: slug,
				ingredients,
			});
		}

		const aggregated = aggregateIngredients(recipeIngredientsList);
		res.json(aggregated);
	});

	return router;
}
