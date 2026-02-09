import type { NutritionData } from "../api.js";

interface NutritionTableProps {
	data: NutritionData;
}

function formatValue(value: number, unit: string): string {
	if (unit === "kcal" || unit === "mg" || unit === "µg") {
		return `${Math.round(value)}`;
	}
	return `${value.toFixed(1)}`;
}

export function NutritionTable({ data }: NutritionTableProps) {
	const coveragePercent = Math.round(data.coverage * 100);

	return (
		<div className="nutrition">
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
		</div>
	);
}
