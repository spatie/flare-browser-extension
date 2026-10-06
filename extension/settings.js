const extensionApi = globalThis.browser || globalThis.chrome;
const $ = (id) => document.getElementById(id);
let pending;
let pollTimer;

function show(view) {
  for (const id of ["disconnected", "pending", "connected"]) $(id).hidden = id !== view;
}

function error(message) {
  $("error").textContent = message;
  $("error").hidden = !message;
}

async function send(type) {
  const result = await extensionApi.runtime.sendMessage({ type });
  if (result?.error) throw new Error(result.error);
  return result;
}

function showPending(data) {
  pending = data;
  $("user-code").textContent = data.user_code;
  show("pending");
  schedulePoll(1000);
}

function schedulePoll(delay) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(poll, delay);
}

async function poll() {
  if (!pending) return;
  if (Date.now() >= pending.expires_at) {
    pending = null;
    show("disconnected");
    error("This connection request expired. Start again to get a new code.");
    return;
  }

  try {
    const result = await send("flare-poll");
    if (result.state === "connected") {
      pending = null;
      show("connected");
      error("");
      return;
    }
    if (result.state === "pending") {
      schedulePoll(Math.max(1000, result.next_poll_at - Date.now()));
      return;
    }
    pending = null;
    show("disconnected");
    error(result.error || "The connection request expired. Start again to get a new code.");
  } catch (caught) {
    error(caught.message);
    schedulePoll(10_000);
  }
}

$("connect").addEventListener("click", async () => {
  $("connect").disabled = true;
  error("");
  try {
    showPending(await send("flare-connect"));
    $("open-flare").click();
  } catch (caught) {
    error(caught.message);
  } finally {
    $("connect").disabled = false;
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
    show("disconnected");
  } catch (caught) {
    error(caught.message);
  } finally {
    $("disconnect").disabled = false;
  }
});

send("flare-status").then((state) => {
  if (state.connected) show("connected");
  else if (state.pending) showPending(state.pending);
  else show("disconnected");
}).catch((caught) => {
  show("disconnected");
  error(caught.message);
});
