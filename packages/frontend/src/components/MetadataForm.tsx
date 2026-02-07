export interface RecipeMetadata {
	timeRequired: string;
	course: string;
	servings: string;
}

interface MetadataFormProps {
	name: string;
	onNameChange: (name: string) => void;
	isNew: boolean;
	metadata: RecipeMetadata;
	onMetadataChange: (metadata: RecipeMetadata) => void;
}

const COURSE_OPTIONS = ["", "dinner", "dessert", "dip"];

export function MetadataForm({
	name,
	onNameChange,
	isNew,
	metadata,
	onMetadataChange,
}: MetadataFormProps) {
	const isCustomCourse =
		metadata.course !== "" && !COURSE_OPTIONS.includes(metadata.course);

	function handleCourseSelect(value: string) {
		if (value === "__custom") {
			onMetadataChange({ ...metadata, course: "" });
		} else {
			onMetadataChange({ ...metadata, course: value });
		}
	}

	return (
		<div className="metadata-form">
			{isNew && (
				<label className="metadata-form__field">
					<span className="metadata-form__label">Rezeptname</span>
					<input
						type="text"
						className="metadata-form__input"
						value={name}
						onChange={(e) => onNameChange(e.target.value)}
						placeholder="z.B. Spaghetti Bolognese"
						required
					/>
				</label>
			)}

			<div className="metadata-form__row">
				<label className="metadata-form__field">
					<span className="metadata-form__label">Zubereitungszeit</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.timeRequired}
						onChange={(e) =>
							onMetadataChange({ ...metadata, timeRequired: e.target.value })
						}
						placeholder="z.B. 30 Minuten"
					/>
				</label>

				<div className="metadata-form__field">
					<label className="metadata-form__label" htmlFor="metadata-course">
						Gang
					</label>
					{isCustomCourse ? (
						<input
							id="metadata-course"
							type="text"
							className="metadata-form__input"
							value={metadata.course}
							onChange={(e) =>
								onMetadataChange({ ...metadata, course: e.target.value })
							}
							placeholder="z.B. Vorspeise"
						/>
					) : (
						<select
							id="metadata-course"
							className="metadata-form__input"
							value={
								COURSE_OPTIONS.includes(metadata.course)
									? metadata.course
									: "__custom"
							}
							onChange={(e) => handleCourseSelect(e.target.value)}
						>
							<option value="">-- Kein Gang --</option>
							<option value="dinner">Dinner</option>
							<option value="dessert">Dessert</option>
							<option value="dip">Dip</option>
							<option value="__custom">Eigener...</option>
						</select>
					)}
				</div>

				<label className="metadata-form__field">
					<span className="metadata-form__label">Portionen</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.servings}
						onChange={(e) =>
							onMetadataChange({ ...metadata, servings: e.target.value })
						}
						placeholder="z.B. 4"
					/>
				</label>
			</div>
		</div>
	);
}
