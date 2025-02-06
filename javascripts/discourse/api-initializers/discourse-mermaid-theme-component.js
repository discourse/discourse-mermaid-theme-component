import { apiInitializer } from "discourse/lib/api";
import discourseDebounce from "discourse/lib/debounce";
import loadScript from "discourse/lib/load-script";

async function applyMermaid(element, key = "composer", container) {
  const mermaids = element.querySelectorAll("pre[data-code-wrap=mermaid]");

  if (!mermaids.length) {
    return;
  }

  await loadScript(settings.theme_uploads_local.mermaid_js);

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
    if (mermaid.dataset.processed) {
      return;
    }

    const spinner = document.createElement("div");
    spinner.classList.add("spinner");

    if (mermaid.dataset.codeHeight && key !== "composer") {
      mermaid.style.height = `${mermaid.dataset.codeHeight}px`;
    }

    mermaid.append(spinner);
  });

  mermaids.forEach((mermaid, index) => {
    const code = mermaid.querySelector("code");

    if (!code) {
      return;
    }

    const mermaidId = `mermaid_${index}_${key}`;
    const promise = window.mermaid.render(mermaidId, code.textContent || "");
    promise
      .then((object) => {
        mermaid.innerHTML = object.svg;
      })
      .catch((e) => {
        mermaid.innerText = e?.message || e;
        // mermaid injects an error element, we need to remove it
        document.getElementById(mermaidId)?.remove();
      })
      .finally(() => {
        mermaid.dataset.processed = true;
        mermaid.querySelector(".spinner")?.remove();
      });

    if (key === "composer") {
      discourseDebounce(updateMarkdownHeight, mermaid, index, container, 500);
    }
  });
}

function updateMarkdownHeight(mermaid, index, container) {
  const appEvents = container.lookup("service:app-events");
  const composer = container.lookup("service:composer");

  let height = parseInt(mermaid.getBoundingClientRect().height, 10);
  let calculatedHeight = parseInt(mermaid.dataset.calculatedHeight, 10);

  if (height === 0) {
    return;
  }

  if (height !== calculatedHeight) {
    mermaid.dataset.calculatedHeight = height;

    const regex = /```mermaid((\s*)|.*auto)$/gm;
    const existing = [...composer.model.reply.matchAll(regex)][index]?.[0];

    appEvents.trigger(
      `composer:replace-text`,
      existing,
      "```mermaid height=" + height + ",auto",
      { regex, index }
    );
  }
}

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

  if (api.decorateChatMessage) {
    api.decorateChatMessage((element) => {
      applyMermaid(element, `chat_message_${element.id}`, api.container);
    });
  }

  api.decorateCookedElement(
    async (elem, helper) => {
      const id = helper ? `post_${helper.getModel().id}` : "composer";
      applyMermaid(elem, id, api.container);
    },
    { id: "discourse-mermaid-theme-component" }
  );
});
