import React from 'react';
import './TVScreens.css';

function TVScreenWholesale({ monthSales, advisors }) {
  const wholesale = monthSales.filter(s => s.type === 'Wholesale');
  const total = wholesale.length;

  const byAdvisor = advisors
    .map(a => ({
      firstName: a.firstName,
      name: a.name,
      count: wholesale.filter(s => s.advisor === a.name).length
    }))
    .filter(a => a.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">Wholesale</span>
      <div className="tv-ws-total">{total}</div>
      <div className="tv-ws-label">unit{total !== 1 ? 's' : ''} this month</div>
      <div className="tv-ws-breakdown">
        {byAdvisor.map(a => (
          <div key={a.name} className="tv-ws-pill">
            <span className="tv-ws-pill-name">{a.firstName}</span>
            <span className="tv-ws-pill-count">{a.count}</span>
          </div>
        ))}
        {byAdvisor.length === 0 && (
          <div style={{ color: '#444', fontSize: '1rem' }}>No wholesale sales this month</div>
        )}
      </div>
    </div>
  );
}

export default TVScreenWholesale;
