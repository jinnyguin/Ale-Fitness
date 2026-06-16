import json, os

SIMPLE_PROGRAMS = [
  {
    "id":"football","num":"01","sport":"Football","title":"FOOTBALL\nPERFORMANCE",
    "subtitle":"8-week strength and explosiveness program built for linemen, linebackers, and skill positions. Gym and at-home versions.",
    "image":"https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&q=80",
    "duration":"8 Weeks","focus":"Power","sessions":"4"
  },
  {
    "id":"basketball","num":"02","sport":"Basketball","title":"BASKETBALL\nPERFORMANCE",
    "subtitle":"6-week program targeting vertical jump, lateral quickness, and explosive first step. Built for guards, forwards, and centers.",
    "image":"https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80",
    "duration":"6 Weeks","focus":"Vertical","sessions":"3"
  },
  {
    "id":"strength","num":"03","sport":"Strength","title":"MAXIMUM\nSTRENGTH",
    "subtitle":"8-week linear progression strength program built around the squat, bench, deadlift, and overhead press. Pure strength, built systematically.",
    "image":"https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?w=1200&q=80",
    "duration":"8 Weeks","focus":"Max Strength","sessions":"4"
  },
  {
    "id":"weightloss","num":"04","sport":"Weight Loss","title":"LEAN\nBODY",
    "subtitle":"8-week fat-loss program combining resistance training with high-intensity cardio. Build muscle, burn fat, transform your body composition.",
    "image":"https://images.unsplash.com/photo-1571019613914-85f342c6a11e?w=1200&q=80",
    "duration":"8 Weeks","focus":"Fat Loss","sessions":"4"
  },
  {
    "id":"weightgain","num":"05","sport":"Muscle Gain","title":"BUILD\nMASS",
    "subtitle":"8-week hypertrophy program for maximum muscle growth. High volume, progressive overload, and optimized rep ranges for size.",
    "image":"https://images.unsplash.com/photo-1567013127542-490d757e6349?w=1200&q=80",
    "duration":"8 Weeks","focus":"Hypertrophy","sessions":"4"
  },
  {
    "id":"hiit","num":"06","sport":"HIIT","title":"HIGH\nINTENSITY",
    "subtitle":"6-week progressive HIIT program for explosive conditioning, fat loss, and athletic performance. Maximum effort, minimum equipment.",
    "image":"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    "duration":"6 Weeks","focus":"Conditioning","sessions":"4"
  },
  {
    "id":"crossfit","num":"07","sport":"CrossFit","title":"CROSSFIT\nPERFORMANCE",
    "subtitle":"6-week CrossFit-style functional fitness program. Barbell, gymnastic movements, and conditioning for elite general preparedness.",
    "image":"https://images.unsplash.com/photo-1517438322307-e67111335449?w=1200&q=80",
    "duration":"6 Weeks","focus":"General Fitness","sessions":"5"
  },
  {
    "id":"track","num":"08","sport":"Track & Field","title":"TRACK\nPOWER",
    "subtitle":"6-week sprint and power program for 100m-400m athletes. Speed development, force production, and race-specific conditioning.",
    "image":"https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=1200&q=80",
    "duration":"6 Weeks","focus":"Speed","sessions":"4"
  },
  {
    "id":"baseball","num":"09","sport":"Baseball","title":"BASEBALL\nATHLETE",
    "subtitle":"6-week rotational power and arm care program for pitchers, position players, and hitters. Speed, power, and injury prevention.",
    "image":"https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=1200&q=80",
    "duration":"6 Weeks","focus":"Rotational Power","sessions":"3"
  },
  {
    "id":"tennis","num":"10","sport":"Tennis","title":"TENNIS\nATHLETE",
    "subtitle":"6-week athleticism program for explosive serves, lateral movement, and match-long endurance. Built for all court surfaces.",
    "image":"https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1200&q=80",
    "duration":"6 Weeks","focus":"Agility & Power","sessions":"3"
  },
  {
    "id":"pilates","num":"11","sport":"Pilates","title":"PILATES\nSTRENGTH",
    "subtitle":"6-week progressive Pilates program for core strength, postural control, and total-body flexibility. No equipment required.",
    "image":"https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80",
    "duration":"6 Weeks","focus":"Core & Flexibility","sessions":"3"
  },
  {
    "id":"golf","num":"12","sport":"Golf","title":"GOLF\nPERFORMANCE",
    "subtitle":"6-week golf fitness program targeting rotational power, hip mobility, and club head speed. Built by performance coaches.",
    "image":"https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&q=80",
    "duration":"6 Weeks","focus":"Rotation & Power","sessions":"3"
  },
  {
    "id":"crosscountry","num":"13","sport":"Cross Country","title":"CROSS\nCOUNTRY",
    "subtitle":"8-week cross-country performance program for 5k-10k runners. Aerobic base, threshold work, and race-specific strength.",
    "image":"https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80",
    "duration":"8 Weeks","focus":"Endurance","sessions":"5"
  },
]

