import './_group.css';

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  effort: string;
};

type Session = {
  id: string;
  day: string;
  name: string;
  minutes: number;
  exercises: Exercise[];
};

type Week = {
  week: number;
  phaseLabel: string;
  emphasis: string;
  reason: string;
  conditioning: string;
  recovery: string;
  progression: string;
  sessions: Session[];
};

const plan = {
  summary:
    'A six-week strength and athleticism block built around your basketball schedule, available equipment, and recovery.',
  focus: 'Power',
  currentWeek: 2,
  weeks: [
    {
      week: 1,
      phaseLabel: 'Foundation',
      emphasis: 'Own the positions and build repeatable movement quality.',
      reason: 'The opening week establishes clean patterns before training speed and load.',
      conditioning: 'Short court-style efforts; practice already counts as hard conditioning.',
      recovery: 'Leave at least one easier day between lower-body sessions.',
      progression: 'Add one rep before adding load.',
      sessions: [],
    },
    {
      week: 2,
      phaseLabel: 'Build capacity',
      emphasis: 'Build force without borrowing from your game performance.',
      reason:
        'This phase keeps primary movements recognizable while gradually increasing useful work.',
      conditioning: 'Keep added acceleration brief; practices and games provide high-intensity conditioning.',
      recovery: 'Protect the day after games for easy movement and mobility.',
      progression: 'Add one set to support work when every rep stays crisp.',
      sessions: [
        {
          id: 'w2-lower-power',
          day: 'Monday',
          name: 'Lower Body + Power',
          minutes: 52,
          exercises: [
            { id: 'snap-down', name: 'Snap-down to stick', sets: 3, reps: '5', rest: '90 sec', effort: 'Crisp' },
            { id: 'goblet-squat', name: 'Goblet squat', sets: 4, reps: '8', rest: '2 min', effort: 'RPE 7' },
            { id: 'split-squat', name: 'Split squat', sets: 3, reps: '8 / side', rest: '90 sec', effort: 'RPE 7' },
            { id: 'dead-bug', name: 'Dead bug', sets: 3, reps: '8 / side', rest: '60 sec', effort: 'Controlled' },
          ],
        },
        {
          id: 'w2-upper-athletic',
          day: 'Wednesday',
          name: 'Upper Body + Athletic Support',
          minutes: 45,
          exercises: [
            { id: 'dumbbell-row', name: 'Dumbbell row', sets: 4, reps: '10 / side', rest: '90 sec', effort: 'RPE 7' },
            { id: 'push-up', name: 'Incline push-up', sets: 3, reps: '10', rest: '75 sec', effort: 'Smooth' },
            { id: 'band-rotation', name: 'Standing band rotation', sets: 3, reps: '10 / side', rest: '60 sec', effort: 'Controlled' },
            { id: 'prone-swimmer', name: 'Prone swimmer', sets: 2, reps: '12', rest: '45 sec', effort: 'Easy' },
          ],
        },
        {
          id: 'w2-movement',
          day: 'Saturday',
          name: 'Movement + Repeat Effort',
          minutes: 38,
          exercises: [
            { id: 'lateral-step', name: 'Lateral step and stick', sets: 3, reps: '6 / side', rest: '60 sec', effort: 'Crisp' },
            { id: 'acceleration', name: 'Acceleration start', sets: 5, reps: '15 m', rest: '2 min', effort: 'Fast' },
            { id: 'calf-raise', name: 'Calf raise', sets: 3, reps: '15', rest: '60 sec', effort: 'RPE 6' },
            { id: 'mobility-flow', name: 'Gentle mobility flow', sets: 1, reps: '8 min', rest: 'As needed', effort: 'Easy' },
          ],
        },
      ],
    },
    {
      week: 3,
      phaseLabel: 'Progress',
      emphasis: 'Turn a stable base into faster, stronger execution.',
      reason: 'Volume stays familiar while effort and intent move forward.',
      conditioning: 'Use controlled repeat efforts around the sport week.',
      recovery: 'Readiness decides whether support volume stays or steps down.',
      progression: 'Progress one variable at a time and keep speed honest.',
      sessions: [],
    },
  ] as Week[],
};

