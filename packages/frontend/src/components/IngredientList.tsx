import type { RecipeDetail } from "../api.js";

interface IngredientListProps {
	steps: RecipeDetail["steps"];
	scale: number;
}

function scaleAmount(amount: string, scale: number): string {
	if (!amount) return "";
	// Try to parse as number
	const num = Number(amount);
	if (!Number.isNaN(num)) {
		const scaled = num * scale;
		// Show nice fractions or round to 1 decimal
		return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1);
	}
	// Try fraction like "1/2"
	const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
	if (fractionMatch) {
		const decimal = Number(fractionMatch[1]) / Number(fractionMatch[2]);
		const scaled = decimal * scale;
		return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1);
	}
	// Text amounts like "Handvoll", "kleine Dose" - don't scale
	return amount;
}

export function IngredientList({ steps, scale }: IngredientListProps) {
	const ingredients: Array<{
		name: string;
		amount: string;
		unit: string;
	}> = [];

	for (const step of steps) {
		for (const token of step.tokens) {
			if (token.type === "ingredient") {
				ingredients.push({
					name: token.name,
					amount: token.amount,
					unit: token.unit,
				});
			}
		}
	}

	return (
		<ul className="ingredient-list">
			{ingredients.map((ing, i) => (
				<li key={`${ing.name}-${i}`} className="ingredient-item">
					{ing.amount && (
						<span className="ingredient-amount">
							{scaleAmount(ing.amount, scale)}
						</span>
					)}{" "}
					{ing.unit && <span className="ingredient-unit">{ing.unit}</span>}{" "}
					<span className="ingredient-name">{ing.name}</span>
				</li>
			))}
		</ul>
	);
}
