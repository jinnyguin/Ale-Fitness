const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");
const {TextEncoder} = require("node:util");

const source = fs.readFileSync("auth-oauth.js", "utf8");

function makeOAuthBrowser({providers = ["email"], authorizeResponse} = {}) {
  const requests = [];
  const stored = new Map();
  const location = {
    origin: "https://www.alefit.org",
    assigned: null,
    assign(url) { this.assigned = String(url); },
  };
  const window = {
    location,
    crypto: webcrypto,
    btoa(value) { return Buffer.from(value, "binary").toString("base64"); },
    sessionStorage: {
      setItem(key, value) { stored.set(key, String(value)); },
      getItem(key) { return stored.get(key) || null; },
    },
    AlefitSession: {
      async timedFetch(url, options) {
        requests.push({url, options});
        if (url.startsWith("/api/oauth/authorize?")) {
          return {
            ok: true,
            async json() { return authorizeResponse || {url:"https://auth.example.test/auth/v1/authorize?provider=apple"}; },
          };
        }
        return {
          ok: true,
          async json() { return {auth:{providers}}; },
        };
      },
    },
  };
  vm.runInNewContext(source, {
    window,
    URL,
    URLSearchParams,
    Uint8Array,
    TextEncoder,
    btoa: window.btoa,
    Date,
    Math,
    JSON,
    Promise,
  });
  return {window, location, requests, stored};
}

async function testAppleProviderIsStartedThroughSameSitePkce() {
  const browser = makeOAuthBrowser();
  await browser.window.AlefitOAuth.startApple("/Register.html?apple_signup=1");
  assert.match(browser.location.assigned, /^https:\/\/auth\.example\.test\//);
  const authorizeRequest = browser.requests.find((request) => request.url.startsWith("/api/oauth/authorize?"));
  const query = new URLSearchParams(authorizeRequest.url.split("?")[1]);
  assert.equal(query.get("provider"), "apple");
  assert.equal(query.get("redirect_to"), "https://www.alefit.org/auth/callback?from_url=%2FRegister.html%3Fapple_signup%3D1");
  assert.ok(query.get("code_challenge"));
  const pending = JSON.parse(browser.stored.get("alefit_oauth_pending"));
  assert.equal(pending.provider, "apple");
  assert.equal(pending.returnTo, "/Register.html?apple_signup=1");
}

async function testProviderDiscoveryOnlyReturnsKnownProvidersAndFailsClosed() {
  const browser = makeOAuthBrowser({providers:["email", "apple", "google", "unknown"]});
  assert.deepEqual(
    Array.from(await browser.window.AlefitOAuth.availableProviders()),
    ["email", "apple", "google"],
  );

  const unavailable = makeOAuthBrowser();
  unavailable.window.AlefitSession.timedFetch = async () => { throw new Error("offline"); };
  assert.deepEqual(Array.from(await unavailable.window.AlefitOAuth.availableProviders()), ["email"]);
}

async function testUnknownProviderIsRejected() {
  const browser = makeOAuthBrowser();
  await assert.rejects(browser.window.AlefitOAuth.start("mystery"), /not supported/i);
}

async function run() {
  const tests = [
    testAppleProviderIsStartedThroughSameSitePkce,
    testProviderDiscoveryOnlyReturnsKnownProvidersAndFailsClosed,
    testUnknownProviderIsRejected,
  ];
  for (const test of tests) {
    await test();
    console.log(`ok - ${test.name}`);
  }
  console.log(`${tests.length} OAuth client checks passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
