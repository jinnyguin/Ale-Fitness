const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const loginHtml = fs.readFileSync("Login.html", "utf8");
const loginScript = [...loginHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi)]
  .map((match) => match[1])
  .find((script) => script.includes("manualSignInStarted"));
const callbackHtml = fs.readFileSync("OAuthCallback.html", "utf8");
const callbackScript = [...callbackHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi)]
  .map((match) => match[1])
  .find((script) => script.includes("Confirm the provider token"));

if (!loginScript) throw new Error("Login page script was not found.");
if (!callbackScript) throw new Error("OAuth callback script was not found.");

function makeElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "<span>Continue with Google</span>",
    style: {},
    disabled: false,
    listeners: {},
    children: [],
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    appendChild(child) {
      this.children.push(child);
    },
  };
}

function makeBrowser({ search = "", token = "", fetchImpl, storageBlocked = false } = {}) {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  [
    "auth-progress-hint",
    "login-copy",
    "loginForm",
    "errorMsg",
    "submitBtn",
    "email",
    "password",
    "googleSignIn",
  ].forEach(getElement);
  const values = new Map();
  if (token) {
    values.set("base44_access_token", token);
    values.set("token", token);
  }
  const localStorage = {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error("storage denied");
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  const location = {
    origin: "https://alefit.example",
    search,
    replacedWith: null,
    replace(value) {
      this.replacedWith = String(value);
    },
  };
  const window = { location, localStorage };
  const document = { getElementById: getElement };
  const context = {
    window,
    document,
    URL,
    URLSearchParams,
    fetch: fetchImpl || (async () => { throw new Error("unexpected fetch"); }),
    console,
  };

  vm.runInNewContext(loginScript, context);
  return { elements, values, location, window };
}

function makeCallbackBrowser({ search = "", hash = "", storageBlocked = false, fetchImpl }) {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  ["spinner", "heading", "sub", "errMsg"].forEach(getElement);
  const values = new Map();
  const localStorage = {
    setItem(key, value) {
      if (storageBlocked) throw new Error("storage denied");
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  const location = {
    origin: "https://alefit.example",
    search,
    hash,
    replacedWith: null,
    replace(value) {
      this.replacedWith = String(value);
    },
  };
  const window = { location, localStorage };
  const document = {
    getElementById: getElement,
    createElement: () => makeElement(),
  };
  const context = {
    window,
    document,
    URL,
    URLSearchParams,
    fetch: fetchImpl || (async () => { throw new Error("unexpected fetch"); }),
    console,
  };

  vm.runInNewContext(callbackScript, context);
  return { elements, values, location, window };
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function testSavedSessionSurvivesProviderOutage() {
  const browser = makeBrowser({
    token: "saved-token",
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  await flushPromises();
  assert.equal(browser.values.get("token"), "saved-token");
  assert.equal(browser.location.replacedWith, null);
  assert.match(browser.elements.get("errorMsg").textContent, /verify your saved sign-in/i);
}

async function testMalformedSuccessfulSessionIsNotTrusted() {
  const browser = makeBrowser({
    token: "saved-token",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ email: "athlete@example.test" }),
    }),
  });
  await flushPromises();
  assert.equal(browser.values.get("token"), "saved-token");
  assert.equal(browser.location.replacedWith, null);
  assert.match(browser.elements.get("errorMsg").textContent, /invalid session response/i);
}

async function testInvalidSavedSessionIsCleared() {
  const browser = makeBrowser({
    token: "expired-token",
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  await flushPromises();
  assert.equal(browser.values.has("token"), false);
  assert.equal(browser.location.replacedWith, null);
}

async function testValidSavedSessionRedirects() {
  const browser = makeBrowser({
    token: "valid-token",
    search: "?from_url=%2Faccount",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "user-1" }),
    }),
  });
  await flushPromises();
  assert.equal(browser.location.replacedWith, "/account");
}

async function testManualLoginStoresOnlyACompleteSession() {
  let trackedEvents = 0;
  const browser = makeBrowser({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-token",
        user: { id: "user-1", email: "athlete@example.test" },
      }),
    }),
  });
  browser.window.trackEvent = () => { trackedEvents += 1; };
  browser.elements.get("email").value = "athlete@example.test";
  browser.elements.get("password").value = "correct horse battery";
  await browser.elements.get("loginForm").listeners.submit({ preventDefault() {} });

  assert.equal(browser.values.get("token"), "new-token");
  assert.equal(JSON.parse(browser.values.get("alefit_user")).id, "user-1");
  assert.equal(browser.location.replacedWith, "/");
  assert.equal(trackedEvents, 1);
}

