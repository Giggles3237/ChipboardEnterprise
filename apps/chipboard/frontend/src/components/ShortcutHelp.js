import React, { useState } from 'react';
import './ShortcutHelp.css';

const ShortcutHelp = () => {
  const [isVisible, setIsVisible] = useState(false);

  const shortcuts = [
    { key: 'Ctrl + /', description: 'Focus search' },
    { key: 'Esc', description: 'Close forms/modals' },
    { key: 'Ctrl + H', description: 'Go home' },
    { key: 'Ctrl + N', description: 'New sale' },
    { key: 'Ctrl + L', description: 'Clear search' },
  ];

  return (
    <div className="shortcut-help-container">
      <button 
        className="shortcut-help-button"
        onClick={() => setIsVisible(!isVisible)}
      >
        ⌨️ Shortcuts
      </button>
      {isVisible && (
        <div className="shortcut-help-modal">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            {shortcuts.map(({ key, description }) => (
              <li key={key}>
                <kbd>{key}</kbd>
                <span>{description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ShortcutHelp;
