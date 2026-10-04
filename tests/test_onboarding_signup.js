const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const onboardingScript = fs.readFileSync("onboarding.js", "utf8");

function makeElement(id, root, getElementById) {
  const element = {
    id,
    value: "",
    textContent: "",
    innerHTML: id === "google-signup" ? "<span>Continue with Google</span>" : "",
    disabled: false,
    style: {},
    attributes: {},
    listeners: {},
    classList: {
      remove() {},
      toggle() {},
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    querySelectorAll() { return []; },
    querySelector(selector) {
      const match = selector.match(/^#([\w-]+)$/);
      return match ? getElementById(match[1]) : null;
    },
    focus() {},
    scrollIntoView() {},
  };
  if (id === "form") {
    element.querySelector = (selector) => getElementById(selector.replace(/^#/, ""));
  }
  return element;
}

function makeBrowser({ fetchImpl, token = "", search = "" } = {}) {
  const elements = new Map();
  const root = {
    innerHTML: "",
    errors: [],
    insertBefore(node) { this.errors.push(node); },
    querySelector(selector) {
      if (selector === ".error") return this.errors[this.errors.length - 1] || null;
      if (selector === ".footer") {
        return {
          parentNode: this,
        };
      }
      if (selector === "h1") return getElementById("heading");
      return null;
    },
    querySelectorAll() { return []; },
    appendChild(node) { this.errors.push(node); },
  };
  const getElementById = (id) => {
    if (id === "onboarding") return root;
    if (!elements.has(id)) elements.set(id, makeElement(id, root, getElementById));
    return elements.get(id);
  };
  const progressWrap = makeElement("progress-wrap", root, getElementById);
  const shell = makeElement("shell", root, getElementById);
  const document = {
    getElementById,
    querySelector(selector) {
      if (selector === ".shell") return shell;
      if (selector === ".progress-wrap") return progressWrap;
      return null;
    },
    createElement() {
      const node = { textContent: "", className: "", attributes: {}, setAttribute(name, value) {
        this.attributes[name] = String(value);
      }};
      Object.defineProperty(node, "innerHTML", {
        get() {
          return String(this.textContent)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        },
      });
      node.remove = () => {
        root.errors = root.errors.filter((error) => error !== node);
      };
      return node;
    },
  };
  const values = new Map();
  if (token) {
    values.set("base44_access_token", token);
    values.set("token", token);
  }
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const location = {
    origin: "https://alefit.example",
    search,
    href: "",
    replacedWith: null,
    replace(value) { this.replacedWith = String(value); },
  };
  const window = {
    location,
    history: { replaceState() {} },
    crypto: { randomUUID: () => "onboarding-test-id" },
    requestAnimationFrame(callback) { callback(); },
    ALEFITTrainingEngine: null,
    trackEvent() {},
  };
  const context = {
    window,
    document,
    localStorage: storage,
    sessionStorage: storage,
    URLSearchParams,
    fetch: fetchImpl || (async () => { throw new Error("unexpected fetch"); }),
    Math,
    Date,
    JSON,
    console,
  };
  vm.runInNewContext(onboardingScript, context);
  return { root, elements, getElementById, location, values, progressWrap };
}

async function testNewSignupContinuesIntoFirstOnboardingQuestion() {
  let resolveSignup;
  let requestCount = 0;
  const browser = makeBrowser({
    fetchImpl: async (url) => {
      requestCount += 1;
      assert.match(url, /\/auth\/register$/);
      return new Promise((resolve) => { resolveSignup = resolve; });
    },
  });
  assert.match(browser.root.innerHTML, /Create your ALEFIT account/);
  const form = browser.elements.get("form");
  browser.getElementById("name").value = "Test Athlete";
  browser.getElementById("email").value = "athlete@example.test";
  browser.getElementById("password").value = "correct horse battery";

  const create = browser.elements.get("create");
  const firstSubmit = create.onclick({ preventDefault() {} });
  assert.equal(create.disabled, true);
  assert.match(create.textContent, /Creating account/);
  await create.onclick({ preventDefault() {} });
  assert.equal(requestCount, 1, "duplicate submits must not create a second account");

  resolveSignup({
    ok: true,
    status: 201,
    json: async () => ({
      access_token: "new-user-token",
      user: { id: "new-user", email: "athlete@example.test" },
    }),
  });
  await firstSubmit;

  assert.match(browser.root.innerHTML, /Your account is ready\. Let&#39;s build your personalized training plan\./);
  assert.match(browser.root.innerHTML, /What are you training for\?/);
  assert.equal(browser.values.get("token"), "new-user-token");
  assert.equal(browser.progressWrap.attributes["aria-valuetext"], "Step 1 of 6");
}

async function testSignupFailureShowsRetryableHelpfulError() {
  const browser = makeBrowser({
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "DNS or upstream technical detail" }),
    }),
  });
  browser.getElementById("name").value = "Test Athlete";
  browser.getElementById("email").value = "athlete@example.test";
  browser.getElementById("password").value = "correct horse battery";
  await browser.elements.get("create").onclick({ preventDefault() {} });

  assert.equal(browser.elements.get("create").disabled, false);
  assert.match(browser.root.errors[0].textContent, /temporarily unavailable/i);
  assert.doesNotMatch(browser.root.errors[0].textContent, /DNS|upstream/i);
}

async function testReturningUserWithPlanIsSentToDashboard() {
  const browser = makeBrowser({
    token: "returning-token",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => [{ id: "saved-plan" }],
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(browser.location.replacedWith, "/today.html?view=plan");
}

async function testSignedInUserWithoutPlanStartsOnboarding() {
  const browser = makeBrowser({
    token: "new-user-token",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(browser.root.innerHTML, /What are you training for\?/);
  assert.doesNotMatch(browser.root.innerHTML, /Create your ALEFIT account/);
}

async function run() {
  const tests = [
    testNewSignupContinuesIntoFirstOnboardingQuestion,
    testSignupFailureShowsRetryableHelpfulError,
    testReturningUserWithPlanIsSentToDashboard,
    testSignedInUserWithoutPlanStartsOnboarding,
  ];
  for (const test of tests) {
    await test();
    console.log(`ok - ${test.name}`);
  }
  console.log(`${tests.length} onboarding signup checks passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});