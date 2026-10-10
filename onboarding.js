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
    prefs: saved.prefs || { goals: [], equipment: [], availableDays: [] },
    plan: saved.plan || null,
    existingId: saved.existingId || null,
    sportAnswers: saved.sportAnswers || {},
    onboardingId: saved.onboardingId || (window.crypto && window.crypto.randomUUID ?
      window.crypto.randomUUID() : "onboarding-" + Date.now() + "-" + Math.random().toString(36).slice(2))
  };
  var googleSignupReturn = new URLSearchParams(window.location.search).get("google_signup") === "1";
  var accountNotice = "";
  state.showSports = false;
  state.prefs.goals = Array.isArray(state.prefs.goals) ? state.prefs.goals : [];
  state.prefs.equipment = Array.isArray(state.prefs.equipment) ? state.prefs.equipment :
    (state.prefs.equipment ? [state.prefs.equipment] : []);
  state.prefs.availableDays = Array.isArray(state.prefs.availableDays) ? state.prefs.availableDays : [];
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
    ["volleyball", "Volleyball", "Jumping, landing and court movement"],
    ["tennis", "Tennis", "First-step speed and lateral control"],
    ["rugby", "Rugby", "Acceleration, power and contact strength"],
    ["lacrosse", "Lacrosse", "Change of direction and repeat effort"],
    ["hockey", "Hockey", "Quick shifts, speed and durability"],
    ["golf", "Golf", "Mobility, rotation and control"],
    ["cycling", "Cycling", "Build riding endurance and leg strength"],
    ["rowing", "Rowing", "Pulling strength and aerobic capacity"],
    ["combat-sports", "Combat sports", "Power, movement and round endurance"],
    ["strength", "Strength", "Choose your strength-training style"],
    ["hiit", "HIIT", "Work capacity and control"],
    ["crossfit", "CrossFit / functional fitness", "Skill, strength and varied conditioning"],
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
    volleyball: [["jump", "Jump higher"], ["quickness", "Court movement"], ["durability", "Shoulder resilience"]],
    tennis: [["speed", "First-step speed"], ["agility", "Court movement"], ["durability", "Shoulder resilience"]],
    rugby: [["speed", "Acceleration"], ["power", "Explosive power"], ["strength", "Contact strength"]],
    lacrosse: [["speed", "First-step speed"], ["agility", "Change direction"], ["conditioning", "Match endurance"]],
    hockey: [["speed", "First-step speed"], ["conditioning", "Shift endurance"], ["durability", "Lower-body durability"]],
    golf: [["mobility", "Hip and trunk mobility"], ["power", "Swing power"], ["strength", "Build strength"]],
    cycling: [["conditioning", "Ride endurance"], ["durability", "Leg durability"], ["power", "Climbing power"]],
    rowing: [["conditioning", "Rowing endurance"], ["strength", "Pulling strength"], ["durability", "Back and hip durability"]],
    "combat-sports": [["power", "Explosive strength"], ["conditioning", "Round endurance"], ["mobility", "Mobility and control"]],
    strength: [["strength", "Build strength"], ["muscle", "Build muscle"], ["conditioning", "Work capacity"]],
    hiit: [["conditioning", "Work capacity"], ["fitness", "General fitness"], ["movement", "Move better"]],
    crossfit: [["conditioning", "Competition conditioning"], ["strength", "Build strength"], ["power", "Improve power"]],
    mobility: [["mobility", "More range"], ["durability", "Move comfortably"], ["movement", "Better control"]],
    general: [["strength", "Get stronger"], ["fitness", "Build fitness"], ["movement", "Move better"]]
  };
  var sportDetailFields = {
    basketball: { key:"position", label:"Court role", options:[
      ["not-sure", "Not sure"], ["guard", "Guard"], ["wing", "Wing"], ["center", "Center"]
    ]},
    football: { label:"Position group", options:[
      ["quarterback", "Quarterback"], ["running-back", "Running back"], ["wide-receiver", "Wide receiver"],
      ["tight-end", "Tight end"], ["offensive-line", "Offensive line"], ["defensive-line", "Defensive line"],
      ["linebacker", "Linebacker"], ["defensive-back", "Defensive back"]
    ]},
    soccer: { label:"Playing position", options:[
      ["goalkeeper", "Goalkeeper"], ["defender", "Defender"], ["midfielder", "Midfielder"], ["forward", "Forward"]
    ]},
    baseball: { label:"Field role", options:[
      ["pitcher", "Pitcher"], ["catcher", "Catcher"], ["infield", "Infield"], ["outfield", "Outfield"]
    ]},
    swimming: { label:"Main stroke or event", options:[
      ["freestyle-sprint", "Freestyle sprint"], ["freestyle-distance", "Freestyle distance"],
      ["backstroke", "Backstroke"], ["breaststroke", "Breaststroke"], ["butterfly", "Butterfly"],
      ["individual-medley", "Individual medley"]
    ]},
    track: { label:"Event group", options:[
      ["sprint-hurdles", "Sprints and hurdles"], ["middle-distance", "Middle distance"],
      ["distance", "Distance"], ["jumps", "Jumps"], ["throws", "Throws"]
    ]},
    running: { label:"Usual running surface", options:[
      ["road", "Road"], ["track", "Track"], ["trail", "Trail"], ["treadmill", "Treadmill"], ["mixed", "Mixed"]
    ]},
    "cross-country": { label:"Usual course terrain", options:[
      ["rolling-trails", "Rolling trails"], ["hilly-trails", "Hilly trails"],
      ["grass-fields", "Grass and fields"], ["mixed-course", "Mixed terrain"]
    ]},
    volleyball: { label:"Court role", options:[
      ["setter", "Setter"], ["outside", "Outside hitter"], ["opposite", "Opposite"],
      ["middle", "Middle blocker"], ["libero", "Libero / defensive specialist"]
    ]},
    tennis: { label:"Playing format", options:[
      ["singles", "Singles"], ["doubles", "Doubles"], ["all-court", "A mix of both"]
    ]},
    rugby: { label:"Position group", options:[
      ["forward", "Forward"], ["back", "Back"]
    ]},
    lacrosse: { label:"Playing position", options:[
      ["attack", "Attack"], ["midfield", "Midfield"], ["defense", "Defense"], ["goalie", "Goalie"]
    ]},
    hockey: { label:"Playing position", options:[
      ["forward", "Forward"], ["defense", "Defense"], ["goalie", "Goalie"]
    ]},
    golf: { label:"Main training priority", options:[
      ["swing-power", "Swing power"], ["mobility", "Hip and trunk mobility"],
      ["walking-endurance", "Walking endurance"]
    ]},
    cycling: { label:"Cycling discipline", options:[
      ["road", "Road"], ["gravel", "Gravel"], ["mountain-bike", "Mountain biking"],
      ["track-sprint", "Track or sprint"]
    ]},
    rowing: { label:"Rowing discipline", options:[
      ["sweep", "Sweep rowing"], ["sculling", "Sculling"], ["indoor-erg", "Indoor erg"],
      ["distance", "Distance racing"]
    ]},
    "combat-sports": { label:"Primary discipline", options:[
      ["boxing", "Boxing"], ["kickboxing", "Kickboxing"], ["grappling", "Wrestling or grappling"],
      ["mixed-martial-arts", "Mixed martial arts"]
    ]},
    strength: { label:"Strength training style", options:[
      ["powerlifting", "Powerlifting"],
      ["olympic-lifting-base", "Olympic lifting strength base"],
      ["bodybuilding", "Bodybuilding / hypertrophy"],
      ["powerbuilding", "Powerbuilding"],
      ["calisthenics", "Calisthenics / bodyweight"],
      ["strongman", "Strongman / loaded carries"],
      ["dumbbell-strength", "Dumbbell training"],
      ["barbell-strength", "Barbell strength"],
      ["resistance-band-strength", "Resistance-band strength"],
      ["kettlebell-strength", "Kettlebell training"],
      ["functional-strength", "Functional strength"],
      ["athletic-strength", "Athletic strength & power"],
      ["muscular-endurance", "Muscular endurance"],
      ["isometric-strength", "Isometric strength"],
      ["strength-circuits", "Strength circuits"],
      ["general-strength", "General strength"]
    ]},
    hiit: { label:"Session style", options:[
      ["cardio-intervals", "Cardio intervals"], ["strength-circuits", "Strength circuits"],
      ["mixed-conditioning", "Mixed conditioning"], ["low-impact", "Low-impact intervals"]
    ]},
    crossfit: { label:"Training emphasis", options:[
      ["competition", "Competition preparation"], ["strength-skill", "Strength and technique"],
      ["conditioning", "Conditioning capacity"], ["general", "Balanced training"]
    ]},
    mobility: { label:"Focus area", options:[
      ["hips-ankles", "Hips and ankles"], ["shoulders-thoracic", "Shoulders and upper back"],
      ["full-body-control", "Full-body movement control"]
    ]},
    general: { key:"activity", label:"Preferred activity", options:[
      ["not-sure", "Not sure"], ["walking", "Walking"], ["cycling", "Cycling"],
      ["swimming", "Swimming"], ["gym", "Gym training"]
    ]}
  };
  var sportFocusFields = {
    basketball: { label:"What should training support most?", options:[
      ["snap-down", "Jump and landing control"], ["lateral-step", "Court movement"],
      ["acceleration", "First-step speed"], ["calf-raise", "Lower-leg durability"]
    ]},
    football: { label:"What should training support most?", options:[
      ["acceleration", "Acceleration"], ["broad-jump", "Explosive power"],
      ["goblet-squat", "Lower-body strength"], ["dumbbell-row", "Upper-back strength"]
    ]},
    soccer: { label:"What should training support most?", options:[
      ["acceleration", "Repeat-sprint speed"], ["lateral-step", "Change of direction"],
      ["split-squat", "Single-leg strength"], ["calf-raise", "Lower-leg durability"]
    ]},
    baseball: { label:"What should training support most?", options:[
      ["band-rotation", "Rotational power"], ["band-row", "Shoulder-supporting pulls"],
      ["acceleration", "First-step speed"], ["step-up", "Single-leg strength"]
    ]},
    swimming: { label:"What should training support most?", options:[
      ["dumbbell-row", "Pulling strength"], ["prone-swimmer", "Shoulder control"],
      ["swim-technique", "Pool technique"], ["mobility-flow", "Mobility"]
    ]},
    track: { label:"What should training support most?", options:[
      ["acceleration", "Acceleration"], ["broad-jump", "Elastic power"],
      ["calf-raise", "Lower-leg durability"], ["split-squat", "Single-leg strength"]
    ]},
    running: { label:"What should training support most?", options:[
      ["calf-raise", "Lower-leg durability"], ["split-squat", "Leg strength"],
      ["dead-bug", "Trunk control"], ["mobility-flow", "Mobility"]
    ]},
    "cross-country": { label:"What should training support most?", options:[
      ["calf-raise", "Lower-leg durability"], ["split-squat", "Leg strength"],
      ["dead-bug", "Trunk control"], ["mobility-flow", "Mobility"]
    ]},
    volleyball: { label:"What should training support most?", options:[
      ["broad-jump", "Jump power"], ["snap-down", "Landing control"],
      ["lateral-step", "Court movement"], ["band-row", "Shoulder balance"]
    ]},
    tennis: { label:"What should training support most?", options:[
      ["acceleration", "First-step speed"], ["lateral-step", "Lateral movement"],
      ["band-rotation", "Rotational control"], ["calf-raise", "Lower-leg durability"]
    ]},
    rugby: { label:"What should training support most?", options:[
      ["acceleration", "Acceleration"], ["broad-jump", "Power"],
      ["goblet-squat", "Lower-body strength"], ["dumbbell-row", "Upper-back strength"]
    ]},
    lacrosse: { label:"What should training support most?", options:[
      ["acceleration", "First-step speed"], ["lateral-step", "Change of direction"],
      ["split-squat", "Single-leg strength"], ["calf-raise", "Lower-leg durability"]
    ]},
    hockey: { label:"What should training support most?", options:[
      ["acceleration", "First-step speed"], ["lateral-step", "Lateral control"],
      ["split-squat", "Leg strength"], ["mobility-flow", "Mobility"]
    ]},
    golf: { label:"What should training support most?", options:[
      ["band-rotation", "Rotational control"], ["mobility-flow", "Hip and trunk mobility"],
      ["split-squat", "Balance and leg strength"], ["brisk-walk", "Walking capacity"]
    ]},
    cycling: { label:"What should training support most?", options:[
      ["split-squat", "Climbing strength"], ["rdl", "Hip-hinge strength"],
      ["calf-raise", "Lower-leg durability"], ["mobility-flow", "Mobility"]
    ]},
    rowing: { label:"What should training support most?", options:[
      ["dumbbell-row", "Pulling strength"], ["band-row", "Upper-back endurance"],
      ["rdl", "Hip-hinge strength"], ["mobility-flow", "Mobility"]
    ]},
    "combat-sports": { label:"What should training support most?", options:[
      ["lateral-step", "Footwork"], ["band-rotation", "Rotational control"],
      ["split-squat", "Leg strength"], ["brisk-walk", "Round endurance"]
    ]},
    strength: { label:"What should training support most?", options:[
      ["back-squat", "Squat strength"], ["bench-press", "Pressing strength"],
      ["rdl", "Hinge strength"], ["dumbbell-row", "Pulling strength"]
    ]},
    hiit: { label:"What should training support most?", options:[
      ["acceleration", "Short power efforts"], ["goblet-squat", "Strength circuits"],
      ["brisk-walk", "Aerobic capacity"], ["mobility-flow", "Low-impact movement"]
    ]},
    mobility: { label:"What should training support most?", options:[
      ["mobility-flow", "Full-body range"], ["prone-swimmer", "Shoulder control"],
      ["dead-bug", "Trunk control"], ["split-squat", "Balance and control"]
    ]},
    general: { label:"What should training support most?", options:[
      ["brisk-walk", "Walking capacity"], ["easy-cycle", "Cycling"],
      ["mobility-flow", "Mobility"], ["goblet-squat", "Strength"]
    ]}
  };
  var sportExperienceOptions = [
    ["new-to-sport", "New to this sport"], ["less-than-year", "Less than a year"],
    ["1-3-years", "1–3 years"], ["4-plus-years", "4+ years"]
  ];
  var sportIntensityOptions = [
    ["easy", "Mostly easy"], ["moderate", "Mixed effort"], ["hard", "Mostly hard"]
  ];
  var equipment = [
    ["gym", "Full gym", "Barbell, machines and open space"],
    ["dumbbells", "Dumbbells", "One or two adjustable weights"],
    ["kettlebell", "Kettlebell", "One or more kettlebells"],
    ["bands", "Resistance bands", "Anchored or loop bands"],
    ["bodyweight", "Bodyweight", "No external load"],
    ["field", "Court / field", "Outdoor or sport space"],
    ["pool", "Pool", "Access to a swimming pool"],
    ["bike", "Bike", "Road or stationary bicycle"],
    ["rower", "Rowing machine", "Indoor rower or erg"]
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
    try {
      return localStorage.getItem("base44_access_token") || localStorage.getItem("token");
    } catch (error) {
      return null;
    }
  }
  function returnToSignIn() {
    persist();
    try {
      localStorage.removeItem("base44_access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("alefit_user");
    } catch (error) {}
    window.location.replace("/Login.html?from_url=%2FRegister.html");
  }
  function setAccountProgress() {
    if (progress) progress.style.width = "0%";
    var progressWrap = document.querySelector(".progress-wrap");
    if (progressWrap) {
      progressWrap.setAttribute("aria-label", "ALEFIT account setup");
      progressWrap.setAttribute("aria-valuenow", "0");
      progressWrap.setAttribute("aria-valuetext", "Account setup");
    }
    var progressLabel = document.getElementById("progress-label");
    if (progressLabel) progressLabel.textContent = "Account setup";
    var progressDetail = document.getElementById("progress-detail");
    if (progressDetail) progressDetail.textContent = "Your personalized onboarding comes next";
  }
  function updateSignedInLinks() {
    if (!token()) return;
    [document.querySelector(".topbar .sign-in"), document.querySelector(".up-sign-in")]
      .forEach(function (link) {
        if (!link) return;
        link.href = "/today.html?view=plan";
        link.textContent = "My plan";
      });
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
    if (footerNode && footerNode.parentNode) {
      footerNode.parentNode.insertBefore(error, footerNode);
    } else {
      root.appendChild(error);
    }
  }
  function question(step, title, sub, body, next, back) {
    return '<span class="eyebrow">Plan build <b class="step-count">0' + (step + 1) +
      " / 06</b></span><h1 tabindex=\"-1\">" + title + "</h1><p class=\"sub\">" + sub + "</p>" +
      body + footer(next || "Continue", back);
  }

  function listLabel(list, value, fallback) {
    var match = (list || []).filter(function (item) { return item[0] === value; })[0];
    return match ? match[1] : (fallback || value || "Not set");
  }

  function sportFields(p) {
    var snapshot = { goals: Array.isArray(p.goals) ? p.goals.slice() : [] };
    ["position", "season", "runDistance", "weeklyRunVolume", "longestRun",
      "raceDetail", "familiarity", "workingWeights", "activity", "sportDetail",
      "sportFocus", "sportExperience", "sportSessionsPerWeek", "sportSessionMinutes",
      "sportIntensity"].forEach(function (key) {
      if (p[key] !== undefined) snapshot[key] = p[key];
    });
    return snapshot;
  }

  function selectSport(value) {
    var p = state.prefs;
    if (p.sport && p.sport !== value) {
      captureCurrentInputs();
      state.sportAnswers[p.sport] = sportFields(p);
      ["goals", "position", "season", "runDistance", "weeklyRunVolume",
        "longestRun", "raceDetail", "familiarity", "workingWeights", "activity", "sportDetail",
        "sportFocus", "sportExperience", "sportSessionsPerWeek", "sportSessionMinutes",
        "sportIntensity"].forEach(function (key) {
        delete p[key];
      });
      var remembered = state.sportAnswers[value];
      p.goals = remembered && Array.isArray(remembered.goals) ? remembered.goals.slice() : [];
      if (remembered) {
        ["position", "season", "runDistance", "weeklyRunVolume", "longestRun",
          "raceDetail", "familiarity", "workingWeights", "activity", "sportDetail",
          "sportFocus", "sportExperience", "sportSessionsPerWeek", "sportSessionMinutes",
          "sportIntensity"].forEach(function (key) {
          if (remembered[key] !== undefined) p[key] = remembered[key];
        });
      }
    }
    p.sport = value;
    state.showSports = false;
  }

  function sportStepBody(p) {
    var selected = sports.filter(function (item) { return item[0] === p.sport; })[0];
    var pickerVisible = !p.sport || state.showSports;
    var html = "";
    if (selected) {
      html += '<div class="selected-sport"><div><span class="eyebrow">Selected sport</span><strong>' +
        esc(selected[1]) + '</strong><small>' + esc(selected[2]) + '</small></div>' +
        '<button type="button" class="button secondary change-sport" id="change-sport" aria-expanded="' +
        (pickerVisible ? "true" : "false") + '" aria-controls="sport-list">' +
        (pickerVisible ? "Keep this sport" : "Change sport") + "</button></div>";
    } else {
      html += '<p class="picker-instruction">Choose one sport or training focus. Search the available options below.</p>';
    }
    html += '<div class="sport-picker' + (pickerVisible ? "" : " is-collapsed") +
      '" id="sport-list" aria-label="Available sports"' + (pickerVisible ? "" : " hidden") +
      '><div class="field sport-search-field"><label for="sport-search">Search sports or training focus</label>' +
      '<input id="sport-search" type="search" autocomplete="off" placeholder="e.g. soccer, tennis, swimming" ' +
      'aria-controls="sport-options"></div>' +
      '<p class="sport-search-empty" id="sport-search-empty" role="status" hidden>No matches. Try another search.</p>' +
      '<div class="answers" id="sport-options">' +
      sports.map(function (item) {
        return tile(item[0], item[1], item[2], p.sport === item[0]);
      }).join("") + "</div></div>";

    if (selected) {
      var fields = "";
      var detailField = sportDetailFields[p.sport];
      if (detailField) {
        var detailId = detailField.key === "position" ? "position" :
          detailField.key === "activity" ? "activity" : "sport-detail";
        fields += '<div class="field"><label for="' + detailId + '">' + esc(detailField.label) +
          ' <span>(optional)</span></label><select id="' + detailId +
          '"><option value="">Choose if known</option>' +
          detailField.options.map(function (option) {
            return '<option value="' + esc(option[0]) + '">' + esc(option[1]) + "</option>";
          }).join("") + "</select></div>" +
          (p.sport === "strength" ?
            '<p class="sport-load-note">Your style guides movement and effort. Goals, equipment, experience, and available time still shape each session.</p>' : "");
      }
      if (p.sport === "running" || p.sport === "cross-country") {
        fields += '<div class="field"><label for="run-distance">Target distance</label><select id="run-distance">' +
          '<option value="not-sure">Not sure</option><option value="5K">5K</option><option value="10K">10K</option>' +
          '<option value="half-marathon">Half Marathon</option><option value="marathon">Marathon</option></select></div>' +
          '<div class="field"><label for="run-volume">Recent weekly running minutes</label><input id="run-volume" type="number" min="0" max="600" placeholder="Enter 0 if you are starting" value="' +
          esc(p.weeklyRunVolume || 0) + '"></div>' +
          '<div class="field"><label for="longest-run">Longest comfortable run (minutes)</label><input id="longest-run" type="number" min="0" max="180" placeholder="Enter 0 if not sure" value="' +
          esc(p.longestRun || 0) + '"></div>' +
          '<div class="field"><label for="race-detail">Race date or current pace <span>(optional)</span></label><input id="race-detail" maxlength="80" placeholder="Example: Oct 12 or 10:00 / mile" value="' +
          esc(p.raceDetail || "") + '"></div>';
      }
      if (p.sport && ["general", "strength", "mobility", "hiit"].indexOf(p.sport) === -1) {
        fields += '<div class="field"><label for="season">Season status</label><select id="season">' +
          '<option value="not-sure">Not sure</option><option value="off-season">Off-season</option>' +
          '<option value="preseason">Preseason</option><option value="in-season">In-season</option></select></div>';
      }
      var supportField = sportFocusFields[p.sport];
      if (supportField) {
        fields += '<h3>Training profile</h3><div class="sport-intake-grid">' +
          '<div class="field"><label for="sport-focus">' + esc(supportField.label) +
          ' <span>(optional)</span></label><select id="sport-focus"><option value="">Choose if known</option>' +
          supportField.options.map(function (option) {
            return '<option value="' + esc(option[0]) + '">' + esc(option[1]) + "</option>";
          }).join("") + '</select></div>' +
          '<div class="field"><label for="sport-experience">Experience in this sport <span>(optional)</span></label>' +
          '<select id="sport-experience"><option value="">Choose if known</option>' +
          sportExperienceOptions.map(function (option) {
            return '<option value="' + esc(option[0]) + '">' + esc(option[1]) + "</option>";
          }).join("") + "</select></div></div>" +
          '<h3>Current weekly sport load</h3>' +
          '<p class="sport-load-note">Count practices, games, rides, pool sessions, or other work in this focus. Add exact weekdays in the weekly schedule later.</p>' +
          '<div class="sport-intake-grid">' +
          '<div class="field"><label for="sport-sessions">Sport sessions per week <span>(optional)</span></label>' +
          '<input id="sport-sessions" type="number" min="0" max="14" step="1" inputmode="numeric" placeholder="e.g. 3" value="' +
          esc(p.sportSessionsPerWeek == null ? "" : p.sportSessionsPerWeek) + '"></div>' +
          '<div class="field"><label for="sport-session-minutes">Average minutes per session <span>(optional)</span></label>' +
          '<input id="sport-session-minutes" type="number" min="0" max="240" step="5" inputmode="numeric" placeholder="e.g. 60" value="' +
          esc(p.sportSessionMinutes == null ? "" : p.sportSessionMinutes) + '"></div>' +
          '<div class="field"><label for="sport-intensity">Typical session effort <span>(optional)</span></label>' +
          '<select id="sport-intensity"><option value="">Choose if known</option>' +
          sportIntensityOptions.map(function (option) {
            return '<option value="' + esc(option[0]) + '">' + esc(option[1]) + "</option>";
          }).join("") + "</select></div></div>";
      }
      var detailKeys = ["position", "season", "runDistance", "weeklyRunVolume",
        "longestRun", "raceDetail", "familiarity", "workingWeights", "activity",
        "sportDetail", "sportFocus", "sportExperience", "sportSessionsPerWeek",
        "sportSessionMinutes", "sportIntensity"];
      var hasSavedDetails = detailKeys.some(function (key) {
        return p[key] !== undefined && p[key] !== null && p[key] !== "" && p[key] !== "not-sure";
      });
      html += '<div class="sport-followups" id="sport-followups" aria-live="polite">' +
        '<details class="sport-detail-accordion"' + (hasSavedDetails ? " open" : "") + '><summary>' +
        '<span><b>Optional ' + esc(selected[1]) + ' details</b><small>Share anything you know to fine-tune the first block.</small></span>' +
        '<span class="sport-detail-mark" aria-hidden="true">+</span></summary><div class="sport-detail-content">' +
        '<h2>Details for ' + esc(selected[1]) + '</h2>' +
        (fields || '<p>No extra details for this focus. Continue to choose your outcomes.</p>') +
        '</div></details></div>';
    }
    return html;
  }

  function focusHeading() {
    var heading = root.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    var scrollTarget = root.querySelector(".up-title") || document.querySelector(".progress-wrap");
    if (scrollTarget) scrollTarget.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function render() {
    persist();
    var shell = document.querySelector(".shell");
    if (shell) shell.classList.toggle("program-review-mode", state.step === 6);
    var progressPercent = Math.round((Math.min(state.step, 6) + 1) / 7 * 100);
    progress.style.width = progressPercent + "%";
    var progressWrap = document.querySelector(".progress-wrap");
    if (progressWrap) {
      progressWrap.setAttribute("aria-label", "Personalized onboarding progress");
      progressWrap.setAttribute("aria-valuenow", String(progressPercent));
      progressWrap.setAttribute("aria-valuetext", state.step === 6 ?
        "Plan review" : "Step " + (state.step + 1) + " of 6");
    }
    var progressLabel = document.getElementById("progress-label");
    if (progressLabel) progressLabel.textContent = state.step === 6 ?
      "Plan review · 7 of 7" : "Step " + (state.step + 1) + " of 6";
    var progressDetail = document.getElementById("progress-detail");
    if (progressDetail) progressDetail.textContent = state.step === 6 ?
      "Your plan preview · save when ready" : "Your plan is built around your answers";
    var p = state.prefs;
    var html = "";
    if (state.step === 0) {
      html = question(0, "What are you training for?", "Your plan starts with the demands you actually need to meet.",
        sportStepBody(p));
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
        '<div class="field"><label for="consistency">Recent training consistency</label><select id="consistency"><option value="not-sure">Not sure</option><option value="low">Less than once most weeks</option><option value="medium">2–3 times per week</option><option value="high">4+ times per week</option></select></div>' +
        (p.sport === "strength" ?
          '<div class="field"><label for="familiarity">Basic lift familiarity</label><select id="familiarity"><option value="not-sure">Not sure</option><option value="basic">Learning squat, hinge, push, pull</option><option value="confident">Comfortable with barbell basics</option><option value="advanced">Experienced with complex variations</option></select></div>' +
          '<div class="field"><label for="working-weights">Current working weights <span>(optional)</span></label><input id="working-weights" maxlength="100" placeholder="Example: goblet squat 35lb, deadlift 185lb" value="' + esc(p.workingWeights || "") + '"></div>' : ""));
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
        }).join("") + '</div><div class="field"><label for="duration">Minutes per session</label><input id="duration" type="number" min="20" max="120" value="' + esc(p.duration || 45) + '"></div>' +
        '<div class="field"><label for="load">Practice or game load</label><input id="load" maxlength="120" placeholder="Example: practice Tue/Thu, game Saturday" value="' + esc(p.load || "") + '"></div>' +
        '<fieldset class="field"><legend>Which days are usually available? <span>(optional)</span></legend><div class="available-days">' +
        ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function (day, index) {
          return '<label><input type="checkbox" data-available-day value="' + index + '"' +
            (p.availableDays.indexOf(index) > -1 ? " checked" : "") + '> ' + day + '</label>';
        }).join("") + '</div></fieldset>' +
        ((p.sport === "running" || p.sport === "cross-country") ?
          '<div class="field"><label for="preferred-long-day">Preferred long-run day <span>(optional)</span></label><select id="preferred-long-day"><option value="">No preference</option>' +
          ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(function (day, index) {
            return '<option value="' + index + '"' + (String(p.preferredLongRunDay) === String(index) ? " selected" : "") + '>' + day + '</option>';
          }).join("") + '</select></div>' : ""));
    } else if (state.step === 5) {
      html = question(5, "What should we work around?", "Age and limitations help us choose sensible volume. This is training context, not a diagnosis.",
        '<div class="field"><label for="age">Age range</label><select id="age"><option value="">Choose one</option><option value="under18">Under 18</option><option value="adult">18–54</option><option value="over55">55+</option></select></div>' +
        '<div class="field"><label for="limitations">Limitations <span>(optional)</span></label><textarea id="limitations" maxlength="180" placeholder="Example: avoid impact this week">' + esc(p.limitations || "") + '</textarea></div>');
    } else {
      html = preview();
    }
    root.innerHTML = (accountNotice ?
      '<p class="account-success" role="status">' + esc(accountNotice) + "</p>" : "") + html;
    accountNotice = "";
    updateSignedInLinks();
    var age = document.getElementById("age");
    if (age) age.value = p.age || "";
    var limitations = document.getElementById("limitations");
    if (limitations) limitations.value = p.limitations || "";
    ["position", "sport-detail", "activity", "run-distance", "season", "consistency",
      "familiarity", "sport-focus", "sport-experience", "sport-intensity"].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var key = {
        "sport-detail":"sportDetail",
        "run-distance":"runDistance",
        "sport-focus":"sportFocus",
        "sport-experience":"sportExperience",
        "sport-intensity":"sportIntensity"
      }[id] || id;
      input.value = p[key] || (
        ["sport-detail", "sport-focus", "sport-experience", "sport-intensity"].indexOf(id) > -1 ?
          "" : "not-sure"
      );
    });
    bind();
  }

  function buildPlan() {
    if (!window.ALEFITTrainingEngine) {
      throw new Error("The ALEFIT training engine did not load. Refresh before saving a plan.");
    }
    return window.ALEFITTrainingEngine.generate(state.prefs, state.context || {});
  }

  function focusLabel(value) {
    return {
      power: "power and speed",
      strength: "strength",
      muscle: "muscle building",
      endurance: "conditioning",
      movement: "mobility and movement",
      sport: "sport-specific support"
    }[value] || "balanced training";
  }

  function formatList(values) {
    if (!values.length) return "";
    if (values.length === 1) return values[0];
    if (values.length === 2) return values[0] + " and " + values[1];
    return values.slice(0, -1).join(", ") + ", and " + values[values.length - 1];
  }

  function effortLabel(value) {
    var effort = String(value || "");
    if (/^RPE 5.?6$/i.test(effort)) return "Easy-to-moderate effort";
    if (/^RPE 6.?7$/i.test(effort)) return "Moderate effort";
    if (/^RPE 7.?8$/i.test(effort)) return "Hard but controlled";
    if (/^RPE 7$/i.test(effort)) return "Hard, controlled effort";
    if (/^RPE 6$/i.test(effort)) return "Moderate effort";
    if (/^fast/i.test(effort)) return "Fast, controlled reps";
    if (/conversational/i.test(effort)) return "Easy conversational pace";
    return effort ? effort.charAt(0).toUpperCase() + effort.slice(1) : "";
  }

  function personalizationReasons(plan, p) {
    var reasons = [];
    var trace = plan.decisionTrace || {};
    var firstExercise = (plan.first || [])[0];
    var firstGoal = (p.goals || [])[0];
    if (firstGoal) {
      var goal = listLabel(goalMap[p.sport] || goalMap.general, firstGoal, firstGoal);
      reasons.push({
        label: "Main goal",
        text: goal + " leads the block, setting a " + focusLabel(plan.focus) +
          " emphasis. The first session starts with " +
          (firstExercise ? firstExercise.name : "the primary movement") + "."
      });
    }
    if (trace.sport && trace.sport.demand) {
      reasons.push({
        label: "Sport demands",
        text: "Movement selection and phase emphasis target " + trace.sport.demand +
          ", while the primary movement stays measurable across the block."
      });
    }

    var detailField = sportDetailFields[p.sport];
    var selectedDetail = p.sport === "basketball" ? p.position : p.sportDetail;
    if (detailField && p.sport !== "general" && selectedDetail &&
        selectedDetail !== "not-sure" && trace.positionOrEvent) {
      var detailLabel = listLabel(detailField.options, selectedDetail, selectedDetail);
      var detailPrimary = (plan.first || [])[0];
      reasons.push({
        label: detailField.label,
        text: trace.positionOrEvent.decision +
          (trace.positionOrEvent.changedPrimary && detailPrimary ?
            " Your " + detailLabel + " profile starts with " + detailPrimary.name +
              " as the stable primary movement." : "")
      });
    }
    if (p.sport === "general" && p.activity && p.activity !== "not-sure" &&
        trace.preferredActivity) {
      reasons.push({ label:"Preferred activity", text:trace.preferredActivity.decision });
    }
    var supportField = sportFocusFields[p.sport];
    if (supportField && p.sportFocus && trace.sportFocus) {
      var openingExercises = plan.weeks && plan.weeks[0] && plan.weeks[0].sessions[0] ?
        plan.weeks[0].sessions[0].exercises : (plan.first || []);
      var focusMovement = openingExercises.filter(function (item) {
        return item.id === p.sportFocus;
      })[0];
      var placement = focusMovement ?
        (openingExercises[0] && openingExercises[0].id === focusMovement.id ?
          " It leads the opening session as the primary movement." :
          " The opening session includes " + focusMovement.name + " as targeted support.") :
        " Equipment, impact, and session-time limits may substitute or omit it in an individual session.";
      reasons.push({
        label:"Training support focus",
        text:listLabel(supportField.options, p.sportFocus, p.sportFocus) + ". " +
          trace.sportFocus.decision + placement
      });
    }
    if (p.sportExperience && trace.sportExperience) {
      reasons.push({
        label:"Experience in this sport",
        text:trace.sportExperience.decision
      });
    }
    var hasStructuredSportLoad = p.sportSessionsPerWeek !== "" &&
        p.sportSessionsPerWeek != null ||
      p.sportSessionMinutes !== "" && p.sportSessionMinutes != null ||
      !!p.sportIntensity;
    if (hasStructuredSportLoad && trace.sportLoad) {
      reasons.push({ label:"Current sport load", text:trace.sportLoad.decision });
    }

    var exerciseDatabase = window.ALEFITTrainingEngine.exerciseDatabase || [];
    var usedEquipment = {};
    (plan.first || []).forEach(function (item) {
      var source = exerciseDatabase.filter(function (entry) { return entry.id === item.id; })[0];
      if (!source) return;
      var matchingEquipment = (source.requiredEquipment || []).filter(function (required) {
        return required !== "bodyweight" && p.equipment.indexOf(required) > -1;
      })[0];
      if (matchingEquipment) {
        usedEquipment[matchingEquipment] = usedEquipment[matchingEquipment] || [];
        usedEquipment[matchingEquipment].push(item.name);
      }
    });
    var equipmentReasons = Object.keys(usedEquipment).map(function (key) {
      return listLabel(equipment, key, key) + " access supports " +
        formatList(usedEquipment[key].slice(0, 2));
    });
    if (equipmentReasons.length) {
      reasons.push({ label: "Equipment", text: equipmentReasons.join("; ") + "." });
    }

    var schedule = plan.schedule || [];
    var sportDays = schedule.filter(function (item) { return item.type === "sport"; });
    var trainingDays = schedule.filter(function (item) { return item.type === "training"; });
    var firstWeekSessions = plan.weeks && plan.weeks[0] ? plan.weeks[0].sessions : [];
    if (sportDays.length) {
      var eventText = sportDays.map(function (item) {
        return item.day + (item.title ? " (" + item.title + ")" : "");
      });
      var trainingText = trainingDays.map(function (item) { return item.day; });
      reasons.push({
        label: "Weekly rhythm",
        text: "Your sport commitments fall on " + formatList(eventText) +
          "; ALEFIT sessions are scheduled on " + formatList(trainingText) + "."
      });
    }

    var requestedDays = Number(p.days || 3);
    var actualDays = firstWeekSessions.length;
    if (p.season === "in-season" && trace.season && trace.season.decision) {
      reasons.push({
        label: "In season",
        text: trace.season.decision + (requestedDays > actualDays ?
          " Your requested " + requestedDays + " days were reduced to " + actualDays + "." : "")
      });
    }

    var openingSession = firstWeekSessions[0];
    if (openingSession) {
      var movementCount = openingSession.exercises.length;
      var estimated = Number(openingSession.estimatedMinutes || 0);
      reasons.push({
        label: "Session length",
        text: Number(p.duration || 45) + " minutes allows up to " +
          (Number(p.duration || 45) <= 25 ? 2 : Number(p.duration || 45) <= 35 ? 3 :
            Number(p.duration || 45) <= 55 ? 4 : 5) +
          " movements. The first session uses " + movementCount +
          (estimated ? " and is estimated at " + estimated + " minutes." : ".")
      });
    }

    if (trace.consistency && /Added one set/.test(trace.consistency.decision || "")) {
      reasons.push({
        label: "Consistency",
        text: "Where session time allows, high consistency adds one set to the primary movement in weeks 1–3; week 4 remains a deload."
      });
    } else if (trace.consistency &&
        /held back the high-consistency volume increase/i.test(trace.consistency.decision || "")) {
      reasons.push({
        label: "Recovery",
        text: "Recovery or limitation signals took priority, so the extra set was held back."
      });
    }

    if (p.experience === "new" || p.experience === "not-sure" ||
        p.consistency === "low" || p.consistency === "not-sure") {
      reasons.push({
        label: "Starting point",
        text: "An unfamiliar or inconsistent training base starts with fewer sets and more conservative exercise choices."
      });
    }
    if (p.age === "under18" || p.age === "over55" || p.age === "55plus") {
      reasons.push({
        label: "Age range",
        text: (p.age === "under18" ? "Under 18" : "Age 55+") +
          " sets a more conservative impact limit for exercise selection."
      });
    }
    if (p.limitations) {
      reasons.push({
        label: "Limitations",
        text: "Your note is treated as a low-impact constraint, not as a diagnosis or treatment recommendation."
      });
    }
    return reasons;
  }

  function preview() {
    state.plan = buildPlan();
    persist();
    var p = state.prefs;
    var experienceLabels = [
      ["new", "New to structured training"], ["regular", "Training regularly"],
      ["advanced", "Experienced athlete"], ["not-sure", "Not sure"]
    ];
    var consistencyLabels = [
      ["low", "Less than once most weeks"], ["medium", "2–3 times per week"],
      ["high", "4+ times per week"], ["not-sure", "Not sure"]
    ];
    var ageLabels = [
      ["under18", "Under 18"], ["adult", "18–54"], ["over55", "55+"]
    ];
    var goalLabels = (p.goals || []).map(function (value) {
      return listLabel(goalMap[p.sport] || goalMap.general, value, value);
    });
    var equipmentLabels = (p.equipment || []).map(function (value) {
      return listLabel(equipment, value, value);
    });
    var labels = [
      ["Sport", listLabel(sports, p.sport, p.sport), 0],
      ["Goals", goalLabels.join(", "), 1],
      ["Starting point", listLabel(experienceLabels, p.experience, "Not set") + " · " +
        listLabel(consistencyLabels, p.consistency, "Consistency not set"), 2],
      ["Equipment", equipmentLabels.join(", "), 3],
      ["Weekly plan", Number(p.days || 3) + " days · " + Number(p.duration || 45) + " min per session", 4],
      ["Age & limitations", listLabel(ageLabels, p.age, "Not set") +
        (p.limitations ? " · Note added" : " · No limitations noted"), 5]
    ];
    var detailField = sportDetailFields[p.sport];
    var detailValue = p.sport === "basketball" ? p.position :
      p.sport === "general" ? p.activity : p.sportDetail;
    if (detailField && detailValue && detailValue !== "not-sure") {
      labels.splice(1, 0, [
        detailField.label,
        listLabel(detailField.options, detailValue, detailValue),
        0
      ]);
    }
    var supportField = sportFocusFields[p.sport];
    if (supportField && p.sportFocus) {
      labels.splice(1, 0, [
        "Training support focus",
        listLabel(supportField.options, p.sportFocus, p.sportFocus),
        0
      ]);
    }
    if (p.sportExperience) {
      labels.splice(1, 0, [
        "Experience in this sport",
        listLabel(sportExperienceOptions, p.sportExperience, p.sportExperience),
        0
      ]);
    }
    var sportLoadSummary = [];
    if (p.sportSessionsPerWeek !== "" && p.sportSessionsPerWeek != null) {
      sportLoadSummary.push(p.sportSessionsPerWeek + " sessions per week");
    }
    if (p.sportSessionMinutes !== "" && p.sportSessionMinutes != null) {
      sportLoadSummary.push(p.sportSessionMinutes + " min per session");
    }
    if (p.sportIntensity) {
      sportLoadSummary.push(listLabel(sportIntensityOptions, p.sportIntensity, p.sportIntensity));
    }
    if (sportLoadSummary.length) {
      labels.splice(1, 0, ["Current sport load", sportLoadSummary.join(" · "), 0]);
    }
    var reasons = personalizationReasons(state.plan, p);
    var weeks = state.plan.weeks || [];
    var firstWeek = weeks[0];
    var firstSession = firstWeek && (firstWeek.sessions || [])[0];
    var exercises = firstSession ? firstSession.exercises || [] : state.plan.first || [];
    var schedule = state.plan.schedule || [];
    var focus = focusLabel(state.plan.focus);
    var sportName = listLabel(sports, p.sport, p.sport || "your training");
    var goalLed = ["general", "strength", "hiit", "mobility"].indexOf(p.sport) !== -1;
    var introTitle = goalLed ? "Built around<br/>your goals." : "Built around<br/>your sport.";
    var asideTitle = goalLed ? "Built around your routine" : "Built for " + sportName;
    var asideCopy = reasons.length ? reasons[0].text : state.plan.summary;
    var firstSessionMinutes = firstSession && (firstSession.estimatedMinutes || firstSession.minutes);
    var movementCount = String(exercises.length).padStart(2, "0");

    var reasonMarkup = reasons.map(function (item, index) {
      return '<article class="up-reason"><div class="up-reason-top"><span class="up-reason-index">0' +
        (index + 1) + '</span><span class="up-reason-label">' + esc(item.label) +
        '</span></div><p>' + esc(item.text) + '</p></article>';
    }).join("");

    var answerMarkup = labels.map(function (item) {
      return '<div class="up-answer"><div class="up-answer-main"><span class="up-answer-label">' +
        esc(item[0]) + '</span><b class="up-answer-value">' + esc(item[1] || "Not set") +
        '</b></div><button type="button" class="up-edit edit-answer" data-step="' +
        esc(item[2]) + '" aria-label="Edit ' + esc(item[0]) + ' answers">Edit</button></div>';
    }).join("");

    var exerciseMarkup = exercises.map(function (item, index) {
      var prescription = [];
      if (item.sets) prescription.push(item.sets + " sets");
      if (item.reps) prescription.push(item.reps);
      if (item.rest) prescription.push(item.rest + " rest");
      var effort = effortLabel(item.effort);
      if (effort) prescription.push(effort);
      return '<div class="up-exercise"><span class="up-exercise-index">' +
        String(index + 1).padStart(2, "0") + '</span><div><b class="up-exercise-name">' +
        esc(item.name || item[0]) + '</b><small class="up-prescription">' +
        esc(prescription.join(" · ")) + '</small></div></div>';
    }).join("");

    var scheduleMarkup = schedule.map(function (item) {
      var category = item.type === "training" ? "training" :
        item.type === "sport" ? "sport" : "recovery";
      var typeLabel = category === "training" ? "ALEFIT" :
        category === "sport" ? "SPORT" : "RECOVERY";
      var title = item.title || item.workout || (category === "recovery" ? "Rest" : "Training");
      return '<div class="up-session up-session-' + category + '"><span class="up-day">' +
        esc(item.day) + '</span><span class="up-session-type">' + typeLabel +
        '</span><b class="up-session-title">' + esc(title) + '</b></div>';
    }).join("");

    var weekMarkup = weeks.slice(0, 4).map(function (week) {
      return '<article class="up-week"><span class="up-week-dot" aria-hidden="true"></span>' +
        '<span class="up-week-label">Week ' + esc(week.week) + '</span><b>' +
        esc(week.phaseLabel || week.label || "Training") + '</b><p>' +
        esc(week.emphasis || week.progression || "") + '</p></article>';
    }).join("");

    return '<div class="updated-plan"><div class="up-frame">' +
      '<header class="up-topbar"><a class="up-brand" href="/landing.html" aria-label="ALEFIT home">' +
      '<img src="/images/alefit-logo.png" alt="ALEFIT"></a><div class="up-top-meta">' +
      '<span class="up-review-state">Plan ready</span><a class="up-sign-in" href="/Login.html?from_url=%2FRegister.html">Sign in</a>' +
      '</div></header><div class="up-progress" role="progressbar" aria-label="Plan builder progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span></span></div>' +
      '<div class="up-progress-caption"><strong>Plan review</strong><span>Review your answers before saving</span></div>' +
      '<div class="up-content"><section class="up-intro" aria-labelledby="preview-title"><div>' +
      '<div class="up-kicker">Your plan <span>/</span> Coach’s read</div>' +
      '<h1 class="up-title" id="preview-title" tabindex="-1">' + introTitle + '</h1>' +
      '<p class="up-intro-copy">Your opening block is ready. See what shaped it, check the week at a glance, and adjust any answer before you save.</p>' +
      '</div><aside class="up-intro-aside"><strong>' + esc(asideTitle) + '</strong><p>' +
      esc(asideCopy) + '</p></aside></section>' +
      '<section class="up-plan-banner" aria-label="Your four-week plan"><div><span class="up-label">Your 4-week start</span>' +
      '<h2 class="up-plan-name">' + esc(state.plan.name) + '</h2><p class="up-plan-summary">' +
      esc(state.plan.summary) + '</p></div><div class="up-plan-facts"><span class="up-plan-fact"><b>' +
      esc(focus) + '</b> focus</span><span class="up-plan-fact"><b>' + movementCount +
      '</b> movements in session one</span></div></section>' +
      '<section class="up-section up-fit" aria-labelledby="fit-title"><div class="up-fit-intro"><div>' +
      '<span class="up-label">How your answers shape this plan</span><h2 class="up-section-heading" id="fit-title">Why this<br/>plan fits</h2>' +
      '<p>This block responds to your sport, the work you already do, and the week you need to keep.</p></div>' +
      '<div class="up-fit-mark"><i aria-hidden="true"></i> Individual, not off the shelf</div></div>' +
      '<div class="up-reasons">' + reasonMarkup + '</div></section>' +
      '<section class="up-section" aria-labelledby="answer-review-title"><div class="up-section-head"><div>' +
      '<span class="up-label">Your inputs</span><h2 class="up-section-heading" id="answer-review-title">Check your answers</h2></div>' +
      '<span class="up-section-aside">Change anything before you save</span></div>' +
      '<div class="up-answers">' + answerMarkup + '</div></section>' +
      '<section class="up-plan-grid" aria-label="Your first week"><article class="up-detail-card"><div class="up-card-heading"><div>' +
      '<span class="up-label">First session · Week 1</span><h3>' +
      esc(firstSession ? firstSession.name : "Opening session") + '</h3></div>' +
      (firstSessionMinutes ? '<span class="up-time">' + esc(firstSessionMinutes) + ' min estimate</span>' : '') +
      '</div><div>' + (exerciseMarkup || '<p class="up-empty">No movements are available in the first session yet.</p>') +
      '</div></article><article class="up-detail-card"><div class="up-card-heading"><div>' +
      '<span class="up-label">Seven-day rhythm</span><h3>Training around your week</h3></div></div>' +
      '<div class="up-session-list">' + (scheduleMarkup || '<p class="up-empty">Your weekly rhythm will appear here.</p>') +
      '</div></article></section>' +
      '<section class="up-progression" aria-labelledby="progression-title"><div class="up-section-head"><div>' +
      '<span class="up-label">What happens next</span><h2 class="up-section-heading" id="progression-title">Four-week progression</h2></div>' +
      '<span class="up-section-aside">A clear build, then room to reset</span></div><div class="up-week-track">' +
      weekMarkup + '</div><div class="up-recovery"><span class="up-recovery-label">Recovery guidance</span><p>' +
      esc(state.plan.recovery || "Rest and lower-intensity days are included in the weekly rhythm.") +
      '</p></div></section><footer class="up-footer"><button class="up-button up-button-secondary" id="back" type="button">Back</button>' +
      '<span class="up-footer-note">You can still change your answers.</span>' +
      '<button class="up-button up-button-primary" id="next" type="button">Create account &amp; save</button></footer></div></div></div>';
  }

  function bind() {
    var sportSearch = document.getElementById("sport-search");
    if (sportSearch) sportSearch.oninput = function () {
      var query = sportSearch.value.trim().toLowerCase();
      var options = root.querySelectorAll("#sport-options .tile");
      var visibleCount = 0;
      options.forEach(function (option) {
        var matches = option.textContent.toLowerCase().indexOf(query) !== -1;
        option.hidden = !matches;
        if (matches) visibleCount += 1;
      });
      var emptyState = document.getElementById("sport-search-empty");
      if (emptyState) emptyState.hidden = visibleCount > 0;
    };
    root.querySelectorAll(".tile").forEach(function (button) {
      button.onclick = function () {
        var value = button.dataset.value;
        var clickedStep = state.step;
        if (state.step === 0) {
          selectSport(value);
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
        if (clickedStep === 0) {
          window.requestAnimationFrame(function () {
            var followups = document.getElementById("sport-followups");
            if (followups) followups.scrollIntoView({ block: "start", behavior: "smooth" });
          });
        } else {
          var selectedTile = Array.prototype.slice.call(root.querySelectorAll(".tile"))
            .find(function (item) { return item.dataset.value === value; });
          if (selectedTile) selectedTile.focus({ preventScroll: true });
        }
      };
    });
    var changeSport = document.getElementById("change-sport");
    if (changeSport) changeSport.onclick = function () {
      captureCurrentInputs();
      state.showSports = !state.showSports;
      render();
      window.requestAnimationFrame(function () {
        var target = state.showSports ? document.getElementById("sport-list") :
          document.getElementById("sport-followups");
        if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    };
    var next = document.getElementById("next");
    if (next) next.onclick = nextStep;
    var back = document.getElementById("back");
    if (back) back.onclick = function () {
      captureCurrentInputs();
      state.step -= 1;
      render();
      focusHeading();
    };
    root.querySelectorAll(".edit-answer").forEach(function (button) {
      button.onclick = function () {
        state.step = Number(button.dataset.step);
        render();
        focusHeading();
      };
    });
  }
  function captureCurrentInputs() {
    var p = state.prefs;
    if (state.step === 0) {
      ["position", "sport-detail", "activity", "season", "run-distance",
        "run-volume", "longest-run", "race-detail", "sport-focus", "sport-experience",
        "sport-sessions", "sport-session-minutes", "sport-intensity"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var key = {
          "sport-detail":"sportDetail",
          "run-distance":"runDistance",
          "run-volume":"weeklyRunVolume",
          "longest-run":"longestRun",
          "race-detail":"raceDetail",
          "sport-focus":"sportFocus",
          "sport-experience":"sportExperience",
          "sport-sessions":"sportSessionsPerWeek",
          "sport-session-minutes":"sportSessionMinutes",
          "sport-intensity":"sportIntensity"
        }[id] || id;
        p[key] = el.type === "number" ?
          (el.value.trim() === "" ? "" : Number(el.value)) : el.value.trim();
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
      p.availableDays = Array.prototype.slice.call(document.querySelectorAll("[data-available-day]:checked"))
        .map(function (input) { return Number(input.value); });
      var longDay = document.getElementById("preferred-long-day");
      p.preferredLongRunDay = longDay && longDay.value !== "" ? Number(longDay.value) : "";
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
    focusHeading();
  }
  function accountPlanSummary() {
    var plan = state.plan || {};
    if (!plan.name && !plan.summary) return "";
    return '<div class="account-plan-summary"><span class="eyebrow">Your plan is ready</span><strong>' +
      esc(plan.name || "Your training plan") + '</strong><p>' +
      esc(plan.summary || "Save your reviewed plan to your ALEFIT account.") + "</p></div>";
  }
  function showAccount() {
    persist();
    setAccountProgress();
    var shell = document.querySelector(".shell");
    if (shell) shell.classList.remove("program-review-mode");
    root.innerHTML = '<section class="account">' + accountPlanSummary() +
      '<span class="eyebrow">Save your plan</span><h1>Create your ALEFIT account.</h1><p class="sub">Your personalized plan preview is ready. Create an account to save it and open your dashboard.</p>' +
      '<p class="account-next-step" role="status">Your answers and plan preview are saved in this tab while you create your account.</p>' +
      '<p class="account-loading" id="account-status" role="status" aria-live="polite"></p>' +
      '<button type="button" class="button account-google" id="google-signup">' +
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12.3 12.3 0 0 1 0-7.2v-5.2H5.8a20.1 20.1 0 0 0 0 17.6l6.8-5.2Z"/><path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.4 4 24 4A20.4 20.4 0 0 0 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z"/></svg>' +
      '<span>Continue with Google</span></button><div class="account-oauth-divider" aria-hidden="true">or create an account with email</div>' +
      '<form id="form" novalidate>' +
      '<div class="field"><label for="name">Full name</label><input id="name" type="text" autocomplete="name" required minlength="2" maxlength="80" placeholder="Your name"></div>' +
      '<div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" required maxlength="254" placeholder="your@email.com"></div>' +
      '<div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" placeholder="Minimum 8 characters"></div>' +
      '</form>' +
      '<div class="footer"><button type="button" class="button" id="create">Create account & continue</button></div>' +
      '<p class="account-login-link">Already have an account? <a href="/Login.html?from_url=%2FRegister.html">Sign in</a></p>' +
      '</section>';
    var form = document.getElementById("form");
    var googleButton = document.getElementById("google-signup");
    var googleButtonMarkup = googleButton.innerHTML;
    form.onsubmit = register;
    form.addEventListener("input", function (event) {
      if (event.target && event.target.hasAttribute("aria-invalid")) {
        event.target.removeAttribute("aria-invalid");
      }
      var error = root.querySelector(".error");
      if (error) error.remove();
    });
    googleButton.onclick = async function () {
      persist();
      googleButton.disabled = true;
      googleButton.textContent = "Connecting to Google…";
      try {
        await window.AlefitOAuth.startGoogle("/Register.html?google_signup=1");
      } catch (error) {
        googleButton.disabled = false;
        googleButton.innerHTML = googleButtonMarkup;
        showError(error.message || "Google sign-in could not be started. Your onboarding progress is still saved in this tab.");
      }
    };
    document.getElementById("create").onclick = register;
  }
  function showAccountNextStep(title, message, returnMessage) {
    persist();
    setAccountProgress();
    root.innerHTML = '<section class="account">' + accountPlanSummary() +
      '<span class="eyebrow">Account created</span>' +
      '<h1>' + esc(title) + '</h1><p class="sub">' + esc(message) + '</p>' +
      '<p class="sub">' + esc(returnMessage) + '</p>' +
      '<div class="footer"><button type="button" class="button" id="confirmation-login">Continue to sign in</button></div></section>';
    document.getElementById("confirmation-login").onclick = function() {
      window.location.href = "/Login.html?from_url=" + encodeURIComponent("/Register.html");
    };
    focusHeading();
  }
  function validateRegistrationForm(form) {
    var name = form.querySelector("#name");
    var email = form.querySelector("#email");
    var password = form.querySelector("#password");
    var nameValue = name.value.trim();
    var emailValue = email.value.trim();
    var checks = [
      {input:name, invalid:nameValue.length < 2, message:"Please enter your full name."},
      {input:name, invalid:nameValue.length > 80, message:"Your name must be 80 characters or fewer."},
      {
        input:email,
        invalid:!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailValue),
        message:"Enter a valid email address, such as name@example.com."
      },
      {input:email, invalid:emailValue.length > 254, message:"Your email address must be 254 characters or fewer."},
      {input:password, invalid:password.value.length < 8, message:"Your password must be at least 8 characters."},
      {input:password, invalid:password.value.length > 128, message:"Your password must be 128 characters or fewer."}
    ];
    form.querySelectorAll("[aria-invalid='true']").forEach(function (input) {
      input.removeAttribute("aria-invalid");
    });
    for (var index = 0; index < checks.length; index += 1) {
      if (checks[index].invalid) {
        checks[index].input.setAttribute("aria-invalid", "true");
        return checks[index];
      }
    }
    return null;
  }
  async function register(event) {
    event.preventDefault();
    var button = document.getElementById("create");
    if (button.disabled) return;
    var form = document.getElementById("form");
    var validation = validateRegistrationForm(form);
    if (validation) {
      showError(validation.message);
      validation.input.focus();
      return;
    }
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Creating account…";
    var accountStatus = document.getElementById("account-status");
    if (accountStatus) accountStatus.textContent = "Creating your ALEFIT account…";
    try {
      var response;
      try {
        response = await fetch("/api/apps/" + APP + "/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: document.getElementById("name").value.trim(), email: document.getElementById("email").value.trim(), password: document.getElementById("password").value })
        });
      } catch (networkError) {
        throw new Error("We couldn't reach the signup service. Check your connection and try again.");
      }
      var data;
      try {
        data = await response.json();
      } catch (parseError) {
        data = {};
      }
      if (data.confirmation_required) {
        showAccountNextStep(
          "Check your email.",
          "Your account was created. Confirm your email before continuing.",
          "Your onboarding progress is saved in this tab. After confirming, return here and sign in so ALEFIT can resume your profile."
        );
        return;
      }
      if (data.account_created) {
        showAccountNextStep(
          "Your account is ready.",
          "Sign in to save your personalized plan.",
          "Your answers and plan preview are saved in this tab and will be saved to your account after sign-in."
        );
        return;
      }
      if (!response.ok) {
        var signupError = response.status === 409 ?
          "An account with this email already exists. Sign in or use a different email." :
          response.status === 429 ?
            "Too many signup attempts. Wait a moment, then try again." :
            response.status >= 500 ?
              "Signup is temporarily unavailable. Your progress is saved; please try again shortly." :
              (data.error || data.message || "Please check your details and try again.");
        throw new Error(signupError);
      }
      if (typeof data.access_token !== "string" || !data.access_token ||
          !data.user || typeof data.user.id !== "string" || !data.user.id.trim()) {
        throw new Error("The signup service did not return a complete session. Please try again or sign in.");
      }
      try {
        localStorage.setItem("base44_access_token", data.access_token);
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("alefit_user", JSON.stringify(data.user));
      } catch (storageError) {
        try {
          localStorage.removeItem("base44_access_token");
          localStorage.removeItem("token");
          localStorage.removeItem("alefit_user");
        } catch (cleanupError) {}
        showAccountNextStep(
          "Your account is ready.",
          "Your browser blocked ALEFIT from saving your sign-in. Allow site storage, then sign in to continue.",
          "Your onboarding progress is saved in this tab."
        );
        return;
      }
      if (window.trackEvent) window.trackEvent("account_created", { source: "onboarding" });
      accountNotice = "Your account is ready. Let's build your personalized training plan.";
      if (state.step === 6 && state.plan) {
        savePlan();
        return;
      }
      render();
      focusHeading();
    } catch (error) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Create account & continue";
      if (accountStatus) accountStatus.textContent = "";
      showError(error.message || "Account could not be created. Your onboarding answers are still here.");
    }
  }
  async function checkExisting() {
    var response;
    try {
      response = await fetch("/api/apps/" + APP + "/entities/OnboardingPlan?limit=1", { headers: { Authorization: "Bearer " + token() } });
      if (response.status === 401 || response.status === 403) return returnToSignIn();
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
    if (button && button.dataset.saving === "true") return;
    if (button) {
      button.dataset.saving = "true";
      button.disabled = true;
      button.textContent = "Saving plan…";
    }
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
      if (button) {
        button.dataset.saving = "false";
        button.disabled = false;
        button.textContent = "Retry save";
        button.onclick = function (event) { event.preventDefault(); savePlan(); };
      }
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
  render=function(){
    if(state.step===6&&!state.context&&token()){loadContextThenRender();return;}
    originalRender();
  };
  function showAccountCheckError() {
    setAccountProgress();
    root.innerHTML = '<section class="account"><span class="eyebrow">Account check</span>' +
      '<h1>We couldn’t check your training status.</h1>' +
      '<p class="sub">Your sign-in is saved. Retry when your connection is stable so ALEFIT can resume the right step.</p>' +
      '<div class="footer"><button type="button" class="button" id="retry-account-check">Try again</button></div></section>';
    document.getElementById("retry-account-check").onclick = routeSignedInUser;
    focusHeading();
  }
  async function routeSignedInUser() {
    root.innerHTML = '<section class="account account-checking" role="status">' +
      '<span class="eyebrow">Account ready</span><h1>Checking your training status…</h1>' +
      '<p class="sub">We’re opening your saved plan or continuing your personalized onboarding.</p>' +
      '<div class="auth-spinner" aria-hidden="true"></div></section>';
    try {
      var response = await fetch("/api/apps/" + APP + "/entities/OnboardingPlan?limit=1", {
        headers: { Authorization: "Bearer " + token() }
      });
      if (response.status === 401 || response.status === 403) return returnToSignIn();
      if (!response.ok) throw new Error("Could not check saved onboarding.");
      var data = await response.json();
      var records = Array.isArray(data) ? data : (data.data || data.items || []);
      if (records.length && !(state.step === 6 && state.plan)) {
        window.location.replace("/today.html");
        return;
      }
      if (googleSignupReturn) {
        accountNotice = "You're signed in. Let's build your personalized training plan.";
        googleSignupReturn = false;
        window.history.replaceState(null, "", "/Register.html");
      }
      if (state.step === 6 && state.plan && !records.length) {
        state.context = { workoutLogs: [], readiness: [] };
        render();
        savePlan();
        return;
      }
      render();
    } catch (error) {
      showAccountCheckError();
    }
  }
  if (token()) {
    routeSignedInUser();
  } else {
    render();
    if (googleSignupReturn) {
      showError("Google sign-in did not finish. Your onboarding progress is still saved in this browser.");
    }
  }
}());
