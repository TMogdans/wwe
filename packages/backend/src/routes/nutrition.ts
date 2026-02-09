import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { openDatabase } from "../nutrition/bls.js";
import {
	type MappingConfig,
	type NutrientConfig,
	calculateRecipeNutrition,
} from "../nutrition/calculator.js";
import { parseRecipe } from "../parser/index.js";
import type { CooklangIngredient } from "../parser/types.js";

const BLS_DB_FILE = "bls.sqlite";
const MAPPING_FILE = "naehrwerte-mapping.json";
const CONFIG_FILE = "naehrwerte.json";

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
					ingredients.push(token);
				} else if (token.type === "recipeRef") {
					const refSlug = token.ref.replace(/^\.\//, "");
					const refIngredients = await collectIngredients(
						recipesDir,
						refSlug,
						visited,
					);
					ingredients.push(...refIngredients);
				}
			}
		}
	}

	return ingredients;
}

export function createNutritionRouter(recipesDir: string): Router {
	const router = Router();

	// GET /:slug – get nutritional data for a recipe
	router.get("/:slug", async (req, res) => {
		const { slug } = req.params;
		const filePath = resolveRecipePath(recipesDir, slug);

		if (!(await fileExists(filePath))) {
			res.status(404).json({ error: "Recipe not found" });
			return;
		}

		// Check if BLS database exists
		const dbPath = path.join(recipesDir, BLS_DB_FILE);
		if (!(await fileExists(dbPath))) {
			res.status(503).json({ error: "BLS database not available" });
			return;
		}

		// Load mapping config
		let mapping: MappingConfig = {};
		try {
			const raw = await readFile(path.join(recipesDir, MAPPING_FILE), "utf-8");
			mapping = JSON.parse(raw);
		} catch {
			// No mapping file – continue with empty mapping
		}

		// Load nutrient config
		let config: NutrientConfig = {
			nutrients: [
				"ENERCC",
				"PROT625",
				"FAT",
				"CHO",
				"FIBT",
				"SUGAR",
				"FASAT",
				"FAMS",
				"FAPU",
				"CHORL",
				"NA",
				"NACL",
			],
		};
		try {
			const raw = await readFile(path.join(recipesDir, CONFIG_FILE), "utf-8");
			config = JSON.parse(raw);
		} catch {
			// Use defaults
		}

		// Parse recipe to get servings
		const content = await readFile(filePath, "utf-8");
		const parsed = parseRecipe(content);
		const baseServingsStr = parsed.metadata.servings;
		const baseServings = baseServingsStr
			? Number.parseInt(baseServingsStr, 10)
			: undefined;

		const requestedServings = req.query.servings
			? Number(req.query.servings)
			: undefined;
		const servings = requestedServings ?? baseServings ?? 1;

		// Collect all ingredients (including from recipe refs)
		const visited = new Set<string>();
		const ingredients = await collectIngredients(recipesDir, slug, visited);

		// Calculate nutrition
		const db = openDatabase(dbPath);
		const result = calculateRecipeNutrition(
			ingredients,
			mapping,
			db,
			config,
			servings,
		);

		res.json(result);
	});

	return router;
}
