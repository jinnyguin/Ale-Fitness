import './_group.css';
import './_screens.css';
import { ArrowRight, CircleDashed, LockKeyhole } from 'lucide-react';
import { Frame } from './_shared';

const lanes = [
  { index: '01', title: 'First-step quickness', label: 'PLAN FOCUS', detail: 'Short acceleration work is kept brief around practice.' },
  { index: '02', title: 'Jump power', label: 'PLAN FOCUS', detail: 'Strength and landing quality lead this opening block.' },
  { index: '03', title: 'Court-ready durability', label: 'SUPPORT', detail: 'Single-leg and trunk work support repeatable movement.' },
];

export function Progress() {
  return (
    <Frame active="progress">
      <div className="af-page-heading"><span className="af-kicker">PROGRESS · YOUR TRAINING RECORD</span><h1 className="af-title">Built on the work.</h1><p className="af-subtitle">Your progress is what you log and what the plan learns from it. No projected results.</p></div>
      <section className="af-progress-state">
        <div className="af-progress-orbit"><CircleDashed /><span>READY</span></div>
        <div><span className="af-section-label">Baseline status</span><h2>Tracking begins<br />with your first log.</h2><p>Workout feedback helps shape volume, effort, and the next progression.</p></div>
      </section>
      <div className="af-measure-header"><span className="af-section-label">What this plan is building</span><span>PLAN FOCUS · NOT TEST RESULTS</span></div>
      <div className="af-focus-lanes">
        {lanes.map((lane) => <article className="af-focus-lane" key={lane.index}>
          <span className="af-lane-index">{lane.index}</span><div className="af-lane-copy"><small>{lane.label}</small><b>{lane.title}</b><span>{lane.detail}</span></div><div className="af-lane-status"><span /><small>NOT YET<br />MEASURED</small></div>
        </article>)}
      </div>
      <section className="af-progress-log">
        <div className="af-progress-log-heading"><span className="af-section-label">Training record</span><span className="af-pill">0 LOGS SHOWN</span></div>
        <div className="af-log-empty"><LockKeyhole /><b>No completed sessions yet</b><p>Once you log a workout, completed movements and session feedback appear here.</p></div>
      </section>
      <div className="af-feedback-callout"><span className="af-feedback-mark">A</span><p><b>What the coach watches</b> Completed movements, how the session felt, readiness, and your sport schedule. No jump height or sprint time is assumed.</p></div>
      <a className="af-button af-progress-cta" href="/__mockup/preview/alefit-training/Today">Go to today’s session <ArrowRight /></a>
    </Frame>
  );
}