const extensionApi = globalThis.browser || globalThis.chrome;
const FLARE_ORIGIN = "https://flareapp.io";
const CLIENT_ID = "9d000000-0000-4000-8000-000000000003";
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

let refreshPromise;
const matchCache = new Map();

Promise.resolve(extensionApi.storage.local.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" })).catch(() => {});

extensionApi.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") extensionApi.runtime.openOptionsPage();
});

extensionApi.action.onClicked.addListener(() => extensionApi.runtime.openOptionsPage());

extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "flare-dev-reload") {
    extensionApi.runtime.reload();
    return;
  }

  const fromSettings = sender.url === extensionApi.runtime.getURL("settings.html");
  const fromCloud = sender.url?.startsWith("https://cloud.laravel.com/");

  if (message?.type === "flare-match-project" && fromCloud) {
    matchProject(message.project).then(sendResponse, errorResponse);
    return true;
  }

  if (message?.type === "flare-open-settings" && fromCloud) {
    Promise.resolve(extensionApi.runtime.openOptionsPage()).then(() => sendResponse({ opened: true }), errorResponse);
    return true;
  }

  if (message?.type === "flare-display-options" && fromCloud) {
    displayOptions().then(sendResponse, errorResponse);
    return true;
  }

  if (!fromSettings) return;

  const actions = {
    "flare-status": status,
    "flare-connect": startAuthorization,
    "flare-poll": pollAuthorization,
    "flare-disconnect": disconnect,
    "flare-display-options": displayOptions,
    "flare-set-display-options": () => setDisplayOptions(message.hideUnmatchedAction),
  };
  const action = actions[message?.type];
  if (!action) return;

  action().then(sendResponse, errorResponse);
  return true;

  function errorResponse(error) {
    sendResponse({ error: error.message || "Flare could not be reached." });
  }
});

