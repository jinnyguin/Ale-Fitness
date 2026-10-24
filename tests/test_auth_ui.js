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
    hidden: false,
    readOnly: false,
    listeners: {},
    children: [],
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    focus() {},
    appendChild(child) {
      this.children.push(child);
    },
  };
}

function makeBrowser({ search = "", token = "", fetchImpl, storageBlocked = false, emailCode } = {}) {
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
    "emailCodeStart",
    "emailCodePanel",
    "emailCodeInput",
    "emailCodeVerify",
    "emailCodeChange",
    "emailCodeStatus",
  ].forEach(getElement);
  getElement("emailCodePanel").hidden = true;
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
  const request = fetchImpl || (async () => { throw new Error("unexpected fetch"); });
  const window = { location, localStorage, addEventListener() {} };
  window.AlefitEmailCode = emailCode || {
    async send() { throw new Error("unexpected email-code send"); },
    async verify() { throw new Error("unexpected email-code verify"); },
  };
  window.AlefitSession = {
    save(session) {
      localStorage.setItem("base44_access_token", session.access_token);
      localStorage.setItem("token", session.access_token);
      if (session.user) localStorage.setItem("alefit_user", JSON.stringify(session.user));
    },
    async restore() {
      const savedToken = values.get("token");
      if (!savedToken) return {authenticated:false, user:null};
      const response = await request("/api/apps/6a1f3d189ebdbe71fa7d256c/auth/me", {
        headers: {Authorization:"Bearer " + savedToken},
      });
      if (response.status === 401 || response.status === 403) {
        values.delete("token");
        values.delete("base44_access_token");
        values.delete("alefit_user");
        return {authenticated:false, user:null};
      }
      if (!response.ok) {
        throw new Error("We could not verify your saved sign-in right now. You can try signing in below.");
      }
      const user = await response.json();
      if (!user || typeof user.id !== "string") {
        throw new Error("The sign-in service returned an invalid session response. You can try signing in below.");
      }
      return {authenticated:true, user, access_token:savedToken};
    },
  };
  window.AlefitMember = {
    markSignedIn() {},
    async routeAfterSignIn(user, preferredPath) {
      const destination = preferredPath && /^\/Register\.html(?:[?#]|$)/i.test(preferredPath)
        ? "/Register.html" : "/today.html?view=today";
      location.replace(destination);
      return destination;
    },
  };
  const document = { getElementById: getElement };
  const context = {
    window,
    document,
    URL,
    URLSearchParams,
    fetch: request,
    console,
    Date,
    setInterval: () => 1,
    clearInterval() {},
  };

  vm.runInNewContext(loginScript, context);
  return { elements, values, location, window };
}

function makeCallbackBrowser({ search = "", hash = "", storageBlocked = false, fetchImpl, pending, exchange }) {
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
  const window = { location, localStorage, AlefitSession: {
    save(session) {
      localStorage.setItem("base44_access_token", session.access_token);
      localStorage.setItem("token", session.access_token);
    },
    timedFetch: fetchImpl,
    exchange: exchange || (async () => { throw new Error("unexpected exchange"); })
  }, sessionStorage: {
    getItem: () => pending ? JSON.stringify(pending) : null,
    removeItem() {}
  }};
  const document = {
    getElementById: getElement,
    createElement: () => makeElement(),
    querySelector: () => ({setAttribute() {}}),
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
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
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
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
  assert.equal(trackedEvents, 1);
}

async function testSignInFromRegistrationReturnsToOnboarding() {
  const browser = makeBrowser({
    search: "?from_url=%2FRegister.html",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "returning-user-token",
        user: { id: "user-1", email: "athlete@example.test" },
      }),
    }),
  });
  browser.elements.get("email").value = "athlete@example.test";
  browser.elements.get("password").value = "correct horse battery";
  await browser.elements.get("loginForm").listeners.submit({ preventDefault() {} });

  assert.equal(browser.location.replacedWith, "/Register.html");
  assert.equal(browser.values.get("token"), "returning-user-token");
}

