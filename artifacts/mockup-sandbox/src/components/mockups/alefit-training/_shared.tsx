import type { ReactNode } from 'react';
import { Activity, CalendarDays, ChartNoAxesColumnIncreasing, House, ArrowRight, ArrowLeft, Check } from 'lucide-react';

export type Tab = 'today' | 'plan' | 'progress' | 'workout';

const destinations = [
  { key: 'today', label: 'Today', href: '/__mockup/preview/alefit-training/Today', Icon: House },
  { key: 'plan', label: 'Week', href: '/__mockup/preview/alefit-training/WeeklyPlan', Icon: CalendarDays },
  { key: 'workout', label: 'Workout', href: '/__mockup/preview/alefit-training/WorkoutDetail', Icon: Activity },
  { key: 'progress', label: 'Progress', href: '/__mockup/preview/alefit-training/Progress', Icon: ChartNoAxesColumnIncreasing },
] as const;

export function Frame({ children, active, noNav = false, label = 'Jordan · Basketball guard' }: { children: ReactNode; active?: Tab; noNav?: boolean; label?: string }) {
  return (
    <div className="af-frame">
      <header className="af-topbar">
        <a className="af-wordmark" href="/__mockup/preview/alefit-training/Today" aria-label="ALEFIT Today">
          <i aria-hidden="true" /> ALEFIT
        </a>
        <span className="af-top-meta">{label}</span>
      </header>
      <main className={`af-main${noNav ? ' af-main-nonav' : ''}`}>{children}</main>
      {!noNav && <nav className="af-nav" aria-label="Training navigation">
        {destinations.map(({ key, label: navLabel, href, Icon }) => (
          <a key={key} className={`af-nav-link${active === key ? ' active' : ''}`} href={href} aria-current={active === key ? 'page' : undefined}>
            <Icon aria-hidden="true" /><span>{navLabel}</span>
          </a>
        ))}
      </nav>}
    </div>
  );
}

export function Stepper({ step, total = 6 }: { step: number; total?: number }) {
  return <div className="af-stepper" aria-label={`Question ${step} of ${total}`}>
    <div className="af-step-track"><span style={{ width: `${Math.round(step / total * 100)}%` }} /></div>
    <div className="af-step-caption"><b>Build your plan</b><span>{String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></div>
  </div>;
}

export function ButtonLink({ href, children, quiet = false }: { href: string; children: ReactNode; quiet?: boolean }) {
  return <a className={`af-button${quiet ? ' af-button-quiet' : ''}`} href={href}>{children}<ArrowRight className="af-arrow" aria-hidden="true" /></a>;
}

export function BackLink({ href, children = 'Back' }: { href: string; children?: ReactNode }) {
  return <a className="af-back-link" href={href}><ArrowLeft className="af-arrow" aria-hidden="true" />{children}</a>;
}

export function CompletedMark() {
  return <span className="af-completed"><Check aria-hidden="true" /></span>;
}

export const days = [
  { day: 'Mon', type: 'ALEFIT', title: 'Lower body + power', detail: 'Strength / jump intent', status: 'train' },
  { day: 'Tue', type: 'SPORT', title: 'Basketball practice', detail: 'Court load counts', status: 'sport' },
  { day: 'Wed', type: 'RECOVERY', title: 'Easy mobility', detail: 'Keep it low effort', status: 'recovery' },
  { day: 'Thu', type: 'ALEFIT', title: 'Upper body + support', detail: 'Strength / trunk', status: 'train' },
  { day: 'Fri', type: 'SPORT', title: 'Basketball practice', detail: 'Court load counts', status: 'sport' },
  { day: 'Sat', type: 'ALEFIT', title: 'Speed + landing', detail: 'Short, crisp efforts', status: 'train' },
  { day: 'Sun', type: 'RECOVERY', title: 'Full rest', detail: 'No extra work planned', status: 'recovery' },
] as const;

export const exercises = [
  { name: 'Pogo hop to stick', note: '3 sets · 5 reps · 90 sec rest', cue: 'Quiet landing. Reset between reps.' },
  { name: 'Goblet squat', note: '4 sets · 8 reps · 2 min rest · RPE 7', cue: 'Stay balanced through the whole foot.' },
  { name: 'Rear-foot elevated split squat', note: '3 sets · 8 / side · 90 sec rest', cue: 'Smooth descent; drive through the front leg.' },
  { name: 'Single-leg calf raise', note: '3 sets · 12 / side · 60 sec rest', cue: 'Use the full range you can control.' },
  { name: 'Side plank row', note: '3 sets · 8 / side · 60 sec rest', cue: 'Keep the trunk steady as you pull.' },
] as const;