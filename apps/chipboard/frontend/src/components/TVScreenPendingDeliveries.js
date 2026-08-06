import React from 'react';
import './TVScreens.css';

function TVScreenPendingDeliveries({ monthSales }) {
  const today = new Date();

  const pending = monthSales
    .filter(s => !s.delivered && s.type !== 'Wholesale')
    .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  const isOverdue = (d) => d && new Date(d) < today;

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">Pending Deliveries — {pending.length} unit{pending.length !== 1 ? 's' : ''}</span>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table className="tv-pending-table">
          <thead>
            <tr>
              <th>Stock #</th>
              <th>Vehicle</th>
              <th>Advisor</th>
              <th>Expected</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(sale => (
              <tr key={sale.id}>
                <td>{sale.stockNumber?.toUpperCase()}</td>
                <td>{[sale.year, sale.make, sale.model].filter(Boolean).join(' ')}</td>
                <td>{sale.advisor}</td>
                <td className={isOverdue(sale.deliveryDate) ? 'tv-pending-overdue' : ''}>
                  {fmt(sale.deliveryDate)}{isOverdue(sale.deliveryDate) ? ' ⚠' : ''}
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#444', paddingTop: 40, fontSize: '1.1rem' }}>
                  No pending deliveries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TVScreenPendingDeliveries;