async function testEmailCodeLoginVerifiesSessionAndRoutesToSavedPlan() {
  const calls = [];
  const browser = makeBrowser({
    emailCode: {
      async send(email, options) {
        calls.push({method:"send", email, options});
        return {sent:true, retry_after_seconds:60, message:"Check your email."};
      },
      async verify(email, code) {
        calls.push({method:"verify", email, code});
        return {
          access_token:"otp-token",
          refresh_token:"otp-refresh",
          user:{id:"existing-athlete", email},
        };
      },
    },
  });
  browser.elements.get("email").value = " Athlete@Example.Test ";
  await browser.elements.get("emailCodeStart").listeners.click();
  assert.equal(browser.elements.get("emailCodePanel").hidden, false);
  assert.equal(browser.elements.get("email").readOnly, true);
  assert.equal(browser.elements.get("emailCodeStart").disabled, true);
  assert.equal(browser.elements.get("emailCodeStart").textContent, "Resend code in 60s");
  browser.elements.get("emailCodeInput").value = "123456";
  await browser.elements.get("emailCodeVerify").listeners.click();

  assert.equal(JSON.stringify(calls), JSON.stringify([
    {method:"send", email:"athlete@example.test", options:{createUser:false}},
    {method:"verify", email:"athlete@example.test", code:"123456"},
  ]));
  assert.equal(browser.values.get("token"), "otp-token");
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
}

async function testEmailCodeLoginRejectsPartialCodeBeforeVerification() {
  let verifyCalls = 0;
  const browser = makeBrowser({
    emailCode: {
      async send() { return {sent:true, retry_after_seconds:60}; },
      async verify() { verifyCalls += 1; throw new Error("unexpected verify"); },
    },
  });
  browser.elements.get("email").value = "athlete@example.test";
  await browser.elements.get("emailCodeStart").listeners.click();
  browser.elements.get("emailCodeInput").value = "12x4";
  browser.elements.get("emailCodeInput").listeners.input();
  assert.equal(browser.elements.get("emailCodeInput").value, "124");
  await browser.elements.get("emailCodeVerify").listeners.click();
  assert.equal(verifyCalls, 0);
  assert.match(browser.elements.get("emailCodeStatus").textContent, /all six digits/i);
}

async function testEmailCodeRateLimitDisplaysCooldown() {
  const browser = makeBrowser({
    emailCode: {
      async send() {
        const error = new Error("Too many code requests.");
        error.status = 429;
        error.retryAfterSeconds = 15;
        throw error;
      },
      async verify() { throw new Error("unexpected verify"); },
    },
  });
  browser.elements.get("email").value = "athlete@example.test";
  await browser.elements.get("emailCodeStart").listeners.click();
  assert.equal(browser.elements.get("emailCodeStart").disabled, true);
  assert.equal(browser.elements.get("emailCodeStart").textContent, "Try again in 15s");
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
    "https://alefit.example/account",
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

async function testPkceCallbackRestoresPendingDestination() {
  const browser = makeCallbackBrowser({
    search: "?code=one-time-code",
    pending: {verifier:"a".repeat(64), started:Date.now(), returnTo:"/Register.html?google_signup=1"},
    exchange: async (body) => {
      assert.equal(body.code, "one-time-code");
      assert.equal(body.code_verifier, "a".repeat(64));
      return {access_token:"verified"};
    },
    fetchImpl: async () => ({ok:true,status:200,json:async()=>({id:"same-provider-user"})})
  });
  await flushPromises();
  assert.equal(browser.location.replacedWith, "https://alefit.example/Register.html?google_signup=1");
  assert.equal(browser.values.has("alefit_refresh_token"), false);
}

async function testCallbackCancellationAndExpiredTransaction() {
  for (const options of [{search:"?error=access_denied"}, {hash:"#error=access_denied"},
    {search:"?code=expired", pending:{started:0,verifier:"a".repeat(64)}}]) {
    const browser = makeCallbackBrowser(options);
    await flushPromises();
    assert.equal(browser.location.replacedWith, null);
    assert.match(browser.elements.get("errMsg").textContent, /cancelled|expired/i);
    assert.equal(browser.values.get("token"), undefined);
  }
}

async function run() {
  const tests = [
    testPkceCallbackRestoresPendingDestination,
    testCallbackCancellationAndExpiredTransaction,
    testSavedSessionSurvivesProviderOutage,
    testMalformedSuccessfulSessionIsNotTrusted,
    testInvalidSavedSessionIsCleared,
    testValidSavedSessionRedirects,
    testManualLoginStoresOnlyACompleteSession,
    testSignInFromRegistrationReturnsToOnboarding,
    testEmailCodeLoginVerifiesSessionAndRoutesToSavedPlan,
    testEmailCodeLoginRejectsPartialCodeBeforeVerification,
    testEmailCodeRateLimitDisplaysCooldown,
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