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

// New sports use sport-relevant starting movements, equipment, and plan routing.
const expandedSportCases = [
  {sport:"volleyball", goal:"jump", equipment:["bodyweight"], primary:"snap-down", label:"Volleyball"},
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
  assert.equal(result.path, "/my-plan.html");
  assertAllEquipmentAllowed(result, item.equipment);
});
assert(
  plan({sport:"cycling", goals:["conditioning"], equipment:["bike"]}).first[0].effort === "conversational"
);
assert(
  plan({sport:"rowing", goals:["conditioning"], equipment:["rower"]}).first[0].effort === "conversational"
);

// Running distance, volume, longest run, and race detail alter prescriptions.
const runnerBase = {
  sport:"running", goals:["conditioning"], equipment:["field"], days:2,
  duration:60, experience:"regular", consistency:"steady", weeklyRunVolume:120, longestRun:40
};
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
  sport:"strength", goals:["strength"], equipment:["gym"], days:2,
  experience:"regular", consistency:"steady", familiarity:"confident"
});
const lockedWeekOne = JSON.parse(JSON.stringify(unlockBase.weeks[0]));
const weekTwoBefore = Number(unlockBase.weeks[1].sessions[0].exercises[0].sets);
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
  Number(unlocked.weeks[1].sessions[0].exercises[0].sets) > weekTwoBefore,
  "week 2 progression must be earned from handled appropriate work"
);

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