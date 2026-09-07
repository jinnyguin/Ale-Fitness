(function () {
  "use strict";

  var APP = "6a1f3d189ebdbe71fa7d256c";
  var root = document.getElementById("plan");
  var authToken = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
  var validProgramPaths = [
    "/programs/baseball.html", "/programs/basketball.html",
    "/programs/crosscountry.html", "/programs/football.html",
    "/programs/hiit.html", "/programs/mobility.html",
    "/programs/soccer.html", "/programs/strength.html",
    "/programs/swimming.html", "/programs/track.html"
  ];

  function escapeHtml(value) {
    var node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }

  function signInAgain() {
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("alefit_user");
    window.location.replace("/Login.html?from_url=%2Fmy-plan.html");
  }

  function showFailure() {
    root.innerHTML = '<span class="eyebrow">Plan unavailable</span>' +
      '<h1>We could not load your plan.</h1>' +
      '<p class="sub">Your saved plan was not changed. Check your connection and retry.</p>' +
      '<button class="button" id="retry-plan" type="button">Retry</button> ' +
      '<a class="sign-in" href="/Register.html">Review onboarding</a>';
    document.getElementById("retry-plan").onclick = loadPlan;
  }

  function renderPlan(record) {
    var plan = record.generated_plan || record.generatedPlan;
    var preferences = record.preferences || {};
    if (!plan || !Array.isArray(plan.first) || !Array.isArray(plan.schedule)) {
      throw new Error("Saved plan is incomplete.");
    }
    var programPath = validProgramPaths.indexOf(plan.path) > -1 ?
      plan.path : "/programs/strength.html";
    var preferenceSummary = [
      preferences.sport,
      (preferences.goals || []).join(", "),
      preferences.days ? preferences.days + " days / week" : "",
      preferences.duration ? preferences.duration + " minutes" : ""
    ].filter(Boolean).join(" · ");

    root.innerHTML = '<span class="eyebrow">Your personalized opening block</span>' +
      '<h1>' + escapeHtml(plan.name) + '</h1>' +
      '<p class="sub">' + escapeHtml(plan.summary) + '</p>' +
      '<p class="review-edit">' + escapeHtml(preferenceSummary) + '</p>' +
      '<a class="button start-plan" href="#session-one">Start session one</a>' +
      '<div class="plan-grid saved-plan-grid">' +
        '<article class="plan-card" id="session-one">' +
          '<span class="eyebrow">Session one</span>' +
          '<h3>Your exact workout</h3>' +
          plan.first.map(function (exercise, index) {
            return '<label class="exercise exercise-check" for="exercise-' + index + '">' +
              '<input id="exercise-' + index + '" type="checkbox">' +
              '<span><b>' + escapeHtml(exercise[0]) + '</b>' +
              '<small>' + escapeHtml(exercise[1]) + '</small></span></label>';
          }).join("") +
        '</article>' +
        '<article class="plan-card">' +
          '<span class="eyebrow">Seven-day rhythm</span>' +
          '<div class="schedule">' +
            plan.schedule.map(function (entry) {
              return '<div class="session"><b>' + escapeHtml(entry.day) + '</b>' +
                '<span>' + escapeHtml(entry.workout) + '</span></div>';
            }).join("") +
          '</div>' +
          '<p class="review-edit">' + escapeHtml(plan.rationale) + '</p>' +
        '</article>' +
      '</div>' +
      '<div class="plan-actions">' +
        '<a class="sign-in" href="/Register.html">Adjust my plan</a>' +
        '<a class="sign-in" href="' + programPath + '">Explore the training library</a>' +
      '</div>';
  }

  async function loadPlan() {
    if (!authToken) {
      signInAgain();
      return;
    }
    try {
      var response = await fetch(
        "/api/apps/" + APP + "/entities/OnboardingPlan?limit=1",
        { headers: { Authorization: "Bearer " + authToken } }
      );
      if (response.status === 401) {
        signInAgain();
        return;
      }
      if (!response.ok) throw new Error("Plan request failed.");
      var data = await response.json();
      var records = Array.isArray(data) ? data : (data.data || data.items || []);
      if (!records.length) {
        root.innerHTML = '<span class="eyebrow">Build your plan</span>' +
          '<h1>Your personalized plan starts here.</h1>' +
          '<p class="sub">Answer six short questions to create your opening block.</p>' +
          '<a class="button start-plan" href="/Register.html">Build my plan</a>';
        return;
      }
      renderPlan(records[0]);
    } catch (error) {
      showFailure();
    }
  }

  loadPlan();
}());