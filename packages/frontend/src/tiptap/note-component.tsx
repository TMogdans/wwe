import {
	NodeViewContent,
	type NodeViewProps,
	NodeViewWrapper,
} from "@tiptap/react";

export function NoteComponent(_props: NodeViewProps) {
	return (
		<NodeViewWrapper className="note-block">
			<NodeViewContent />
		</NodeViewWrapper>
	);
}
