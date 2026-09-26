"use strict";

const assert = require("assert");
const engine = require("../training-engine.js");

const base = {
  sport: "general",
  goals: ["fitness"],
  equipment: ["bodyweight"],
  days: 3,
  duration: 45,
  experience: "regular",
  consistency: "steady",
  age: "adult"
};

function plan(profile, context) {
  return engine.generate(Object.assign({}, base, profile), context || {});
}

function firstIds(result) {
  return result.first.map((item) => item.id);
}

function firstSets(result) {
  return result.first.reduce((sum, item) => sum + Number(item.sets || 0), 0);
}

function workoutSignatures(result) {
  return result.weeks.flatMap((week) => week.sessions.map((session) =>
    session.exercises.map((item) => item.id).sort().join("|")
  ));
}

function assertAllEquipmentAllowed(result, allowed) {
  const actualAllowed = allowed.concat(["bodyweight"]);
  result.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      session.exercises.forEach((prescribed) => {
        const source = engine.exerciseDatabase.find((item) => item.id === prescribed.id);
        assert(source, `unknown exercise id ${prescribed.id}`);
        assert(
          source.requiredEquipment.some((item) => actualAllowed.includes(item)),
          `${prescribed.id} requires unavailable equipment`
        );
      });
    });
  });
}

// Profile A: beginner basketball athlete, dumbbells, two ALEFIT days, three practices.
const profileA = plan({
  sport: "basketball",
  position: "guard",
  goals: ["jump", "durability"],
  equipment: ["dumbbells"],
  days: 2,
  duration: 45,
  experience: "new",
  consistency: "low",
  season: "in-season",
  load: "practice Tue, practice Thu, practice Sat"
});
assert.equal(profileA.weeks[0].sessions.length, 2);
assert.equal(profileA.schedule.filter((day) => day.type === "sport").length, 3);
assert(!firstIds(profileA).includes("acceleration"), "beginner without field should not receive field sprints");
assert(firstIds(profileA).includes("wall-march"), "field sprint should use a low-impact home alternative");
assertAllEquipmentAllowed(profileA, ["dumbbells"]);

// Profile B: experienced off-season basketball athlete with full gym/court and power goal.
const profileB = plan({
  sport: "basketball",
  position: "guard",
  goals: ["power", "strength"],
  equipment: ["gym", "field", "dumbbells"],
  days: 4,
  duration: 60,
  experience: "advanced",
  consistency: "high",
  season: "off-season",
  load: ""
});
assert.equal(profileB.weeks[0].sessions.length, 4);
assert(firstIds(profileB).includes("acceleration"));
assert(firstSets(profileB) > firstSets(profileA));
assert(profileB.first.some((item) => /fast/.test(item.effort)));
assertAllEquipmentAllowed(profileB, ["gym", "field", "dumbbells"]);

// Profile C: beginner runner preparing for a first 5K with low recent volume.
const profileC = plan({
  sport: "running",
  goals: ["conditioning", "durability"],
  runDistance: "5K",
  weeklyRunVolume: 30,
  longestRun: 12,
  equipment: ["bodyweight"],
  days: 3,
  duration: 45,
  experience: "new",
  consistency: "low",
  season: "off-season"
});
assert.equal(profileC.first[0].id, "easy-run");
assert.equal(profileC.first[0].reps, "10 min easy");
assert(profileC.weeks[2].sessions[0].exercises[0].reps.startsWith("10 min"));
assert(profileC.weeks[3].sessions[0].exercises[0].reps.startsWith("8 min"));
assert(
  profileC.weeks[0].sessions.reduce((sum, session) => {
    return sum + Number(session.exercises[0].reps.match(/^\d+/)[0]);
  }, 0) <= profileC.profile.weeklyRunVolume
);

// Profile D: experienced lifter seeking muscle with 30-minute sessions.
const profileD = plan({
  sport: "strength",
  goals: ["muscle", "strength"],
  equipment: ["gym"],
  days: 3,
  duration: 30,
  experience: "advanced",
  consistency: "high",
  familiarity: "confident",
  workingWeights: "Back squat 135 lb"
});
assert.equal(profileD.first.length, 3);
assert(profileD.first.every((item) => item.reps === "8–12"));
assert(profileD.first.every((item) => item.startingLoad === "Back squat 135 lb"));
assert(profileD.first.every((item) => item.rest === "75–120 sec"));

// Profile E: bodyweight-only general fitness at home.
const profileE = plan({
  sport: "general",
  goals: ["fitness", "movement"],
  activity: "walking",
  equipment: ["bodyweight"],
  days: 3,
  duration: 45,
  experience: "new",
  consistency: "not-sure"
});
assert(firstIds(profileE).includes("brisk-walk"));
assert(!profileE.first.some((item) => /Back squat|Dumbbell|Bench press/.test(item.name)));
assertAllEquipmentAllowed(profileE, ["bodyweight"]);

