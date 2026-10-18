const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const routingSource = fs.readFileSync("member-routing.js", "utf8");
const entrySource = fs.readFileSync("member-entry.js", "utf8");
const appId = "6a1f3d189ebdbe71fa7d256c";

function makeBrowser({ values: initial = {}, fetchImpl } = {}) {
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
  };
  vm.runInNewContext(routingSource, { window, URL, URLSearchParams });
  return { window, location, values };
}

async function testMemberHomeWithValidCompleteAccountGoesToDashboard() {
  const browser = makeBrowser({
    values: { alefit_member_account: "remembered", token: "valid" },
    fetchImpl: async (url) => url.endsWith("/auth/me") ?
      { ok: true, status: 200, json: async () => ({ id: "athlete-1" }) } :
      { ok: true, status: 200, json: async () => [{ id: "plan-1" }] },
  });
  await browser.window.AlefitMember.routeFromHome();
  assert.equal(browser.location.replacedWith, "/today.html?view=today");
  assert.equal(browser.values.get("alefit_member_setup_complete"), "1");
  assert.equal(browser.values.get("alefit_member_account"), "athlete-1");
}

async function testMemberHomeWithIncompleteAccountContinuesSetupAfterLogin() {
  const browser = makeBrowser({
    values: { alefit_member_account: "remembered", token: "valid" },
    fetchImpl: async (url) => url.endsWith("/auth/me") ?
      { ok: true, status: 200, json: async () => ({ id: "athlete-2" }) } :
      { ok: true, status: 200, json: async () => [] },
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
    fetchImpl: async () => ({ ok: false, status: 401 }),
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
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => [{ id: "plan" }] }),
  });
  await complete.window.AlefitMember.routeAfterSignIn(
    { id: "athlete-4" },
    "/",
  );
  assert.equal(complete.location.replacedWith, "/today.html?view=plan");

  const incomplete = makeBrowser({
    values: { token: "valid" },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => [] }),
  });
  await incomplete.window.AlefitMember.routeAfterSignIn(
    { id: "athlete-5" },
    "/today.html?view=plan",
  );
  assert.equal(incomplete.location.replacedWith, "/Register.html");
}

function testUnconfirmedMemberWithoutSessionMustAuthenticate() {
  const browser = makeBrowser({
    values: { alefit_member_account: "known", alefit_member_setup_complete: "0" },
  });
  return browser.window.AlefitMember.routeFromHome().then(() => {
    assert.equal(
      browser.location.replacedWith,
      "/Login.html?from_url=%2FRegister.html",
    );
  });
}

async function run() {
  await testMemberHomeWithValidCompleteAccountGoesToDashboard();
  await testMemberHomeWithIncompleteAccountContinuesSetupAfterLogin();
  await testExpiredSessionRequiresLoginAndRetainsMemberMemory();
  await testFreshSignInUsesSavedPlanStatusAndNeverReturnsToHomepage();
  await testUnconfirmedMemberWithoutSessionMustAuthenticate();

  let removedPending = false;
  const document = { documentElement: { classList: { remove(name) { removedPending = name === "member-entry-pending"; } } } };
  const publicWindow = { AlefitMember: { hasMemberRecord: () => false }, location: {} };
  vm.runInNewContext(entrySource, { window: publicWindow, document });
  assert.equal(removedPending, true);
  console.log("5 member routing scenarios and public homepage guard passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
