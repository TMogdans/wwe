import * as Popover from "@radix-ui/react-popover";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export function IngredientComponent({ node, updateAttributes }: NodeViewProps) {
	const { name, amount, unit, preparation } = node.attrs;
	const [open, setOpen] = useState(false);
	const [editName, setEditName] = useState(name as string);
	const [editAmount, setEditAmount] = useState(amount as string);
	const [editUnit, setEditUnit] = useState(unit as string);
	const [editPreparation, setEditPreparation] = useState(preparation as string);

	const displayText = [amount, unit, name].filter(Boolean).join(" ");
	const displayWithPrep = preparation
		? `${displayText} (${preparation})`
		: displayText;

	const handleSave = () => {
		updateAttributes({
			name: editName,
			amount: editAmount,
			unit: editUnit,
			preparation: editPreparation,
		});
		setOpen(false);
	};

	return (
		<NodeViewWrapper as="span" className="ingredient-chip">
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<span className="ingredient-chip__label">
						{displayWithPrep || "Zutat"}
					</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content className="popover-content" sideOffset={5}>
						<div className="popover-form">
							<label>
								Name
								<input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder="z.B. Hackfleisch"
								/>
							</label>
							<label>
								Menge
								<input
									value={editAmount}
									onChange={(e) => setEditAmount(e.target.value)}
									placeholder="z.B. 500"
								/>
							</label>
							<label>
								Einheit
								<input
									value={editUnit}
									onChange={(e) => setEditUnit(e.target.value)}
									placeholder="z.B. g"
								/>
							</label>
							<label>
								Zubereitung
								<input
									value={editPreparation}
									onChange={(e) => setEditPreparation(e.target.value)}
									placeholder="z.B. fein gewürfelt"
								/>
							</label>
							<button type="button" onClick={handleSave}>
								Speichern
							</button>
						</div>
						<Popover.Arrow className="popover-arrow" />
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		</NodeViewWrapper>
	);
}