// The five profiles must differ in structure, exercises, volume/effort, recovery, and progression.
assert.notDeepEqual(firstIds(profileA), firstIds(profileB));
assert.notDeepEqual(firstIds(profileB), firstIds(profileC));
assert.notDeepEqual(firstIds(profileC), firstIds(profileD));
assert.notDeepEqual(firstIds(profileD), firstIds(profileE));
assert.notEqual(profileA.weeks[0].sessions.length, profileB.weeks[0].sessions.length);
assert.notEqual(profileB.focus, profileC.focus);
assert.notEqual(profileC.first[0].effort, profileD.first[0].effort);
assert.notEqual(profileA.recovery, plan(Object.assign({}, profileA.profile, {load:""})).recovery);

// Every block has four populated weeks, stable key exercise IDs, and a lower-volume deload.
[profileA, profileB, profileC, profileD, profileE].forEach((result) => {
  assert.equal(result.weeks.length, 4);
  assert.equal(result.explanations.length, 3);
  result.weeks.forEach((week) => assert(week.sessions.length > 0));
  result.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      assert(session.estimatedMinutes <= session.minutes, "session must fit its stated time");
    });
  });
  const signatures = workoutSignatures(result);
  assert.equal(
    new Set(signatures).size,
    signatures.length,
    `${result.name} should not repeat a full workout during the four-week block`
  );
  const primaryIds = result.weeks.map((week) => week.sessions[0].exercises[0].id);
  assert.equal(new Set(primaryIds).size, 1, "primary exercise should repeat across the block");
  const weekThreeSets = Number(result.weeks[2].sessions[0].exercises[0].sets);
  const deloadSets = Number(result.weeks[3].sessions[0].exercises[0].sets);
  if (result.weeks[2].sessions[0].exercises[0].id !== "easy-run") {
    assert(deloadSets < weekThreeSets, "week four should deload set volume");
  }
});

// Weekly programming has explicit phases, controlled support rotation, and a stable primary movement.
assert.deepEqual(
  profileB.weeks.map((week) => week.phase),
  ["foundation", "build", "performance", "deload"]
);
assert(profileB.weeks.every((week) => week.emphasis && week.progression));
assert.equal(
  new Set(profileB.weeks.map((week) => week.sessions[0].exercises[0].id)).size,
  1,
  "phase changes must preserve the primary movement"
);
assert.notDeepEqual(
  profileB.weeks[0].sessions[0].exercises.slice(1).map((item) => item.id),
  profileB.weeks[1].sessions[0].exercises.slice(1).map((item) => item.id),
  "build phase should rotate support work"
);
assert(
  Number(profileB.weeks[3].sessions[0].exercises[0].sets) <
  Number(profileB.weeks[2].sessions[0].exercises[0].sets),
  "deload should reduce volume after the intensification/performance phase"
);

// One input at a time: equipment changes incompatible movements.
const withGym = plan({sport:"strength", goals:["strength"], equipment:["gym"], experience:"advanced"});
const withoutGym = plan({sport:"strength", goals:["strength"], equipment:["bodyweight"], experience:"advanced"});
assert(firstIds(withGym).includes("back-squat"));
assert(!firstIds(withoutGym).includes("back-squat"));
assertAllEquipmentAllowed(withoutGym, ["bodyweight"]);

// One input at a time: shorter time reduces actual prescribed work.
const twentyMinutes = plan({duration:20});
const fortyFiveMinutes = plan({duration:45});
assert(twentyMinutes.first.length < fortyFiveMinutes.first.length);

// One input at a time: adding a game occupies the day and protects adjacent recovery.
const noGame = plan({days:3, load:""});
const game = plan({days:3, load:"game Saturday"});
assert.equal(game.schedule[5].type, "sport");
assert.equal(game.schedule[4].type, "recovery");
assert.notDeepEqual(
  noGame.weeks[0].sessions.map((item) => item.day),
  game.weeks[0].sessions.map((item) => item.day)
);