SPORT_GYM = {
  "football": [
    {"week":"Week 1-2","label":"Strength Foundation","sessions":[
      {"day":"Monday","workout":"Lower Power","duration":"65 min","exercises":[
        {"name":"Back Squat","sets":5,"reps":"5 reps @ 75%","rest":"3 min","desc":"Bar low on the traps, chest up, drive knees out. The back squat is the most transferable lift for football - it builds the hip extension power behind every block, tackle, and sprint. Record weight every session."},
        {"name":"Romanian Deadlift","sets":4,"reps":"6 reps","rest":"2 min","desc":"Hip hinge with soft knees, lower bar to mid-shin keeping the back flat. Posterior chain strength - hamstrings and glutes - is what separates players. Load it heavy."},
        {"name":"Box Jump","sets":4,"reps":"5 reps","rest":"90s","desc":"Squat slightly, explode, land softly with full hip extension. Plyometric training converts gym strength into on-field explosiveness. The box is just a target - the jump is everything."},
        {"name":"Hip Thrust","sets":4,"reps":"10 reps","rest":"90s","desc":"Shoulders on bench, drive hips to full extension and squeeze. Isolated glute strength is the engine behind sprint acceleration and the lockout power in a run block."}
      ]},
      {"day":"Tuesday","workout":"Upper Push & Pull","duration":"60 min","exercises":[
        {"name":"Bench Press","sets":5,"reps":"5 reps @ 75%","rest":"3 min","desc":"Arch the back, retract the scapula, drive the bar off the chest with leg drive. Bench strength directly translates to blocking power and the punch force of a defensive tackle."},
        {"name":"Barbell Row","sets":5,"reps":"5 reps","rest":"2 min","desc":"Hinge to 45 degrees, pull bar to lower ribcage. Upper back strength supports tackle mechanics, the swim move, and every hand-fighting technique in pass rush."},
        {"name":"Overhead Press","sets":4,"reps":"8 reps","rest":"90s","desc":"Strict press, bar from clavicle to full lockout. Overhead strength builds the shoulder stability and pushing power needed to maintain blocks at the point of attack."},
        {"name":"Pull-Up","sets":3,"reps":"Max reps","rest":"90s","desc":"Full hang to chin above bar. Vertical pulling strength builds the latissimus dorsi mass that makes pass rushers hard to push wide and linebackers explosive off the jam."}
      ]},
      {"day":"Thursday","workout":"Lower Strength","duration":"65 min","exercises":[
        {"name":"Deadlift","sets":5,"reps":"3 reps @ 80%","rest":"3 min","desc":"Double overhand or mixed grip, drive floor away. The deadlift tests total posterior chain strength - the exact musculature that determines whether you drive defenders backward or get driven yourself."},
        {"name":"Front Squat","sets":4,"reps":"6 reps","rest":"2 min","desc":"Bar across the front deltoids, torso upright. The front squat forces correct upright posture under load - the position you need to maintain contact and drive through a block."},
        {"name":"Nordic Hamstring Curl","sets":3,"reps":"6 reps","rest":"2 min","desc":"Anchor heels, lower body as slowly as possible. Hamstring strains end seasons. The Nordic curl is the most evidence-backed hamstring injury prevention exercise available."},
        {"name":"Farmer Carry","sets":4,"reps":"40m","rest":"60s","desc":"Heavy dumbbells, walk with upright posture. Grip strength and full-body stability - the foundation of every hand fight. Carry heavy, walk tall, breathe through it."}
      ]},
      {"day":"Friday","workout":"Explosiveness","duration":"55 min","exercises":[
        {"name":"Power Clean","sets":5,"reps":"3 reps","rest":"2 min","desc":"From the floor, explode through the hips and catch the bar in the rack position. The power clean trains the same triple-extension pattern as a drive block and a tackle."},
        {"name":"Broad Jump","sets":4,"reps":"5 reps","rest":"90s","desc":"Maximum horizontal jump. Broad jump performance correlates directly with sprint speed and cutting ability. Football players who broad jump farther tend to be faster."},
        {"name":"Prowler Push","sets":5,"reps":"20m","rest":"2 min","desc":"Low handles, drive legs into the ground. The prowler push directly simulates blocking mechanics - low pad level, driving through contact. The best conditioning tool for a lineman."},
        {"name":"Band Pull-Apart","sets":3,"reps":"20 reps","rest":"30s","desc":"Band at chest height, pull apart to full extension. Rear delt and rotator cuff health. Do this every session - it is shoulder insurance for a contact sport."}
      ]}
    ]},
    {"week":"Week 3-5","label":"Explosive Development","sessions":[
      {"day":"Monday","workout":"Power Lower","duration":"70 min","exercises":[
        {"name":"Back Squat","sets":4,"reps":"4 reps @ 80%","rest":"3 min","desc":"Heavier than weeks 1-2. Progressive overload is non-negotiable - the only way to build the strength that makes you physically dominant on the field."},
        {"name":"Power Clean","sets":5,"reps":"3 reps","rest":"3 min","desc":"Maximum effort. The power clean is the most sport-specific lift in football - it trains the same triple-extension pattern as a drive block and tackle."},
        {"name":"Hex Bar Deadlift","sets":3,"reps":"6 reps","rest":"2 min","desc":"Neutral grip, hips lower than a conventional pull. The hex bar deadlift builds tremendous hip extension power with less lower back stress."},
        {"name":"Sled Sprint","sets":5,"reps":"20m","rest":"2 min","desc":"Loaded sprint. Sprint-speed sled pushes train explosive qualities while adding upper body demand - full body conditioning at maximum output."}
      ]},
      {"day":"Tuesday","workout":"Explosive Upper","duration":"60 min","exercises":[
        {"name":"Push Press","sets":5,"reps":"4 reps","rest":"2 min","desc":"Dip and drive from the legs, press overhead explosively. The push press bridges lower and upper body power - the same coordination used to punch a blocker off you."},
        {"name":"Bench Press","sets":4,"reps":"5 reps @ 80%","rest":"2 min","desc":"Heavier than last week. Stay focused on bar path and leg drive - strength gains only come if technique holds under load."},
        {"name":"Plyometric Push-Up","sets":4,"reps":"8 reps","rest":"90s","desc":"Explosive push-up with hands leaving the floor at the top. Upper body power production - you are training the speed of your punch, not just the strength."},
        {"name":"Weighted Pull-Up","sets":4,"reps":"5 reps","rest":"90s","desc":"Add weight. Vertical pulling strength under load - the back side of every blocking technique."}
      ]},
      {"day":"Thursday","workout":"Athletic Lower","duration":"65 min","exercises":[
        {"name":"Bulgarian Split Squat","sets":4,"reps":"8 each leg","rest":"90s","desc":"Single-leg loaded squat, rear foot elevated. Football is played on one leg at a time - every plant and cut happens on a single support. Build single-leg strength now."},
        {"name":"Romanian Deadlift","sets":4,"reps":"6 reps @ 80%","rest":"2 min","desc":"Progressive overload. The posterior chain built here is what you use on every explosive play."},
        {"name":"Glute Ham Raise","sets":3,"reps":"8 reps","rest":"90s","desc":"Full eccentric control. Hamstring strength built here protects against the strain that happens in the second week of camp when everyone is fresh off a summer of deadlifts."},
        {"name":"Leg Press","sets":3,"reps":"12 reps","rest":"90s","desc":"Supplemental quad volume. Knee extension strength under load - the drive leg power behind every off-the-line burst."}
      ]},
      {"day":"Friday","workout":"Combat Upper","duration":"60 min","exercises":[
        {"name":"Seated Cable Row","sets":4,"reps":"10 reps","rest":"90s","desc":"Chest to pad, pull to lower sternum. Upper back hypertrophy builds the foundation for tackle strength and pass-rush power."},
        {"name":"Lat Pulldown","sets":4,"reps":"12 reps","rest":"75s","desc":"Full stretch at top, pull to upper chest. Lat development determines how hard you are to push wide. Width and strength come together here."},
        {"name":"Hammer Curl","sets":3,"reps":"12 each arm","rest":"60s","desc":"Neutral grip, control the descent. Brachialis and forearm development for grip strength - you cannot tackle what you cannot hold."},
        {"name":"Face Pull","sets":3,"reps":"15 reps","rest":"60s","desc":"Shoulder health maintenance. As weights peak, shoulder care becomes critical - this is the insurance premium."}
      ]}
    ]},
    {"week":"Week 6-8","label":"Peak Strength","sessions":[
      {"day":"Monday","workout":"Max Lower","duration":"75 min","exercises":[
        {"name":"Back Squat 3RM","sets":1,"reps":"3 rep max","rest":"5 min","desc":"Work up to your 3-rep max. Your squat number is your football strength number - record it, compare to week 1. Strength is the variable. Build it."},
        {"name":"Power Clean Peak","sets":4,"reps":"3 reps @ peak","rest":"3 min","desc":"Peak weight. The clean is your explosiveness benchmark. Every pound here represents a yard you gain or give back on the field."},
        {"name":"Sled Sprint","sets":6,"reps":"20m","rest":"2 min","desc":"Loaded sprint at program peak. Drive through the ground with every rep."},
        {"name":"Box Squat","sets":3,"reps":"5 reps","rest":"2 min","desc":"Pause on the box, eliminate momentum. Box squatting develops starting strength - the ability to generate force from a dead stop, exactly as you do off the line of scrimmage."}
      ]},
      {"day":"Tuesday","workout":"Max Upper","duration":"70 min","exercises":[
        {"name":"Bench Press 3RM","sets":1,"reps":"3 rep max","rest":"5 min","desc":"Your bench max. Record it alongside your week 1 number. Eight weeks of progressive training should show a clear increase. Strength is earned, not given."},
        {"name":"Push Press Peak","sets":4,"reps":"4 reps @ peak","rest":"2 min","desc":"Maximum load. Upper body power at its peak."},
        {"name":"Barbell Row 3RM","sets":1,"reps":"3 rep max","rest":"5 min","desc":"Your row max. Upper back strength at peak - the pulling force behind every tackle and arm bar."},
        {"name":"Weighted Dip","sets":3,"reps":"8 reps","rest":"90s","desc":"Max loading. Tricep and pressing strength at its highest point."}
      ]},
      {"day":"Thursday","workout":"Athletic Peak","duration":"70 min","exercises":[
        {"name":"Deadlift 3RM","sets":1,"reps":"3 rep max","rest":"5 min","desc":"Your deadlift max. Total body strength at its highest. This number tells you exactly how strong your posterior chain is."},
        {"name":"Broad Jump","sets":5,"reps":"5 reps","rest":"90s","desc":"Compare to week 3. Your explosiveness benchmark. Distance gained here equals speed gained on the field."},
        {"name":"Prowler Push","sets":6,"reps":"30m","rest":"2 min","desc":"Longer distance, maximum effort. Peak conditioning for the offensive lineman - low, driving, powerful."},
        {"name":"Hip Thrust Peak","sets":4,"reps":"10 reps @ peak","rest":"2 min","desc":"Maximum glute loading. The glute strength built here is the engine behind every explosive sprint."}
      ]},
      {"day":"Friday","workout":"Speed Benchmark","duration":"60 min","exercises":[
        {"name":"40-Yard Dash x5","sets":5,"reps":"1 rep","rest":"3 min","desc":"Record your best time. Your speed benchmark at program end - compare to week 1. Eight weeks of power and speed training produces real improvements."},
        {"name":"Vertical Jump Max","sets":3,"reps":"5 reps","rest":"90s","desc":"Your explosive power benchmark. Compare to week 1."},
        {"name":"5-10-5 Shuttle Best Time","sets":4,"reps":"1 rep","rest":"2 min","desc":"Your agility benchmark. Best time of four. The change-of-direction speed built over 8 weeks."},
        {"name":"Farmer Carry Peak","sets":5,"reps":"50m","rest":"90s","desc":"Heaviest load of the program. Grip and total body stability at maximum."}
      ]}
    ]}
  ],
  "basketball": [
    {"week":"Week 1-2","label":"Athletic Base","sessions":[
      {"day":"Monday","workout":"Lower Explosive","duration":"60 min","exercises":[
        {"name":"Back Squat","sets":4,"reps":"6 reps @ 70%","rest":"2 min","desc":"Full depth, controlled descent. Basketball demands repeated explosive jumps - squat strength is the foundation that makes every jump higher and every landing safer."},
        {"name":"Box Jump","sets":4,"reps":"5 reps","rest":"90s","desc":"Maximum height, land softly, step down. Box jumps train the reactive strength behind your vertical. Every inch added in the gym shows up at the rim. Record height."},
        {"name":"Calf Raise","sets":4,"reps":"20 reps","rest":"60s","desc":"Full range, pause at bottom. Calf strength and Achilles tendon stiffness are major contributors to jump height. Basketball players need calves as strong as sprinters."},
        {"name":"Single-Leg Press","sets":3,"reps":"12 each leg","rest":"90s","desc":"One foot on the platform. Single-leg pressing mirrors the push-off of a jump shot, layup, and drive - every decisive basketball movement happens on one leg."}
      ]},
      {"day":"Wednesday","workout":"Agility & Speed","duration":"50 min","exercises":[
        {"name":"Lateral Shuffle Drill","sets":6,"reps":"10m each direction","rest":"60s","desc":"Stay in athletic position, shuffle laterally as fast as possible. Defensive footwork is won in the gym - hip abductor strength and lateral quickness come from specific lateral work."},
        {"name":"T-Drill","sets":5,"reps":"1 rep","rest":"90s","desc":"Sprint 5m, shuffle right 2.5m, shuffle left 5m, shuffle right 2.5m, back-pedal. Record time. The T-drill covers every footwork pattern in basketball in one drill."},
        {"name":"Depth Jump","sets":4,"reps":"5 reps","rest":"2 min","desc":"Step off box, land, immediately jump as high as possible. Depth jumps train the reactive strength of the Achilles and quad - the same quality that adds inches to your vertical."},
        {"name":"Half-Court Sprint","sets":8,"reps":"1 rep","rest":"60s","desc":"Full-effort half-court sprint. First-step quickness wins possessions - train it with maximum intensity."}
      ]},
      {"day":"Friday","workout":"Strength & Core","duration":"55 min","exercises":[
        {"name":"Trap Bar Deadlift","sets":4,"reps":"5 reps","rest":"2 min","desc":"Neutral grip, hips in line with shoulders. Full body strength in the basketball-specific position - upright torso, powerful hip drive. The foundation of your explosiveness."},
        {"name":"Pallof Press","sets":3,"reps":"12 each side","rest":"60s","desc":"Anti-rotation core stability. The core must stabilize rotationally during every change of direction - Pallof press trains this specific quality."},
        {"name":"Nordic Hamstring Curl","sets":3,"reps":"5 reps","rest":"2 min","desc":"Anchor heels, lower body as slowly as possible. Hamstring injury prevention - the research is extensive and the exercise is uniquely effective."},
        {"name":"Copenhagen Plank","sets":3,"reps":"30s each side","rest":"30s","desc":"Side plank with top foot on bench. Adductor and hip stability - the groin and inner thigh strength that keeps you healthy through a long season of lateral movements."}
      ]}
    ]},
    {"week":"Week 3-4","label":"Vertical Peak","sessions":[
      {"day":"Monday","workout":"Jump Development","duration":"65 min","exercises":[
        {"name":"Back Squat","sets":5,"reps":"4 reps @ 80%","rest":"3 min","desc":"Heavier load. Strength gains are directly proportional to vertical improvement - every pound added to your squat max translates to inches on your vertical."},
        {"name":"Depth Drop to Vertical","sets":5,"reps":"5 reps","rest":"2 min","desc":"Step off box, absorb, immediately jump maximally. The most effective plyometric for basketball-specific reactive strength. Ground contact under 0.25 seconds is the target."},
        {"name":"Step-Up Jump","sets":4,"reps":"8 each leg","rest":"90s","desc":"Step up explosively from one leg, drive into a jump at the top. The one-leg jump is how you score at the rim - this builds the exact single-leg power behind it."},
        {"name":"Approach Jump","sets":5,"reps":"5 reps","rest":"90s","desc":"Two-step approach into a maximum jump. Game-specific vertical - not a standing jump, but the approach used on alley-oops and layups. This is what actually shows up."}
      ]},
      {"day":"Wednesday","workout":"Speed & Reaction","duration":"55 min","exercises":[
        {"name":"Lateral Band Walk","sets":3,"reps":"20 each direction","rest":"45s","desc":"Band above knees, squat position, step laterally. Hip abductor strength is the foundation of defensive footwork. If your hips are weak, your feet will be slow."},
        {"name":"5-10-5 Shuttle","sets":6,"reps":"1 rep","rest":"90s","desc":"Record every rep. Your change-of-direction speed benchmark - the most applicable athletic test for basketball perimeter defense."},
        {"name":"Medicine Ball Slam","sets":4,"reps":"10 reps","rest":"60s","desc":"Overhead to floor with maximum force. Full-body power development in a vertical pattern - the same muscle sequence as a jump and finish."},
        {"name":"Full Court Sprint x8","sets":8,"reps":"1 rep","rest":"60s","desc":"End-to-end at absolute maximum. Peak sprint conditioning. Eight reps simulates the high-intensity work of a full game."}
      ]},
      {"day":"Friday","workout":"Strength & Power","duration":"60 min","exercises":[
        {"name":"Deadlift","sets":4,"reps":"5 reps","rest":"2 min","desc":"Conventional pull, max load. Total posterior chain strength - the engine behind your jumping power. Record weight."},
        {"name":"Hanging Leg Raise","sets":3,"reps":"15 reps","rest":"60s","desc":"Full hang, lift legs to 90 degrees. Hip flexor and lower ab strength - the muscles that generate the knee drive behind your jump."},
        {"name":"Box Jump Max Height","sets":5,"reps":"5 reps","rest":"2 min","desc":"Find your maximum jump height. Your vertical benchmark at the end of week 4. Compare to week 1."},
        {"name":"Farmer Carry","sets":3,"reps":"40m","rest":"75s","desc":"Heavy and upright. Full-body stability and grip strength - the athletic foundation underneath every other quality you are developing."}
      ]}
    ]},
    {"week":"Week 5-6","label":"Game Shape","sessions":[
      {"day":"Monday","workout":"Peak Vertical","duration":"65 min","exercises":[
        {"name":"Back Squat 3RM","sets":1,"reps":"3 rep max","rest":"5 min","desc":"Your strength benchmark. Record it. Six weeks of consistent loading should show measurable progress. Strength is the variable that controls your ceiling."},
        {"name":"Vertical Jump Max","sets":5,"reps":"5 reps","rest":"2 min","desc":"Your vertical benchmark at program end. Compare to week 1 - six weeks of specific training should show a clear improvement."},
        {"name":"Approach Jump","sets":5,"reps":"5 reps","rest":"90s","desc":"Game-specific vertical at program peak. This is what actually shows up in competition."},
        {"name":"Reactive Jump Complex","sets":4,"reps":"5 jumps","rest":"2 min","desc":"5 continuous vertical jumps, minimum ground time. Reactive endurance - the quality that keeps you jumping at the same height in the 4th quarter."}
      ]},
      {"day":"Wednesday","workout":"Court Speed","duration":"55 min","exercises":[
        {"name":"Full Court Sprint x10","sets":3,"reps":"10 lengths","rest":"2 min","desc":"Ten half-court lengths at maximum pace, 3 sets. Peak sprint conditioning. If your pace drops on length 7, that is your conditioning ceiling."},
        {"name":"T-Drill Best Time","sets":6,"reps":"1 rep","rest":"90s","desc":"Compare to week 1. Your agility improvement benchmark."},
        {"name":"Lateral Shuffle 20m","sets":6,"reps":"1 rep","rest":"60s","desc":"Maximum-effort lateral shuffle. Defensive speed at its peak. Record time."},
        {"name":"Jump Fatigue Test","sets":3,"reps":"10 jumps","rest":"60s","desc":"10 vertical jumps, record average height. Reactive endurance - can you maintain your vertical in the 4th quarter?"}
      ]},
      {"day":"Friday","workout":"Benchmark Day","duration":"60 min","exercises":[
        {"name":"Deadlift 1RM","sets":1,"reps":"1 rep max","rest":"5 min","desc":"Your total strength number at program end. Record and compare."},
        {"name":"Standing Broad Jump","sets":5,"reps":"5 reps","rest":"90s","desc":"Horizontal power benchmark. Compare to week 1."},
        {"name":"Single-Leg Vertical","sets":3,"reps":"5 each leg","rest":"90s","desc":"One-leg vertical jump - the actual jump used in basketball. Record height."},
        {"name":"5-10-5 Best Time","sets":3,"reps":"1 rep","rest":"2 min","desc":"Your agility benchmark at program end. Best of three. Record the improvement."}
      ]}
    ]}
  ],
}

