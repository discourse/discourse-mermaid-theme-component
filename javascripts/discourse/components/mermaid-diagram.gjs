import Component from "@glimmer/component";
import { cached, tracked } from "@glimmer/tracking";
import { on } from "@ember/modifier";
import { action } from "@ember/object";
import { htmlSafe } from "@ember/template";
import concatClass from "discourse/helpers/concat-class";
import loadingSpinner from "discourse/helpers/loading-spinner";
import loadScript from "discourse/lib/load-script";

// Todo: move to ember-async-data if/when core adopts it
class TrackedPromise {
  @tracked isResolved = false;
  @tracked isRejected = false;
  @tracked isPending = true;
  @tracked value = null;
  @tracked error = null;

  constructor(promise) {
    promise
      .then((value) => {
        this.isResolved = true;
        this.isPending = false;
        this.value = value;
      })
      .catch((error) => {
        this.isRejected = true;
        this.isPending = false;
        this.error = error;
      });
  }
}

let loaded = false;

async function loadMermaid() {
  await loadScript(settings.theme_uploads_local.mermaid_js);

  if (loaded) {
    return;
  }
  loaded = true;
  window.mermaid.initialize({
    startOnLoad: false,
    theme:
      getComputedStyle(document.body)
        .getPropertyValue("--scheme-type")
        .trim() === "dark"
        ? "dark"
        : "default",
  });
}

let i = 0;

export async function generateDiagram(source) {
  await loadMermaid();
  i++;
  return window.mermaid
    .render(`mermaid-diagram-${i}`, source)
    .then((result) => htmlSafe(result.svg));
}

export default class MermaidDiagram extends Component {
  @tracked zoomed = false;

  @cached
  get mermaidDiagram() {
    const src = this.args.src;
    return new TrackedPromise(generateDiagram(src));
  }

  @action
  toggleZoom(event) {
    event.preventDefault();
    if (!this.args.enableZoom) {
      return;
    }
    this.zoomed = !this.zoomed;
  }

  <template>
    {{! template-lint-disable no-invalid-interactive }}
    <div
      class={{concatClass
        "mermaid-diagram"
        (if @enableZoom "zoomable")
        (if this.zoomed "zoomed")
      }}
      {{on "click" this.toggleZoom}}
    >
      {{#if this.mermaidDiagram.isPending}}
        {{loadingSpinner}}
      {{else if this.mermaidDiagram.isResolved}}
        {{this.mermaidDiagram.value}}
      {{else if this.mermaidDiagram.isRejected}}
        <div
          class="alert alert-error"
        >{{this.mermaidDiagram.error.message}}</div>
      {{/if}}
    </div>
  </template>
}