// Branching answers each change a real plan decision.
assert.notDeepEqual(
  firstIds(plan({sport:"basketball", position:"guard", goals:["power"], equipment:["field", "gym"]})),
  firstIds(plan({sport:"basketball", position:"center", goals:["power"], equipment:["field", "gym"]}))
);
const soccerForward = plan({
  sport:"soccer", sportDetail:"forward", goals:["speed"], equipment:["field"], days:2
});
const soccerGoalkeeper = plan({
  sport:"soccer", sportDetail:"goalkeeper", goals:["agility"], equipment:["bodyweight"], days:2
});
assert.equal(soccerForward.first[0].id, "acceleration");
assert.equal(soccerGoalkeeper.first[0].id, "snap-down");
assert(soccerForward.decisionTrace.positionOrEvent.changedPrimary);
assert.equal(soccerForward.decisionTrace.positionOrEvent.input, "forward");
assert.equal(new Set(soccerForward.weeks.map((week) => week.sessions[0].exercises[0].id)).size, 1);
const butterflySwimmer = plan({
  sport:"swimming", sportDetail:"butterfly", goals:["mobility"], equipment:["bodyweight"]
});
assert.equal(butterflySwimmer.decisionTrace.positionOrEvent.input, "butterfly");
assert(/adjusts conditioning guidance/i.test(butterflySwimmer.decisionTrace.positionOrEvent.decision));
assert(/For butterfly, keep pool technique work primary/i.test(butterflySwimmer.weeks[0].conditioning));
const strengthStyleCases = [
  ["powerlifting", "back-squat"],
  ["olympic-lifting-base", "back-squat"],
  ["bodybuilding", "bench-press"],
  ["powerbuilding", "rdl"],
  ["calisthenics", "push-up"],
  ["strongman", "farmer-carry"],
  ["dumbbell-strength", "goblet-squat"],
  ["barbell-strength", "back-squat"],
  ["resistance-band-strength", "band-press"],
  ["kettlebell-strength", "kettlebell-deadlift"],
  ["functional-strength", "split-squat"],
  ["athletic-strength", "broad-jump"],
  ["muscular-endurance", "tempo-squat"],
  ["isometric-strength", "wall-sit"],
  ["strength-circuits", "goblet-squat"],
  ["general-strength", "goblet-squat"]
];
strengthStyleCases.forEach(([style, expectedPrimary]) => {
  const strengthStylePlan = plan({
    sport:"strength", sportDetail:style, goals:["strength"],
    equipment:["gym", "dumbbells", "bands", "kettlebell", "field"],
    days:2, duration:90, experience:"regular", consistency:"steady"
  });
  assert.equal(strengthStylePlan.first[0].id, expectedPrimary, `${style} selects its intended primary movement`);
  assert(strengthStylePlan.weeks[0].emphasis.includes("Strength style:"));
  assert(strengthStylePlan.decisionTrace.positionOrEvent.changedPrimary);
  assertAllEquipmentAllowed(strengthStylePlan, ["gym", "dumbbells", "bands", "kettlebell", "field"]);
});
const powerliftingStyle = plan({
  sport:"strength", sportDetail:"powerlifting", goals:["strength"],
  equipment:["gym"], experience:"regular"
});
assert.equal(powerliftingStyle.first[0].reps, "4–6");
const circuitStyle = plan({
  sport:"strength", sportDetail:"strength-circuits", goals:["strength"],
  equipment:["gym", "dumbbells"], experience:"regular"
});
assert.equal(circuitStyle.first[0].reps, "8–12");
assert.equal(circuitStyle.first[0].rest, "60–90 sec");
const isometricStyle = plan({
  sport:"strength", sportDetail:"isometric-strength", goals:["strength"],
  equipment:["bodyweight"], experience:"regular"
});
assert.equal(isometricStyle.first[0].reps, "20–45 sec");
const strongmanStyle = plan({
  sport:"strength", sportDetail:"strongman", goals:["strength"],
  equipment:["dumbbells"], experience:"regular"
});
assert.equal(strongmanStyle.first[0].reps, "20–40 m");
const kettlebellWithoutKit = plan({
  sport:"strength", sportDetail:"kettlebell-strength", goals:["strength"],
  equipment:["bodyweight"], days:2
});
assert.equal(kettlebellWithoutKit.first[0].id, "hip-hinge",
  "a strength style must fall back to available safe equipment");