const sessionArtwork: Record<string, { src: string; alt: string; cue: string }> = {
  'w2-lower-power': {
    src: '/__mockup/images/alefit-dumbbells.png',
    alt: 'Athlete gripping a pair of dumbbells before a strength session',
    cue: 'Strength · Power',
  },
  'w2-upper-athletic': {
    src: '/__mockup/images/alefit-stretching.png',
    alt: 'Athlete in a focused seated mobility stretch',
    cue: 'Strength · Support',
  },
  'w2-movement': {
    src: '/__mockup/images/alefit-running-shoe.png',
    alt: 'Runner pushing off the ground during a fast effort',
    cue: 'Speed · Movement',
  },
};

const navItems = [
  ['today', 'Today', '/today.html'],
  ['plan', 'My Plan', '/today.html?view=plan'],
  ['progress', 'Progress', '/today.html?view=progress'],
  ['coach', 'Coach', '/today.html?view=coach'],
  ['profile', 'Profile', '/today.html?view=profile'],
];

function Header() {
  return (
    <header className="ap-header">
      <a className="ap-brand" href="/today.html" aria-label="ALEFIT Today">
        <img src="/__mockup/images/alefit-logo.png" alt="ALEFIT" />
      </a>
      <nav className="ap-desktop-nav" aria-label="Main navigation">
        {navItems.map(([key, label, href]) => (
          <a className={key === 'plan' ? 'is-active' : ''} key={key} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <div className="ap-user">
        <span>Jordan</span>
        <a className="ap-avatar" href="/today.html?view=profile" aria-label="Open profile">J</a>
      </div>
    </header>
  );
}

function WeekStrip({ week }: { week: Week }) {
  const trainingDays = new Map(week.sessions.map((session) => [session.day, session.name]));
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <section className="ap-week-strip" aria-label="Week 2 scheduled training days">
      <div className="ap-strip-heading">
        <div>
          <span className="ap-kicker">Week at a glance</span>
          <span className="ap-strip-caption">Three sessions on the plan</span>
        </div>
        <span className="ap-strip-key"><i /> Scheduled</span>
      </div>
      <div className="ap-days">
        {days.map((day) => {
          const sessionName = trainingDays.get(day);
          return (
            <div className={`ap-day ${sessionName ? 'ap-day-training' : ''}`} key={day}>
              <span className="ap-day-name">{day.slice(0, 3)}</span>
              <span className="ap-day-mark" aria-hidden="true">{sessionName ? '•' : '—'}</span>
              <span className="ap-day-status">{sessionName ? 'Train' : 'Open'}</span>
              {sessionName && <span className="ap-sr-only">{day}: {sessionName}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SessionCard({ session, index }: { session: Session; index: number }) {
  const artwork = sessionArtwork[session.id];
  return (
    <article className={`ap-session ap-session-${index + 1}`}>
      <div className="ap-session-art">
        <img src={artwork.src} alt={artwork.alt} />
        <span className="ap-art-cue">{artwork.cue}</span>
        <span className="ap-session-day">{session.day.slice(0, 3)}</span>
      </div>
      <div className="ap-session-content">
        <h3>{session.name}</h3>
        <div className="ap-session-meta">
          <span><b>{session.minutes}</b> min</span>
          <i aria-hidden="true" />
          <span><b>{session.exercises.length}</b> movements</span>
        </div>
        <a className="ap-open-session" href="/today.html" aria-label={`Open ${session.name}`}>
          <span>Open session</span><span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

export default function Updated() {
  const week = plan.weeks[plan.currentWeek - 1];
  const futureWeeks = plan.weeks.filter((item) => item.week > plan.currentWeek);

  return (
    <div className="ap-page">
      <style>{`
        .ap-page { min-height: 100dvh; color: var(--text); }
        .ap-header {
          position: sticky; z-index: 20; top: 0; min-height: 68px; padding: 10px max(22px, calc((100vw - 1220px) / 2));
          display: flex; align-items: center; justify-content: space-between; gap: 22px;
          border-bottom: 1px solid rgba(255,255,255,.08); background: rgba(14,15,13,.92); backdrop-filter: blur(16px);
        }
        .ap-brand img { display: block; width: 104px; height: 45px; object-fit: contain; object-position: left; }
        .ap-desktop-nav { display: flex; align-items: center; gap: 5px; }
        .ap-desktop-nav a { padding: 10px 11px; color: var(--muted); font-size: .7rem; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; transition: color .18s ease; }
        .ap-desktop-nav a:hover, .ap-desktop-nav a.is-active { color: var(--lime); }
        .ap-user { display: flex; align-items: center; gap: 13px; color: var(--muted); font-size: .82rem; }
        .ap-avatar { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid #626d3d; border-radius: 50%; background: var(--lime-soft); color: var(--lime); font-weight: 800; }
        .ap-main { width: min(100% - 48px, 1180px); margin: 0 auto; padding: 36px 0 94px; }
        .ap-intro { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 22px; animation: ap-enter .5s .02s both; }
        .ap-eyebrow, .ap-kicker { color: var(--lime); font-size: .66rem; font-weight: 700; letter-spacing: .19em; text-transform: uppercase; }
        .ap-intro h1 { margin: 9px 0 11px; max-width: 760px; font: 800 clamp(3rem, 6.2vw, 5.5rem)/.88 "Barlow Condensed", sans-serif; letter-spacing: -.01em; text-transform: uppercase; }
        .ap-intro p { max-width: 650px; margin: 0; color: var(--muted); font-size: .9rem; line-height: 1.55; }
        .ap-focus-stamp { flex: 0 0 auto; margin-bottom: 4px; padding: 12px 16px; border-left: 1px solid #59622b; background: linear-gradient(90deg, var(--lime-soft), transparent); }
        .ap-focus-stamp span { display: block; color: var(--muted); font-size: .59rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; }
        .ap-focus-stamp b { display: block; margin-top: 2px; color: var(--text); font: 700 1.35rem/1 "Barlow Condensed", sans-serif; text-transform: uppercase; }
        .ap-week-strip { margin-bottom: 14px; padding: 15px 20px 13px; border: 1px solid var(--line); background: linear-gradient(110deg, rgba(212,255,0,.045), transparent 45%), var(--surface); animation: ap-enter .5s .08s both; }
        .ap-strip-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .ap-strip-heading > div { display: flex; align-items: baseline; gap: 12px; }
        .ap-strip-caption { color: var(--muted); font-size: .72rem; }
        .ap-strip-key { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: .63rem; letter-spacing: .04em; }
        .ap-strip-key i { width: 7px; height: 7px; border-radius: 50%; background: var(--lime); }
        .ap-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); margin-top: 12px; }
        .ap-day { display: grid; justify-items: center; gap: 2px; padding: 6px 5px 2px; border-left: 1px solid rgba(255,255,255,.055); }
        .ap-day:first-child { border-left: 0; }
        .ap-day-name { color: var(--muted); font-size: .64rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        .ap-day-mark { min-height: 22px; color: #64685f; font-size: 1.15rem; line-height: 1.2; }
        .ap-day-status { color: #777c72; font-size: .58rem; letter-spacing: .08em; text-transform: uppercase; }
        .ap-day-training .ap-day-name, .ap-day-training .ap-day-mark, .ap-day-training .ap-day-status { color: var(--lime); }
        .ap-day-training .ap-day-mark { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--lime-soft); font-size: .8rem; }
        .ap-overview { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(310px, .7fr); gap: 14px; margin-bottom: 27px; animation: ap-enter .5s .13s both; }
        .ap-phase { position: relative; min-height: 227px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 25px 28px 22px; border: 1px solid #59622b; background: linear-gradient(112deg, rgba(212,255,0,.13), rgba(212,255,0,.025) 60%), var(--surface); }
        .ap-phase::after { content: "02"; position: absolute; right: 14px; bottom: -33px; color: rgba(212,255,0,.055); font: 900 14rem/.9 "Barlow Condensed", sans-serif; pointer-events: none; }
        .ap-phase-top, .ap-phase-bottom { position: relative; z-index: 1; }
        .ap-phase-label { display: inline-flex; align-items: center; gap: 9px; color: var(--lime); font-size: .64rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; }
        .ap-phase-label::before { content: ""; width: 22px; height: 1px; background: var(--lime); }
        .ap-phase h2 { max-width: 640px; margin: 14px 0 9px; font: 700 clamp(2rem, 3.6vw, 3.15rem)/.93 "Barlow Condensed", sans-serif; letter-spacing: .01em; text-transform: uppercase; }
        .ap-phase p { max-width: 590px; margin: 0; color: #aeb2a7; font-size: .79rem; line-height: 1.5; }
        .ap-phase-bottom { display: flex; align-items: center; gap: 22px; padding-top: 15px; }
        .ap-phase-stat { display: flex; align-items: baseline; gap: 7px; color: var(--muted); font-size: .7rem; }
        .ap-phase-stat b { color: var(--text); font-size: .79rem; }
        .ap-phase-rule { height: 17px; border-left: 1px solid var(--line); }
        .ap-guidance { padding: 22px 23px; border: 1px solid var(--line); background: var(--surface); }
        .ap-guidance-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
        .ap-guidance-head span:first-child { color: var(--lime); font-size: .64rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
        .ap-guidance-head span:last-child { color: #777c72; font-size: .58rem; letter-spacing: .1em; text-transform: uppercase; }
        .ap-guidance-row { display: grid; grid-template-columns: 88px 1fr; gap: 12px; padding: 11px 0; border-bottom: 1px solid rgba(255,255,255,.065); }
        .ap-guidance-row:last-child { padding-bottom: 0; border-bottom: 0; }
        .ap-guidance-row b { padding-top: 1px; color: var(--text); font-size: .68rem; }
        .ap-guidance-row p { margin: 0; color: var(--muted); font-size: .68rem; line-height: 1.42; }
        .ap-sessions-section { animation: ap-enter .5s .19s both; }
        .ap-section-head { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 12px; }
        .ap-section-head h2 { margin: 4px 0 0; font: 700 1.85rem/.95 "Barlow Condensed", sans-serif; letter-spacing: .02em; text-transform: uppercase; }
        .ap-count { color: var(--muted); font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; }
        .ap-count b { color: var(--lime); font-size: .8rem; }
        .ap-session-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .ap-session { overflow: hidden; border: 1px solid var(--line); background: var(--surface); transition: border-color .2s ease, transform .2s ease; }
        .ap-session:hover { border-color: #66713b; transform: translateY(-2px); }
        .ap-session-art { position: relative; height: 105px; overflow: hidden; background: #20231d; }
        .ap-session-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(12,13,11,.56), rgba(12,13,11,.04) 78%), linear-gradient(0deg, rgba(12,13,11,.35), transparent 60%); }
        .ap-session-art img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: center 47%; filter: saturate(.72); }
        .ap-art-cue, .ap-session-day { position: absolute; z-index: 1; top: 12px; }
        .ap-art-cue { left: 14px; color: #f4f5ed; font-size: .59rem; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
        .ap-session-day { right: 12px; display: grid; place-items: center; width: 33px; height: 33px; border: 1px solid rgba(212,255,0,.7); background: rgba(14,15,13,.74); color: var(--lime); font: 700 .84rem "Barlow Condensed", sans-serif; text-transform: uppercase; }
        .ap-session-content { padding: 13px 15px 14px; }
        .ap-session-content h3 { min-height: 40px; margin: 0; font: 700 1.28rem/1 "Barlow Condensed", sans-serif; letter-spacing: .025em; text-transform: uppercase; }
        .ap-session-meta { display: flex; align-items: center; gap: 9px; padding: 10px 0 12px; color: var(--muted); font-size: .67rem; }
        .ap-session-meta b { color: var(--text); font-weight: 700; }
        .ap-session-meta i { height: 12px; border-left: 1px solid var(--line); }
        .ap-open-session { display: flex; justify-content: space-between; align-items: center; min-height: 34px; padding: 0 10px; border: 1px solid #59622b; background: rgba(212,255,0,.07); color: var(--lime); font-size: .62rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; transition: background .18s ease, color .18s ease; }
        .ap-open-session:hover { background: var(--lime); color: #10110e; }
        .ap-open-session span:last-child { font-size: .9rem; }
        .ap-future { display: grid; grid-template-columns: minmax(230px, .82fr) minmax(0, 1.18fr); gap: 28px; align-items: start; margin-top: 28px; padding: 19px 21px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); animation: ap-enter .5s .25s both; }
        .ap-future h2 { margin: 6px 0 7px; font: 700 1.6rem/.95 "Barlow Condensed", sans-serif; text-transform: uppercase; }
        .ap-future-copy p { max-width: 410px; margin: 0; color: var(--muted); font-size: .7rem; line-height: 1.5; }
        .ap-next-week { display: grid; grid-template-columns: 112px 1fr; gap: 16px; align-items: center; padding: 12px 0; }
        .ap-next-week + .ap-next-week { border-top: 1px solid var(--line); }
        .ap-next-label { color: var(--lime); font: 700 .92rem "Barlow Condensed", sans-serif; letter-spacing: .04em; text-transform: uppercase; }
        .ap-next-week p { margin: 0; color: var(--muted); font-size: .74rem; line-height: 1.45; }
        .ap-mobile-nav { display: none; }
        .ap-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @keyframes ap-enter { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 820px) {
          .ap-header { min-height: 62px; }
          .ap-desktop-nav { display: none; }
          .ap-mobile-nav { position: fixed; z-index: 30; right: 12px; bottom: 12px; left: 12px; display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 4px; border: 1px solid var(--line); border-radius: 12px; background: rgba(21,23,20,.96); backdrop-filter: blur(14px); }
          .ap-mobile-nav a { display: grid; justify-items: center; gap: 4px; padding: 4px 2px; color: var(--muted); font-size: .57rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
          .ap-mobile-nav a span:first-child { font-size: 1rem; line-height: 1; }
          .ap-mobile-nav a.is-active { color: var(--lime); }
          .ap-main { width: min(100% - 32px, 680px); padding-top: 30px; padding-bottom: 110px; }
          .ap-intro { display: block; }
          .ap-focus-stamp { display: inline-block; margin-top: 17px; }
          .ap-overview { grid-template-columns: 1fr; }
          .ap-phase { min-height: 214px; }
          .ap-session-grid { grid-template-columns: 1fr; gap: 10px; }
          .ap-session { display: grid; grid-template-columns: minmax(130px, .7fr) 1fr; min-height: 154px; }
          .ap-session-art { height: 100%; min-height: 154px; }
          .ap-session-content { display: flex; flex-direction: column; justify-content: center; padding: 15px 17px; }
          .ap-session-content h3 { min-height: auto; font-size: 1.45rem; }
          .ap-session-meta { padding: 10px 0; }
          .ap-future { grid-template-columns: 1fr; gap: 12px; }
        }
        @media (max-width: 520px) {
          .ap-header { min-height: 59px; padding: 8px 14px; }
          .ap-brand img { width: 92px; height: 40px; }
          .ap-user { gap: 0; }
          .ap-user > span { display: none; }
          .ap-avatar { width: 35px; height: 35px; }
          .ap-main { width: min(100% - 26px, 480px); padding-top: 26px; }
          .ap-intro { margin-bottom: 18px; }
          .ap-intro h1 { max-width: 360px; margin-top: 10px; font-size: clamp(3.05rem, 14.7vw, 4.4rem); }
          .ap-intro p { max-width: 360px; font-size: .8rem; }
          .ap-focus-stamp { margin-top: 13px; padding: 9px 13px; }
          .ap-week-strip { padding: 13px 11px 12px; }
          .ap-strip-heading > div { display: grid; gap: 4px; }
          .ap-strip-caption { font-size: .65rem; }
          .ap-strip-key { font-size: .57rem; }
          .ap-day { padding-right: 1px; padding-left: 1px; }
          .ap-day-name { font-size: .57rem; letter-spacing: .08em; }
          .ap-day-status { font-size: .51rem; letter-spacing: .035em; }
          .ap-day-training .ap-day-mark { width: 20px; height: 20px; }
          .ap-phase { min-height: 220px; padding: 21px 19px 18px; }
          .ap-phase h2 { max-width: 310px; font-size: 2.55rem; }
          .ap-phase p { max-width: 310px; font-size: .73rem; }
          .ap-phase-bottom { gap: 13px; }
          .ap-phase-stat { gap: 5px; font-size: .63rem; }
          .ap-phase-stat b { font-size: .7rem; }
          .ap-guidance { padding: 18px 16px; }
          .ap-guidance-row { grid-template-columns: 78px 1fr; gap: 9px; }
          .ap-guidance-row b, .ap-guidance-row p { font-size: .65rem; }
          .ap-session { grid-template-columns: 112px 1fr; min-height: 151px; }
          .ap-session-art { min-height: 151px; }
          .ap-art-cue { top: 10px; left: 9px; max-width: 83px; font-size: .5rem; }
          .ap-session-day { top: auto; right: auto; bottom: 9px; left: 9px; width: 29px; height: 29px; }
          .ap-session-content { padding: 12px 11px; }
          .ap-session-content h3 { font-size: 1.25rem; line-height: .98; }
          .ap-session-meta { gap: 7px; font-size: .59rem; }
          .ap-open-session { min-height: 32px; padding: 0 8px; font-size: .55rem; }
          .ap-future { padding: 17px 1px; }
          .ap-next-week { grid-template-columns: 92px 1fr; gap: 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ap-intro, .ap-week-strip, .ap-overview, .ap-sessions-section, .ap-future { animation: none; }
          .ap-session, .ap-open-session, .ap-desktop-nav a { transition: none; }
        }
      `}</style>
      <Header />
      <main className="ap-main" aria-label="My plan">
        <section className="ap-intro">
          <div>
            <span className="ap-eyebrow">My plan / current block</span>
            <h1>One plan.<br />Built around you.</h1>
            <p>{plan.summary}</p>
          </div>
          <div className="ap-focus-stamp" aria-label={`Primary focus: ${plan.focus}`}>
            <span>Primary focus</span><b>{plan.focus}</b>
          </div>
        </section>

        <WeekStrip week={week} />

        <section className="ap-overview" aria-label="Current week overview and guidance">
          <article className="ap-phase">
            <div className="ap-phase-top">
              <span className="ap-phase-label">Week {week.week} <span aria-hidden="true">/</span> {week.phaseLabel}</span>
              <h2>{week.emphasis}</h2>
              <p>{week.reason}</p>
            </div>
            <div className="ap-phase-bottom">
              <span className="ap-phase-stat"><b>{plan.focus}</b> focus</span>
              <span className="ap-phase-rule" aria-hidden="true" />
              <span className="ap-phase-stat"><b>{week.sessions.length}</b> sessions this week</span>
            </div>
          </article>

          <aside className="ap-guidance">
            <div className="ap-guidance-head">
              <span>Current guidance</span><span>Keep in view</span>
            </div>
            <div className="ap-guidance-row">
              <b>Conditioning</b><p>{week.conditioning}</p>
            </div>
            <div className="ap-guidance-row">
              <b>Recovery</b><p>{week.recovery}</p>
            </div>
            <div className="ap-guidance-row">
              <b>Progression</b><p>{week.progression}</p>
            </div>
          </aside>
        </section>

        <section className="ap-sessions-section" aria-labelledby="ap-sessions-heading">
          <div className="ap-section-head">
            <div><span className="ap-eyebrow">This week, in detail</span><h2 id="ap-sessions-heading">Your sessions</h2></div>
            <span className="ap-count"><b>{week.sessions.length}</b> scheduled</span>
          </div>
          <div className="ap-session-grid">
            {week.sessions.map((session, index) => (
              <SessionCard key={session.id} session={session} index={index} />
            ))}
          </div>
        </section>

        <section className="ap-future" aria-label="What changes next">
          <div className="ap-future-copy">
            <span className="ap-eyebrow">Beyond this week</span>
            <h2>What changes next</h2>
            <p>
              Primary movements stay recognizable long enough to measure. Support work, volume,
              effort, conditioning, and recovery respond to your readiness and feedback.
            </p>
          </div>
          <div>
            {futureWeeks.map((item) => (
              <div className="ap-next-week" key={item.week}>
                <span className="ap-next-label">Week {item.week} · {item.phaseLabel}</span>
                <p>{item.emphasis}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <nav className="ap-mobile-nav" aria-label="Mobile navigation">
        <a href="/today.html"><span aria-hidden="true">◷</span>Today</a>
        <a className="is-active" href="/today.html?view=plan"><span aria-hidden="true">▦</span>Plan</a>
        <a href="/today.html?view=progress"><span aria-hidden="true">↗</span>Progress</a>
        <a href="/today.html?view=coach"><span aria-hidden="true">✦</span>Coach</a>
        <a href="/today.html?view=profile"><span aria-hidden="true">○</span>Profile</a>
      </nav>
    </div>
  );
}