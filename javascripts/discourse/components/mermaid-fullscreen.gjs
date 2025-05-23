import DModal from "discourse/components/d-modal";
import MermaidDiagram from "./mermaid-diagram";

const MermaidFullscreen = <template>
  <DModal @closeModal={{@closeModal}} class="mermaid-fullscreen">
    <MermaidDiagram @src={{@model.src}} @enableZoom={{true}} />
  </DModal>
</template>;

export default MermaidFullscreen;
