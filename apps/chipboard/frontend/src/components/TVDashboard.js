import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subYears } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { TV_SCREENS, DEFAULT_SETTINGS } from './TVScreens';
import './TVDashboard.css';

function loadSettings() {
  try {
    const raw = localStorage.getItem('tv_dashboard_settings');
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function TVDashboard() {
  const { auth } = useAuth();

  // Settings from localStorage
  const [settings, setSettings] = useState(loadSettings);
  const { activeScreens, rotationInterval } = settings;

  // Data
  const [advisors,     setAdvisors]     = useState([]);
  const [monthSales,   setMonthSales]   = useState([]);
  const [prevYearSales,setPrevYearSales]= useState([]);
  const [teamStats,    setTeamStats]    = useState({ delivered: 0, pending: 0, goal: 0 });
  const [loading,      setLoading]      = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);

  // Rotation
  const [screenIndex, setScreenIndex] = useState(0);
  const [visible,     setVisible]     = useState(true);

  // Clock
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Re-read localStorage when window regains focus (in case settings were changed in another tab)
  useEffect(() => {
    const onFocus = () => setSettings(loadSettings());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Rotation with fade
  useEffect(() => {
    if (activeScreens.length <= 1) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setScreenIndex(i => (i + 1) % activeScreens.length);
        setVisible(true);
      }, 500);
    }, rotationInterval * 1000);
    return () => clearInterval(t);
  }, [activeScreens, rotationInterval]);

  // Data fetch
  const fetchData = useCallback(async () => {
    try {
      const currentMonth  = format(new Date(), 'yyyy-MM');
      const monthStart    = startOfMonth(new Date());
      const monthEnd      = endOfMonth(new Date());
      const prevYearStart = startOfMonth(subYears(new Date(), 1));
      const prevYearEnd   = endOfMonth(subYears(new Date(), 1));

      const [salesRes, usersRes, goalsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/sales`,                         { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get(`${API_BASE_URL}/users`,                         { headers: { Authorization: `Bearer ${auth.token}` } }),
        axios.get(`${API_BASE_URL}/goals/month/${currentMonth}`,   { headers: { Authorization: `Bearer ${auth.token}` } }),
      ]);

      const goalsMap = {};
      (goalsRes.data || []).forEach(g => { goalsMap[g.advisor_name] = g.goal_count; });

      const salespeople = usersRes.data
        .filter(u => u.role_name === 'Salesperson' && u.status === 'active')
        .map(u => u.name);

      const curMonth = salesRes.data.filter(s => {
        const d = new Date(s.deliveryDate);
        return d >= monthStart && d <= monthEnd;
      });

      const prevYear = salesRes.data.filter(s => {
        const d = new Date(s.deliveryDate);
        return d >= prevYearStart && d <= prevYearEnd && s.type !== 'Wholesale';
      });

      const advisorData = salespeople.map(name => {
        const mine = curMonth.filter(s => s.advisor === name && s.type !== 'Wholesale');
        const delivered = mine.filter(s => s.delivered).length;
        const pending   = mine.filter(s => !s.delivered).length;
        const goal      = goalsMap[name] || 0;
        return { name, firstName: name.split(' ')[0], delivered, pending, goal };
      }).sort((a, b) => b.delivered - a.delivered || a.name.localeCompare(b.name));

      const totalDelivered = advisorData.reduce((s, a) => s + a.delivered, 0);
      const totalPending   = advisorData.reduce((s, a) => s + a.pending, 0);
      const totalGoal      = advisorData.reduce((s, a) => s + a.goal, 0);

      setAdvisors(advisorData);
      setMonthSales(curMonth);
      setPrevYearSales(prevYear);
      setTeamStats({ delivered: totalDelivered, pending: totalPending, goal: totalGoal });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('TV Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, [fetchData]);

  if (loading) {
    return <div className="tv-loading"><div className="tv-loading-text">Loading...</div></div>;
  }

  // Resolve which screen to show
  const safeIndex = screenIndex % activeScreens.length;
  const activeId  = activeScreens[safeIndex];
  const screenDef = TV_SCREENS.find(s => s.id === activeId) || TV_SCREENS[0];
  const ScreenComponent = screenDef.component;

  const screenProps = { advisors, monthSales, prevYearSales, teamStats };

  return (
    <div className="tv-dashboard">
      {/* Persistent header */}
      <div className="tv-header">
        <div className="tv-header-left">
          <span className="tv-title">SALES BOARD</span>
          <span className="tv-month">{format(new Date(), 'MMMM yyyy')}</span>
        </div>
        <div className="tv-header-center">
          <div className="tv-team-stat">
            <span className="tv-team-number delivered-color">{teamStats.delivered}</span>
            <span className="tv-team-label">DELIVERED</span>
          </div>
          <div className="tv-team-divider" />
          <div className="tv-team-stat">
            <span className="tv-team-number pending-color">{teamStats.pending}</span>
            <span className="tv-team-label">PENDING</span>
          </div>
          {teamStats.goal > 0 && (
            <>
              <div className="tv-team-divider" />
              <div className="tv-team-stat">
                <span className="tv-team-number goal-color">{teamStats.goal}</span>
                <span className="tv-team-label">TEAM GOAL</span>
              </div>
            </>
          )}
        </div>
        <div className="tv-header-right">
          <span className="tv-clock">{format(clock, 'h:mm a')}</span>
          {lastUpdated && <span className="tv-updated">Updated {format(lastUpdated, 'h:mm a')}</span>}
        </div>
      </div>

      {/* Screen area */}
      <div className={`tv-screen-area ${visible ? 'tv-fade-in' : 'tv-fade-out'}`}>
        <ScreenComponent {...screenProps} />
      </div>

      {/* Dot indicators */}
      {activeScreens.length > 1 && (
        <div className="tv-dots">
          {activeScreens.map((id, i) => (
            <span
              key={id}
              className={`tv-dot ${i === safeIndex ? 'tv-dot-active' : ''}`}
              title={TV_SCREENS.find(s => s.id === id)?.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TVDashboard;