async function testIncompleteManualLoginIsRejectedWithoutSuccessTracking() {
  let trackedEvents = 0;
  const browser = makeBrowser({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "partial-token" }),
    }),
  });
  browser.window.trackEvent = () => { trackedEvents += 1; };
  browser.elements.get("email").value = "athlete@example.test";
  browser.elements.get("password").value = "correct horse battery";
  await browser.elements.get("loginForm").listeners.submit({ preventDefault() {} });

  assert.equal(browser.values.has("token"), false);
  assert.equal(browser.location.replacedWith, null);
  assert.equal(trackedEvents, 0);
  assert.match(browser.elements.get("errorMsg").textContent, /valid session/i);
}

async function testBlockedStorageShowsActionableError() {
  const browser = makeBrowser({
    storageBlocked: true,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-token",
        user: { id: "user-1" },
      }),
    }),
  });
  browser.elements.get("email").value = "athlete@example.test";
  browser.elements.get("password").value = "correct horse battery";
  await browser.elements.get("loginForm").listeners.submit({ preventDefault() {} });

  assert.equal(browser.location.replacedWith, null);
  assert.match(browser.elements.get("errorMsg").textContent, /blocked sign-in storage/i);
  assert.equal(browser.elements.get("submitBtn").disabled, false);
}

async function testGoogleCallbackKeepsTokenDuringProviderOutage() {
  const browser = makeCallbackBrowser({
    hash: "#access_token=oauth-token&token_type=bearer",
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "unavailable" }),
    }),
  });
  await flushPromises();
  assert.equal(browser.values.get("token"), "oauth-token");
  assert.equal(browser.location.replacedWith, null);
  assert.match(browser.elements.get("errMsg").textContent, /temporarily unavailable/i);
}

async function testGoogleCallbackKeepsTokenWhenNetworkIsUnavailable() {
  const browser = makeCallbackBrowser({
    hash: "#access_token=oauth-token",
    fetchImpl: async () => { throw new TypeError("network unavailable"); },
  });
  await flushPromises();
  assert.equal(browser.values.get("token"), "oauth-token");
  assert.equal(browser.location.replacedWith, null);
  assert.match(browser.elements.get("errMsg").textContent, /could not reach the sign-in service/i);
}

async function testGoogleCallbackClearsRejectedToken() {
  const browser = makeCallbackBrowser({
    hash: "#access_token=expired-token",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    }),
  });
  await flushPromises();
  assert.equal(browser.values.has("token"), false);
  assert.equal(browser.location.replacedWith, null);
  assert.match(browser.elements.get("errMsg").textContent, /could not be verified/i);
}

async function testVerifiedGoogleCallbackRedirectsWithSessionToken() {
  const browser = makeCallbackBrowser({
    search: "?from_url=%2Faccount",
    hash: "#access_token=oauth-token&token_type=bearer",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "user-1", email: "athlete@example.test" }),
    }),
  });
  await flushPromises();
  assert.equal(browser.values.get("token"), "oauth-token");
  assert.equal(JSON.parse(browser.values.get("alefit_user")).id, "user-1");
  assert.equal(
    browser.location.replacedWith,
    "https://alefit.example/account?access_token=oauth-token",
  );
}

async function testGoogleCallbackHandlesBlockedStorage() {
  let fetchCalls = 0;
  const browser = makeCallbackBrowser({
    hash: "#access_token=oauth-token",
    storageBlocked: true,
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: true, status: 200, json: async () => ({ id: "user-1" }) };
    },
  });
  assert.equal(fetchCalls, 0);
  assert.equal(browser.location.replacedWith, null);
  assert.match(browser.elements.get("errMsg").textContent, /blocked sign-in storage/i);
}

async function run() {
  const tests = [
    testSavedSessionSurvivesProviderOutage,
    testMalformedSuccessfulSessionIsNotTrusted,
    testInvalidSavedSessionIsCleared,
    testValidSavedSessionRedirects,
    testManualLoginStoresOnlyACompleteSession,
    testIncompleteManualLoginIsRejectedWithoutSuccessTracking,
    testBlockedStorageShowsActionableError,
    testGoogleCallbackKeepsTokenDuringProviderOutage,
    testGoogleCallbackKeepsTokenWhenNetworkIsUnavailable,
    testGoogleCallbackClearsRejectedToken,
    testVerifiedGoogleCallbackRedirectsWithSessionToken,
    testGoogleCallbackHandlesBlockedStorage,
  ];
  for (const test of tests) {
    await test();
    console.log(`ok - ${test.name}`);
  }
  console.log(`${tests.length} browser auth checks passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});