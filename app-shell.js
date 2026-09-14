(function () {
  "use strict";

  var APP = "6a1f3d189ebdbe71fa7d256c";
  var token = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
  var page = document.body.dataset.page || "";
  var state = { user: null, record: null, plan: null, logs: [], readiness: [] };
  var root = document.getElementById("app");

  function esc(value) {
    var node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }
  function redirectLogin() {
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
    window.location.replace("/Login.html?from_url=" + encodeURIComponent(window.location.href));
  }
  async function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ Authorization: "Bearer " + token }, options.headers || {});
    var response = await fetch("/api/apps/" + APP + path, options);
    if (response.status === 401) {
      redirectLogin();
      throw new Error("Your session expired.");
    }
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Request could not be completed.");
    return data;
  }
  function records(value) {
    return Array.isArray(value) ? value : (value.data || value.items || []);
  }
  function nav(active) {
    var items = [
      ["/today.html", "Today", "M3 12h18M12 3v18"],
      ["/my-plan.html", "My Plan", "M4 5h16v14H4zM8 9h8M8 13h5"],
      ["/progress.html", "Progress", "M4 19V5m0 14h16M8 16v-4m4 4V8m4 8v-6"],
      ["/coach.html", "Coach", "M5 5h14v11H8l-3 3z"],
      ["/profile.html", "Profile", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0"]
    ];
    return '<nav class="bottom-nav" aria-label="Main navigation">' + items.map(function (item) {
      return '<a class="' + (active === item[1].toLowerCase() ? "active" : "") + '" href="' + item[0] + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="' + item[2] + '"/></svg>' +
        '<span>' + item[1] + "</span></a>";
    }).join("") + "</nav>";
  }
  function topbar() {
    return '<header class="app-topbar"><a class="app-logo" href="/today.html" aria-label="Alefit Today"><img src="/images/alefit-logo.png" alt="ALEFIT"></a>' +
      '<div class="app-top-actions"><a class="top-link" href="/profile.html">Account</a></div></header>';
  }
  function shell(content, active) {
    return topbar() + '<main class="app-main">' + content + "</main>" + nav(active);
  }
  function currentWeek() {
    var index = Math.max(0, Math.min((state.plan.weeks || []).length - 1, Number(state.plan.currentWeek || 1) - 1));
    return state.plan.weeks[index] || { week: 1, sessions: [] };
  }
  function feedbackFor(session) {
    var id = "workout:" + state.record.id + ":" + session.id;
    return state.logs.filter(function (log) { return log.feedback_id === id; })[0] || null;
  }
  function sessionDone(session) { return !!feedbackFor(session); }
  function dayName() {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  }
  function sessionLink(session) { return "/workout.html?session_id=" + encodeURIComponent(session.id); }
  function sessionCard(session) {
    var done = sessionDone(session);
    return '<article class="card session-card ' + (done ? "is-done" : "") + '"><div><div class="session-top"><div>' +
      '<div class="session-day">' + esc(session.day) + '</div><h3>' + esc(session.name) + '</h3></div>' +
      (done ? '<span class="done-mark">✓ Done</span>' : "") + '</div><div class="session-details">' +
      esc((session.estimatedMinutes || session.minutes) + " min · " + session.exercises.length + " movements") +
      '</div></div><div class="button-row"><a class="button-secondary" href="' + sessionLink(session) + '">' +
      (done ? "Review workout" : "Start workout") + "</a></div></article>";
  }
  function loading() { root.innerHTML = '<div class="loading">Loading your training context…</div>'; }
  function showError(message) { root.innerHTML = '<div class="error-box">' + esc(message) + ' <a class="top-link" href="javascript:location.reload()">Retry</a></div>'; }

  function todayPage() {
    var week = currentWeek(), sessions = week.sessions || [], today = dayName();
    var todaySession = sessions.filter(function (item) { return item.day === today; })[0];
    var next = sessions.filter(function (item) { return !sessionDone(item); })[0] || sessions[0];
    var completed = sessions.filter(sessionDone).length;
    var shown = todaySession || next;
    var firstName = (state.user.full_name || state.user.email || "athlete").split(" ")[0];
    var insight = (state.plan.explanations || [])[0] || "Your plan prioritizes the work you selected.";
    var content = '<div class="page-heading"><span class="eyebrow">Today · Week ' + esc(week.week) + '</span><h1>Good morning, ' + esc(firstName) + '.</h1><p class="lede">One clear session, built around your goals and today’s capacity.</p></div>';
    if (shown && todaySession) {
      content += '<section class="hero-card"><span class="eyebrow">Today’s training</span><h2>' + esc(shown.name) + '</h2><p class="lede">' +
        esc((shown.estimatedMinutes || shown.minutes) + " minutes · " + state.plan.focus + " focus · " + shown.exercises.length + " movements") +
        '</p><div class="hero-meta"><span class="pill accent">' + esc(state.plan.focus) + '</span><span class="pill">' + esc(state.plan.profile.sport || "general fitness") + '</span></div>' +
        '<a class="button" href="' + sessionLink(shown) + '">Start workout</a></section>';
    } else {
      content += '<section class="hero-card recovery-card"><span class="eyebrow">Recovery day</span><h2>Train your recovery.</h2><p class="lede">' +
        esc(state.plan.recovery || "Use today for easy movement, mobility, hydration, and sleep.") +
        '</p><ul class="recovery-list"><li>10 minutes of gentle mobility</li><li>Easy walking if it feels restorative</li><li>Ask Coach if your schedule changed</li></ul></section>';
    }
    content += '<section class="section"><div class="section-head"><div><span class="eyebrow">This week</span><h2>Keep the rhythm.</h2></div><span class="muted small">' + completed + " of " + sessions.length + " done</span></div>" +
      '<div class="progress-bar"><span style="width:' + (sessions.length ? Math.round(completed / sessions.length * 100) : 0) + '%"></span></div>' +
      '<div class="grid-2" style="margin-top:14px">' + (shown && todaySession ? sessionCard(shown) : '<div class="card"><div class="card-label">Next workout</div>' + (next ? sessionCard(next).replace(/^<article class="card session-card[^>]*>|<\/article>$/g, "") : '<p class="muted">Your next block is ready when you are.</p>') + "</div>") + '</div></section>' +
      '<section class="section"><div class="card"><div class="card-label">Coach insight</div><p>' + esc(insight) + '</p></div></section>';
    root.innerHTML = shell(content, "today");
  }

  function planPage() {
    var week = currentWeek(), sessions = week.sessions || [];
    var content = '<div class="page-heading"><span class="eyebrow">Your plan · Week ' + esc(week.week) + '</span><h1>' + esc(state.plan.name || "Your training plan") + '</h1><p class="lede">' + esc(state.plan.summary || "A plan that adapts as you train.") + '</p><div class="hero-meta"><span class="pill accent">' + esc(state.plan.focus) + '</span><span class="pill">' + esc(state.plan.profile.days || sessions.length) + " days / week</span><span class=\"pill\">" + esc(state.plan.profile.duration || "45") + " min sessions</span></div></div>";
    content += '<section class="card"><div class="card-label">Current week</div><div class="week-list">' + sessions.map(function (item) {
      return '<div class="week-row"><span class="week-label">' + esc(item.day.slice(0, 3)) + '</span><div><strong>' + esc(item.name) + '</strong><small>' + esc((item.estimatedMinutes || item.minutes) + " min · " + item.exercises.length + " movements") + '</small></div><span class="status ' + (sessionDone(item) ? "done" : "") + '">' + (sessionDone(item) ? "Complete" : '<a href="' + sessionLink(item) + '">Open →</a>') + '</span></div>';
    }).join("") + '</div></section>';
    content += '<section class="section"><div class="section-head"><div><span class="eyebrow">Four-week view</span><h2>Earn the next block.</h2></div></div><div class="grid-2">' + state.plan.weeks.map(function (item) {
      var done = (item.sessions || []).filter(sessionDone).length;
      return '<article class="card"><div class="card-label">Week ' + esc(item.week) + '</div><h3>' + esc(item.label || "Training block") + '</h3><p class="muted small">' + esc(item.progression || "") + '</p><div class="progress-bar" style="margin-top:16px"><span style="width:' + ((item.sessions || []).length ? Math.round(done / item.sessions.length * 100) : 0) + '%"></span></div><p class="muted small" style="margin-top:8px">' + done + " of " + (item.sessions || []).length + " sessions logged</p></article>";
    }).join("") + "</div></section>";
    root.innerHTML = shell(content, "my plan");
  }

  function progressPage() {
    var allSessions = (state.plan.weeks || []).reduce(function (all, item) { return all.concat(item.sessions || []); }, []);
    var completed = state.logs.filter(function (log) { return log.feedback && log.feedback.status === "completed"; });
    var current = currentWeek();
    var focus = state.plan.focus || "training";
    var recent = completed.slice(0, 5);
    var content = '<div class="page-heading"><span class="eyebrow">Progress</span><h1>Measure what matters.</h1><p class="lede">Your progress is based on logged training—not projected outcomes.</p></div>' +
      '<section class="stat-grid"><div class="stat"><strong>' + completed.length + '</strong><span>Workouts completed</span></div><div class="stat"><strong>' + state.logs.length + '</strong><span>Sessions handled</span></div><div class="stat"><strong>' + (state.plan.currentWeek || 1) + '</strong><span>Current week</span></div><div class="stat"><strong>' + esc(focus) + '</strong><span>Plan focus</span></div></section>';
    content += '<section class="section"><div class="section-head"><div><span class="eyebrow">Consistency</span><h2>Your actual week.</h2></div></div><div class="card"><div class="progress-bar"><span style="width:' + (current.sessions.length ? Math.round(current.sessions.filter(sessionDone).length / current.sessions.length * 100) : 0) + '%"></span></div><p class="muted small" style="margin-top:12px">' + current.sessions.filter(sessionDone).length + " of " + current.sessions.length + " current-week sessions logged. Skipped and partial sessions stay visible in your history.</p></div></section>";
    content += '<section class="section"><div class="section-head"><div><span class="eyebrow">Training history</span><h2>Recent sessions.</h2></div></div><div class="card"><div class="table-wrap">' + (recent.length ? '<table><thead><tr><th>Session</th><th>Outcome</th><th>Difficulty</th></tr></thead><tbody>' + recent.map(function (log) { return '<tr><td>' + esc((log.session_snapshot || {}).name || log.feedback.session_id) + '</td><td>' + esc(log.feedback.status) + '</td><td>' + esc(log.feedback.difficulty || "—") + '</td></tr>'; }).join("") + '</tbody></table>' : '<div class="empty-state"><h3>Your progress starts here.</h3><p>Log your first workout and this space will reflect your actual work.</p></div>') + "</div></div></section>";
    root.innerHTML = shell(content, "progress");
  }

  async function coachPage() {
    var context = "The athlete's current plan is " + (state.plan.name || "a personalized plan") + ", focused on " + (state.plan.focus || "fitness") + ". " +
      "They train " + (state.plan.profile.days || "several") + " days per week for about " + (state.plan.profile.duration || 45) + " minutes. " +
      "Recent logged sessions: " + state.logs.length + ".";
    var content = '<div class="page-heading"><span class="eyebrow">Alefit Coach</span><h1>Ask about your training.</h1><p class="lede">Coach uses your plan context to answer practical questions. It is guidance, not a diagnosis.</p></div><section class="card"><div class="coach-suggestions">' +
      ["Why am I doing this workout?", "I only have 30 minutes.", "Can I replace an exercise?", "I have sport practice tonight."].map(function (item) { return '<button class="suggestion" type="button">' + esc(item) + "</button>"; }).join("") +
      '</div><form class="coach-form" id="coach-form"><input id="coach-question" required maxlength="500" placeholder="Ask a question about your plan"><button class="button" type="submit">Ask Coach</button></form><div id="coach-answer" class="coach-answer" hidden></div></section><section class="section"><div class="card"><div class="card-label">What Coach knows</div><p class="muted">' + esc(context) + ' Answers are grounded in the data available in this account.</p></div></section>';
    root.innerHTML = shell(content, "coach");
    root.querySelectorAll(".suggestion").forEach(function (button) { button.onclick = function () { document.getElementById("coach-question").value = button.textContent; }; });
    document.getElementById("coach-form").onsubmit = async function (event) {
      event.preventDefault();
      var input = document.getElementById("coach-question"), answer = document.getElementById("coach-answer"), submit = event.target.querySelector("button");
      submit.disabled = true; submit.textContent = "Thinking…"; answer.hidden = false; answer.textContent = "Reviewing your plan and recent training…";
      try {
        var response = await api("/integration-endpoints/Core/InvokeLLM", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "You are Alefit Coach. " + context + " Answer this athlete question with concise, practical advice. Do not diagnose injuries; recommend a qualified professional for pain or medical concerns. Question: " + input.value.trim() }) });
        answer.textContent = response.result || response.error || "I could not generate an answer. Try again.";
      } catch (error) {
        answer.textContent = "Use the plan’s current focus and keep the next session controlled. If pain is involved, stop and get qualified guidance before continuing.";
      } finally { submit.disabled = false; submit.textContent = "Ask Coach"; }
    };
  }

  function profilePage() {
    var p = state.plan.profile || {}, selected = Array.isArray(p.equipment) ? p.equipment : [];
    var content = '<div class="page-heading"><span class="eyebrow">Profile</span><h1>Keep Alefit current.</h1><p class="lede">Update the inputs that shape your plan. Rebuilding replaces the plan only after you confirm.</p></div><section class="card"><div class="card-label">Account</div><div class="form-grid"><div><strong>' + esc(state.user.full_name || "Alefit athlete") + '</strong><p class="muted small">' + esc(state.user.email) + '</p></div><div class="button-row" style="justify-content:flex-end"><a class="button-secondary" href="/Account.html">Account details</a><button class="button-secondary" id="logout" type="button">Sign out</button></div></div></section>';
    content += '<section class="section card"><div class="card-label">Training preferences</div><form id="profile-form"><div class="form-grid"><div class="field"><label for="sport">Primary training focus</label><select id="sport">' + ["basketball","running","strength","general"].map(function (v) { return '<option value="' + v + '"' + (p.sport === v ? " selected" : "") + ">" + v.replace("-", " ") + "</option>"; }).join("") + '</select></div><div class="field"><label for="days">Days per week</label><select id="days">' + [2,3,4].map(function (v) { return '<option value="' + v + '"' + (Number(p.days) === v ? " selected" : "") + ">" + v + " days</option>"; }).join("") + '</select></div><div class="field"><label for="duration">Minutes per session</label><input id="duration" type="number" min="20" max="120" value="' + esc(p.duration || 45) + '"></div><div class="field"><label for="experience">Experience</label><select id="experience">' + ["new","regular","advanced"].map(function (v) { return '<option value="' + v + '"' + (p.experience === v ? " selected" : "") + ">" + v + "</option>"; }).join("") + '</select></div></div><div class="field"><label>Available equipment</label><div class="check-grid">' + [["gym","Full gym"],["dumbbells","Dumbbells"],["bands","Resistance bands"],["bodyweight","Bodyweight"],["field","Court / field"],["pool","Pool"]].map(function (item) { return '<label class="check"><input type="checkbox" value="' + item[0] + '"' + (selected.indexOf(item[0]) > -1 ? " checked" : "") + '> ' + item[1] + "</label>"; }).join("") + '</div></div><div class="field"><label for="limitations">Limitations or schedule notes</label><textarea id="limitations" maxlength="180">' + esc(p.limitations || "") + '</textarea></div><div class="button-row" style="margin-top:18px"><button class="button" type="submit">Save and rebuild plan</button><span id="profile-message" class="form-message"></span></div></form></section>';
    root.innerHTML = shell(content, "profile");
    document.getElementById("logout").onclick = function () { localStorage.removeItem("base44_access_token"); localStorage.removeItem("token"); window.location.replace("/"); };
    document.getElementById("profile-form").onsubmit = async function (event) {
      event.preventDefault();
      if (!window.confirm("Replace your current plan with this updated plan? Your completed workout history stays saved.")) return;
      var button = event.target.querySelector("button[type=submit]"), message = document.getElementById("profile-message");
      button.disabled = true; button.textContent = "Rebuilding…";
      var next = Object.assign({}, p, { sport: document.getElementById("sport").value, days: Number(document.getElementById("days").value), duration: Number(document.getElementById("duration").value), experience: document.getElementById("experience").value, limitations: document.getElementById("limitations").value.trim(), equipment: Array.prototype.slice.call(event.target.querySelectorAll("input[type=checkbox]:checked")).map(function (item) { return item.value; }) });
      try {
        var generated = window.ALEFITTrainingEngine.generate(next, { workoutLogs: state.logs, readiness: state.readiness });
        await api("/onboarding-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onboarding_id: state.record.onboarding_id || state.record.id, replace_id: state.record.id, preferences: next, generated_plan: generated }) });
        window.location.href = "/my-plan.html";
      } catch (error) { message.className = "form-message error"; message.textContent = error.message || "Could not rebuild the plan."; button.disabled = false; button.textContent = "Save and rebuild plan"; }
    };
  }

  async function init() {
    if (!token) return redirectLogin();
    if (!root) return;
    loading();
    try {
      var headers = { Authorization: "Bearer " + token };
      var responses = await Promise.all([
        fetch("/api/apps/" + APP + "/auth/me", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/OnboardingPlan?limit=1", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/WorkoutLog?limit=100", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/ReadinessCheck?limit=20", { headers: headers })
      ]);
      if (responses[0].status === 401) return redirectLogin();
      state.user = await responses[0].json();
      state.record = records(await responses[1].json())[0] || null;
      state.logs = records(await responses[2].json());
      state.readiness = records(await responses[3].json());
      state.plan = state.record && (state.record.generated_plan || state.record.generatedPlan);
      if (!state.plan) {
        root.innerHTML = shell('<div class="empty-state"><h2>Let’s build your plan.</h2><p>Answer a few focused questions and Alefit will create your first training block.</p><a class="button" href="/Register.html">Build my plan</a></div>', page);
        return;
      }
      if (page === "today") todayPage();
      else if (page === "plan") planPage();
      else if (page === "progress") progressPage();
      else if (page === "coach") await coachPage();
      else if (page === "profile") profilePage();
    } catch (error) { showError(error.message || "We could not load your training context."); }
  }
  window.ALEFIT_APP = { api: api, state: state, esc: esc, feedbackFor: feedbackFor, sessionDone: sessionDone };
  init();
}());