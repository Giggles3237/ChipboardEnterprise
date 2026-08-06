import React from 'react';
import './Toast.css';

const Toast = ({ message, type, onClose }) => {
  return (
    <div className={`toast ${type}`}>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

export default Toast;
