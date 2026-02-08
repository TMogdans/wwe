import * as Popover from "@radix-ui/react-popover";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export function RecipeRefComponent({ node, updateAttributes }: NodeViewProps) {
	const { ref, amount, unit } = node.attrs;
	const [open, setOpen] = useState(false);
	const [editRef, setEditRef] = useState(ref as string);
	const [editAmount, setEditAmount] = useState(amount as string);
	const [editUnit, setEditUnit] = useState(unit as string);

	const refName = (ref as string).replace(/^\.\//, "").split("/").pop() ?? ref;
	const displayText = [amount, unit, refName].filter(Boolean).join(" ");

	const handleSave = () => {
		updateAttributes({
			ref: editRef,
			amount: editAmount,
			unit: editUnit,
		});
		setOpen(false);
	};

	return (
		<NodeViewWrapper as="span" className="recipe-ref-chip">
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<span className="recipe-ref-chip__label">
						{displayText || "Rezept-Referenz"}
					</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content className="popover-content" sideOffset={5}>
						<div className="popover-form">
							<label>
								Rezept-Pfad
								<input
									value={editRef}
									onChange={(e) => setEditRef(e.target.value)}
									placeholder="z.B. ./sauces/Hollandaise"
								/>
							</label>
							<label>
								Menge
								<input
									value={editAmount}
									onChange={(e) => setEditAmount(e.target.value)}
									placeholder="z.B. 150"
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