assert.equal(Object.keys(engine.sportFocusSupport).length, 21);
Object.keys(engine.sportFocusSupport).forEach((sport) => {
  engine.sportFocusSupport[sport].forEach((id) => {
    assert(
      engine.exerciseDatabase.some((item) => item.id === id),
      `${sport} support focus references missing exercise ${id}`
    );
  });
});
const focusedSoccer = plan({
  sport:"soccer", sportDetail:"forward", sportFocus:"calf-raise",
  goals:["speed"], equipment:["field"], days:2, duration:90
});
assert.equal(focusedSoccer.first[0].id, "acceleration");
assert(
  focusedSoccer.weeks.every((week) => week.sessions.every((session) =>
    session.exercises.some((item) => item.id === "calf-raise")
  )),
  "the selected sport support focus should persist across phases"
);
assert.equal(
  new Set(focusedSoccer.weeks.map((week) => week.sessions[0].exercises[0].id)).size,
  1,
  "the sport-selected primary must stay stable across the block"
);
const highSportLoad = plan({
  sport:"soccer", goals:["speed"], equipment:["field"], days:4, duration:90,
  season:"off-season", sportSessionsPerWeek:5, sportSessionMinutes:60,
  sportIntensity:"moderate"
});
assert.equal(highSportLoad.weeks[0].sessions.length, 2);
assert(highSportLoad.weeks[0].sessions.every((session) => session.exercises.length <= 3));
assert(/5 sport sessions per week/.test(highSportLoad.decisionTrace.sportLoad.decision));
const longModerateLoad = plan({
  sport:"soccer", goals:["speed"], equipment:["field"], days:4, duration:90,
  season:"off-season", sportSessionsPerWeek:3, sportSessionMinutes:90,
  sportIntensity:"moderate"
});
assert.equal(longModerateLoad.weeks[0].sessions.length, 3);
assert(longModerateLoad.weeks[0].sessions.every((session) => session.exercises.length <= 3));
const newToSport = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:2, duration:90,
  experience:"advanced", familiarity:"confident", sportExperience:"new-to-sport"
});
const experiencedInSport = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:2, duration:90,
  experience:"advanced", familiarity:"confident", sportExperience:"4-plus-years"
});
assert(
  Number(newToSport.first[0].sets) < Number(experiencedInSport.first[0].sets),
  "sport-specific beginners should start with fewer sets"
);
const trailRunner = plan({
  sport:"running", sportDetail:"trail", goals:["conditioning"], weeklyRunVolume:40,
  longestRun:25, equipment:["bodyweight"], days:2
});
assert(/On trails, judge effort rather than pace/i.test(trailRunner.weeks[0].conditioning));
assert(
  plan({sport:"basketball", season:"in-season", days:4}).weeks[0].sessions.length <
  plan({sport:"basketball", season:"off-season", days:4}).weeks[0].sessions.length
);
assert(
  firstSets(plan({sport:"strength", goals:["strength"], experience:"advanced", familiarity:"confident"})) >
  firstSets(plan({sport:"strength", goals:["strength"], experience:"new", familiarity:"not-sure"}))
);
assert(
  firstSets(plan({sport:"strength", goals:["strength"], consistency:"high"})) >
  firstSets(plan({sport:"strength", goals:["strength"], consistency:"low"}))
);
const consistentStrength = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:3, duration:90,
  experience:"regular", familiarity:"confident", consistency:"medium"
});
const highlyConsistentStrength = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:3, duration:90,
  experience:"regular", familiarity:"confident", consistency:"high"
});
assert.equal(
  Number(highlyConsistentStrength.weeks[0].sessions[0].exercises[0].sets),
  Number(consistentStrength.weeks[0].sessions[0].exercises[0].sets) + 1,
  "high consistency should add one set to the primary movement"
);
assert.deepEqual(
  highlyConsistentStrength.weeks[0].sessions[0].exercises.slice(1).map((item) => item.sets),
  consistentStrength.weeks[0].sessions[0].exercises.slice(1).map((item) => item.sets),
  "the high-consistency increase should not inflate support work"
);
assert.equal(
  Number(highlyConsistentStrength.weeks[3].sessions[0].exercises[0].sets),
  Number(consistentStrength.weeks[3].sessions[0].exercises[0].sets),
  "the deload week should not receive the extra set"
);
assert(/Added one set to the primary movement/i.test(
  highlyConsistentStrength.decisionTrace.consistency.decision
));
const consistentGuard = plan({
  sport:"basketball", position:"guard", goals:["jump", "quickness"],
  equipment:["gym", "field"], days:3, duration:60, experience:"regular",
  consistency:"medium", season:"off-season", load:"practice Tue, practice Thu, game Saturday",
  age:"under18"
});
const highlyConsistentGuard = plan({
  sport:"basketball", position:"guard", goals:["jump", "quickness"],
  equipment:["gym", "field"], days:3, duration:60, experience:"regular",
  consistency:"high", season:"off-season", load:"practice Tue, practice Thu, game Saturday",
  age:"under18"
});
assert.equal(highlyConsistentGuard.first[0].id, "wall-march");
assert.equal(
  Number(highlyConsistentGuard.first[0].sets),
  Number(consistentGuard.first[0].sets) + 1,
  "a low-impact, seconds-based primary movement should accept the measured increase"
);
const highConsistencyLowRecovery = engine.generate(highlyConsistentStrength.profile, {
  readiness:[{energy:"low", soreness:"high", score:40}]
});
assert(/held back/i.test(highConsistencyLowRecovery.decisionTrace.consistency.decision));
assert(
  Number(highConsistencyLowRecovery.weeks[0].sessions[0].exercises[0].sets) <
  Number(highlyConsistentStrength.weeks[0].sessions[0].exercises[0].sets),
  "low recovery should suppress the high-consistency volume increase"
);
assert.notDeepEqual(
  firstIds(plan({sport:"general", activity:"cycling", equipment:["gym"]})),
  firstIds(plan({sport:"general", activity:"mobility", equipment:["gym"]}))
);
assert.notDeepEqual(
  firstIds(plan({sport:"strength", goals:["strength", "mobility"], equipment:["gym"]})),
  firstIds(plan({sport:"strength", goals:["strength", "conditioning"], equipment:["gym"]}))
);

// Every focus offered by the builder is recognized by the generator.
const builderSports = [
  "basketball", "football", "soccer", "baseball", "swimming", "track",
  "running", "cross-country", "volleyball", "tennis", "rugby", "lacrosse",
  "hockey", "golf", "cycling", "rowing", "combat-sports",
  "strength", "hiit", "mobility", "general"
];
builderSports.forEach((sport) => {
  const result = plan({sport});
  assert(
    !/general athletic-development rules/i.test(result.decisionTrace.sport.decision),
    `${sport} should be recognized as a supported training focus`
  );
});

