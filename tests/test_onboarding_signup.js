const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const trainingEngine = require("../training-engine.js");

const onboardingScript = fs.readFileSync("onboarding.js", "utf8");

function makeElement(id, root, getElementById) {
  const element = {
    id,
    value: "",
    textContent: "",
    innerHTML: id === "google-signup" ? "<span>Continue with Google</span>" : "",
    disabled: false,
    style: {},
    dataset: {},
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

function makeBrowser({ fetchImpl, token = "", search = "", draft } = {}) {
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
  if (draft) values.set("alefit_onboarding_draft", JSON.stringify(draft));
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
    ALEFITTrainingEngine: trainingEngine,
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

async function testGuestStartsWithOnboardingBeforeAccount() {
  const browser = makeBrowser();
  assert.match(browser.root.innerHTML, /What are you training for\?/);
  assert.doesNotMatch(browser.root.innerHTML, /Create your ALEFIT account/);
  assert.match(browser.root.innerHTML, /crossfit/);
}

async function testSignupSavesGuestPlanAndOpensToday() {
  const onboardingPrefs = {
    sport:"running", goals:["conditioning"], experience:"new", consistency:"low",
    equipment:["bodyweight"], days:2, duration:45, age:"adult",
    weeklyRunVolume:10, longestRun:5, availableDays:[0, 3, 6],
    preferredLongRunDay:6, limitations:"", load:""
  };
  const browser = makeBrowser({
    draft:{step:6, prefs:onboardingPrefs, plan:null, onboardingId:"signup-plan-test"},
    fetchImpl:async (url, options) => {
      if (/\/auth\/register$/.test(url)) return {
        ok:true, status:201,
        json:async () => ({access_token:"test-token", user:{id:"test-user",email:"runner@example.test"}})
      };
      assert.match(url, /\/onboarding-plan$/);
      const payload = JSON.parse(options.body);
      assert.equal(payload.preferences.sport, "running");
      assert.equal(payload.preferences.preferredLongRunDay, 6);
      assert.equal(payload.generated_plan.weeks.length, 4);
      return {ok:true, status:200};
    }
  });
  assert.match(browser.root.innerHTML, /Plan review/);
  browser.elements.get("next").onclick({preventDefault(){}});
  browser.getElementById("name").value = "Test Runner";
  browser.getElementById("email").value = "runner@example.test";
  browser.getElementById("password").value = "correct horse battery";
  await browser.elements.get("create").onclick({preventDefault(){}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(browser.location.replacedWith, "/today.html");
  assert.equal(browser.values.get("token"), "test-token");
  assert.equal(browser.values.get("alefit_onboarding_draft"), undefined);
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
  assert.equal(browser.location.replacedWith, "/today.html");
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
    testGuestStartsWithOnboardingBeforeAccount,
    testSignupSavesGuestPlanAndOpensToday,
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