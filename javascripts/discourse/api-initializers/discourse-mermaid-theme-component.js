import loadScript from "discourse/lib/load-script";
import { apiInitializer } from "discourse/lib/api";

async function applyMermaid(element, key = "composer") {
  const mermaids = element.querySelectorAll("pre[data-code-wrap=mermaid]");

  if (!mermaids.length) {
    return;
  }

  await loadScript("https://unpkg.com/mermaid@8.13.10/dist/mermaid.min.js");

  window.mermaid.initialize({
    startOnLoad: false,
    theme:
      getComputedStyle(document.body)
        .getPropertyValue("--scheme-type")
        .trim() === "dark"
        ? "dark"
        : "default",
  });

  mermaids.forEach((mermaid) => {
    const spinner = document.createElement("div");
    spinner.classList.add("spinner");

    if (mermaid.dataset.codeHeight) {
      mermaid.style.height = `${mermaid.dataset.codeHeight}px`;
    }

    mermaid.append(spinner);
  });

  mermaids.forEach((mermaid, index) => {
    const code = mermaid.querySelector("code");

    if (!code) {
      return;
    }

    try {
      if (window.mermaid.parse(code.textContent || "")) {
        key = key || "composer";
        window.mermaid.mermaidAPI.render(
          `mermaid_${index}_${key}`,
          code.textContent || "",
          (svg) => {
            mermaid.innerHTML = svg;
          }
        );
      }
    } catch (e) {
      mermaid.innerHTML = `<span class="mermaid-error">${e?.str || e}</span>`;
    } finally {
      mermaid.dataset.processed = true;
      mermaid.querySelector(".spinner")?.remove();
    }
  });
}

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
          "\n```mermaid\n",
          "\n```\n",
          "mermaid_sample",
          { multiline: false }
        );
      },
    },
  });

  if (api.decorateChatMessage) {
    api.decorateChatMessage((message) => {
      applyMermaid(message, `chat_message_${message.id}`);
    });
  }

  api.decorateCookedElement(
    async (elem, helper) => {
      const id = helper ? `post_${helper.getModel().id}` : "composer";
      applyMermaid(elem, id);
    },
    { id: "discourse-mermaid-theme-component" }
  );
});
