import { apiInitializer } from "discourse/lib/api";
import MermaidInline from "../components/mermaid-inline";

export default apiInitializer("1.13.0", (api) => {
  // this is a hack as applySurround expects a top level
  // composer key, not possible from a theme
  window.I18n.translations[
    window.I18n.locale
  ].js.composer.mermaid_sample = `    flowchart
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

  // if (api.decorateChatMessage) {
  //   api.decorateChatMessage((element) => {
  //     applyMermaid(element, `chat_message_${element.id}`, api.container);
  //   });
  // }

  api.decorateCookedElement((element, helper) => {
    element
      .querySelectorAll("pre[data-code-wrap=mermaid]")
      .forEach((mermaidPre) => {
        if (!helper.renderGlimmer) {
          return; // TODO
        }

        const mermaidSrc = mermaidPre.querySelector("code")?.textContent;
        if (!mermaidSrc) {
          return;
        }
        const mermaidWrapper = document.createElement("div");
        mermaidWrapper.classList.add("mermaid-wrapper");
        helper.renderGlimmer(mermaidWrapper, MermaidInline, {
          src: mermaidSrc,
        });
        mermaidPre.replaceWith(mermaidWrapper);
      });
  });
});
