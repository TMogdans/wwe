import type { Editor } from "@tiptap/core";

interface EditorToolbarProps {
	editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
	function insertIngredient() {
		editor
			?.chain()
			.focus()
			.insertIngredient({ name: "", amount: "", unit: "" })
			.run();
	}

	function insertTimer() {
		editor
			?.chain()
			.focus()
			.insertTimer({ name: "", duration: "", unit: "" })
			.run();
	}

	function insertEquipment() {
		editor?.chain().focus().insertEquipment({ name: "" }).run();
	}

	function insertComment() {
		editor?.chain().focus().insertComment({ value: "" }).run();
	}

	function insertNote() {
		editor?.chain().focus().setNote().run();
	}

	return (
		<div className="editor-toolbar">
			<div className="editor-toolbar__buttons">
				<button
					type="button"
					className="editor-toolbar__btn editor-toolbar__btn--ingredient"
					onClick={insertIngredient}
					disabled={!editor}
				>
					Zutat
				</button>
				<button
					type="button"
					className="editor-toolbar__btn editor-toolbar__btn--timer"
					onClick={insertTimer}
					disabled={!editor}
				>
					Timer
				</button>
				<button
					type="button"
					className="editor-toolbar__btn editor-toolbar__btn--equipment"
					onClick={insertEquipment}
					disabled={!editor}
				>
					Equipment
				</button>
				<button
					type="button"
					className="editor-toolbar__btn editor-toolbar__btn--comment"
					onClick={insertComment}
					disabled={!editor}
				>
					Kommentar
				</button>
				<button
					type="button"
					className="editor-toolbar__btn editor-toolbar__btn--note"
					onClick={insertNote}
					disabled={!editor}
				>
					Notiz
				</button>
			</div>
			<p className="editor-toolbar__hint">
				Tipp: Tippe /zutat, /timer, /equipment, /kommentar oder /notiz um
				schnell einzufuegen
			</p>
		</div>
	);
}
