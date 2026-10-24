const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const trainingEngine = require("../training-engine.js");

const onboardingScript = fs.readFileSync("onboarding.js", "utf8");

function makeElement(id, root, getElementById) {
  const element = {
    id,
    value: "",
    type: "",
    tagName: "DIV",
    checked: false,
    textContent: "",
    innerHTML: id === "google-signup" ? "<span>Continue with Google</span>" : "",
    disabled: false,
    style: {},
    dataset: {},
    attributes: {},
    listeners: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    hasAttribute(name) { return name in this.attributes; },
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

function makeBrowser({ fetchImpl, token = "", search = "", draft, localDraftOnly, puter, oauth, emailCode } = {}) {
  const elements = new Map();
  let controls = [];
  let tiles = [];
  let edits = [];
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
    querySelectorAll(selector) {
      if (selector === ".tile" || selector === "#sport-options .tile") return tiles;
      if (selector === ".edit-answer") return edits;
      if (selector === "input, select, textarea") return controls;
      if (selector === 'input[type="number"]') return controls.filter((node) => node.type === "number");
      if (selector === "[data-available-day]") return controls.filter((node) => node.availableDay);
      if (selector === "[data-available-day]:checked") return controls.filter((node) => node.availableDay && node.checked);
      return [];
    },
    appendChild(node) { this.errors.push(node); },
  };
  const getElementById = (id) => {
    if (id === "onboarding") return root;
    if (!["progress", "progress-label", "progress-detail", "heading"].includes(id) &&
        !new RegExp(`id="${id}"`).test(root.innerHTML)) return null;
    if (!elements.has(id)) elements.set(id, makeElement(id, root, getElementById));
    return elements.get(id);
  };
  let markup = "";
  Object.defineProperty(root, "innerHTML", {
    get() { return markup; },
    set(value) {
      markup = value;
      elements.clear();
      controls = [];
      tiles = [];
      edits = [];
      root.errors = [];
      const attribute = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1] || "";
      for (const match of value.matchAll(/<(select|textarea)\b([^>]*?)>([\s\S]*?)<\/\1>/g)) {
        const node = getElementById(attribute(match[2], "id"));
        node.tagName = match[1].toUpperCase();
        node.options = [...match[3].matchAll(/<option([^>]*)>(.*?)<\/option>/g)]
          .map((option) => ({ value: attribute(option[1], "value"), selected: /\bselected\b/.test(option[1]) }));
        node.value = match[1] === "select" ? (node.options.find((option) => option.selected) || node.options[0] || {}).value || "" : match[3];
        controls.push(node);
      }
      for (const match of value.matchAll(/<input\b([^>]*)>/g)) {
        const id = attribute(match[1], "id");
        const node = id ? getElementById(id) : makeElement("", root, getElementById);
        node.tagName = "INPUT";
        node.type = attribute(match[1], "type") || "text";
        node.value = attribute(match[1], "value");
        node.min = attribute(match[1], "min");
        node.max = attribute(match[1], "max");
        node.availableDay = /data-available-day/.test(match[1]);
        node.checked = /\bchecked\b/.test(match[1]);
        controls.push(node);
      }
      for (const match of value.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
        const id = attribute(match[1], "id");
        const node = id ? getElementById(id) : makeElement("", root, getElementById);
        node.dataset.value = attribute(match[1], "data-value");
        node.dataset.step = attribute(match[1], "data-step");
        node.dataset.question = attribute(match[1], "data-question");
        node.textContent = match[2].replace(/<[^>]+>/g, "");
        if (/\bclass="tile /.test(match[1])) tiles.push(node);
        if (/edit-answer/.test(match[1])) edits.push(node);
      }
    },
  });
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
  const sessionValues = new Map();
  if (token) {
    values.set("base44_access_token", token);
    values.set("token", token);
    sessionValues.set("base44_access_token", token);
    sessionValues.set("token", token);
  }
  if (draft) {
    values.set("alefit_onboarding_draft", JSON.stringify(draft));
    sessionValues.set("alefit_onboarding_draft", JSON.stringify(draft));
  }
  if (localDraftOnly) values.set("alefit_onboarding_draft", JSON.stringify(localDraftOnly));
  const makeStorage = (store) => ({
    getItem(key) { return store.get(key) || null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
  });
  const localStorage = makeStorage(values);
  const sessionStorage = makeStorage(sessionValues);
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
    puter: puter || { auth: { isSignedIn: () => true, signIn: async () => ({}) } },
    AlefitOAuth: oauth,
    AlefitEmailCode: emailCode || {
      async send() { throw new Error("unexpected email-code send"); },
      async verify() { throw new Error("unexpected email-code verify"); },
    },
    AlefitSession: {
      save(session) {
        values.set("base44_access_token", session.access_token);
        values.set("token", session.access_token);
        values.set("alefit_user", JSON.stringify(session.user));
      },
    },
    ALEFITTrainingEngine: trainingEngine,
    AlefitMember: {
      markSignedIn(user) { values.set("alefit_member_account", user && user.id || "known"); },
      markSetupComplete(complete) { values.set("alefit_member_setup_complete", complete ? "1" : "0"); },
      async routeAfterSignIn(user, preferredPath) {
        location.replace(preferredPath);
        return preferredPath;
      },
    },
    trackEvent() {},
  };
  const context = {
    window,
    document,
    localStorage,
    sessionStorage,
    URLSearchParams,
    fetch: fetchImpl || (async () => { throw new Error("unexpected fetch"); }),
    Math,
    Date,
    JSON,
    console,
    setInterval: () => 1,
    clearInterval() {},
  };
  vm.runInNewContext(onboardingScript, context);
  return { root, elements, getElementById, location, values, progressWrap, window };
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
  const order = [];
  const browser = makeBrowser({
    draft:{step:6, prefs:onboardingPrefs, plan:null, onboardingId:"signup-plan-test"},
    puter: { auth: {
      isSignedIn: () => false,
      signIn: async (options) => {
        order.push("puter");
        assert.deepEqual(JSON.parse(JSON.stringify(options)), { attempt_temp_user_creation: true });
        return { temporary: true };
      }
    } },
    fetchImpl:async (url, options) => {
      if (/\/auth\/register$/.test(url)) {
        order.push("alefit");
        return {
          ok:true, status:201,
          json:async () => ({access_token:"test-token", user:{id:"test-user",email:"runner@example.test"}})
        };
      }
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
  browser.getElementById("puter-signup-consent").checked = true;
  await browser.elements.get("create").onclick({preventDefault(){}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(browser.location.replacedWith, "/today.html");
  assert.equal(browser.values.get("token"), "test-token");
  assert.equal(browser.values.get("alefit_onboarding_draft"), undefined);
  assert.deepEqual(order, ["puter", "alefit"], "temporary Puter setup must finish before ALEFIT creates the account");
}

async function testEmailCodeSignupPreservesPlanAndCreatesSession() {
  const order = [];
  const browser = makeBrowser({
    draft: {
      step:6,
      onboardingId:"email-code-plan",
      prefs:{
        sport:"basketball", goals:["speed"], experience:"new", consistency:"low",
        equipment:["bodyweight"], days:2, duration:40, age:"adult",
        availableDays:[1,4], limitations:"", load:""
      },
      plan:{name:"Basketball speed base", summary:"A two-day introductory block."},
    },
    puter: {auth:{
      isSignedIn:() => false,
      signIn:async (options) => {
        order.push("puter");
        assert.deepEqual(JSON.parse(JSON.stringify(options)), {attempt_temp_user_creation:true});
        return {temporary:true};
      },
    }},
    emailCode: {
      async send(email, options) {
        order.push("send-code");
        assert.equal(email, "athlete@example.test");
        assert.deepEqual(JSON.parse(JSON.stringify(options)), {
          createUser:true,
          fullName:"Test Athlete",
        });
        return {sent:true,retry_after_seconds:60};
      },
      async verify(email, code) {
        order.push("verify-code");
        assert.equal(email, "athlete@example.test");
        assert.equal(code, "004271");
        return {
          access_token:"otp-new-user-token",
          refresh_token:"otp-new-user-refresh",
          user:{id:"otp-new-user",email},
        };
      },
    },
  });
  click(browser, "next");
  browser.getElementById("name").value = "Test Athlete";
  browser.getElementById("email").value = "athlete@example.test";
  browser.getElementById("puter-signup-consent").checked = true;
  await click(browser, "email-code-start");
  assert.equal(browser.getElementById("email-code-panel").hidden, false);
  assert.equal(browser.getElementById("email").readOnly, true);
  assert.ok(browser.values.get("alefit_onboarding_draft"), "the plan draft is persisted before requesting a code");

  browser.getElementById("email-code-input").value = "004271";
  await click(browser, "email-code-verify");
  assert.deepEqual(order, ["puter", "send-code", "verify-code"]);
  assert.equal(browser.values.get("token"), "otp-new-user-token");
  assert.equal(browser.values.get("alefit_member_account"), "otp-new-user");
  assert.equal(browser.location.replacedWith, "/Register.html?email_code_signup=1");
  assert.ok(browser.values.get("alefit_onboarding_draft"), "the plan draft stays until durable plan-save succeeds");
}

async function testEmailCodeReturnResumesAndDurablySavesTheGuestPlan() {
  const calls = [];
  const browser = makeBrowser({
    token:"verified-email-code-token",
    search:"?email_code_signup=1",
    draft:{
      step:6,
      onboardingId:"email-code-resume-plan",
      prefs:{
        sport:"strength", goals:["strength"], experience:"new", consistency:"low",
        equipment:["dumbbells"], days:2, duration:40, age:"adult",
        availableDays:[1,4], limitations:"", load:""
      },
      plan:{name:"Strength starter",summary:"A two-day beginner block.",weeks:[{week:1,sessions:[]}]},
    },
    fetchImpl:async (url, options) => {
      calls.push(url);
      if (/\/member-status$/.test(url)) {
        return {
          ok:true,status:200,
          json:async()=>({user:{id:"otp-new-user"},setup_complete:false,plan:null}),
        };
      }
      assert.match(url, /\/onboarding-plan$/);
      const savedPlan = JSON.parse(options.body).generated_plan;
      assert.equal(savedPlan.profile.sport, "strength");
      assert.equal(savedPlan.weeks.length, 4);
      return {ok:true,status:200,json:async()=>({id:"saved-email-code-plan"})};
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(calls.some((url) => /\/onboarding-plan$/.test(url)));
  assert.equal(browser.values.get("alefit_onboarding_draft"), undefined);
  assert.equal(browser.location.replacedWith, "/today.html");
}

async function testSignupFailureShowsRetryableHelpfulError() {
  const browser = makeBrowser({
    draft: { step: 6, prefs: { sport: "general", goals: ["fitness"], equipment: ["bodyweight"], age: "adult" } },
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "DNS or upstream technical detail" }),
    }),
  });
  click(browser, "next");
  browser.getElementById("name").value = "Test Athlete";
  browser.getElementById("email").value = "athlete@example.test";
  browser.getElementById("password").value = "correct horse battery";
  browser.getElementById("puter-signup-consent").checked = true;
  await browser.elements.get("create").onclick({ preventDefault() {} });

  assert.equal(browser.elements.get("create").disabled, false);
  assert.match(browser.root.errors[0].textContent, /temporarily unavailable/i);
  assert.doesNotMatch(browser.root.errors[0].textContent, /DNS|upstream/i);
}

async function testConfirmationRequiredKeepsMemberAndDraftForEmailReturn() {
  const browser = makeBrowser({
    draft: {
      step: 6,
      onboardingId: "confirmation-draft",
      prefs: { sport: "basketball", goals: ["conditioning"], equipment: ["bodyweight"], age: "adult" },
    },
    fetchImpl: async () => ({
      ok: true,
      status: 202,
      json: async () => ({ confirmation_required: true }),
    }),
  });
  click(browser, "next");
  browser.getElementById("name").value = "Test Athlete";
  browser.getElementById("email").value = "athlete@example.test";
  browser.getElementById("password").value = "correct horse battery";
  browser.getElementById("puter-signup-consent").checked = true;
  await browser.elements.get("create").onclick({ preventDefault() {} });

  assert.match(browser.root.innerHTML, /Check your email/);
  assert.match(browser.root.innerHTML, /I confirmed — continue/);
  assert.equal(browser.values.get("alefit_member_account"), "known");
  assert.equal(browser.values.get("alefit_member_setup_complete"), "0");
  assert.ok(browser.values.get("alefit_onboarding_draft"));
}

async function testReturningUserWithPlanIsSentToDashboard() {
  const browser = makeBrowser({
    token: "returning-token",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        user: {id:"returning-user"},
        setup_complete:true,
        plan: {id:"saved-plan"},
      }),
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
}

async function testSignedInUserWithoutPlanStartsOnboarding() {
  const browser = makeBrowser({
    token: "new-user-token",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        user:{id:"new-user"},
        setup_complete:false,
        plan:null,
      }),
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(browser.root.innerHTML, /What are you training for\?/);
  assert.doesNotMatch(browser.root.innerHTML, /Create your ALEFIT account/);
}

function savedDraft(browser) {
  return JSON.parse(browser.values.get("alefit_onboarding_draft"));
}
function click(browser, id) {
  const button = browser.getElementById(id);
  assert.ok(button, `Missing button: ${id}`);
  return button.onclick({ preventDefault() {} });
}
function choose(browser, value) {
  const tile = browser.root.querySelectorAll(".tile").find((node) => node.dataset.value === value);
  assert.ok(tile, `Missing option: ${value}`);
  tile.onclick();
}
function enter(browser, id, value) {
  const input = browser.getElementById(id);
  assert.ok(input, `Missing input: ${id}`);
  input.value = String(value);
  (input.listeners.input || input.listeners.change)();
}

async function testSportChoiceDoesNotExpandDetails() {
  const browser = makeBrowser();
  choose(browser, "running");
  assert.equal(savedDraft(browser).questionId, "sport");
  assert.equal(browser.getElementById("run-volume"), null);
  assert.doesNotMatch(browser.root.innerHTML, /sport-detail-accordion|Current weekly sport load/);
  click(browser, "next");
  assert.equal(savedDraft(browser).questionId, "sport-detail");
  assert.equal(savedDraft(browser).step, 0);
  assert.ok(browser.getElementById("back"), "Back is available within step 0");
  assert.equal(browser.getElementById("run-distance"), null);
  assert.match(browser.progressWrap.attributes["aria-valuetext"], /Question 2 of 23/);
  enter(browser, "sport-detail", "trail");
  click(browser, "next");
  assert.equal(savedDraft(browser).questionId, "run-distance");
  click(browser, "back");
  assert.equal(browser.getElementById("sport-detail").value, "trail");
}

async function testLiveDraftReloadAndAbsentFieldsPreserved() {
  const original = {
    step: 4, questionId: "duration", prefs: {
      sport: "running", goals: ["conditioning"], equipment: ["bodyweight"],
      duration: 45, load: "practice Tue", availableDays: [0, 4], preferredLongRunDay: 4,
      age: "over55", limitations: "no jumps", weeklyRunVolume: 62
    }
  };
  const browser = makeBrowser({ draft: original });
  enter(browser, "duration", 35);
  const draft = savedDraft(browser);
  assert.equal(draft.prefs.duration, 35, "Saved before Continue");
  for (const key of ["load", "availableDays", "preferredLongRunDay", "age", "limitations", "weeklyRunVolume"]) {
    assert.deepEqual(draft.prefs[key], original.prefs[key], `${key} survives absent inputs`);
  }
  const reloaded = makeBrowser({ draft });
  assert.equal(reloaded.getElementById("duration").value, "35");
  assert.equal(savedDraft(reloaded).questionId, "duration");
  click(reloaded, "next");
  assert.equal(savedDraft(reloaded).questionId, "available-days");
  const weekdays = reloaded.root.querySelectorAll("[data-available-day]");
  weekdays.forEach((node) => { node.checked = Number(node.value) === 2; });
  weekdays[2].listeners.change();
  assert.deepEqual(savedDraft(reloaded).prefs.availableDays, [2]);
  click(reloaded, "next");
  enter(reloaded, "load", "game Saturday");
  assert.deepEqual(savedDraft(reloaded).prefs.availableDays, [2]);
  assert.equal(savedDraft(reloaded).prefs.duration, 35);
  click(reloaded, "back");
  assert.equal(reloaded.root.querySelectorAll("[data-available-day]:checked")[0].value, "2");
}

async function testAgeAndLimitationsAreIndependent() {
  const browser = makeBrowser({ draft: { step: 5, prefs: {
    sport: "general", goals: ["fitness"], equipment: ["bodyweight"], age: "adult", limitations: "avoid impact"
  } } });
  assert.equal(browser.getElementById("limitations"), null);
  enter(browser, "age", "over55");
  click(browser, "next");
  assert.equal(browser.getElementById("age"), null);
  assert.equal(browser.getElementById("limitations").value, "avoid impact");
  enter(browser, "limitations", "no overhead work");
  const reload = makeBrowser({ draft: savedDraft(browser) });
  assert.equal(reload.getElementById("limitations").value, "no overhead work");
  click(reload, "back");
  assert.equal(reload.getElementById("age").value, "over55");
  assert.equal(savedDraft(reload).prefs.limitations, "no overhead work");
}

async function testSportSwitchRestoresConditionalAnswers() {
  const browser = makeBrowser({ draft: { step: 0, prefs: {
    sport: "running", goals: ["speed"], equipment: ["bands"], sportDetail: "trail",
    runDistance: "10K", weeklyRunVolume: 87, longestRun: 31, raceDetail: "October"
  } } });
  click(browser, "change-sport");
  choose(browser, "strength");
  assert.equal(savedDraft(browser).prefs.weeklyRunVolume, undefined);
  click(browser, "next");
  assert.equal(savedDraft(browser).questionId, "sport-detail");
  assert.match(browser.root.innerHTML, /Strength training style/);
  enter(browser, "sport-detail", "powerbuilding");
  click(browser, "next");
  assert.equal(savedDraft(browser).questionId, "sport-focus", "No running/season fields for strength");
  click(browser, "back");
  click(browser, "back");
  click(browser, "change-sport");
  choose(browser, "running");
  assert.equal(savedDraft(browser).prefs.weeklyRunVolume, 87);
  assert.equal(savedDraft(browser).prefs.sportDetail, "trail");
  assert.deepEqual(savedDraft(browser).prefs.goals, ["speed"]);
  click(browser, "next");
  assert.equal(browser.getElementById("sport-detail").value, "trail");
  click(browser, "back");
  click(browser, "change-sport");
  choose(browser, "strength");
  assert.equal(savedDraft(browser).prefs.sportDetail, "powerbuilding");
  assert.equal(savedDraft(browser).prefs.runDistance, undefined);
}

async function testRequiredQuestionsAndNumericValidation() {
  const browser = makeBrowser();
  click(browser, "next");
  assert.match(browser.root.errors[0].textContent, /Choose a training focus/);
  choose(browser, "running");
  click(browser, "next");
  click(browser, "skip");
  click(browser, "skip");
  assert.equal(savedDraft(browser).questionId, "run-volume");
  enter(browser, "run-volume", 601);
  click(browser, "next");
  assert.equal(savedDraft(browser).questionId, "run-volume");
  assert.match(browser.root.errors[0].textContent, /0 to 600/);
  enter(browser, "run-volume", 48);
  click(browser, "next");
  enter(browser, "longest-run", -1);
  click(browser, "next");
  assert.match(browser.root.errors[0].textContent, /0 to 180/);
  click(browser, "skip");
  assert.equal(savedDraft(browser).prefs.longestRun, 0);

  for (const [step, questionId, prefs, message] of [
    [1, "goals", {}, /outcome/],
    [2, "experience", {}, /experience/],
    [3, "equipment", {}, /equipment/],
    [5, "age", {}, /age range/]
  ]) {
    const required = makeBrowser({ draft: { step, questionId, prefs } });
    click(required, "next");
    assert.equal(savedDraft(required).step, step);
    assert.match(required.root.errors[0].textContent, message);
  }
  const duration = makeBrowser({ draft: { step: 4, questionId: "duration", prefs: {} } });
  enter(duration, "duration", "");
  click(duration, "next");
  assert.match(duration.root.errors[0].textContent, /20 to 120/);
  enter(duration, "duration", 121);
  click(duration, "next");
  assert.equal(savedDraft(duration).questionId, "duration");
  enter(duration, "duration", 25);
  click(duration, "next");
  assert.equal(savedDraft(duration).questionId, "available-days");

  const load = makeBrowser({ draft: { step: 0, questionId: "sport-load", prefs: { sport: "basketball" } } });
  enter(load, "sport-sessions", 2.5);
  click(load, "next");
  assert.match(load.root.errors[0].textContent, /whole sessions/);
  enter(load, "sport-sessions", 3);
  enter(load, "sport-session-minutes", 241);
  click(load, "next");
  assert.match(load.root.errors[0].textContent, /0 to 240/);
}

async function testAllSportsHaveShortContextualScreensAndBack() {
  const starter = makeBrowser();
  const sports = starter.root.querySelectorAll(".tile").map((node) => node.dataset.value);
  assert.equal(sports.length, 22);
  for (const sport of sports) {
    const browser = makeBrowser({ draft: { prefs: {
      sport, goals: ["strength"], experience: "new", equipment: ["bodyweight"], age: "adult"
    } } });
    const path = [];
    for (let guard = 0; savedDraft(browser).step < 6 && guard < 40; guard++) {
      const draft = savedDraft(browser);
      path.push(draft.questionId);
      const inputs = browser.root.querySelectorAll("input, select, textarea").filter((node) => node.id !== "sport-search");
      if (draft.questionId !== "available-days") {
        assert.ok(inputs.length <= 2, `${sport}/${draft.questionId} has ${inputs.length} inputs`);
      }
      const tileQuestions = ["sport", "goals", "experience", "equipment", "days"];
      if (!tileQuestions.includes(draft.questionId)) {
        assert.equal(inputs.length, draft.questionId === "sport-load" ? 2 :
          draft.questionId === "available-days" ? 7 : 1, `${sport}/${draft.questionId} mounts its real fields`);
      }
      const reloaded = makeBrowser({ draft });
      assert.equal(savedDraft(reloaded).questionId, draft.questionId, `${sport} reload restores ${draft.questionId}`);
      assert.equal(savedDraft(reloaded).substep, draft.substep);
      assert.deepEqual(savedDraft(reloaded).prefs, draft.prefs);
      click(browser, "next");
    }
    assert.equal(savedDraft(browser).step, 6, `${sport} reaches preview`);
    assert.equal(browser.progressWrap.attributes["aria-valuenow"], "100");
    assert.equal(savedDraft(browser).plan.weeks.length, 4);
    assert.ok(path.includes("consistency"));
    assert.ok(path.includes("load"));
    assert.ok(path.includes("available-days"));
    assert.ok(path.includes("limitations"));
    assert.equal(path.includes("preferred-long-day"), ["running", "cross-country"].includes(sport));
    assert.equal(path.includes("working-weights"), sport === "strength");
    assert.equal(path.includes("season"), !["general", "strength", "mobility", "hiit"].includes(sport));
    for (const questionId of path.slice().reverse()) {
      click(browser, "back");
      assert.equal(savedDraft(browser).questionId, questionId, `${sport} back to ${questionId}`);
    }
    assert.equal(browser.getElementById("back"), null);
  }
}

async function testPreviewEditsReachLogicalQuestions() {
  const browser = makeBrowser({ draft: { step: 6, prefs: {
    sport: "basketball", position: "wing", sportFocus: "lateral-step",
    sportExperience: "1-3-years", sportSessionsPerWeek: 3, sportSessionMinutes: 65,
    sportIntensity: "hard", goals: ["jump"], equipment: ["bodyweight"],
    experience: "regular", age: "adult", days: 3, duration: 45
  } } });
  const edits = browser.root.querySelectorAll(".edit-answer");
  const ids = edits.map((node) => node.dataset.question);
  for (const id of ["sport", "position", "sport-focus", "sport-experience", "sport-load", "goals", "experience", "equipment", "days", "age"]) {
    assert.ok(ids.includes(id), `Preview edit for ${id}`);
    const fresh = makeBrowser({ draft: savedDraft(browser) });
    fresh.root.querySelectorAll(".edit-answer").find((node) => node.dataset.question === id).onclick();
    assert.equal(savedDraft(fresh).questionId, id);
  }
  click(browser, "back");
  assert.equal(savedDraft(browser).questionId, "limitations");
  click(browser, "next");
  assert.equal(savedDraft(browser).step, 6);
  click(browser, "next");
  assert.match(browser.root.innerHTML, /Create your ALEFIT account/);
  assert.equal(savedDraft(browser).step, 6, "Auth contract retains preview step");
}

async function testStableQuestionIdAndLegacyDraftCompatibility() {
  const browser = makeBrowser({ draft: {
    step: 2, substep: 0, questionId: "working-weights",
    prefs: { sport: "strength", familiarity: "confident", workingWeights: "deadlift 185lb" }
  } });
  assert.equal(savedDraft(browser).substep, 3, "Stable ID wins over stale numeric index");
  assert.equal(browser.getElementById("working-weights").value, "deadlift 185lb");
  enter(browser, "working-weights", "deadlift 195lb");
  click(browser, "back");
  assert.equal(savedDraft(browser).questionId, "familiarity");
  assert.equal(browser.getElementById("familiarity").value, "confident");
  assert.equal(savedDraft(browser).prefs.workingWeights, "deadlift 195lb");
  const legacy = makeBrowser({ draft: { step: 4, prefs: { sport: "general", duration: 55 } } });
  assert.equal(savedDraft(legacy).questionId, "days");
  assert.equal(savedDraft(legacy).prefs.days, 3);
  click(legacy, "next");
  assert.equal(legacy.getElementById("duration").value, "55");
  enter(legacy, "duration", "");
  const reload = makeBrowser({ draft: savedDraft(legacy) });
  assert.equal(reload.getElementById("duration").value, "", "Blank in-progress input survives reload");
}

async function testDraftCanResumeFromAnotherTabAfterEmailConfirmation() {
  const browser = makeBrowser({
    localDraftOnly: {
      step: 2,
      substep: 0,
      questionId: "working-weights",
      prefs: { sport: "strength", familiarity: "confident", workingWeights: "deadlift 185lb" },
    },
  });
  assert.equal(browser.getElementById("working-weights").value, "deadlift 185lb");
  enter(browser, "working-weights", "deadlift 195lb");
  assert.equal(savedDraft(browser).prefs.workingWeights, "deadlift 195lb");
  assert.ok(browser.values.get("alefit_onboarding_draft"));
}

async function testSignupRequiresPuterConsentAndHandlesCancelledSetup() {
  let alefitRequests = 0;
  let puterAttempts = 0;
  const browser = makeBrowser({
    draft: { step: 6, prefs: { sport: "general", goals: ["fitness"], equipment: ["bodyweight"], age: "adult" } },
    puter: { auth: {
      isSignedIn: () => false,
      signIn: async () => {
        puterAttempts += 1;
        const error = new Error("Authentication window closed");
        error.error = "auth_window_closed";
        throw error;
      }
    } },
    fetchImpl: async () => {
      alefitRequests += 1;
      throw new Error("ALEFIT signup must not run");
    },
  });
  click(browser, "next");
  browser.getElementById("name").value = "Test Athlete";
  browser.getElementById("email").value = "athlete@example.test";
  browser.getElementById("password").value = "correct horse battery";
  await browser.elements.get("create").onclick({ preventDefault() {} });
  assert.equal(puterAttempts, 0, "Puter identity creation requires explicit consent");
  assert.equal(alefitRequests, 0);
  browser.getElementById("puter-signup-consent").checked = true;
  await browser.elements.get("create").onclick({ preventDefault() {} });
  assert.equal(puterAttempts, 1);
  assert.equal(alefitRequests, 0, "cancelled Puter setup must not create a partial ALEFIT account");
  assert.equal(browser.elements.get("create").disabled, false);
}

async function testGoogleSignupPreparesTemporaryPuterIdentityFirst() {
  const order = [];
  const browser = makeBrowser({
    draft: { step: 6, prefs: { sport: "general", goals: ["fitness"], equipment: ["bodyweight"], age: "adult" } },
    puter: { auth: {
      isSignedIn: () => false,
      signIn: async (options) => {
        order.push("puter");
        assert.deepEqual(JSON.parse(JSON.stringify(options)), { attempt_temp_user_creation: true });
      }
    } },
    oauth: { startGoogle: async (returnTo) => {
      order.push("google");
      assert.equal(returnTo, "/Register.html?google_signup=1");
    } },
  });
  click(browser, "next");
  browser.getElementById("puter-signup-consent").checked = true;
  await browser.getElementById("google-signup").onclick();
  assert.deepEqual(order, ["puter", "google"]);
}

async function run() {
  const tests = [
    testGuestStartsWithOnboardingBeforeAccount,
    testSignupSavesGuestPlanAndOpensToday,
    testEmailCodeSignupPreservesPlanAndCreatesSession,
    testEmailCodeReturnResumesAndDurablySavesTheGuestPlan,
    testSignupFailureShowsRetryableHelpfulError,
    testSignupRequiresPuterConsentAndHandlesCancelledSetup,
    testGoogleSignupPreparesTemporaryPuterIdentityFirst,
    testConfirmationRequiredKeepsMemberAndDraftForEmailReturn,
    testReturningUserWithPlanIsSentToDashboard,
    testSignedInUserWithoutPlanStartsOnboarding,
    testSportChoiceDoesNotExpandDetails,
    testLiveDraftReloadAndAbsentFieldsPreserved,
    testAgeAndLimitationsAreIndependent,
    testSportSwitchRestoresConditionalAnswers,
    testRequiredQuestionsAndNumericValidation,
    testAllSportsHaveShortContextualScreensAndBack,
    testPreviewEditsReachLogicalQuestions,
    testStableQuestionIdAndLegacyDraftCompatibility,
    testDraftCanResumeFromAnotherTabAfterEmailConfirmation,
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