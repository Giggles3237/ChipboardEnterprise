import React, { useState } from 'react';
import { TV_SCREENS, DEFAULT_SETTINGS } from './TVScreens';
import './TVSettings.css';

function loadSettings() {
  try {
    const raw = localStorage.getItem('tv_dashboard_settings');
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function TVSettings() {
  const [settings, setSettings]   = useState(loadSettings);
  const [saved,    setSaved]       = useState(false);

  const { activeScreens, rotationInterval } = settings;

  const toggleScreen = (id) => {
    setSettings(prev => {
      const has = prev.activeScreens.includes(id);
      return {
        ...prev,
        activeScreens: has
          ? prev.activeScreens.filter(s => s !== id)
          : [...prev.activeScreens, id],
      };
    });
    setSaved(false);
  };

  const setInterval_ = (val) => {
    setSettings(prev => ({ ...prev, rotationInterval: Number(val) }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('tv_dashboard_settings', JSON.stringify(settings));
    setSaved(true);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('tv_dashboard_settings', JSON.stringify(DEFAULT_SETTINGS));
    setSaved(true);
  };

  const tooFew  = activeScreens.length < 1;
  const tooMany = activeScreens.length > 6;

  return (
    <div className="tvs-page">
      <div className="tvs-header">
        <h1 className="tvs-title">TV Dashboard Settings</h1>
        <p className="tvs-subtitle">
          Choose which screens rotate on the TV display for this device. Settings are saved locally in this browser.
        </p>
      </div>

      <div className="tvs-section">
        <h2 className="tvs-section-title">Screens</h2>
        <p className="tvs-section-hint">Select 1–6 screens to rotate through.</p>
        <div className="tvs-screens-grid">
          {TV_SCREENS.map(screen => {
            const active = activeScreens.includes(screen.id);
            const order  = active ? activeScreens.indexOf(screen.id) + 1 : null;
            return (
              <label key={screen.id} className={`tvs-screen-card ${active ? 'tvs-screen-card--active' : ''}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleScreen(screen.id)}
                  className="tvs-checkbox"
                />
                <div className="tvs-screen-info">
                  <span className="tvs-screen-label">{screen.label}</span>
                  {active && <span className="tvs-screen-order">#{order}</span>}
                </div>
              </label>
            );
          })}
        </div>
        {tooFew  && <p className="tvs-warning">Select at least 1 screen.</p>}
        {tooMany && <p className="tvs-warning">6 screens maximum recommended.</p>}
      </div>

      <div className="tvs-section">
        <h2 className="tvs-section-title">Rotation Speed</h2>
        <p className="tvs-section-hint">How many seconds each screen is shown before switching.</p>
        <div className="tvs-interval-row">
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={rotationInterval}
            onChange={e => setInterval_(e.target.value)}
            className="tvs-slider"
          />
          <span className="tvs-interval-value">{rotationInterval}s</span>
        </div>
      </div>

      <div className="tvs-actions">
        <button
          className="tvs-save-btn"
          onClick={handleSave}
          disabled={tooFew}
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
        <button className="tvs-reset-btn" onClick={handleReset}>
          Reset to Defaults
        </button>
      </div>

      {saved && (
        <p className="tvs-saved-msg">
          Settings saved. Open <a href="/tv">/tv</a> to see your changes.
        </p>
      )}
    </div>
  );
}

export default TVSettings;
