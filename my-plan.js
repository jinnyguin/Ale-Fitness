(function () {
  "use strict";

  var APP_ID = "6a1f3d189ebdbe71fa7d256c";
  var root = document.getElementById("plan");
  var token = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
  var record;
  var plan;
  var selectedIndex = 0;
  var adaptedSession = null;
  var pendingPlan = null;
  var loggedFeedbackIds = {};
  var checkinSaved = false;

  function escapeHtml(value) {
    var node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }

  function reauthenticate() {
    try {
      var knownUser = JSON.parse(localStorage.getItem("alefit_user") || "null");
      if (window.AlefitMember) window.AlefitMember.markSignedIn(knownUser);
      else if (knownUser && knownUser.id) localStorage.setItem("alefit_member_account", knownUser.id);
    } catch (error) {
      try { localStorage.setItem("alefit_member_account", "known"); } catch (storageError) {}
    }
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("alefit_user");
    window.location.replace("/Login.html?from_url=%2Fmy-plan.html");
  }

  function currentWeek() {
    var weekNumber = Math.max(1, Math.min(plan.weeks.length, Number(plan.currentWeek) || 1));
    return plan.weeks[weekNumber - 1];
  }

  function currentSessions() {
    return currentWeek().sessions || [];
  }

  function selectedSession() {
    return currentSessions()[selectedIndex] || currentSessions()[0];
  }

  function feedbackIdFor(session) {
    return "workout:" + record.id + ":" + session.id;
  }

  function exerciseMarkup(exercises) {
    if (!exercises.length) return '<p class="review-edit">No training movement is scheduled here.</p>';
    return exercises.map(function (exercise) {
      var startingLoad = exercise.startingLoad ?
        '<small>Starting reference: ' + escapeHtml(exercise.startingLoad) + "</small>" : "";
      return '<div class="exercise"><b>' + escapeHtml(exercise.name) + '</b><small>' +
        escapeHtml(exercise.sets + " × " + exercise.reps + " · rest " +
          exercise.rest + " · " + exercise.effort) + "</small>" + startingLoad + "</div>";
    }).join("");
  }

  function currentWeekMarkup(week) {
    return '<div class="phase-detail"><div class="phase-heading"><div><span class="eyebrow">Week ' +
      escapeHtml(week.week) + '</span><h3>' + escapeHtml(week.phaseLabel || week.label) +
      '</h3></div><span class="phase-tag">' + escapeHtml(week.phase || "adaptive") + '</span></div>' +
      '<p>' + escapeHtml(week.emphasis || week.progression) + '</p>' +
      '<div class="phase-notes"><span><b>Conditioning</b>' + escapeHtml(week.conditioning || "Goal-specific and controlled") +
      '</span><span><b>Recovery</b>' + escapeHtml(week.recovery || "Adjust based on readiness") + '</span></div>' +
      (week.sessions || []).map(function (session) {
        return '<div class="session"><b>' + escapeHtml(session.day) + '</b><span>' +
          escapeHtml(session.name + " · " + session.minutes + " min · " +
            session.exercises.length + " movements") + "</span></div>";
      }).join("") + '<p class="review-edit"><b>Why this week changes:</b> ' +
      escapeHtml(week.progression) + "</p></div>";
  }

  function futurePhaseMarkup() {
    var activeWeekNumber = Number(plan.currentWeek) || 1;
    var future = plan.weeks.filter(function (week) {
      return Number(week.week) > activeWeekNumber;
    });
    if (!future.length) {
      return '<p class="review-edit">Complete this week and your next adaptive block will be created from your workout feedback.</p>';
    }
    return future.map(function (week) {
      return '<div class="future-phase"><div><b>Week ' + escapeHtml(week.week) + " · " +
        escapeHtml(week.phaseLabel || week.label) + '</b><span>' +
        escapeHtml(week.emphasis || week.progression) + '</span></div><small>' +
        escapeHtml(week.recovery || "Recovery adjusts to readiness.") + "</small></div>";
    }).join("");
  }

  function showMessage(message, isError) {
    var output = document.getElementById("feedback-message");
    if (!output) return;
    output.textContent = message;
    output.classList.toggle("error", !!isError);
  }

  function render() {
    var sessions = currentSessions();
    if (!sessions.length) {
      root.innerHTML = '<span class="eyebrow">Recovery block</span><h1>' +
        escapeHtml(plan.name) + '</h1><p class="sub">Your entered sport workload fills this week, so no extra ALEFIT session was added.</p>' +
        '<article class="plan-card"><p>' + escapeHtml(plan.recovery) +
        '</p></article><div class="plan-actions"><a class="button" href="/Register.html">Adjust availability</a></div>';
      return;
    }

    var session = selectedSession();
    var sessionFeedbackId = feedbackIdFor(session);
    var alreadyLogged = !!loggedFeedbackIds[sessionFeedbackId] ||
      (plan.appliedFeedbackIds || []).indexOf(sessionFeedbackId) !== -1;
    root.innerHTML =
      '<span class="eyebrow">Current week · ' + escapeHtml(currentWeek().week) + '</span>' +
      '<h1>' + escapeHtml(plan.name) + '</h1><p class="sub">' + escapeHtml(plan.summary) + '</p>' +
      '<article class="plan-card"><span class="eyebrow">Choose a scheduled session</span>' +
      '<div class="field"><label for="session-choice">This week’s ALEFIT sessions</label><select id="session-choice">' +
      sessions.map(function (item, index) {
        return '<option value="' + index + '"' + (index === selectedIndex ? " selected" : "") + ">" +
          escapeHtml(item.day + " — " + item.name) + "</option>";
      }).join("") + "</select></div></article>" +
      '<div class="plan-grid"><article class="plan-card"><span class="eyebrow">Selected session</span><h3>' +
      escapeHtml(session.name) + " · " + escapeHtml(session.day) + '</h3><div id="today-exercises">' +
      exerciseMarkup(adaptedSession ? adaptedSession.exercises : session.exercises) +
      '</div><p id="adapt-note" class="review-edit">' +
      escapeHtml(adaptedSession ? adaptedSession.adaptation : "") + "</p></article>" +
      '<article class="plan-card"><span class="eyebrow">Today check-in</span>' +
      '<div class="field"><label for="energy">Energy</label><select id="energy"><option value="okay">Okay</option><option value="low">Low</option><option value="high">High</option></select></div>' +
      '<div class="field"><label for="soreness">Soreness</label><select id="soreness"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></div>' +
      '<div class="field"><label for="minutes">Minutes available</label><input id="minutes" type="number" min="10" max="120" value="' +
      escapeHtml(session.minutes) + '"></div>' +
      '<div class="field"><label for="sport-extra">Extra sport activity</label><input id="sport-extra" maxlength="120" placeholder="Practice, game, or another hard activity"></div>' +
      '<label class="exercise-check"><input id="pain" type="checkbox"> Pain or discomfort today</label>' +
      '<button class="button" id="adapt" type="button">Adapt today</button></article></div>' +
      '<article class="plan-card"><span class="eyebrow">Current phase</span>' +
      currentWeekMarkup(currentWeek()) +
      '<div class="future-preview"><span class="eyebrow">What changes next</span>' +
      '<p class="review-edit">The primary movement stays recognizable for measurable progress. Support exercises, volume, intensity, conditioning, and recovery change with your goal, readiness, completed work, and feedback.</p>' +
      futurePhaseMarkup() + "</div>" +
      '<p class="review-edit"><b>Current progression:</b> ' + escapeHtml(plan.progression) +
      '</p><p class="review-edit"><b>Recovery:</b> ' + escapeHtml(plan.recovery) + "</p></article>" +
      '<article class="plan-card"><span class="eyebrow">Finish selected session</span>' +
      (alreadyLogged ?
        '<p class="notice">This scheduled session already has a saved workout log. Its original snapshot is preserved.</p>' :
        '<div class="field"><label for="status">Outcome</label><select id="status"><option value="completed">Completed</option><option value="partial">Partially completed</option><option value="skipped">Skipped</option></select></div>' +
        '<div class="field"><label for="difficulty">Difficulty</label><select id="difficulty"><option value="appropriate">Appropriate</option><option value="too-easy">Too easy</option><option value="too-hard">Too hard</option></select></div>' +
        '<div class="field"><label for="notes">Weights, reps, time, or distance notes <span>(optional)</span></label><textarea id="notes" maxlength="500"></textarea></div>' +
        '<label class="exercise-check"><input id="feedback-pain" type="checkbox"> Pain or discomfort during this session</label>' +
        '<button class="button" id="save-feedback" type="button">Save workout feedback</button>') +
      '<p class="review-edit" id="feedback-message"></p></article>' +
      '<div class="plan-actions"><a class="sign-in" href="/Register.html">Build a replacement plan</a></div>';

    document.getElementById("session-choice").onchange = function () {
      selectedIndex = Number(this.value);
      adaptedSession = null;
      checkinSaved = false;
      render();
    };
    document.getElementById("adapt").onclick = adaptToday;
    var feedbackButton = document.getElementById("save-feedback");
    if (feedbackButton) feedbackButton.onclick = saveFeedback;
  }

  async function adaptToday() {
    var session = selectedSession();
    var checkin = {
      checkin_id:"readiness:" + record.id + ":" + session.id,
      session_id:session.id,
      energy:document.getElementById("energy").value,
      soreness:document.getElementById("soreness").value,
      minutesAvailable:Number(document.getElementById("minutes").value),
      extraSportActivity:document.getElementById("sport-extra").value.trim(),
      pain:document.getElementById("pain").checked,
      recorded_at:new Date().toISOString()
    };
    adaptedSession = window.ALEFITTrainingEngine.adaptSession(session, checkin);
    document.getElementById("today-exercises").innerHTML = exerciseMarkup(adaptedSession.exercises);
    document.getElementById("adapt-note").textContent = adaptedSession.adaptation;

    if (!checkinSaved) {
      checkinSaved = true;
      try {
        var response = await fetch("/api/apps/" + APP_ID + "/entities/ReadinessCheck", {
          method:"POST",
          headers:{"Content-Type":"application/json", Authorization:"Bearer " + token},
          body:JSON.stringify(checkin)
        });
        if (response.status === 401) reauthenticate();
        if (!response.ok) checkinSaved = false;
      } catch (error) {
        checkinSaved = false;
      }
    }
  }

  async function updateFuturePlan() {
    var update = await fetch("/api/apps/" + APP_ID + "/onboarding-plan", {
      method:"POST",
      headers:{"Content-Type":"application/json", Authorization:"Bearer " + token},
      body:JSON.stringify({
        onboarding_id:record.onboarding_id || record.id,
        replace_id:record.id,
        preferences:record.preferences || plan.profile,
        generated_plan:pendingPlan
      })
    });
    if (update.status === 401) return reauthenticate();
    if (!update.ok) throw new Error("Plan update failed");
    plan = pendingPlan;
    record.generated_plan = plan;
    pendingPlan = null;
  }

  async function retryPlanUpdate() {
    var button = document.getElementById("retry-plan-update");
    if (button) button.disabled = true;
    try {
      await updateFuturePlan();
      render();
      showMessage("Plan update completed. The existing workout log was not duplicated.", false);
    } catch (error) {
      if (button) button.disabled = false;
      showMessage("The workout is safe, but the plan update still needs a retry.", true);
    }
  }

  async function saveFeedback() {
    var button = document.getElementById("save-feedback");
    if (!button || button.disabled) return;
    button.disabled = true;
    button.textContent = "Saving workout…";
    var session = selectedSession();
    var feedbackId = feedbackIdFor(session);
    var feedback = {
      feedback_id:feedbackId,
      session_id:session.id,
      status:document.getElementById("status").value,
      difficulty:document.getElementById("difficulty").value,
      notes:document.getElementById("notes").value.trim(),
      pain:document.getElementById("feedback-pain").checked,
      recorded_at:new Date().toISOString()
    };
    var snapshot = JSON.parse(JSON.stringify(adaptedSession || session));

    try {
      var response = await fetch("/api/apps/" + APP_ID + "/workout-log", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:"Bearer " + token},
        body:JSON.stringify({
          feedback_id:feedbackId,
          session_snapshot:snapshot,
          feedback:feedback
        })
      });
      if (response.status === 401) return reauthenticate();
      if (!response.ok) throw new Error("Workout log failed");
      loggedFeedbackIds[feedbackId] = true;
      pendingPlan = window.ALEFITTrainingEngine.applyFeedback(plan, feedback);

      try {
        await updateFuturePlan();
        render();
        showMessage("Workout saved. Only future progression was updated; this session’s snapshot remains unchanged.", false);
      } catch (updateError) {
        button.textContent = "Workout saved";
        var message = document.getElementById("feedback-message");
        message.innerHTML = 'Your workout is saved. The plan update did not finish. ' +
          '<button class="text-btn" id="retry-plan-update" type="button">Retry plan update</button>';
        document.getElementById("retry-plan-update").onclick = retryPlanUpdate;
      }
    } catch (error) {
      button.disabled = false;
      button.textContent = "Retry workout save";
      showMessage("The workout was not saved. Retry when your connection is stable.", true);
    }
  }

  async function load() {
    if (!token) return reauthenticate();
    try {
      var headers = {Authorization:"Bearer " + token};
      var responses = await Promise.all([
        fetch("/api/apps/" + APP_ID + "/entities/OnboardingPlan?limit=1", {headers:headers}),
        fetch("/api/apps/" + APP_ID + "/entities/WorkoutLog?limit=100", {headers:headers})
      ]);
      if (responses.some(function (response) { return response.status === 401; })) {
        return reauthenticate();
      }
      if (!responses[0].ok) throw new Error("Plan request failed");
      var planData = await responses[0].json();
      var logData = responses[1].ok ? await responses[1].json() : [];
      var plans = Array.isArray(planData) ? planData : (planData.data || planData.items || []);
      var logs = Array.isArray(logData) ? logData : (logData.data || logData.items || []);
      logs.forEach(function (log) {
        if (log.feedback_id) loggedFeedbackIds[log.feedback_id] = true;
      });
      if (!plans.length) {
        root.innerHTML = '<h1>Build your plan.</h1><p class="sub">Complete onboarding to create your adaptive training block.</p><a class="button" href="/Register.html">Start onboarding</a>';
        return;
      }
      record = plans[0];
      plan = record.generated_plan || record.generatedPlan;
      if (!plan || !Array.isArray(plan.weeks) || !plan.weeks.length) {
        root.innerHTML = '<h1>Your earlier plan is still safe.</h1><p class="sub">Build a new adaptive plan when you are ready. Your account and history will remain unchanged.</p><a class="button" href="/Register.html">Build adaptive plan</a>';
        return;
      }
      var recoveredPlan = plan;
      var recovered = false;
      var feedbackPrefix = "workout:" + record.id + ":";
      logs.slice().reverse().forEach(function (log) {
        if (!log.feedback || !log.feedback_id) return;
        if (log.feedback_id.indexOf(feedbackPrefix) !== 0) return;
        if ((recoveredPlan.appliedFeedbackIds || []).indexOf(log.feedback_id) !== -1) return;
        recoveredPlan = window.ALEFITTrainingEngine.applyFeedback(recoveredPlan, log.feedback);
        recovered = true;
      });
      if (recovered) {
        pendingPlan = recoveredPlan;
        try {
          await updateFuturePlan();
          selectedIndex = 0;
        } catch (recoveryError) {
          render();
          var recoveryMessage = document.getElementById("feedback-message");
          if (recoveryMessage) {
            recoveryMessage.innerHTML = 'Your workout log is safe, but its plan update still needs a retry. ' +
              '<button class="text-btn" id="retry-plan-update" type="button">Retry plan update</button>';
            document.getElementById("retry-plan-update").onclick = retryPlanUpdate;
          }
          return;
        }
      }
      render();
    } catch (error) {
      root.innerHTML = '<h1>We could not load your plan.</h1><p class="sub">Nothing was changed.</p><button class="button" id="retry-plan">Retry</button>';
      document.getElementById("retry-plan").onclick = load;
    }
  }

  load();
}());