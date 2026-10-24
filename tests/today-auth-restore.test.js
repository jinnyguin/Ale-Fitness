"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("today.js", "utf8").replace(
  "  load();\n}());",
  "  window.__loadToday = load;\n}());",
);

function makePage(restore, dashboardStatus = 503, blockedStorage = false) {
  const elements = new Map();
  function element() { return {innerHTML:"", onclick:null, disabled:false}; }
  const app = element();
  elements.set("app", app);
  const location = {
    origin:"https://www.alefit.org",
    href:"https://www.alefit.org/today.html?view=today",
    search:"?view=today",
    replacedWith:null,
    replace(path) { this.replacedWith = String(path); },
  };
  const storage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  };
  const window = {
    localStorage:storage,
    location,
    history:{state:null, replaceState() {}, pushState() {}, go() {}},
    addEventListener() {},
    scrollTo() {},
    AlefitSession:{restore:restore, accessToken() { return null; }, clear() {}},
    ALEFITTrainingEngine:{sessionForDate() { return null; }},
  };
  if (blockedStorage) {
    Object.defineProperty(window, "localStorage", {
      get() { throw new Error("Storage unavailable"); },
    });
  }
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    createElement:element,
    querySelectorAll() { return []; },
  };
  const requests = [];
  const fetch = async (url, options = {}) => {
    requests.push({
      url:String(url),
      authorization:new Headers(options.headers || {}).get("Authorization"),
    });
    return {ok:false, status:dashboardStatus, json:async()=>({error:"temporarily unavailable"})};
  };
  vm.runInNewContext(source, {
    window, document, fetch, localStorage:storage,
    URL, URLSearchParams, Headers, Date, AbortController,
    setTimeout, clearTimeout, setInterval, clearInterval,
  });
  return {window, app, location, requests, elements};
}

(async function run() {
  let restoreCalls = 0;
  const restored = makePage(async()=> {
    restoreCalls += 1;
    return {authenticated:true, access_token:"cookie-restored-token", user:{id:"saved-athlete"}};
  }, 503, true);
  await restored.window.__loadToday();
  assert.equal(restoreCalls, 1, "Today must hydrate the saved session before its plan request");
  assert.equal(restored.requests[0].url, "/api/apps/6a1f3d189ebdbe71fa7d256c/dashboard-data");
  assert.equal(restored.requests[0].authorization, "Bearer cookie-restored-token");
  assert.equal(restored.location.replacedWith, null, "a valid restored session must not go to sign-in");
  assert.match(restored.app.innerHTML, /Your plan is temporarily unavailable/);

  let clearCalls = 0;
  const signedOut = makePage(async()=>({authenticated:false, user:null}));
  signedOut.window.AlefitSession.clear = ()=>{ clearCalls += 1; };
  await signedOut.window.__loadToday();
  assert.equal(signedOut.location.replacedWith,
    "/Login.html?from_url=https%3A%2F%2Fwww.alefit.org%2Ftoday.html%3Fview%3Dtoday");
  assert.equal(clearCalls, 1, "invalid sessions are cleared, never authorized by local markers");
  assert.equal(signedOut.requests.length, 0);

  const outage = makePage(async()=>{ throw new Error("Session restore temporarily unavailable"); });
  await outage.window.__loadToday();
  assert.equal(outage.location.replacedWith, null, "a temporary auth outage must not discard the signed-in destination");
  assert.match(outage.app.innerHTML, /Your plan is temporarily unavailable/);
  assert.equal(typeof outage.elements.get("retry").onclick, "function");

  console.log("Today direct-entry session restoration, blocked storage, invalid session, and outage checks passed.");
})().catch(error=>{
  console.error(error);
  process.exitCode = 1;
});
