import './_group.css';
import './_screens.css';
import { useState } from 'react';
import { ArrowLeft, Check, Clock3, Minus, Plus } from 'lucide-react';
import { Frame, exercises } from './_shared';

export function WorkoutDetail() {
  const [open, setOpen] = useState<string | null>('Pogo hop to stick');
  const [done, setDone] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  function toggleDone(name: string) {
    setDone((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  return (
    <Frame active="workout">
      <a href="/__mockup/preview/alefit-training/Today" className="af-back-link"><ArrowLeft className="af-arrow" /> Today</a>
      <div className="af-detail-heading"><span className="af-kicker">WEEK 1 · MONDAY · LOWER BODY</span><h1 className="af-title">Lower body<br /><em>+ power</em></h1><p className="af-subtitle">Strength work for a guard’s first step and jump intent. Take the full rest; quality is the point.</p></div>
      <div className="af-session-strip"><span><Clock3 /> <b>45 MIN</b> estimated</span><i /><span><b>05</b> movements</span><i /><span><b>RPE 7</b> top set</span></div>
      <div className="af-detail-note"><span className="af-note-rule" /><p><b>Before you begin</b> Practice counts as hard conditioning. If you feel beat up, keep the jumps crisp and skip anything painful.</p></div>
      <section className="af-exercise-list">
        <div className="af-list-heading"><span className="af-section-label">Movement order</span><span>{done.length} / 5 complete</span></div>
        {exercises.map((item, index) => <article key={item.name} className={`af-exercise-row${done.includes(item.name) ? ' finished' : ''}`}>
          <button className="af-exercise-main" type="button" onClick={() => setOpen(open === item.name ? null : item.name)} aria-expanded={open === item.name}>
            <span className="af-exercise-index">{String(index + 1).padStart(2, '0')}</span><span className="af-exercise-copy"><b>{item.name}</b><small>{item.note}</small></span><span className="af-expand">{open === item.name ? <Minus /> : <Plus />}</span>
          </button>
          {open === item.name && <div className="af-exercise-expanded"><div><span className="af-section-label">COACHING CUE</span><p>{item.cue}</p></div><button type="button" className={`af-mark-done${done.includes(item.name) ? ' is-done' : ''}`} onClick={() => toggleDone(item.name)}>{done.includes(item.name) ? <><Check /> Completed</> : 'Mark complete'}</button></div>}
        </article>)}
      </section>
      <div className="af-session-actions"><button className="af-button" type="button" onClick={() => setStarted(!started)}>{started ? 'Workout in progress' : 'Start workout'}</button><a href="/__mockup/preview/alefit-training/Today" className="af-button af-button-quiet">Save for later</a></div>
      <p className="af-disclaimer">Stop movements that cause pain. This plan is training guidance, not medical advice.</p>
    </Frame>
  );
}