// Unique workout selection also holds for low-equipment, short-session plans across sports.
const fullEquipmentSet = ["gym", "field", "dumbbells", "bands", "kettlebell", "bike", "rower", "pool"];
builderSports.forEach((sport) => {
  [["bodyweight"], fullEquipmentSet].forEach((equipment) => {
    [20, 45].forEach((duration) => {
      const result = plan({
        sport,
        goals:["fitness"],
        equipment,
        days:sport === "running" || sport === "cross-country" ? 2 : 4,
        duration,
        experience:"regular",
        consistency:"steady",
        weeklyRunVolume:120,
        longestRun:50
      });
      const signatures = workoutSignatures(result);
      assert.equal(
        new Set(signatures).size,
        signatures.length,
        `${sport} should not repeat full workouts with ${equipment.join(", ")} in ${duration} minutes`
      );
      result.weeks.forEach((week) => week.sessions.forEach((session) => {
        assert(session.estimatedMinutes <= session.minutes);
      }));
      assertAllEquipmentAllowed(result, equipment);
    });
  });
});

// New sports use sport-relevant starting movements, equipment, and plan routing.
const expandedSportCases = [
  {sport:"volleyball", goal:"jump", equipment:["bodyweight"], primary:"snap-down", label:"Volleyball"},
  {sport:"football", goal:"power", equipment:["field", "gym"], primary:"acceleration", label:"Football", path:"/programs/football.html"},
  {sport:"soccer", goal:"agility", equipment:["bodyweight"], primary:"lateral-step", label:"Soccer", path:"/programs/soccer.html"},
  {sport:"baseball", goal:"power", equipment:["bodyweight"], primary:"standing-rotation", label:"Baseball", path:"/programs/baseball.html"},
  {sport:"track", goal:"speed", equipment:["field"], primary:"acceleration", label:"Track", path:"/programs/track.html"},
  {sport:"tennis", goal:"speed", equipment:["field", "bands"], primary:"lateral-step", label:"Tennis"},
  {sport:"rugby", goal:"power", equipment:["field"], primary:"acceleration", label:"Rugby"},
  {sport:"lacrosse", goal:"agility", equipment:["field"], primary:"acceleration", label:"Lacrosse"},
  {sport:"hockey", goal:"speed", equipment:["field"], primary:"acceleration", label:"Hockey"},
  {sport:"golf", goal:"mobility", equipment:["bands"], primary:"mobility-flow", label:"Golf"},
  {sport:"cycling", goal:"conditioning", equipment:["bike"], primary:"easy-cycle", label:"Cycling"},
  {sport:"rowing", goal:"conditioning", equipment:["rower", "bands"], primary:"easy-row", label:"Rowing"},
  {sport:"combat-sports", goal:"conditioning", equipment:["bodyweight"], primary:"lateral-step", label:"Combat sports"}
];
expandedSportCases.forEach((item) => {
  const result = plan({
    sport:item.sport,
    goals:[item.goal],
    equipment:item.equipment,
    days:2
  });
  assert(firstIds(result).includes(item.primary), `${item.sport} should use its relevant primary exercise`);
  assert.equal(result.name, `${item.label} development`);
  assert.equal(result.path, item.path || "/my-plan.html");
  assertAllEquipmentAllowed(result, item.equipment);
});
expandedSportCases.forEach((item) => {
  const result = plan({sport:item.sport, goals:[item.goal], equipment:item.equipment});
  assert(result.decisionTrace.sport.demand, `${item.sport} should explain its sport-specific needs`);
  assert(
    result.weeks[0].emphasis.includes("Sport-specific priority"),
    `${item.sport} should carry its priorities into the phase plan`
  );
  assert(
    result.summary.includes(result.decisionTrace.sport.demand),
    `${item.sport} should explain its focus in the plan summary`
  );
});
assert(
  plan({sport:"cycling", goals:["conditioning"], equipment:["bike"]}).first[0].effort === "conversational"
);
assert(
  plan({sport:"rowing", goals:["conditioning"], equipment:["rower"]}).first[0].effort === "conversational"
);
assert.equal(plan({sport:"soccer", goals:["agility"]}).focus, "power");

// In-season plans reduce session count and total movement volume, then hold earned progression at maintenance.
const inSeasonSoccer = plan({
  sport:"soccer", goals:["speed"], equipment:["field", "gym"], season:"in-season",
  days:4, duration:60, experience:"regular", consistency:"high"
});
const offSeasonSoccer = plan({
  sport:"soccer", goals:["speed"], equipment:["field", "gym"], season:"off-season",
  days:4, duration:60, experience:"regular", consistency:"high"
});
assert.equal(inSeasonSoccer.weeks[0].sessions.length, 2);
assert.equal(offSeasonSoccer.weeks[0].sessions.length, 4);
assert(inSeasonSoccer.weeks[0].sessions.every((session) => session.exercises.length <= 3));
assert(
  inSeasonSoccer.first.reduce((total, item) => total + Number(item.sets), 0) <
    offSeasonSoccer.first.reduce((total, item) => total + Number(item.sets), 0),
  "in-season sessions should use less total movement volume"
);
assert(/in-season maintenance/i.test(inSeasonSoccer.decisionTrace.season.decision));
const inSeasonWeekTwoSets = Number(inSeasonSoccer.weeks[1].sessions[0].exercises[0].sets);
let inSeasonUnlocked = inSeasonSoccer;
inSeasonSoccer.weeks[0].sessions.forEach((session, index) => {
  inSeasonUnlocked = engine.applyFeedback(inSeasonUnlocked, {
    feedback_id:"in-season-" + index,
    session_id:session.id,
    status:"completed",
    difficulty:"appropriate"
  });
});
assert.equal(inSeasonUnlocked.currentWeek, 2);
assert.equal(Number(inSeasonUnlocked.weeks[1].sessions[0].exercises[0].sets), inSeasonWeekTwoSets);
assert(/in-season maintenance volume/i.test(inSeasonUnlocked.progression));

