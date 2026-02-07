import { access, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { parseRecipe } from "../parser/index.js";
import { createRecipeSchema, updateRecipeSchema } from "../schemas/index.js";
import type { RecipeSummary } from "../schemas/index.js";

function slugToFilename(slug: string): string {
	return `${decodeURIComponent(slug)}.cook`;
}

function filenameToSlug(filename: string): string {
	return filename.replace(/\.cook$/, "");
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

export function createRecipeRouter(recipesDir: string): Router {
	const router = Router();

	// GET / – list all recipes
	router.get("/", async (_req, res) => {
		const files = await readdir(recipesDir);
		const cookFiles = files.filter((f) => f.endsWith(".cook"));

		const recipes: RecipeSummary[] = await Promise.all(
			cookFiles.map(async (filename) => {
				const filePath = path.join(recipesDir, filename);
				const content = await readFile(filePath, "utf-8");
				const parsed = parseRecipe(content);
				const slug = filenameToSlug(filename);

				return {
					slug,
					name: slug,
					metadata: parsed.metadata,
				};
			}),
		);

		res.json(recipes);
	});

	// GET /:slug – get single recipe
	router.get("/:slug", async (req, res) => {
		const { slug } = req.params;
		const filePath = resolveRecipePath(recipesDir, slug);

		if (!(await fileExists(filePath))) {
			res.status(404).json({ error: "Recipe not found" });
			return;
		}

		const content = await readFile(filePath, "utf-8");
		const parsed = parseRecipe(content);
		const name = filenameToSlug(path.basename(filePath));

		res.json({
			slug: name,
			name,
			...parsed,
		});
	});

	// POST / – create new recipe
	router.post("/", async (req, res) => {
		const result = createRecipeSchema.safeParse(req.body);
		if (!result.success) {
			res.status(400).json({ error: result.error.issues });
			return;
		}

		const { name, content } = result.data;
		const filePath = resolveRecipePath(recipesDir, name);

		await writeFile(filePath, content, "utf-8");

		const parsed = parseRecipe(content);
		const summary: RecipeSummary = {
			slug: name,
			name,
			metadata: parsed.metadata,
		};

		res.status(201).json(summary);
	});

	// PUT /:slug – update existing recipe
	router.put("/:slug", async (req, res) => {
		const { slug } = req.params;
		const filePath = resolveRecipePath(recipesDir, slug);

		if (!(await fileExists(filePath))) {
			res.status(404).json({ error: "Recipe not found" });
			return;
		}

		const result = updateRecipeSchema.safeParse(req.body);
		if (!result.success) {
			res.status(400).json({ error: result.error.issues });
			return;
		}

		const { content } = result.data;
		await writeFile(filePath, content, "utf-8");

		const parsed = parseRecipe(content);
		const name = filenameToSlug(path.basename(filePath));

		res.json({
			slug: name,
			name,
			...parsed,
		});
	});

	// DELETE /:slug – delete recipe
	router.delete("/:slug", async (req, res) => {
		const { slug } = req.params;
		const filePath = resolveRecipePath(recipesDir, slug);

		if (!(await fileExists(filePath))) {
			res.status(404).json({ error: "Recipe not found" });
			return;
		}

		await unlink(filePath);
		res.status(204).send();
	});

	return router;
}
