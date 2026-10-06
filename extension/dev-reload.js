(() => {
  if (!navigator.userAgent.includes("Chrome/")) return;
  if (typeof chrome === "undefined" || !chrome.runtime?.getManifest) return;

  const loadedVersion = chrome.runtime.getManifest().version;
  let reloading = false;

  async function checkForChanges() {
    if (reloading || !document.querySelector(".flare-extension-action, .flare-extension-link")) return;

    try {
      const url = chrome.runtime.getURL("manifest.json");
      const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;

      const { version } = await response.json();
      if (version === loadedVersion) return;

      reloading = true;
      window.setTimeout(() => window.location.reload(), 2000);
      chrome.runtime.sendMessage({ type: "flare-dev-reload" }).catch(() => {});
    } catch (error) {
      // Chrome can invalidate the old content script before it reads the new manifest.
      if (!/Extension context invalidated/i.test(String(error))) return;
      reloading = true;
      window.location.reload();
    }
  }

  checkForChanges();
  window.setInterval(checkForChanges, 1500);
})();
