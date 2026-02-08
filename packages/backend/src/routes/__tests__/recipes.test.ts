import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRecipeRouter } from "../recipes.js";

describe("recipe routes", () => {
	let app: express.Express;
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(tmpdir(), "wwe-test-"));
		app = express();
		app.use(express.json());
		app.use("/api/rezepte", createRecipeRouter(tempDir));

		// Create test recipe files
		await writeFile(
			path.join(tempDir, "Chili con Carne.cook"),
			">> time required: 90 Minuten\n>> course: dinner\n>> servings: 2\n\n@Hackfleisch{500%g} anbraten.",
		);
		await writeFile(
			path.join(tempDir, "Pizzateig.cook"),
			">> time required: 2 Stunden\n>> servings: 4\n\n@Mehl{250%g} verkneten.",
		);
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("GET / returns all recipes", async () => {
		const res = await request(app).get("/api/rezepte");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0]).toHaveProperty("slug");
		expect(res.body[0]).toHaveProperty("name");
		expect(res.body[0]).toHaveProperty("metadata");
	});

	it("GET /:slug returns a single recipe", async () => {
		const res = await request(app).get("/api/rezepte/Chili%20con%20Carne");
		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Chili con Carne");
		expect(res.body.sections).toBeDefined();
		expect(res.body.sections.length).toBeGreaterThan(0);
	});

	it("GET /:slug returns 404 for non-existent recipe", async () => {
		const res = await request(app).get("/api/rezepte/nope");
		expect(res.status).toBe(404);
	});

	it("POST / creates a new recipe", async () => {
		const res = await request(app).post("/api/rezepte").send({
			name: "Neues Rezept",
			content: ">> servings: 1\n\nSchritt eins.",
		});
		expect(res.status).toBe(201);
		expect(res.body.slug).toBe("Neues Rezept");
		// Verify file exists
		const content = await readFile(
			path.join(tempDir, "Neues Rezept.cook"),
			"utf-8",
		);
		expect(content).toContain("servings: 1");
	});

	it("PUT /:slug updates an existing recipe", async () => {
		const res = await request(app)
			.put("/api/rezepte/Pizzateig")
			.send({ content: ">> servings: 8\n\n@Mehl{500%g} verkneten." });
		expect(res.status).toBe(200);
		const content = await readFile(
			path.join(tempDir, "Pizzateig.cook"),
			"utf-8",
		);
		expect(content).toContain("servings: 8");
	});

	it("PUT /:slug returns 404 for non-existent recipe", async () => {
		const res = await request(app)
			.put("/api/rezepte/nope")
			.send({ content: "test" });
		expect(res.status).toBe(404);
	});

	it("DELETE /:slug deletes a recipe", async () => {
		const res = await request(app).delete("/api/rezepte/Pizzateig");
		expect(res.status).toBe(204);
		// Verify list is shorter
		const listRes = await request(app).get("/api/rezepte");
		expect(listRes.body).toHaveLength(1);
	});

	it("DELETE /:slug returns 404 for non-existent recipe", async () => {
		const res = await request(app).delete("/api/rezepte/nope");
		expect(res.status).toBe(404);
	});
});
