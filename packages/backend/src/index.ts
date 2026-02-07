import express from "express";
import { createRecipeRouter } from "./routes/recipes.js";
import { createShoppingListRouter } from "./routes/shopping-list.js";

const app = express();
const recipesDir = process.env.RECIPES_DIR ?? "./rezepte";

app.use(express.json());
app.use("/api/rezepte", createRecipeRouter(recipesDir));
app.use("/api/einkaufsliste", createShoppingListRouter(recipesDir));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
	console.log(`WWE running on port ${port}`);
});

export { app };
