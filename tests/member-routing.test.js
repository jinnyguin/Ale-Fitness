const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const routingSource = fs.readFileSync("member-routing.js", "utf8");
const entrySource = fs.readFileSync("member-entry.js", "utf8");
const appId = "6a1f3d189ebdbe71fa7d256c";

function makeBrowser({ values: initial = {}, fetchImpl, restoreResult } = {}) {
  const values = new Map(Object.entries(initial));
  const location = {
    origin: "https://alefit.example",
    replacedWith: null,
    replace(value) { this.replacedWith = String(value); },
  };
  const localStorage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const window = {
    location,
    localStorage,
    fetch: fetchImpl || (async () => { throw new Error("unexpected fetch"); }),
    AlefitSession: {
      restore: async () => restoreResult || {
        authenticated: !!(values.get("base44_access_token") || values.get("token")),
        user: {id: "restored-member"},
        access_token: values.get("base44_access_token") || values.get("token"),
      },
    },
  };
  vm.runInNewContext(routingSource, { window, URL, URLSearchParams });
  return { window, location, values };
}

async function testMemberHomeWithValidCompleteAccountGoesToDashboard() {
  const browser = makeBrowser({
    values: { alefit_member_account: "remembered", token: "valid" },
    fetchImpl: async (url) => url.endsWith("/auth/me") ?
      { ok: true, status: 200, json: async () => ({ id: "athlete-1" }) } :
      { ok: true, status: 200, json: async () => ({
        user:{id:"athlete-1"}, setup_complete:true, plan:{id:"plan-1"},
      }) },
  });
  await browser.window.AlefitMember.routeFromHome();
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
  assert.equal(browser.values.get("alefit_member_setup_complete"), "1");
  assert.equal(browser.values.get("alefit_member_account"), "athlete-1");
}

async function testMemberHomeWithIncompleteAccountContinuesSetupAfterLogin() {
  const browser = makeBrowser({
    values: { alefit_member_account: "remembered", token: "valid" },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      user:{id:"athlete-2"}, setup_complete:false, plan:null,
    }) }),
  });
  await browser.window.AlefitMember.routeFromHome();
  assert.equal(browser.location.replacedWith, "/Register.html");
  assert.equal(browser.values.get("alefit_member_setup_complete"), "0");
}

async function testExpiredSessionRequiresLoginAndRetainsMemberMemory() {
  const browser = makeBrowser({
    values: {
      alefit_member_account: "athlete-3",
      alefit_member_setup_complete: "1",
      token: "expired",
      base44_access_token: "expired",
    },
    restoreResult: {authenticated:false, user:null},
  });
  await browser.window.AlefitMember.routeFromHome();
  assert.equal(
    browser.location.replacedWith,
    "/Login.html?from_url=%2Ftoday.html%3Fview%3Dtoday",
  );
  assert.equal(browser.values.get("alefit_member_account"), "athlete-3");
  assert.equal(browser.values.has("token"), false);
}

async function testFreshSignInUsesSavedPlanStatusAndNeverReturnsToHomepage() {
  const complete = makeBrowser({
    values: { token: "valid" },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      user:{id:"athlete-4"}, setup_complete:true, plan:{id:"plan"},
    }) }),
  });
  await complete.window.AlefitMember.routeAfterSignIn(
    { id: "athlete-4" },
    "/Register.html",
  );
  assert.equal(complete.location.replacedWith, "/today.html?view=today");

  const incomplete = makeBrowser({
    values: { token: "valid" },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      user:{id:"athlete-5"}, setup_complete:false, plan:null,
    }) }),
  });
  await incomplete.window.AlefitMember.routeAfterSignIn(
    { id: "athlete-5" },
    "/today.html?view=plan",
  );
  assert.equal(incomplete.location.replacedWith, "/Register.html");
}

async function testHomeRestoresCookieSessionEvenWithoutLocalMemberFlags() {
  const browser = makeBrowser({
    restoreResult: {
      authenticated: true,
      user: {id: "cookie-member"},
      access_token: "restored-access",
    },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      user:{id:"cookie-member"}, setup_complete:true, plan:{id:"saved-plan"},
    }) }),
  });
  await browser.window.AlefitMember.routeFromHome();
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
  assert.equal(browser.values.get("alefit_member_account"), "cookie-member");
}

async function testMissingLocalSetupFlagDoesNotOverrideSavedPlan() {
  const browser = makeBrowser({
    values: {token: "valid", alefit_member_account: "member"},
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      user:{id:"member"}, setup_complete:true, plan:{id:"saved-plan"},
    }) }),
  });
  await browser.window.AlefitMember.routeAfterSignIn({id:"member"}, "/Register.html");
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
}

