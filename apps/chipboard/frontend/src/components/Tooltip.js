import React from 'react';
import ReactDOM from 'react-dom';
import './Tooltip.css';

function Tooltip({ children, visible, position }) {
  if (!visible) return null;

  const tooltipStyle = {
    position: 'absolute',
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translate(-50%, 8px)',
    opacity: visible ? 1 : 0
  };

  return ReactDOM.createPortal(
    <div className={`tooltip ${visible ? 'visible' : ''}`} style={tooltipStyle}>
      {children}
    </div>,
    document.body
  );
}

export default Tooltip;
