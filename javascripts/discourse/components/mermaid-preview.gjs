import MermaidDiagram from "./mermaid-diagram";

// Renders a mermaid `code_block`'s source in the rich editor, registered
// through the editor's `codeBlockPreviews` extension field. MermaidDiagram
// derives its render from `@src`, so a changed source re-renders on its own.
export default <template><MermaidDiagram @src={{@source}} /></template>