async function testMemberStatusOutageDoesNotMisrouteToOnboardingOrHome() {
  const browser = makeBrowser({
    values: {token: "valid"},
    fetchImpl: async () => ({ok:false, status:503, json:async()=>({error:"unavailable"})}),
  });
  const result = await browser.window.AlefitMember.routeFromHome();
  assert.equal(result.state, "error");
  assert.equal(browser.location.replacedWith, null);
}

function testUnconfirmedMemberWithoutSessionMustAuthenticate() {
  const browser = makeBrowser({
    values: { alefit_member_account: "known", alefit_member_setup_complete: "0" },
  });
  return browser.window.AlefitMember.routeFromHome().then(() => {
    assert.equal(
      browser.location.replacedWith,
      "/Login.html?from_url=%2Ftoday.html%3Fview%3Dtoday",
    );
  });
}

function testHomepageForwardsOAuthCodeToCallback() {
  let destination = null;
  const document = { documentElement: { classList: { remove() {} } } };
  const window = {
    location: {
      origin: "https://alefit.example",
      pathname: "/",
      search: "?code=temporary-code",
      hash: "",
      replace(value) { destination = String(value); },
    },
    AlefitMember: { hasMemberRecord: () => false },
  };
  vm.runInNewContext(entrySource, { window, document, URL, URLSearchParams });
  assert.equal(
    destination,
    "https://alefit.example/auth/callback?code=temporary-code",
  );
}

async function testPublicHomepageOnlyRevealsAfterSessionCheck() {
  let removedPending = false;
  let pending = true;
  let loaderRemoved = false;
  let routeCalls = 0;
  let replacedWith = "";
  const listeners = {};
  const spinner = {style:{}};
  const actions = {style:{}};
  const loader = {
    querySelector(){return spinner;},
    setAttribute(){},
    remove(){loaderRemoved = true;},
  };
  const heading = {textContent:"Getting your coaching space ready"};
  const copy = {textContent:"Checking your sign-in and saved training plan."};
  const elements = {
    "member-entry-loader":loader,
    "member-entry-heading":heading,
    "member-entry-copy":copy,
    "member-entry-actions":actions,
  };
  const document = {
    readyState: "complete",
    documentElement: {classList:{
      add(name){if (name === "member-entry-pending") pending = true;},
      remove(name){removedPending = name === "member-entry-pending"; if (removedPending) pending = false;},
    }},
    getElementById(id){return elements[id] || null;},
  };
  const window = {
    location: {
      origin:"https://alefit.example",
      pathname:"/",
      search:"",
      hash:"",
      replace(value){replacedWith = String(value);},
    },
    addEventListener(name, listener){listeners[name] = listener;},
    AlefitMember: {routeFromHome:async()=>{
      routeCalls += 1;
      if (routeCalls === 1) return {state:"public"};
      window.location.replace("/today.html?view=today");
      return {state:"redirect"};
    }},
  };
  vm.runInNewContext(entrySource, {window, document, URL, URLSearchParams});
  await new Promise(resolve=>setTimeout(resolve, 0));
  assert.equal(removedPending, true);
  assert.equal(loaderRemoved, false, "the loader stays available for browser-history restoration");

  listeners.pagehide();
  assert.equal(pending, true, "leaving the homepage hides the public page in the history cache");
  listeners.pageshow({persisted:true});
  await new Promise(resolve=>setTimeout(resolve, 0));
  assert.equal(routeCalls, 2, "a cached homepage rechecks the authenticated member and saved plan");
  assert.equal(replacedWith, "/today.html?view=today");
  assert.equal(pending, true, "the public homepage stays hidden while returning members are routed");
}

async function run() {
  await testMemberHomeWithValidCompleteAccountGoesToDashboard();
  await testMemberHomeWithIncompleteAccountContinuesSetupAfterLogin();
  await testExpiredSessionRequiresLoginAndRetainsMemberMemory();
  await testFreshSignInUsesSavedPlanStatusAndNeverReturnsToHomepage();
  await testHomeRestoresCookieSessionEvenWithoutLocalMemberFlags();
  await testMissingLocalSetupFlagDoesNotOverrideSavedPlan();
  await testMemberStatusOutageDoesNotMisrouteToOnboardingOrHome();
  await testUnconfirmedMemberWithoutSessionMustAuthenticate();
  testHomepageForwardsOAuthCodeToCallback();

  await testPublicHomepageOnlyRevealsAfterSessionCheck();
  console.log("8 member routing scenarios, OAuth callback fallback, and public homepage guard passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
