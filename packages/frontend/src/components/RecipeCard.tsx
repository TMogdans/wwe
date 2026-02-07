interface RecipeCardProps {
	slug: string;
	name: string;
	metadata: {
		"time required"?: string;
		course?: string;
		servings?: string;
	};
	selected: boolean;
	onToggleSelect: () => void;
}

export function RecipeCard({
	slug,
	name,
	metadata,
	selected,
	onToggleSelect,
}: RecipeCardProps) {
	function handleCheckboxClick(e: React.MouseEvent<HTMLInputElement>) {
		e.stopPropagation();
		onToggleSelect();
	}

	return (
		<a href={`#/rezept/${slug}`} className="recipe-card">
			<input
				type="checkbox"
				className="recipe-card-checkbox"
				checked={selected}
				onChange={() => {}}
				onClick={handleCheckboxClick}
				aria-label={`${name} auswaehlen`}
			/>
			<h2>{name}</h2>
			<div className="recipe-card-meta">
				{metadata["time required"] && (
					<span>Dauer: {metadata["time required"]}</span>
				)}
				{metadata.course && <span>Gang: {metadata.course}</span>}
				{metadata.servings && <span>Portionen: {metadata.servings}</span>}
			</div>
		</a>
	);
}
