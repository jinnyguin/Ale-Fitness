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
  console.log("Session refresh: rotation, concurrent requests, outage and account isolation passed.");
})().catch(error=>{console.error(error); process.exitCode=1;});
