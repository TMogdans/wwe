import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { openDatabase, suggestBlsFoods } from "../nutrition/bls.js";
import {
	type MappingConfig,
	type NutrientConfig,
	calculateRecipeNutrition,
	findMapping,
} from "../nutrition/calculator.js";
import { parseRecipe } from "../parser/index.js";
import type { CooklangIngredient } from "../parser/types.js";
import type { SuggestionResponse } from "../schemas/nutrition.js";
import { type SynonymMap, buildSynonymMap } from "../schemas/shopping-list.js";

const BLS_DB_FILE = "bls.sqlite";
const MAPPING_FILE = "naehrwerte-mapping.json";
const CONFIG_FILE = "naehrwerte.json";
const SYNONYMS_FILE = "synonyme.json";

// Cache synonyms at module level
let synonymMap: SynonymMap | undefined;

async function loadSynonyms(
	recipesDir: string,
): Promise<SynonymMap | undefined> {
	if (synonymMap) return synonymMap;

	try {
		const synonymsPath = path.join(recipesDir, SYNONYMS_FILE);
		const content = await readFile(synonymsPath, "utf-8");
		const groups = JSON.parse(content) as string[][];
		synonymMap = buildSynonymMap(groups);
		return synonymMap;
	} catch {
		return undefined;
	}
}

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

	// GET /:slug/suggestions – get BLS suggestions for unmapped ingredients
	router.get("/:slug/suggestions", async (req, res) => {
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

		try {
			// Load mapping config
			let mapping: MappingConfig = {};
			try {
				const raw = await readFile(
					path.join(recipesDir, MAPPING_FILE),
					"utf-8",
				);
				mapping = JSON.parse(raw);
			} catch {
				// No mapping file – continue with empty mapping
			}

			// Load synonyms
			const synonyms = await loadSynonyms(recipesDir);

			// Collect all ingredients (including from recipe refs)
			const visited = new Set<string>();
			const ingredients = await collectIngredients(recipesDir, slug, visited);

			// Find unmapped ingredients
			const unmapped = ingredients.filter(
				(ing) => !findMapping(ing.name, mapping, synonyms),
			);

			// Open database for suggestions
			const db = openDatabase(dbPath);

			// Build suggestions for each unmapped ingredient
			const suggestions: SuggestionResponse[] = unmapped.map((ing) => ({
				ingredient: ing.name,
				suggestions: suggestBlsFoods(db, ing.name, synonyms, 5),
				units: [ing.unit],
			}));

			res.json(suggestions);
		} catch (error) {
			console.error("Error generating suggestions:", error);
			res.status(500).json({ error: "Failed to generate suggestions" });
		}
	});

	return router;
}
