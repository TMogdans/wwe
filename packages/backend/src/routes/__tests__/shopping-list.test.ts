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

	it("POST / scales amounts when servings provided", async () => {
		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({
				slugs: [{ slug: "Chili", servings: 4 }],
			});
		expect(res.status).toBe(200);
		const hackfleisch = res.body.find(
			(i: { name: string }) => i.name === "Hackfleisch",
		);
		expect(hackfleisch).toBeDefined();
		expect(hackfleisch.entries[0].amount).toBe("1000");
	});

	it("POST / does not scale fixed amounts", async () => {
		await writeFile(
			path.join(tempDir, "Pasta.cook"),
			">> servings: 2\n\n@Nudeln{500%g} kochen.\n@Salz{=1%TL} hinzufuegen.",
		);
		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({
				slugs: [{ slug: "Pasta", servings: 4 }],
			});
		expect(res.status).toBe(200);
		const nudeln = res.body.find((i: { name: string }) => i.name === "Nudeln");
		expect(nudeln.entries[0].amount).toBe("1000");
		const salz = res.body.find((i: { name: string }) => i.name === "Salz");
		expect(salz.entries[0].amount).toBe("1");
	});

	it("POST / works with plain string slugs (backward compatible)", async () => {
		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["Chili"] });
		expect(res.status).toBe(200);
		const hackfleisch = res.body.find(
			(i: { name: string }) => i.name === "Hackfleisch",
		);
		expect(hackfleisch.entries[0].amount).toBe("500");
	});

	// --- Recipe references ---

	it("POST / resolves recipe references recursively", async () => {
		await writeFile(
			path.join(tempDir, "Hollandaise.cook"),
			">> servings: 2\n\n@Butter{100%g} schmelzen.\n@Eigelb{2%Stück} einrühren.",
		);
		await writeFile(
			path.join(tempDir, "Spargel.cook"),
			">> servings: 2\n\n@Spargel{500%g} kochen.\n@./Hollandaise{150%g} servieren.",
		);

		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["Spargel"] });
		expect(res.status).toBe(200);

		const spargel = res.body.find(
			(i: { name: string }) => i.name === "Spargel",
		);
		expect(spargel).toBeDefined();
		expect(spargel.entries[0].amount).toBe("500");

		const butter = res.body.find((i: { name: string }) => i.name === "Butter");
		expect(butter).toBeDefined();

		const eigelb = res.body.find((i: { name: string }) => i.name === "Eigelb");
		expect(eigelb).toBeDefined();
	});

	it("POST / prevents circular recipe references", async () => {
		await writeFile(
			path.join(tempDir, "A.cook"),
			">> servings: 2\n\n@Mehl{100%g} sieben.\n@./B{1%Portion} dazu.",
		);
		await writeFile(
			path.join(tempDir, "B.cook"),
			">> servings: 2\n\n@Zucker{50%g} dazu.\n@./A{1%Portion} dazu.",
		);

		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["A"] });
		expect(res.status).toBe(200);

		const mehl = res.body.find((i: { name: string }) => i.name === "Mehl");
		expect(mehl).toBeDefined();
		const zucker = res.body.find((i: { name: string }) => i.name === "Zucker");
		expect(zucker).toBeDefined();
	});

	it("POST / ignores recipe references to non-existent files", async () => {
		await writeFile(
			path.join(tempDir, "MitRef.cook"),
			">> servings: 2\n\n@Mehl{100%g} sieben.\n@./NichtDa{1%Portion} dazu.",
		);

		const res = await request(app)
			.post("/api/einkaufsliste")
			.send({ slugs: ["MitRef"] });
		expect(res.status).toBe(200);

		const mehl = res.body.find((i: { name: string }) => i.name === "Mehl");
		expect(mehl).toBeDefined();
	});
});
