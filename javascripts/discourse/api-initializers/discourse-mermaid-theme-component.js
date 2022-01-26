import Session from "discourse/models/session";
import loadScript from "discourse/lib/load-script";
import { apiInitializer } from "discourse/lib/api";
import I18n from "I18n";

export default apiInitializer("0.11.1", (api) => {
  api.addToolbarPopupMenuOptionsCallback(() => {
    return {
      action: "insertMermaidSample",
      icon: "project-diagram",
      label: themePrefix("insert_mermaid_sample"),
    };
  });

  // this is a hack as applySurround expects a top level
  // composer key, not possible from a theme
  window.I18n.translations[
    window.I18n.locale
  ].js.composer.mermaid_sample = `    flowchart
         A --> B`;

  api.modifyClass("controller:composer", {
    pluginId: "discourse-mermaid-theme-component",
    actions: {
      insertMermaidSample() {
        this.toolbarEvent.applySurround(
          "\n" + `[wrap="mermaid"]` + "\n",
          "\n[/wrap]\n",
          "mermaid_sample",
          { multiline: false }
        );
      },
    },
  });

  api.decorateCookedElement(
    async (elem, helper) => {
      const mermaids = elem.querySelectorAll(
        "[data-wrap=mermaid]:not([data-processed=true])"
      );

      if (!mermaids.length) {
        return;
      }

      mermaids.forEach((mermaid) => {
        mermaid.style.height = `${mermaid.dataset.height || 400}px`;

        const spinner = document.createElement("div");
        spinner.classList.add("spinner");
        mermaid.append(spinner);
      });

      await loadScript("https://unpkg.com/mermaid@8.13.10/dist/mermaid.min.js");

      window.mermaid.initialize({
        startOnLoad: false,
        theme: Session.current().userDarkSchemeId > 0 ? "dark" : "default",
      });

      mermaids.forEach((mermaid, index) => {
        try {
          const content = mermaid.querySelector("code")?.textContent;

          if (!content) {
            throw "invalid content";
          }

          if (window.mermaid.parse(content)) {
            let key = helper ? `post_${helper.getModel().id}` : "composer";
            window.mermaid.mermaidAPI.render(
              `mermaid_${index}_${key}`,
              content,
              (svg) => {
                mermaid.innerHTML = svg;
              }
            );
          }
        } catch (e) {
          mermaid.innerHTML = `<span class="mermaid-error">${I18n.t(
            themePrefix("rendering_error")
          )}</span>`;
        } finally {
          mermaid.dataset.processed = true;
          mermaid.querySelector(".spinner")?.remove();
        }
      });
    },
    { id: "discourse-mermaid-theme-component" }
  );
});
