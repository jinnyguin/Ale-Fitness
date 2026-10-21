import { Activity } from 'lucide-react';
import './_group.css';

function Header() {
  return (
    <header className="loader-header">
      <a className="loader-brand" href="#" aria-label="ALEFIT Today">
        <img src="/__mockup/images/alefit-logo.png" alt="ALEFIT" />
      </a>
      <span className="loader-avatar" aria-hidden="true">A</span>
    </header>
  );
}

function MobileNav() {
  return (
    <nav className="loader-mobile-nav" aria-label="Mobile navigation">
      <a href="#" aria-current="page"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7" /></svg>Today</a>
      <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 3h6v4H9zM9 12h6M9 16h6" /></svg>Plan</a>
      <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 20V12h4v8m2 0V8h4v12m2 0V3h4v17M3 21h18" /></svg>Progress</a>
      <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3zM8 8h8M8 12h5" /></svg>Coach</a>
      <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>Profile</a>
    </nav>
  );
}

export function Updated() {
  return (
    <div className="loader-frame">
      <Header />
      <main className="loader-main">
        <section className="coach-loading" role="status" aria-live="polite">
          <div className="coach-loading-mark" aria-hidden="true">
            <span className="coach-loading-core">A</span>
          </div>
          <p className="coach-loading-eyebrow">Your coaching space</p>
          <h1>Getting your next session ready</h1>
          <p className="coach-loading-copy">Bringing your training plan and recent progress together.</p>
          <div className="coach-loading-card" aria-hidden="true">
            <div className="coach-loading-card-top">
              <span className="coach-loading-card-icon"><Activity /></span>
              <div className="coach-loading-lines">
                <span className="coach-loading-line" />
                <span className="coach-loading-line short" />
              </div>
            </div>
            <div className="coach-loading-divider" />
            <div className="coach-loading-bars">
              <span className="coach-loading-bar" />
              <span className="coach-loading-bar" />
              <span className="coach-loading-bar" />
            </div>
          </div>
          <p className="coach-loading-note"><span className="coach-loading-pulse" />Preparing your plan</p>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
