import { apiInitializer } from "discourse/lib/api";
import { generateDiagram } from "../components/mermaid-diagram";
import MermaidInline from "../components/mermaid-inline";

function applyMermaid(mermaidPre, helper) {
  const mermaidSrc = mermaidPre.querySelector("code")?.textContent;
  if (!mermaidSrc) {
    return;
  }

  const mermaidWrapper = document.createElement("div");
  mermaidWrapper.classList.add("mermaid-wrapper");

  if (helper?.renderGlimmer) {
    helper.renderGlimmer(mermaidWrapper, MermaidInline, {
      src: mermaidSrc,
    });
    mermaidPre.replaceWith(mermaidWrapper);
  } else {
    // Legacy support for parts of core which cannot renderGlimmer. No fullscreen support
    mermaidPre.replaceChildren(mermaidWrapper);

    const mermaidDiagram = document.createElement("div");
    mermaidDiagram.classList.add("mermaid-diagram");
    mermaidDiagram.innerHTML = "<div class='spinner'></div>";
    mermaidWrapper.appendChild(mermaidDiagram);

    generateDiagram(mermaidSrc)
      .then((svg) => {
        mermaidDiagram.innerHTML = svg;
      })
      .catch((error) => {
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("alert", "alert-error");
        errorDiv.textContent = error.message;
        mermaidDiagram.replaceChildren(errorDiv);
      });
  }
}

export default apiInitializer("1.13.0", (api) => {
  // this is a hack as applySurround expects a top level
  // composer key, not possible from a theme
  window.I18n.translations[window.I18n.locale].js.composer.mermaid_sample =
    `    flowchart
         A --> B`;

  api.addComposerToolbarPopupMenuOption({
    icon: "diagram-project",
    label: themePrefix("insert_mermaid_sample"),
    action: (toolbarEvent) => {
      toolbarEvent.applySurround(
        "\n```mermaid\n",
        "\n```\n",
        "mermaid_sample",
        { multiline: false }
      );
    },
  });

  if (api.decorateChatMessage) {
    api.decorateChatMessage((element) => {
      element
        .querySelectorAll("pre[data-code-wrap=mermaid]")
        .forEach((mermaidPre, helper) => applyMermaid(mermaidPre, helper));
    });
  }

  api.decorateCookedElement((element, helper) => {
    element
      .querySelectorAll("pre[data-code-wrap=mermaid]")
      .forEach((mermaidPre) => applyMermaid(mermaidPre, helper));
  });
});
