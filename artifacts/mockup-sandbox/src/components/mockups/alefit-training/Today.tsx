import './_group.css';
import './_screens.css';
import { useState } from 'react';
import { ArrowRight, Check, Clock3, ChevronRight } from 'lucide-react';
import { Frame, exercises } from './_shared';

export function Today() {
  const [started, setStarted] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const done = checked.length;

  function toggle(name: string) {
    setChecked((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name]);
  }

  return (
    <Frame active="today">
      <div className="af-today-head">
        <div><span className="af-kicker">MONDAY · WEEK 1 / FOUNDATION</span><h1 className="af-title">Today</h1></div>
        <span className="af-avatar">J</span>
      </div>
      <div className="af-sport-context"><span className="af-court-mark"><i /><i /></span><span><b>Basketball · Guard</b><small>Practice already counts toward your load.</small></span><span className="af-focus-tag">POWER</span></div>

      <section className="af-today-workout">
        <div className="af-workout-art" aria-hidden="true">
          <div className="af-art-court"><span /><span /><span /></div>
          <div className="af-art-type">01<span> / 03</span></div>
          <div className="af-art-vertical">COURT-READY STRENGTH</div>
        </div>
        <div className="af-workout-summary">
          <div className="af-workout-meta"><span className="af-pill af-pill-lime">ALEFIT SESSION</span><span className="af-workout-duration"><Clock3 /> 45 MIN</span></div>
          <h2>Lower body<br />+ power</h2>
          <p>Build force. Keep every landing quiet and controlled.</p>
          <div className="af-workout-bottom"><span><b>05</b> movements</span><button type="button" className="af-button" onClick={() => setStarted(!started)}>{started ? 'Session started' : 'Start session'} <ArrowRight className="af-arrow" /></button></div>
        </div>
      </section>

      <section className="af-today-preview">
        <div className="af-preview-heading"><div><span className="af-section-label">{started ? 'In session' : 'Up next'}</span><h2>Session outline</h2></div><span className="af-completion">{done} / 5</span></div>
        <div className="af-mini-progress"><span style={{ width: `${done * 20}%` }} /></div>
        {exercises.slice(0, 3).map((item, index) => <button type="button" key={item.name} className={`af-today-movement${checked.includes(item.name) ? ' done' : ''}`} onClick={() => toggle(item.name)}>
          <span className="af-movement-number">{String(index + 1).padStart(2, '0')}</span><span className="af-movement-copy"><b>{item.name}</b><small>{item.note}</small></span><span className="af-movement-check">{checked.includes(item.name) ? <Check /> : <ChevronRight />}</span>
        </button>)}
        <a className="af-text-link" href="/__mockup/preview/alefit-training/WorkoutDetail">Open full workout <ArrowRight /></a>
      </section>
      <div className="af-coach-line"><span className="af-coach-mark">A</span><p><b>Coach’s note</b> Practice is your high-intensity conditioning today. No extra court work needed.</p></div>
    </Frame>
  );
}