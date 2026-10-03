import './_group.css';
import './_screens.css';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Frame, Stepper } from './_shared';

const sports = ['Basketball', 'Soccer', 'Running', 'Strength'];
const outcomes = ['First-step quickness', 'Jump power', 'Durability', 'Change of direction'];

export function Onboarding() {
  const [sport, setSport] = useState('Basketball');
  const [role, setRole] = useState('Guard');
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState(['First-step quickness', 'Jump power']);

  function toggleOutcome(value: string) {
    setSelected((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : current.length < 3 ? [...current, value] : current);
  }

  return (
    <Frame noNav label={`Personal plan · Step ${stage + 1} of 6`}>
      <div className="af-onboarding-wrap">
        <Stepper step={stage + 1} />
        <div className="af-onboard-heading">
          <span className="af-kicker">Start with your sport</span>
          <h1 className="af-title">{stage === 0 ? <>What are you<br />training for?</> : <>What does your<br />game need?</>}</h1>
          <p className="af-subtitle">{stage === 0
            ? 'Your training should complement the work you already do on court.'
            : 'Choose up to three outcomes. Your first choice sets the opening emphasis.'}</p>
        </div>

        {stage === 0 ? <>
          <div className="af-choice-grid" role="group" aria-label="Choose your sport">
            {sports.map((item) => <button type="button" key={item} className={`af-sport-choice${sport === item ? ' selected' : ''}`} onClick={() => { setSport(item); setRole(item === 'Basketball' ? 'Guard' : 'Competitive'); }}>
              <span className="af-choice-indicator">{sport === item ? <Check /> : null}</span><b>{item}</b>
              <small>{item === 'Basketball' ? 'Court athlete' : item === 'Running' ? 'Distance or speed' : item === 'Soccer' ? 'Field athlete' : 'General strength'}</small>
            </button>)}
          </div>
          <div className="af-context-card">
            <div className="af-context-heading"><div><span className="af-section-label">Sport-aware detail</span><b>{sport === 'Basketball' ? 'Your role changes the plan.' : 'Tell us how you take part.'}</b></div><span className="af-live-dot">LIVE</span></div>
            <label className="af-field-label" htmlFor="role-select">{sport === 'Basketball' ? 'Court role' : 'Sport detail'}</label>
            <select className="af-select" id="role-select" value={role} onChange={(event) => setRole(event.target.value)}>
              {(sport === 'Basketball' ? ['Guard', 'Wing', 'Forward', 'Center'] : ['Recreational', 'Competitive', 'Not sure']).map((item) => <option key={item}>{item}</option>)}
            </select>
            <div className="af-load-note"><span className="af-mini-court" aria-hidden="true"><i /><i /><i /></span><span><b>Current court load</b><small>2 practices / week · 75 min each · Hard</small></span><span className="af-load-edit">EDIT</span></div>
          </div>
          <div className="af-onboard-foot">
            <span className="af-privacy-note">Six short questions. Plan first, account later.</span>
            <button className="af-button" type="button" onClick={() => setStage(1)}>Continue <ArrowRight className="af-arrow" /></button>
          </div>
        </> : <>
          <div className="af-outcome-head"><span className="af-section-label">Basketball · {role}</span><span className="af-selection-count">{selected.length} of 3 selected</span></div>
          <div className="af-outcome-list">
            {outcomes.map((item, index) => <button type="button" key={item} onClick={() => toggleOutcome(item)} className={`af-outcome${selected.includes(item) ? ' selected' : ''}`}>
              <span className="af-outcome-num">0{index + 1}</span><span><b>{item}</b><small>{item === 'First-step quickness' ? 'Get to space sooner, without extra conditioning volume.' : item === 'Jump power' ? 'Build strength that supports controlled take-off and landing.' : item === 'Durability' ? 'Support repeatable work across practice and training.' : 'Stay composed through lateral transitions.'}</small></span><span className="af-outcome-check">{selected.includes(item) ? <Check /> : '+'}</span>
            </button>)}
          </div>
          <div className="af-onboard-foot">
            <button className="af-button af-button-quiet" type="button" onClick={() => setStage(0)}>Back</button>
            <a className="af-button" href="/__mockup/preview/alefit-training/PlanReveal">Review my plan <ArrowRight className="af-arrow" /></a>
          </div>
          <p className="af-inline-note">Equipment, experience, schedule, and constraints come next.</p>
        </>}
      </div>
    </Frame>
  );
}