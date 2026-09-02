import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { cancel } from "@ember/runloop";
import loadingSpinner from "discourse/helpers/loading-spinner";
import discourseDebounce from "discourse/lib/debounce";
import { generateDiagram } from "./mermaid-diagram";

const DEBOUNCE_MS = 500;

/**
 * Renders a mermaid `code_block`'s source in the rich editor, registered
 * through the editor's `codeBlockPreviews` extension field.
 *
 * The first render is immediate; renders for a changed `@source` are
 * debounced, and a render that resolves after a newer request is discarded.
 */
export default class MermaidPreview extends Component {
  @tracked rendered;

  #lastRequested;
  #run = 0;
  #timer;

  constructor() {
    super(...arguments);
    this.#schedule(this.args.source, true);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    cancel(this.#timer);
    this.#run++;
  }

  get diagram() {
    this.#schedule(this.args.source);
    return this.rendered;
  }

  #schedule(source, immediate = false) {
    if (source === this.#lastRequested) {
      return;
    }

    this.#lastRequested = source;
    this.#timer = discourseDebounce(
      this,
      this.#render,
      source,
      immediate ? 0 : DEBOUNCE_MS
    );
  }

  async #render(source) {
    const run = ++this.#run;

    try {
      const svg = await generateDiagram(source);

      if (run === this.#run && !this.isDestroying) {
        this.rendered = { svg };
      }
    } catch (error) {
      if (run === this.#run && !this.isDestroying) {
        this.rendered = { error };
      }
    }
  }

  <template>
    <div class="mermaid-preview mermaid-diagram">
      {{#if this.diagram.svg}}
        {{this.diagram.svg}}
      {{else if this.diagram.error}}
        <div class="alert alert-error">{{this.diagram.error.message}}</div>
      {{else}}
        {{loadingSpinner}}
      {{/if}}
    </div>
  </template>
}
