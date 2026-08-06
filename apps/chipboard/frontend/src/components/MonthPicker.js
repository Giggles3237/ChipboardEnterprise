import React, { useState } from 'react';
import './MonthPicker.css';

function MonthPicker({ onMonthChange }) {
  const [selectedMonths, setSelectedMonths] = useState([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthToggle = (monthIndex) => {
    setSelectedMonths(prevSelected => {
      if (prevSelected.includes(monthIndex)) {
        return prevSelected.filter(m => m !== monthIndex);
      } else {
        return [...prevSelected, monthIndex];
      }
    });
  };

  const handleApply = () => {
    onMonthChange(selectedMonths);
  };

  return (
    <div className="month-picker">
      <div className="month-buttons">
        {months.map((month, index) => (
          <button
            key={month}
            className={selectedMonths.includes(index) ? 'selected' : ''}
            onClick={() => handleMonthToggle(index)}
          >
            {month}
          </button>
        ))}
      </div>
      <button className="apply-button" onClick={handleApply}>Apply Filter</button>
    </div>
  );
}

export default MonthPicker;