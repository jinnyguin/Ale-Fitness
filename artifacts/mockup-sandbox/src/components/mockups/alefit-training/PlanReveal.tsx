import './_group.css';
import './_screens.css';
import { ArrowRight, Check, Clock3 } from 'lucide-react';
import { ButtonLink, Frame } from './_shared';

const reasons = [
  ['Sport load', 'Two weekly practices count as high-intensity court work.'],
  ['Your focus', 'First-step speed and jump power lead the opening block.'],
  ['Your week', 'Three strength sessions fit around court work and recovery.'],
];

export function PlanReveal() {
  return (
    <Frame noNav label="Plan preview · No account needed">
      <main className="af-reveal">
        <div className="af-reveal-top"><span className="af-kicker">Your coach’s read</span><span className="af-pill af-pill-lime"><i className="af-dot" /> READY TO REVIEW</span></div>
        <h1 className="af-title af-reveal-title">Built around<br /><em>your game.</em></h1>
        <p className="af-subtitle">For a guard who needs a first step, a stronger jump, and enough left for practice.</p>

        <section className="af-plan-banner">
          <div className="af-banner-lines" aria-hidden="true"><span /><span /><span /></div>
          <div className="af-banner-content">
            <span className="af-section-label">Your four-week start</span>
            <h2>Basketball power<br />&amp; durability</h2>
            <p>Build first-step speed and jump power while fitting around practice and recovery.</p>
            <div className="af-banner-facts"><span><b>03</b> sessions / week</span><span><b>45</b> min / session</span></div>
          </div>
        </section>

        <section className="af-reasons">
          <div className="af-section-title"><span className="af-section-label">Why this fits</span><b>Built from your answers.</b></div>
          {reasons.map(([label, description], index) => <div className="af-reason-row" key={label}>
            <span className="af-reason-num">0{index + 1}</span><span><b>{label}</b><small>{description}</small></span><Check className="af-check-icon" />
          </div>)}
        </section>

        <section className="af-first-workout">
          <div className="af-first-heading"><div><span className="af-section-label">First session · Week 1</span><h2>Lower body + power</h2></div><span className="af-time"><Clock3 /> 45 min</span></div>
          <div className="af-exercise-preview"><span>01</span><b>Pogo hop to stick</b><small>3 × 5 · Crisp landing</small></div>
          <div className="af-exercise-preview"><span>02</span><b>Goblet squat</b><small>4 × 8 · RPE 7</small></div>
          <div className="af-exercise-preview"><span>03</span><b>Rear-foot elevated split squat</b><small>3 × 8 / side</small></div>
          <a className="af-text-link" href="/__mockup/preview/alefit-training/WorkoutDetail">See all five movements <ArrowRight /></a>
        </section>
        <section className="af-reveal-rhythm"><span className="af-section-label">A week that respects your sport</span><div className="af-rhythm-line"><span>MON<br /><b>LIFT</b></span><i /><span>TUE<br /><b>COURT</b></span><i /><span>WED<br /><b>EASY</b></span><i /><span>THU<br /><b>LIFT</b></span><i /><span>FRI<br /><b>COURT</b></span><i /><span>SAT<br /><b>MOVE</b></span></div></section>
        <div className="af-reveal-cta"><span>Review your week before creating an account.</span><ButtonLink href="/__mockup/preview/alefit-training/Today">See today’s plan</ButtonLink></div>
      </main>
    </Frame>
  );
}