import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

interface NutrientDef {
	code: string;
	name: string;
	unit: string;
	columnIndex: number;
}

function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (inQuotes) {
			if (char === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += char;
			}
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === ";") {
			fields.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	fields.push(current);
	return fields;
}

function parseNutrientHeader(header: string): NutrientDef | null {
	// Pattern: "CODE Name (Description) [unit/100g]"
	const match = header.match(/^(\S+)\s+(.+?)\s*\[([^\]]+?)\/100g\]$/);
	if (!match) return null;
	return {
		code: match[1],
		name: match[2].trim(),
		unit: match[3],
		columnIndex: -1,
	};
}

function parseGermanDecimal(value: string): number | null {
	const trimmed = value.trim();
	if (
		!trimmed ||
		trimmed === "-" ||
		trimmed.startsWith("<LOQ") ||
		trimmed.startsWith("<LOD")
	) {
		return null;
	}
	const normalized = trimmed.replace(",", ".");
	const num = Number(normalized);
	return Number.isNaN(num) ? null : num;
}

function main() {
	const csvPath = process.argv[2];
	if (!csvPath) {
		console.error(
			"Usage: npx tsx packages/backend/src/scripts/import-bls.ts <path-to-bls-csv>",
		);
		process.exit(1);
	}

	const outputPath = process.argv[3] ?? resolve("rezepte", "bls.sqlite");

	console.log(`Reading CSV from: ${csvPath}`);
	const content = readFileSync(csvPath, "utf-8");
	const lines = content.split("\n");

	if (lines.length < 3) {
		console.error("CSV file too short");
		process.exit(1);
	}

	const headerFields = parseCsvLine(lines[1]);

	// Extract nutrient definitions from header
	// Columns 0-2: BLS Code, Lebensmittelbezeichnung, Food name
	// Then triplets: Value, Datenherkunft, Referenz
	const nutrientDefs: NutrientDef[] = [];
	for (let i = 3; i < headerFields.length - 1; i += 3) {
		const def = parseNutrientHeader(headerFields[i]);
		if (def) {
			def.columnIndex = i;
			nutrientDefs.push(def);
		}
	}

	console.log(`Found ${nutrientDefs.length} nutrient definitions`);

	// Create SQLite database
	const db = new DatabaseSync(outputPath);
	db.exec("PRAGMA journal_mode = WAL");

	db.exec(`
		CREATE TABLE IF NOT EXISTS foods (
			code TEXT PRIMARY KEY,
			name_de TEXT NOT NULL,
			name_en TEXT
		);

		CREATE TABLE IF NOT EXISTS nutrient_definitions (
			code TEXT PRIMARY KEY,
			name_de TEXT NOT NULL,
			unit TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS nutrient_values (
			food_code TEXT NOT NULL,
			nutrient_code TEXT NOT NULL,
			value REAL NOT NULL,
			PRIMARY KEY (food_code, nutrient_code),
			FOREIGN KEY (food_code) REFERENCES foods(code),
			FOREIGN KEY (nutrient_code) REFERENCES nutrient_definitions(code)
		);
	`);

	// Clear existing data for re-import
	db.exec("DELETE FROM nutrient_values");
	db.exec("DELETE FROM nutrient_definitions");
	db.exec("DELETE FROM foods");

	// Insert nutrient definitions
	const insertDef = db.prepare(
		"INSERT INTO nutrient_definitions (code, name_de, unit) VALUES (?, ?, ?)",
	);
	for (const def of nutrientDefs) {
		insertDef.run(def.code, def.name, def.unit);
	}
	console.log(`Inserted ${nutrientDefs.length} nutrient definitions`);

	// Insert foods and nutrient values
	const insertFood = db.prepare(
		"INSERT OR IGNORE INTO foods (code, name_de, name_en) VALUES (?, ?, ?)",
	);
	const insertValue = db.prepare(
		"INSERT OR IGNORE INTO nutrient_values (food_code, nutrient_code, value) VALUES (?, ?, ?)",
	);

	let foodCount = 0;
	let valueCount = 0;

	for (let i = 2; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const fields = parseCsvLine(line);
		const code = fields[0]?.trim();
		const nameDe = fields[1]?.trim();
		const nameEn = fields[2]?.trim();

		if (!code || !nameDe) continue;

		insertFood.run(code, nameDe, nameEn || null);
		foodCount++;

		for (const def of nutrientDefs) {
			const raw = fields[def.columnIndex];
			if (raw === undefined) continue;
			const value = parseGermanDecimal(raw);
			if (value !== null) {
				insertValue.run(code, def.code, value);
				valueCount++;
			}
		}
	}

	console.log(`Inserted ${foodCount} foods with ${valueCount} nutrient values`);

	// Create index for name lookups
	db.exec(
		"CREATE INDEX IF NOT EXISTS idx_foods_name_de ON foods(name_de COLLATE NOCASE)",
	);
	console.log("Created name index");

	db.close();
	console.log(`Database written to: ${outputPath}`);
}

main();
