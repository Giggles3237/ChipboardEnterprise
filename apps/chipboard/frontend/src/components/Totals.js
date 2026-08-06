import React, { useState } from 'react';
import './Totals.css';

function Totals({ sales }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateTotals = () => {
    const totals = {
      newBMW: { delivered: 0, pending: 0 },
      cpoBMW: { delivered: 0, pending: 0 },
      usedBMW: { delivered: 0, pending: 0 },
      newMINI: { delivered: 0, pending: 0 },
      cpoMINI: { delivered: 0, pending: 0 },
      usedMINI: { delivered: 0, pending: 0 }
    };

    sales.forEach(sale => {
      let category;
      switch (sale.type) {
        case 'New BMW':
          category = 'newBMW';
          break;
        case 'CPO BMW':
          category = 'cpoBMW';
          break;
        case 'Used BMW':
          category = 'usedBMW';
          break;
        case 'New MINI':
          category = 'newMINI';
          break;
        case 'CPO MINI':
          category = 'cpoMINI';
          break;
        case 'Used MINI':
          category = 'usedMINI';
          break;
        default:
          return;
      }

      if (sale.delivered) {
        totals[category].delivered++;
      } else {
        totals[category].pending++;
      }
    });

    return totals;
  };

  const totals = calculateTotals();
  
  const bmwTotal = {
    delivered: totals.newBMW.delivered + totals.cpoBMW.delivered + totals.usedBMW.delivered,
    pending: totals.newBMW.pending + totals.cpoBMW.pending + totals.usedBMW.pending
  };

  const miniTotal = {
    delivered: totals.newMINI.delivered + totals.cpoMINI.delivered + totals.usedMINI.delivered,
    pending: totals.newMINI.pending + totals.cpoMINI.pending + totals.usedMINI.pending
  };

  const usedTotal = {
    delivered: totals.cpoBMW.delivered + totals.usedBMW.delivered + 
               totals.cpoMINI.delivered + totals.usedMINI.delivered,
    pending: totals.cpoBMW.pending + totals.usedBMW.pending + 
             totals.cpoMINI.pending + totals.usedMINI.pending
  };

  const TotalRow = ({ label, delivered, pending }) => (
    <div className="total-row">
      <span className="label">{label}</span>
      <div className="values">
        <span className="delivered">{delivered}</span>
        <span className="pending">({pending})</span>
      </div>
    </div>
  );

  const TotalSummary = ({ bmwTotal, miniTotal, usedTotal }) => (
    <div className="totals-summary">
      <div className="summary-item">
        <span className="summary-label">BMW</span>
        <span className="summary-values">
          <span className="delivered">{bmwTotal.delivered}</span>
          <span className="pending">({bmwTotal.pending})</span>
        </span>
      </div>
      <div className="summary-item">
        <span className="summary-label">MINI</span>
        <span className="summary-values">
          <span className="delivered">{miniTotal.delivered}</span>
          <span className="pending">({miniTotal.pending})</span>
        </span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Used</span>
        <span className="summary-values">
          <span className="delivered">{usedTotal.delivered}</span>
          <span className="pending">({usedTotal.pending})</span>
        </span>
      </div>
    </div>
  );

  return (
    <div className="totals-container">
      <div className="totals-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Totals</h3>
        {!isExpanded && <TotalSummary bmwTotal={bmwTotal} miniTotal={miniTotal} usedTotal={usedTotal} />}
        <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
      </div>
      
      {isExpanded && (
        <div className="totals-content">
          <div className="brand-section bmw">
            <TotalRow label="New BMW" {...totals.newBMW} />
            <TotalRow label="CPO BMW" {...totals.cpoBMW} />
            <TotalRow label="Used BMW" {...totals.usedBMW} />
          </div>

          <div className="brand-section mini">
            <TotalRow label="New MINI" {...totals.newMINI} />
            <TotalRow label="CPO MINI" {...totals.cpoMINI} />
            <TotalRow label="Used MINI" {...totals.usedMINI} />
          </div>

          <div className="brand-section totals">
            <TotalRow label="Total BMW" {...bmwTotal} />
            <TotalRow label="Total MINI" {...miniTotal} />
            <TotalRow label="Total Used" {...usedTotal} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Totals; 