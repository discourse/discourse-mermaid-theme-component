import Component from "@glimmer/component";
import { action } from "@ember/object";
import { service } from "@ember/service";
import DButton from "discourse/components/d-button";
import MermaidDiagram from "./mermaid-diagram";
import MermaidFullscreen from "./mermaid-fullscreen";

export default class MermaidInline extends Component {
  @service modal;

  @action
  fullscreen() {
    this.modal.show(MermaidFullscreen, {
      model: {
        src: this.args.data.src,
      },
    });
  }

  <template>
    <div class="mermaid-diagram-controls">
      <DButton
        @icon="discourse-expand"
        class="btn-flat"
        @action={{this.fullscreen}}
      />
    </div>

    <MermaidDiagram @src={{@data.src}} />
  </template>
}
