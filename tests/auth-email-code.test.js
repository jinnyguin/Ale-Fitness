const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("auth-email-code.js", "utf8");

function createClient(responses) {
  const calls = [];
  const window = {
    AlefitSession: {
      async timedFetch(path, options) {
        calls.push({path, options});
        const next = responses.shift();
        if (typeof next === "function") return next(path, options);
        return next;
      },
    },
  };
  vm.runInNewContext(source, {window});
  return {api:window.AlefitEmailCode, calls};
}

async function testRequestUsesSupabaseEmailCodeEndpoint() {
  const client = createClient([{
    ok:true,
    json:async()=>({sent:true,retry_after_seconds:60}),
  }]);
  const response = await client.api.send("athlete@example.test", {
    createUser:true,
    fullName:"Test Athlete",
  });
  assert.equal(response.sent, true);
  assert.equal(client.calls[0].path, "/api/apps/6a1f3d189ebdbe71fa7d256c/auth/email-code");
  assert.deepEqual(JSON.parse(client.calls[0].options.body), {
    email:"athlete@example.test",
    create_user:true,
    full_name:"Test Athlete",
  });
}

async function testVerifySendsSixDigitCodeAndReturnsSession() {
  const client = createClient([{
    ok:true,
    json:async()=>({access_token:"session-token",user:{id:"member-1"}}),
  }]);
  const result = await client.api.verify("athlete@example.test", "004271");
  assert.equal(result.user.id, "member-1");
  assert.equal(client.calls[0].path, "/api/apps/6a1f3d189ebdbe71fa7d256c/auth/email-code/verify");
  assert.deepEqual(JSON.parse(client.calls[0].options.body), {
    email:"athlete@example.test",
    token:"004271",
  });
}

async function testRateLimitPreservesRetryCooldown() {
  const client = createClient([{
    ok:false,
    status:429,
    json:async()=>({error:"Too many requests.",retry_after_seconds:23}),
  }]);
  await assert.rejects(client.api.send("athlete@example.test"), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterSeconds, 23);
    assert.match(error.message, /Too many requests/);
    return true;
  });
}

async function testEmailCodeAvailabilityUsesServerVerificationGate() {
  const enabled = createClient([{
    ok:true,
    json:async()=>({auth:{email_code_enabled:true}}),
  }]);
  assert.equal(await enabled.api.isEnabled(), true);
  assert.match(enabled.calls[0].path, /public-settings/);

  const disabled = createClient([{
    ok:true,
    json:async()=>({auth:{email_code_enabled:false}}),
  }]);
  assert.equal(await disabled.api.isEnabled(), false);
}

async function run() {
  const tests = [
    testRequestUsesSupabaseEmailCodeEndpoint,
    testVerifySendsSixDigitCodeAndReturnsSession,
    testRateLimitPreservesRetryCooldown,
    testEmailCodeAvailabilityUsesServerVerificationGate,
  ];
  for (const test of tests) {
    await test();
    console.log(`ok - ${test.name}`);
  }
  console.log(`${tests.length} email-code client checks passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
