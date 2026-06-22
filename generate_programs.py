import json, os

SIMPLE_PROGRAMS = [
  {
    "id":"football","num":"01","sport":"Football","title":"FOOTBALL\nPERFORMANCE",
    "subtitle":"8-week strength and explosiveness program built for linemen, linebackers, and skill positions. Gym and at-home versions.",
    "image":"https://images.pexels.com/photos/6514823/pexels-photo-6514823.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"8 Weeks","focus":"Power","sessions":"4"
  },
  {
    "id":"basketball","num":"02","sport":"Basketball","title":"BASKETBALL\nPERFORMANCE",
    "subtitle":"6-week program targeting vertical jump, lateral quickness, and explosive first step. Built for guards, forwards, and centers.",
    "image":"https://images.pexels.com/photos/32619170/pexels-photo-32619170/free-photo-of-competitive-basketball-game-jump-shot-action.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"Vertical","sessions":"3"
  },
  {
    "id":"strength","num":"03","sport":"Strength","title":"MAXIMUM\nSTRENGTH",
    "subtitle":"8-week linear progression strength program built around the squat, bench, deadlift, and overhead press. Pure strength, built systematically.",
    "image":"https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"8 Weeks","focus":"Max Strength","sessions":"4"
  },
  {
    "id":"weightloss","num":"04","sport":"Weight Loss","title":"LEAN\nBODY",
    "subtitle":"8-week fat-loss program combining resistance training with high-intensity cardio. Build muscle, burn fat, transform your body composition.",
    "image":"https://images.pexels.com/photos/4164513/pexels-photo-4164513.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"8 Weeks","focus":"Fat Loss","sessions":"4"
  },
  {
    "id":"weightgain","num":"05","sport":"Muscle Gain","title":"BUILD\nMASS",
    "subtitle":"8-week hypertrophy program for maximum muscle growth. High volume, progressive overload, and optimized rep ranges for size.",
    "image":"https://images.pexels.com/photos/31849596/pexels-photo-31849596/free-photo-of-muscular-man-lifting-weights-in-dark-gym.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"8 Weeks","focus":"Hypertrophy","sessions":"4"
  },
  {
    "id":"hiit","num":"06","sport":"HIIT","title":"HIGH\nINTENSITY",
    "subtitle":"6-week progressive HIIT program for explosive conditioning, fat loss, and athletic performance. Maximum effort, minimum equipment.",
    "image":"https://images.pexels.com/photos/7688862/pexels-photo-7688862.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"Conditioning","sessions":"4"
  },
  {
    "id":"crossfit","num":"07","sport":"CrossFit","title":"CROSSFIT\nPERFORMANCE",
    "subtitle":"6-week CrossFit-style functional fitness program. Barbell, gymnastic movements, and conditioning for elite general preparedness.",
    "image":"https://images.pexels.com/photos/29859452/pexels-photo-29859452/free-photo-of-intense-crossfit-athlete-jumping-on-box.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"General Fitness","sessions":"5"
  },
  {
    "id":"track","num":"08","sport":"Track & Field","title":"TRACK\nPOWER",
    "subtitle":"6-week sprint and power program for 100m-400m athletes. Speed development, force production, and race-specific conditioning.",
    "image":"https://images.pexels.com/photos/3756042/pexels-photo-3756042.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"Speed","sessions":"4"
  },
  {
    "id":"baseball","num":"09","sport":"Baseball","title":"BASEBALL\nATHLETE",
    "subtitle":"6-week rotational power and arm care program for pitchers, position players, and hitters. Speed, power, and injury prevention.",
    "image":"https://images.pexels.com/photos/17724062/pexels-photo-17724062/free-photo-of-a-baseball-player-is-about-to-swing-the-bat.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"Rotational Power","sessions":"3"
  },
  {
    "id":"tennis","num":"10","sport":"Tennis","title":"TENNIS\nATHLETE",
    "subtitle":"6-week athleticism program for explosive serves, lateral movement, and match-long endurance. Built for all court surfaces.",
    "image":"https://images.pexels.com/photos/8542677/pexels-photo-8542677.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"Agility & Power","sessions":"3"
  },
  {
    "id":"pilates","num":"11","sport":"Pilates","title":"PILATES\nSTRENGTH",
    "subtitle":"6-week progressive Pilates program for core strength, postural control, and total-body flexibility. No equipment required.",
    "image":"https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"Core & Flexibility","sessions":"3"
  },
  {
    "id":"golf","num":"12","sport":"Golf","title":"GOLF\nPERFORMANCE",
    "subtitle":"6-week golf fitness program targeting rotational power, hip mobility, and club head speed. Built by performance coaches.",
    "image":"https://images.pexels.com/photos/1325681/pexels-photo-1325681.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"Rotation & Power","sessions":"3"
  },
  {
    "id":"crosscountry","num":"13","sport":"Cross Country","title":"CROSS\nCOUNTRY",
    "subtitle":"8-week cross-country performance program for 5k-10k runners. Aerobic base, threshold work, and race-specific strength.",
    "image":"https://images.pexels.com/photos/7226772/pexels-photo-7226772.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"8 Weeks","focus":"Endurance","sessions":"5"
  },
  {
    "id":"vertical-jump","num":"14","sport":"Vertical Jump","title":"VERTICAL\nJUMP",
    "subtitle":"6-week home-based plyometric program to add +8 inches to your vertical. No equipment required. Bodyweight and gravity.",
    "image":"https://images.pexels.com/photos/3755440/pexels-photo-3755440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "duration":"6 Weeks","focus":"+8 Inches","sessions":"3"
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

def make_dumbbell_weeks(prog):
    sport = prog["sport"]
    sport_key = sport.lower().replace(" ", "").replace("&","")

    phases_map = {
        "football":     [{"week":"Week 1-2","label":"Strength Foundation"},{"week":"Week 3-5","label":"Explosive Development"},{"week":"Week 6-8","label":"Peak Strength"}],
        "basketball":   [{"week":"Week 1-2","label":"Athletic Base"},{"week":"Week 3-4","label":"Vertical Peak"},{"week":"Week 5-6","label":"Game Shape"}],
        "strength":     [{"week":"Week 1-2","label":"Technique & Base"},{"week":"Week 3-5","label":"Load Accumulation"},{"week":"Week 6-8","label":"Intensity Peak"}],
        "weightloss":   [{"week":"Week 1-2","label":"Metabolic Base"},{"week":"Week 3-5","label":"Intensity Increase"},{"week":"Week 6-8","label":"Peak Fat Loss"}],
        "weightgain":   [{"week":"Week 1-2","label":"Volume Foundation"},{"week":"Week 3-5","label":"Volume Increase"},{"week":"Week 6-8","label":"Peak Hypertrophy"}],
        "hiit":         [{"week":"Week 1-2","label":"Aerobic Base"},{"week":"Week 3-4","label":"Anaerobic Development"},{"week":"Week 5-6","label":"Peak Conditioning"}],
        "crossfit":     [{"week":"Week 1-2","label":"Skill Development"},{"week":"Week 3-4","label":"Volume & Intensity"},{"week":"Week 5-6","label":"Competition Prep"}],
        "track":        [{"week":"Week 1-2","label":"Speed Foundation"},{"week":"Week 3-4","label":"Power Development"},{"week":"Week 5-6","label":"Race Prep"}],
        "baseball":     [{"week":"Week 1-2","label":"Athletic Base"},{"week":"Week 3-4","label":"Rotational Power"},{"week":"Week 5-6","label":"Game Ready"}],
        "tennis":       [{"week":"Week 1-2","label":"Athletic Foundation"},{"week":"Week 3-4","label":"Court Speed"},{"week":"Week 5-6","label":"Match Ready"}],
        "pilates":      [{"week":"Week 1-2","label":"Core Foundation"},{"week":"Week 3-4","label":"Strength & Control"},{"week":"Week 5-6","label":"Peak Stability"}],
        "golf":         [{"week":"Week 1-2","label":"Mobility Base"},{"week":"Week 3-4","label":"Power Development"},{"week":"Week 5-6","label":"Swing Integration"}],
        "crosscountry": [{"week":"Week 1-2","label":"Aerobic Base"},{"week":"Week 3-5","label":"Threshold Building"},{"week":"Week 6-8","label":"Race Specific"}],
    }

    # Pre-built sessions for football and basketball (3 phases × 3 days)
    built_sessions = {
        "football": [
            [
                {"day":"Monday","workout":"Lower Power","duration":"60 min","exercises":[
                    {"name":"Dumbbell Goblet Squat","sets":5,"reps":"6 reps","rest":"3 min","desc":"Hold one heavy dumbbell at chest height, full depth. The goblet squat is the most teachable squat pattern - torso stays upright, hips open, drive through the floor. Load it progressively every session."},
                    {"name":"Dumbbell Romanian Deadlift","sets":4,"reps":"8 reps","rest":"2 min","desc":"Two dumbbells, hip hinge, lower to mid-shin. Posterior chain strength drives every block and tackle. Control the descent, drive through the hips to lockout."},
                    {"name":"Dumbbell Lateral Lunge","sets":4,"reps":"10 each leg","rest":"90s","desc":"Step wide, drive knee out, push back through the heel. Football demands lateral power for cuts and pursuit angles. Lateral loading trains the exact quality needed on the field."},
                    {"name":"Dumbbell Hip Thrust","sets":4,"reps":"10 reps","rest":"90s","desc":"Shoulders on bench, dumbbell on hips, drive to full extension. Isolated glute strength powers sprint acceleration and leg drive in a run block. Squeeze at the top."},
                ]},
                {"day":"Wednesday","workout":"Upper Push & Pull","duration":"55 min","exercises":[
                    {"name":"Dumbbell Bench Press","sets":5,"reps":"6 reps","rest":"3 min","desc":"Feet flat, arch the back, lower to chest, press powerfully. Each arm works independently - no weak side can hide. Chest, shoulder, and tricep strength translates directly to blocking power."},
                    {"name":"Dumbbell Bent-Over Row","sets":5,"reps":"8 reps","rest":"2 min","desc":"Hip hinge at 45 degrees, row both dumbbells to ribcage. Upper back strength supports every hand-fighting technique and tackle mechanic. Squeeze the scapula at the top of every rep."},
                    {"name":"Dumbbell Arnold Press","sets":4,"reps":"10 reps","rest":"90s","desc":"Rotate from palms facing you to palms out as you press. Full shoulder range and deltoid development. Protect the shoulder joint while building the pressing power football demands."},
                    {"name":"Dumbbell Renegade Row","sets":3,"reps":"8 each arm","rest":"2 min","desc":"Plank position, row one dumbbell at a time. Upper back strength combined with anti-rotation core stability - the exact combination needed to win a hand fight."},
                ]},
                {"day":"Friday","workout":"Explosiveness","duration":"55 min","exercises":[
                    {"name":"Dumbbell Power Clean","sets":5,"reps":"4 reps","rest":"2 min","desc":"Explode from the hips, shrug, catch at shoulders. The dumbbell allows a natural wrist rotation. Trains the triple-extension pattern behind every explosive football play."},
                    {"name":"Dumbbell Jump Squat","sets":4,"reps":"6 reps","rest":"90s","desc":"Hold light dumbbells at sides, squat, explode into a jump. Plyometric training with resistance converts gym strength to on-field explosiveness. Land softly and reset each rep."},
                    {"name":"Dumbbell Farmer Carry","sets":5,"reps":"40m","rest":"60s","desc":"Heaviest dumbbells available, walk tall. Grip strength and full-body stability built here shows up in every hand fight. If you can carry it heavy, you can hold anything on the field."},
                    {"name":"Dumbbell Push Press","sets":4,"reps":"6 reps","rest":"90s","desc":"Slight knee dip, drive through legs, press overhead explosively. The same kinetic chain as punching a blocker off the line - leg drive to upper body power in one movement."},
                ]},
            ],
            [
                {"day":"Monday","workout":"Power Lower","duration":"65 min","exercises":[
                    {"name":"Dumbbell Goblet Squat","sets":5,"reps":"5 reps","rest":"3 min","desc":"Heavier than weeks 1-2. Progressive overload is non-negotiable - the only path to the strength that makes you physically dominant on the field."},
                    {"name":"Dumbbell Single-Leg Romanian Deadlift","sets":4,"reps":"8 each leg","rest":"2 min","desc":"Single-leg posterior chain loading. Football is played on one leg - every plant, cut, and drive happens on a single support. Single-leg strength closes the gap."},
                    {"name":"Dumbbell Sumo Squat","sets":4,"reps":"8 reps","rest":"90s","desc":"Wide stance, one dumbbell between legs, full depth. The sumo stance loads the adductors and inner thighs - the muscles behind lateral power and a wide blocking base."},
                    {"name":"Dumbbell Step-Up Jump","sets":4,"reps":"8 each leg","rest":"90s","desc":"Step onto a box holding dumbbells, drive into an explosive jump at the top. Single-leg power production at its most sport-specific - the same movement as driving off the line of scrimmage."},
                ]},
                {"day":"Wednesday","workout":"Explosive Upper","duration":"55 min","exercises":[
                    {"name":"Dumbbell Incline Press","sets":5,"reps":"8 reps","rest":"2 min","desc":"30-45 degree incline, full range. Upper chest and anterior deltoid development. Incline pressing builds the upward pushing power needed to punch blockers off the line."},
                    {"name":"Dumbbell Chest-Supported Row","sets":4,"reps":"10 reps","rest":"90s","desc":"Chest on incline bench, row dumbbells. Eliminates lower back compensation for maximum upper back loading. The back side of every tackle and pass rush move."},
                    {"name":"Dumbbell Lateral Raise","sets":4,"reps":"15 reps","rest":"60s","desc":"Raise to shoulder height, controlled descent. Medial deltoid development for shoulder width and stability - the contact sport shoulder that stays healthy under repeated impact."},
                    {"name":"Dumbbell Hammer Curl","sets":3,"reps":"12 each arm","rest":"60s","desc":"Neutral grip, curl, control down. Brachialis and forearm mass for grip strength. You cannot hold a tackle or win a hand fight without elite grip."},
                ]},
                {"day":"Friday","workout":"Athletic Lower","duration":"60 min","exercises":[
                    {"name":"Dumbbell Bulgarian Split Squat","sets":4,"reps":"10 each leg","rest":"90s","desc":"Rear foot elevated, dumbbells at sides. The most effective unilateral leg exercise available - nothing builds single-leg strength faster. Load it heavier every week."},
                    {"name":"Dumbbell Good Morning","sets":4,"reps":"10 reps","rest":"90s","desc":"Dumbbells on shoulders, hinge from the hips. Posterior chain strength and hamstring flexibility combined. The hinge pattern built here transfers directly to blocking leverage."},
                    {"name":"Dumbbell Calf Raise","sets":4,"reps":"20 reps","rest":"60s","desc":"Hold dumbbells, single-leg, full range. Calf and Achilles strength powers sprint acceleration. The first step off the line begins with the ankle."},
                    {"name":"Dumbbell Lateral Shuffle Hold","sets":5,"reps":"10m each","rest":"60s","desc":"Hold dumbbells, shuffle laterally in athletic position. Added resistance makes the unloaded version feel effortless. Defensive footwork under load."},
                ]},
            ],
            [
                {"day":"Monday","workout":"Max Lower","duration":"65 min","exercises":[
                    {"name":"Dumbbell Goblet Squat Peak","sets":4,"reps":"5 rep max","rest":"4 min","desc":"Heaviest possible goblet squat. Your dumbbell squat benchmark at program end - record and compare to week 1. Strength is the variable. Build it."},
                    {"name":"Dumbbell Power Clean Peak","sets":4,"reps":"4 reps @ peak","rest":"3 min","desc":"Maximum dumbbell clean load. Your explosiveness benchmark at program end."},
                    {"name":"Dumbbell Jump Squat Complex","sets":5,"reps":"5 reps","rest":"2 min","desc":"Peak weight, maximum explosiveness. Power at the highest point of the program. Every rep should be maximum effort."},
                    {"name":"Dumbbell Farmer Carry Peak","sets":5,"reps":"50m","rest":"90s","desc":"Heaviest load of the program. Grip and full-body stability at maximum. Record the weight used."},
                ]},
                {"day":"Wednesday","workout":"Max Upper","duration":"60 min","exercises":[
                    {"name":"Dumbbell Bench Press Peak","sets":4,"reps":"5 rep max","rest":"4 min","desc":"Heaviest dumbbell pressing load of the program. Record and compare to week 1. Eight weeks of progressive loading should show a clear increase."},
                    {"name":"Dumbbell Bent-Over Row Peak","sets":4,"reps":"6 reps","rest":"3 min","desc":"Maximum row load. Upper back strength at its peak - the pulling force behind every tackle and arm bar."},
                    {"name":"Dumbbell Push Press Peak","sets":4,"reps":"4 reps","rest":"2 min","desc":"Maximum load, explosive press. Upper body power at program peak."},
                    {"name":"Dumbbell Renegade Row Peak","sets":3,"reps":"8 each arm","rest":"2 min","desc":"Peak load with core control. Upper back and core at maximum - the combination that wins contact at the point of attack."},
                ]},
                {"day":"Friday","workout":"Speed & Power Benchmark","duration":"60 min","exercises":[
                    {"name":"40-Yard Dash x5","sets":5,"reps":"1 rep","rest":"3 min","desc":"Record your best time. Speed benchmark at program end - compare to week 1. Eight weeks of dumbbell power training produces real, measurable speed improvements."},
                    {"name":"Broad Jump","sets":5,"reps":"5 reps","rest":"90s","desc":"Horizontal power benchmark. Compare to week 1. The distance gained represents real explosiveness built."},
                    {"name":"Dumbbell Hip Thrust Peak","sets":4,"reps":"10 reps @ peak","rest":"2 min","desc":"Maximum glute loading. The glute strength built here powers every explosive sprint and drive."},
                    {"name":"Dumbbell Bulgarian Split Squat Benchmark","sets":3,"reps":"8 each leg @ peak","rest":"2 min","desc":"Your unilateral strength benchmark. Compare load to week 1 - this is real, measurable progress."},
                ]},
            ],
        ],
        "basketball": [
            [
                {"day":"Monday","workout":"Lower Explosive","duration":"55 min","exercises":[
                    {"name":"Dumbbell Goblet Squat","sets":4,"reps":"8 reps","rest":"2 min","desc":"Heavy dumbbell at chest, full depth, explode up. Basketball demands repeated explosive jumps - the goblet squat builds the hip strength to make every jump higher and every landing safer."},
                    {"name":"Dumbbell Box Jump to Hold","sets":4,"reps":"5 reps","rest":"90s","desc":"Hold light dumbbells at sides, jump onto box, stick the landing. Added load makes the bodyweight version feel effortless in game situations. Record the box height each week."},
                    {"name":"Dumbbell Single-Leg Calf Raise","sets":4,"reps":"20 each leg","rest":"60s","desc":"Hold dumbbell, single-leg calf raise through full range. Calf strength and Achilles stiffness are primary contributors to jump height. Train each leg independently - no cheating with the stronger side."},
                    {"name":"Dumbbell Split Squat Jump","sets":4,"reps":"8 each leg","rest":"90s","desc":"Split stance, hold light dumbbells, jump and switch legs. Single-leg explosive power mirrors the push-off of a jump shot, layup, and first-step drive - the decisive basketball movements."},
                ]},
                {"day":"Wednesday","workout":"Agility & Strength","duration":"50 min","exercises":[
                    {"name":"Dumbbell Lateral Lunge","sets":5,"reps":"10 each side","rest":"60s","desc":"Wide lateral step, knee tracks over toes, push back through heel. Defensive footwork begins with lateral hip strength. Dumbbells add load to the exact movement pattern of a defensive slide."},
                    {"name":"Dumbbell Deadlift","sets":4,"reps":"6 reps","rest":"2 min","desc":"Two dumbbells, hip hinge to mid-shin, drive through heels. Total posterior chain strength in the basketball-specific upright position. The foundation of your jumping power."},
                    {"name":"Dumbbell Glute Bridge March","sets":4,"reps":"12 each leg","rest":"60s","desc":"Dumbbell on hips, bridge up, alternate marching knees. Hip stability and glute activation in a single-leg position - the quality that controls lateral change of direction."},
                    {"name":"Dumbbell Carry Sprint","sets":6,"reps":"20m","rest":"60s","desc":"Hold light dumbbells, sprint at maximum pace. Added resistance forces stronger first-step mechanics. Drop the dumbbells and unloaded sprinting feels dramatically faster."},
                ]},
                {"day":"Friday","workout":"Strength & Core","duration":"55 min","exercises":[
                    {"name":"Dumbbell Romanian Deadlift","sets":4,"reps":"8 reps","rest":"2 min","desc":"Hip hinge, both dumbbells, lower to shin. Hamstring strength protects against the strain that ends seasons and builds the posterior chain power behind your vertical."},
                    {"name":"Dumbbell Single-Arm Overhead Press","sets":3,"reps":"12 each arm","rest":"60s","desc":"Single-arm press from shoulder to lockout. Core resists rotation while the shoulder builds pressing strength. The overhead stability built here improves your reach at the rim."},
                    {"name":"Dumbbell Single-Leg Romanian Deadlift","sets":3,"reps":"8 each leg","rest":"90s","desc":"Single-leg hinge with dumbbell. Eccentric hamstring control and single-leg balance. The strongest athletes are equally powerful on both legs."},
                    {"name":"Dumbbell Copenhagen Side Bridge","sets":3,"reps":"30s each side","rest":"30s","desc":"Top foot on elevated surface, hold dumbbell on hip. Adductor and hip stability - the inner thigh and groin strength that keeps you healthy through a full season of lateral movements."},
                ]},
            ],
            [
                {"day":"Monday","workout":"Jump Development","duration":"60 min","exercises":[
                    {"name":"Dumbbell Goblet Squat","sets":5,"reps":"5 reps","rest":"3 min","desc":"Heavier load. Strength gains are directly proportional to vertical improvement - every pound added to your squat translates to inches on your vertical jump. Add weight every session."},
                    {"name":"Dumbbell Depth Drop to Jump","sets":5,"reps":"5 reps","rest":"2 min","desc":"Hold light dumbbells, step off surface, absorb, immediately jump maximally. Reactive strength with added load - when the dumbbells come off, your vertical will feel like a different movement entirely."},
                    {"name":"Dumbbell Step-Up Jump","sets":4,"reps":"8 each leg","rest":"90s","desc":"Step up with one leg holding dumbbells, drive into an explosive jump at the top. The approach vertical - the power behind alley-oops, layups, and attacks at the rim."},
                    {"name":"Dumbbell Romanian Split Jump","sets":4,"reps":"8 each leg","rest":"90s","desc":"Lunge position with dumbbells, drive back leg knee up explosively into a jump. Single-leg power with hip flexor drive - the exact sequence behind a drive to the rim."},
                ]},
                {"day":"Wednesday","workout":"Speed & Power","duration":"55 min","exercises":[
                    {"name":"Dumbbell Snatch","sets":5,"reps":"5 each arm","rest":"90s","desc":"Single-arm explosive pull from hip to overhead in one movement. Total body power in a vertical pattern - the exact muscle sequence as a jump and finish. Train it fast and smooth."},
                    {"name":"Dumbbell Swing","sets":5,"reps":"15 reps","rest":"60s","desc":"Hip hinge-driven swing to chest height. Posterior chain power in continuous rhythm. Builds the endurance strength that keeps your vertical jump consistent in the 4th quarter."},
                    {"name":"Dumbbell Lateral Lunge Continuous","sets":5,"reps":"10 each side","rest":"60s","desc":"Continuous alternating lateral lunges with dumbbells. Defensive lateral speed under load. When you drop the dumbbells, your lateral quickness will feel dramatically improved."},
                    {"name":"Dumbbell Carry Sprint","sets":8,"reps":"20m","rest":"60s","desc":"Maximum sprint with light dumbbells. End-to-end intensity with added resistance - simulates the high-intensity output of a full game at an elevated demand."},
                ]},
                {"day":"Friday","workout":"Strength & Benchmark","duration":"55 min","exercises":[
                    {"name":"Dumbbell Deadlift","sets":4,"reps":"5 reps","rest":"2 min","desc":"Maximum load. Total posterior chain strength - the engine behind jumping power. Record the weight every session and add load weekly."},
                    {"name":"Dumbbell Jump Squat Benchmark","sets":5,"reps":"5 reps","rest":"2 min","desc":"Maximum jump height with light dumbbells at sides. Power development benchmark. Compare to week 1 - this is measurable athletic progress."},
                    {"name":"Dumbbell Bent-Over Row","sets":4,"reps":"8 reps","rest":"90s","desc":"Upper back loading. Lat and rhomboid strength for athleticism and injury resilience through a full season."},
                    {"name":"Dumbbell Farmer Carry","sets":3,"reps":"40m","rest":"75s","desc":"Heavy and upright. Full-body stability and grip strength - the athletic foundation underneath every other quality you are building."},
                ]},
            ],
            [
                {"day":"Monday","workout":"Peak Vertical","duration":"60 min","exercises":[
                    {"name":"Dumbbell Goblet Squat Benchmark","sets":3,"reps":"5 rep max","rest":"4 min","desc":"Your strength benchmark at program end. Record and compare to week 1. Six weeks of loading should show clear progress - strength is the variable that controls your athletic ceiling."},
                    {"name":"Dumbbell Jump Complex","sets":5,"reps":"5 jumps","rest":"2 min","desc":"5 continuous vertical jumps holding light dumbbells, minimum ground time. Reactive endurance at program peak - the quality that keeps your vertical consistent in the 4th quarter."},
                    {"name":"Dumbbell Step-Up Jump Peak","sets":5,"reps":"5 each leg","rest":"90s","desc":"Game-specific vertical at maximum load and effort. This is what shows up in competition."},
                    {"name":"Dumbbell Single-Leg Romanian Deadlift Peak","sets":4,"reps":"8 each leg","rest":"90s","desc":"Peak single-leg strength. The strength built here supports landing mechanics and protects the knee through an entire season of explosive movements."},
                ]},
                {"day":"Wednesday","workout":"Court Speed","duration":"55 min","exercises":[
                    {"name":"Full Court Sprint x10","sets":3,"reps":"10 lengths","rest":"2 min","desc":"Ten half-court lengths at maximum pace. Peak sprint conditioning without load - the speed built over six weeks of dumbbell training now expressed at maximum output."},
                    {"name":"Dumbbell Lateral Lunge Peak","sets":6,"reps":"10 each side","rest":"60s","desc":"Maximum lateral load. Defensive court speed at peak - record the weight used at program end."},
                    {"name":"Dumbbell Snatch Complex","sets":5,"reps":"5 each arm","rest":"90s","desc":"Peak load single-arm snatch. Total body power at program maximum."},
                    {"name":"Dumbbell Jump Fatigue Test","sets":3,"reps":"10 jumps","rest":"60s","desc":"10 continuous jumps with light dumbbells. Reactive endurance - can you maintain your vertical in the 4th quarter? Record average height and compare to week 1."},
                ]},
                {"day":"Friday","workout":"Benchmark Day","duration":"55 min","exercises":[
                    {"name":"Dumbbell Deadlift Peak","sets":3,"reps":"3 rep max","rest":"4 min","desc":"Your total strength number at program end. Record and compare to week 1 - this is the objective measure of 6 weeks of work."},
                    {"name":"Standing Broad Jump","sets":5,"reps":"5 reps","rest":"90s","desc":"Horizontal power benchmark. Compare to week 1 - the distance gained represents real explosiveness built in the weight room."},
                    {"name":"Dumbbell Single-Leg Jump","sets":3,"reps":"5 each leg","rest":"90s","desc":"One-leg vertical jump with light dumbbells. The game jump. Compare to week 1 and to the bodyweight version."},
                    {"name":"Dumbbell Farmer Carry Peak","sets":3,"reps":"50m","rest":"90s","desc":"Heaviest load of the program. Your grip and stability benchmark at program end. Record the weight."},
                ]},
            ],
        ],
    }

    # Exercise tuples per sport: (name, sets, reps, rest, desc)
    sport_dumbbell_exs = {
        "strength": [
            [("Dumbbell Goblet Squat","5","6 reps","3 min","The squat pattern with a single dumbbell held at the chest. Full depth, drive through the floor. This is your primary lower body movement - progressive overload is the only rule. Add weight every session."),
             ("Dumbbell Bench Press","5","6 reps","3 min","Each side works independently - no weak side can hide. Arch the back, lower to chest, press powerfully. Add weight every session. This is your pressing strength benchmark."),
             ("Dumbbell Romanian Deadlift","5","6 reps","3 min","Hip hinge with two heavy dumbbells, lower to mid-shin. The posterior chain built here is the foundation of your total strength. Drive through the heels to lockout."),
             ("Dumbbell Overhead Press","5","8 reps","3 min","Strict press, no leg drive, from shoulder to lockout. Shoulder strength and stability are foundational. Add weight consistently - overhead strength is earned slowly and lost quickly.")],
            [("Dumbbell Goblet Squat","5","5 reps","3 min","Heavier than weeks 1-2. 5-10lb added. Linear progression is the system - trust it. Record every set's load without exception."),
             ("Dumbbell Floor Press","5","5 reps","3 min","Lie on floor, press from a dead stop. Eliminates the stretch reflex and demands pure pressing strength. Heavier than last week."),
             ("Dumbbell Single-Leg Romanian Deadlift","4","8 each leg","2 min","Unilateral posterior chain loading. Closes strength gaps between sides. The strongest athletes have zero imbalance between left and right."),
             ("Dumbbell Bent-Over Row","4","8 reps","90s","Hip hinge at 45 degrees, row both dumbbells to ribcage. Upper back strength to support all pressing. Row as heavy as you press - this is the rule.")],
            [("Dumbbell Goblet Squat Peak","3","5 rep max","4 min","Your strength benchmark. Record the heaviest load for 5 clean reps and compare to week 1. This number tells you exactly how much strength you built."),
             ("Dumbbell Bench Press Peak","3","5 rep max","4 min","Maximum pressing load. Your pressing benchmark at program end. Record and compare."),
             ("Dumbbell Romanian Deadlift Peak","3","5 rep max","4 min","Maximum hinge load. Your posterior chain benchmark at program end."),
             ("Dumbbell Overhead Press Peak","3","5 rep max","4 min","Your overhead strength benchmark at program end. Record and compare to week 1.")],
        ],
        "weightloss": [
            [("Dumbbell Goblet Squat to Press","4","12 reps","60s","Full-depth goblet squat into an overhead press at the top. More muscles working simultaneously means more calories burned. The most metabolically efficient movement in this program."),
             ("Dumbbell Swing","8","20 reps","60s","Hip hinge-powered swing to shoulder height. The most metabolically demanding dumbbell exercise per unit time. Maximum hip drive every rep, never round the lower back."),
             ("Dumbbell Reverse Lunge","4","12 each leg","60s","Step back, lower the rear knee, drive forward through the front heel. Unilateral loading builds muscle while the total volume creates significant metabolic demand."),
             ("Dumbbell Burpee to Curl","3","10 reps","30s","Push-up, jump to feet, bicep curl at the top. Full body conditioning - maximum muscle groups in a continuous movement. No resting between reps.")],
            [("Dumbbell Thruster","4","10 reps","90s","Front-racked squat driving directly into an overhead press. The most calorically expensive single dumbbell exercise per rep. Maximum effort every set."),
             ("Dumbbell HIIT Complex","4","5 reps each","2 min","Deadlift > Row > Clean > Press > Squat without setting dumbbells down. The most metabolically demanding dumbbell sequence available. Complete rest between rounds."),
             ("Dumbbell Lateral Lunge Jump","5","10 each side","60s","Lunge laterally, immediately explode into a jump. Plyometric loading on the lateral pattern - maximum caloric expenditure with muscular development."),
             ("Dumbbell Single-Arm Snatch","5","10 each arm","90s","Explosive single-arm pull to overhead. Total body power at elevated heart rate. Heavy snatches at high volume produce exceptional caloric expenditure.")],
            [("Dumbbell Deadlift","5","8 reps","90s","Heavy and high volume. The combination of heavy load and moderate volume creates the greatest metabolic disruption achievable with dumbbells."),
             ("Dumbbell AMRAP Complex","3","8 min","2 min","8 minutes: 10 thrusters + 10 swings + 10 renegade rows. Record rounds completed. Your cardiovascular fitness benchmark at program end."),
             ("Dumbbell 30/30 Swings","10","30s on / 30s off","30s","Maximum swing output for 30 seconds, 30 seconds active rest. Nothing burns more per minute than maximum effort swings at this density.")],
        ],
        "weightgain": [
            [("Dumbbell Goblet Squat","4","10 reps","90s","Full depth, 3-second descent, explode up. Time under tension drives hypertrophy. The king of dumbbell leg exercises for muscle growth - every set should feel like you earned it."),
             ("Dumbbell Bench Press","4","10 reps","90s","Full range of motion - feel the stretch at the bottom and the contraction at the top. Muscle is built in the range, not with partial reps. Control the eccentric."),
             ("Dumbbell Bent-Over Row","4","10 reps","90s","Pull to the ribcage, hold for one count, lower with control. Upper back mass requires high volume rowing - this is your most important upper body pulling movement."),
             ("Dumbbell Overhead Press","4","10 reps","90s","Primary shoulder developer. Full range at controlled tempo produces 3D deltoid development that changes how you look in a shirt."),
             ("Dumbbell Romanian Deadlift","4","12 reps","90s","Hamstring emphasis. Stretch at the bottom, drive through the hips. Hamstring mass balances the quad-dominant demands of heavy squatting.")],
            [("Dumbbell Goblet Squat","5","10 reps","90s","One more set than weeks 1-2. Volume is a form of progressive overload. Five sets of squatting builds the leg mass that makes the lower body look proportional."),
             ("Dumbbell Incline Bench Press","5","10 reps","90s","30-degree incline for upper chest emphasis. Five sets of incline pressing builds the chest depth that changes how clothing fits."),
             ("Dumbbell Deadlift","4","8 reps","2 min","Both dumbbells, conventional stance, maximum load. The dumbbell deadlift triggers more total muscle growth than any other dumbbell exercise. Load it heavy."),
             ("Dumbbell Renegade Row","4","10 each arm","90s","Plank position, alternating rows. Lat and rhomboid development with core integration. Your back width is built by pulling volume - add it here."),
             ("Dumbbell Bulgarian Split Squat","3","15 each leg","90s","Supplemental unilateral quad volume. Single-leg loading adds mass while closing side-to-side strength gaps.")],
            [("Dumbbell Goblet Squat","4","8 reps","2 min","Near-maximal loading. Strength gains in this phase directly predict mass gains - strong muscles are big muscles."),
             ("Dumbbell Bench Press Dropset","4","10 + 10 drop","90s","Heavy set of 10, immediately drop weight and hit 10 more. Mechanical tension plus metabolic stress produces the maximum hypertrophy signal available."),
             ("Dumbbell Deadlift Peak","3","8 reps","2 min","Maximum load. Your total posterior chain strength benchmark at program end."),
             ("Dumbbell Fly Dropset","3","15 + 10 drop","75s","Chest isolation with a drop set. Full stretch at the bottom, hard squeeze at the top. The finishing movement for complete pectoral development.")],
        ],
        "hiit": [
            [("Dumbbell Swing","10","30s on / 30s off","30s","Hip-powered swing to shoulder height. The foundation of dumbbell HIIT - builds the posterior chain while keeping heart rate at maximum. This is your primary conditioning tool."),
             ("Dumbbell Goblet Squat Jump","8","20s on / 10s off","30s","Goblet squat into an explosive jump. Tabata protocol with a loaded squat jump. Heart rate above 90% max - do not let it drop."),
             ("Dumbbell Push Press","6","30s on / 30s off","30s","Dip and drive to press overhead rapidly. Upper body power conditioning under fatigue. Keep the reps explosive - once reps become slow, rest."),
             ("Dumbbell Renegade Row","5","10 each arm","60s","Plank position, alternating rows. Core stability under fatigue - builds the stabilizing endurance behind every explosive movement.")],
            [("Dumbbell Thruster Intervals","10","20s on / 10s off","2 min between rounds","Front-racked squat to overhead press. The most metabolically expensive dumbbell movement. Heart rate peaks above 90% max - complete rest between rounds."),
             ("Dumbbell HIIT Complex","5","5 reps each","90s","Deadlift > Row > Clean > Press > Squat without setting dumbbells down. The most demanding dumbbell protocol available. Maximum effort, complete rest."),
             ("Dumbbell Snatch","8","30s on / 30s off","30s","Single-arm explosive pull to overhead. Continuous alternating arms. Total body power at maximum heart rate."),
             ("Dumbbell Carry Sprint","8","20m","45s","Hold heavy dumbbells, sprint maximum distance. Maximum output with added load - when the dumbbells come off, unloaded sprints feel effortless.")],
            [("Dumbbell Benchmark Complex","4","AMRAP 7 min","2 min","7 minutes: 10 swings + 10 goblet squats + 10 push press. Record rounds completed. Your conditioning benchmark at program end."),
             ("Dumbbell Tabata Peak","8","20s on / 10s off","3 min between rounds","Maximum thruster output. 4 minutes at absolute peak. Nothing held back."),
             ("Dumbbell Snatch Test","3","10 each arm","90s","30 reps per arm at maximum load. Your power endurance benchmark at program end. Record load and compare to week 1.")],
        ],
        "crossfit": [
            [("Dumbbell Clean & Jerk","5","5 reps","2 min","Clean to shoulders, dip, drive overhead. The most technical dumbbell movement - trains the same full-body coordination as a barbell C&J with wrist-friendly rotation throughout."),
             ("Dumbbell Front Squat","4","8 reps","90s","Dumbbells at shoulders, full depth, torso upright. The front-racked position forces proper posture under load - the same position used in thrusters and wall ball shots."),
             ("Dumbbell Bent-Over Row","4","10 reps","90s","Upper back volume for gymnastics and pulling movements. Row volume is the strength base behind kipping pull-ups and bar muscle-ups."),
             ("Dumbbell Swing","4","20 reps","60s","American or Russian swing to shoulder height. The foundational dumbbell conditioning tool for CrossFit - trains the hip hinge power behind every clean and snatch.")],
            [("Dumbbell Thruster","5","10 reps","2 min","Front-racked squat to overhead press in one movement. The signature CrossFit dumbbell movement - smooth, powerful, continuous. Train it at weights you can sustain for full sets."),
             ("Dumbbell Snatch","5","10 each arm","90s","Explosive single-arm pull to overhead. Power and coordination combined. Dumbbell snatches appear in competitive CrossFit - own the movement."),
             ("Dumbbell AMRAP WOD","3","8 min","2 min","8 minutes: 15 swings + 10 goblet squats + 5 push press. Record rounds completed. This is your conditioning benchmark."),
             ("Dumbbell Deadlift","4","8 reps","90s","Heavy pulling volume. Deadlift strength underlies every loaded carry and ground-to-overhead movement in CrossFit.")],
            [("Dumbbell Benchmark WOD","3","AMRAP 10 min","2 min","10 minutes: 10 thrusters + 10 renegade rows + 10 snatches each arm. Record rounds. Compare to week 1."),
             ("Dumbbell Thruster Peak","5","10 reps","2 min","Maximum load. Your pressing power benchmark at program end."),
             ("Dumbbell Snatch Complex","5","10 each arm","90s","Peak load. Total body power at maximum. Your power benchmark at program end."),
             ("Dumbbell Deadlift Peak","3","3 rep max","3 min","Your strength benchmark at program end. Record and compare to week 1.")],
        ],
        "track": [
            [("Dumbbell Goblet Squat","5","6 reps","2 min","Full depth, explosive up. Sprint power comes from hip extension strength. The squat pattern is the primary strength movement for any speed athlete - build it with progressive overload."),
             ("Dumbbell Romanian Deadlift","4","8 reps","2 min","Hamstring and glute loading. Posterior chain strength determines your maximum force per stride. Load it heavy and control the descent - every pound here equals speed on the track."),
             ("Dumbbell Single-Leg Step-Up","4","8 each leg","90s","Single-leg step up with heavy dumbbells. Sprint is a single-leg exercise - every stride drives from one leg. Build that leg independently with consistent progressive loading."),
             ("Dumbbell Single-Leg Calf Raise","4","20 each leg","60s","Hold dumbbell, single-leg calf raise with full range. Sprint acceleration begins at the ankle. Calf strength and Achilles stiffness directly contribute to ground contact time and stride power.")],
            [("Dumbbell Power Clean","4","4 reps","2 min","Triple extension pattern - the same sequence as sprint mechanics. Hip drive, shrug, catch at shoulder. Power clean training directly improves sprint acceleration off the blocks."),
             ("Dumbbell Jump Squat","5","6 reps","90s","Hold dumbbells at sides, squat and explode into maximum jump. Plyometric training with resistance converts gym strength into sprint power that shows up in your split times."),
             ("Dumbbell Single-Leg Romanian Deadlift","4","8 each leg","90s","Single-leg hinge with heavy dumbbell. Addresses sprint-specific posterior chain demands with unilateral loading that no bilateral exercise can replicate."),
             ("Dumbbell Acceleration Farmer Carry","5","20m","90s","Explode from a static start into a 20m carry sprint. Simulates the acceleration phase with added resistance - when unloaded, your start will feel dramatically faster.")],
            [("Dumbbell Power Snatch","4","4 each arm","2 min","Explosive single-arm pull to overhead. Peak power expression at program end. The strength-to-power ratio built here is the exact quality sprint coaches develop in elite athletes."),
             ("Dumbbell Jump Complex","5","5 reps","2 min","Heavy goblet squat into maximum jump. Strength-to-power conversion at program peak. Every rep is maximum intent."),
             ("Dumbbell Hip Hinge Sprint Prep","5","30m","2 min","Romanian deadlift position, drive through hips into a sprint. Directly connects posterior chain strength to sprint mechanics."),
             ("Sprint Time Trial","4","30m","3 min","Unloaded maximum sprint. Your speed benchmark at program end - compare to week 1. This is what 6 weeks of dumbbell power training produces.")],
        ],
        "baseball": [
            [("Dumbbell Rotational Row","4","10 each side","90s","Hinge forward, row dumbbell with a rotational pull at the top. The rotational pull is the foundation of every swing and throw - train the exact pattern under progressive load."),
             ("Dumbbell Goblet Squat","4","8 reps","90s","Hip hinge squat, full depth. Lower body strength for the athletic base position. Every powerful swing and throw begins from a strong, stable lower body foundation."),
             ("Dumbbell Single-Arm Press","4","10 each arm","90s","Single-arm overhead press with core bracing. Shoulder strength and stability for throwing mechanics. Train each arm separately - the imbalance from a dominant throwing arm must be addressed."),
             ("Dumbbell Romanian Deadlift","4","10 reps","90s","Hip hinge, full range. Hamstring strength for explosive hip rotation and sprint acceleration to first base and across the outfield.")],
            [("Dumbbell Rotational Clean","4","8 each side","90s","Single-arm clean from hip to shoulder with a full rotational drive. Trains the exact hip-to-shoulder power sequence of a swing. The most sport-specific dumbbell movement for baseball athletes."),
             ("Dumbbell Lateral Lunge with Rotation","4","10 each side","90s","Lateral lunge holding dumbbell, rotate toward outside knee at bottom. Hip mobility and rotational strength combined - the movement pattern behind a wide defensive stance and lateral reaction in the field."),
             ("Dumbbell Waiter's Walk","4","30m each arm","60s","Single dumbbell overhead with locked elbow, walk with perfect posture. Shoulder stability and core control for throwing health. The shoulder built here can withstand a full season of throwing volume."),
             ("Dumbbell Cuban Press","3","12 reps","60s","External rotation at shoulder height to overhead press. Rotator cuff strengthening and arm care. The most important exercise for pitcher shoulder health - never skip this.")],
            [("Dumbbell Rotational Power Complex","4","8 each side","2 min","Clean + Row + Press, all with rotational drive. Total body rotational power at program peak."),
             ("Dumbbell Goblet Squat Benchmark","3","5 rep max","3 min","Your strength benchmark at program end. Record the peak load and compare to week 1."),
             ("Dumbbell Single-Arm Snatch","4","6 each arm","2 min","Explosive pull to overhead. Rotational power at maximum. Your power benchmark."),
             ("Dumbbell External Rotation Benchmark","3","15 each arm","60s","Shoulder health maintenance at program end. The arm that feels the best in week 6 is the one that was taken care of throughout.")],
        ],
        "tennis": [
            [("Dumbbell Lateral Lunge","5","10 each side","60s","Wide lateral step, knee tracks out. Tennis is a lateral sport - every shot setup, split step, and recovery requires explosive lateral power. Train the exact movement with progressive loading."),
             ("Dumbbell Single-Arm Row","4","12 each arm","90s","One knee and hand on bench, heavy row. Upper back and lat strength for serve power. The pulling muscles determine how hard you can throw the racket through the ball at contact."),
             ("Dumbbell Goblet Squat","4","10 reps","90s","Athletic position squat. Lower body strength for court coverage and split-step explosiveness. A weak lower body is the root cause of slow court movement."),
             ("Dumbbell Lateral Raise","4","15 reps","60s","Raise to shoulder height, hold one count, lower with control. Shoulder stability for overhead serve mechanics. Build the rotator cuff foundation before loading the serve aggressively.")],
            [("Dumbbell Rotational Row","5","10 each side","90s","Hinge and row with hip rotation. Rotational pulling strength mirrors the shoulder internal rotation of a groundstroke. Train the exact pattern at increasing load."),
             ("Dumbbell Single-Leg Deadlift","4","10 each leg","90s","Single-leg Romanian deadlift. Unilateral strength for split-step landing and drive. Every explosive first step off the split-step begins and ends on one leg."),
             ("Dumbbell Push Press","4","10 reps","90s","Dip and drive to press overhead. Serve power comes from the full kinetic chain - leg drive to core to arm. Train the complete sequence under load."),
             ("Dumbbell Carry Lateral Shuffle","5","10m each side","60s","Hold dumbbells, shuffle laterally at speed. Court footwork loaded - when the dumbbells come off, defensive movement feels dramatically faster.")],
            [("Dumbbell Lateral Lunge Jump","4","10 each side","90s","Lateral lunge into an explosive lateral jump. Reactive lateral power at program peak. The physical quality that wins the point on a wide ball."),
             ("Dumbbell Rotational Complex","4","8 each side","2 min","Row + Press + Lateral raise in one rotational sequence. Total serve mechanics at program end."),
             ("Dumbbell Goblet Squat Benchmark","3","5 rep max","3 min","Strength benchmark at program end. Record the peak load and compare."),
             ("Dumbbell Shoulder Circuit","3","15 each","45s","Lateral raise + Front raise + Cuban press. Shoulder health and serve power maintenance at program end - the shoulder that is healthy finishes matches.")],
        ],
        "pilates": [
            [("Dumbbell Deadbug","4","10 each side","60s","Hold dumbbell overhead, extend opposite leg, press lower back to floor throughout. Core anti-extension stability under load. The foundational bracing pattern behind every Pilates movement."),
             ("Dumbbell Single-Leg Romanian Deadlift","3","10 each leg","90s","Hip hinge on one leg, dumbbell in opposite hand. Balance, core stability, and posterior chain strength combined. The standing posture built here carries into every movement pattern."),
             ("Dumbbell Goblet Squat","3","12 reps","75s","Hip strength and mobility with load. Strong hips protect the lower back - the central principle of Pilates performance."),
             ("Dumbbell Overhead Carry","3","30m","60s","Single dumbbell overhead, locked elbow, walk with perfect posture. Shoulder stability and core control - the overhead position that every Pilates extension exercise demands.")],
            [("Dumbbell Glute Bridge Press","4","12 reps","60s","Bridge position, press dumbbells from chest. Glute activation with chest pressing. Core bracing under compound load - the central Pilates principle with added resistance."),
             ("Dumbbell Side-Lying Abduction","3","20 each side","45s","Lie on side, hold dumbbell on top hip, lift. Hip abductor loading builds the lateral hip strength that creates postural stability Pilates demands throughout every movement."),
             ("Dumbbell Pallof Press","3","12 each side","60s","Anti-rotational core stability holding dumbbell at arm's length. Trains the exact core control used in every rotational Pilates exercise."),
             ("Dumbbell Around the World","3","10 each direction","45s","Light dumbbell, arms fully extended, circle overhead. Shoulder stability, thoracic mobility, and scapular control - the three pillars of upper body Pilates work.")],
            [("Dumbbell Core Series","4","10 each","45s","Deadbug + Single-leg RDL + Pallof press. Full core stability sequence at program peak."),
             ("Dumbbell Overhead Squat","3","12 reps","75s","Hold dumbbells overhead, squat. The peak stability expression - requires total body alignment that is the ultimate goal of Pilates strength work."),
             ("Dumbbell Side Bend","3","15 each side","45s","Stand with dumbbell in one hand, controlled lateral trunk bend. Lateral flexion strength and spinal mobility."),
             ("Dumbbell Suitcase Carry","3","20m each arm","60s","Single arm carry with focus on level hips. Trains anti-lateral flexion core control - the postural quality that defines Pilates movement quality.")],
        ],
        "golf": [
            [("Dumbbell Romanian Deadlift","4","10 reps","90s","Hip hinge with full posterior chain engagement. The golf swing is a hip hinge followed by rotation - the deadlift pattern is the strength foundation for every powerful drive off the tee."),
             ("Dumbbell Single-Arm Rotational Row","4","12 each side","90s","Hinge and pull with a rotational drive at the top. The backswing and downswing are rotational pulls - train the exact pattern at increasing loads every week."),
             ("Dumbbell Lateral Lunge","4","10 each side","75s","Wide lateral step, knee tracking out. Hip mobility and lateral leg strength for a stable, wide stance at address. A narrow base produces a narrow, weak swing with no power."),
             ("Dumbbell Waiter's Walk","3","30m each arm","60s","Single arm overhead, locked elbow, perfect posture. Shoulder stability and thoracic extension - the overhead position that creates the range for a full, powerful backswing.")],
            [("Dumbbell Rotational Clean","5","8 each side","90s","Single arm clean with a full hip drive and rotation. The kinetic chain of a golf swing in one exercise - hip fires first, core transmits, arm delivers."),
             ("Dumbbell Goblet Squat to Hip Hinge","4","10 reps","90s","Alternate between a goblet squat and a Romanian deadlift with the same dumbbell. Hip mobility complex - trains both patterns that define rotational athletic performance."),
             ("Dumbbell Push Press","4","10 reps","90s","Leg drive into an overhead press. The same kinetic chain sequence as a full swing - leg drive to core to arm. Train the complete sequence consistently."),
             ("Dumbbell External Rotation","4","15 each arm","60s","Elbow at 90 degrees, externally rotate against light dumbbell. Rotator cuff strength is the injury prevention mechanism that allows you to load the swing for power without shoulder pain.")],
            [("Dumbbell Swing","5","20 reps","90s","Hip-hinge driven swing to shoulder height at maximum load. The swing pattern at program peak - your rotational power benchmark at program end."),
             ("Dumbbell Rotational Complex Peak","4","10 each side","2 min","Clean + Row + Press with full rotational drive. Total body rotational chain at program maximum."),
             ("Dumbbell Single-Leg Romanian Deadlift","4","10 each leg","90s","Peak unilateral strength. The hip stability built here prevents the lateral sway that destroys swing consistency and costs yards off the tee."),
             ("Dumbbell Lateral Lunge Benchmark","3","10 each side @ peak","90s","Maximum lateral loading. Hip mobility and strength at program end. Record the weight.")],
        ],
        "crosscountry": [
            [("Dumbbell Goblet Squat","4","10 reps","90s","Running economy is directly improved by a strong squat pattern. The hip extension strength built here improves your stride efficiency and your ability to maintain pace in the final kilometer."),
             ("Dumbbell Single-Leg Romanian Deadlift","4","10 each leg","90s","Every foot strike and push-off in running happens on one leg. Single-leg posterior chain strength protects the hamstrings and improves drive phase power."),
             ("Dumbbell Single-Leg Calf Raise","4","25 each leg","60s","Hold dumbbell, single-leg full range calf raise. Calf strength and Achilles stiffness are the primary determinants of running economy. Build them with heavy single-leg work."),
             ("Dumbbell Farmer Carry","3","40m","75s","Heavy and upright. Grip strength, trunk stability, and postural endurance. The upright carry posture translates directly into more efficient running form over long distances.")],
            [("Dumbbell Step-Up","4","12 each leg","90s","Single-leg step-up with dumbbells. Cross country is run on single legs over varied terrain. Unilateral strength protects against the repetitive stress that accumulates across a full season of high mileage."),
             ("Dumbbell Good Morning","4","12 reps","90s","Dumbbells on shoulders, hinge from hips. Posterior chain endurance for the final miles. Hamstring and glute fatigue is the primary cause of form breakdown in the late stages of a race."),
             ("Dumbbell Hip Hinge Jump","4","8 reps","90s","Romanian deadlift position, explode through hips into a jump. Power training for runners improves stride length and turnover rate without adding unnecessary mass."),
             ("Dumbbell Overhead March","4","30m","60s","Arms overhead holding light dumbbells, march with high knees. Overhead stability and high-knee mechanics under load. Perfect running posture drill made harder.")],
            [("Dumbbell Goblet Squat Benchmark","3","5 rep max","3 min","Your strength benchmark at program end. Strength gains directly predict running economy improvement - a stronger athlete runs more efficiently at every pace."),
             ("Dumbbell Single-Leg Deadlift Benchmark","3","8 each leg @ peak","2 min","Maximum unilateral load. Your single-leg strength at program end. Compare to week 1."),
             ("Dumbbell Plyometric Step-Up","5","8 each leg","90s","Explosive step-up with dumbbells at program peak. Power endurance for the finishing kick in the final 400m."),
             ("5k Time Trial","1","5k","Done","Unloaded maximum effort run. Your aerobic benchmark at program end. Compare to week 1 - this is the result of 6 weeks of targeted dumbbell strength work.")],
        ],
    }

    phases = phases_map.get(sport_key, [
        {"week":"Week 1-2","label":"Dumbbell Foundation"},
        {"week":"Week 3-4","label":"Load Progression"},
        {"week":"Week 5-6","label":"Peak Performance"},
    ])

    # For 8-week programs not already in phases_map with 3 phases
    if "8 Week" in prog["duration"] and sport_key not in phases_map:
        phases = [
            {"week":"Week 1-2","label":"Dumbbell Foundation"},
            {"week":"Week 3-5","label":"Load Progression"},
            {"week":"Week 6-8","label":"Peak Performance"},
        ]

    # Use pre-built session data for football and basketball
    if sport_key in built_sessions:
        raw = built_sessions[sport_key]
        weeks = []
        for i, phase in enumerate(phases):
            sessions = raw[i] if i < len(raw) else raw[-1]
            weeks.append({"week":phase["week"],"label":phase["label"],"sessions":sessions})
        return weeks

    # Generate from exercise tuples for all other sports
    exs_by_phase = sport_dumbbell_exs.get(sport_key)
    if not exs_by_phase:
        exs_by_phase = [
            [("Dumbbell Goblet Squat","4","8 reps","90s",f"Primary lower body strength for {sport} athletes. Full depth, drive through the hips. Load progressively every session - strength is the variable."),
             ("Dumbbell Romanian Deadlift","4","10 reps","90s","Posterior chain development. Hamstring and glute strength is the engine behind every sport-specific explosive movement."),
             ("Dumbbell Bench Press","4","8 reps","90s","Upper body pressing strength with independent arm loading. Each side is challenged equally - no dominant side can compensate."),
             ("Dumbbell Bent-Over Row","4","8 reps","90s","Upper back and lat strength. Horizontal pulling volume builds the back thickness that supports every pushing, throwing, and rotational movement.")],
            [("Dumbbell Power Clean","4","4 reps","2 min","Triple extension power - the same movement pattern as every athletic explosive action. Train it heavy and fast."),
             ("Dumbbell Bulgarian Split Squat","4","8 each leg","90s","Unilateral leg strength. Single-leg power closes every athletic gap between average and elite performers."),
             ("Dumbbell Push Press","4","8 reps","90s","Full body pressing power. Drive through the legs, press overhead explosively. Power first, strength follows."),
             ("Dumbbell Farmer Carry","4","40m","75s","Grip and full-body stability. The foundation under every other quality you are building.")],
            [("Dumbbell Goblet Squat Peak","3","5 rep max","3 min","Your strength benchmark at program end. Record and compare to week 1."),
             ("Dumbbell Romanian Deadlift Peak","3","5 rep max","3 min","Total posterior chain strength benchmark at program end."),
             ("Dumbbell Push Press Peak","3","5 rep max","3 min","Power benchmark at program end."),
             ("Dumbbell Farmer Carry Peak","4","50m","75s","Grip and full-body stability at maximum load. Record the weight.")],
        ]

    weeks = []
    for i, phase in enumerate(phases):
        exs = exs_by_phase[i] if i < len(exs_by_phase) else exs_by_phase[-1]
        days = [
            {"day":"Monday","workout":"Dumbbell Strength A","duration":"55 min","exercises":[
                {"name":e[0],"sets":int(e[1]) if str(e[1]).isdigit() else 4,"reps":str(e[2]),"rest":str(e[3]),"desc":str(e[4])} for e in exs[:2]
            ]},
            {"day":"Wednesday","workout":"Dumbbell Power & Conditioning","duration":"50 min","exercises":[
                {"name":e[0],"sets":int(e[1]) if str(e[1]).isdigit() else 4,"reps":str(e[2]),"rest":str(e[3]),"desc":str(e[4])} for e in exs[2:4]
            ]},
            {"day":"Friday","workout":"Dumbbell Accessory & Benchmark","duration":"50 min","exercises":[
                {"name":e[0],"sets":int(e[1]) if str(e[1]).isdigit() else 3,"reps":str(e[2]),"rest":str(e[3]),"desc":str(e[4])} for e in (exs[4:] if len(exs) > 4 else exs[:2])
            ]},
        ]
        for day in days:
            for ex in day["exercises"]:
                if not isinstance(ex["sets"], int):
                    ex["sets"] = 4
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
    <button class="tab-btn" onclick="switchTab('dumbbell',this)">Dumbbell Only</button>
  </div>
</div>

<div class="body">
  <h2 class="section-title">{weeks_heading} <span>BREAKDOWN</span></h2>
  <div class="weeks" id="weeks"></div>
</div>

<script>
var GYM = {gym_json};
var HOME = {home_json};
var DUMBBELL = {dumbbell_json};
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
  var data = currentTab === 'gym' ? GYM : currentTab === 'dumbbell' ? DUMBBELL : HOME;
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

def render_program(prog, gym_weeks, home_weeks, dumbbell_weeks):
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
        home_json=json.dumps(home_weeks, ensure_ascii=False),
        dumbbell_json=json.dumps(dumbbell_weeks, ensure_ascii=False)
    )

# Generate all programs
for prog in SIMPLE_PROGRAMS:
    pid = prog['id']
    if pid in SPORT_GYM:
        gym_weeks = SPORT_GYM[pid]
    else:
        gym_weeks = make_gym_weeks(prog)
    home_weeks = make_home_weeks(prog)
    dumbbell_weeks = make_dumbbell_weeks(prog)
    html = render_program(prog, gym_weeks, home_weeks, dumbbell_weeks)
    fname = f"programs/{pid}.html"
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated {fname} ({len(html)} bytes)")

print("All done.")