# Default program structure for all other sports
def make_gym_weeks(prog):
    sport = prog["sport"]
    sport_specific = {
      "strength": [
        {"week":"Week 1-2","label":"Technique & Base"},
        {"week":"Week 3-5","label":"Load Accumulation"},
        {"week":"Week 6-8","label":"Intensity Peak"},
      ],
      "weightloss": [
        {"week":"Week 1-2","label":"Metabolic Base"},
        {"week":"Week 3-5","label":"Intensity Increase"},
        {"week":"Week 6-8","label":"Peak Fat Loss"},
      ],
      "weightgain": [
        {"week":"Week 1-2","label":"Volume Foundation"},
        {"week":"Week 3-5","label":"Volume Increase"},
        {"week":"Week 6-8","label":"Peak Hypertrophy"},
      ],
      "hiit": [
        {"week":"Week 1-2","label":"Aerobic Base"},
        {"week":"Week 3-4","label":"Anaerobic Development"},
        {"week":"Week 5-6","label":"Peak Conditioning"},
      ],
      "crossfit": [
        {"week":"Week 1-2","label":"Skill Development"},
        {"week":"Week 3-4","label":"Volume & Intensity"},
        {"week":"Week 5-6","label":"Competition Prep"},
      ],
      "track": [
        {"week":"Week 1-2","label":"Speed Foundation"},
        {"week":"Week 3-4","label":"Power Development"},
        {"week":"Week 5-6","label":"Race Prep"},
      ],
      "baseball": [
        {"week":"Week 1-2","label":"Athletic Base"},
        {"week":"Week 3-4","label":"Rotational Power"},
        {"week":"Week 5-6","label":"Game Ready"},
      ],
      "tennis": [
        {"week":"Week 1-2","label":"Athletic Foundation"},
        {"week":"Week 3-4","label":"Court Speed"},
        {"week":"Week 5-6","label":"Match Ready"},
      ],
      "pilates": [
        {"week":"Week 1-2","label":"Core Foundation"},
        {"week":"Week 3-4","label":"Strength & Control"},
        {"week":"Week 5-6","label":"Peak Stability"},
      ],
      "golf": [
        {"week":"Week 1-2","label":"Mobility Base"},
        {"week":"Week 3-4","label":"Power Development"},
        {"week":"Week 5-6","label":"Swing Integration"},
      ],
      "crosscountry": [
        {"week":"Week 1-2","label":"Aerobic Base"},
        {"week":"Week 3-5","label":"Threshold Building"},
        {"week":"Week 6-8","label":"Race Specific"},
      ],
    }

    phases = sport_specific.get(sport.lower().replace(" ", "").replace("&",""), [
        {"week":"Week 1-2","label":"Foundation"},
        {"week":"Week 3-4","label":"Development"},
        {"week":"Week 5-6","label":"Peak Performance"},
    ])

    gym_exercises = {
      "strength": [
        [("Back Squat","5","5 reps @ 70%","3 min","The foundation. Sit into the hips, brace the core, drive through the floor. Technique before load - record every working set."),
         ("Bench Press","5","5 reps @ 70%","3 min","Arch the back, retract the scapula, keep feet in the floor. Leg drive. The bench press is technical - learn the setup and it gets heavy."),
         ("Deadlift","5","5 reps @ 70%","3 min","Push the floor away. The deadlift is a push, not a pull. Maintain tension from setup to lockout."),
         ("Overhead Press","5","5 reps @ 70%","3 min","Strict press, no leg drive. Keep it strict, keep it technical, add weight consistently.")],
        [("Back Squat","5","5 reps @ 80%","3 min","Progressive overload. 5-10lb heavier than week 1. Linear progression - add weight, record it, repeat. Trust the system."),
         ("Bench Press","5","5 reps @ 80%","3 min","Heavier than week 1. Consistent increases per week are the hallmark of linear progression."),
         ("Deadlift","4","3 reps @ 85%","3 min","Lower rep, higher intensity. Every set is an honest maximum-effort set."),
         ("Barbell Row","4","8 reps","90s","Upper back strength to support the pressing and pulling. Row as much as you bench - this is the rule.")],
        [("Back Squat","3","3 reps @ 87%","4 min","Near-maximal loading. Express the strength built over 8 weeks."),
         ("Bench Press 1RM","1","1 rep max","5 min","Your pressing benchmark at program end. Eight weeks of progressive loading culminate here."),
         ("Deadlift 1RM","1","1 rep max","5 min","Your total strength benchmark. The pinnacle of 8 weeks of posterior chain development."),
         ("Overhead Press 1RM","1","1 rep max","5 min","Your overhead pressing benchmark at program end.")],
      ],
      "weightloss": [
        [("Back Squat","4","10 reps","60s","Moderate weight, controlled tempo. The back squat is the most metabolically demanding strength exercise - it burns more calories than any other lift."),
         ("Sprint Interval","8","30s on / 60s off","60s","Maximum effort sprints. High-intensity interval training burns significantly more calories than steady-state cardio in half the time."),
         ("Romanian Deadlift","4","12 reps","60s","Posterior chain development builds the largest muscles in the body - more muscle mass means a higher resting metabolic rate."),
         ("Burpee Finisher","3","10 reps","30s","Post-strength metabolic conditioning - heart rate is elevated, glycogen is depleted, fat oxidation peaks.")],
        [("Squat Superset (Barbell + Jump)","4","8 barbell + 5 jump","90s","Heavy barbell squat immediately into jump squats. Contrast training maximizes strength and power while keeping heart rate elevated."),
         ("Tabata Sprint","8","20s on / 10s off","2 min between rounds","The most efficient high-intensity interval protocol. Heart rate peaks above 90% max."),
         ("Sled Push","5","30m","90s","Maximum loading, drive through the ground. Sled push generates massive caloric expenditure with no eccentric component."),
         ("Barbell Complex","4","5 each exercise","2 min","Deadlift > Row > Clean > Press > Squat without putting the bar down. The most metabolically demanding weight room protocol.")],
        [("Deadlift","5","5 reps","2 min","Heavy and high volume. The combination of high load and moderate volume creates the most significant metabolic disruption of any single exercise."),
         ("Assault Bike 30/30","15","30s on / 30s off","30s","Maximum bike output. Nothing burns more calories in less time than the assault bike."),
         ("Run 5k Time Trial","1","5k","Done","Record your time. Your cardiovascular fitness benchmark at the end of 8 weeks.")],
      ],
      "weightgain": [
        [("Back Squat","4","8-10 reps","90s","Full depth, controlled descent. Squat depth determines quad and glute activation. The king of leg exercises and the best anabolic stimulus in training."),
         ("Barbell Bench Press","4","8-10 reps","90s","The primary chest builder. Moderate weight, full range, focus on the stretch at the bottom and contraction at the top."),
         ("Barbell Row","4","8-10 reps","90s","The most important back exercise. More muscle mass engaged than any other upper body pull."),
         ("Overhead Press","4","8-10 reps","90s","The primary shoulder developer. Full range builds 3D deltoid development."),
         ("Romanian Deadlift","4","10 reps","90s","Hamstring emphasis. Hamstring mass balances the quad-dominant demands of squatting.")],
        [("Back Squat","5","8-10 reps","90s","One more set than week 1. Volume increase. Adding a set is a form of progressive overload."),
         ("Barbell Bench Press","5","8-10 reps","90s","Progressive volume. Five sets of pressing builds the kind of chest mass that changes how clothing fits."),
         ("Deadlift","4","6 reps","2 min","Added for maximum posterior chain stimulus. The deadlift triggers more total muscle growth than any other exercise."),
         ("Wide-Grip Pull-Up","4","Max reps","90s","The width of your back is determined by lat pulldown and pull-up performance."),
         ("Leg Press","3","15 reps","90s","Supplemental quad volume for complete leg development.")],
        [("Back Squat","4","5 reps @ 85%","3 min","Near-maximal loading. Strength gains in this phase directly predict mass gains."),
         ("Bench Press PR","5","6 reps","2 min","Lower rep range for strength-hypertrophy overlap. Heavier pressing drives both strength and mass."),
         ("Deadlift 3RM","3","3 reps","3 min","Work up to a 3-rep max. Your posterior chain strength benchmark at program end."),
         ("Cable Fly Dropset","3","15+15 drop","75s","Chest isolation at program peak. Dropsets create both mechanical tension and metabolic stress.")],
      ],
    }

    default_exercises = [
      [("Back Squat","4","8 reps","2 min",f"Foundational lower body strength. For {sport} athletes the squat builds the hip extension power behind every explosive movement. Full depth, controlled descent."),
       ("Romanian Deadlift","3","10 reps","90s","Posterior chain development. Hamstring and glute strength is the engine behind sprint speed and rotational power."),
       ("Bench Press","4","8 reps","90s","Upper body pressing strength. Chest, shoulder, and tricep development for athletic performance."),
       ("Barbell Row","4","8 reps","90s","Upper back and lat strength. Horizontal pulling volume builds the back thickness that supports every overhead and rotational movement.")],
      [("Power Clean","4","4 reps","2 min","The most sport-specific strength exercise. Trains triple extension - the same pattern behind every jump, sprint start, and explosive push."),
       ("Back Squat","4","6 reps @ 78%","2 min","Progressive loading. Heavier than weeks 1-2 - progressive overload drives adaptation."),
       ("Nordic Hamstring Curl","3","6 reps","90s","Eccentric hamstring strength for injury prevention. The research supporting effectiveness is extensive."),
       ("Farmer Carry","4","40m","75s","Grip and full-body stability. Heavy carries build whole-body tension for maximum force transfer.")],
      [("Back Squat 3RM","1","3 rep max","5 min","Your strength benchmark at program end. Record it and compare to week 1."),
       ("Deadlift 1RM","1","1 rep max","5 min","Your total strength number. The posterior chain built over the full program."),
       ("Broad Jump Benchmark","5","5 reps","2 min","Your horizontal power benchmark. Compare to week 1."),
       ("Sprint Time Trial","4","30m","2 min","Your speed at program end. Best of four. Compare to week 1.")],
    ]

    sport_key = sport.lower().replace(" ", "").replace("&","")
    exercise_data = gym_exercises.get(sport_key, default_exercises)

    weeks = []
    for i, phase in enumerate(phases):
        exs = exercise_data[i] if i < len(exercise_data) else default_exercises[min(i, len(default_exercises)-1)]
        days = [
            {"day":"Monday","workout":"Strength A","duration":"60 min","exercises":[
                {"name":e[0],"sets":int(str(e[1]).split()[0]) if str(e[1]).isdigit() or (len(e[1])<=2 and e[1].isdigit()) else 4,"reps":str(e[2]),"rest":str(e[3]),"desc":str(e[4])} for e in exs[:2]
            ]},
            {"day":"Wednesday","workout":"Power & Conditioning","duration":"55 min","exercises":[
                {"name":e[0],"sets":int(str(e[1]).split()[0]) if str(e[1]).isdigit() or (len(e[1])<=2 and e[1].isdigit()) else 4,"reps":str(e[2]),"rest":str(e[3]),"desc":str(e[4])} for e in exs[2:4]
            ]},
            {"day":"Friday","workout":"Benchmark & Accessory","duration":"55 min","exercises":[
                {"name":e[0],"sets":int(str(e[1]).split()[0]) if str(e[1]).isdigit() or (len(e[1])<=2 and e[1].isdigit()) else 3,"reps":str(e[2]),"rest":str(e[3]),"desc":str(e[4])} for e in (exs[4:] if len(exs) > 4 else exs[:2])
            ]},
        ]
        # Fix sets from tuples
        for day in days:
            for ex in day["exercises"]:
                if not isinstance(ex["sets"], int):
                    ex["sets"] = 4
        weeks.append({"week":phase["week"],"label":phase["label"],"sessions":days})
    return weeks

