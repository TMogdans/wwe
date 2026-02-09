import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../../nutrition/bls.js";
import { createNutritionRouter } from "../nutrition.js";

describe("nutrition routes", () => {
	let app: express.Express;
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(tmpdir(), "wwe-nutrition-test-"));
		app = express();
		app.use(express.json());
		app.use("/api/naehrwerte", createNutritionRouter(tempDir));

		// Create a test recipe
		await writeFile(
			path.join(tempDir, "Test Rezept.cook"),
			">> servings: 2\n\n@Hackfleisch{500%g} anbraten. @Zwiebeln{2%Stück} hacken.",
		);

		// Create test BLS database
		const db = new DatabaseSync(path.join(tempDir, "bls.sqlite"));
		db.exec(`
			CREATE TABLE foods (
				code TEXT PRIMARY KEY,
				name_de TEXT NOT NULL,
				name_en TEXT
			);
			CREATE TABLE nutrient_definitions (
				code TEXT PRIMARY KEY,
				name_de TEXT NOT NULL,
				unit TEXT NOT NULL
			);
			CREATE TABLE nutrient_values (
				food_code TEXT NOT NULL,
				nutrient_code TEXT NOT NULL,
				value REAL NOT NULL,
				PRIMARY KEY (food_code, nutrient_code)
			);

			INSERT INTO foods VALUES ('U010100', 'Rind Hackfleisch, roh', 'Beef mince, raw');
			INSERT INTO foods VALUES ('G480100', 'Speisezwiebel roh', 'Onion raw');

			INSERT INTO nutrient_definitions VALUES ('ENERCC', 'Energie (Kilokalorien)', 'kcal');
			INSERT INTO nutrient_definitions VALUES ('PROT625', 'Protein', 'g');
			INSERT INTO nutrient_definitions VALUES ('FAT', 'Fett', 'g');

			INSERT INTO nutrient_values VALUES ('U010100', 'ENERCC', 224);
			INSERT INTO nutrient_values VALUES ('U010100', 'PROT625', 19.1);
			INSERT INTO nutrient_values VALUES ('U010100', 'FAT', 16.4);
			INSERT INTO nutrient_values VALUES ('G480100', 'ENERCC', 28);
			INSERT INTO nutrient_values VALUES ('G480100', 'PROT625', 1.2);
			INSERT INTO nutrient_values VALUES ('G480100', 'FAT', 0.3);
		`);
		db.close();

		// Create mapping
		await writeFile(
			path.join(tempDir, "naehrwerte-mapping.json"),
			JSON.stringify({
				Hackfleisch: { code: "U010100" },
				Zwiebeln: { code: "G480100", gramsPer: { Stück: 150 } },
			}),
		);

		// Create nutrient config
		await writeFile(
			path.join(tempDir, "naehrwerte.json"),
			JSON.stringify({ nutrients: ["ENERCC", "PROT625", "FAT"] }),
		);
	});

	afterEach(async () => {
		closeDatabase();
		await rm(tempDir, { recursive: true });
	});

	it("GET /:slug returns nutritional data", async () => {
		const res = await request(app).get("/api/naehrwerte/Test%20Rezept");
		expect(res.status).toBe(200);
		expect(res.body.servings).toBe(2);
		expect(res.body.coverage).toBe(1);
		expect(res.body.ingredients).toHaveLength(2);
		expect(res.body.total).toHaveLength(3);
		expect(res.body.perServing).toHaveLength(3);
	});

	it("calculates correct total values", async () => {
		const res = await request(app).get("/api/naehrwerte/Test%20Rezept");
		// Hackfleisch 500g: 224*5=1120 kcal, Zwiebeln 2*150g=300g: 28*3=84 kcal
		// Total: 1204 kcal
		const totalEnergy = res.body.total.find(
			(n: { code: string }) => n.code === "ENERCC",
		);
		expect(totalEnergy.value).toBeCloseTo(1204, 0);
		expect(totalEnergy.unit).toBe("kcal");
	});

	it("calculates per-serving values", async () => {
		const res = await request(app).get("/api/naehrwerte/Test%20Rezept");
		// Total 1204 kcal / 2 servings = 602
		const perServingEnergy = res.body.perServing.find(
			(n: { code: string }) => n.code === "ENERCC",
		);
		expect(perServingEnergy.value).toBeCloseTo(602, 0);
	});

	it("respects servings query parameter", async () => {
		const res = await request(app).get(
			"/api/naehrwerte/Test%20Rezept?servings=4",
		);
		expect(res.body.servings).toBe(4);
		// Total stays the same but per-serving halves
		const perServingEnergy = res.body.perServing.find(
			(n: { code: string }) => n.code === "ENERCC",
		);
		expect(perServingEnergy.value).toBeCloseTo(301, 0);
	});

	it("returns 404 for unknown recipe", async () => {
		const res = await request(app).get("/api/naehrwerte/Nicht%20Vorhanden");
		expect(res.status).toBe(404);
	});

	it("handles unmapped ingredients gracefully", async () => {
		// Recipe with unmapped ingredient
		await writeFile(
			path.join(tempDir, "Unknown.cook"),
			">> servings: 1\n\n@Geheimzutat{100%g} rühren.",
		);

		const res = await request(app).get("/api/naehrwerte/Unknown");
		expect(res.status).toBe(200);
		expect(res.body.coverage).toBe(0);
		expect(res.body.ingredients[0].matched).toBe(false);
	});

	it("works without mapping file", async () => {
		const { unlink } = await import("node:fs/promises");
		await unlink(path.join(tempDir, "naehrwerte-mapping.json"));

		const res = await request(app).get("/api/naehrwerte/Test%20Rezept");
		expect(res.status).toBe(200);
		expect(res.body.coverage).toBe(0);
	});
});
