const extensionApi = globalThis.browser || globalThis.chrome;
const $ = (id) => document.getElementById(id);
let pending;
let pollTimer;
let connectionRevision = 0;
const cloudAccess = { origins: ["https://cloud.laravel.com/*"] };
const flareAccess = { origins: ["https://flareapp.io/*"] };

async function refreshAccess() {
  const [cloudAllowed, flareAllowed] = await Promise.all([
    extensionApi.permissions.contains(cloudAccess),
    extensionApi.permissions.contains(flareAccess),
  ]);
  $("allow-cloud").hidden = cloudAllowed;
  $("cloud-allowed").hidden = !cloudAllowed;
  $("flare-allowed").hidden = !flareAllowed;
}

function show(view) {
  for (const id of ["disconnected", "pending", "connected"]) $(id).hidden = id !== view;
}

function error(message) {
  $("error").textContent = message;
  $("error").hidden = !message;
}

async function send(type, payload = {}) {
  const result = await extensionApi.runtime.sendMessage({ type, ...payload });
  if (result?.error) throw new Error(result.error);
  return result;
}

function showPending(data) {
  connectionRevision++;
  pending = data;
  $("user-code").textContent = data.user_code;
  show("pending");
  schedulePoll(1000);
}

function showConnected() {
  connectionRevision++;
  pending = null;
  clearTimeout(pollTimer);
  show("connected");
  error("");
}

function showDisconnected() {
  connectionRevision++;
  pending = null;
  clearTimeout(pollTimer);
  show("disconnected");
}

function schedulePoll(delay) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(poll, delay);
}

async function poll() {
  if (!pending) return;
  if (Date.now() >= pending.expires_at) {
    showDisconnected();
    error("This connection request expired. Start again to get a new code.");
    return;
  }

  try {
    const result = await send("flare-poll");
    if (!pending) return;
    if (result.state === "connected") {
      showConnected();
      return;
    }
    if (result.state === "pending") {
      schedulePoll(Math.max(1000, result.next_poll_at - Date.now()));
      return;
    }
    showDisconnected();
    error(result.error || "The connection request expired. Start again to get a new code.");
  } catch (caught) {
    if (!pending) return;
    error(caught.message);
    schedulePoll(10_000);
  }
}

$("connect").addEventListener("click", async () => {
  $("connect").disabled = true;
  error("");
  try {
    const granted = await extensionApi.permissions.request(flareAccess);
    if (!granted) throw new Error("Allow access to flareapp.io to connect your account.");
    await refreshAccess();
    showPending(await send("flare-connect"));
    $("open-flare").click();
  } catch (caught) {
    error(caught.message);
  } finally {
    $("connect").disabled = false;
  }
});

$("allow-cloud").addEventListener("click", async () => {
  $("allow-cloud").disabled = true;
  error("");
  try {
    const granted = await extensionApi.permissions.request(cloudAccess);
    if (!granted) throw new Error("Allow access to cloud.laravel.com to show the Flare button on project pages.");
    await refreshAccess();
    try {
      const tabs = await extensionApi.tabs.query({ url: "https://cloud.laravel.com/*" });
      for (const tab of tabs) {
        if (tab.id) await extensionApi.tabs.reload(tab.id);
      }
    } catch {
      // The permission still applies when the user next opens Laravel Cloud.
    }
  } catch (caught) {
    error(caught.message);
  } finally {
    $("allow-cloud").disabled = false;
  }
});

$("open-flare").addEventListener("click", () => {
  if (!pending) return;
  const url = new URL(pending.verification_uri);
  if (url.origin !== "https://flareapp.io") return;
  url.searchParams.set("user_code", pending.user_code);
  extensionApi.tabs.create({ url: url.href });
});

$("copy-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText(pending.user_code);
  $("copy-code").textContent = "Copied";
  setTimeout(() => { $("copy-code").textContent = "Copy"; }, 2000);
});

$("disconnect").addEventListener("click", async () => {
  $("disconnect").disabled = true;
  error("");
  try {
    await send("flare-disconnect");
    showDisconnected();
  } catch (caught) {
    error(caught.message);
  } finally {
    $("disconnect").disabled = false;
  }
});

$("hide-unmatched-action").addEventListener("change", async () => {
  const input = $("hide-unmatched-action");
  const next = input.checked;
  input.disabled = true;
  error("");
  try {
    await send("flare-set-display-options", { hideUnmatchedAction: next });
  } catch (caught) {
    input.checked = !next;
    error(caught.message);
  } finally {
    input.disabled = false;
  }
});

send("flare-display-options").then((options) => {
  $("hide-unmatched-action").checked = options.hideUnmatchedAction;
  $("display-options").hidden = false;
}).catch((caught) => error(caught.message));

refreshAccess().catch((caught) => error(caught.message));
extensionApi.permissions.onAdded?.addListener(() => refreshAccess().catch(() => {}));
extensionApi.permissions.onRemoved?.addListener(() => refreshAccess().catch(() => {}));

async function refreshConnection() {
  const revision = connectionRevision;
  try {
    const state = await send("flare-status");
    if (revision !== connectionRevision) return;
    if (state.connected) {
      showConnected();
    } else if (state.pending) {
      showPending(state.pending);
    } else {
      showDisconnected();
    }
  } catch (caught) {
    error(caught.message);
  }
}

extensionApi.storage.onChanged?.addListener((changes, area) => {
  if (area === "local" && changes.tokens?.newValue?.refresh_token) showConnected();
});

window.addEventListener("focus", refreshConnection);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshConnection();
});

refreshConnection();
