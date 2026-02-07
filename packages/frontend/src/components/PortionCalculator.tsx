interface PortionCalculatorProps {
	baseServings: number;
	currentServings: number;
	onChange: (servings: number) => void;
}

export function PortionCalculator({
	currentServings,
	onChange,
}: PortionCalculatorProps) {
	return (
		<div className="portion-calculator">
			<button
				type="button"
				className="portion-btn"
				onClick={() => onChange(Math.max(1, currentServings - 1))}
				aria-label="Portion verringern"
			>
				&minus;
			</button>
			<span className="portion-display">
				{currentServings} {currentServings === 1 ? "Portion" : "Portionen"}
			</span>
			<button
				type="button"
				className="portion-btn"
				onClick={() => onChange(currentServings + 1)}
				aria-label="Portion erhoehen"
			>
				+
			</button>
		</div>
	);
}
