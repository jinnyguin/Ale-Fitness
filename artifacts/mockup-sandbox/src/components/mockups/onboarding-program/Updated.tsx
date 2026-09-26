import './_group.css';
import './Updated.css';

const reasons = [
  ['Sport', 'Two weekly basketball practices count as high-intensity court work.'],
  ['Primary goal', 'First-step quickness and jump power shape the main strength work.'],
  ['Training history', 'Regular lifting supports a gradual increase in useful volume.'],
  ['Recovery', 'The schedule leaves room to recover between lower-body efforts.'],
] as const;

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
] as const;

const exercises = [
  ['01', 'Pogo hop to stick', '3 sets · 5 reps · 90 sec rest · Crisp'],
  ['02', 'Goblet squat', '4 sets · 8 reps · 2 min rest · RPE 7'],
  ['03', 'Rear-foot elevated split squat', '3 sets · 8 / side · 90 sec rest · RPE 7'],
  ['04', 'Single-leg calf raise', '3 sets · 12 / side · 60 sec rest · Controlled'],
  ['05', 'Side plank row', '3 sets · 8 / side · 60 sec rest · Smooth'],
] as const;

const schedule = [
  ['MON', 'ALEFIT', 'Lower-body strength', 'training'],
  ['TUE', 'SPORT', 'Basketball practice', 'sport'],
  ['WED', 'RECOVERY', 'Easy mobility', 'recovery'],
  ['THU', 'ALEFIT', 'Upper body + support', 'training'],
  ['FRI', 'SPORT', 'Basketball practice', 'sport'],
  ['SAT', 'ALEFIT', 'Speed + landing', 'training'],
  ['SUN', 'RECOVERY', 'Full rest', 'recovery'],
] as const;

const weeks = [
  ['Week 1', 'Foundation', 'Build crisp movement and repeatable positions.'],
  ['Week 2', 'Build capacity', 'Add useful support work without rushing load.'],
  ['Week 3', 'Power', 'Keep strength work steady and move with intent.'],
  ['Week 4', 'Deload', 'Reduce fatigue and keep movement quality high.'],
] as const;

function SectionHeading({ eyebrow, title, aside, id }: { eyebrow: string; title: string; aside?: string; id?: string }) {
  return (
    <div className="up-section-head">
      <div>
        <span className="up-label">{eyebrow}</span>
        <h2 className="up-section-heading" id={id}>{title}</h2>
      </div>
      {aside && <span className="up-section-aside">{aside}</span>}
    </div>
  );
}

export function Updated() {
  return (
    <main className="updated-plan">
      <div className="up-frame">
        <header className="up-topbar">
          <a className="up-brand" href="#" aria-label="ALEFIT home">
            <img src="/__mockup/images/alefit-logo.png" alt="ALEFIT" />
          </a>
          <div className="up-top-meta">
            <span className="up-review-state">Plan ready</span>
            <a className="up-sign-in" href="#">Sign in</a>
          </div>
        </header>

        <div className="up-progress" role="progressbar" aria-label="Plan builder progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
          <span />
        </div>
        <div className="up-progress-caption">
          <strong>Plan review</strong>
          <span>6 questions · preview before account</span>
        </div>

        <div className="up-content">
          <section className="up-intro" aria-labelledby="preview-title">
            <div>
              <div className="up-kicker">Your plan <span>/</span> Coach’s read</div>
              <h1 className="up-title" id="preview-title">Built around<br />your game.</h1>
              <p className="up-intro-copy">Your opening block is ready. See what shaped it, check the week at a glance, and adjust any answer before you save.</p>
            </div>
            <aside className="up-intro-aside">
              <strong>A plan for a guard’s week</strong>
              <p>Power work is placed around practice, with lower-body recovery protected between hard court days.</p>
            </aside>
          </section>

          <section className="up-plan-banner" aria-label="Your four-week plan">
            <div>
              <span className="up-label">Your 4-week start</span>
              <h2 className="up-plan-name">Basketball power &amp; durability</h2>
              <p className="up-plan-summary">Build first-step speed and jump power while fitting around practice and recovery.</p>
            </div>
            <div className="up-plan-facts">
              <span className="up-plan-fact"><b>01</b> Power focus</span>
              <span className="up-plan-fact"><b>05</b> Movements in session one</span>
            </div>
          </section>

          <section className="up-section up-fit" aria-labelledby="fit-title">
            <div className="up-fit-intro">
              <div>
                <span className="up-label">How your answers shape this plan</span>
                <h2 className="up-section-heading" id="fit-title">Why this<br />plan fits</h2>
                <p>This block responds to your sport, the work you already do, and the week you need to keep.</p>
              </div>
              <div className="up-fit-mark"><i /> Individual, not off the shelf</div>
            </div>
            <div className="up-reasons">
              {reasons.map(([label, text], index) => (
                <article className="up-reason" key={label}>
                  <div className="up-reason-top">
                    <span className="up-reason-index">0{index + 1}</span>
                    <span className="up-reason-label">{label}</span>
                  </div>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="up-section" aria-labelledby="answer-review-title">
            <SectionHeading eyebrow="Your inputs" title="Check your answers" aside="Change anything before you save" id="answer-review-title" />
            <div className="up-answers">
              {answers.map(([label, value, step]) => (
                <div className="up-answer" key={label}>
                  <div className="up-answer-main">
                    <span className="up-answer-label">{label}</span>
                    <b className="up-answer-value">{value}</b>
                  </div>
                  <button className="up-edit edit-answer" type="button" data-step={step} aria-label={`Edit ${label} answers`}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="up-plan-grid" aria-label="Your first week">
            <article className="up-detail-card">
              <div className="up-card-heading">
                <div>
                  <span className="up-label">First session · Week 1</span>
                  <h3>Lower body + power</h3>
                </div>
                <span className="up-time">45 min estimate</span>
              </div>
              <div>
                {exercises.map(([index, name, prescription]) => (
                  <div className="up-exercise" key={name}>
                    <span className="up-exercise-index">{index}</span>
                    <div>
                      <b className="up-exercise-name">{name}</b>
                      <small className="up-prescription">{prescription}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="up-detail-card">
              <div className="up-card-heading">
                <div>
                  <span className="up-label">Seven-day rhythm</span>
                  <h3>Training around your week</h3>
                </div>
              </div>
              <div className="up-session-list">
                {schedule.map(([day, type, title, category]) => (
                  <div className={`up-session up-session-${category}`} key={day}>
                    <span className="up-day">{day}</span>
                    <span className="up-session-type">{type}</span>
                    <b className="up-session-title">{title}</b>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="up-progression" aria-labelledby="progression-title">
            <SectionHeading eyebrow="What happens next" title="Four-week progression" aside="A clear build, then room to reset" id="progression-title" />
            <div className="up-week-track">
              {weeks.map(([week, phase, emphasis]) => (
                <article className="up-week" key={week}>
                  <span className="up-week-dot" aria-hidden="true" />
                  <span className="up-week-label">{week}</span>
                  <b>{phase}</b>
                  <p>{emphasis}</p>
                </article>
              ))}
            </div>
            <div className="up-recovery">
              <span className="up-recovery-label">Recovery guidance</span>
              <p><strong>Recovery:</strong> Practices and games count toward your weekly load. Easier days stay in the plan.</p>
            </div>
          </section>

          <footer className="up-footer">
            <button className="up-button up-button-secondary" id="back" type="button">Back</button>
            <span className="up-footer-note">Your plan will be saved to your account.</span>
            <button className="up-button up-button-primary" id="next" type="button">Create account &amp; save</button>
          </footer>
        </div>
      </div>
    </main>
  );
}