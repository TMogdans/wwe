export interface RecipeMetadata {
	timeRequired: string;
	course: string;
	servings: string;
	tags: string;
	source: string;
	author: string;
	prepTime: string;
	cookTime: string;
	difficulty: string;
	cuisine: string;
	diet: string;
	description: string;
}

interface MetadataFormProps {
	name: string;
	onNameChange: (name: string) => void;
	isNew: boolean;
	metadata: RecipeMetadata;
	onMetadataChange: (metadata: RecipeMetadata) => void;
	courseOptions: string[];
}

export function MetadataForm({
	name,
	onNameChange,
	isNew,
	metadata,
	onMetadataChange,
	courseOptions,
}: MetadataFormProps) {
	const isCustomCourse =
		metadata.course !== "" && !courseOptions.includes(metadata.course);

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

			<div className="metadata-form__row metadata-form__row--3">
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
								courseOptions.includes(metadata.course)
									? metadata.course
									: "__custom"
							}
							onChange={(e) => handleCourseSelect(e.target.value)}
						>
							<option value="">-- Kein Gang --</option>
							{courseOptions.map((course) => (
								<option key={course} value={course}>
									{course.charAt(0).toUpperCase() + course.slice(1)}
								</option>
							))}
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

			<div className="metadata-form__row metadata-form__row--3">
				<label className="metadata-form__field">
					<span className="metadata-form__label">Vorbereitungszeit</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.prepTime}
						onChange={(e) =>
							onMetadataChange({ ...metadata, prepTime: e.target.value })
						}
						placeholder="z.B. 15 Minuten"
					/>
				</label>

				<label className="metadata-form__field">
					<span className="metadata-form__label">Kochzeit</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.cookTime}
						onChange={(e) =>
							onMetadataChange({ ...metadata, cookTime: e.target.value })
						}
						placeholder="z.B. 30 Minuten"
					/>
				</label>

				<label className="metadata-form__field">
					<span className="metadata-form__label">Schwierigkeit</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.difficulty}
						onChange={(e) =>
							onMetadataChange({ ...metadata, difficulty: e.target.value })
						}
						placeholder="z.B. einfach"
					/>
				</label>
			</div>

			<div className="metadata-form__row metadata-form__row--3">
				<label className="metadata-form__field">
					<span className="metadata-form__label">Küche</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.cuisine}
						onChange={(e) =>
							onMetadataChange({ ...metadata, cuisine: e.target.value })
						}
						placeholder="z.B. Italienisch"
					/>
				</label>

				<label className="metadata-form__field">
					<span className="metadata-form__label">Ernährungsform</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.diet}
						onChange={(e) =>
							onMetadataChange({ ...metadata, diet: e.target.value })
						}
						placeholder="z.B. vegetarisch"
					/>
				</label>

				<label className="metadata-form__field">
					<span className="metadata-form__label">Tags</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.tags}
						onChange={(e) =>
							onMetadataChange({ ...metadata, tags: e.target.value })
						}
						placeholder="z.B. schnell, einfach"
					/>
				</label>
			</div>

			<div className="metadata-form__row metadata-form__row--2">
				<label className="metadata-form__field">
					<span className="metadata-form__label">Quelle</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.source}
						onChange={(e) =>
							onMetadataChange({ ...metadata, source: e.target.value })
						}
						placeholder="z.B. https://example.com"
					/>
				</label>

				<label className="metadata-form__field">
					<span className="metadata-form__label">Autor</span>
					<input
						type="text"
						className="metadata-form__input"
						value={metadata.author}
						onChange={(e) =>
							onMetadataChange({ ...metadata, author: e.target.value })
						}
						placeholder="z.B. Max Mustermann"
					/>
				</label>
			</div>

			<div className="metadata-form__row metadata-form__row--1">
				<label className="metadata-form__field">
					<span className="metadata-form__label">Beschreibung</span>
					<textarea
						className="metadata-form__input metadata-form__textarea"
						value={metadata.description}
						onChange={(e) =>
							onMetadataChange({ ...metadata, description: e.target.value })
						}
						placeholder="Kurze Beschreibung des Rezepts"
						rows={2}
					/>
				</label>
			</div>
		</div>
	);
}
