import * as Popover from "@radix-ui/react-popover";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export function EquipmentComponent({ node, updateAttributes }: NodeViewProps) {
	const { name } = node.attrs;
	const [open, setOpen] = useState(false);
	const [editName, setEditName] = useState(name as string);

	const handleSave = () => {
		updateAttributes({ name: editName });
		setOpen(false);
	};

	return (
		<NodeViewWrapper as="span" className="equipment-chip">
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<span className="equipment-chip__label">{name || "Equipment"}</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content className="popover-content" sideOffset={5}>
						<div className="popover-form">
							<label>
								Name
								<input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder="z.B. Topf"
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
