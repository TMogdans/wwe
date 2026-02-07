import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { categoriesSchema } from "../schemas/index.js";

const CATEGORIES_FILE = "kategorien.json";

export function createCategoriesRouter(recipesDir: string): Router {
	const router = Router();

	router.get("/", async (_req, res) => {
		const filePath = path.join(recipesDir, CATEGORIES_FILE);

		let raw: string;
		try {
			raw = await readFile(filePath, "utf-8");
		} catch {
			res.json([]);
			return;
		}

		const parsed = categoriesSchema.safeParse(JSON.parse(raw));
		if (!parsed.success) {
			res.status(500).json({ error: "Invalid categories file" });
			return;
		}

		res.json(parsed.data);
	});

	return router;
}
