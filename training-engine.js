(function (root) {
  "use strict";

  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DAY_ALIASES = [
    ["monday", "mon"], ["tuesday", "tue"], ["wednesday", "wed"],
    ["thursday", "thu"], ["friday", "fri"], ["saturday", "sat"], ["sunday", "sun"]
  ];
  var SUPPORTED_SPORTS = [
    "basketball", "football", "soccer", "baseball", "swimming", "track",
    "running", "cross-country", "volleyball", "tennis", "rugby", "lacrosse",
    "hockey", "golf", "cycling", "rowing", "combat-sports", "strength",
    "hiit", "mobility", "general"
  ];
  var PROGRAM_PATHS = {
    basketball: "/programs/basketball.html",
    football: "/programs/football.html",
    soccer: "/programs/soccer.html",
    baseball: "/programs/baseball.html",
    swimming: "/programs/swimming.html",
    track: "/programs/track.html",
    running: "/programs/crosscountry.html",
    "cross-country": "/programs/crosscountry.html",
    strength: "/programs/strength.html",
    hiit: "/programs/hiit.html",
    mobility: "/programs/mobility.html",
    general: "/programs/strength.html",
    volleyball: "/my-plan.html",
    tennis: "/my-plan.html",
    rugby: "/my-plan.html",
    lacrosse: "/my-plan.html",
    hockey: "/my-plan.html",
    golf: "/my-plan.html",
    cycling: "/my-plan.html",
    rowing: "/my-plan.html",
    "combat-sports": "/my-plan.html"
  };
  var SPORT_LABELS = {
    "cross-country":"Cross country",
    "combat-sports":"Combat sports"
  };
  var SPORT_GUIDANCE = {
    basketball:{
      demand:"jumping, first-step acceleration, lateral control, and controlled landings",
      conditioning:"Use short court-like efforts; practices and games already count as hard conditioning."
    },
    football:{
      demand:"acceleration, total-body force, and short-area change of direction",
      conditioning:"Keep added acceleration work brief; practices and games provide most high-intensity conditioning."
    },
    soccer:{
      demand:"repeat-sprint ability, lateral change of direction, and single-leg capacity",
      conditioning:"Use controlled repeat efforts; practices and matches are the main conditioning load."
    },
    baseball:{
      demand:"rotational control, single-leg strength, and shoulder-supporting pulls",
      conditioning:"Keep added running brief; throwing, practice, and games are separate workload."
    },
    swimming:{
      demand:"pulling capacity, shoulder control, and relaxed aerobic work",
      conditioning:"Favor easy, technique-focused pool work over extra hard intervals."
    },
    track:{
      demand:"acceleration, elastic power, and event-neutral lower-body strength",
      conditioning:"Match conditioning to the selected goal; no track event was specified."
    },
    running:{
      demand:"gradual run-volume development, calf capacity, and comfortable pacing",
      conditioning:"Keep most running conversational and cap it by recent volume and longest comfortable run."
    },
    "cross-country":{
      demand:"aerobic durability, gradual run-volume development, and comfortable pacing",
      conditioning:"Keep most running conversational and cap it by recent volume and longest comfortable run."
    },
    volleyball:{
      demand:"repeat-jump quality, landing control, lateral movement, and shoulder balance",
      conditioning:"Use short, controlled court efforts; avoid adding fatigue to jump practice."
    },
    tennis:{
      demand:"first-step acceleration, lateral control, and rotational strength",
      conditioning:"Use brief court-style efforts; match play already adds repeated high-intensity work."
    },
    rugby:{
      demand:"acceleration, lower-body force, and controlled contact preparation",
      conditioning:"Keep added conditioning brief when practices and matches are already demanding."
    },
    lacrosse:{
      demand:"repeated acceleration, lateral changes, and repeat-effort capacity",
      conditioning:"Use controlled repeat efforts; practices and matches count toward the weekly load."
    },
    hockey:{
      demand:"short-burst acceleration, lateral control, and shift endurance",
      conditioning:"Keep extra conditioning brief; practices and games supply repeated hard efforts."
    },
    golf:{
      demand:"hip and trunk mobility, rotational control, and single-leg balance",
      conditioning:"Favor easy movement and mobility over conditioning that interferes with practice."
    },
    cycling:{
      demand:"leg strength, lower-body durability, and sustainable riding capacity",
      conditioning:"Keep added riding conversational and account for regular bike volume."
    },
    rowing:{
      demand:"hip-hinge strength, pulling capacity, and aerobic durability",
      conditioning:"Keep rowing conversational unless the selected goal calls for controlled quality work."
    },
    "combat-sports":{
      demand:"footwork, rotational control, and repeatable round endurance",
      conditioning:"Use brief controlled rounds; sparring and technical practice count toward hard workload."
    }
  };

  function exercise(config) {
    return config;
  }

  var EXERCISES = [
    exercise({id:"back-squat",name:"Back squat",movementPattern:"squat",requiredEquipment:["gym"],difficulty:"intermediate",prerequisites:["confident squat and bracing"],qualities:["strength","muscle"],impact:"low",fatigue:"high",alternatives:["goblet-squat","tempo-squat"],prescription:{sets:[2,5],reps:"3–8",rest:"2–4 min"}}),
    exercise({id:"goblet-squat",name:"Goblet squat",movementPattern:"squat",requiredEquipment:["dumbbells"],difficulty:"beginner",prerequisites:["comfortable squat"],qualities:["strength","muscle"],impact:"low",fatigue:"medium",alternatives:["tempo-squat"],prescription:{sets:[2,4],reps:"6–12",rest:"90–150 sec"}}),
    exercise({id:"tempo-squat",name:"Tempo bodyweight squat",movementPattern:"squat",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["movement","muscle"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,4],reps:"8–15",rest:"60–90 sec"}}),
    exercise({id:"split-squat",name:"Split squat",movementPattern:"single-leg",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:["supported balance"],qualities:["strength","durability"],impact:"low",fatigue:"medium",alternatives:["tempo-squat"],prescription:{sets:[2,4],reps:"6–12 / side",rest:"75–120 sec"}}),
    exercise({id:"step-up",name:"Step-up",movementPattern:"single-leg",requiredEquipment:["gym"],difficulty:"beginner",prerequisites:["stable step"],qualities:["strength","endurance"],impact:"low",fatigue:"medium",alternatives:["split-squat"],prescription:{sets:[2,4],reps:"8–12 / side",rest:"60–90 sec"}}),
    exercise({id:"rdl",name:"Romanian deadlift",movementPattern:"hinge",requiredEquipment:["gym","dumbbells"],difficulty:"beginner",prerequisites:["hip hinge"],qualities:["strength","muscle"],impact:"low",fatigue:"medium",alternatives:["hip-hinge","glute-bridge"],prescription:{sets:[2,4],reps:"6–12",rest:"90–150 sec"}}),
    exercise({id:"hip-hinge",name:"Single-leg hip hinge",movementPattern:"hinge",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:["supported balance"],qualities:["movement","durability"],impact:"low",fatigue:"low",alternatives:["glute-bridge"],prescription:{sets:[2,3],reps:"6–10 / side",rest:"60–90 sec"}}),
    exercise({id:"glute-bridge",name:"Glute bridge",movementPattern:"hinge",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["movement","muscle"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,4],reps:"10–15",rest:"45–75 sec"}}),
    exercise({id:"bench-press",name:"Bench press",movementPattern:"push",requiredEquipment:["gym"],difficulty:"intermediate",prerequisites:["confident press"],qualities:["strength","muscle"],impact:"low",fatigue:"medium",alternatives:["floor-press","push-up"],prescription:{sets:[2,5],reps:"3–10",rest:"2–3 min"}}),
    exercise({id:"floor-press",name:"Dumbbell floor press",movementPattern:"push",requiredEquipment:["dumbbells"],difficulty:"beginner",prerequisites:[],qualities:["strength","muscle"],impact:"low",fatigue:"medium",alternatives:["push-up"],prescription:{sets:[2,4],reps:"6–12",rest:"90–150 sec"}}),
    exercise({id:"push-up",name:"Incline push-up",movementPattern:"push",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["strength","muscle"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,4],reps:"6–15",rest:"60–90 sec"}}),
    exercise({id:"dumbbell-row",name:"Dumbbell row",movementPattern:"pull",requiredEquipment:["dumbbells","gym"],difficulty:"beginner",prerequisites:["supported hinge"],qualities:["strength","muscle"],impact:"low",fatigue:"medium",alternatives:["band-row","prone-swimmer"],prescription:{sets:[2,4],reps:"8–12",rest:"75–120 sec"}}),
    exercise({id:"band-row",name:"Band row",movementPattern:"pull",requiredEquipment:["bands"],difficulty:"beginner",prerequisites:["safe anchor"],qualities:["muscle","durability"],impact:"low",fatigue:"low",alternatives:["prone-swimmer"],prescription:{sets:[2,4],reps:"10–15",rest:"60–90 sec"}}),
    exercise({id:"band-rotation",name:"Standing band rotation",movementPattern:"rotation",requiredEquipment:["bands"],difficulty:"beginner",prerequisites:["safe anchor"],qualities:["sport","strength","power","durability"],impact:"low",fatigue:"low",alternatives:["standing-rotation","dead-bug"],prescription:{sets:[2,3],reps:"8–12 / side",rest:"45–60 sec"}}),
    exercise({id:"standing-rotation",name:"Standing hip-turn practice",movementPattern:"rotation",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["sport","power","movement"],impact:"low",fatigue:"low",alternatives:["dead-bug"],prescription:{sets:[2,3],reps:"6–10 / side",rest:"45–60 sec"}}),
    exercise({id:"band-press",name:"Band press",movementPattern:"push",requiredEquipment:["bands"],difficulty:"beginner",prerequisites:["safe anchor"],qualities:["muscle","strength"],impact:"low",fatigue:"low",alternatives:["push-up"],prescription:{sets:[2,4],reps:"10–15",rest:"60–90 sec"}}),
    exercise({id:"prone-swimmer",name:"Prone swimmer",movementPattern:"pull",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["mobility","durability"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,3],reps:"8–12",rest:"45–60 sec"}}),
    exercise({id:"snap-down",name:"Snap-down to stick",movementPattern:"landing",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:["pain-free landing"],qualities:["power","sport"],impact:"medium",fatigue:"low",alternatives:["calf-raise"],prescription:{sets:[2,4],reps:"3–6",rest:"90–120 sec"}}),
    exercise({id:"broad-jump",name:"Broad jump",movementPattern:"jump",requiredEquipment:["field"],difficulty:"intermediate",prerequisites:["controlled landing"],qualities:["power","sport"],impact:"high",fatigue:"medium",alternatives:["snap-down"],prescription:{sets:[2,4],reps:"3–5",rest:"2–3 min"}}),
    exercise({id:"acceleration",name:"Acceleration start",movementPattern:"sprint",requiredEquipment:["field"],difficulty:"intermediate",prerequisites:["pain-free running"],qualities:["power","sport"],impact:"high",fatigue:"medium",alternatives:["wall-march"],prescription:{sets:[3,8],reps:"10–20 m",rest:"90–180 sec"}}),
    exercise({id:"wall-march",name:"Wall acceleration march",movementPattern:"locomotion",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["sport","movement"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,4],reps:"20–30 sec",rest:"45–60 sec"}}),
    exercise({id:"band-lateral",name:"Band lateral walk",movementPattern:"lateral",requiredEquipment:["bands"],difficulty:"beginner",prerequisites:[],qualities:["sport","durability"],impact:"low",fatigue:"low",alternatives:["lateral-step"],prescription:{sets:[2,4],reps:"10–15 / side",rest:"45–75 sec"}}),
    exercise({id:"lateral-step",name:"Lateral step and stick",movementPattern:"lateral",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:["supported balance"],qualities:["sport","movement"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,4],reps:"5–8 / side",rest:"60–90 sec"}}),
    exercise({id:"calf-raise",name:"Calf raise",movementPattern:"calf",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["endurance","durability"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,4],reps:"12–25",rest:"45–75 sec"}}),
    exercise({id:"easy-run",name:"Easy run / run-walk",movementPattern:"locomotion",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:["comfortable walking"],qualities:["endurance"],impact:"medium",fatigue:"medium",alternatives:["easy-cycle","brisk-walk"],prescription:{sets:[1,1],reps:"10–60 min",rest:"—"}}),
    exercise({id:"tempo-run",name:"Controlled tempo intervals",movementPattern:"locomotion",requiredEquipment:["field"],difficulty:"intermediate",prerequisites:["consistent easy running"],qualities:["endurance","speed"],impact:"medium",fatigue:"medium",alternatives:["easy-run"],prescription:{sets:[4,8],reps:"1–3 min",rest:"1–2 min easy"}}),
    exercise({id:"easy-cycle",name:"Easy cycle",movementPattern:"conditioning",requiredEquipment:["bike","gym"],difficulty:"beginner",prerequisites:[],qualities:["endurance"],impact:"low",fatigue:"low",alternatives:["brisk-walk"],prescription:{sets:[1,1],reps:"15–45 min",rest:"—"}}),
    exercise({id:"easy-row",name:"Steady rowing machine",movementPattern:"conditioning",requiredEquipment:["rower"],difficulty:"beginner",prerequisites:[],qualities:["endurance","sport"],impact:"low",fatigue:"medium",alternatives:["dumbbell-row","easy-cycle","brisk-walk"],prescription:{sets:[1,1],reps:"10–30 min",rest:"—"}}),
    exercise({id:"brisk-walk",name:"Brisk walk",movementPattern:"locomotion",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["endurance","recovery"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[1,1],reps:"10–40 min",rest:"—"}}),
    exercise({id:"dead-bug",name:"Dead bug",movementPattern:"core",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["movement","durability"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[2,3],reps:"6–12 / side",rest:"45–60 sec"}}),
    exercise({id:"mobility-flow",name:"Gentle mobility flow",movementPattern:"mobility",requiredEquipment:["bodyweight"],difficulty:"beginner",prerequisites:[],qualities:["mobility","recovery"],impact:"low",fatigue:"low",alternatives:[],prescription:{sets:[1,2],reps:"6–10 min",rest:"as needed"}}),
    exercise({id:"swim-technique",name:"Easy technique swim",movementPattern:"conditioning",requiredEquipment:["pool"],difficulty:"beginner",prerequisites:["safe pool access"],qualities:["endurance","sport"],impact:"low",fatigue:"medium",alternatives:["easy-cycle","brisk-walk"],prescription:{sets:[1,1],reps:"20–40 min",rest:"as needed"}})
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function numeric(value, fallback) {
    var result = Number(value);
    return isFinite(result) ? result : fallback;
  }

  function normalizeEquipment(input) {
    var equipment = Array.isArray(input) ? input.slice() : [];
    if (equipment.indexOf("bodyweight") === -1) equipment.push("bodyweight");
    return equipment;
  }

  function findExercise(id) {
    return EXERCISES.filter(function (item) { return item.id === id; })[0] || null;
  }

  function equipmentMatches(item, equipment) {
    return item.requiredEquipment.some(function (needed) {
      return equipment.indexOf(needed) !== -1;
    });
  }

  function chooseExercise(id, equipment, impactLimit, visited) {
    var item = findExercise(id);
    if (!item) return null;
    visited = visited || {};
    if (visited[id]) return null;
    visited[id] = true;
    var impactAllowed = impactLimit === "low" ? item.impact === "low" :
      impactLimit === "medium" ? item.impact !== "high" : true;
    if (equipmentMatches(item, equipment) && impactAllowed) return item;
    for (var index = 0; index < item.alternatives.length; index += 1) {
      var replacement = chooseExercise(item.alternatives[index], equipment, impactLimit, visited);
      if (replacement) return replacement;
    }
    return null;
  }

  function parseWorkload(text) {
    var workload = {};
    var segments = String(text || "").toLowerCase().split(/[,;]+/);
    segments.forEach(function (segment) {
      DAY_ALIASES.forEach(function (aliases, dayIndex) {
        if (aliases.some(function (alias) { return new RegExp("\\b" + alias + "\\b").test(segment); })) {
          workload[dayIndex] = /game|match|competition|race/.test(segment) ?
            "Game / competition" : "Practice";
        }
      });
    });
    return workload;
  }

  function focusFor(profile) {
    var primary = (profile.goals || [])[0] || "fitness";
    if (primary === "muscle") return "muscle";
    if (primary === "strength") return "strength";
    if (primary === "conditioning" || primary === "fitness" ||
        profile.sport === "running" || profile.sport === "cross-country") return "endurance";
    if (primary === "power" || primary === "jump" || primary === "quickness" ||
        primary === "speed" || primary === "agility") return "power";
    if (primary === "mobility" || primary === "movement") return "movement";
    return profile.sport && profile.sport !== "general" ? "sport" : "strength";
  }

  function recentState(context) {
    var logs = (context.workoutLogs || context.logs || []).slice(0, 8);
    var readiness = (context.readiness || []).slice(0, 5);
    var tooHard = logs.filter(function (entry) {
      return (entry.feedback || entry).difficulty === "too-hard";
    }).length;
    var skipped = logs.filter(function (entry) {
      return (entry.feedback || entry).status === "skipped";
    }).length;
    var pain = logs.some(function (entry) {
      return !!(entry.feedback || entry).pain;
    });
    var lowRecovery = readiness.some(function (entry) {
      var energy = entry.energy || entry.energy_level;
      var soreness = entry.soreness || entry.soreness_level;
      var score = numeric(entry.score != null ? entry.score : entry.total, 100);
      return energy === "low" || soreness === "high" || score < 55;
    });
    return {logs:logs, readiness:readiness, tooHard:tooHard, skipped:skipped, pain:pain, lowRecovery:lowRecovery};
  }

  function chooseTrainingDays(workload, count) {
    var candidates = DAYS.map(function (_, index) { return index; }).filter(function (index) {
      return !workload[index];
    });
    var selected = [];
    while (selected.length < count && candidates.length) {
      candidates.sort(function (a, b) {
        function score(day) {
          var value = 10;
          if (workload[day + 1] === "Game / competition") value -= 7;
          if (workload[day - 1] === "Game / competition") value -= 4;
          if (workload[day + 1] || workload[day - 1]) value -= 2;
          selected.forEach(function (chosen) {
            if (Math.abs(chosen - day) <= 1) value -= 4;
          });
          if ([0, 2, 4, 5].indexOf(day) !== -1) value += 1;
          return value;
        }
        return score(b) - score(a);
      });
      selected.push(candidates.shift());
    }
    return selected.sort(function (a, b) { return a - b; });
  }

  var SPORT_FOCUS_SUPPORT = {
    basketball:["snap-down","lateral-step","acceleration","calf-raise"],
    football:["acceleration","broad-jump","goblet-squat","dumbbell-row"],
    soccer:["acceleration","lateral-step","split-squat","calf-raise"],
    baseball:["band-rotation","band-row","acceleration","step-up"],
    swimming:["dumbbell-row","prone-swimmer","swim-technique","mobility-flow"],
    track:["acceleration","broad-jump","calf-raise","split-squat"],
    running:["calf-raise","split-squat","dead-bug","mobility-flow"],
    "cross-country":["calf-raise","split-squat","dead-bug","mobility-flow"],
    volleyball:["broad-jump","snap-down","lateral-step","band-row"],
    tennis:["acceleration","lateral-step","band-rotation","calf-raise"],
    rugby:["acceleration","broad-jump","goblet-squat","dumbbell-row"],
    lacrosse:["acceleration","lateral-step","split-squat","calf-raise"],
    hockey:["acceleration","lateral-step","split-squat","mobility-flow"],
    golf:["band-rotation","mobility-flow","split-squat","brisk-walk"],
    cycling:["split-squat","rdl","calf-raise","mobility-flow"],
    rowing:["dumbbell-row","band-row","rdl","mobility-flow"],
    "combat-sports":["lateral-step","band-rotation","split-squat","brisk-walk"],
    strength:["back-squat","bench-press","rdl","dumbbell-row"],
    hiit:["acceleration","goblet-squat","brisk-walk","mobility-flow"],
    mobility:["mobility-flow","prone-swimmer","dead-bug","split-squat"],
    general:["brisk-walk","easy-cycle","mobility-flow","goblet-squat"]
  };

  var SPORT_DETAIL_PRIMARY = {
    basketball:{guard:"acceleration",wing:"snap-down",center:"goblet-squat"},
    football:{
      quarterback:"band-rotation","running-back":"acceleration","wide-receiver":"acceleration",
      "tight-end":"split-squat","offensive-line":"goblet-squat","defensive-line":"goblet-squat",
      linebacker:"broad-jump","defensive-back":"lateral-step"
    },
    soccer:{
      goalkeeper:"snap-down",defender:"goblet-squat",midfielder:"lateral-step",forward:"acceleration"
    },
    baseball:{
      pitcher:"band-rotation",catcher:"step-up",infield:"lateral-step",outfield:"acceleration"
    },
    track:{
      "sprint-hurdles":"acceleration","middle-distance":"split-squat",distance:"calf-raise",
      jumps:"broad-jump",throws:"band-rotation"
    },
    volleyball:{
      setter:"lateral-step",outside:"snap-down",opposite:"broad-jump",middle:"broad-jump",libero:"lateral-step"
    },
    tennis:{singles:"lateral-step",doubles:"acceleration","all-court":"band-rotation"},
    rugby:{forward:"goblet-squat",back:"acceleration"},
    lacrosse:{
      attack:"acceleration",midfield:"lateral-step",defense:"split-squat",goalie:"lateral-step"
    },
    hockey:{forward:"acceleration",defense:"split-squat",goalie:"lateral-step"},
    golf:{
      "swing-power":"band-rotation",mobility:"mobility-flow","walking-endurance":"brisk-walk"
    },
    cycling:{
      road:"easy-cycle",gravel:"easy-cycle","mountain-bike":"lateral-step","track-sprint":"acceleration"
    },
    rowing:{
      sweep:"dumbbell-row",sculling:"band-rotation","indoor-erg":"easy-row",distance:"easy-row"
    },
    "combat-sports":{
      boxing:"lateral-step",kickboxing:"acceleration",grappling:"split-squat","mixed-martial-arts":"snap-down"
    },
    strength:{
      powerlifting:"back-squat",bodybuilding:"bench-press","general-strength":"goblet-squat"
    },
    hiit:{
      "cardio-intervals":"acceleration","strength-circuits":"goblet-squat",
      "mixed-conditioning":"brisk-walk","low-impact":"mobility-flow"
    },
    mobility:{
      "hips-ankles":"mobility-flow","shoulders-thoracic":"prone-swimmer",
      "full-body-control":"dead-bug"
    }
  };

  function baseExerciseIds(profile, focus) {
    var sport = profile.sport || "general";
    var role = String(profile.position || "").toLowerCase();
    var activity = String(profile.activity || "").toLowerCase();
    var ids;
    if (sport === "basketball" && /guard|point/.test(role)) {
      ids = ["acceleration", "lateral-step", "split-squat", "dumbbell-row", "dead-bug"];
    } else if (sport === "basketball" && /center|forward|wing/.test(role)) {
      ids = ["goblet-squat", "split-squat", "snap-down", "dumbbell-row", "dead-bug"];
    } else if (sport === "basketball") {
      ids = ["snap-down", "acceleration", "split-squat", "dumbbell-row", "dead-bug"];
    } else if (sport === "football") {
      ids = ["acceleration", "broad-jump", "split-squat", "dumbbell-row", "dead-bug"];
    } else if (sport === "soccer") {
      ids = ["lateral-step", "acceleration", "split-squat", "calf-raise", "dead-bug"];
    } else if (sport === "baseball") {
      ids = ["band-rotation", "step-up", "band-row", "prone-swimmer", "dead-bug"];
    } else if (sport === "track") {
      ids = ["acceleration", "broad-jump", "split-squat", "calf-raise", "dead-bug"];
    } else if (sport === "volleyball") {
      ids = ["snap-down", "lateral-step", "split-squat", "band-rotation", "dead-bug"];
    } else if (sport === "tennis") {
      ids = ["lateral-step", "acceleration", "band-rotation", "split-squat", "dead-bug"];
    } else if (["rugby", "lacrosse", "hockey"].indexOf(sport) !== -1) {
      ids = ["acceleration", "lateral-step", "split-squat", "dumbbell-row", "dead-bug"];
    } else if (sport === "golf") {
      ids = ["mobility-flow", "band-rotation", "hip-hinge", "split-squat", "dead-bug"];
    } else if (sport === "cycling") {
      ids = ["easy-cycle", "split-squat", "rdl", "calf-raise", "dead-bug"];
    } else if (sport === "rowing") {
      ids = ["easy-row", "dumbbell-row", "split-squat", "dead-bug", "mobility-flow"];
    } else if (sport === "combat-sports") {
      ids = ["lateral-step", "snap-down", "split-squat", "push-up", "dead-bug"];
    } else if (sport === "running" || sport === "cross-country") {
      ids = numeric(profile.weeklyRunVolume, 0) < 10 ?
        ["brisk-walk", "split-squat", "calf-raise", "dead-bug", "mobility-flow"] :
        ["easy-run", "split-squat", "calf-raise", "dead-bug", "mobility-flow"];
    } else if (sport === "swimming") {
      ids = ["swim-technique", "dumbbell-row", "split-squat", "dead-bug", "mobility-flow"];
    } else if (focus === "power") {
      ids = ["broad-jump", "acceleration", "goblet-squat", "dumbbell-row", "dead-bug"];
    } else if (focus === "muscle") {
      ids = ["back-squat", "rdl", "bench-press", "dumbbell-row", "band-lateral"];
    } else if (focus === "strength") {
      ids = ["back-squat", "rdl", "bench-press", "dumbbell-row", "dead-bug"];
    } else if (focus === "movement" || sport === "mobility") {
      ids = ["mobility-flow", "tempo-squat", "hip-hinge", "prone-swimmer", "dead-bug"];
    } else {
      ids = ["tempo-squat", "push-up", "hip-hinge", "brisk-walk", "dead-bug"];
    }
    if (sport === "general" && /mobility|yoga/.test(activity)) {
      ids = ["mobility-flow", "tempo-squat", "hip-hinge", "prone-swimmer", "dead-bug"];
    }
    if (sport === "general" && /cycle|bike/.test(activity)) ids[3] = "easy-cycle";
    if (sport === "general" && /walk/.test(activity)) ids[3] = "brisk-walk";
    var detail = sport === "basketball" ? role :
      String(profile.sportDetail || "").toLowerCase();
    var detailPrimary = SPORT_DETAIL_PRIMARY[sport] && SPORT_DETAIL_PRIMARY[sport][detail];
    if (detailPrimary) ids[0] = detailPrimary;
    var secondarySupport = {
      mobility:"mobility-flow", movement:"mobility-flow", conditioning:"brisk-walk",
      fitness:"brisk-walk", durability:"calf-raise", speed:"acceleration",
      quickness:"lateral-step", agility:"lateral-step", power:"snap-down",
      jump:"snap-down", strength:"goblet-squat", muscle:"push-up"
    };
    (profile.goals || []).slice(1, 3).forEach(function (goal, index) {
      var supportId = secondarySupport[goal];
      if (!supportId) return;
      var preferredSlot = sport === "general" && profile.activity ? 2 - index : 3 - index;
      var replaceAt = Math.max(1, Math.min(ids.length - 1, preferredSlot));
      ids[replaceAt] = supportId;
    });
    return ids;
  }

  function phaseFor(focus, week, sport, season, profile) {
    var phase;
    if (week === 1) {
      phase = {
        key:"foundation",
        label:"Foundation",
        emphasis:"Technique, baseline capacity, and repeatable movement quality",
        conditioning:"Easy, conversational conditioning",
        recovery:"Leave room to recover and record how the work feels",
        reason:"Establish a repeatable baseline before adding stress."
      };
    } else if (week === 2) {
      phase = {
        key:"build",
        label:"Build",
        emphasis:"Progressive volume and support-work capacity",
        conditioning:"Steady conditioning with controlled progression",
        recovery:"Keep at least one easy day between demanding sessions",
        reason:"Build volume gradually while keeping the key pattern familiar."
      };
    } else if (week === 3) {
      phase = {
        key:focus === "power" || focus === "endurance" ? "performance" : "intensification",
        label:focus === "power" || focus === "endurance" ? "Performance" : "Intensification",
        emphasis:focus === "power" ?
          "Fast, high-quality efforts without chasing fatigue" :
          focus === "endurance" ?
            "Controlled quality and sport-specific conditioning" :
            "Higher-quality work with slightly more intensity",
        conditioning:focus === "endurance" ?
          "One controlled quality stimulus; no all-out efforts" :
          "Short, purposeful conditioning that supports the goal",
        recovery:"Protect sleep and keep non-training activity easy",
        reason:"Use the strongest stimulus of the block only after the earlier work is earned."
      };
    } else {
      phase = {
        key:"deload",
        label:"Deload / Recovery",
        emphasis:"Reduce fatigue while keeping the movement patterns fresh",
        conditioning:"Easy movement, walking, or gentle mobility",
        recovery:"Prioritize recovery and reassess readiness before the next block",
        reason:"Reduce volume for recovery, then use your feedback to shape the next block."
      };
    }
    var guidance = SPORT_GUIDANCE[sport];
    if (guidance) {
      var phaseCue = phase.key === "foundation" ?
        "Establish a repeatable base for " + guidance.demand :
        phase.key === "build" ?
          "Build support capacity for " + guidance.demand :
          phase.key === "deload" ?
            "Keep patterns for " + guidance.demand + " fresh while reducing fatigue" :
            "Apply " + guidance.demand + " with crisp, controlled efforts";
      phase.emphasis += ". Sport-specific priority: " + phaseCue + ".";
      phase.conditioning = guidance.conditioning;
      if (season === "in-season") {
        phase.emphasis += " Keep added training supportive of practices and competition.";
        phase.conditioning = "Sport practices and games remain the main conditioning load. " +
          guidance.conditioning;
        phase.recovery = "Keep competition-adjacent days easy and account for total sport and gym workload.";
      }
    }
    var detail = String(profile && profile.sportDetail || "").toLowerCase();
    var terrainCues = sport === "running" ? {
      road:"On roads, adjust pace to conditions and keep easy runs conversational.",
      track:"On the track, keep faster work controlled and compare pace on the same surface.",
      trail:"On trails, judge effort rather than pace and choose controlled footing.",
      treadmill:"On a treadmill, keep effort conversational and use a comfortable pace.",
      mixed:"Adjust pace to the surface and keep easy running conversational."
    } : sport === "cross-country" ? {
      "rolling-trails":"On rolling trails, keep effort steady as the grades change.",
      "hilly-trails":"On hills, control effort on climbs and avoid racing the descents.",
      "grass-fields":"On grass and fields, prioritize stable footing over target pace.",
      "mixed-course":"Adjust effort to course conditions instead of forcing a flat-course pace."
    } : null;
    var swimCues = {
      "freestyle-sprint":"For freestyle sprint events, keep pool quality work brief, fast, and technically crisp.",
      "freestyle-distance":"For distance freestyle, prioritize relaxed aerobic pool work over extra hard intervals.",
      backstroke:"For backstroke, keep pool technique work primary and gym support controlled.",
      breaststroke:"For breaststroke, keep pool technique work primary and gym support controlled.",
      butterfly:"For butterfly, keep pool technique work primary and gym support controlled.",
      "individual-medley":"For individual medley, keep stroke-specific pool work primary and gym support controlled."
    };
    var detailCue = terrainCues && terrainCues[detail] ||
      (sport === "swimming" && swimCues[detail]);
    if (detailCue) phase.conditioning += " " + detailCue;
    return phase;
  }

  function selectedSportFocus(profile) {
    var choices = SPORT_FOCUS_SUPPORT[profile.sport] || [];
    var value = String(profile.sportFocus || "");
    return choices.indexOf(value) > -1 ? value : "";
  }

  function phaseExerciseIds(profile, focus, phase, baseIds) {
    var sport = profile.sport || "general";
    var rotations = {
      basketball:{
        build:["snap-down","band-lateral","step-up","band-row","dead-bug"],
        performance:["broad-jump","acceleration","split-squat","dumbbell-row","dead-bug"],
        deload:["wall-march","lateral-step","glute-bridge","prone-swimmer","mobility-flow"]
      },
      football:{
        build:["broad-jump","split-squat","dumbbell-row","dead-bug"],
        performance:["acceleration","broad-jump","split-squat","dumbbell-row","dead-bug"],
        deload:["wall-march","glute-bridge","prone-swimmer","mobility-flow","dead-bug"]
      },
      soccer:{
        build:["lateral-step","split-squat","calf-raise","dead-bug","brisk-walk"],
        performance:["acceleration","lateral-step","split-squat","calf-raise","dead-bug"],
        deload:["wall-march","glute-bridge","calf-raise","brisk-walk","mobility-flow"]
      },
      baseball:{
        build:["band-rotation","step-up","band-row","prone-swimmer","dead-bug"],
        performance:["band-rotation","acceleration","split-squat","band-row","prone-swimmer"],
        deload:["mobility-flow","hip-hinge","prone-swimmer","glute-bridge","dead-bug"]
      },
      track:{
        build:["broad-jump","split-squat","calf-raise","mobility-flow","dead-bug"],
        performance:["broad-jump","acceleration","split-squat","calf-raise","dead-bug"],
        deload:["wall-march","glute-bridge","calf-raise","brisk-walk","mobility-flow"]
      },
      running:{
        build:["split-squat","calf-raise","dead-bug","mobility-flow","brisk-walk"],
        performance:["tempo-run","split-squat","calf-raise","mobility-flow","dead-bug"],
        deload:["mobility-flow","glute-bridge","calf-raise","brisk-walk","dead-bug"]
      },
      "cross-country":{
        build:["split-squat","calf-raise","dead-bug","mobility-flow","brisk-walk"],
        performance:["tempo-run","split-squat","calf-raise","mobility-flow","dead-bug"],
        deload:["mobility-flow","glute-bridge","calf-raise","brisk-walk","dead-bug"]
      },
      swimming:{
        build:["dumbbell-row","band-row","prone-swimmer","split-squat","mobility-flow"],
        performance:["swim-technique","dumbbell-row","band-rotation","prone-swimmer","dead-bug"],
        deload:["mobility-flow","prone-swimmer","band-row","glute-bridge","dead-bug"]
      },
      volleyball:{
        build:["snap-down","lateral-step","split-squat","band-rotation","dead-bug"],
        performance:["broad-jump","snap-down","lateral-step","dumbbell-row","dead-bug"],
        deload:["wall-march","lateral-step","glute-bridge","prone-swimmer","mobility-flow"]
      },
      tennis:{
        build:["lateral-step","split-squat","band-rotation","calf-raise","dead-bug"],
        performance:["acceleration","lateral-step","band-rotation","split-squat","dead-bug"],
        deload:["wall-march","mobility-flow","hip-hinge","prone-swimmer","dead-bug"]
      },
      rugby:{
        build:["acceleration","split-squat","goblet-squat","dumbbell-row","dead-bug"],
        performance:["broad-jump","acceleration","split-squat","dumbbell-row","dead-bug"],
        deload:["wall-march","glute-bridge","band-row","mobility-flow","dead-bug"]
      },
      lacrosse:{
        build:["acceleration","lateral-step","split-squat","calf-raise","dead-bug"],
        performance:["acceleration","broad-jump","lateral-step","split-squat","dead-bug"],
        deload:["wall-march","glute-bridge","calf-raise","brisk-walk","mobility-flow"]
      },
      hockey:{
        build:["lateral-step","acceleration","split-squat","calf-raise","dead-bug"],
        performance:["acceleration","lateral-step","broad-jump","split-squat","dead-bug"],
        deload:["wall-march","glute-bridge","calf-raise","mobility-flow","dead-bug"]
      },
      golf:{
        build:["band-rotation","hip-hinge","split-squat","prone-swimmer","dead-bug"],
        performance:["band-rotation","step-up","hip-hinge","split-squat","dead-bug"],
        deload:["mobility-flow","hip-hinge","glute-bridge","prone-swimmer","dead-bug"]
      },
      cycling:{
        build:["split-squat","rdl","calf-raise","dead-bug","mobility-flow"],
        performance:["easy-cycle","split-squat","calf-raise","hip-hinge","dead-bug"],
        deload:["brisk-walk","glute-bridge","calf-raise","mobility-flow","dead-bug"]
      },
      rowing:{
        build:["dumbbell-row","rdl","split-squat","prone-swimmer","dead-bug"],
        performance:["easy-row","dumbbell-row","hip-hinge","split-squat","dead-bug"],
        deload:["mobility-flow","glute-bridge","prone-swimmer","band-row","dead-bug"]
      },
      "combat-sports":{
        build:["lateral-step","split-squat","band-rotation","push-up","dead-bug"],
        performance:["snap-down","lateral-step","acceleration","split-squat","dead-bug"],
        deload:["wall-march","mobility-flow","glute-bridge","prone-swimmer","dead-bug"]
      },
      strength:{
        build:["goblet-squat","hip-hinge","floor-press","band-row","dead-bug"],
        intensification:["rdl","split-squat","bench-press","dumbbell-row","dead-bug"],
        deload:["tempo-squat","glute-bridge","push-up","prone-swimmer","mobility-flow"]
      },
      general:{
        build:["split-squat","glute-bridge","push-up","band-row","dead-bug"],
        intensification:["step-up","rdl","floor-press","band-lateral","dead-bug"],
        deload:["tempo-squat","hip-hinge","prone-swimmer","brisk-walk","mobility-flow"]
      }
    };
    var defaults = {
      build:["split-squat","glute-bridge","push-up","band-row","dead-bug"],
      intensification:["step-up","rdl","floor-press","band-lateral","dead-bug"],
      performance:["snap-down","wall-march","split-squat","calf-raise","dead-bug"],
      deload:["tempo-squat","hip-hinge","prone-swimmer","brisk-walk","mobility-flow"]
    };
    var sportRotation = rotations[sport] || (focus === "muscle" || focus === "strength" ? {
      build:["goblet-squat","hip-hinge","floor-press","band-row","dead-bug"],
      intensification:["rdl","split-squat","bench-press","dumbbell-row","dead-bug"],
      deload:["tempo-squat","glute-bridge","push-up","prone-swimmer","mobility-flow"]
    } : null);
    var rotation = (sportRotation && sportRotation[phase.key]) || defaults[phase.key] || baseIds.slice(1);
    var selectedFocus = selectedSportFocus(profile);
    var prioritized = [baseIds[0]];
    if (selectedFocus && selectedFocus !== baseIds[0]) prioritized.push(selectedFocus);
    return prioritized.concat(rotation).filter(function (id, index, ids) {
      return ids.indexOf(id) === index;
    });
  }

  function prescribedSets(focus, profile, week, historyState, phase) {
    var novice = profile.experience === "new" || profile.experience === "not-sure" ||
      profile.consistency === "low" || profile.consistency === "not-sure" ||
      profile.familiarity === "not-sure" || profile.familiarity === "basic" ||
      profile.sportExperience === "new-to-sport" ||
      profile.sportExperience === "less-than-year";
    var sets = focus === "muscle" ? (novice ? 3 : 4) :
      focus === "strength" ? (novice ? 2 : 4) :
      focus === "power" ? (novice ? 2 : 3) : (novice ? 2 : 3);
    if (profile.experience === "advanced" && phase && phase.key === "intensification" &&
        (focus === "strength" || focus === "muscle")) sets += 1;
    if (phase && phase.key === "deload") sets -= 1;
    if (historyState.tooHard >= 2 || historyState.lowRecovery) sets -= 1;
    return Math.max(1, Math.min(5, sets));
  }

  function strengthPrescription(focus, profile, week, historyState, phase) {
    var sets = prescribedSets(focus, profile, week, historyState, phase);
    var deload = phase && phase.key === "deload";
    if (focus === "strength") {
      return {sets:sets,reps:phase && phase.key === "intensification" ? "3–5" : "5–6",rest:"2–4 min",
        effort:deload ? "RPE 5–6" : phase && phase.key === "intensification" ? "RPE 7–8" : "RPE 7"};
    }
    if (focus === "muscle") {
      return {sets:sets,reps:deload ? "8" : phase && phase.key === "intensification" ? "6–10" : "8–12",
        rest:"75–120 sec",effort:deload ? "RPE 6" : "RPE 7–8"};
    }
    if (focus === "power") {
      return {sets:sets,reps:"3–5 quality reps",rest:"2–3 min",
        effort:deload ? "fast, low volume" : "fast; stop before speed drops"};
    }
    return {sets:sets,reps:"6–10",rest:"60–90 sec",
      effort:deload ? "RPE 5–6" : phase && phase.key === "performance" ? "RPE 7" : "RPE 6–7"};
  }

  function safeRunMinutes(profile, runSessionCount) {
    var durationCap = Math.max(10, numeric(profile.duration, 45) - 10);
    var recentWeekly = Math.max(0, numeric(profile.weeklyRunVolume, 0));
    var longest = Math.max(0, numeric(profile.longestRun, 0));
    var sessions = Math.max(1, runSessionCount || 1);
    var volumeCap = recentWeekly ? recentWeekly / sessions : 0;
    var longestCap = longest ? longest : 10;
    var target = Math.min(durationCap, volumeCap, longestCap);
    if (/10k|half|marathon/i.test(profile.runDistance || "")) target = Math.min(target, 35);
    return Math.max(1, Math.floor(target));
  }

  function prescribeExercise(item, focus, profile, week, historyState, runSessionCount, phase) {
    var prescription = strengthPrescription(focus, profile, week, historyState, phase);
    if (item.id === "easy-run") {
      var factors = [1, 1, 1, 0.75];
      var raceFinish = profile.raceDetail && week === 3 ? " + 4 × 20 sec relaxed strides" : "";
      return {sets:1,reps:Math.round(safeRunMinutes(profile, runSessionCount) * factors[week - 1]) + " min easy" + raceFinish,
        rest:"—",effort:"conversational, RPE 4–5"};
    }
    if (item.id === "tempo-run") {
      var interval = /10k|half|marathon/i.test(profile.runDistance || "") ? "3 min controlled" :
        /5k/i.test(profile.runDistance || "") ? "90 sec controlled" : "2 min controlled";
      return {sets:week === 4 ? 3 : 4,reps:interval,rest:"2 min easy",
         effort:phase && phase.key === "deload" ? "RPE 5–6; never all-out" : "RPE 6–7; never all-out"};
    }
    if (item.qualities.indexOf("endurance") !== -1 &&
        (item.movementPattern === "locomotion" ||
         ["easy-cycle", "easy-row", "swim-technique"].indexOf(item.id) !== -1)) {
      return {sets:1,reps:Math.max(10, Math.min(30, numeric(profile.duration, 45) - 10)) + " min",
        rest:"—",effort:"conversational"};
    }
    if (item.qualities.indexOf("power") !== -1) {
       return {sets:prescribedSets("power", profile, week, historyState, phase),
        reps:"3–5 quality reps",rest:"2–3 min",
         effort:phase && phase.key === "deload" ? "fast, low volume" : "fast; stop before speed drops"};
    }
    if ((focus === "strength" || focus === "muscle") &&
        item.qualities.indexOf(focus) !== -1) return prescription;
    return {
       sets:Math.min(phase && phase.key === "deload" ? 2 : 3,
         prescribedSets(focus, profile, week, historyState, phase)),
      reps:item.prescription.reps,
      rest:item.prescription.rest,
       effort:phase && phase.key === "deload" ? "easy, controlled" :
         phase && phase.key === "performance" ? "RPE 7; quality first" : "RPE 6–7"
    };
  }

  function restMinutes(rest) {
    if (!rest || rest === "—" || rest === "as needed") return 0;
    var values = String(rest).match(/\d+(?:\.\d+)?/g) || [];
    if (!values.length) return 0;
    var maximum = Math.max.apply(Math, values.map(Number));
    return /sec/.test(rest) ? maximum / 60 : maximum;
  }

  function exerciseMinutes(item) {
    var minuteMatch = String(item.reps || "").match(/^(\d+)\s*min/);
    if (minuteMatch) return Number(minuteMatch[1]);
    var sets = Math.max(1, numeric(item.sets, 1));
    return sets * 0.75 + Math.max(0, sets - 1) * restMinutes(item.rest);
  }

  function fitSessionDuration(exercises, duration) {
    var fitted = clone(exercises);
    var available = Math.max(10, numeric(duration, 45));
    function estimated() {
      return 5 + fitted.reduce(function (sum, item) {
        return sum + exerciseMinutes(item);
      }, 0);
    }
    var guard = 0;
    while (estimated() > available && guard < 100) {
      guard += 1;
      var reduced = false;
      for (var index = fitted.length - 1; index >= 0; index -= 1) {
        if (numeric(fitted[index].sets, 1) > 1) {
          fitted[index].sets -= 1;
          reduced = true;
          break;
        }
      }
      if (!reduced && fitted.length > 1) fitted.pop();
      else if (!reduced) break;
    }
    return {exercises:fitted, estimatedMinutes:Math.ceil(Math.min(available, estimated()))};
  }

  function generate(profile, context) {
    profile = clone(profile || {});
    context = context || {};
    var sport = profile.sport || "general";
    var sportGuidance = SPORT_GUIDANCE[sport];
    var sportInSeason = profile.season === "in-season" && !!sportGuidance;
    var equipment = normalizeEquipment(profile.equipment);
    var focus = focusFor(profile);
    var workload = parseWorkload(profile.load);
    var hasSportSessionInput = profile.sportSessionsPerWeek !== "" &&
      profile.sportSessionsPerWeek !== null && profile.sportSessionsPerWeek !== undefined;
    var hasSportMinutesInput = profile.sportSessionMinutes !== "" &&
      profile.sportSessionMinutes !== null && profile.sportSessionMinutes !== undefined;
    var reportedSportSessions = hasSportSessionInput ?
      Math.max(0, Math.min(14, Math.floor(numeric(profile.sportSessionsPerWeek, 0)))) : 0;
    var averageSportMinutes = hasSportMinutesInput ?
      Math.max(0, Math.min(240, numeric(profile.sportSessionMinutes, 0))) : 0;
    var scheduledSportSessions = Object.keys(workload).length;
    var sportSessionCount = Math.max(reportedSportSessions, scheduledSportSessions);
    var weeklySportMinutes = sportSessionCount * averageSportMinutes;
    var highSportLoad = weeklySportMinutes >= 300 ||
      (profile.sportIntensity === "hard" && sportSessionCount >= 3);
    var sportNovice = profile.sportExperience === "new-to-sport" ||
      profile.sportExperience === "less-than-year";
    var historyState = recentState(context);
    var requestedDays = Math.max(2, Math.min(4, numeric(profile.days, 3)));
    var impactLimit = profile.limitations || historyState.pain ? "low" :
      profile.age === "under18" || profile.age === "over55" || profile.age === "55plus" ||
      profile.experience === "new" || profile.experience === "not-sure" || sportNovice ?
        "medium" : "high";
    var conservative = impactLimit !== "high" || profile.consistency === "low" ||
      profile.consistency === "not-sure" || profile.familiarity === "not-sure" ||
      profile.familiarity === "basic" || sportNovice || historyState.lowRecovery;
    var safeDays = requestedDays;
    if (profile.season === "in-season" || historyState.lowRecovery ||
        scheduledSportSessions >= 4 || sportSessionCount >= 4 || highSportLoad) {
      safeDays = Math.min(safeDays, 2);
    } else if (sportSessionCount >= 2) {
      safeDays = Math.min(safeDays, 3);
    }
    if (sport === "running" || sport === "cross-country") {
      var recentRunMinutes = Math.max(0, numeric(profile.weeklyRunVolume, 0));
      if (recentRunMinutes < 10) {
        safeDays = Math.min(safeDays, 2);
      } else {
        safeDays = Math.min(safeDays, Math.max(1, Math.floor(recentRunMinutes / 5)));
      }
    }
    var trainingDays = chooseTrainingDays(workload, safeDays);
    var exerciseLimit = numeric(profile.duration, 45) <= 25 ? 2 :
      numeric(profile.duration, 45) <= 35 ? 3 :
      numeric(profile.duration, 45) <= 55 ? 4 : 5;
    if (sportInSeason) exerciseLimit = Math.min(exerciseLimit, 3);
    if (highSportLoad || weeklySportMinutes >= 240) {
      exerciseLimit = Math.min(exerciseLimit, 3);
    }
    var baseIds = baseExerciseIds(profile, focus);
    var primaryId = baseIds[0];
    var sportFocusId = selectedSportFocus(profile);

    var weeks = [];
    var highConsistencySetAdded = false;
    for (var week = 1; week <= 4; week += 1) {
      var phase = phaseFor(focus, week, sport, profile.season, profile);
      var phaseExercises = [];
      phaseExerciseIds(profile, focus, phase, baseIds).forEach(function (id) {
        var selected = chooseExercise(id, equipment, impactLimit);
        if (selected && !phaseExercises.some(function (existing) { return existing.id === selected.id; })) {
          phaseExercises.push(selected);
        }
      });
      phaseExercises = phaseExercises.slice(0, exerciseLimit);
      var sessions = trainingDays.map(function (dayIndex, sessionIndex) {
        var sessionExercises = phaseExercises.map(function (item, exerciseIndex) {
          var prescription = prescribeExercise(
            item, focus, profile, week, historyState, trainingDays.length, phase
          );
          var output = {
            id:item.id,
            name:item.name,
            sets:prescription.sets,
            reps:prescription.reps,
            rest:prescription.rest,
            effort:historyState.tooHard >= 2 ?
              "held after repeated too-hard feedback" : prescription.effort,
            priority:exerciseIndex === 0 ? "primary" : "support",
            movementPattern:item.movementPattern,
            impact:item.impact
          };
          if (profile.workingWeights && (focus === "strength" || focus === "muscle") &&
              exerciseIndex < 3) output.startingLoad = profile.workingWeights;
          return output;
        });
        if ((sport === "running" || sport === "cross-country") && sessionIndex === 1 &&
            profile.experience !== "new" && profile.consistency !== "low") {
          var tempo = chooseExercise("tempo-run", equipment, impactLimit);
          if (tempo) sessionExercises[0] = Object.assign({
            id:tempo.id,name:tempo.name,priority:"primary",
            movementPattern:tempo.movementPattern,impact:tempo.impact
          }, prescribeExercise(
            tempo, "endurance", profile, week, historyState, trainingDays.length, phase
          ));
        }
        var fitted = fitSessionDuration(sessionExercises, numeric(profile.duration, 45));
        var primary = fitted.exercises[0];
        var timeBasedPrimary = primary &&
          (primary.movementPattern === "conditioning" ||
           /min/i.test(String(primary.reps || "")));
        if (primary && profile.consistency === "high" && !sportInSeason &&
            phase.key !== "deload" &&
            !timeBasedPrimary && !profile.limitations && !historyState.pain &&
            !historyState.lowRecovery && historyState.tooHard < 2 &&
            numeric(primary.sets, 0) < 5) {
          var candidateExercises = clone(fitted.exercises);
          candidateExercises[0].sets = numeric(candidateExercises[0].sets, 0) + 1;
          var candidateFit = fitSessionDuration(candidateExercises, numeric(profile.duration, 45));
          var extraSetFitsWithoutCuttingSupport = candidateFit.exercises.length === fitted.exercises.length &&
            candidateFit.exercises.every(function (item, index) {
              return item.id === fitted.exercises[index].id &&
                numeric(item.sets, 0) === numeric(fitted.exercises[index].sets, 0) + (index === 0 ? 1 : 0);
            });
          if (extraSetFitsWithoutCuttingSupport) {
            fitted = candidateFit;
            highConsistencySetAdded = true;
          }
        }
        return {
          id:"week-" + week + "-day-" + dayIndex,
          day:DAYS[dayIndex],
          name:sessionIndex === 0 ? "Priority " + focus + " session" : "Support " + focus + " session",
          minutes:numeric(profile.duration, 45),
          estimatedMinutes:fitted.estimatedMinutes,
          exercises:fitted.exercises
        };
      });
      weeks.push({
        week:week,
        block:1,
        blockWeek:week,
        phase:phase.key,
        phaseLabel:phase.label,
        primaryMovement:phaseExercises.length ? phaseExercises[0].id : primaryId,
        emphasis:phase.emphasis,
        conditioning:phase.conditioning,
        recovery:phase.recovery,
        label:phase.label,
        sessions:sessions,
        progression:phase.reason + " " +
          (week === 1 ? "Keep the primary movement stable and record a baseline." :
            week === 2 ? "Support exercises rotate while the primary movement stays familiar." :
            week === 3 ? "Only completed, appropriate work earns the higher-quality stimulus." :
            "Use this lower-volume week to recover and reassess.")
      });
    }

    var schedule = DAYS.map(function (day, dayIndex) {
      if (workload[dayIndex]) {
        return {day:day,type:"sport",title:workload[dayIndex],workload:"high"};
      }
      var session = weeks[0].sessions.filter(function (item) { return item.day === day; })[0];
      if (session) return {day:day,type:"training",title:session.name,sessionId:session.id,workload:"moderate"};
      var nearGame = workload[dayIndex - 1] === "Game / competition" ||
        workload[dayIndex + 1] === "Game / competition";
      var nearDemand = workload[dayIndex - 1] || workload[dayIndex + 1];
      return {day:day,type:"recovery",
        title:nearGame ? "Complete rest or gentle mobility" :
          nearDemand ? "Easy movement / mobility" : "Rest",
        workload:"low"};
    });

    var role = String(profile.position || "").toLowerCase();
    var recognizedRole = sport === "basketball" &&
      (/guard|point|center|forward|wing/.test(role));
    var selectedDetail = sport === "basketball" ? role :
      String(profile.sportDetail || "").toLowerCase();
    var hasSelectedDetail = !!selectedDetail && selectedDetail !== "not-sure";
    var detailChangesPrimary = !!(SPORT_DETAIL_PRIMARY[sport] &&
      SPORT_DETAIL_PRIMARY[sport][selectedDetail]);
    var unknownSport = sport !== "general" && SUPPORTED_SPORTS.indexOf(sport) === -1;
    var sportFocusEntry = EXERCISES.filter(function (item) {
      return item.id === sportFocusId;
    })[0];
    var sportFocusDecision = !sportFocusId ?
      "No extra support focus was selected; the sport template supplies rotating support work." :
      sportFocusId === primaryId ?
        "Your selected priority already matches the block's stable primary movement." :
        "Prioritized " + (sportFocusEntry ? sportFocusEntry.name : sportFocusId) +
          " as a recurring support movement when equipment, impact safety, and session time allow; other support work still rotates.";
    var sportLoadInput = {
      schedule:profile.load || "none",
      sessionsPerWeek:hasSportSessionInput ? reportedSportSessions : null,
      averageMinutes:hasSportMinutesInput ? averageSportMinutes : null,
      intensity:profile.sportIntensity || "not provided"
    };
    var sportLoadDecision = highSportLoad || sportSessionCount >= 4 ?
      "Counted " + sportSessionCount +
        " sport sessions per week and limited ALEFIT work to at most two days and three movements to leave room for recovery." :
      sportSessionCount >= 2 ?
        "Counted " + sportSessionCount +
          " sport sessions per week and capped ALEFIT frequency at three days; exact weekdays are avoided when listed in the schedule." :
        sportSessionCount === 1 ?
          "Counted one sport session per week; the requested safe frequency was retained, with listed weekdays kept clear." :
        scheduledSportSessions ?
          "Practices and games listed in the weekly schedule count as workload; ALEFIT sessions avoid those days." :
          profile.sportIntensity ?
            "Recorded session effort; no weekly sport-session count was available to calculate a volume cap." :
            "No current sport workload was reported; ALEFIT sessions are spaced across open days.";
    var decisionTrace = {
      sport:{input:sport,demand:sportGuidance ? sportGuidance.demand : null,
        decision:unknownSport ?
          "Used honest general athletic-development rules; no expert-specific claim." :
          sportGuidance ?
            "Prioritized " + sportGuidance.demand +
              " through sport-specific primary movements and phase support rotations." :
            "Selected the supported " + sport + " training template."},
      goals:{input:profile.goals || [],decision:"The first goal set " + focus +
        " prescriptions; later goals changed support exercise selection."},
      positionOrEvent:{
        input:hasSelectedDetail ? selectedDetail : "not provided",
        changedPrimary:detailChangesPrimary,
        decision:recognizedRole ?
          "Recognized basketball role changed the drill and strength emphasis." :
          detailChangesPrimary ?
            "The selected sport role or training detail sets the block's stable primary movement, subject to equipment and impact-safe alternatives." :
            hasSelectedDetail && (sport === "running" || sport === "cross-country") ?
              "Terrain selection adjusts conditioning guidance; target distance, weekly volume, and longest comfortable run still govern run progression." :
              hasSelectedDetail && sport === "swimming" ?
                "The selected stroke or event adjusts conditioning guidance; technique work stays primary while chosen goals shape strength support." :
                hasSelectedDetail ?
                  "The selected sport detail is included as context; the sport template and chosen goals still govern movement emphasis." :
                  "No role or event detail was selected; the supported sport template and goals set movement emphasis."
      },
      sportFocus:{input:sportFocusId || "not provided",decision:sportFocusDecision},
      season:{input:profile.season || "not sure",decision:sportInSeason ?
        "Capped ALEFIT work at two days and three movements for in-season maintenance, and held extra progression." :
        profile.season === "in-season" ?
          "Capped ALEFIT work at two days around sport demand." :
          "Used the requested safe frequency."},
      experience:{input:profile.experience || "not sure",decision:conservative ?
        "Started with lower volume/impact." : "Used standard starting volume."},
      sportExperience:{input:profile.sportExperience || "not provided",decision:sportNovice ?
        "A new sport-specific training history reduced starting sets and impact; progress only while movement quality and recovery stay good." :
        profile.sportExperience ?
          "Sport-specific experience was recorded; general training history and recovery still guide loading." :
          "No sport-specific experience was provided."},
      consistency:{input:profile.consistency || "not sure",decision:
        highConsistencySetAdded ?
          "Added one set to the primary movement where it fit without cutting support work; the deload stays lower." :
          sportInSeason && profile.consistency === "high" ?
            "Kept volume at an in-season maintenance level; practices and games already add training load." :
          profile.consistency === "high" && (historyState.tooHard >= 2 ||
            historyState.lowRecovery || historyState.pain || profile.limitations) ?
            "Recovery or limitation signals held back the high-consistency volume increase." :
            profile.consistency === "high" ?
              "No extra set was added because the primary is time-based, at its set cap, or an increase would force support work out to meet the session limit." :
              profile.consistency === "low" || profile.consistency === "not-sure" ?
                "Reduced starting volume because recent consistency is uncertain." :
                "Used standard starting volume; high consistency is the only level that adds primary-movement volume."},
      equipment:{input:equipment,decision:"Every exercise passed required-equipment filtering; unavailable movements used explicit alternatives."},
      schedule:{input:{days:requestedDays,duration:profile.duration || 45},decision:
        "Placed " + trainingDays.length + " sessions and capped each at " +
        numeric(profile.duration, 45) + " minutes with " + exerciseLimit + " or fewer movements."},
      sportLoad:{input:sportLoadInput,decision:sportLoadDecision},
      age:{input:profile.age || "not sure",decision:impactLimit === "high" ?
        "No age-based impact reduction was required." :
        "Used conservative starting impact and volume."},
      limitations:{input:profile.limitations || "none",decision:profile.limitations ?
        "Used low-impact alternatives only; no diagnosis or rehabilitation prescription." :
        "No limitation-based substitution was required."},
      runningDetails:{input:{distance:profile.runDistance,weeklyVolume:profile.weeklyRunVolume,
        longest:profile.longestRun,race:profile.raceDetail},decision:
        sport === "running" || sport === "cross-country" ?
          numeric(profile.weeklyRunVolume, 0) < 10 ?
            "Recent running was under 10 minutes, so this block starts with walking and support work before adding run volume." :
            "Starting run duration was capped by recent weekly volume, longest comfortable run, and session time." :
          "Not applicable to this training focus."},
      strengthDetails:{input:{familiarity:profile.familiarity,workingWeights:profile.workingWeights},
        decision:sport === "strength" ?
          "Movement familiarity adjusted conservatism; optional working weights are carried as starting references, never max tests." :
          "Not applicable to this training focus."},
      preferredActivity:{input:profile.activity || "not provided",decision:
        sport === "general" && profile.activity && profile.activity !== "not-sure" ?
          "Preferred walking, cycling, or mobility changed conditioning/support selection." :
          "No activity preference changed the template."},
      history:{input:historyState.logs.length,decision:historyState.tooHard >= 2 ?
        "Repeated too-hard feedback held/reduced upcoming progression." :
        historyState.pain ?
          "Pain feedback moved future programming to low-impact exercise choices." :
        historyState.skipped ? "Missed work was not added as catch-up volume." :
          "No history-based reduction was required."},
      readiness:{input:historyState.readiness.length,decision:historyState.lowRecovery ?
        "Low recent readiness reduced first-block volume/frequency." :
        "No readiness-based reduction was required."}
    };

    var explanations = [
      "Your top goal sets " + focus + " work, including its sets, effort, and rest." +
        (sportGuidance ? " Sport-specific work prioritizes " + sportGuidance.demand + "." : ""),
      decisionTrace.sportLoad.decision,
      profile.limitations ? decisionTrace.limitations.decision :
        historyState.lowRecovery ? decisionTrace.readiness.decision :
          decisionTrace.equipment.decision
    ];

    return {
      version:5,
      path:PROGRAM_PATHS[sport] || PROGRAM_PATHS.general,
      name:unknownSport ? "General athletic development" :
        sport === "general" ? "General fitness development" :
          (SPORT_LABELS[sport] || sport.charAt(0).toUpperCase() + sport.slice(1)) + " development",
      focus:focus,
      summary:sportGuidance ?
        "A four-week adaptive block centered on " + sportGuidance.demand +
          (sportFocusId ?
            ". Your selected support priority stays present when safe; other support work rotates by phase." :
            ". The primary movement stays measurable while support work rotates by phase.") :
        "A four-week adaptive block: key movements stay measurable while support work, emphasis, and recovery change by phase.",
      profile:profile,
      currentWeek:1,
      first:weeks[0].sessions.length ? clone(weeks[0].sessions[0].exercises) : [],
      schedule:schedule,
      weeks:weeks,
      progression:historyState.tooHard >= 2 ?
        "Hold or reduce progression until effort is appropriate." :
        historyState.skipped ?
          "Resume the next scheduled session; missed work is not crammed into later days." :
          "Progress only after completed sessions feel appropriate—not merely because a week passed.",
      recovery:historyState.lowRecovery ?
        "Recent readiness is low. Choose rest, easy movement, or gentle mobility on recovery days." :
        sportSessionCount ?
          "Your " + sportSessionCount + " reported or scheduled sport sessions already count as workload. Adjacent recovery is intentionally easy or complete rest." :
          "Recovery days separate key sessions. Choose complete rest or optional easy movement based on readiness.",
      explanations:explanations,
      decisionTrace:decisionTrace,
      historyState:historyState,
      completedSessionIds:[],
      handledSessionIds:[],
      appliedFeedbackIds:[]
    };
  }

  function adaptSession(session, checkin) {
    checkin = checkin || {};
    var output = clone(session);
    var minutes = Math.max(10, numeric(checkin.minutesAvailable, session.minutes));
    var timeRatio = Math.min(1, minutes / session.minutes);
    var extraLoad = !!String(checkin.extraSportActivity || "").trim();
    var fatigued = checkin.energy === "low" || checkin.soreness === "high" || extraLoad;
    var keepCount = Math.max(1, Math.ceil(output.exercises.length * timeRatio));
    output.exercises = output.exercises.slice(0, keepCount);

    if (checkin.pain) {
      var replacements = [];
      output.exercises.forEach(function (item) {
        var source = findExercise(item.id);
        if (!source || source.impact === "low") {
          item.sets = Math.max(1, item.sets - 1);
          item.effort = "easy, pain-free only";
          replacements.push(item);
          return;
        }
        var replacement = chooseExercise(item.id, ["bodyweight"], "low");
        if (replacement && !replacements.some(function (existing) { return existing.id === replacement.id; })) {
          replacements.push({
            id:replacement.id,name:replacement.name,sets:1,reps:replacement.prescription.reps,
            rest:replacement.prescription.rest,effort:"easy, pain-free only",
            priority:item.priority,movementPattern:replacement.movementPattern,impact:replacement.impact
          });
        }
      });
      output.exercises = replacements;
    } else if (fatigued) {
      output.exercises.forEach(function (item) {
        item.sets = Math.max(1, item.sets - 1);
        item.effort = "easy to moderate; stop before fatigue";
      });
    }

    output.minutes = Math.min(session.minutes, minutes);
    output.adaptation = checkin.pain ?
      "Pain or discomfort was flagged, so higher-impact work was removed. Stop any painful movement and seek qualified guidance." :
      fatigued ?
        "Low energy, high soreness, or extra sport activity reduced today’s volume without rewriting the block." :
        timeRatio < 1 ?
          "Available time is shorter, so the priority work stays first and later support work is omitted." :
          "Your planned session remains appropriate today.";
    return output;
  }

  function applyEarnedProgression(week, focus, profile) {
    if (profile && profile.season === "in-season" && SPORT_GUIDANCE[profile.sport]) return;
    week.sessions.forEach(function (session) {
      session.exercises.forEach(function (item) {
        if (item.id === "easy-run") {
          item.reps = String(item.reps).replace(/^(\d+)/, function (match) {
            return String(Math.max(Number(match) + 1, Math.round(Number(match) * 1.05)));
          });
          return;
        }
        if ((focus === "strength" || focus === "muscle") && item.priority === "primary") {
          item.sets = Math.min(5, numeric(item.sets, 1) + 1);
          item.effort = "planned progression after appropriate completed work";
        } else if (focus === "power" && item.priority === "primary") {
          item.effort = "same volume; improve speed and landing quality";
        }
      });
      session.estimatedMinutes = fitSessionDuration(session.exercises, session.minutes).estimatedMinutes;
    });
  }

  function namespaceContinuationWeeks(weeks, blockNumber, firstWeekNumber) {
    return clone(weeks).map(function (week, index) {
      var globalWeek = firstWeekNumber + index;
      week.week = globalWeek;
      week.block = blockNumber;
      week.blockWeek = index + 1;
      week.sessions = (week.sessions || []).map(function (session) {
        var dayIndex = DAYS.indexOf(session.day);
        session.id = "block-" + blockNumber + "-week-" + (index + 1) + "-day-" + dayIndex;
        return session;
      });
      return week;
    });
  }

  function applyFeedback(plan, feedback) {
    var output = clone(plan);
    var sportInSeason = output.profile && output.profile.season === "in-season" &&
      !!SPORT_GUIDANCE[output.profile.sport];
    output.feedbackHistory = output.feedbackHistory || [];
    output.appliedFeedbackIds = output.appliedFeedbackIds || [];
    output.completedSessionIds = output.completedSessionIds || [];
    output.handledSessionIds = output.handledSessionIds || [];
    if (feedback.feedback_id && output.appliedFeedbackIds.indexOf(feedback.feedback_id) !== -1) {
      return output;
    }
    if (feedback.feedback_id) output.appliedFeedbackIds.push(feedback.feedback_id);
    output.feedbackHistory.push(clone(feedback));
    if (feedback.session_id && output.handledSessionIds.indexOf(feedback.session_id) === -1) {
      output.handledSessionIds.push(feedback.session_id);
    }
    if (feedback.session_id && output.completedSessionIds.indexOf(feedback.session_id) === -1 &&
        feedback.status !== "skipped") output.completedSessionIds.push(feedback.session_id);
    var tooHard = output.feedbackHistory.filter(function (item) {
      return item.difficulty === "too-hard";
    }).length;
    var currentWeekNumber = Math.max(1, numeric(output.currentWeek, 1));
    var current = output.weeks[currentWeekNumber - 1];
    var futureWeeks = output.weeks.slice(currentWeekNumber);
    if (tooHard >= 2 || feedback.pain) {
      futureWeeks.forEach(function (week) {
        week.sessions.forEach(function (session) {
          session.exercises.forEach(function (item) {
            item.sets = Math.max(1, item.sets - 1);
            item.effort = "held after feedback; keep effort appropriate";
          });
        });
      });
      output.progression = "Hold or reduce upcoming progression until effort is appropriate.";
    } else if (feedback.status === "skipped") {
      output.progression = "Resume the next scheduled session; skipped work is not crammed into another day.";
    } else if (feedback.status === "completed" && feedback.difficulty === "appropriate") {
      output.progression = "This session supports progression; finish the remaining scheduled work before the next week unlocks.";
    }

    var currentSessionIds = current ? current.sessions.map(function (session) {
      return session.id;
    }) : [];
    var weekHandled = currentSessionIds.length && currentSessionIds.every(function (sessionId) {
      return output.handledSessionIds.indexOf(sessionId) !== -1;
    });
    if (weekHandled && currentWeekNumber < output.weeks.length) {
      var currentFeedback = output.feedbackHistory.filter(function (item) {
        return currentSessionIds.indexOf(item.session_id) !== -1;
      });
      var earned = currentFeedback.length === currentSessionIds.length &&
        currentFeedback.every(function (item) {
          return item.status === "completed" && !item.pain && item.difficulty !== "too-hard";
        });
      if (earned && !sportInSeason) {
        applyEarnedProgression(output.weeks[currentWeekNumber], output.focus, output.profile);
        output.progression = "Week " + (currentWeekNumber + 1) +
          " unlocked with a small earned progression from completed, appropriate work.";
      } else if (earned && sportInSeason) {
        output.progression = "Week " + (currentWeekNumber + 1) +
          " unlocked at in-season maintenance volume; sport workload was not increased.";
      } else if (currentFeedback.some(function (item) { return item.status === "skipped"; })) {
        output.progression = "Week " + (currentWeekNumber + 1) +
          " unlocked at held volume; skipped work was not added as catch-up.";
      } else {
        output.progression = "Week " + (currentWeekNumber + 1) +
          " unlocked at held volume because at least one session was only partially completed.";
      }
      output.currentWeek = currentWeekNumber + 1;
    } else if (weekHandled && currentWeekNumber === output.weeks.length) {
      var finalFeedback = output.feedbackHistory.filter(function (item) {
        return currentSessionIds.indexOf(item.session_id) !== -1;
      });
      var finalEarned = finalFeedback.length === currentSessionIds.length &&
        finalFeedback.every(function (item) {
          return item.status === "completed" && !item.pain && item.difficulty !== "too-hard";
        });
      var nextBlock = generate(output.profile, {workoutLogs:output.feedbackHistory});
      var blockNumber = Math.max.apply(null, output.weeks.map(function (week) {
        return numeric(week.block, 1);
      })) + 1;
      var nextWeeks = namespaceContinuationWeeks(nextBlock.weeks, blockNumber, currentWeekNumber + 1);
      if (finalEarned && !sportInSeason) {
        applyEarnedProgression(nextWeeks[0], output.focus, output.profile);
      }
      output.weeks = output.weeks.concat(nextWeeks);
      output.currentWeek = currentWeekNumber + 1;
      output.progression = finalEarned ?
        sportInSeason ?
          "A new adaptive block unlocked at in-season maintenance volume; future support work changed while the primary movement remains measurable." :
          "A new adaptive block unlocked with an earned progression. Future support work changed while the primary movement remains measurable." :
        "A new adaptive block unlocked at held volume. Feedback shaped the next phase; skipped or difficult work was not added as catch-up.";
    }
    return output;
  }

  var api = {
    exerciseDatabase:EXERCISES,
    sportFocusSupport:SPORT_FOCUS_SUPPORT,
    generate:generate,
    adaptSession:adaptSession,
    applyFeedback:applyFeedback,
    parseWorkload:parseWorkload
  };
  root.ALEFITTrainingEngine = api;
  if (typeof module !== "undefined") module.exports = api;
}(typeof window !== "undefined" ? window : global));