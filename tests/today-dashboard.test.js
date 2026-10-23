"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// Exercise the real rendering functions without changing auth or exposing a
// production-only test route. Fixtures are confined to this test.
const source = fs.readFileSync("today.js", "utf8").replace(
  "  load();\n}());",
  `  window.dashboardTest = {
    set: function (data) {
      user = data.user; record = data.record; plan = data.plan;
      logs = data.logs || []; currentSession = data.session || null;
      readiness = data.readiness || [];
      activeWorkout = !!data.active;
    },
    header: dashboardHeader, week: dashboardWeek, today: todayView, coach: coachView,
    openPuterConsent: openPuterConsent,
     cancelPuterConsent: cancelPuterConsent,
    activatePuterCoach: activatePuterCoach,
    askCoach: askCoach,
    buildPuterCoachMessages: buildPuterCoachMessages
  };
}());`
);
const elements = new Map();
function element() {
  return {
    innerHTML: "",
    set textContent(value) {
      this.innerHTML = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
  };
}
const document = {
  addEventListener() {},
  createElement: element,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  },
  querySelectorAll() { return []; }
};
const window = {
  location: { search: "", href: "https://alefit.example/today.html?view=today" },
  history: { state: null, replaceState() {}, pushState() {}, go() {} },
  addEventListener() {},
  scrollTo() {},
  ALEFITTrainingEngine: { sessionForDate() { return null; } }
};
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [2026, 5, 10, 19, 30])); }
}
vm.runInNewContext(source, {
  window, document, Date: FixedDate, URLSearchParams,
  localStorage: { getItem() { return null; } }
});
const ui = window.dashboardTest;
assert(ui, "test must attach to real dashboard source");
const session = {
  id: "week-1-strength", day: "Wednesday", name: "Strength & control",
  minutes: 38, exercises: [{ id: "squat", name: "Squat", sets: 3, reps: 8, rest: "60 s", effort: "Controlled" }]
};
const fixture = {
  user: { full_name: "Maya <Tester>" },
  record: { id: "athlete-plan" },
  plan: {
    currentWeek: 1, weeks: [{ week: 1, phaseLabel: "Build", sessions: [session] }],
    schedule: [{ day: "Friday", type: "sport", title: "Club practice" }],
    profile: { sport: "strength", goals: ["build strength"], equipment: ["dumbbells"], age: "adult" },
    recovery: "Keep the easy days easy.", focus: "Strength", summary: "Train around practice."
  },
  record: { id: "athlete-plan", preferences: { daysPerWeek: 3 } }
};
ui.set(fixture);
assert.match(ui.header(), /Good evening, Maya/);
ui.set({ ...fixture, user: { full_name: "<Maya>" } });
assert.match(ui.header(), /&lt;Maya&gt;/, "greeting must escape athlete names");
ui.set(fixture);
let week = ui.week();
assert.equal((week.match(/class="af-week-day /g) || []).length + (week.match(/class="af-week-day"/g) || []).length, 7);
assert.match(week, /view=workout&amp;session=week-1-strength/);
assert.match(week, /Club practice/);
assert.match(week, /Wednesday, today/);
assert.doesNotMatch(week, /is-logged/);
assert.match(week, /No session scheduled/);
ui.set({ ...fixture, logs: [{
  feedback_id: "workout:athlete-plan:week-1-strength",
  feedback: { status: "partial" }
}] });
week = ui.week();
assert.match(week, /is-logged/);
assert.match(week, /Strength &amp; control · partial/);
assert.doesNotMatch(week, />Complete</, "a partial log must not be labelled complete");
ui.set({ ...fixture, session });
ui.today();
let markup = document.getElementById("app").innerHTML;
for (const id of ["start-workout", "readiness-panel", "energy", "soreness", "minutes", "extra", "pain", "adapt", "page-message"]) {
  assert(markup.includes('id="' + id + '"'), id + " must remain available");
}
assert.match(markup, /38 min/);
ui.set({ ...fixture, session, active: true });
ui.today();
markup = document.getElementById("app").innerHTML;
for (const id of ["finish-workout", "pause-workout", "workout-difficulty", "workout-pain"]) {
  assert(markup.includes('id="' + id + '"'), id + " must remain available");
}
assert.match(markup, /data-movement="squat:0"/);
ui.set(fixture);
ui.today();
markup = document.getElementById("app").innerHTML;
assert.match(markup, /Recovery day/);
assert.match(markup, /af-week-days/);
assert.match(markup, /id="page-message"/);
assert.doesNotMatch(markup, /id="start-workout"/, "rest days must not offer a fabricated workout");
const html = fs.readFileSync("today.html", "utf8");
assert(html.indexOf("/today-dashboard.css") > html.indexOf("/app-shell.css"));
ui.set({ ...fixture, logs: [{
  created_date: "2026-06-10",
  feedback: { status: "completed", difficulty: "appropriate", completed_movements: 2, notes: "Felt steady" },
  session_snapshot: { name: "Previous strength session" }
}], readiness: [{ energy: "high", soreness: "low", pain: false }] });
ui.coach();
markup = document.getElementById("app").innerHTML;
assert.match(markup, /Coaching from your plan/);
assert.match(markup, /Puter is required for ALEFIT Coach/);
assert.match(markup, /To avoid using ALEFIT’s server-based AI/);
assert.match(markup, /Before enabling Puter/);
assert.doesNotMatch(markup, /id="coach-form"/, "do not allow questions before Puter consent");
assert.doesNotMatch(markup, /Switch to ALEFIT Coach/);
ui.cancelPuterConsent();
markup = document.getElementById("app").innerHTML;
assert.match(markup, /Review sharing notice/);
assert.doesNotMatch(markup, /id="coach-form"/, "declining Puter consent must not enable server AI");
ui.openPuterConsent();
markup = document.getElementById("app").innerHTML;
assert.match(markup, /recent workout\/readiness details/);
assert.match(markup, /ALEFIT does not attach your account name or email/);
assert.match(markup, /personal details you type into a question/);
assert.match(markup, /temporary Puter identity/);
assert.match(markup, /usage limits/);
assert.match(markup, /I agree to share those training details/);
const consent = document.getElementById("puter-consent");
consent.checked = true;
consent.onchange();

async function verifyPuterCoach() {
  const htmlNow = fs.readFileSync("today.html", "utf8");
  const scriptNow = fs.readFileSync("today.js", "utf8");
  assert.doesNotMatch(htmlNow, /js\.puter\.com/, "Puter must load only after consent");
  assert.doesNotMatch(scriptNow, /\/api\/apps\/.+\/coach/, "Coach must never call a server-side provider");
  for (const view of ["plan", "progress", "coach", "profile"]) {
    assert(htmlNow.includes('href="/today.html?view=' + view + '"'));
  }
  let puterCall = null;
  let puterAuthOptions = null;
  window.puter = {
    auth: {
      isSignedIn() { return false; },
      signIn(options) {
        puterAuthOptions = options;
        return Promise.resolve({ temporary: true });
      }
    },
    ai: { chat(prompt, testMode, options) {
      puterCall = { prompt, testMode, options };
      return Promise.resolve({ message: { content: "Keep the prescribed load today." } });
    } }
  };
  await ui.activatePuterCoach();
  markup = document.getElementById("app").innerHTML;
  assert.deepEqual(JSON.parse(JSON.stringify(puterAuthOptions)), { attempt_temp_user_creation: true });
  assert.match(markup, /Puter-only coaching/);
  assert.match(markup, /Next session/);
  assert.match(markup, /Adjust for recovery/);
  assert.match(markup, /Ask coach/);
  assert.doesNotMatch(markup, /Switch to ALEFIT Coach/);
  const messages = ui.buildPuterCoachMessages("Should I add weight today?", [
    { role: "user", content: "I felt steady last time." }
  ], session);
  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /Do not diagnose injuries/);
  assert.match(messages[1].content, /"sport":"strength"/);
  assert.match(messages[1].content, /"soreness":"low"/);
  assert.match(messages[1].content, /"name":"Strength & control"/);
  assert.doesNotMatch(JSON.stringify(messages), /Maya <Tester>|secret@example/);

  window.location.search = "?view=coach";
  document.getElementById("coach-input").value = "Should I add weight today?";
  let prevented = false;
  await ui.askCoach({ preventDefault() { prevented = true; } });
  assert(prevented);
  assert(puterCall);
  assert.equal(puterCall.testMode, false);
  assert.equal(puterCall.options.normalize, true);
  assert.match(puterCall.prompt[puterCall.prompt.length - 1].content, /Should I add weight today/);
  markup = document.getElementById("app").innerHTML;
  assert.match(markup, /Keep the prescribed load today/);
  console.log("Today dashboard checks passed: schedule, navigation, required Puter consent, data minimization, and Puter-only chat.");
}
verifyPuterCoach().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
