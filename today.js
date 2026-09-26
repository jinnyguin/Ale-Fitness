(function () {
  "use strict";

  var APP = "6a1f3d189ebdbe71fa7d256c";
  var app = document.getElementById("app");
  var authToken = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
  var user = null;
  var record = null;
  var plan = null;
  var logs = [];
  var readiness = [];
  var recovery = [];
  var currentSession = null;
  var adaptedSession = null;
  var selectedIndex = 0;
  var activeWorkout = false;
  var workoutDifficulty = "appropriate";
  var workoutPain = false;
  var completedMovements = {};
  var movementNotes = {};
  var saving = false;
  var chat = [];
  var dateChangePending = false;
  var watchedDateKey = null;
  var dayRefreshTimer = null;
  var dateWatcherStarted = false;

  function esc(value) {
    var node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }
  function records(value) {
    return Array.isArray(value) ? value : (value && (value.data || value.items)) || [];
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function localDateKey(value) {
    if (!value) return "";
    var text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function displayDate() {
    return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }
  function authHeaders(json) {
    var headers = { Authorization: "Bearer " + authToken };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }
  function goLogin() {
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("alefit_user");
    window.location.replace("/Login.html?from_url=" + encodeURIComponent(window.location.href));
  }
  function getView() {
    return new URLSearchParams(window.location.search).get("view") || "today";
  }
  function currentWeek() {
    var number = Math.max(1, Math.min((plan.weeks || []).length, Number(plan.currentWeek) || 1));
    return plan.weeks[number - 1] || { sessions: [] };
  }
  function sessions() {
    return currentWeek().sessions || [];
  }
  function feedbackId(session) {
    return "workout:" + record.id + ":" + session.id;
  }
  function isLogged(session) {
    var id = feedbackId(session);
    return logs.some(function (log) { return log.feedback_id === id; }) ||
      (plan.appliedFeedbackIds || []).indexOf(id) !== -1;
  }
  function sessionToShow() {
    var scheduled = window.ALEFITTrainingEngine.sessionForDate(sessions(), new Date());
    if (!scheduled) return null;
    if (hasWorkoutLoggedToday() && !isLogged(scheduled)) return null;
    return scheduled;
  }
  function hasWorkoutLoggedToday() {
    return logs.some(function (log) {
      var feedback = log.feedback || {};
      var loggedAt = feedback.recorded_at || log.recorded_at || log.created_at || log.created_date;
      return localDateKey(loggedAt) === todayKey();
    });
  }
  function hasUnfinishedSessionState() {
    return activeWorkout ||
      Object.keys(completedMovements).some(function (key) { return completedMovements[key]; }) ||
      Object.keys(movementNotes).some(function (key) { return String(movementNotes[key] || "").trim(); });
  }
  function resetTodaySession() {
    currentSession = sessionToShow();
    adaptedSession = null;
    activeWorkout = false;
    workoutDifficulty = "appropriate";
    workoutPain = false;
    completedMovements = {};
    movementNotes = {};
    dateChangePending = false;
  }
  function switchToTodaySession() {
    if (activeWorkout) return;
    if (hasUnfinishedSessionState() &&
        !window.confirm("Switching will discard this unfinished session’s in-page checks and notes. Continue?")) return;
    resetTodaySession();
    watchedDateKey = todayKey();
    render();
    flash("Today’s scheduled session is ready. Missed sessions stay on their original days.", false);
  }
  function checkForNewDay() {
    var currentDateKey = todayKey();
    if (watchedDateKey === null) {
      watchedDateKey = currentDateKey;
      return;
    }
    if (currentDateKey === watchedDateKey) return;
    watchedDateKey = currentDateKey;
    if (!plan || getView() !== "today") return;
    if (hasUnfinishedSessionState()) {
      dateChangePending = true;
      render();
      return;
    }
    resetTodaySession();
    render();
    flash("Today’s scheduled session is ready.", false);
  }
  function scheduleNextDayCheck() {
    var now = new Date();
    var nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    dayRefreshTimer = window.setTimeout(function () {
      checkForNewDay();
      scheduleNextDayCheck();
    }, Math.max(1, nextMidnight.getTime() - now.getTime() + 100));
  }
  function startDateWatcher() {
    if (dateWatcherStarted) return;
    dateWatcherStarted = true;
    watchedDateKey = todayKey();
    window.addEventListener("focus", checkForNewDay);
    window.addEventListener("pageshow", checkForNewDay);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkForNewDay();
    });
    scheduleNextDayCheck();
  }
  function exerciseList(items, interactive) {
    if (!items || !items.length) return '<p class="empty">No additional movement is scheduled here. Recovery is part of your plan.</p>';
    return items.map(function (item, index) {
      var key = item.id + ":" + index;
      var done = !!completedMovements[key];
      if (!interactive) {
        return '<div class="movement"><div><b>' + esc(item.name) + '</b><small>' +
          esc(item.sets + " × " + item.reps + " · " + item.rest + " · " + item.effort) +
          '</small></div></div>';
      }
      return '<div class="movement ' + (done ? "done" : "") + '"><div><b>' + esc(item.name) +
        '</b><small>' + esc(item.sets + " × " + item.reps + " · " + item.rest + " · " + item.effort) +
        '</small><input class="movement-note" data-key="' + esc(key) + '" value="' + esc(movementNotes[key] || "") +
        '" placeholder="Optional: load, reps, distance"></div><button class="check ' + (done ? "done" : "") +
        '" data-movement="' + esc(key) + '" aria-label="' + (done ? "Mark incomplete" : "Mark complete") + '"></button></div>';
    }).join("");
  }
  function headerMarkup(eyebrow, title, copy) {
    return '<div class="view-header"><div><span class="eyebrow">' + eyebrow + '</span><h1>' + title +
      '</h1>' + (copy ? '<p class="lede">' + copy + '</p>' : "") + '</div></div>';
  }
  function renderShell() {
    var name = (user && (user.full_name || user.email) || "Athlete").split(" ")[0];
    document.getElementById("header-name").textContent = name;
    var avatar = document.getElementById("header-avatar");
    avatar.textContent = name.charAt(0).toUpperCase();
    if (user && user.avatar_url) avatar.innerHTML = '<img src="' + esc(user.avatar_url) + '" alt="">';
    document.querySelectorAll("[data-view]").forEach(function (link) {
      link.classList.toggle("active", link.dataset.view === getView());
    });
  }
  function flash(message, isError) {
    var target = document.getElementById("page-message");
    if (!target) return;
    target.textContent = message;
    target.className = isError ? "error" : "";
  }
  function loggedCount() {
    return logs.filter(function (log) { return log.feedback && log.feedback.status !== "skipped"; }).length;
  }
  function latestCheckin() {
    return readiness.filter(function (item) { return String(item.recorded_at || item.created_date || "").slice(0, 10) === todayKey(); })[0];
  }
  function todayView() {
    currentSession = currentSession || sessionToShow();
    var week = currentWeek();
    if (!currentSession) {
      var completedToday = hasWorkoutLoggedToday();
      app.innerHTML = headerMarkup(completedToday ? "Today’s work complete" : "Recovery day",
        completedToday ? "Recover before your next scheduled session." : "Make space to recover.", plan.recovery) +
        '<div class="grid grid-2"><article class="hero-card"><div><span class="tag">' +
        (completedToday ? "Training saved for today" : "No extra session today") +
        '</span><h2>' + (completedToday ? "You’ve already logged training today." : "Your existing sport load already counts.") + '</h2><p>' +
        esc(plan.recovery) + '</p></div><div class="actions"><a class="button" href="/today.html?view=plan">Review my plan</a></div></article>' +
        '<article class="card"><span class="eyebrow">Recovery suggestion</span><h3>Check in with your body.</h3><p>Choose complete rest, an easy walk, or gentle mobility. The next hard session should meet your readiness, not fight it.</p><a class="button secondary small" href="/today.html?view=coach">Ask Coach</a></article></div>';
      return;
    }
    var session = adaptedSession || currentSession;
    var logged = isLogged(currentSession);
    var completed = Object.keys(completedMovements).filter(function (key) { return completedMovements[key]; }).length;
    var total = (session.exercises || []).length;
    var checkin = latestCheckin();
    var rolloverNotice = dateChangePending ?
      '<div class="notice day-rollover" role="status">' +
      (activeWorkout ?
        "A new training day has started. Finish this workout to load today’s scheduled session." :
        "A new training day has started. Your paused session is preserved; switch to today’s schedule when ready.") +
      (!activeWorkout ?
        '<br><button type="button" class="button secondary small" id="switch-today-session">Switch to today’s session</button>' :
        "") + '</div>' : "";
    app.innerHTML = headerMarkup("Today · " + displayDate(), "Train for the person you are today.", plan.summary) +
      rolloverNotice + '<div class="grid grid-2"><section class="hero-card"><div><span class="tag">Week ' + esc(week.week) + " · " +
      esc(week.phaseLabel || week.label) + '</span><h2>' + esc(session.name) + '</h2><p>' +
      esc(session.day + " · " + session.minutes + " minutes · " + (week.emphasis || "Goal-directed work")) +
      '</p></div><div><div class="meta"><span><b>' + total + '</b> movements</span><span><b>' +
      (logged ? "Complete" : adaptedSession ? "Adapted" : "Ready") + '</b> for today</span></div><div class="actions">' +
      (logged ? '<span class="notice">This session is saved. Its original snapshot stays unchanged.</span>' :
        '<button class="button" id="start-workout">' + (activeWorkout ? "Workout in progress" : "Start workout") + '</button>') +
      '</div></div></section>' +
      '<aside class="card checkin"><span class="eyebrow">Readiness check</span><h3>How should today feel?</h3><p>Tell the plan what your energy, soreness, and time look like. We adjust today without rewriting the block.</p>' +
      '<div class="field"><label for="energy">Energy</label><select id="energy"><option value="okay">Okay</option><option value="low">Low</option><option value="high">High</option></select></div>' +
      '<div class="field"><label for="soreness">Soreness</label><select id="soreness"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></div>' +
      '<div class="field"><label for="minutes">Minutes available</label><input id="minutes" type="number" min="10" max="120" value="' + esc(session.minutes) + '"></div>' +
      '<div class="field"><label for="extra">Extra activity</label><input id="extra" maxlength="120" placeholder="Practice, game, or another hard effort"></div>' +
      '<label class="movement"><span><b>Any pain or discomfort?</b><small>Stop painful movements and seek qualified guidance.</small></span><input id="pain" type="checkbox"></label>' +
      '<button class="button secondary small" id="adapt">Adjust today</button></aside></div>' +
      '<div class="grid grid-3" style="margin-top:14px"><div class="metric"><b>' + loggedCount() + '</b><span>Sessions logged</span></div><div class="metric"><b>' +
      esc(week.week) + '</b><span>Current week</span></div><div class="metric"><b>' + esc((week.phaseLabel || "Adaptive").split(" ")[0]) + '</b><span>Current phase</span></div></div>' +
      '<section class="card" style="margin-top:14px"><div class="view-header"><div><span class="eyebrow">' +
      (activeWorkout ? "Workout in progress" : "Session preview") + '</span><h3>' + esc(session.name) + '</h3></div><span class="tag">' +
      completed + " / " + total + " complete</span></div><div class=\"movement-list\">" + exerciseList(session.exercises, activeWorkout && !logged) +
       '</div>' + (activeWorkout && !logged ?
       '<div class="field"><label for="workout-difficulty">How did the work feel?</label><select id="workout-difficulty">' +
       '<option value="too-easy"' + (workoutDifficulty === "too-easy" ? " selected" : "") + '>Easier than expected</option>' +
       '<option value="appropriate"' + (workoutDifficulty === "appropriate" ? " selected" : "") + '>About right</option>' +
       '<option value="too-hard"' + (workoutDifficulty === "too-hard" ? " selected" : "") + '>Harder than expected</option>' +
       '</select></div><label class="movement"><span><b>Any pain during this session?</b>' +
       '<small>Stop a movement that causes pain; do not push through it.</small></span>' +
       '<input id="workout-pain" type="checkbox"' + (workoutPain ? " checked" : "") + '></label>' +
       '<div class="actions"><button class="button" id="finish-workout">Finish workout</button>' +
       '<button class="button secondary" id="pause-workout">Save for later</button></div>' : "") +
      '<p id="page-message"></p></section><section class="card soft" style="margin-top:14px"><span class="eyebrow">Why this is your plan</span><p>' +
      esc((plan.explanations || [])[0] || plan.summary) + '</p><a class="link-button" href="/today.html?view=plan">See the full adaptive block →</a></section>';
    if (checkin) {
      var energy = document.getElementById("energy"); if (energy) energy.value = checkin.energy || "okay";
      var soreness = document.getElementById("soreness"); if (soreness) soreness.value = checkin.soreness || "low";
    }
    bindToday();
  }
  function bindToday() {
    var start = document.getElementById("start-workout");
    if (start) start.onclick = function () {
      activeWorkout = true;
      if (window.trackEvent) window.trackEvent("workout_started", {
        week: Number(currentWeek().week) || 1,
        adapted: !!adaptedSession
      });
      render();
    };
    var adapt = document.getElementById("adapt");
    if (adapt) adapt.onclick = adaptToday;
    var difficulty = document.getElementById("workout-difficulty");
    if (difficulty) difficulty.onchange = function () { workoutDifficulty = difficulty.value; };
    var sessionPain = document.getElementById("workout-pain");
    if (sessionPain) sessionPain.onchange = function () { workoutPain = sessionPain.checked; };
    document.querySelectorAll("[data-movement]").forEach(function (button) {
      button.onclick = function () { completedMovements[button.dataset.movement] = !completedMovements[button.dataset.movement]; render(); };
    });
    document.querySelectorAll(".movement-note").forEach(function (input) {
      input.oninput = function () { movementNotes[input.dataset.key] = input.value; };
    });
    var finish = document.getElementById("finish-workout");
    if (finish) finish.onclick = finishWorkout;
    var pause = document.getElementById("pause-workout");
    if (pause) pause.onclick = function () {
      activeWorkout = false;
      render();
      flash(dateChangePending ?
        "Your paused session is preserved. You can switch to today’s schedule when ready." :
        "Your session is ready to resume today.", false);
    };
    var switchToday = document.getElementById("switch-today-session");
    if (switchToday) switchToday.onclick = switchToTodaySession;
  }
  async function adaptToday() {
    var session = currentSession;
    var checkin = {
      checkin_id: "readiness:" + record.id + ":" + todayKey() + ":" + session.id,
      session_id: session.id,
      energy: document.getElementById("energy").value,
      soreness: document.getElementById("soreness").value,
      minutesAvailable: Number(document.getElementById("minutes").value),
      extraSportActivity: document.getElementById("extra").value.trim(),
      pain: document.getElementById("pain").checked,
      recorded_at: new Date().toISOString()
    };
    adaptedSession = window.ALEFITTrainingEngine.adaptSession(session, checkin);
    try {
      var response = await fetch("/api/apps/" + APP + "/entities/ReadinessCheck", {
        method: "POST", headers: authHeaders(true), body: JSON.stringify(checkin)
      });
      if (response.status === 401) return goLogin();
      if (!response.ok) throw new Error("readiness save failed");
      readiness.unshift(checkin);
      if (window.trackEvent) window.trackEvent("readiness_check_saved", {
        adapted: true
      });
      render();
      flash(adaptedSession.adaptation, false);
    } catch (error) {
      flash("Your local adjustment is ready, but the check-in could not be saved. Retry when connected.", true);
    }
  }
  async function finishWorkout() {
    if (saving) return;
    saving = true;
    var session = adaptedSession || currentSession;
    var completed = Object.keys(completedMovements).filter(function (key) { return completedMovements[key]; }).length;
    var difficultyInput = document.getElementById("workout-difficulty");
    var painInput = document.getElementById("workout-pain");
    var todayReadiness = latestCheckin() || {};
    var feedback = {
      feedback_id: feedbackId(currentSession),
      session_id: currentSession.id,
      status: completed === 0 ? "skipped" : completed < (session.exercises || []).length ? "partial" : "completed",
      difficulty: difficultyInput ? difficultyInput.value : workoutDifficulty,
      pain: !!(painInput && painInput.checked) || workoutPain || !!todayReadiness.pain,
      notes: Object.keys(movementNotes).map(function (key) { return movementNotes[key] ? key + ": " + movementNotes[key] : ""; }).filter(Boolean).join(" | "),
      completed_movements: completed,
      recorded_at: new Date().toISOString()
    };
    var button = document.getElementById("finish-workout");
    if (button) { button.disabled = true; button.textContent = "Saving workout…"; }
    try {
      var response = await fetch("/api/apps/" + APP + "/workout-log", {
        method: "POST", headers: authHeaders(true),
        body: JSON.stringify({ feedback_id: feedback.feedback_id, session_snapshot: JSON.parse(JSON.stringify(session)), feedback: feedback })
      });
      if (response.status === 401) return goLogin();
      if (!response.ok) throw new Error("workout save failed");
      logs.unshift({ feedback_id: feedback.feedback_id, feedback: feedback, session_snapshot: session });
      var nextPlan = window.ALEFITTrainingEngine.applyFeedback(plan, feedback);
      var update = await fetch("/api/apps/" + APP + "/onboarding-plan", {
        method: "POST", headers: authHeaders(true),
        body: JSON.stringify({
          onboarding_id: record.onboarding_id || record.id,
          replace_id: record.id,
          preferences: record.preferences || plan.profile,
          generated_plan: nextPlan
        })
      });
      if (update.status === 401) return goLogin();
      if (!update.ok) throw new Error("plan update failed");
      if (window.trackEvent) window.trackEvent("workout_logged", {
        status: feedback.status,
        week: Number((session || {}).week) || Number(currentWeek().week) || 1,
        movements_completed: completed
      });
      plan = nextPlan;
      record.generated_plan = nextPlan;
      activeWorkout = false;
      completedMovements = {};
      movementNotes = {};
      workoutDifficulty = "appropriate";
      workoutPain = false;
      adaptedSession = null;
      dateChangePending = false;
      watchedDateKey = todayKey();
      currentSession = sessionToShow();
      render();
      flash("Workout saved. Your next progression now reflects what you did.", false);
    } catch (error) {
      flash("The workout could not finish saving. Your snapshot was not changed; retry when connected.", true);
      if (button) { button.disabled = false; button.textContent = "Retry finish"; }
    } finally { saving = false; }
  }
  function planView() {
    var week = currentWeek();
    var sessions = week.sessions || [];
    var weekDays = [
      { name: "Monday", short: "Mon" },
      { name: "Tuesday", short: "Tue" },
      { name: "Wednesday", short: "Wed" },
      { name: "Thursday", short: "Thu" },
      { name: "Friday", short: "Fri" },
      { name: "Saturday", short: "Sat" },
      { name: "Sunday", short: "Sun" }
    ];
    var todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    function sessionArtwork(session) {
      var exerciseNames = (session.exercises || []).map(function (exercise) {
        return exercise && exercise.name || "";
      });
      var description = [session.name || ""].concat(exerciseNames).join(" ").toLowerCase();
      if (/\b(run|running|sprint|conditioning|endurance|tempo|cardio)\b/.test(description)) {
        return {src:"/images/7a34d38b8_generated_0b924612.png",alt:"Running shoe ready for an endurance session"};
      }
      if (/\b(mobility|recovery|stretch|flexibility|warm-up|warm up)\b/.test(description)) {
        return {src:"/images/483b4b336_generated_e0df4712.png",alt:"Athlete performing a mobility stretch"};
      }
      return {src:"/images/3b6f70f20_generated_82bc43e3.png",alt:"Dumbbells ready for a strength session"};
    }
    var scheduledDays = {};
    sessions.forEach(function (session) {
      scheduledDays[String(session.day || "").toLowerCase()] = session;
    });
    var dayStrip = weekDays.map(function (day) {
      var session = scheduledDays[day.name.toLowerCase()];
      var isToday = day.name === todayName;
      var label = day.name + (isToday ? ", today" : "") +
        (session ? " · Training scheduled: " + session.name : " · No session scheduled");
      return '<div class="ap-plan-day' + (session ? ' is-scheduled' : '') + (isToday ? ' is-today' : '') +
        '" aria-label="' + esc(label) + '"' + (isToday ? ' aria-current="date"' : '') + '>' +
        '<span class="ap-plan-day-name">' + esc(day.short) + '</span>' +
        '<span class="ap-plan-day-mark" aria-hidden="true">' + (session ? '•' : '—') + '</span>' +
        '<span class="ap-plan-day-status">' + (session ? 'Train' : 'Open') + '</span>' +
        (isToday ? '<span class="ap-plan-today-label">Today</span>' : '') + '</div>';
    }).join("");
    var sessionCards = sessions.map(function (session) {
      var artwork = sessionArtwork(session);
      var logged = isLogged(session);
      return '<article class="ap-plan-session">' +
        (artwork ? '<div class="ap-plan-session-art"><img src="' + artwork.src + '" alt="' + esc(artwork.alt) +
          '"><span class="ap-plan-session-day">' + esc(session.day) + '</span></div>' : '') +
        '<div class="ap-plan-session-content"><div class="ap-plan-session-state' + (logged ? ' is-logged' : '') + '">' +
        (logged ? 'Logged' : 'Scheduled') + '</div><h3>' + esc(session.name) + '</h3>' +
        '<div class="ap-plan-session-meta"><span><b>' + esc(session.minutes) + '</b> min</span><i aria-hidden="true"></i><span><b>' +
        esc(session.exercises.length) + '</b> movements</span></div>' +
        '<a class="link-button ap-plan-open" href="/today.html" aria-label="Open ' + esc(session.name) +
        '">Open session <span aria-hidden="true">↗</span></a></div></article>';
    }).join("");
    app.innerHTML = headerMarkup("My plan", "One plan. Built around you.", plan.summary) +
      '<section class="ap-plan-week-strip" aria-label="Week ' + esc(week.week) + ' schedule">' +
      '<div class="ap-plan-strip-heading"><div><span class="eyebrow">Week at a glance</span>' +
      '<span class="ap-plan-strip-caption">' + esc(sessions.length) + ' sessions on the plan</span></div>' +
      '<span class="ap-plan-strip-key"><i aria-hidden="true"></i> Scheduled</span></div>' +
      '<div class="ap-plan-days">' + dayStrip + '</div></section>' +
      '<div class="grid grid-2 ap-plan-overview"><section class="hero-card ap-plan-phase"><div>' +
      '<span class="tag">Week ' + esc(week.week) + " · " + esc(week.phaseLabel || week.label) +
      '</span><h2>' + esc(week.emphasis || week.progression) + '</h2><p>' +
      esc(week.reason || "The current phase responds to your goal and recent feedback.") +
      '</p></div><div class="meta"><span><b>' + esc(plan.focus) +
      '</b> primary focus</span><span><b>' + esc(sessions.length) +
      '</b> sessions this week</span></div></section>' +
      '<aside class="card ap-plan-guidance"><div class="ap-plan-guidance-heading"><span class="eyebrow">Current guidance</span>' +
      '<span>Keep in view</span></div><div class="ap-plan-guidance-list">' +
      '<div class="ap-plan-guidance-row"><b>Conditioning</b><span>' + esc(week.conditioning) + '</span></div>' +
      '<div class="ap-plan-guidance-row"><b>Recovery</b><span>' + esc(week.recovery) + '</span></div>' +
      '<div class="ap-plan-guidance-row"><b>Progression</b><span>' + esc(week.progression) + '</span></div></div></aside></div>' +
      '<section class="ap-plan-workouts"><div class="ap-plan-section-heading"><div><span class="eyebrow">This week, in detail</span>' +
      '<h2>Your sessions</h2></div><span class="ap-plan-session-count"><b>' + esc(sessions.length) + '</b> scheduled</span></div>' +
      '<div class="ap-plan-session-grid">' + sessionCards + '</div></section>' +
      '<section class="card ap-plan-future"><div class="ap-plan-future-copy"><span class="eyebrow">Beyond this week</span>' +
      '<h2>What changes next</h2><p>Primary movements stay recognizable long enough to measure. Support work, volume, effort, conditioning, and recovery respond to your readiness and feedback.</p></div>' +
      '<div class="ap-plan-future-weeks">' + (plan.weeks || []).filter(function (item) {
        return Number(item.week) > Number(plan.currentWeek);
      }).map(function (item) {
        return '<div class="ap-plan-future-row"><b>Week ' + esc(item.week) + " · " +
          esc(item.phaseLabel || item.label) + '</b><span>' + esc(item.emphasis) + '</span></div>';
      }).join("") + '</div></section>';
  }
  function progressView() {
    var total = (plan.weeks || []).reduce(function (sum, week) { return sum + (week.sessions || []).length; }, 0);
    var completed = loggedCount();
    var current = currentWeek();
    var values = (plan.weeks || []).map(function (week) {
      return logs.filter(function (log) { return log.session_snapshot && log.feedback &&
        Number(log.session_snapshot.week || 0) === Number(week.week) && log.feedback.status !== "skipped"; }).length;
    });
    app.innerHTML = headerMarkup("Progress", "Notice what is changing.", "No projected transformations. Your progress is the work you completed, the feedback you gave, and the next plan decision it earned.") +
      '<div class="grid grid-3"><div class="metric"><b>' + completed + '</b><span>Sessions logged</span></div><div class="metric"><b>' +
      (total ? Math.round(completed / total * 100) : 0) + '%</b><span>Block completed</span></div><div class="metric"><b>' + esc(current.week || 1) + '</b><span>Current week</span></div></div>' +
      '<section class="card" style="margin-top:14px"><span class="eyebrow">Work completed by week</span><div class="bar-chart">' +
      values.map(function (value, index) { var max = Math.max(1, Math.max.apply(Math, values)); return '<div class="bar ' + (index + 1 === Number(plan.currentWeek) ? "current" : "") + '" style="height:' + (value / max * 100) + '%" title="Week ' + (index + 1) + ': ' + value + ' sessions"></div>'; }).join("") +
      '</div><div class="bar-labels">' + values.map(function (_, index) { return '<span>W' + (index + 1) + '</span>'; }).join("") + '</div></section>' +
      '<div class="grid grid-2" style="margin-top:14px"><section class="card"><span class="eyebrow">Recent sessions</span><div class="list">' +
      logs.slice(0, 6).map(function (log) { return '<div class="list-row"><b>' + esc((log.session_snapshot || {}).name || "Workout") + '</b><span>' +
        esc((log.feedback || {}).status || "logged") + '</span></div>'; }).join("") + (logs.length ? "" : '<p>No sessions logged yet. Your first completed workout will start the record.</p>') +
      '</div></section><section class="card soft"><span class="eyebrow">What the plan learned</span><p>' + esc(plan.progression) + '</p><p>' +
      esc((plan.explanations || [])[2] || plan.recovery) + '</p><a class="button small" href="/today.html">Train today</a></section></div>';
  }
  function coachView() {
    app.innerHTML = headerMarkup("Coach", "Ask about the plan.", "Your coach has the current block, recent sessions, and the decisions behind the next workout.") +
      '<section class="card"><div class="chat" id="chat">' + (chat.length ? chat.map(function (item) {
        return '<div class="bubble ' + (item.role === "user" ? "user" : "") + '">' + esc(item.text).replace(/\n/g, "<br>") + '</div>';
      }).join("") : '<div class="bubble">I’m ready. Ask me what to do today, how to adjust around sport, or why this week looks the way it does.</div>') +
      '</div><form class="coach-form" id="coach-form"><label class="sr-only" for="coach-input">Ask Coach</label><input id="coach-input" required maxlength="500" placeholder="Example: I slept poorly. How should I train today?"><button class="button" type="submit">Ask</button></form><p id="coach-message"></p></section>';
    document.getElementById("coach-form").onsubmit = askCoach;
  }
  async function askCoach(event) {
    event.preventDefault();
    var input = document.getElementById("coach-input");
    var question = input.value.trim();
    if (!question) return;
    input.disabled = true;
    if (window.trackEvent) window.trackEvent("coach_question_asked", { source: "coach_view" });
    chat.push({ role: "user", text: question });
    coachView();
    var message = document.getElementById("coach-message");
    message.textContent = "Thinking from your plan…";
    try {
      var context = "Athlete plan: " + plan.name + ". Focus: " + plan.focus + ". Current week: " + plan.currentWeek +
        ". Summary: " + plan.summary + ". Progression: " + plan.progression + ". Recovery: " + plan.recovery +
        ". Recent feedback: " + JSON.stringify(logs.slice(0, 5).map(function (log) { return log.feedback; })) +
        ". Answer safely and concretely. Do not diagnose pain. If pain is mentioned, recommend stopping painful movement and qualified guidance.";
      var response = await fetch("/api/apps/" + APP + "/integration-endpoints/Core/InvokeLLM", {
        method: "POST", headers: authHeaders(true), body: JSON.stringify({ prompt: context + "\n\nAthlete question: " + question })
      });
      if (response.status === 401) return goLogin();
      var data = await response.json();
      if (!response.ok) throw new Error("coach unavailable");
      if (window.trackEvent) window.trackEvent("coach_response_received", { success: true });
      chat.push({ role: "assistant", text: String(data.result || data.text || "Use today’s readiness check and keep the effort controlled.") });
    } catch (error) {
      if (window.trackEvent) window.trackEvent("coach_response_received", { success: false });
      chat.push({ role: "assistant", text: "Use today’s readiness check. Keep the planned priority movement, reduce support volume if energy or soreness is low, and stop any painful movement. I could not reach the coaching service just now." });
    }
    coachView();
  }
  function profileView() {
    app.innerHTML = headerMarkup("Profile", "Keep the plan honest.", "Update the information that shapes your coaching space. Training preferences stay in your adaptive plan.") +
      '<div class="grid grid-2 profile-grid"><section class="card"><form id="profile-form"><div class="field"><label for="full-name">Name</label><input id="full-name" maxlength="80" value="' +
      esc(user.full_name || "") + '"></div><div class="field"><label>Email</label><input disabled value="' + esc(user.email || "") + '"></div><div class="field"><label for="bio">About you</label><textarea id="bio" maxlength="300" placeholder="What should your coach know?">' +
      esc(user.bio || "") + '</textarea></div><div class="field"><label for="calories">Daily calorie goal <span>(optional)</span></label><input id="calories" type="number" min="0" max="10000" value="' +
      esc(user.daily_calorie_goal || "") + '"></div><button class="button" type="submit">Save profile</button><p id="profile-message"></p></form></section><aside class="card soft"><span class="eyebrow">Your adaptive plan</span><h3>' +
      esc(plan.name) + '</h3><p>' + esc(plan.summary) + '</p><div class="list"><div class="list-row"><b>Focus</b><span>' + esc(plan.focus) + '</span></div><div class="list-row"><b>Equipment</b><span>' +
      esc((plan.profile.equipment || []).join(", ")) + '</span></div><div class="list-row"><b>Schedule</b><span>' + esc(plan.profile.days + " days · " + plan.profile.duration + " min") +
      '</span></div></div><div class="actions"><a class="button secondary small" href="/Register.html">Adjust plan inputs</a><button class="link-button" id="logout">Sign out</button></div></aside></div>';
    document.getElementById("profile-form").onsubmit = saveProfile;
    document.getElementById("logout").onclick = function () { localStorage.removeItem("base44_access_token"); localStorage.removeItem("token"); localStorage.removeItem("alefit_user"); window.location.replace("/"); };
  }
  async function saveProfile(event) {
    event.preventDefault();
    var button = event.target.querySelector("button");
    var message = document.getElementById("profile-message");
    button.disabled = true;
    try {
      var response = await fetch("/api/apps/" + APP + "/auth/me", { method: "PUT", headers: authHeaders(true), body: JSON.stringify({
        full_name: document.getElementById("full-name").value.trim(),
        bio: document.getElementById("bio").value.trim(),
        daily_calorie_goal: Number(document.getElementById("calories").value || 0)
      }) });
      if (response.status === 401) return goLogin();
      if (!response.ok) throw new Error();
      user = await response.json();
      if (window.trackEvent) window.trackEvent("profile_updated", { success: true });
      renderShell();
      message.textContent = "Profile saved.";
    } catch (error) { message.textContent = "Profile could not be saved. Retry when connected."; message.className = "error"; }
    button.disabled = false;
  }
  function render() {
    renderShell();
    if (getView() === "plan") return planView();
    if (getView() === "progress") return progressView();
    if (getView() === "coach") return coachView();
    if (getView() === "profile") return profileView();
    return todayView();
  }
  async function load() {
    if (!authToken) return goLogin();
    try {
      var headers = authHeaders(false);
      var responses = await Promise.all([
        fetch("/api/apps/" + APP + "/auth/me", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/OnboardingPlan?limit=1", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/WorkoutLog?limit=100", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/ReadinessCheck?limit=30", { headers: headers }),
        fetch("/api/apps/" + APP + "/entities/RecoveryScore?limit=14", { headers: headers })
      ]);
      if (responses.some(function (r) { return r.status === 401; })) return goLogin();
      if (!responses[0].ok || !responses[1].ok) throw new Error("load failed");
      user = await responses[0].json();
      var plans = records(await responses[1].json());
      logs = records(responses[2].ok ? await responses[2].json() : []);
      readiness = records(responses[3].ok ? await responses[3].json() : []);
      recovery = records(responses[4].ok ? await responses[4].json() : []);
      if (!plans.length) {
        app.innerHTML = headerMarkup("Start here", "Build your adaptive plan.", "Your coaching space is ready when your first block is saved.") + '<div class="empty"><p>Answer a few focused questions about your goals, schedule, equipment, and readiness.</p><a class="button" href="/Register.html">Build my plan</a></div>';
        return;
      }
      record = plans[0];
      plan = record.generated_plan || record.generatedPlan;
      if (!plan || !plan.weeks) throw new Error("plan missing");
      startDateWatcher();
      render();
    } catch (error) {
      app.innerHTML = '<div class="empty"><h2>Your plan is temporarily unavailable.</h2><p>Nothing was changed. Check your connection and try again.</p><button class="button" id="retry">Retry</button></div>';
      document.getElementById("retry").onclick = load;
    }
  }
  load();
}());