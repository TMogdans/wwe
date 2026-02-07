import { useEffect, useState } from "react";
import {
	type AggregatedIngredient,
	type RecipeSummary,
	fetchCourses,
	fetchRecipes,
	generateShoppingList,
} from "../api.js";
import { RecipeCard } from "../components/RecipeCard.js";
import { ShoppingListDialog } from "../components/ShoppingListDialog.js";
import "../styles/overview.css";

export function RecipeOverview() {
	const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
	const [search, setSearch] = useState("");
	const [courseFilter, setCourseFilter] = useState("");
	const [courseOptions, setCourseOptions] = useState<string[]>([]);
	const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [shoppingItems, setShoppingItems] = useState<AggregatedIngredient[]>(
		[],
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchRecipes()
			.then(setRecipes)
			.catch(() => setError("Rezepte konnten nicht geladen werden."));
		fetchCourses().then(setCourseOptions);
	}, []);

	const filtered = recipes.filter((r) => {
		const matchesName = r.name.toLowerCase().includes(search.toLowerCase());
		const matchesCourse = !courseFilter || r.metadata.course === courseFilter;
		return matchesName && matchesCourse;
	});

	function toggleSelect(slug: string) {
		setSelectedSlugs((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) {
				next.delete(slug);
			} else {
				next.add(slug);
			}
			return next;
		});
	}

	async function handleGenerateShoppingList() {
		try {
			const items = await generateShoppingList(Array.from(selectedSlugs));
			setShoppingItems(items);
			setDialogOpen(true);
		} catch {
			setError("Einkaufsliste konnte nicht generiert werden.");
		}
	}

	return (
		<div className="overview">
			<div className="overview-header">
				<h1>Rezepte</h1>
				<input
					type="search"
					className="overview-search"
					placeholder="Rezept suchen..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				{courseOptions.length > 0 && (
					<select
						className="overview-filter"
						value={courseFilter}
						onChange={(e) => setCourseFilter(e.target.value)}
					>
						<option value="">Alle Gänge</option>
						{courseOptions.map((course) => (
							<option key={course} value={course}>
								{course.charAt(0).toUpperCase() + course.slice(1)}
							</option>
						))}
					</select>
				)}
				<a href="#/neu" className="overview-new-link">
					+ Neues Rezept
				</a>
			</div>

			{error && <p className="overview-empty">{error}</p>}

			{!error && filtered.length === 0 && (
				<p className="overview-empty">Keine Rezepte gefunden.</p>
			)}

			<div className="recipe-grid">
				{filtered.map((recipe) => (
					<RecipeCard
						key={recipe.slug}
						slug={recipe.slug}
						name={recipe.name}
						metadata={recipe.metadata}
						selected={selectedSlugs.has(recipe.slug)}
						onToggleSelect={() => toggleSelect(recipe.slug)}
					/>
				))}
			</div>

			{selectedSlugs.size > 0 && (
				<button
					type="button"
					className="overview-fab"
					onClick={handleGenerateShoppingList}
				>
					Einkaufsliste generieren
				</button>
			)}

			<ShoppingListDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				items={shoppingItems}
			/>
		</div>
	);
}
