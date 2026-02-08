import type { RecipeDetail } from "../api.js";

interface StepListProps {
	sections: RecipeDetail["sections"];
	scale: number;
}

function scaleAmount(amount: string, scale: number): string {
	if (!amount) return "";
	const num = Number(amount);
	if (!Number.isNaN(num)) {
		const scaled = num * scale;
		return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1);
	}
	const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
	if (fractionMatch) {
		const decimal = Number(fractionMatch[1]) / Number(fractionMatch[2]);
		const scaled = decimal * scale;
		return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1);
	}
	return amount;
}

function tokenKey(
	token: RecipeDetail["sections"][number]["steps"][number]["tokens"][number],
	index: number,
): string {
	switch (token.type) {
		case "text":
			return `text-${index}-${token.value.slice(0, 20)}`;
		case "ingredient":
			return `ing-${index}-${token.name}`;
		case "timer":
			return `timer-${index}-${token.duration}-${token.unit}`;
		case "equipment":
			return `equip-${index}-${token.name}`;
		default:
			return `unknown-${index}`;
	}
}

function stepKey(
	step: RecipeDetail["sections"][number]["steps"][number],
	index: number,
): string {
	const firstToken = step.tokens[0];
	if (!firstToken) return `step-${index}`;
	if (firstToken.type === "text") {
		return `step-${index}-${firstToken.value.slice(0, 30)}`;
	}
	return `step-${index}-${firstToken.type}`;
}

export function StepList({ sections, scale }: StepListProps) {
	const hasNamedSections = sections.some((s) => s.name);

	return (
		<div className="step-list">
			{sections.map((section) => (
				<div key={section.name || "__default"} className="step-section">
					{hasNamedSections && section.name && (
						<h3 className="step-section-header">{section.name}</h3>
					)}
					{section.steps.map((step, stepIndex) => (
						<p
							key={stepKey(step, stepIndex)}
							className={
								step.isNote
									? "step-paragraph step-paragraph--note"
									: "step-paragraph"
							}
						>
							{step.tokens.map((token, tokenIndex) => {
								const key = tokenKey(token, tokenIndex);
								switch (token.type) {
									case "text":
										return <span key={key}>{token.value}</span>;
									case "ingredient":
										return (
											<span key={key} className="token-ingredient">
												{token.amount
													? `${scaleAmount(token.amount, scale)} `
													: ""}
												{token.unit ? `${token.unit} ` : ""}
												{token.name}
												{token.preparation ? ` (${token.preparation})` : ""}
											</span>
										);
									case "timer":
										return (
											<span key={key} className="token-timer">
												{token.duration} {token.unit}
											</span>
										);
									case "equipment":
										return (
											<span key={key} className="token-equipment">
												{token.name}
											</span>
										);
									default:
										return null;
								}
							})}
						</p>
					))}
				</div>
			))}
		</div>
	);
}
