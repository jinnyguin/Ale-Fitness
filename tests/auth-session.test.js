const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");

function browser(mode) {
  const data = new Map();
  let refreshes = 0;
  const storage = {getItem:k => data.get(k) || null, setItem:(k,v) => data.set(k,v), removeItem:k=>data.delete(k)};
  const window = {localStorage:storage, location:{origin:"https://example.test"},
    fetch:async (url, options) => {
      if (url === "/api/oauth/session") {
        refreshes++;
        if (mode === "outage") return new Response('{"error":"Unavailable"}', {status:503});
        return new Response(JSON.stringify({access_token:"renewed",refresh_token:"rotated"}));
      }
      const auth = new Headers(options.headers).get("Authorization");
      return new Response("{}", {status:auth === "Bearer renewed" ? 200 : 401});
    }};
  vm.runInNewContext(fs.readFileSync("auth-session.js","utf8"),
    {window, URL, Headers, Response, AbortController, setTimeout, clearTimeout, console});
  window.AlefitSession.save({access_token:"expired",refresh_token:"refresh"});
  return {window,data,refreshes:()=>refreshes};
}
(async function () {
  const b = browser();
  const responses = await Promise.all([1,2,3].map(()=>b.window.fetch("/api/apps/test/auth/me",
    {headers:{Authorization:"Bearer expired"}})));
  assert(responses.every(r=>r.status===200));
  assert.equal(b.refreshes(),1);
  assert.equal(b.data.get("token"),"renewed");
  assert.equal((await b.window.fetch("/api/apps/test/entities/OnboardingPlan",
    {headers:{Authorization:"Bearer expired"}})).status,200);
  const outage = browser("outage");
  assert.equal((await outage.window.fetch("/api/apps/test/auth/me",
    {headers:{Authorization:"Bearer expired"}})).status,503);
  assert.equal(outage.data.get("token"),"expired");
  const switched = browser();
  switched.data.set("token","other-user");
  switched.data.set("base44_access_token","other-user");
  assert.equal((await switched.window.fetch("/api/apps/test/auth/me",
    {headers:{Authorization:"Bearer expired"}})).status,401);
  assert.equal(switched.refreshes(),0);

  const restoredValues = new Map();
  const restoredWindow = {
    localStorage: {
      getItem:key => restoredValues.get(key) || null,
      setItem:(key,value) => restoredValues.set(key,String(value)),
      removeItem:key => restoredValues.delete(key),
    },
    location:{origin:"https://alefit.example"},
    fetch:async (url, options) => {
      if (url === "/api/oauth/session") {
        assert.equal(options.credentials, "same-origin");
        return new Response(JSON.stringify({access_token:"cookie-restored"}));
      }
      if (url.endsWith("/auth/me") &&
          new Headers(options.headers).get("Authorization") === "Bearer cookie-restored") {
        return new Response(JSON.stringify({id:"restored-athlete"}));
      }
      return new Response("{}", {status:401});
    },
  };
  vm.runInNewContext(fs.readFileSync("auth-session.js","utf8"),
    {window:restoredWindow, URL, Headers, Response, AbortController, setTimeout, clearTimeout, console});
  const restored = await restoredWindow.AlefitSession.restore();
  assert.equal(restored.authenticated, true);
  assert.equal(restored.user.id, "restored-athlete");
  assert.equal(restoredValues.get("token"), "cookie-restored");
  assert.equal(restoredValues.has("alefit_refresh_token"), false);

  const concurrentValues = new Map();
  let concurrentRestores = 0;
  const concurrentWindow = {
    localStorage: {
      getItem:key => concurrentValues.get(key) || null,
      setItem:(key,value) => concurrentValues.set(key,String(value)),
      removeItem:key => concurrentValues.delete(key),
    },
    location:{origin:"https://alefit.example"},
    fetch:async (url, options) => {
      if (url === "/api/oauth/session") {
        concurrentRestores++;
        await new Promise(resolve => setTimeout(resolve, 5));
        return new Response(JSON.stringify({access_token:"shared-cookie-access"}));
      }
      if (url.endsWith("/auth/me")) {
        return new Response(JSON.stringify({id:"same-restored-member"}));
      }
      return new Response("{}", {status:401});
    },
  };
  vm.runInNewContext(fs.readFileSync("auth-session.js","utf8"),
    {window:concurrentWindow, URL, Headers, Response, AbortController, setTimeout, clearTimeout, console});
  const concurrent = await Promise.all([
    concurrentWindow.AlefitSession.restore(),
    concurrentWindow.AlefitSession.restore(),
  ]);
  assert.equal(concurrentRestores, 1, "concurrent page restores must share one refresh request");
  assert(concurrent.every(session => session.user.id === "same-restored-member"));

  let crossTabRefreshes = 0;
  let lockTail = Promise.resolve();
  const crossTabLocks = {
    request: async (_name, _options, callback) => {
      const previous = lockTail;
      let release;
      lockTail = new Promise(resolve => { release = resolve; });
      await previous;
      try { return await callback(); }
      finally { release(); }
    },
  };
  const sharedStorage = new Map([["token", "expired-access"]]);
  function crossTabWindow() {
    const storage = {
      getItem:key => sharedStorage.get(key) || null,
      setItem:(key,value) => sharedStorage.set(key,String(value)),
      removeItem:key => sharedStorage.delete(key),
    };
    const window = {
      localStorage:storage,
      navigator:{locks:crossTabLocks},
      location:{origin:"https://alefit.example"},
      fetch:async (url, options) => {
        const auth = new Headers(options.headers).get("Authorization");
        if (url === "/api/oauth/session") {
          crossTabRefreshes++;
          await new Promise(resolve => setTimeout(resolve, 10));
          return new Response(JSON.stringify({access_token:"cross-tab-fresh"}));
        }
        if (url.endsWith("/auth/me") && auth === "Bearer cross-tab-fresh") {
          return new Response(JSON.stringify({id:"same-cross-tab-member"}));
        }
        return new Response("{}", {status:401});
      },
    };
    vm.runInNewContext(fs.readFileSync("auth-session.js","utf8"),
      {window, URL, Headers, Response, AbortController, setTimeout, clearTimeout, console});
    return window;
  }
  const [crossTabA, crossTabB] = await Promise.all([
    crossTabWindow().AlefitSession.restore(),
    crossTabWindow().AlefitSession.restore(),
  ]);
  assert.equal(crossTabRefreshes, 1, "separate tabs must serialize cookie rotation");
  assert.equal(crossTabA.user.id, "same-cross-tab-member");
  assert.equal(crossTabB.user.id, "same-cross-tab-member");

  const blockedWindow = {
    get localStorage() { throw new Error("Safari storage is unavailable"); },
    location:{origin:"https://alefit.org"},
    fetch:async (url, options) => {
      if (url === "/api/oauth/session") {
        assert.equal(options.credentials, "same-origin");
        return new Response(JSON.stringify({access_token:"cookie-only-access"}));
      }
      const auth = new Headers(options.headers).get("Authorization");
      if (url.endsWith("/auth/me") && auth === "Bearer cookie-only-access") {
        return new Response(JSON.stringify({id:"cookie-only-athlete"}));
      }
      return new Response("{}", {status:auth === "Bearer cookie-only-access" ? 200 : 401});
    },
  };
  vm.runInNewContext(fs.readFileSync("auth-session.js","utf8"),
    {window:blockedWindow, URL, Headers, Response, AbortController, setTimeout, clearTimeout, console});
  const blockedRestore = await blockedWindow.AlefitSession.restore();
  assert.equal(blockedRestore.authenticated, true);
  assert.equal(blockedRestore.user.id, "cookie-only-athlete");
  assert.equal(blockedWindow.AlefitSession.accessToken(), "cookie-only-access");
  assert.equal((await blockedWindow.fetch("/api/apps/test/dashboard-data", {
    headers:{Authorization:"Bearer cookie-only-access"},
  })).status, 200);
  console.log("Session refresh: rotation, outages, account isolation, cookie restore, and blocked storage passed.");
})().catch(error=>{console.error(error); process.exitCode=1;});
