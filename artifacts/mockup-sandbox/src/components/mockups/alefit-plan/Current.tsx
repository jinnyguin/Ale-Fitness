import './_group.css';

import { useState } from 'react';

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

function Header() {
  const [active] = useState('plan');
  const links = [
    ['today', 'Today', '/today.html'],
    ['plan', 'My Plan', '/today.html?view=plan'],
    ['progress', 'Progress', '/today.html?view=progress'],
    ['coach', 'Coach', '/today.html?view=coach'],
    ['profile', 'Profile', '/today.html?view=profile'],
  ];
  return (
    <header className="app-header">
      <a className="brand" href="/today.html" aria-label="ALEFIT Today">
        <img src="/__mockup/images/alefit-logo.png" alt="ALEFIT" />
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map(([key, label, href]) => (
          <a className={active === key ? 'active' : ''} key={key} href={href}>{label}</a>
        ))}
      </nav>
      <div className="header-right">
        <span className="header-name">Jordan</span>
        <a className="avatar" href="/today.html?view=profile" aria-label="Open profile">J</a>
      </div>
    </header>
  );
}

function SessionRow({ session }: { session: Session }) {
  return (
    <div className="movement">
      <div>
        <b>{session.day} · {session.name}</b>
        <small>{session.minutes} min · {session.exercises.length} movements</small>
      </div>
      <a className="link-button" href="/today.html">Open →</a>
    </div>
  );
}

export default function Current() {
  const week = plan.weeks[plan.currentWeek - 1];
  return (
    <div className="app-frame">
      <Header />
      <main className="app-main" aria-label="My plan">
        <div className="view-header">
          <div>
            <span className="eyebrow">My plan</span>
            <h1>One plan. Built around you.</h1>
            <p className="lede">{plan.summary}</p>
          </div>
        </div>

        <div className="grid grid-2">
          <section className="hero-card">
            <div>
              <span className="tag">Week {week.week} · {week.phaseLabel}</span>
              <h2>{week.emphasis}</h2>
              <p>{week.reason}</p>
            </div>
            <div className="meta">
              <span><b>{plan.focus}</b> primary focus</span>
              <span><b>{week.sessions.length}</b> sessions this week</span>
            </div>
          </section>
          <aside className="card">
            <span className="eyebrow">Current guidance</span>
            <div className="list">
              <div className="list-row"><b>Conditioning</b><span>{week.conditioning}</span></div>
              <div className="list-row"><b>Recovery</b><span>{week.recovery}</span></div>
              <div className="list-row"><b>Progression</b><span>{week.progression}</span></div>
            </div>
          </aside>
        </div>

        <section className="card" style={{ marginTop: 14 }}>
          <span className="eyebrow">This week, in detail</span>
          {week.sessions.map((session) => <SessionRow key={session.id} session={session} />)}
        </section>

        <section className="card" style={{ marginTop: 14 }}>
          <span className="eyebrow">What changes next</span>
          <p>
            Primary movements stay recognizable long enough to measure. Support work, volume,
            effort, conditioning, and recovery respond to your readiness and feedback.
          </p>
          {plan.weeks.filter((item) => item.week > plan.currentWeek).map((item) => (
            <div className="list-row" key={item.week}>
              <b>Week {item.week} · {item.phaseLabel}</b><span>{item.emphasis}</span>
            </div>
          ))}
        </section>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a href="/today.html"><span>●</span>Today</a>
        <a className="active" href="/today.html?view=plan"><span>▦</span>Plan</a>
        <a href="/today.html?view=progress"><span>↗</span>Progress</a>
        <a href="/today.html?view=coach"><span>✦</span>Coach</a>
        <a href="/today.html?view=profile"><span>○</span>Profile</a>
      </nav>
    </div>
  );
}