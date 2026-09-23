(function () {
  "use strict";

  var APP = "6a1f3d189ebdbe71fa7d256c";
  var DRAFT = "alefit_onboarding_draft";
  var root = document.getElementById("onboarding");
  var progress = document.getElementById("progress");
  var saved = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(DRAFT) || "{}");
  } catch (error) {
    sessionStorage.removeItem(DRAFT);
  }
  var state = {
    step: Number(saved.step || 0),
    prefs: saved.prefs || { goals: [], equipment: [] },
    plan: saved.plan || null,
    existingId: saved.existingId || null,
    onboardingId: saved.onboardingId || (window.crypto && window.crypto.randomUUID ?
      window.crypto.randomUUID() : "onboarding-" + Date.now() + "-" + Math.random().toString(36).slice(2))
  };
  state.prefs.goals = Array.isArray(state.prefs.goals) ? state.prefs.goals : [];
  state.prefs.equipment = Array.isArray(state.prefs.equipment) ? state.prefs.equipment :
    (state.prefs.equipment ? [state.prefs.equipment] : []);
  if (!sessionStorage.getItem("alefit_onboarding_analytics_started")) {
    sessionStorage.setItem("alefit_onboarding_analytics_started", "1");
    if (window.trackEvent) window.trackEvent("onboarding_started", { source: "register" });
  }

  var sports = [
    ["basketball", "Basketball", "Jump, cut and defend"],
    ["football", "Football", "Acceleration and contact power"],
    ["soccer", "Soccer", "Repeat sprint and agility"],
    ["baseball", "Baseball", "Rotational power and throwing"],
    ["swimming", "Swimming", "Pool conditioning and strength"],
    ["track", "Track", "Speed and force"],
    ["running", "Running", "Build toward your distance"],
    ["cross-country", "Cross country", "Aerobic durability"],
    ["strength", "Strength", "Build the big lifts"],
    ["hiit", "HIIT", "Work capacity and control"],
    ["mobility", "Mobility", "Move with more range"],
    ["general", "General fitness", "Train for your life"]
  ];
  var goalMap = {
    basketball: [["jump", "Jump higher"], ["quickness", "First-step quickness"], ["durability", "Stay durable"]],
    football: [["speed", "Acceleration"], ["power", "Explosive power"], ["strength", "Contact strength"]],
    soccer: [["speed", "Repeat sprint ability"], ["agility", "Change direction"], ["conditioning", "Match fitness"]],
    baseball: [["power", "Rotational power"], ["speed", "First-step speed"], ["durability", "Shoulder resilience"]],
    swimming: [["conditioning", "Pool conditioning"], ["strength", "Pulling strength"], ["mobility", "Shoulder mobility"]],
    track: [["speed", "Sprint speed"], ["power", "Force production"], ["conditioning", "Race conditioning"]],
    "cross-country": [["conditioning", "Aerobic base"], ["durability", "Durable running"], ["speed", "Finish speed"]],
    running: [["conditioning", "Build endurance"], ["durability", "Run comfortably"], ["speed", "Improve pace"]],
    strength: [["strength", "Build strength"], ["muscle", "Build muscle"], ["conditioning", "Work capacity"]],
    hiit: [["conditioning", "Work capacity"], ["fitness", "General fitness"], ["movement", "Move better"]],
    mobility: [["mobility", "More range"], ["durability", "Move comfortably"], ["movement", "Better control"]],
    general: [["strength", "Get stronger"], ["fitness", "Build fitness"], ["movement", "Move better"]]
  };
  var equipment = [
    ["gym", "Full gym", "Barbell, machines and open space"],
    ["dumbbells", "Dumbbells", "One or two adjustable weights"],
    ["bands", "Resistance bands", "Anchored or loop bands"],
    ["bodyweight", "Bodyweight", "No external load"],
    ["field", "Court / field", "Outdoor or sport space"],
    ["pool", "Pool", "Access to a swimming pool"]
  ];
  function persist() {
    sessionStorage.setItem(DRAFT, JSON.stringify(state));
  }
  function esc(value) {
    var node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }
  function token() {
    return localStorage.getItem("base44_access_token") || localStorage.getItem("token");
  }
  function returnToSignIn() {
    persist();
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("alefit_user");
    window.location.replace("/Login.html?from_url=%2FRegister.html");
  }
  function tile(value, title, copy, selected) {
    return '<button type="button" class="tile ' + (selected ? "selected" : "") +
      '" data-value="' + esc(value) + '" aria-pressed="' + selected + '">' +
      "<strong>" + esc(title) + "</strong><small>" + esc(copy) + "</small></button>";
  }
  function footer(label, back) {
    return '<div class="footer">' + (back ? '<button type="button" class="button secondary back" id="back">Back</button>' : "") +
      '<button type="button" class="button" id="next">' + label + "</button></div>";
  }
  function showError(message) {
    var old = root.querySelector(".error");
    if (old) old.remove();
    var error = document.createElement("p");
    error.className = "error";
    error.setAttribute("role", "alert");
    error.textContent = message;
    var footerNode = root.querySelector(".footer");
    root.insertBefore(error, footerNode || null);
  }
  function question(step, title, sub, body, next, back) {
    return '<span class="eyebrow">Plan build <b class="step-count">0' + (step + 1) +
      " / 06</b></span><h1>" + title + "</h1><p class=\"sub\">" + sub + "</p>" +
      body + footer(next || "Continue", back);
  }

  function render() {
    persist();
    progress.style.width = ((Math.min(state.step, 6) + 1) / 7 * 100) + "%";
    var p = state.prefs;
    var html = "";
    if (state.step === 0) {
      html = question(0, "What are you training for?", "Your plan starts with the demands you actually need to meet.",
        '<div class="answers">' + sports.map(function (item) {
          return tile(item[0], item[1], item[2], p.sport === item[0]);
        }).join("") + "</div>" +
        (p.sport === "basketball" ?
          '<div class="field"><label for="position">Court role</label><select id="position"><option value="not-sure">Not sure</option><option value="guard">Guard</option><option value="wing">Wing / forward</option><option value="center">Center</option></select></div>' : "") +
        ((p.sport === "running" || p.sport === "cross-country") ?
          '<div class="field"><label for="run-distance">Target distance</label><select id="run-distance"><option value="not-sure">Not sure</option><option value="5K">5K</option><option value="10K">10K</option><option value="half-marathon">Half marathon</option></select></div>' +
          '<div class="field"><label for="run-volume">Recent weekly running minutes</label><input id="run-volume" type="number" min="0" max="600" placeholder="Enter 0 if you are starting" value="' + esc(p.weeklyRunVolume == null ? "" : p.weeklyRunVolume) + '"></div>' +
          '<div class="field"><label for="longest-run">Longest comfortable run (minutes)</label><input id="longest-run" type="number" min="0" max="180" placeholder="Enter 0 if not sure" value="' + esc(p.longestRun == null ? "" : p.longestRun) + '"></div>' +
          '<div class="field"><label for="race-detail">Race date or current pace <span>(optional)</span></label><input id="race-detail" maxlength="80" placeholder="Example: Oct 12 or 10:00 / mile" value="' + esc(p.raceDetail) + '"></div>' : "") +
        (p.sport && ["general", "strength", "mobility", "hiit"].indexOf(p.sport) === -1 ?
          '<div class="field"><label for="season">Season status</label><select id="season"><option value="not-sure">Not sure</option><option value="off-season">Off-season</option><option value="pre-season">Pre-season</option><option value="in-season">In-season</option></select></div>' : ""));
    } else if (state.step === 1) {
      var goals = goalMap[p.sport] || goalMap.general;
      html = question(1, "Choose up to three outcomes.", "Your first choice gets the most emphasis in the opening block.",
        '<div class="answers">' + goals.map(function (item) {
          return tile(item[0], item[1], "Add this to your focus", p.goals.indexOf(item[0]) > -1);
        }).join("") + "</div>", "Continue", true);
    } else if (state.step === 2) {
      html = question(2, "Where are you starting?", "Honest inputs keep the first block appropriately challenging.",
        '<div class="answers">' + [
          ["new", "New to structured training", "Build technique and consistency"],
          ["regular", "Training regularly", "Progress with steady loading"],
          ["advanced", "Experienced athlete", "Specific, demanding work"],
          ["not-sure", "Not sure", "Start conservatively and learn from feedback"]
        ].map(function (item) { return tile(item[0], item[1], item[2], p.experience === item[0]); }).join("") + "</div>" +
        '<div class="field"><label for="consistency">Recent training consistency</label><select id="consistency"><option value="not-sure">Not sure</option><option value="low">Less than once most weeks</option><option value="steady">1–3 sessions most weeks</option><option value="high">4+ sessions most weeks</option></select><p class="hint">“Not sure” starts with lower volume and lets your feedback guide progression.</p></div>' +
        (p.sport === "strength" ?
          '<div class="field"><label for="familiarity">Basic lift familiarity</label><select id="familiarity"><option value="not-sure">Not sure</option><option value="basic">Learning squat, hinge, and press patterns</option><option value="confident">Confident with the main lifts</option></select></div>' +
          '<div class="field"><label for="working-weights">Current working weights <span>(optional)</span></label><input id="working-weights" maxlength="100" placeholder="Example: goblet squat 35 lb" value="' + esc(p.workingWeights) + '"></div>' : "") +
        (p.sport === "general" ?
          '<div class="field"><label for="activity">Preferred activity</label><select id="activity"><option value="not-sure">Not sure</option><option value="walking">Walking</option><option value="cycling">Cycling</option><option value="mobility">Mobility / yoga</option></select></div>' : ""), "Continue", true);
    } else if (state.step === 3) {
      var conflict = p.equipment.indexOf("pool") > -1 && p.sport !== "swimming";
      html = question(3, "What can you train with?", "Select every option you can use. Portable tools stay useful alongside a court, field or pool.",
        '<div class="answers">' + equipment.map(function (item) {
          return tile(item[0], item[1], item[2], p.equipment.indexOf(item[0]) > -1);
        }).join("") + "</div>" + (conflict ? '<div class="notice">Pool work is saved as optional conditioning; your main plan follows your selected sport.</div>' : ""));
    } else if (state.step === 4) {
      html = question(4, "How much training fits?", "We will protect recovery around your practices and games.",
        '<div class="answers">' + [["2", "2 days / week", "Minimal, focused exposure"], ["3", "3 days / week", "Balanced progress"], ["4", "4 days / week", "Higher capacity"]].map(function (item) {
          return tile(item[0], item[1], item[2], String(p.days) === item[0]);
        }).join("") + '</div><div class="field"><label for="duration">Minutes per session</label><input id="duration" type="number" min="20" max="120" value="' + esc(p.duration || 45) + '">' +
        '</div><div class="field"><label for="load">Practice or game load</label><input id="load" maxlength="120" placeholder="Example: practice Tue/Thu, game Saturday" value="' + esc(p.load) + '"></div>', "Continue", true);
    } else if (state.step === 5) {
      html = question(5, "What should we work around?", "Age and limitations help us choose sensible volume. This is training context, not a diagnosis.",
        '<div class="field"><label for="age">Age range</label><select id="age"><option value="">Choose one</option><option value="under18">Under 18</option><option value="adult">18–54</option><option value="55plus">55+</option></select></div>' +
        '<div class="field"><label for="limitations">Limitations <span>(optional)</span></label><textarea id="limitations" maxlength="180" placeholder="Example: avoid impact this week"></textarea></div>', "Review my plan", true);
    } else {
      html = preview();
    }
    root.innerHTML = html;
    var age = document.getElementById("age");
    if (age) age.value = p.age || "";
    var limitations = document.getElementById("limitations");
    if (limitations) limitations.value = p.limitations || "";
    ["position", "run-distance", "season", "consistency", "familiarity", "activity"].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var key = {
        "run-distance":"runDistance"
      }[id] || id;
      input.value = p[key] || "not-sure";
    });
    bind();
  }

  function buildPlan() {
    if (!window.ALEFITTrainingEngine) {
      throw new Error("The ALEFIT training engine did not load. Refresh before saving a plan.");
    }
    return window.ALEFITTrainingEngine.generate(state.prefs, state.context || {});
  }

  function preview() {
    state.plan = buildPlan();
    persist();
    var p = state.prefs;
    var labels = [
      ["Focus", p.sport, 0], ["Goals", p.goals.join(", "), 1], ["Experience", p.experience, 2],
      ["Equipment", p.equipment.join(", "), 3], ["Schedule", p.days + " days, " + p.duration + " min", 4],
      ["Considerations", p.age + (p.limitations ? " · " + p.limitations : ""), 5]
    ];
    return '<section class="preview"><span class="eyebrow">Plan review <b class="step-count">PREVIEW</b></span><h1>This is your opening block.</h1>' +
      '<p class="sub">Review every answer before creating your account. Edit any group without restarting.</p><div class="plan-banner"><span class="eyebrow">Recommended path</span><h2>' +
       esc(state.plan.name) + "</h2><p>" + esc(state.plan.summary) + '</p></div><div class="answer-summary">' +
      labels.map(function (x) { return '<div class="summary-row"><div><span class="eyebrow">' + x[0] + '</span><b>' + esc(x[1] || "Not set") + '</b></div><button type="button" class="text-btn edit-answer" data-step="' + x[2] + '">Edit</button></div>'; }).join("") +
      '</div><div class="plan-grid"><article class="plan-card"><span class="eyebrow">First session</span><h3>Start controlled</h3>' +
       state.plan.first.map(function (x) { return '<div class="exercise"><b>' + esc(x.name || x[0]) + "</b><small>" + esc(x.sets ? x.sets + " × " + x.reps + " · " + x.rest + " · " + x.effort : x[1]) + "</small></div>"; }).join("") +
      '</article><article class="plan-card"><span class="eyebrow">Seven-day rhythm</span><div class="schedule">' +
       state.plan.schedule.map(function (x) { return '<div class="session"><b>' + x.day + "</b><span>" + esc(x.title || x.workout) + "</span></div>"; }).join("") +
       '</div><p class="review-edit"><b>4-week progression:</b> ' + esc(state.plan.progression) + '</p><p class="review-edit"><b>Recovery:</b> ' + esc(state.plan.recovery) + '</p></article></div><article class="plan-card"><span class="eyebrow">Why this plan</span>' + state.plan.explanations.slice(0,3).map(function(x){return "<p class=\"review-edit\">"+esc(x)+"</p>";}).join("") + '</article>' + footer(token() ? "Save this plan" : "Create account & save plan", true) + "</section>";
  }

  function bind() {
    root.querySelectorAll(".tile").forEach(function (button) {
      button.onclick = function () {
        var value = button.dataset.value;
        if (state.step === 0) {
          if (state.prefs.sport !== value) {
            state.prefs.goals = [];
            ["position", "season", "runDistance", "weeklyRunVolume", "longestRun", "raceDetail",
              "familiarity", "workingWeights", "activity"].forEach(function (key) {
              delete state.prefs[key];
            });
          }
          state.prefs.sport = value;
        }
        if (state.step === 1) {
          var index = state.prefs.goals.indexOf(value);
          if (index > -1) state.prefs.goals.splice(index, 1);
          else if (state.prefs.goals.length < 3) state.prefs.goals.push(value);
        }
        if (state.step === 2) state.prefs.experience = value;
        if (state.step === 3) {
          var equipmentIndex = state.prefs.equipment.indexOf(value);
          if (equipmentIndex > -1) state.prefs.equipment.splice(equipmentIndex, 1);
          else state.prefs.equipment.push(value);
        }
        if (state.step === 4) state.prefs.days = value;
        persist();
        render();
      };
    });
    var next = document.getElementById("next");
    if (next) next.onclick = nextStep;
    var back = document.getElementById("back");
    if (back) back.onclick = function () {
      captureCurrentInputs();
      state.step -= 1;
      render();
    };
    root.querySelectorAll(".edit-answer").forEach(function (button) {
      button.onclick = function () { state.step = Number(button.dataset.step); render(); };
    });
  }
  function captureCurrentInputs() {
    var p = state.prefs;
    if (state.step === 0) {
      ["position", "season", "run-distance", "run-volume", "longest-run", "race-detail"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var key = {
          "run-distance":"runDistance",
          "run-volume":"weeklyRunVolume",
          "longest-run":"longestRun",
          "race-detail":"raceDetail"
        }[id] || id;
        p[key] = el.type === "number" ? Number(el.value || 0) : el.value.trim();
      });
    }
    if (state.step === 2) {
      ["consistency", "familiarity", "working-weights", "activity"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        p[id === "working-weights" ? "workingWeights" : id] = el.value.trim();
      });
    }
    if (state.step === 4 && document.getElementById("duration")) {
      p.duration = Number(document.getElementById("duration").value);
      p.load = document.getElementById("load").value.trim();
    }
    if (state.step === 5 && document.getElementById("age")) {
      p.age = document.getElementById("age").value;
      p.limitations = document.getElementById("limitations").value.trim();
    }
    persist();
  }
  function nextStep() {
    var p = state.prefs;
    captureCurrentInputs();
    if (state.step === 0) {
      if (!p.sport) return showError("Choose a training focus to continue.");
    }
    if (state.step === 1 && !p.goals.length) return showError("Choose at least one outcome.");
    if (state.step === 2 && !p.experience) return showError("Choose your training experience.");
    if (state.step === 3 && !p.equipment.length) return showError("Choose at least one equipment option.");
    if (state.step === 4) {
      if (p.duration < 20 || p.duration > 120) return showError("Enter a session duration from 20 to 120 minutes.");
    }
    if (state.step === 5) {
      if (!p.age) return showError("Choose an age range so we can set sensible volume.");
    }
    if (state.step === 6) return token() ? checkExisting() : showAccount();
    state.step += 1;
    render();
  }
  function showAccount() {
    root.innerHTML = '<section class="account"><span class="eyebrow">Account</span><h1>Save my plan and start today.</h1><p class="sub">Your reviewed plan is ready. Create an account to keep it.</p><form id="form"><div class="field"><label for="name">Full name</label><input id="name" minlength="2" maxlength="80" autocomplete="name" required></div><div class="field"><label for="email">Email</label><input id="email" type="email" maxlength="254" autocomplete="email" required></div><div class="field"><label for="password">Password</label><input id="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required><p class="hint">Use at least 8 characters.</p></div><button class="button" id="create">Create account & save plan</button></form><div class="plan-actions"><button type="button" class="text-btn" id="account-back">Back to plan</button><p class="review-edit">Already have an account? <a class="sign-in" href="/Login.html?from_url=%2FRegister.html">Sign in</a></p></div></section>';
    document.getElementById("form").onsubmit = register;
    document.getElementById("account-back").onclick = render;
  }
  async function register(event) {
    event.preventDefault();
    var button = document.getElementById("create");
    if (button.disabled) return;
    if (!document.getElementById("form").reportValidity()) return;
    button.disabled = true;
    button.textContent = "Creating account…";
    try {
      var response = await fetch("/api/apps/" + APP + "/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: document.getElementById("name").value.trim(), email: document.getElementById("email").value.trim(), password: document.getElementById("password").value })
      });
      var data = await response.json();
      if (!response.ok || !data.access_token) throw new Error(data.error || data.message || "Account could not be created.");
      localStorage.setItem("base44_access_token", data.access_token);
      localStorage.setItem("token", data.access_token);
      if (data.user) localStorage.setItem("alefit_user", JSON.stringify(data.user));
      if (window.trackEvent) window.trackEvent("account_created", { source: "onboarding" });
      savePlan();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Create account & save plan";
      showError(error.message || "Account could not be created. Your plan is still here.");
    }
  }
  async function checkExisting() {
    var response;
    try {
      response = await fetch("/api/apps/" + APP + "/entities/OnboardingPlan?limit=1", { headers: { Authorization: "Bearer " + token() } });
      if (response.status === 401) return returnToSignIn();
      if (!response.ok) throw new Error("Could not verify your existing plan.");
      var data = await response.json();
      var records = Array.isArray(data) ? data : (data.data || data.items || []);
      if (records.length) {
        state.existingId = records[0].id;
        persist();
        if (!window.confirm("Replace your existing ALEFIT plan with this reviewed plan?")) return;
      }
      savePlan();
    } catch (error) {
      showError(error.message + " Nothing was changed. Try again when your connection is stable.");
    }
  }
  async function savePlan() {
    var button = document.getElementById("next") || document.getElementById("create");
    if (!button || button.dataset.saving === "true") return;
    button.dataset.saving = "true";
    button.disabled = true;
    button.textContent = "Saving plan…";
    var url = "/api/apps/" + APP + "/onboarding-plan";
    try {
      var response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify({
          onboarding_id: state.onboardingId,
          replace_id: state.existingId,
          preferences: state.prefs,
          generated_plan: state.plan
        })
      });
      if (response.status === 401) return returnToSignIn();
      if (!response.ok) throw new Error("Plan save failed.");
      sessionStorage.removeItem(DRAFT);
      if (window.trackEvent) window.trackEvent("plan_created", {
        days: Number(state.prefs.days || 0)
      });
      window.location.replace("/today.html");
    } catch (error) {
      button.dataset.saving = "false";
      button.disabled = false;
      button.textContent = "Retry save";
      button.onclick = function (event) { event.preventDefault(); savePlan(); };
      showError("Your account is ready, but the plan was not saved. Retry without creating the account again.");
    }
  }
  async function loadContextThenRender() {
    if (!token() || state.context) return render();
    try {
      var headers={Authorization:"Bearer "+token()};
      var results=await Promise.all([
        fetch("/api/apps/"+APP+"/entities/WorkoutLog?limit=20",{headers:headers}),
        fetch("/api/apps/"+APP+"/entities/ReadinessCheck?limit=10",{headers:headers}),
        fetch("/api/apps/"+APP+"/entities/RecoveryScore?limit=10",{headers:headers})
      ]);
      if(results.some(function(result){return result.status===401;}))return returnToSignIn();
      var json=await Promise.all(results.map(function(r){return r.ok?r.json():[];}));
      function records(value){return Array.isArray(value)?value:(value.data||value.items||[]);}
      state.context={workoutLogs:records(json[0]),readiness:records(json[1]).concat(records(json[2]))};
    } catch(e) { state.context={workoutLogs:[],readiness:[]}; }
    render();
  }
  var originalRender=render;
  render=function(){ if(state.step===6&&!state.context&&token()){loadContextThenRender();return;} originalRender(); };
  render();
}());