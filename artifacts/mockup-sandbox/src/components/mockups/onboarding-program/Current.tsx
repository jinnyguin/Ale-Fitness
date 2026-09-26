import './_group.css';

const reasons = [
  ['Sport', 'Two weekly basketball practices count as high-intensity court work.'],
  ['Primary goal', 'First-step quickness and jump power shape the main strength work.'],
  ['Training history', 'Regular lifting supports a gradual increase in useful volume.'],
  ['Recovery', 'The schedule leaves room to recover between lower-body efforts.'],
];

const answers = [
  ['Sport', 'Basketball', 0],
  ['Court role', 'Guard', 0],
  ['Current sport load', '2 sessions per week · 75 min per session · Hard', 0],
  ['Training support focus', 'First-step speed', 0],
  ['Goals', 'Jump higher, First-step quickness', 1],
  ['Starting point', 'Training regularly · 2–3 times per week', 2],
  ['Equipment', 'Dumbbells, resistance bands, court', 3],
  ['Weekly plan', '3 days · 45 min per session', 4],
  ['Age & limitations', '18–54 · No limitations noted', 5],
];

const exercises = [
  ['01', 'Pogo hop to stick', '3 sets · 5 reps · 90 sec rest · Crisp'],
  ['02', 'Goblet squat', '4 sets · 8 reps · 2 min rest · RPE 7'],
  ['03', 'Rear-foot elevated split squat', '3 sets · 8 / side · 90 sec rest · RPE 7'],
  ['04', 'Single-leg calf raise', '3 sets · 12 / side · 60 sec rest · Controlled'],
  ['05', 'Side plank row', '3 sets · 8 / side · 60 sec rest · Smooth'],
];

const schedule = [
  ['MON', 'ALEFIT', 'Lower-body strength'],
  ['TUE', 'SPORT', 'Basketball practice'],
  ['WED', 'RECOVERY', 'Easy mobility'],
  ['THU', 'ALEFIT', 'Upper body + support'],
  ['FRI', 'SPORT', 'Basketball practice'],
  ['SAT', 'ALEFIT', 'Speed + landing'],
  ['SUN', 'RECOVERY', 'Full rest'],
];

const weeks = [
  ['Week 1', 'Foundation', 'Build crisp movement and repeatable positions.'],
  ['Week 2', 'Build capacity', 'Add useful support work without rushing load.'],
  ['Week 3', 'Power', 'Keep strength work steady and move with intent.'],
  ['Week 4', 'Deload', 'Reduce fatigue and keep movement quality high.'],
];

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

export function Current() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="sign-in" href="#">Sign in</a>
      </header>
      <div className="progress-wrap" role="progressbar" aria-label="Plan builder progress" aria-valuenow={100}>
        <div className="progress" />
      </div>
      <div className="progress-caption">
        <span>Plan review</span>
        <span>6 questions · preview before account</span>
      </div>
      <section className="onboarding preview" aria-labelledby="preview-title">
        <span className="eyebrow">Plan review <b className="step-count">Preview</b></span>
        <h1 id="preview-title">Your opening block.</h1>
        <p className="sub">Review the plan and the reasons behind it. Edit any answer before creating your account.</p>

        <div className="plan-banner">
          <div>
            <span className="eyebrow">Your 4-week start</span>
            <h2>Basketball power &amp; durability</h2>
            <p>Build first-step speed and jump power while fitting around practice and recovery.</p>
          </div>
          <div className="plan-banner-meta">
            <span>Power focus</span>
            <span>5 movements in session one</span>
          </div>
        </div>

        <section className="personalization-card">
          <SectionHeading eyebrow="How your answers shape this plan" title="Why this plan fits" />
          <div className="reason-grid">
            {reasons.map(([label, text]) => (
              <article className="reason-item" key={label}>
                <span>{label}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="answer-review">
          <SectionHeading eyebrow="Your inputs" title="Check your answers" />
          <div className="answer-summary">
            {answers.map(([label, value, step]) => (
              <div className="summary-row" key={label}>
                <div><span className="eyebrow">{label}</span><b>{value}</b></div>
                <button className="text-btn edit-answer" type="button" data-step={step}>Edit</button>
              </div>
            ))}
          </div>
        </section>

        <div className="plan-grid">
          <article className="plan-card">
            <span className="eyebrow">First session · Week 1</span>
            <h3>Lower body + power</h3>
            <p className="session-time">45 minute estimate</p>
            {exercises.map(([index, name, prescription]) => (
              <div className="exercise" key={name}>
                <span className="exercise-index">{index}</span>
                <div><b>{name}</b><small>{prescription}</small></div>
              </div>
            ))}
          </article>
          <article className="plan-card">
            <span className="eyebrow">Seven-day rhythm</span>
            <h3>Training around your week</h3>
            <div className="schedule">
              {schedule.map(([day, type, title]) => (
                <div className={`session session-${type.toLowerCase()}`} key={day}>
                  <span className="session-day">{day}</span>
                  <div><small>{type}</small><b>{title}</b></div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <section className="progression-card">
          <SectionHeading eyebrow="What happens next" title="Four-week progression" />
          <div className="week-steps">
            {weeks.map(([week, phase, emphasis]) => (
              <article className="week-step" key={week}>
                <span>{week}</span><b>{phase}</b><p>{emphasis}</p>
              </article>
            ))}
          </div>
          <p className="recovery-note"><b>Recovery:</b> Practices and games count toward your weekly load. Easier days stay in the plan.</p>
        </section>

        <div className="footer">
          <button className="button secondary back" id="back" type="button">Back</button>
          <button className="button" id="next" type="button">Create account &amp; save</button>
        </div>
      </section>
    </main>
  );
}