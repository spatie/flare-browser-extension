(() => {
  const extensionApi = globalThis.browser || globalThis.chrome;
  const actionClass = "flare-extension-action";
  const menuClass = "flare-extension-menu";
  const flareUrl = "https://flareapp.io/";
  const mark = `
    <svg class="flare-extension-mark" viewBox="0 0 42 64" fill="none" aria-hidden="true">
      <path fill="url(#flare-extension-green-side)" d="M13.73 31.985 0 23.997V7.99l13.82 8.047-.088 15.948h-.002Z"/>
      <path fill="url(#flare-extension-green-top)" d="M27.46 23.968 0 7.99 13.73 0l27.52 15.977-13.79 7.99Z"/>
      <path fill="url(#flare-extension-purple-side)" d="M13.73 64 0 56.01V40.032l13.7 7.99L13.73 64Z"/>
      <path fill="url(#flare-extension-purple-top)" d="M13.7 48.023 0 40.033l13.73-8.017 13.76 8.017-13.79 7.99Z"/>
      <defs>
        <linearGradient id="flare-extension-green-side" x1="6.91" x2="6.91" y1="26.18" y2="2.182" gradientUnits="userSpaceOnUse"><stop stop-color="#48B987"/><stop offset="1" stop-color="#137449"/></linearGradient>
        <linearGradient id="flare-extension-green-top" x1="20.625" x2="20.625" y1="9.015" y2="32.983" gradientUnits="userSpaceOnUse"><stop stop-color="#66FFBC"/><stop offset="1" stop-color="#218E5E"/></linearGradient>
        <linearGradient id="flare-extension-purple-side" x1="6.865" x2="6.865" y1="58.192" y2="34.197" gradientUnits="userSpaceOnUse"><stop stop-color="#A189F2"/><stop offset="1" stop-color="#3F00F5"/></linearGradient>
        <linearGradient id="flare-extension-purple-top" x1="13.745" x2="13.745" y1="23.498" y2="39.506" gradientUnits="userSpaceOnUse"><stop stop-color="#BBADFA"/><stop offset="1" stop-color="#9275F4"/></linearGradient>
      </defs>
    </svg>`;
  const chevron = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const icons = {
    errors: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M10 6v4m0 3h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    performance: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3.5 4v11.5c0 .6.4 1 1 1H16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="m6 12 3-3 2.5 2 3.5-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    logs: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="4" y="2.75" width="12" height="14.5" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    settings: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 7v6M7 10h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  function svg(source) {
    const namespaced = source.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    return document.importNode(new DOMParser().parseFromString(namespaced, "image/svg+xml").documentElement, true);
  }

  let queued = false;
  let markId = 0;
  let resolvedProject;
  let resolveGeneration = 0;
  let retryTimer;
  let view = { kind: "loading" };
  let hideUnmatchedAction = false;
  let activeMenu;
  const instances = new WeakMap();

  function cloudProject() {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return "";
    try {
      return decodeURIComponent(parts[1]);
    } catch {
      return "";
    }
  }

  function createProjectUrl(project) {
    const url = new URL("/projects", flareUrl);
    url.searchParams.set("new-project", "1");
    url.searchParams.set("name", project);
    url.searchParams.set("technology", "Laravel");
    return url.href;
  }

  function closeMenu(restoreFocus = false) {
    if (!activeMenu) return;
    activeMenu.menu.hidden = true;
    activeMenu.trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && activeMenu.trigger.isConnected) activeMenu.trigger.focus();
    activeMenu = undefined;
  }

  function positionMenu(instance) {
    const rect = instance.wrap.getBoundingClientRect();
    const menuRect = instance.menu.getBoundingClientRect();
    const top = rect.bottom + 8 + menuRect.height <= innerHeight - 8
      ? rect.bottom + 8
      : Math.max(8, rect.top - menuRect.height - 8);
    const left = Math.max(8, Math.min(rect.right - menuRect.width, innerWidth - menuRect.width - 8));
    instance.menu.style.top = `${Math.round(top)}px`;
    instance.menu.style.left = `${Math.round(left)}px`;
  }

  function openMenu(instance, focusFirst = false) {
    closeMenu();
    instance.menu.hidden = false;
    instance.trigger.setAttribute("aria-expanded", "true");
    activeMenu = instance;
    positionMenu(instance);
    if (focusFirst) instance.menu.querySelector('[role="menuitem"]')?.focus();
  }

  function openSettings() {
    Promise.resolve(extensionApi.runtime.sendMessage({ type: "flare-open-settings" })).catch(() => {});
  }

  function addMenuItem(menu, item) {
    const element = document.createElement(item.href ? "a" : "button");
    element.className = "flare-extension-menu-item";
    element.setAttribute("role", "menuitem");
    if (item.href) {
      element.href = item.href;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    } else {
      element.type = "button";
      element.addEventListener("click", () => {
        closeMenu();
        if (item.action === "settings") openSettings();
        if (item.action === "retry") {
          resolvedProject = undefined;
          resolveProject();
        }
      });
    }
    const label = document.createElement("span");
    label.textContent = item.label;
    element.append(svg(icons[item.icon]), label);
    menu.append(element);
  }

  function updateMenu(instance) {
    const menu = instance.menu;
    menu.replaceChildren();
    let copy;
    let items;
    if (view.kind === "matched") {
      items = [
        { label: "Errors", icon: "errors", href: view.errorsUrl },
        { label: "Performance", icon: "performance", href: view.performanceUrl },
        { label: "Logs", icon: "logs", href: view.logsUrl },
      ];
    } else if (view.kind === "setup") {
      copy = "No matching Flare project exists yet. Create one for this Laravel Cloud project.";
      items = [{ label: "Create Flare project", icon: "settings", href: view.createUrl }];
    } else if (view.kind === "disconnected") {
      copy = "Connect your Flare account to open matching projects directly.";
      items = [{ label: "Connect to Flare", icon: "settings", action: "settings" }];
    } else {
      copy = view.kind === "loading" ? "Finding a matching Flare project…" : "Flare could not check this project right now.";
      items = [
        { label: "Try again", icon: "settings", action: "retry" },
        { label: "Open Flare", icon: "errors", href: flareUrl },
      ];
    }
    if (copy) {
      const description = document.createElement("p");
      description.className = "flare-extension-menu-copy";
      description.textContent = copy;
      menu.append(description);
    }
    items.forEach((item) => addMenuItem(menu, item));
  }

  function render(instance) {
    const hidden = hideUnmatchedAction && view.kind === "setup";
    if (hidden && activeMenu === instance) closeMenu();
    instance.wrap.hidden = hidden;
    const key = [view.kind, view.errorsUrl, view.performanceUrl, view.logsUrl, view.createUrl].join(":");
    if (instance.wrap.dataset.renderKey === key) return;
    if (activeMenu === instance) closeMenu();
    instance.wrap.dataset.renderKey = key;
    instance.wrap.dataset.state = view.kind;
    const label = view.kind === "setup" ? "Set up Flare" : "Flare";
    instance.label.textContent = label;
    const title = view.kind === "matched"
      ? `Open ${view.name} Errors on Flare in a new tab`
      : view.kind === "setup"
        ? `Create a Flare project for ${view.name} in a new tab`
        : view.kind === "disconnected"
          ? "Open Flare projects in a new tab"
          : "Open Flare in a new tab";
    instance.main.href = view.kind === "matched"
      ? view.errorsUrl
      : view.kind === "setup"
        ? view.createUrl
        : view.kind === "disconnected" ? `${flareUrl}projects` : flareUrl;
    instance.main.target = "_blank";
    instance.main.rel = "noopener noreferrer";
    instance.main.setAttribute("aria-label", title);
    instance.main.title = title;
    instance.trigger.setAttribute("aria-label", `${label} destinations`);
    updateMenu(instance);
  }

  function renderAll() {
    document.querySelectorAll(`.${actionClass}`).forEach((wrap) => {
      const instance = instances.get(wrap);
      if (instance) render(instance);
    });
  }

  function setView(nextView) {
    view = nextView;
    renderAll();
  }

  function createAction(deploy) {
    const wrap = document.createElement("div");
    wrap.className = actionClass;
    const id = `flare-extension-${++markId}`;
    const uniqueMark = mark
      .replaceAll("url(#flare-extension-", `url(#${id}-`)
      .replaceAll('id="flare-extension-', `id="${id}-`);
    const split = document.createElement("span");
    split.className = "flare-extension-split";
    const main = document.createElement("a");
    main.className = "flare-extension-main";
    const label = document.createElement("span");
    label.className = "flare-extension-label";
    main.append(svg(uniqueMark), label);
    const trigger = document.createElement("button");
    trigger.className = "flare-extension-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${id}-menu`);
    trigger.append(svg(chevron));
    split.append(main, trigger);
    wrap.append(split);
    const menu = document.createElement("div");
    menu.className = menuClass;
    menu.id = `${id}-menu`;
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    document.body.append(menu);
    deploy.insertAdjacentElement("afterend", wrap);

    const instance = {
      wrap,
      menu,
      main: wrap.querySelector(".flare-extension-main"),
      label: wrap.querySelector(".flare-extension-label"),
      trigger: wrap.querySelector(".flare-extension-trigger"),
    };
    instances.set(wrap, instance);
    instance.trigger.addEventListener("click", (event) => {
      if (activeMenu === instance) closeMenu();
      else openMenu(instance, event.detail === 0);
    });
    instance.trigger.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      openMenu(instance, true);
    });
    menu.addEventListener("keydown", (event) => {
      const items = [...menu.querySelectorAll('[role="menuitem"]')];
      const index = items.indexOf(document.activeElement);
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") items[0]?.focus();
      else if (event.key === "End") items.at(-1)?.focus();
      else items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    });
    menu.addEventListener("focusout", () => setTimeout(() => {
      if (activeMenu === instance && !menu.contains(document.activeElement) && document.activeElement !== instance.trigger) closeMenu();
    }, 0));
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setTimeout(() => closeMenu(), 0);
    });
    render(instance);
    return instance;
  }

  function isDeployButton(element) {
    if (element.closest(`.${actionClass}, .${menuClass}`)) return false;
    const label = (element.getAttribute("aria-label") || element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    return label === "Deploy";
  }

  function addActions() {
    document.querySelectorAll(`.${actionClass}`).forEach((wrap) => {
      if (wrap.previousElementSibling && isDeployButton(wrap.previousElementSibling)) return;
      const instance = instances.get(wrap);
      if (activeMenu === instance) closeMenu();
      instance?.menu.remove();
      wrap.remove();
    });
    document.querySelectorAll('button, a, [role="button"]').forEach((deploy) => {
      if (!isDeployButton(deploy)) return;
      let wrap = deploy.nextElementSibling;
      let instance = wrap?.classList.contains(actionClass) ? instances.get(wrap) : undefined;
      if (!instance) instance = createAction(deploy);
      const height = deploy.getBoundingClientRect().height;
      if (height) instance.wrap.style.height = `${height}px`;
      instance.wrap.style.top = "0px";
      const offset = deploy.getBoundingClientRect().top - instance.wrap.getBoundingClientRect().top;
      if (offset) instance.wrap.style.top = `${Math.round(offset * 2) / 2}px`;
    });
  }

  async function resolveProject() {
    const project = cloudProject();
    if (project === resolvedProject) return;
    resolvedProject = project;
    const generation = ++resolveGeneration;
    clearTimeout(retryTimer);
    setView({ kind: "loading" });
    if (!project) {
      setView({ kind: "error" });
      return;
    }
    try {
      const result = await extensionApi.runtime.sendMessage({ type: "flare-match-project", project });
      if (generation !== resolveGeneration || project !== cloudProject()) return;
      if (result?.error) throw new Error(result.error);
      if (!result?.connected) setView({ kind: "disconnected" });
      else if (result.match?.url && result.match?.performanceUrl && result.match?.logsUrl) {
        setView({ kind: "matched", name: result.match.name, errorsUrl: result.match.url, performanceUrl: result.match.performanceUrl, logsUrl: result.match.logsUrl });
      } else {
        setView({ kind: "setup", name: project, createUrl: createProjectUrl(project) });
      }
    } catch {
      if (generation !== resolveGeneration || project !== cloudProject()) return;
      setView({ kind: "error" });
      retryTimer = setTimeout(() => {
        resolvedProject = undefined;
        resolveProject();
      }, 30_000);
    }
  }

  function queueUpdate() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      addActions();
      resolveProject();
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (activeMenu && !activeMenu.wrap.contains(event.target) && !activeMenu.menu.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeMenu) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  window.addEventListener("scroll", () => closeMenu(), true);
  window.addEventListener("resize", queueUpdate);
  extensionApi.runtime.onMessage.addListener((message) => {
    if (message?.type === "flare-connection-changed") {
      resolvedProject = undefined;
      resolveProject();
    }
    if (message?.type === "flare-display-options-changed") {
      hideUnmatchedAction = message.hideUnmatchedAction === true;
      renderAll();
    }
  });

  extensionApi.runtime.sendMessage({ type: "flare-display-options" }).then((options) => {
    hideUnmatchedAction = options?.hideUnmatchedAction === true;
    renderAll();
  }).catch(() => {});

  addActions();
  resolveProject();
  new MutationObserver(queueUpdate).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
