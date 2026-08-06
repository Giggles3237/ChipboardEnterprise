import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './DateRangePicker.css';

function DateRangePicker({ startDate, endDate, onDateChange }) {
  return (
    <div className="date-range-picker">
      <DatePicker
        selected={startDate}
        onChange={date => onDateChange(date, endDate)}
        selectsStart
        startDate={startDate}
        endDate={endDate}
        dateFormat="MM/dd/yyyy"
        placeholderText="Start date"
        className="date-input"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
      />
      <span className="date-range-separator">to</span>
      <DatePicker
        selected={endDate}
        onChange={date => onDateChange(startDate, date)}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
        dateFormat="MM/dd/yyyy"
        placeholderText="End date"
        className="date-input"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
      />
    </div>
  );
}

export default DateRangePicker;