def make_home_weeks(prog):
    sport = prog["sport"]
    phases = [
        {"week":"Week 1-2","label":"Bodyweight Foundation"},
        {"week":"Week 3-4","label":"Progressive Loading"},
        {"week":"Week 5-6","label":"Peak Performance"},
    ]
    if "8 Week" in prog["duration"]:
        phases = [
            {"week":"Week 1-2","label":"Bodyweight Foundation"},
            {"week":"Week 3-5","label":"Progressive Loading"},
            {"week":"Week 6-8","label":"Peak Performance"},
        ]
    weeks = []
    for i, phase in enumerate(phases):
        intensity = ["Foundation","Moderate","High"][i]
        days = [
            {"day":"Monday","workout":"Power Foundation","duration":"55 min","exercises":[
                {"name":"Jump Squat","sets":5,"reps":"10 reps","rest":"90s","desc":f"Explosive bodyweight squats. For {sport} athletes, jump squats build the hip extension power behind every explosive athletic movement. Land softly, absorb, reset."},
                {"name":"Bulgarian Split Squat","sets":4,"reps":"10 each leg","rest":"90s","desc":"Single-leg strength - the foundation of athletic performance. Every sprint, cut, and explosive movement starts on one leg. Build it with intention."},
                {"name":"Nordic Curl","sets":3,"reps":"5 reps","rest":"2 min","desc":"Eccentric hamstring development. Nordic curls are the most effective hamstring exercise available without equipment - critical for speed and injury prevention."},
                {"name":"Broad Jump","sets":4,"reps":"5 reps","rest":"90s","desc":"Measure your best horizontal jump. Your power baseline - track this every two weeks to measure real athletic progress."},
            ]},
            {"day":"Wednesday","workout":"Speed & Conditioning","duration":"50 min","exercises":[
                {"name":"Sprint Intervals","sets":8,"reps":"30m","rest":"90s","desc":"Maximum effort sprints. Sprint speed is trainable. Consistent max-effort sprint work builds the exact quality that separates athletes at every level."},
                {"name":"Lateral Shuffle","sets":5,"reps":"10m each","rest":"60s","desc":"Athletic position, maximum lateral velocity. Hip abductor strength and lateral quickness built at game speed."},
                {"name":"Stair Sprint","sets":6,"reps":"20 steps","rest":"75s","desc":"Explosive single-leg power on stairs. The incline adds resistance that builds force production above what flat sprinting provides."},
                {"name":"Jump Rope / Jumping Jacks","sets":5,"reps":"1 min","rest":"30s","desc":"Continuous jumping for cardiovascular conditioning. Builds foot speed and coordination alongside the metabolic base required for repeated explosive efforts."},
            ]},
            {"day":"Friday","workout":"Strength Circuit","duration":"55 min","exercises":[
                {"name":"Push-Up","sets":5,"reps":"20 reps","rest":"60s","desc":"High-volume pressing. 100 push-ups per session builds the chest, shoulder, and tricep strength that supports every pushing and contact movement."},
                {"name":"Pull-Up","sets":4,"reps":"Max reps","rest":"90s","desc":"The most important upper body pulling exercise. Build total weekly pull-up volume consistently - lat strength is the foundation of every athletic pulling movement."},
                {"name":"Pistol Squat","sets":4 if i > 0 else 3,"reps":"6 each leg","rest":"90s","desc":"Maximum unilateral strength. The pistol squat is the bodyweight equivalent of a heavy barbell squat in terms of single-leg loading."},
                {"name":"Plank Hold","sets":3,"reps":"60s","rest":"45s","desc":"Anti-extension core stability. The bracing strength that connects lower and upper body - essential for force transfer in every athletic movement."},
            ]},
        ]
        weeks.append({"week":phase["week"],"label":phase["label"],"sessions":days})
    return weeks

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <link href="/images/c88292ed9_logo.png" rel="icon" type="image/png"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>{title_tag} | ALEFIT</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet"/>
  <script>(function(){{var t=localStorage.getItem('base44_access_token')||localStorage.getItem('token');if(!t){{window.location.replace('/Login.html?from_url='+encodeURIComponent(window.location.href));}}}})()</script>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    :root{{--lime:#D4FF00;--bg:#0F0F0F;--surface:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.06);--text:#fff;--muted:rgba(255,255,255,0.4)}}
    body{{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh}}
    a{{color:inherit;text-decoration:none}}
    .hero{{position:relative;height:50vh;min-height:320px;display:flex;align-items:flex-end;padding:0 4rem 4rem;background:linear-gradient(to bottom,rgba(15,15,15,0.3),rgba(15,15,15,0.95)),url('{image}') center/cover no-repeat}}
    @media(max-width:600px){{.hero{{padding:0 1.5rem 3rem}}}}
    .back{{position:absolute;top:2rem;left:2rem;display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.5);transition:color 0.2s}}
    .back:hover{{color:var(--lime)}}
    @media(max-width:600px){{.back{{left:1.5rem}}}}
    .hero-tag span{{color:var(--lime);font-size:0.7rem;font-weight:700;letter-spacing:0.3em;text-transform:uppercase}}
    h1{{font-family:'Barlow Condensed',sans-serif;font-size:clamp(3rem,8vw,5rem);font-weight:900;letter-spacing:-0.02em;line-height:1}}
    .hero-sub{{color:rgba(255,255,255,0.5);font-size:1rem;margin-top:0.75rem;max-width:36rem}}
    .stats-bar{{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.1)}}
    .stat{{display:flex;flex-direction:column;align-items:center;padding:1.5rem;gap:0.25rem;border-right:1px solid rgba(255,255,255,0.1)}}
    .stat:last-child{{border-right:none}}
    .stat-val{{font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:700}}
    .stat-lbl{{font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted)}}
    .tabs-row{{padding:2.5rem 4rem 0}}
    @media(max-width:600px){{.tabs-row{{padding:2rem 1.5rem 0}}}}
    .tabs{{display:flex;gap:0.75rem}}
    .tab-btn{{padding:0.625rem 1.25rem;font-size:0.75rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);background:transparent;cursor:pointer;font-family:inherit;transition:all 0.2s}}
    .tab-btn.active{{background:var(--lime);color:#0F0F0F;border-color:var(--lime)}}
    .body{{padding:3rem 4rem 5rem;max-width:1400px}}
    @media(max-width:600px){{.body{{padding:2rem 1.5rem 4rem}}}}
    .section-title{{font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:900;letter-spacing:-0.01em;margin-bottom:3rem}}
    .section-title span{{color:var(--lime)}}
    .weeks{{display:flex;flex-direction:column;gap:5rem}}
    .week-head{{display:flex;align-items:center;gap:1rem;margin-bottom:2rem}}
    .week-label{{color:var(--lime);font-size:0.75rem;font-weight:700;letter-spacing:0.25em;text-transform:uppercase}}
    .week-divider{{flex:1;height:1px;background:rgba(255,255,255,0.1)}}
    .week-sub{{font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted)}}
    .sessions{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}}
    .session-card{{background:var(--surface);border:1px solid var(--border);overflow:hidden}}
    .session-head{{padding:1.25rem 1.25rem 1rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start}}
    .session-day{{font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:0.25rem}}
    .session-name{{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;line-height:1.2}}
    .session-dur{{color:var(--lime);font-size:0.75rem;font-weight:700;white-space:nowrap;margin-left:0.5rem}}
    .exercises{{display:flex;flex-direction:column}}
    .ex{{padding:1rem 1.25rem;border-bottom:1px solid var(--border)}}
    .ex:last-child{{border-bottom:none}}
    .ex-name{{font-size:0.875rem;font-weight:600;margin-bottom:0.4rem}}
    .ex-desc{{font-size:0.775rem;color:rgba(255,255,255,0.5);line-height:1.55;margin-bottom:0.6rem}}
    .ex-meta{{display:flex;flex-wrap:wrap;gap:0.375rem}}
    .badge{{font-size:0.65rem;font-weight:700;padding:0.2rem 0.5rem}}
    .badge-lime{{background:rgba(212,255,0,0.12);color:var(--lime)}}
    .badge-grey{{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.55)}}
  </style>
