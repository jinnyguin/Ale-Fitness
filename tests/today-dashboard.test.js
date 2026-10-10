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
      activeWorkout = !!data.active;
    },
    header: dashboardHeader, week: dashboardWeek, today: todayView
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
  createElement: element,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  },
  querySelectorAll() { return []; }
};
const window = {
  location: { search: "" },
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
    recovery: "Keep the easy days easy.", focus: "Strength", summary: "Train around practice."
  }
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
for (const view of ["plan", "progress", "coach", "profile"]) {
  assert(html.includes('href="/today.html?view=' + view + '"'));
}
console.log("Today dashboard checks passed: real schedule/logs, escaped greeting, rest state, controls, navigation.");
