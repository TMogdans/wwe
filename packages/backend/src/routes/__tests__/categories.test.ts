import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCategoriesRouter } from "../categories.js";

describe("categories routes", () => {
	let app: express.Express;
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(tmpdir(), "wwe-cat-test-"));
		app = express();
		app.use("/api/kategorien", createCategoriesRouter(tempDir));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("GET / returns categories from file", async () => {
		await writeFile(
			path.join(tempDir, "kategorien.json"),
			JSON.stringify(["dinner", "dessert", "dip"]),
		);

		const res = await request(app).get("/api/kategorien");
		expect(res.status).toBe(200);
		expect(res.body).toEqual(["dinner", "dessert", "dip"]);
	});

	it("GET / returns empty array when file does not exist", async () => {
		const res = await request(app).get("/api/kategorien");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("GET / returns 500 for invalid JSON content", async () => {
		await writeFile(
			path.join(tempDir, "kategorien.json"),
			'{"not": "an array"}',
		);

		const res = await request(app).get("/api/kategorien");
		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty("error");
	});
});
