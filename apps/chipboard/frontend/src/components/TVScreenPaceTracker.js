import React from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import './TVScreens.css';

function countWorkingDays(start, end) {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function TVScreenPaceTracker({ advisors }) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const workingDaysTotal = countWorkingDays(monthStart, monthEnd);
  const workingDaysLeft  = countWorkingDays(today, monthEnd);

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">
        Pace to Goal — {workingDaysLeft} working day{workingDaysLeft !== 1 ? 's' : ''} left
      </span>
      <div className="tv-pace-grid">
        {advisors.map(({ name, firstName, delivered, goal }) => {
          const hasGoal = goal > 0;
          const needed = hasGoal ? Math.max(goal - delivered, 0) : null;
          const neededPerDay = needed !== null && workingDaysLeft > 0
            ? (needed / workingDaysLeft).toFixed(1)
            : null;
          const onTrack = hasGoal && delivered >= goal;
          const paceClass = onTrack ? 'hit' : (neededPerDay > (goal / workingDaysTotal) * 1.5 ? 'behind' : 'on-track');

          return (
            <div key={name} className="tv-pace-card">
              <div className="tv-pace-name">{firstName}</div>
              <div className="tv-pace-stats">
                <span className="tv-pace-delivered">{delivered}</span>
                {hasGoal && <span className="tv-pace-goal-text">/ {goal}</span>}
              </div>
              {onTrack && (
                <div className={`tv-pace-needed hit`}>Goal reached ★</div>
              )}
              {!onTrack && neededPerDay !== null && (
                <div className={`tv-pace-needed ${paceClass}`}>
                  {neededPerDay}/day needed
                </div>
              )}
              {!hasGoal && (
                <div className="tv-pace-needed" style={{ color: '#444' }}>No goal set</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TVScreenPaceTracker;
