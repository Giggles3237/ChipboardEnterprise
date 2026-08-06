import React from 'react';
import './TVScreens.css';

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_CLASSES = ['gold', 'silver', 'bronze'];

function getBarColor(pct) {
  if (pct >= 100) return '#00e676';
  if (pct >= 75)  return '#69f0ae';
  if (pct >= 50)  return '#ffeb3b';
  if (pct >= 25)  return '#ffa726';
  return '#ef5350';
}

function TVScreenLeaderboard({ advisors }) {
  const sorted = [...advisors].sort((a, b) => b.delivered - a.delivered || a.name.localeCompare(b.name));

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">Monthly Leaderboard</span>
      <div className="tv-lb-list">
        {sorted.map((advisor, i) => {
          const pct = advisor.goal > 0 ? Math.min((advisor.delivered / advisor.goal) * 100, 100) : 0;
          return (
            <div key={advisor.name} className="tv-lb-row">
              <span className={`tv-lb-rank ${MEDAL_CLASSES[i] || 'other'}`}>
                {MEDALS[i] || `#${i + 1}`}
              </span>
              <span className="tv-lb-name">{advisor.name}</span>
              <div className="tv-lb-bar-track">
                <div
                  className="tv-lb-bar-fill"
                  style={{ width: `${pct}%`, backgroundColor: getBarColor(pct) }}
                />
              </div>
              {advisor.goal > 0 && (
                <span className="tv-lb-goal">{advisor.delivered}/{advisor.goal}</span>
              )}
              <span className="tv-lb-number">{advisor.delivered}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TVScreenLeaderboard;