</head>
<body>

<div class="hero">
  <a href="/" class="back">Back to Home</a>
  <div>
    <div class="hero-tag"><span>Program {num} &mdash; {sport}</span></div>
    <h1>{h1}</h1>
    <p class="hero-sub">{subtitle}</p>
  </div>
</div>

<div class="stats-bar">
  <div class="stat"><span class="stat-val">{duration}</span><span class="stat-lbl">Duration</span></div>
  <div class="stat"><span class="stat-val">{focus}</span><span class="stat-lbl">Focus</span></div>
  <div class="stat"><span class="stat-val">{sessions}</span><span class="stat-lbl">Sessions/wk</span></div>
</div>

<div class="tabs-row">
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('gym',this)">Gym Program</button>
    <button class="tab-btn" onclick="switchTab('home',this)">At-Home (No Equipment)</button>
  </div>
</div>

<div class="body">
  <h2 class="section-title">{weeks_heading} <span>BREAKDOWN</span></h2>
  <div class="weeks" id="weeks"></div>
</div>

<script>
var GYM = {gym_json};
var HOME = {home_json};
var currentTab = 'gym';
function switchTab(tab, btn) {{
  document.querySelectorAll('.tab-btn').forEach(function(b){{b.classList.remove('active');}});
  btn.classList.add('active');
  currentTab = tab;
  renderWeeks();
}}
function esc(s) {{
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}}
function renderWeeks() {{
  var data = currentTab === 'gym' ? GYM : HOME;
  var container = document.getElementById('weeks');
  container.innerHTML = '';
  data.forEach(function(wk) {{
    var wkDiv = document.createElement('div');
    var sessHtml = wk.sessions.map(function(s) {{
      var exHtml = s.exercises.map(function(ex) {{
        return '<div class="ex"><div class="ex-name">'+esc(ex.name)+'</div><div class="ex-desc">'+esc(ex.desc)+'</div><div class="ex-meta"><span class="badge badge-lime">'+esc(ex.sets)+' sets x '+esc(ex.reps)+'</span><span class="badge badge-grey">Rest: '+esc(ex.rest)+'</span></div></div>';
      }}).join('');
      return '<div class="session-card"><div class="session-head"><div><div class="session-day">'+esc(s.day)+'</div><div class="session-name">'+esc(s.workout)+'</div></div><div class="session-dur">'+esc(s.duration)+'</div></div><div class="exercises">'+exHtml+'</div></div>';
    }}).join('');
    wkDiv.innerHTML = '<div class="week-head"><span class="week-label">'+esc(wk.week)+'</span><div class="week-divider"></div><span class="week-sub">'+esc(wk.label)+'</span></div><div class="sessions">'+sessHtml+'</div>';
    container.appendChild(wkDiv);
  }});
}}
renderWeeks();
</script>
</body>
</html>"""

def make_h1(title):
    return title.replace('\n', '<br/>')

def make_title_tag(title):
    return title.replace('\n', ' ').strip()

def make_weeks_heading(duration):
    num = duration.split()[0]
    return num + '-WEEK'

def render_program(prog, gym_weeks, home_weeks):
    return TEMPLATE.format(
        title_tag=make_title_tag(prog['title']),
        image=prog['image'],
        num=prog['num'],
        sport=prog['sport'],
        h1=make_h1(prog['title']),
        subtitle=prog['subtitle'],
        duration=prog['duration'],
        focus=prog['focus'],
        sessions=prog['sessions'],
        weeks_heading=make_weeks_heading(prog['duration']),
        gym_json=json.dumps(gym_weeks, ensure_ascii=False),
        home_json=json.dumps(home_weeks, ensure_ascii=False)
    )

# Generate all programs
for prog in SIMPLE_PROGRAMS:
    pid = prog['id']
    if pid in SPORT_GYM:
        gym_weeks = SPORT_GYM[pid]
    else:
        gym_weeks = make_gym_weeks(prog)
    home_weeks = make_home_weeks(prog)
    html = render_program(prog, gym_weeks, home_weeks)
    fname = f"programs/{pid}.html"
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated {fname} ({len(html)} bytes)")

print("All done.")
