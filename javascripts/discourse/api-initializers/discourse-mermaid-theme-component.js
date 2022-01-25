import Session from "discourse/models/session";
import loadScript from "discourse/lib/load-script";
import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.11.1", (api) => {
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
        const key = helper ? `post_${helper.getModel().id}` : "composer";

        window.mermaid.mermaidAPI.render(
          `mermaid_${index}_${key}`,
          mermaid.innerText,
          (svgCode) => {
            mermaid.dataset.processed = true;
            mermaid.innerHTML = svgCode;
          }
        );
      });
    },
    { id: "discourse-mermaid-theme-component" }
  );
});
