import * as Popover from "@radix-ui/react-popover";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export function CommentComponent({ node, updateAttributes }: NodeViewProps) {
	const { value } = node.attrs;
	const [open, setOpen] = useState(false);
	const [editValue, setEditValue] = useState(value as string);

	const handleSave = () => {
		updateAttributes({ value: editValue });
		setOpen(false);
	};

	return (
		<NodeViewWrapper as="span" className="comment-chip">
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<span className="comment-chip__label">{value || "Kommentar"}</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content className="popover-content" sideOffset={5}>
						<div className="popover-form">
							<label>
								Kommentar
								<textarea
									value={editValue}
									onChange={(e) => setEditValue(e.target.value)}
									placeholder="Kommentartext eingeben..."
									rows={3}
									style={{
										padding: "0.5rem",
										border: "1px solid var(--color-border)",
										borderRadius: "4px",
										fontSize: "0.875rem",
										fontFamily: "inherit",
										resize: "vertical",
									}}
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