// Running distance, volume, longest run, and race detail alter prescriptions.
const runnerBase = {
  sport:"running", goals:["conditioning"], equipment:["field"], days:2,
  duration:60, experience:"regular", consistency:"steady", weeklyRunVolume:120, longestRun:40
};
const distinctRunnerPlan = plan(runnerBase);
assert.equal(distinctRunnerPlan.weeks[0].sessions[1].exercises[0].id, "tempo-run");
assert.equal(
  new Set(workoutSignatures(distinctRunnerPlan)).size,
  workoutSignatures(distinctRunnerPlan).length,
  "the running tempo day should remain while each scheduled workout stays distinct"
);
const fiveK = plan(Object.assign({}, runnerBase, {runDistance:"5K"}));
const tenK = plan(Object.assign({}, runnerBase, {runDistance:"10K"}));
assert.notEqual(
  fiveK.weeks[0].sessions[1].exercises[0].reps,
  tenK.weeks[0].sessions[1].exercises[0].reps
);
assert(
  plan(Object.assign({}, runnerBase, {weeklyRunVolume:45})).first[0].reps !==
  plan(Object.assign({}, runnerBase, {weeklyRunVolume:120})).first[0].reps
);
assert(
  plan(Object.assign({}, runnerBase, {longestRun:15})).first[0].reps !==
  plan(Object.assign({}, runnerBase, {longestRun:40})).first[0].reps
);
assert(
  plan(Object.assign({}, runnerBase, {raceDetail:"October 12"}))
    .weeks[2].sessions[0].exercises[0].reps.includes("strides")
);
const zeroBaselineRunner = plan(Object.assign({}, runnerBase, {
  weeklyRunVolume:0, longestRun:0, experience:"new", consistency:"low"
}));
assert.equal(zeroBaselineRunner.first[0].id, "brisk-walk");
assert(!zeroBaselineRunner.first.some((item) => item.id === "easy-run"));
const tenMinuteRunner = plan(Object.assign({}, runnerBase, {
  weeklyRunVolume:10, longestRun:10, experience:"new", consistency:"low", days:2
}));
const prescribedRunMinutes = tenMinuteRunner.weeks[0].sessions.reduce((sum, session) => {
  return sum + Number(session.exercises[0].reps.match(/^\d+/)[0]);
}, 0);
assert(prescribedRunMinutes <= 10);

// Limitations and older age lower impact without pretending to diagnose.
const impactPlan = plan({sport:"basketball", goals:["power"], equipment:["field", "gym"], experience:"advanced"});
const limitedPlan = plan({sport:"basketball", goals:["power"], equipment:["field", "gym"], experience:"advanced", limitations:"avoid impact"});
assert(impactPlan.first.some((item) => item.impact === "high"));
assert(limitedPlan.first.every((item) => item.impact === "low"));
assert(/no diagnosis/i.test(limitedPlan.decisionTrace.limitations.decision));
const olderPlan = plan({
  sport:"basketball", goals:["power"], equipment:["field", "gym"],
  experience:"advanced", age:"over55"
});
assert(olderPlan.first.every((item) => item.impact !== "high"),
  "the onboarding value for age 55+ should apply the intended impact limit");

// Existing workout/readiness history changes the starting state.
const hardHistory = {
  workoutLogs:[
    {feedback:{difficulty:"too-hard", status:"completed"}},
    {feedback:{difficulty:"too-hard", status:"partial"}}
  ]
};
const historyHeld = engine.generate(profileB.profile, hardHistory);
assert(historyHeld.progression.startsWith("Hold"));
assert(historyHeld.first.every((item) => item.effort.includes("held")));
const lowReadiness = engine.generate(profileB.profile, {
  readiness:[{energy:"low", soreness:"high", score:40}]
});
assert(lowReadiness.weeks[0].sessions.length < profileB.weeks[0].sessions.length);
assert(firstSets(lowReadiness) < firstSets(profileB));

