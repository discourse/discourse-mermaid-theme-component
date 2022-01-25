import Session from "discourse/models/session";
import loadScript from "discourse/lib/load-script";
import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.11.1", (api) => {
  api.decorateCookedElement(async (elem) => {
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

    mermaids.forEach((mermaid) => {
      window.mermaid.mermaidAPI.render(
        "graphDiv",
        mermaid.innerText,
        (svgCode) => {
          mermaid.dataset.processed = true;
          mermaid.innerHTML = svgCode;
        }
      );
    });
  });
});
