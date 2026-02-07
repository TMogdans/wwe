import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createRecipeRouter } from "./routes/recipes.js";
import { createShoppingListRouter } from "./routes/shopping-list.js";

const app = express();
const recipesDir = process.env.RECIPES_DIR ?? "./rezepte";

app.use(express.json());
app.use("/api/rezepte", createRecipeRouter(recipesDir));
app.use("/api/einkaufsliste", createShoppingListRouter(recipesDir));

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const publicDir = path.join(__dirname, "public");
	app.use(express.static(publicDir));

	// SPA fallback: all non-API routes serve index.html
	app.get("/{*splat}", (_req, res) => {
		res.sendFile(path.join(publicDir, "index.html"));
	});
}

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
	console.log(`WWE running on port ${port}`);
});

export { app };
