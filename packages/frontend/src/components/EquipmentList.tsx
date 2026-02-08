import type { RecipeDetail } from "../api.js";

interface EquipmentListProps {
	sections: RecipeDetail["sections"];
}

export function EquipmentList({ sections }: EquipmentListProps) {
	const seen = new Set<string>();
	const equipment: string[] = [];

	for (const section of sections) {
		for (const step of section.steps) {
			for (const token of step.tokens) {
				if (token.type === "equipment" && !seen.has(token.name)) {
					seen.add(token.name);
					equipment.push(token.name);
				}
			}
		}
	}

	if (equipment.length === 0) {
		return <p className="equipment-empty">Kein Equipment angegeben.</p>;
	}

	return (
		<ul className="equipment-list">
			{equipment.map((name) => (
				<li key={name} className="equipment-item">
					{name}
				</li>
			))}
		</ul>
	);
}
