import type { RecipeDetail } from "../api.js";
import { scaleAmount } from "../utils/scale-amount.js";

interface IngredientListProps {
	sections: RecipeDetail["sections"];
	scale: number;
}

export function IngredientList({ sections, scale }: IngredientListProps) {
	const hasMultipleSections = sections.filter((s) => s.name).length > 1;

	return (
		<ul className="ingredient-list">
			{sections.map((section) => {
				const ingredients: Array<{
					name: string;
					amount: string;
					unit: string;
					preparation: string;
					fixed?: boolean;
				}> = [];

				for (const step of section.steps) {
					for (const token of step.tokens) {
						if (token.type === "ingredient") {
							ingredients.push({
								name: token.name,
								amount: token.amount,
								unit: token.unit,
								preparation: token.preparation,
								fixed: token.fixed,
							});
						}
					}
				}

				if (ingredients.length === 0) return null;

				return (
					<li key={section.name || "__default"} style={{ listStyle: "none" }}>
						{hasMultipleSections && section.name && (
							<strong>{section.name}</strong>
						)}
						<ul>
							{ingredients.map((ing, i) => (
								<li key={`${ing.name}-${i}`} className="ingredient-item">
									{ing.amount && (
										<span className="ingredient-amount">
											{scaleAmount(ing.amount, scale, ing.fixed)}
										</span>
									)}{" "}
									{ing.unit && (
										<span className="ingredient-unit">{ing.unit}</span>
									)}{" "}
									<span className="ingredient-name">{ing.name}</span>
									{ing.preparation && (
										<span className="ingredient-preparation">
											{" "}
											({ing.preparation})
										</span>
									)}
								</li>
							))}
						</ul>
					</li>
				);
			})}
		</ul>
	);
}
