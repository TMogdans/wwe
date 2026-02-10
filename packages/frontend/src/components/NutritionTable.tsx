import { useEffect, useState } from "react";
import type {
	CreateMappingRequest,
	IngredientSuggestion,
	NutritionData,
} from "../api.js";
import { createMapping, getNutritionSuggestions } from "../api.js";

interface NutritionTableProps {
	data: NutritionData;
}

function formatValue(value: number, unit: string): string {
	if (unit === "kcal" || unit === "mg" || unit === "µg") {
		return `${Math.round(value)}`;
	}
	return `${value.toFixed(1)}`;
}

interface UnmappedIngredientsProps {
	slug: string;
	unmatchedIngredients: string[];
	onMappingCreated: () => void;
}

function UnmappedIngredients({
	slug,
	unmatchedIngredients,
	onMappingCreated,
}: UnmappedIngredientsProps) {
	const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
	const [selectedCodes, setSelectedCodes] = useState<Map<string, string>>(
		new Map(),
	);
	const [gramsPerInputs, setGramsPerInputs] = useState<
		Map<string, Record<string, number>>
	>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState<Set<string>>(new Set());

	const METRIC_UNITS = [
		"g",
		"kg",
		"ml",
		"l",
		"el",
		"tl",
		"prise",
		"tasse",
		"dose",
	];

	useEffect(() => {
		if (unmatchedIngredients.length === 0) {
			setLoading(false);
			return;
		}

		setLoading(true);
		getNutritionSuggestions(slug)
			.then((data) => {
				setSuggestions(data);
				setError(null);
			})
			.catch((err) => {
				setError(err.message);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [slug, unmatchedIngredients.length]);

	const hasNonMetricUnits = (units: string[]): boolean => {
		return units.some((u) => !METRIC_UNITS.includes(u.toLowerCase()));
	};

	const handleSave = async (ingredient: string) => {
		const code = selectedCodes.get(ingredient);
		if (!code) return;

		setSaving((prev) => new Set(prev).add(ingredient));

		try {
			const request: CreateMappingRequest = {
				ingredientName: ingredient,
				blsCode: code,
			};

			const gramsPer = gramsPerInputs.get(ingredient);
			if (gramsPer && Object.keys(gramsPer).length > 0) {
				request.gramsPer = gramsPer;
			}

			await createMapping(request);

			// Remove from UI
			setSuggestions((prev) => prev.filter((s) => s.ingredient !== ingredient));
			setSelectedCodes((prev) => {
				const next = new Map(prev);
				next.delete(ingredient);
				return next;
			});

			onMappingCreated();
		} catch (err) {
			alert(
				`Fehler beim Speichern: ${err instanceof Error ? err.message : "Unbekannt"}`,
			);
		} finally {
			setSaving((prev) => {
				const next = new Set(prev);
				next.delete(ingredient);
				return next;
			});
		}
	};

	if (loading) return <p className="nutrition-loading">Lade Vorschläge...</p>;
	if (error) return <p className="nutrition-error">Fehler: {error}</p>;
	if (suggestions.length === 0) return null;

	return (
		<div className="nutrition-unmapped-mappings">
			<h3>Mappings hinzufügen</h3>
			{suggestions.map((suggestion) => (
				<div key={suggestion.ingredient} className="unmapped-ingredient">
					<h4>{suggestion.ingredient}</h4>

					{suggestion.suggestions.length === 0 ? (
						<p className="no-suggestions">
							Keine passenden BLS-Einträge gefunden
						</p>
					) : (
						<>
							<div className="bls-suggestions">
								{suggestion.suggestions.map((bls) => (
									<label key={bls.code} className="bls-suggestion-item">
										<input
											type="radio"
											name={`mapping-${suggestion.ingredient}`}
											value={bls.code}
											checked={
												selectedCodes.get(suggestion.ingredient) === bls.code
											}
											onChange={(e) => {
												setSelectedCodes((prev) =>
													new Map(prev).set(
														suggestion.ingredient,
														e.target.value,
													),
												);
											}}
										/>
										<span>
											{bls.name_de} ({bls.code})
										</span>
									</label>
								))}
							</div>

							{hasNonMetricUnits(suggestion.units) && (
								<div className="grams-per-input">
									<label>
										Gramm pro {suggestion.units[0]}:
										<input
											type="number"
											min="1"
											step="1"
											placeholder="z.B. 150"
											onChange={(e) => {
												const value = Number(e.target.value);
												if (value > 0) {
													setGramsPerInputs((prev) =>
														new Map(prev).set(suggestion.ingredient, {
															[suggestion.units[0]]: value,
														}),
													);
												} else {
													setGramsPerInputs((prev) => {
														const next = new Map(prev);
														next.delete(suggestion.ingredient);
														return next;
													});
												}
											}}
										/>
									</label>
								</div>
							)}

							<button
								type="button"
								onClick={() => handleSave(suggestion.ingredient)}
								disabled={
									!selectedCodes.has(suggestion.ingredient) ||
									saving.has(suggestion.ingredient) ||
									(hasNonMetricUnits(suggestion.units) &&
										!gramsPerInputs.has(suggestion.ingredient))
								}
								className="save-mapping-btn"
							>
								{saving.has(suggestion.ingredient)
									? "Speichert..."
									: "Speichern"}
							</button>
						</>
					)}
				</div>
			))}
		</div>
	);
}

export function NutritionTable({
	data,
	slug,
}: NutritionTableProps & { slug: string }) {
	const [refreshKey, setRefreshKey] = useState(0);
	const coveragePercent = Math.round(data.coverage * 100);
	const unmatchedIngredients = data.ingredients
		.filter((ing) => !ing.matched)
		.map((ing) => ing.name);

	return (
		<div className="nutrition" key={refreshKey}>
			{coveragePercent < 100 && (
				<p className="nutrition-coverage">
					{coveragePercent}% der Zutaten erfasst
				</p>
			)}

			<table className="nutrition-table">
				<thead>
					<tr>
						<th>Naehrstoff</th>
						<th>Pro Portion</th>
						<th>Gesamt</th>
					</tr>
				</thead>
				<tbody>
					{data.perServing.map((nutrient, i) => (
						<tr key={nutrient.code}>
							<td>{nutrient.name}</td>
							<td>
								{formatValue(nutrient.value, nutrient.unit)} {nutrient.unit}
							</td>
							<td>
								{formatValue(data.total[i].value, data.total[i].unit)}{" "}
								{data.total[i].unit}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{data.ingredients.some((ing) => !ing.matched) && (
				<details className="nutrition-unmapped">
					<summary>Nicht erfasste Zutaten</summary>
					<ul>
						{data.ingredients
							.filter((ing) => !ing.matched)
							.map((ing) => (
								<li key={ing.name}>{ing.name}</li>
							))}
					</ul>
				</details>
			)}

			{unmatchedIngredients.length > 0 && (
				<UnmappedIngredients
					slug={slug}
					unmatchedIngredients={unmatchedIngredients}
					onMappingCreated={() => setRefreshKey((k) => k + 1)}
				/>
			)}
		</div>
	);
}
