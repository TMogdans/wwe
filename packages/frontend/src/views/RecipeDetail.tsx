import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { type RecipeDetail as RecipeDetailType, fetchRecipe } from "../api.js";
import { EquipmentList } from "../components/EquipmentList.js";
import { IngredientList } from "../components/IngredientList.js";
import { PortionCalculator } from "../components/PortionCalculator.js";
import { StepList } from "../components/StepList.js";
import "../styles/detail.css";

interface RecipeDetailProps {
	slug: string;
}

function parseServings(value: string | undefined): number {
	if (!value) return 4;
	const match = value.match(/^(\d+)/);
	return match ? Number(match[1]) : 4;
}

export function RecipeDetail({ slug }: RecipeDetailProps) {
	const [recipe, setRecipe] = useState<RecipeDetailType | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [servings, setServings] = useState<number | null>(null);

	useEffect(() => {
		setRecipe(null);
		setError(null);
		setServings(null);
		fetchRecipe(slug)
			.then((data) => {
				setRecipe(data);
				setServings(parseServings(data.metadata.servings));
			})
			.catch(() => setError("Rezept konnte nicht geladen werden."));
	}, [slug]);

	if (error) {
		return (
			<div className="detail">
				<a href="#/" className="detail-back">
					&larr; Zurueck
				</a>
				<p className="detail-error">{error}</p>
			</div>
		);
	}

	if (!recipe || servings === null) {
		return (
			<div className="detail">
				<p className="detail-loading">Lade Rezept...</p>
			</div>
		);
	}

	const baseServings = parseServings(recipe.metadata.servings);
	const scale = servings / baseServings;

	return (
		<div className="detail">
			<a href="#/" className="detail-back">
				&larr; Zurueck
			</a>

			<div className="detail-header">
				<h1>{recipe.name}</h1>
				<div className="detail-meta">
					{recipe.metadata["time required"] && (
						<span className="detail-badge">
							{recipe.metadata["time required"]}
						</span>
					)}
					{recipe.metadata.course && (
						<span className="detail-badge">{recipe.metadata.course}</span>
					)}
					{recipe.metadata.servings && (
						<span className="detail-badge">{recipe.metadata.servings}</span>
					)}
				</div>
			</div>

			<Tabs.Root defaultValue="zutaten">
				<Tabs.List className="detail-tabs-list">
					<Tabs.Trigger value="zutaten" className="detail-tab-trigger">
						Zutaten
					</Tabs.Trigger>
					<Tabs.Trigger value="equipment" className="detail-tab-trigger">
						Equipment
					</Tabs.Trigger>
					<Tabs.Trigger value="zubereitung" className="detail-tab-trigger">
						Zubereitung
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="zutaten">
					<PortionCalculator
						baseServings={baseServings}
						currentServings={servings}
						onChange={setServings}
					/>
					<IngredientList steps={recipe.steps} scale={scale} />
				</Tabs.Content>

				<Tabs.Content value="equipment">
					<EquipmentList steps={recipe.steps} />
				</Tabs.Content>

				<Tabs.Content value="zubereitung">
					<StepList steps={recipe.steps} scale={scale} />
				</Tabs.Content>
			</Tabs.Root>

			<div className="detail-actions">
				<a
					href={`#/rezept/${slug}/kochen`}
					className="detail-btn detail-btn-primary"
				>
					Kochmodus starten
				</a>
				<a href={`#/rezept/${slug}/bearbeiten`} className="detail-btn">
					Bearbeiten
				</a>
			</div>
		</div>
	);
}