// Dated history is ordered and stale effort, pain, and readiness signals expire.
const historyTestNow = Date.now();
const daysAgo = (days) => new Date(historyTestNow - days * 24 * 60 * 60 * 1000).toISOString();
const responseProfile = plan({
  sport:"basketball", position:"guard", goals:["jump"], equipment:["field", "dumbbells"],
  experience:"advanced", consistency:"steady"
});
const recoveredFromOldSignals = engine.generate(responseProfile.profile, {
  workoutLogs:[
    {feedback:{status:"partial", difficulty:"too-hard", pain:true, recorded_at:daysAgo(60)}},
    {feedback:{status:"completed", difficulty:"appropriate", pain:false, recorded_at:daysAgo(3)}},
    {feedback:{status:"completed", difficulty:"appropriate", pain:false, recorded_at:daysAgo(2)}},
    {feedback:{status:"completed", difficulty:"appropriate", pain:false, recorded_at:daysAgo(1)}}
  ],
  readiness:[{energy:"low", soreness:"high", recorded_at:daysAgo(20)}]
});
assert.equal(recoveredFromOldSignals.historyState.pain, false);
assert.equal(recoveredFromOldSignals.historyState.tooHard, 0);
assert.equal(recoveredFromOldSignals.historyState.lowRecovery, false);
assert.equal(recoveredFromOldSignals.historyState.logs[0].feedback.difficulty, "appropriate");
const recentPain = engine.generate(responseProfile.profile, {
  workoutLogs:[
    {feedback:{status:"completed", difficulty:"appropriate", pain:false, recorded_at:daysAgo(2)}},
    {feedback:{status:"completed", difficulty:"appropriate", pain:false, recorded_at:daysAgo(1)}},
    {feedback:{status:"partial", difficulty:"appropriate", pain:true, recorded_at:daysAgo(0)}}
  ]
});
assert.equal(recentPain.historyState.pain, true, "current pain must keep exercise selection conservative");

// Readiness adaptation preserves priority, honors time, extra load, and pain.
const originalSession = profileB.weeks[0].sessions[0];
const shortSession = engine.adaptSession(originalSession, {minutesAvailable:20, energy:"okay", soreness:"low"});
assert(shortSession.exercises.length < originalSession.exercises.length);
assert.equal(shortSession.exercises[0].id, originalSession.exercises[0].id);
const extraLoadSession = engine.adaptSession(originalSession, {
  minutesAvailable:60, energy:"okay", soreness:"low", extraSportActivity:"hard practice"
});
assert(Number(extraLoadSession.exercises[0].sets) < Number(originalSession.exercises[0].sets));
const painSession = engine.adaptSession(originalSession, {
  minutesAvailable:60, energy:"okay", soreness:"low", pain:true
});
assert(painSession.exercises.every((item) => item.impact === "low"));
assert(/qualified guidance/i.test(painSession.adaptation));

// Repeated too-hard feedback changes future weeks only; completed snapshot data is untouched.
const feedbackPlan = plan({sport:"strength", goals:["strength"], equipment:["gym"], experience:"advanced"});
const completedSnapshot = JSON.parse(JSON.stringify(feedbackPlan.weeks[0].sessions[0]));
let adjusted = engine.applyFeedback(feedbackPlan, {
  feedback_id:"one", session_id:completedSnapshot.id, status:"completed", difficulty:"too-hard"
});
adjusted = engine.applyFeedback(adjusted, {
  feedback_id:"two", session_id:adjusted.weeks[0].sessions[1].id, status:"partial", difficulty:"too-hard"
});
assert(adjusted.progression.startsWith("Hold"));
assert.deepEqual(adjusted.weeks[0].sessions[0], completedSnapshot);
assert(
  Number(adjusted.weeks[1].sessions[0].exercises[0].sets) <
  Number(feedbackPlan.weeks[1].sessions[0].exercises[0].sets)
);

// Older hard sessions stop suppressing upcoming work after several recent appropriate sessions.
const recoveredFeedbackPlan = JSON.parse(JSON.stringify(feedbackPlan));
recoveredFeedbackPlan.feedbackHistory = [
  {feedback_id:"old-hard-1", difficulty:"too-hard", status:"completed"},
  {feedback_id:"old-hard-2", difficulty:"too-hard", status:"partial"},
  {feedback_id:"good-1", difficulty:"appropriate", status:"completed"},
  {feedback_id:"good-2", difficulty:"appropriate", status:"completed"},
  {feedback_id:"good-3", difficulty:"appropriate", status:"completed"},
  {feedback_id:"good-4", difficulty:"appropriate", status:"completed"}
];
const futureSetsBeforeRecovery = recoveredFeedbackPlan.weeks[1].sessions[0].exercises[0].sets;
const feedbackAfterRecovery = engine.applyFeedback(recoveredFeedbackPlan, {
  feedback_id:"recovered-session", session_id:"not-in-current-week",
  status:"completed", difficulty:"appropriate", pain:false
});
assert.equal(feedbackAfterRecovery.weeks[1].sessions[0].exercises[0].sets, futureSetsBeforeRecovery);

// A repeated feedback ID is idempotent, and a skipped session never creates catch-up work.
const duplicate = engine.applyFeedback(adjusted, {
  feedback_id:"two", session_id:adjusted.weeks[0].sessions[1].id, status:"partial", difficulty:"too-hard"
});
assert.equal(duplicate.feedbackHistory.length, adjusted.feedbackHistory.length);
const skipped = engine.applyFeedback(feedbackPlan, {
  feedback_id:"skip", session_id:feedbackPlan.weeks[0].sessions[0].id,
  status:"skipped", difficulty:"appropriate"
});
assert(/not crammed/i.test(skipped.progression));
assert.deepEqual(
  skipped.weeks.map((week) => week.sessions.map((session) => session.id)),
  feedbackPlan.weeks.map((week) => week.sessions.map((session) => session.id))
);

