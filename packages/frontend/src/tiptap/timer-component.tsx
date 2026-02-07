import * as Popover from "@radix-ui/react-popover";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export function TimerComponent({ node, updateAttributes }: NodeViewProps) {
	const { name, duration, unit } = node.attrs;
	const [open, setOpen] = useState(false);
	const [editName, setEditName] = useState(name as string);
	const [editDuration, setEditDuration] = useState(duration as string);
	const [editUnit, setEditUnit] = useState(unit as string);

	const displayText = [duration, unit, name].filter(Boolean).join(" ");

	const handleSave = () => {
		updateAttributes({
			name: editName,
			duration: editDuration,
			unit: editUnit,
		});
		setOpen(false);
	};

	return (
		<NodeViewWrapper as="span" className="timer-chip">
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<span className="timer-chip__label">{displayText || "Timer"}</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content className="popover-content" sideOffset={5}>
						<div className="popover-form">
							<label>
								Name
								<input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder="z.B. braten"
								/>
							</label>
							<label>
								Dauer
								<input
									value={editDuration}
									onChange={(e) => setEditDuration(e.target.value)}
									placeholder="z.B. 10"
								/>
							</label>
							<label>
								Einheit
								<input
									value={editUnit}
									onChange={(e) => setEditUnit(e.target.value)}
									placeholder="z.B. Minuten"
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
