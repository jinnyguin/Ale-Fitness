(function () {
  "use strict";

  var APP = "6a1f3d189ebdbe71fa7d256c";
  var token = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
  var root = document.getElementById("workout-app");
  var sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
  var state = { record: null, plan: null, session: null, logs: [], sets: {}, skipped: {}, startedAt: Date.now() };

  function esc(value) {
    var node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }
  function records(value) { return Array.isArray(value) ? value : (value.data || value.items || []); }
  function login() {
    window.location.replace("/Login.html?from_url=" + encodeURIComponent(window.location.href));
  }
  async function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ Authorization: "Bearer " + token }, options.headers || {});
    var response = await fetch("/api/apps/" + APP + path, options);
    if (response.status === 401) { login(); throw new Error("Session expired."); }
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  function nav() {
    return '<nav class="bottom-nav" aria-label="Main navigation"><a href="/today.html"><span>Today</span></a><a class="active" href="/my-plan.html"><span>My Plan</span></a><a href="/progress.html"><span>Progress</span></a><a href="/coach.html"><span>Coach</span></a><a href="/profile.html"><span>Profile</span></a></nav>';
  }
  function topbar() {
    return '<header class="app-topbar"><a class="app-logo" href="/today.html"><img src="/images/alefit-logo.png" alt="ALEFIT"></a><a class="top-link" href="/my-plan.html">Exit workout</a></header>';
  }
  function shell(content) { return topbar() + '<main class="app-main">' + content + "</main>" + nav(); }
  function feedbackId() { return "workout:" + state.record.id + ":" + state.session.id; }
  function existingLog() { return state.logs.filter(function (item) { return item.feedback_id === feedbackId(); })[0] || null; }
  function parseRepNumber(reps) {
    var match = String(reps || "").match(/\d+/);
    return match ? match[0] : "";
  }
  function exerciseMarkup(exercise, index) {
    var sets = Number(exercise.sets) || 1;
    var rows = "";
    for (var set = 0; set < sets; set += 1) {
      var key = index + ":" + set;
      var saved = state.sets[key] || {};
      rows += '<div class="set-row"><small>' + (set + 1) + '</small><span>Set ' + (set + 1) + '</span>' +
        '<input aria-label="' + esc(exercise.name) + ' weight set ' + (set + 1) + '" data-set-weight="' + key + '" placeholder="Load" value="' + esc(saved.weight || "") + '">' +
        '<input aria-label="' + esc(exercise.name) + ' reps set ' + (set + 1) + '" data-set-reps="' + key + '" placeholder="' + esc(parseRepNumber(exercise.reps)) + '" value="' + esc(saved.reps || "") + '">' +
        '<input type="checkbox" aria-label="Complete ' + esc(exercise.name) + ' set ' + (set + 1) + '" data-set-done="' + key + '"' + (saved.done ? " checked" : "") + '></div>';
    }
    return '<article class="workout-exercise"><div class="workout-header"><div><span class="eyebrow">Exercise ' + (index + 1) + '</span><h3>' + esc(exercise.name) + '</h3><p class="instruction">' + esc(exercise.effort || "Move with control.") + " · rest " + esc(exercise.rest || "as needed") + '</p></div><span class="exercise-tag">' + esc(exercise.sets + " × " + exercise.reps) + '</span></div><div class="set-row"><small></small><small>Set</small><small>Weight</small><small>Reps</small><small>Done</small></div>' + rows + '<button class="button-secondary skip-exercise" type="button" data-skip="' + index + '">' + (state.skipped[index] ? "Exercise skipped" : "Skip exercise") + "</button></article>";
  }
  function render() {
    var logged = existingLog();
    if (logged) {
      var feedback = logged.feedback || {};
      root.innerHTML = shell('<div class="page-heading"><span class="eyebrow">Workout complete</span><h1>Work logged.</h1><p class="lede">This workout snapshot is preserved. Future training uses your feedback, but this record will not be rewritten.</p></div><section class="hero-card"><span class="eyebrow">' + esc(state.session.name) + '</span><h2>Nice work.</h2><div class="hero-meta"><span class="pill accent">' + esc(feedback.status || "completed") + '</span><span class="pill">' + esc(feedback.difficulty || "feedback saved") + '</span></div><a class="button" href="/today.html">Back to Today</a></section>');
      return;
    }
    root.innerHTML = shell('<div class="page-heading"><span class="eyebrow">' + esc(state.session.day) + " · " + esc(state.plan.focus) + '</span><h1>' + esc(state.session.name) + '</h1><p class="lede">Move with control. Log the work you actually completed.</p></div><section class="workout-summary"><div><strong>' + esc(state.session.estimatedMinutes || state.session.minutes) + '</strong><span>Minutes</span></div><div><strong>' + state.session.exercises.length + '</strong><span>Exercises</span></div><div><strong>' + esc(state.plan.profile.sport || "Fitness") + '</strong><span>Focus</span></div></section><section class="card section"><div class="card-label">Session</div><div id="exercise-list">' + state.session.exercises.map(exerciseMarkup).join("") + '</div></section><section class="card"><div class="card-label">Finish workout</div><div class="form-grid"><div class="field"><label for="status">Outcome</label><select id="status"><option value="completed">Completed</option><option value="partial">Partially completed</option><option value="skipped">Skipped</option></select></div><div class="field"><label for="difficulty">Difficulty</label><select id="difficulty"><option value="appropriate">Appropriate</option><option value="too-easy">Too easy</option><option value="too-hard">Too hard</option></select></div></div><div class="field"><label for="notes">Notes</label><textarea id="notes" maxlength="500" placeholder="Weights, reps, distance, or how this felt"></textarea></div><label class="check"><input id="pain" type="checkbox"> Pain or discomfort during this session</label><div class="button-row" style="margin-top:18px"><button class="button" id="finish" type="button">Finish workout</button><span id="finish-message" class="form-message"></span></div></section>');
    root.querySelectorAll("[data-set-weight], [data-set-reps], [data-set-done]").forEach(function (input) {
      input.onchange = function () {
        var key = input.dataset.setWeight || input.dataset.setReps || input.dataset.setDone;
        state.sets[key] = state.sets[key] || {};
        if (input.dataset.setWeight) state.sets[key].weight = input.value.trim();
        if (input.dataset.setReps) state.sets[key].reps = input.value.trim();
        if (input.dataset.setDone) state.sets[key].done = input.checked;
      };
    });
    root.querySelectorAll("[data-skip]").forEach(function (button) {
      button.onclick = function () {
        var index = button.dataset.skip;
        state.skipped[index] = !state.skipped[index];
        button.textContent = state.skipped[index] ? "Exercise skipped" : "Skip exercise";
      };
    });
    document.getElementById("finish").onclick = finish;
  }
  function snapshot() {
    return JSON.parse(JSON.stringify(Object.assign({}, state.session, {
      loggedSets: state.sets,
      skippedExercises: state.skipped,
      recordedDurationMinutes: Math.max(1, Math.round((Date.now() - state.startedAt) / 60000))
    })));
  }
  async function finish() {
    var button = document.getElementById("finish"), message = document.getElementById("finish-message");
    if (button.disabled) return;
    button.disabled = true; button.textContent = "Saving workout…";
    var feedback = {
      feedback_id: feedbackId(),
      session_id: state.session.id,
      status: document.getElementById("status").value,
      difficulty: document.getElementById("difficulty").value,
      notes: document.getElementById("notes").value.trim(),
      pain: document.getElementById("pain").checked,
      recorded_at: new Date().toISOString()
    };
    try {
      await api("/workout-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback_id: feedback.feedback_id, session_snapshot: snapshot(), feedback: feedback }) });
      var nextPlan = window.ALEFITTrainingEngine.applyFeedback(state.plan, feedback);
      await api("/onboarding-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onboarding_id: state.record.onboarding_id || state.record.id, replace_id: state.record.id, preferences: state.record.preferences || state.plan.profile, generated_plan: nextPlan }) });
      state.logs.push({ feedback_id: feedback.feedback_id, feedback: feedback });
      state.plan = nextPlan;
      render();
    } catch (error) {
      button.disabled = false; button.textContent = "Retry finish";
      message.className = "form-message error";
      message.textContent = error.message || "The workout was not saved. Try again.";
    }
  }
  async function init() {
    if (!token) return login();
    if (!sessionId) { window.location.replace("/today.html"); return; }
    try {
      var headers = { Authorization: "Bearer " + token };
      var responses = await Promise.all([
        fetch("/api/apps/" + APP + "/entities/OnboardingPlan?limit=1", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/WorkoutLog?limit=100", { headers: headers })
      ]);
      if (responses[0].status === 401) return login();
      state.record = records(await responses[0].json())[0] || null;
      state.logs = records(await responses[1].json());
      state.plan = state.record && (state.record.generated_plan || state.record.generatedPlan);
      var weeks = state.plan && state.plan.weeks || [];
      weeks.some(function (week) {
        var found = (week.sessions || []).filter(function (item) { return item.id === sessionId; })[0];
        if (found) { state.session = found; return true; }
        return false;
      });
      if (!state.plan || !state.session) throw new Error("That workout is no longer available.");
      render();
    } catch (error) { root.innerHTML = shell('<div class="error-box">' + esc(error.message || "We could not load this workout.") + ' <a class="top-link" href="/today.html">Back to Today</a></div>'); }
  }
  init();
}());