// A week unlocks only after every scheduled session is handled; earned work changes week 2, not week 1.
const unlockBase = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:2, duration:60,
  experience:"regular", consistency:"steady", familiarity:"confident"
});
const lockedWeekOne = JSON.parse(JSON.stringify(unlockBase.weeks[0]));
const weekTwoBefore = unlockBase.weeks[1].sessions.map((session) =>
  Number(session.exercises[0].sets)
);
let unlocked = unlockBase;
unlockBase.weeks[0].sessions.forEach((session, index) => {
  unlocked = engine.applyFeedback(unlocked, {
    feedback_id:"unlock-" + index,
    session_id:session.id,
    status:"completed",
    difficulty:"appropriate"
  });
});
assert.equal(unlocked.currentWeek, 2);
assert.deepEqual(unlocked.weeks[0], lockedWeekOne);
assert(
  unlocked.weeks[1].sessions.some((session, index) =>
    Number(session.exercises[0].sets) > weekTwoBefore[index]
  ),
  "week 2 should progress sessions whose full support work still fits"
);

// A fully completed easy week advances rep ranges only when the whole session still fits.
let easyWeek = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:2, duration:120,
  experience:"regular", consistency:"steady", familiarity:"confident"
});
const easyWeekTwoPrimary = easyWeek.weeks[1].sessions[0].exercises.find((item) => item.priority === "primary");
const easyWeekTwoRepsBefore = easyWeekTwoPrimary.reps;
easyWeek.weeks[0].sessions.forEach((session, index) => {
  easyWeek = engine.applyFeedback(easyWeek, {
    feedback_id:"easy-" + index,
    session_id:session.id,
    status:"completed",
    difficulty:"too-easy"
  });
});
const easyWeekTwoPrimaryAfter = easyWeek.weeks[1].sessions[0].exercises.find((item) => item.priority === "primary");
assert.notEqual(easyWeekTwoPrimaryAfter.reps, easyWeekTwoRepsBefore);
assert(/rep-range increase/i.test(easyWeek.progression));
easyWeek.weeks[1].sessions.forEach((session) => {
  assert(session.exercises.length > 0);
  assert(session.estimatedMinutes <= session.minutes);
});

// Standard earned set progress is withheld when it would shorten support work or exceed time.
let timeLimitedWeek = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:2, duration:45,
  experience:"regular", consistency:"steady", familiarity:"confident"
});
const timeLimitedExercises = JSON.parse(JSON.stringify(timeLimitedWeek.weeks[1].sessions[0].exercises));
timeLimitedWeek.weeks[0].sessions.forEach((session, index) => {
  timeLimitedWeek = engine.applyFeedback(timeLimitedWeek, {
    feedback_id:"time-limited-" + index,
    session_id:session.id,
    status:"completed",
    difficulty:"appropriate"
  });
});
assert.deepEqual(timeLimitedWeek.weeks[1].sessions[0].exercises, timeLimitedExercises);
assert(/held volume/i.test(timeLimitedWeek.progression));

// Partial work unlocks the next calendar week at held volume, never with an earned increase.
let partialWeek = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:2,
  experience:"regular", consistency:"steady", familiarity:"confident"
});
const partialWeekTwoSets = Number(partialWeek.weeks[1].sessions[0].exercises[0].sets);
partialWeek.weeks[0].sessions.forEach((session, index) => {
  partialWeek = engine.applyFeedback(partialWeek, {
    feedback_id:"partial-" + index,
    session_id:session.id,
    status:index === 0 ? "partial" : "completed",
    difficulty:"appropriate"
  });
});
assert.equal(partialWeek.currentWeek, 2);
assert.equal(Number(partialWeek.weeks[1].sessions[0].exercises[0].sets), partialWeekTwoSets);
assert(/held volume/i.test(partialWeek.progression));

// Handling the final week creates a namespaced adaptive block without rewriting past snapshots.
let completedBlock = plan({
  sport:"strength", goals:["strength"], equipment:["gym"], days:2,
  experience:"regular", consistency:"steady", familiarity:"confident"
});
const finalWeekSnapshot = JSON.parse(JSON.stringify(completedBlock.weeks[3]));
completedBlock.currentWeek = 4;
completedBlock.weeks[3].sessions.forEach((session, index) => {
  completedBlock = engine.applyFeedback(completedBlock, {
    feedback_id:"final-" + index,
    session_id:session.id,
    status:"completed",
    difficulty:"appropriate"
  });
});
assert.equal(completedBlock.currentWeek, 5);
assert.equal(completedBlock.weeks.length, 8);
assert.equal(completedBlock.weeks[4].block, 2);
assert(completedBlock.weeks[4].sessions[0].id.startsWith("block-2-"));
assert.deepEqual(completedBlock.weeks[3], finalWeekSnapshot);
assert(/new adaptive block/i.test(completedBlock.progression));

console.log("training-engine tests passed");