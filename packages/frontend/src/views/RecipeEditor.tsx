import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import {
	type RecipeDetail,
	createRecipe,
	fetchCourses,
	fetchRecipe,
	updateRecipe,
} from "../api.js";
import { EditorToolbar } from "../components/EditorToolbar.js";
import {
	MetadataForm,
	type RecipeMetadata,
} from "../components/MetadataForm.js";
import "../styles/editor.css";
import "../styles/tiptap.css";
import {
	buildCooklangFile,
	stepsToTiptapDoc,
} from "../tiptap/cooklang-bridge.js";
import {
	EquipmentExtension,
	IngredientExtension,
	SlashCommands,
	TimerExtension,
} from "../tiptap/index.js";

interface RecipeEditorProps {
	slug?: string;
}

const EMPTY_DOC: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

const EMPTY_METADATA: RecipeMetadata = {
	timeRequired: "",
	course: "",
	servings: "",
};

function metadataFromRecipe(recipe: RecipeDetail): RecipeMetadata {
	return {
		timeRequired: recipe.metadata["time required"] ?? "",
		course: recipe.metadata.course ?? "",
		servings: recipe.metadata.servings ?? "",
	};
}

function metadataToRecord(meta: RecipeMetadata): Record<string, string> {
	const record: Record<string, string> = {};
	if (meta.timeRequired) record["time required"] = meta.timeRequired;
	if (meta.course) record.course = meta.course;
	if (meta.servings) record.servings = meta.servings;
	return record;
}

export function RecipeEditor({ slug }: RecipeEditorProps) {
	const isNew = !slug;
	const [recipeName, setRecipeName] = useState("");
	const [metadata, setMetadata] = useState<RecipeMetadata>(EMPTY_METADATA);
	const [loading, setLoading] = useState(!!slug);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [initialDoc, setInitialDoc] = useState<JSONContent | null>(
		isNew ? EMPTY_DOC : null,
	);
	const [courseOptions, setCourseOptions] = useState<string[]>([]);

	const editor = useEditor(
		{
			extensions: [
				StarterKit,
				IngredientExtension,
				TimerExtension,
				EquipmentExtension,
				SlashCommands,
			],
			content: initialDoc ?? EMPTY_DOC,
		},
		[initialDoc],
	);

	useEffect(() => {
		fetchCourses().then(setCourseOptions);
	}, []);

	useEffect(() => {
		if (!slug) return;

		setLoading(true);
		setError(null);
		fetchRecipe(slug)
			.then((recipe) => {
				setRecipeName(recipe.name);
				setMetadata(metadataFromRecipe(recipe));
				const doc = stepsToTiptapDoc(recipe.steps);
				setInitialDoc(doc);
			})
			.catch(() => setError("Rezept konnte nicht geladen werden."))
			.finally(() => setLoading(false));
	}, [slug]);

	async function handleSave() {
		if (!editor) return;

		if (isNew && !recipeName.trim()) {
			setError("Bitte gib einen Rezeptnamen ein.");
			return;
		}

		setSaving(true);
		setError(null);

		try {
			const doc = editor.getJSON();
			const metaRecord = metadataToRecord(metadata);
			const content = buildCooklangFile(metaRecord, doc);

			if (isNew) {
				const created = await createRecipe(recipeName.trim(), content);
				window.location.hash = `/rezept/${created.slug}`;
			} else if (slug) {
				await updateRecipe(slug, content);
				window.location.hash = `/rezept/${slug}`;
			}
		} catch {
			setError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
		} finally {
			setSaving(false);
		}
	}

	function handleCancel() {
		if (slug) {
			window.location.hash = `/rezept/${slug}`;
		} else {
			window.location.hash = "/";
		}
	}

	if (loading) {
		return (
			<div className="editor-page">
				<p className="editor-page__loading">Lade Rezept...</p>
			</div>
		);
	}

	return (
		<div className="editor-page">
			<div className="editor-page__header">
				<h1>{isNew ? "Neues Rezept" : `${recipeName} bearbeiten`}</h1>
			</div>

			{error && <p className="editor-page__error">{error}</p>}

			<MetadataForm
				name={recipeName}
				onNameChange={setRecipeName}
				isNew={isNew}
				metadata={metadata}
				onMetadataChange={setMetadata}
				courseOptions={courseOptions}
			/>

			<EditorToolbar editor={editor} />

			<div className="tiptap-editor">
				<EditorContent editor={editor} />
			</div>

			<div className="editor-page__actions">
				<button
					type="button"
					className="editor-page__btn editor-page__btn--primary"
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? "Speichern..." : "Speichern"}
				</button>
				<button
					type="button"
					className="editor-page__btn"
					onClick={handleCancel}
					disabled={saving}
				>
					Abbrechen
				</button>
			</div>
		</div>
	);
}
