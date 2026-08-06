import React from 'react';
import './TVScreens.css';

function TVScreenClosestToGoal({ advisors }) {
  const withGoals = advisors.filter(a => a.goal > 0);
  const hitGoal   = withGoals.filter(a => a.delivered >= a.goal);
  const closeOnes = withGoals
    .filter(a => a.delivered < a.goal && (a.goal - a.delivered) <= 3)
    .sort((a, b) => (a.goal - a.delivered) - (b.goal - b.delivered));

  if (hitGoal.length === withGoals.length && withGoals.length > 0) {
    return (
      <div className="tv-screen">
        <span className="tv-screen-title">Closest to Goal</span>
        <div className="tv-ctg-empty">🏆 Everyone has hit their goal!</div>
      </div>
    );
  }

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">Closest to Goal</span>
      {hitGoal.length > 0 && (
        <div style={{ color: '#00e676', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
          ★ GOAL HIT: {hitGoal.map(a => a.firstName).join(', ')}
        </div>
      )}
      <div className="tv-ctg-grid">
        {closeOnes.length > 0 ? closeOnes.map(a => {
          const need = a.goal - a.delivered;
          return (
            <div key={a.name} className="tv-ctg-card">
              <div className="tv-ctg-name">{a.name}</div>
              <div className="tv-ctg-number">{a.delivered}</div>
              <div className="tv-ctg-need">
                {need === 1 ? '1 unit away! 🔥' : `${need} units to go`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#555' }}>Goal: {a.goal}</div>
            </div>
          );
        }) : (
          <div className="tv-ctg-empty" style={{ color: '#555' }}>
            No advisors within 3 units of goal
          </div>
        )}
      </div>
    </div>
  );
}

export default TVScreenClosestToGoal;
