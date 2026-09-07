(function (root) {
  "use strict";

  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DAY_ALIASES = [
    ["monday", "mon"], ["tuesday", "tue"], ["wednesday", "wed"],
    ["thursday", "thu"], ["friday", "fri"], ["saturday", "sat"], ["sunday", "sun"]
  ];
  var SUPPORTED_SPORTS = ["basketball", "running", "cross-country", "strength", "general"];
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
    general: "/programs/strength.html"
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
    exercise({id:"easy-cycle",name:"Easy cycle",movementPattern:"conditioning",requiredEquipment:["gym"],difficulty:"beginner",prerequisites:[],qualities:["endurance"],impact:"low",fatigue:"low",alternatives:["brisk-walk"],prescription:{sets:[1,1],reps:"15–45 min",rest:"—"}}),
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
        primary === "speed") return "power";
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
    var lowRecovery = readiness.some(function (entry) {
      var energy = entry.energy || entry.energy_level;
      var soreness = entry.soreness || entry.soreness_level;
      var score = numeric(entry.score != null ? entry.score : entry.total, 100);
      return energy === "low" || soreness === "high" || score < 55;
    });
    return {logs:logs, readiness:readiness, tooHard:tooHard, skipped:skipped, lowRecovery:lowRecovery};
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

  function prescribedSets(focus, profile, week, historyState) {
    var novice = profile.experience === "new" || profile.experience === "not-sure" ||
      profile.consistency === "low" || profile.consistency === "not-sure" ||
      profile.familiarity === "not-sure" || profile.familiarity === "basic";
    var sets = focus === "muscle" ? (novice ? 3 : 4) :
      focus === "strength" ? (novice ? 2 : 4) :
      focus === "power" ? (novice ? 2 : 3) : (novice ? 2 : 3);
    if (profile.experience === "advanced" && week < 4 &&
        (focus === "strength" || focus === "muscle")) sets += 1;
    if (week === 4) sets -= 1;
    if (historyState.tooHard >= 2 || historyState.lowRecovery) sets -= 1;
    return Math.max(1, Math.min(5, sets));
  }

  function strengthPrescription(focus, profile, week, historyState) {
    var sets = prescribedSets(focus, profile, week, historyState);
    if (focus === "strength") {
      return {sets:sets,reps:"5–6",rest:"2–4 min",
        effort:week === 4 ? "RPE 5–6" : "RPE 7"};
    }
    if (focus === "muscle") {
      return {sets:sets,reps:week === 4 ? "8" : "8–12",rest:"75–120 sec",
        effort:week === 4 ? "RPE 6" : "RPE 7–8"};
    }
    if (focus === "power") {
      return {sets:sets,reps:"3–5 quality reps",rest:"2–3 min",
        effort:week === 4 ? "fast, low volume" : "fast; stop before speed drops"};
    }
    return {sets:sets,reps:"6–10",rest:"60–90 sec",
      effort:week === 4 ? "RPE 5–6" : "RPE 6–7"};
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

  function prescribeExercise(item, focus, profile, week, historyState, runSessionCount) {
    var prescription = strengthPrescription(focus, profile, week, historyState);
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
        effort:"RPE 6–7; never all-out"};
    }
    if (item.qualities.indexOf("endurance") !== -1 && item.movementPattern === "locomotion") {
      return {sets:1,reps:Math.min(30, numeric(profile.duration, 45) - 10) + " min",
        rest:"—",effort:"conversational"};
    }
    if (item.qualities.indexOf("power") !== -1) {
      return {sets:prescribedSets("power", profile, week, historyState),
        reps:"3–5 quality reps",rest:"2–3 min",
        effort:week === 4 ? "fast, low volume" : "fast; stop before speed drops"};
    }
    if ((focus === "strength" || focus === "muscle") &&
        item.qualities.indexOf(focus) !== -1) return prescription;
    return {
      sets:Math.min(week === 4 ? 2 : 3, prescribedSets(focus, profile, week, historyState)),
      reps:item.prescription.reps,
      rest:item.prescription.rest,
      effort:week === 4 ? "easy, controlled" : "RPE 6–7"
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
    var equipment = normalizeEquipment(profile.equipment);
    var focus = focusFor(profile);
    var workload = parseWorkload(profile.load);
    var historyState = recentState(context);
    var requestedDays = Math.max(2, Math.min(4, numeric(profile.days, 3)));
    var impactLimit = profile.limitations ? "low" :
      profile.age === "under18" || profile.age === "55plus" ||
      profile.experience === "new" || profile.experience === "not-sure" ? "medium" : "high";
    var conservative = impactLimit !== "high" || profile.consistency === "low" ||
      profile.consistency === "not-sure" || profile.familiarity === "not-sure" ||
      profile.familiarity === "basic" || historyState.lowRecovery;
    var safeDays = requestedDays;
    if (profile.season === "in-season" || historyState.lowRecovery ||
        Object.keys(workload).length >= 4) safeDays = Math.min(safeDays, 2);
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
    var stableExercises = [];
    baseExerciseIds(profile, focus).forEach(function (id) {
      var selected = chooseExercise(id, equipment, impactLimit);
      if (selected && !stableExercises.some(function (existing) { return existing.id === selected.id; })) {
        stableExercises.push(selected);
      }
    });
    stableExercises = stableExercises.slice(0, exerciseLimit);

    var weeks = [];
    for (var week = 1; week <= 4; week += 1) {
      var sessions = trainingDays.map(function (dayIndex, sessionIndex) {
        var sessionExercises = stableExercises.map(function (item, exerciseIndex) {
          var prescription = prescribeExercise(
            item, focus, profile, week, historyState, trainingDays.length
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
            tempo, "endurance", profile, week, historyState, trainingDays.length
          ));
        }
        var fitted = fitSessionDuration(sessionExercises, numeric(profile.duration, 45));
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
        label:week === 1 ? "Technique and baseline" :
          week === 2 ? "Repeat and build" :
          week === 3 ? "Progress with control" : "Deload and assess",
        sessions:sessions,
        progression:week === 1 ? "Keep the key exercises stable and record a baseline." :
          week === 2 ? "Repeat the same key IDs; add only the prescribed volume when prior effort was appropriate." :
          week === 3 ? "Use a small load, rep, or running-duration increase only after completed appropriate sessions." :
          "Keep the same patterns and reduce volume for recovery."
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
    var unknownSport = sport !== "general" && SUPPORTED_SPORTS.indexOf(sport) === -1;
    var decisionTrace = {
      sport:{input:sport,decision:unknownSport ?
        "Used honest general athletic-development rules; no expert-specific claim." :
        "Selected the supported " + sport + " training template."},
      goals:{input:profile.goals || [],decision:"The first goal set " + focus +
        " prescriptions; later goals changed support exercise selection."},
      positionOrEvent:{input:profile.position || "not provided",decision:recognizedRole ?
        "Recognized basketball role changed the drill and strength emphasis." :
        "Unknown or optional role used the general template without guessing."},
      season:{input:profile.season || "not sure",decision:profile.season === "in-season" ?
        "Capped ALEFIT work at two days around sport demand." :
        "Used the requested safe frequency."},
      experience:{input:profile.experience || "not sure",decision:conservative ?
        "Started with lower volume/impact." : "Used standard starting volume."},
      consistency:{input:profile.consistency || "not sure",decision:
        profile.consistency === "low" || profile.consistency === "not-sure" ?
          "Reduced starting volume because recent consistency is uncertain." :
          "Allowed measured week-to-week progression."},
      equipment:{input:equipment,decision:"Every exercise passed required-equipment filtering; unavailable movements used explicit alternatives."},
      schedule:{input:{days:requestedDays,duration:profile.duration || 45},decision:
        "Placed " + trainingDays.length + " sessions and capped each at " +
        numeric(profile.duration, 45) + " minutes with " + exerciseLimit + " or fewer movements."},
      sportLoad:{input:profile.load || "none",decision:Object.keys(workload).length ?
        "Practices/games were treated as workload; ALEFIT sessions avoid those days and protect competition-adjacent recovery." :
        "Training was spaced across otherwise open days."},
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
        sport === "general" && profile.activity ?
          "Preferred walking, cycling, or mobility changed conditioning/support selection." :
          "No activity preference changed the template."},
      history:{input:historyState.logs.length,decision:historyState.tooHard >= 2 ?
        "Repeated too-hard feedback held/reduced upcoming progression." :
        historyState.skipped ? "Missed work was not added as catch-up volume." :
          "No history-based reduction was required."},
      readiness:{input:historyState.readiness.length,decision:historyState.lowRecovery ?
        "Low recent readiness reduced first-block volume/frequency." :
        "No readiness-based reduction was required."}
    };

    var explanations = [
      "Your top goal sets " + focus + " work, including its sets, effort, and rest.",
      Object.keys(workload).length ?
        "Existing sport days count as hard workload, so ALEFIT sessions were placed on open days." :
        "ALEFIT sessions are spaced across open days so recovery remains part of the plan.",
      profile.limitations ? decisionTrace.limitations.decision :
        historyState.lowRecovery ? decisionTrace.readiness.decision :
          decisionTrace.equipment.decision
    ];

    return {
      version:3,
      path:PROGRAM_PATHS[sport] || PROGRAM_PATHS.general,
      name:unknownSport ? "General athletic development" :
        sport === "general" ? "General fitness development" :
          sport.charAt(0).toUpperCase() + sport.slice(1) + " development",
      focus:focus,
      summary:"A four-week block with repeatable key exercises, enforced constraints, and feedback-led progression.",
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
        Object.keys(workload).length ?
          "Your " + Object.keys(workload).length + " sport sessions already count as workload. Adjacent recovery is intentionally easy or complete rest." :
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

  function applyEarnedProgression(week, focus) {
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

  function applyFeedback(plan, feedback) {
    var output = clone(plan);
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
      if (earned) {
        applyEarnedProgression(output.weeks[currentWeekNumber], output.focus);
        output.progression = "Week " + (currentWeekNumber + 1) +
          " unlocked with a small earned progression from completed, appropriate work.";
      } else if (currentFeedback.some(function (item) { return item.status === "skipped"; })) {
        output.progression = "Week " + (currentWeekNumber + 1) +
          " unlocked at held volume; skipped work was not added as catch-up.";
      } else {
        output.progression = "Week " + (currentWeekNumber + 1) +
          " unlocked at held volume because at least one session was only partially completed.";
      }
      output.currentWeek = currentWeekNumber + 1;
    }
    return output;
  }

  var api = {
    exerciseDatabase:EXERCISES,
    generate:generate,
    adaptSession:adaptSession,
    applyFeedback:applyFeedback,
    parseWorkload:parseWorkload
  };
  root.ALEFITTrainingEngine = api;
  if (typeof module !== "undefined") module.exports = api;
}(typeof window !== "undefined" ? window : global));