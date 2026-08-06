import React from 'react';
import './ThemeToggle.css';

function ThemeToggle({ isDarkMode, onToggle }) {
  return (
    <button 
      className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`} 
      onClick={onToggle}
      aria-label="Toggle dark mode"
    >
      <div className="icon-container">
        {isDarkMode ? (
          <svg className="sun-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 20V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19.778 19.778L17.657 17.657" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6.343 6.343L4.222 4.222" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19.778 4.222L17.657 6.343" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6.343 17.657L4.222 19.778" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg className="moon-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}

export default ThemeToggle; 