async function postForm(path, values) {
  const response = await fetch(`${FLARE_ORIGIN}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(values),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, body };
}

async function broadcastConnectionChanged() {
  const tabs = await extensionApi.tabs.query({});
  await Promise.all(tabs.filter((tab) => tab.id).map((tab) =>
    Promise.resolve(extensionApi.tabs.sendMessage(tab.id, { type: "flare-connection-changed" })).catch(() => {})
  ));
}

async function displayOptions() {
  const { hideUnmatchedAction } = await extensionApi.storage.local.get("hideUnmatchedAction");
  return { hideUnmatchedAction: hideUnmatchedAction === true };
}

async function setDisplayOptions(hideUnmatchedAction) {
  if (typeof hideUnmatchedAction !== "boolean") throw new Error("Invalid display option.");
  await extensionApi.storage.local.set({ hideUnmatchedAction });
  await broadcastDisplayOptionsChanged(hideUnmatchedAction).catch(() => {});
  return { hideUnmatchedAction };
}

async function broadcastDisplayOptionsChanged(hideUnmatchedAction) {
  const tabs = await extensionApi.tabs.query({});
  await Promise.all(tabs.filter((tab) => tab.id).map((tab) =>
    Promise.resolve(extensionApi.tabs.sendMessage(tab.id, { type: "flare-display-options-changed", hideUnmatchedAction })).catch(() => {})
  ));
}

async function status() {
  const { tokens, pending } = await extensionApi.storage.local.get(["tokens", "pending"]);
  return {
    connected: Boolean(tokens?.refresh_token),
    pending: pending?.expires_at > Date.now() ? publicPending(pending) : null,
  };
}

function publicPending(pending) {
  return {
    user_code: pending.user_code,
    verification_uri: pending.verification_uri,
    expires_at: pending.expires_at,
  };
}

async function startAuthorization() {
  const result = await postForm("/oauth/device/code", {
    client_id: CLIENT_ID,
    scope: "read",
    resource: `${FLARE_ORIGIN}/api`,
    connection_name: "Flare",
  });

  if (!result.ok || !result.body.device_code) {
    if (result.body.error === "invalid_target") {
      throw new Error("Flare has not enabled this extension connection yet. Please try again shortly.");
    }
    throw new Error(result.body.error_description || "Flare could not start the connection.");
  }

  const pending = {
    device_code: result.body.device_code,
    user_code: result.body.user_code,
    verification_uri: result.body.verification_uri,
    interval: Math.max(5, Number(result.body.interval) || 5),
    next_poll_at: Date.now() + Math.max(5, Number(result.body.interval) || 5) * 1000,
    expires_at: Date.now() + Number(result.body.expires_in) * 1000,
  };
  await extensionApi.storage.local.set({ pending });
  return publicPending(pending);
}

async function pollAuthorization() {
  const { pending } = await extensionApi.storage.local.get("pending");
  if (!pending) return { state: "expired" };
  if (Date.now() >= pending.expires_at) {
    await extensionApi.storage.local.remove("pending");
    return { state: "expired" };
  }
  if (Date.now() < pending.next_poll_at) return { state: "pending", next_poll_at: pending.next_poll_at };

  pending.next_poll_at = Date.now() + pending.interval * 1000;
  await extensionApi.storage.local.set({ pending });
  const result = await postForm("/oauth/token", {
    grant_type: DEVICE_GRANT,
    client_id: CLIENT_ID,
    device_code: pending.device_code,
    resource: `${FLARE_ORIGIN}/api`,
  });

  if (result.ok && result.body.access_token && result.body.refresh_token) {
    const current = (await extensionApi.storage.local.get("pending")).pending;
    if (current?.device_code !== pending.device_code) return { state: "expired" };
    await extensionApi.storage.local.set({ tokens: tokenRecord(result.body) });
    await extensionApi.storage.local.remove("pending");
    matchCache.clear();
    broadcastConnectionChanged().catch(() => {});
    return { state: "connected" };
  }

  if (result.body.error === "slow_down") {
    pending.interval += 5;
    pending.next_poll_at = Date.now() + pending.interval * 1000;
    await extensionApi.storage.local.set({ pending });
  }
  if (["authorization_pending", "slow_down"].includes(result.body.error)) {
    return { state: "pending", next_poll_at: pending.next_poll_at };
  }

  await extensionApi.storage.local.remove("pending");
  return { state: "error", error: result.body.error_description || result.body.error || "Connection was not approved." };
}

function tokenRecord(body) {
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + Number(body.expires_in) * 1000,
  };
}

async function accessToken() {
  const { tokens } = await extensionApi.storage.local.get("tokens");
  if (!tokens?.refresh_token) return null;
  if (tokens.access_token && tokens.expires_at > Date.now() + 60_000) return tokens.access_token;

  refreshPromise ||= refreshTokens(tokens).finally(() => { refreshPromise = undefined; });
  return refreshPromise;
}

async function refreshTokens(tokens) {
  const result = await postForm("/oauth/token", {
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: tokens.refresh_token,
    resource: `${FLARE_ORIGIN}/api`,
  });
  if (!result.ok) {
    if (result.body.error === "invalid_grant") {
      await extensionApi.storage.local.remove("tokens");
      await broadcastConnectionChanged().catch(() => {});
    }
    throw new Error(result.body.error_description || "Flare connection needs to be renewed.");
  }
  const current = (await extensionApi.storage.local.get("tokens")).tokens;
  if (current?.refresh_token !== tokens.refresh_token) throw new Error("Flare connection changed. Please retry.");
  await extensionApi.storage.local.set({ tokens: tokenRecord(result.body) });
  return result.body.access_token;
}

function projectUrls(rawUrl) {
  try {
    const errors = new URL(rawUrl);
    if (errors.origin !== FLARE_ORIGIN || !/^\/[^/]+\/errors\/?$/.test(errors.pathname) || errors.search || errors.hash) return null;
    const performance = new URL(errors.href);
    performance.pathname = errors.pathname.replace(/\/errors\/?$/, "/monitoring");
    const logs = new URL(errors.href);
    logs.pathname = errors.pathname.replace(/\/errors\/?$/, "/logging");
    return { url: errors.href, performanceUrl: performance.href, logsUrl: logs.href };
  } catch {
    return null;
  }
}

async function matchProject(cloudProject) {
  if (typeof cloudProject !== "string" || !cloudProject || cloudProject.length > 255) return { connected: false };
  const token = await accessToken();
  if (!token) return { connected: false };
  const cached = matchCache.get(cloudProject);
  if (cached?.expires_at > Date.now()) return cached.result;

  const url = new URL(`${FLARE_ORIGIN}/api/projects/match`);
  url.searchParams.set("name", cloudProject);
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (response.status === 401) {
    const { tokens } = await extensionApi.storage.local.get("tokens");
    if (!tokens?.refresh_token) return { connected: false };
    refreshPromise ||= refreshTokens(tokens).finally(() => { refreshPromise = undefined; });
    const renewedToken = await refreshPromise;
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${renewedToken}`, Accept: "application/json" },
    });
  }
  if (!response.ok) throw new Error("Flare could not find the matching project.");
  const { data } = await response.json();
  const urls = data?.url ? projectUrls(data.url) : null;
  if (data?.url && !urls) throw new Error("Flare returned an invalid project URL.");
  const result = { connected: true, match: urls ? { name: data.name, ...urls } : null };
  matchCache.set(cloudProject, { result, expires_at: Date.now() + 120_000 });
  return result;
}

async function disconnect() {
  const { tokens } = await extensionApi.storage.local.get("tokens");
  if (tokens?.refresh_token) {
    const result = await postForm("/oauth/revoke", {
      token: tokens.refresh_token,
      token_type_hint: "refresh_token",
      client_id: CLIENT_ID,
    });
    if (!result.ok) throw new Error("Flare could not disconnect. Please try again.");
  }
  await extensionApi.storage.local.remove(["tokens", "pending"]);
  matchCache.clear();
  await broadcastConnectionChanged().catch(() => {});
  return { connected: false };
}
