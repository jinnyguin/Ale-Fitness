import './_group.css';
import './_screens.css';
import { useState } from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { days, Frame } from './_shared';

export function WeeklyPlan() {
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [held, setHeld] = useState(false);
  const selected = days.find((item) => item.day === selectedDay) ?? days[0];

  return (
    <Frame active="plan">
      <div className="af-page-heading"><span className="af-kicker">YOUR TRAINING RHYTHM</span><h1 className="af-title">Week at a glance</h1><p className="af-subtitle">Week 1 · Foundation. Three focused sessions, spaced around basketball.</p></div>
      <div className="af-week-switch"><span><b>WEEK 01</b><small>4-week start</small></span><span className="af-week-phase">FOUNDATION</span></div>
      <div className="af-schedule-list" role="list" aria-label="Weekly training schedule">
        {days.map((item) => <button key={item.day} type="button" role="listitem" className={`af-schedule-row ${item.status}${selectedDay === item.day ? ' chosen' : ''}`} onClick={() => { setSelectedDay(item.day); setHeld(false); }} aria-pressed={selectedDay === item.day}>
          <span className="af-day-name">{item.day}<i /></span><span className="af-schedule-copy"><small>{item.type}</small><b>{item.title}</b></span><span className="af-schedule-trail">{selectedDay === item.day ? <span className="af-selected-mark">SELECTED</span> : <ChevronRight />}</span>
        </button>)}
      </div>
      <section className={`af-selected-day af-selected-${selected.status}`}>
        <div className="af-selected-top"><span className="af-section-label">{selected.day} · {selected.type}</span><span className="af-selected-day-count">{selected.status === 'train' ? 'TRAINING' : selected.status === 'sport' ? 'SPORT LOAD' : 'RECOVERY'}</span></div>
        <h2>{selected.title}</h2><p>{selected.detail}{selected.status === 'train' ? ' · 45 min estimate' : ''}</p>
        <div className="af-selected-note">{selected.status === 'sport' ? 'Court work is already part of the plan. No extra conditioning is added here.' : selected.status === 'recovery' ? 'Keep the effort easy. Recovery days are part of the training week.' : 'Placed to leave space around practice and easier movement.'}</div>
        {selected.status === 'train' && <a className="af-text-link" href="/__mockup/preview/alefit-training/WorkoutDetail">View session details <ArrowRight /></a>}
      </section>
      <div className="af-schedule-footer"><span className="af-schedule-tip">Tap a day to see how it fits your sport week.</span><button type="button" className={`af-button${held ? ' af-button-held' : ''}`} onClick={() => setHeld(!held)}>{held ? <><Check /> Rhythm held</> : 'Keep this rhythm'}</button></div>
    </Frame>
  );
}