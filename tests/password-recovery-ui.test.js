const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

function element() {
  return {
    value: "",
    textContent: "",
    className: "",
    disabled: false,
    style: {},
    handlers: {},
    addEventListener(name, handler) {
      this.handlers[name] = handler;
    },
  };
}

function runPage(file, href, {fetchImpl = async () => response(200, {}), storage = {}} = {}) {
  const html = fs.readFileSync(file, "utf8");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
  assert.ok(script, `Expected an inline script in ${file}`);

  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  if (file === "ForgotPassword.html") {
    getElement("email");
    getElement("submitBtn");
    getElement("msg");
  }
  const container = getElement("mainContent");
  container.querySelector = (selector) => getElement(selector.replace(/^#/, ""));
  Object.defineProperty(container, "innerHTML", {
    set(value) {
      this.markup = value;
      if (value.includes('id="resetForm"')) {
        getElement("resetForm");
        getElement("pw");
        getElement("pw2");
      }
      if (value.includes('id="retryLink"')) getElement("retryLink");
    },
    get() {
      return this.markup || "";
    },
  });

  const parsed = new URL(href);
  const location = {
    href,
    origin: parsed.origin,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
  };
  const localStore = new Map(Object.entries(storage));
  const localStorage = {
    getItem(key) {
      return localStore.has(key) ? localStore.get(key) : null;
    },
    setItem(key, value) {
      localStore.set(key, String(value));
    },
    removeItem(key) {
      localStore.delete(key);
    },
  };
  const context = {
    window: {
      location,
      localStorage,
      crypto: webcrypto,
      history: {replaceState(_state, _title, path) { location.replacedPath = path; }},
    },
    document: {getElementById: getElement},
    URLSearchParams,
    Date,
    Uint8Array,
    TextEncoder,
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    fetch: fetchImpl,
    setTimeout: (callback) => { context.redirectAfterSuccess = callback; },
  };
  vm.runInNewContext(script, context, {filename: file});
  return {context, elements, localStore, container};
}

function response(status, data) {
  return {ok: status >= 200 && status < 300, status, json: async () => data};
}

async function submit(page, id) {
  const handler = page.elements.get(id)?.handlers.submit;
  assert.equal(typeof handler, "function", `Expected ${id} submit handler`);
  await handler({preventDefault() {}});
}

async function testForgotRequestCreatesAndStoresPkceVerifier() {
  let submitted;
  const page = runPage("ForgotPassword.html", "https://www.alefit.org/ForgotPassword", {
    fetchImpl: async (_url, options) => {
      submitted = JSON.parse(options.body);
      return response(200, {message: "If this email exists, a reset link has been sent."});
    },
  });
  page.elements.get("email").value = "athlete@example.test";
  await submit(page, "forgotForm");

  assert.equal(submitted.email, "athlete@example.test");
  assert.equal(submitted.code_challenge_method, "s256");
  assert.match(submitted.code_challenge, /^[A-Za-z0-9_-]{43}$/);
  const saved = JSON.parse(page.localStore.get("alefit_password_recovery_pkce"));
  assert.match(saved.verifier, /^[a-f0-9]{64}$/);
  assert.equal(page.elements.get("msg").className, "msg success");
}

async function testTokenHashLinkSubmitsRecoveryTypeAndPassword() {
  let submitted;
  const page = runPage(
    "ResetPassword.html",
    "https://www.alefit.org/ResetPassword?token_hash=one-time-hash&type=recovery",
    {fetchImpl: async (_url, options) => {
      submitted = JSON.parse(options.body);
      return response(200, {message: "Password updated successfully."});
    }},
  );
  assert.match(page.container.innerHTML, /id="resetForm"/);
  assert.equal(page.context.window.location.replacedPath, "/ResetPassword");
  page.elements.get("pw").value = "a strong new password";
  page.elements.get("pw2").value = "a strong new password";
  await submit(page, "resetForm");

  assert.equal(submitted.token_hash, "one-time-hash");
  assert.equal(submitted.type, "recovery");
  assert.equal(submitted.new_password, "a strong new password");
  assert.equal(page.elements.get("msg").className, "msg success");
}

async function testPkceLinkUsesSavedVerifier() {
  let submitted;
  const page = runPage(
    "ResetPassword.html",
    "https://www.alefit.org/ResetPassword?code=one-time-code",
    {
      storage: {
        alefit_password_recovery_pkce: JSON.stringify({
          verifier: "v".repeat(64),
          created: Date.now(),
        }),
      },
      fetchImpl: async (_url, options) => {
        submitted = JSON.parse(options.body);
        return response(200, {message: "Password updated successfully."});
      },
    },
  );
  page.elements.get("pw").value = "a strong new password";
  page.elements.get("pw2").value = "a strong new password";
  await submit(page, "resetForm");

  assert.equal(submitted.code, "one-time-code");
  assert.equal(submitted.code_verifier, "v".repeat(64));
  assert.equal(page.localStore.has("alefit_password_recovery_pkce"), false);
}

async function testMissingOrRejectedLinkOffersRetry() {
  const expired = runPage("ResetPassword.html", "https://www.alefit.org/ResetPassword");
  assert.match(expired.container.innerHTML, /REQUEST A NEW LINK/);
  assert.doesNotMatch(expired.container.innerHTML, /id="resetForm"/);

  const rejected = runPage(
    "ResetPassword.html",
    "https://www.alefit.org/ResetPassword?token_hash=expired&type=recovery",
    {fetchImpl: async () => response(400, {
      code: "invalid_recovery_link",
      error: "This reset link is invalid, expired, or has already been used. Request a new link.",
    })},
  );
  rejected.elements.get("pw").value = "a strong new password";
  rejected.elements.get("pw2").value = "a strong new password";
  await submit(rejected, "resetForm");
  assert.equal(rejected.elements.get("retryLink").style.display, "block");
  assert.match(rejected.elements.get("msg").textContent, /expired|already been used/i);
}

(async () => {
  await testForgotRequestCreatesAndStoresPkceVerifier();
  await testTokenHashLinkSubmitsRecoveryTypeAndPassword();
  await testPkceLinkUsesSavedVerifier();
  await testMissingOrRejectedLinkOffersRetry();
  console.log("Password recovery UI checks passed: PKCE request, token-hash and code links, and retry states.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
