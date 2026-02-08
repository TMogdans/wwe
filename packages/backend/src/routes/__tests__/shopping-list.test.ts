import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createShoppingListRouter } from "../shopping-list.js";

describe("shopping list routes", () => {
	let app: express.Express;
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(tmpdir(), "wwe-test-"));
		app = express();
		app.use(express.json());
		app.use("/api/einkaufsliste", createShoppingListRouter(tempDir));

		await writeFile(
			path.join(tempDir, "Chili.cook"),
			">> servings: 2\n\n@Knoblauch{2%Zehen} hacken.\n\n@Hackfleisch{500%g} anbraten.",
		);
		await writeFile(
			path.join(tempDir, "Gyoza.cook"),
			">> servings: 2\n\n@Knoblauch{2%Zehen} reiben.\n\n@Hackfleisch{200%g} mischen.",
		);
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("POST / returns aggregated shopping list", async () => {
		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["Chili", "Gyoza"] });
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body)).toBe(true);
		const hackfleisch = res.body.find(
			(i: { name: string }) => i.name === "Hackfleisch",
		);
		expect(hackfleisch).toBeDefined();
		expect(hackfleisch.entries).toHaveLength(2);
	});

	it("POST / returns 400 for empty slugs", async () => {
		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: [] });
		expect(res.status).toBe(400);
	});

	it("POST / returns 404 for non-existent slug", async () => {
		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["Chili", "NonExistent"] });
		expect(res.status).toBe(404);
	});

	it("POST / merges synonyms when synonyme.json exists", async () => {
		await writeFile(
			path.join(tempDir, "synonyme.json"),
			JSON.stringify([["Hackfleisch", "Gehacktes"]]),
		);
		await writeFile(
			path.join(tempDir, "Austrian.cook"),
			"@Gehacktes{300%g} anbraten.",
		);

		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["Chili", "Austrian"] });

		expect(res.status).toBe(200);
		const hackfleisch = res.body.find(
			(i: { name: string }) => i.name === "Hackfleisch",
		);
		expect(hackfleisch).toBeDefined();
		expect(hackfleisch.entries).toHaveLength(2);
		// "Gehacktes" should not appear as a separate ingredient
		const gehacktes = res.body.find(
			(i: { name: string }) => i.name === "Gehacktes",
		);
		expect(gehacktes).toBeUndefined();
	});

	it("POST / works without synonyme.json", async () => {
		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["Chili"] });

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body)).toBe(true);
	});
});
